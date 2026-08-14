const ACTIVE_CODE_KEY = 'todotime_active_sync_code';
const DEVICE_ID_KEY = 'todotime_device_id';
const CODE_PATTERN = /^[A-Z0-9_-]{12,64}$/;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeSyncCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidSyncCode(value: string): boolean {
  return CODE_PATTERN.test(normalizeSyncCode(value));
}

export function createSyncCode(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, byte => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
  return `TT-${body.match(/.{1,5}/g)?.join('-') ?? body}`;
}

export function getActiveSyncCode(): string {
  const active = normalizeSyncCode(localStorage.getItem(ACTIVE_CODE_KEY) || '');
  if (isValidSyncCode(active)) return active;

  try {
    const legacy = JSON.parse(localStorage.getItem('todotime_settings') || '{}') as { syncSecret?: string };
    const migrated = normalizeSyncCode(legacy.syncSecret || '');
    if (isValidSyncCode(migrated)) {
      localStorage.setItem(ACTIVE_CODE_KEY, migrated);
      return migrated;
    }
  } catch { /* ignore invalid legacy data */ }
  return '';
}

export function setActiveSyncCode(value: string): string {
  const code = normalizeSyncCode(value);
  if (!isValidSyncCode(code)) throw new Error('识别码格式无效');
  localStorage.setItem(ACTIVE_CODE_KEY, code);
  return code;
}

export function clearActiveSyncCode(): void {
  localStorage.removeItem(ACTIVE_CODE_KEY);
}

export function getDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const generated = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

export function getProfileId(syncCode: string): string {
  const code = normalizeSyncCode(syncCode);
  return code || 'local';
}

export function profileStorageKey(base: string, profileId: string): string {
  return `${base}:${profileId}`;
}

function legacyOwnerProfile(): string {
  try {
    const settings = JSON.parse(localStorage.getItem('todotime_settings') || '{}') as { syncSecret?: string; syncCode?: string };
    // Unscoped data is migrated only when it carried an explicit owner in the
    // old settings. The active code may have been entered by another person.
    const code = normalizeSyncCode(settings.syncCode || settings.syncSecret || '');
    return isValidSyncCode(code) ? code : 'local';
  } catch {
    return 'local';
  }
}

function mergeLegacyArray(base: string, scoped: string | null, legacy: string): string | null {
  if (base !== 'todotime_todos' && base !== 'todotime_today_pomodoros') return scoped ?? legacy;
  try {
    const currentItems = scoped ? JSON.parse(scoped) as Array<Record<string, unknown>> : [];
    const legacyItems = JSON.parse(legacy) as Array<Record<string, unknown>>;
    if (!Array.isArray(currentItems) || !Array.isArray(legacyItems)) return scoped ?? legacy;
    const merged = new Map<string, Record<string, unknown>>();
    for (const item of [...legacyItems, ...currentItems]) {
      const key = String(item.id || [item.start, item.end, item.taskId ?? '', item.createdAt].join('|'));
      const previous = merged.get(key);
      const previousTime = String(previous?.updatedAt || previous?.createdAt || '');
      const itemTime = String(item.updatedAt || item.createdAt || '');
      if (!previous || itemTime >= previousTime) merged.set(key, item);
    }
    return JSON.stringify([...merged.values()]);
  } catch {
    return scoped ?? legacy;
  }
}

export function readProfileStorage(base: string, profileId: string): string | null {
  const scopedKey = profileStorageKey(base, profileId);
  let scoped = localStorage.getItem(scopedKey);

  // Recovery v2 is scoped per identity. The previous global marker could skip the real owner.
  const recoveryKey = `${scopedKey}:legacy_recovery_v2`;
  if (localStorage.getItem(recoveryKey) !== '1' && legacyOwnerProfile() === profileId) {
    const legacy = localStorage.getItem(base);
    if (legacy !== null) {
      scoped = mergeLegacyArray(base, scoped, legacy);
      if (scoped !== null) localStorage.setItem(scopedKey, scoped);
    }
    localStorage.setItem(recoveryKey, '1');
  }
  return scoped;
}
