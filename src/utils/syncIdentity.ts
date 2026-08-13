const ACTIVE_CODE_KEY = 'todotime_active_sync_code';
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

export function getProfileId(syncCode: string): string {
  const code = normalizeSyncCode(syncCode);
  return code || 'local';
}

export function profileStorageKey(base: string, profileId: string): string {
  return `${base}:${profileId}`;
}

export function readProfileStorage(base: string, profileId: string): string | null {
  const scopedKey = profileStorageKey(base, profileId);
  const scoped = localStorage.getItem(scopedKey);
  if (scoped !== null) return scoped;

  const migrationKey = `${base}:legacy_migrated`;
  if (localStorage.getItem(migrationKey) !== '1') {
    const legacy = localStorage.getItem(base);
    localStorage.setItem(migrationKey, '1');
    if (legacy !== null) {
      localStorage.setItem(scopedKey, legacy);
      return legacy;
    }
  }
  return null;
}
