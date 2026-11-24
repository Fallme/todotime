import type { DayData, ConfigData, FeedbackEntry } from '../types';
import { sumPomodoroCounts } from '../utils/pomodoroRules';
import { mergeTodosById } from '../utils/todoMerge';

const NEW_API_BASE = 'https://aimemo.online/todotime-api';
const OLD_API_BASE = 'https://todotime-mauve.vercel.app/api';
const configuredApiBase = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '');
const API_BASE = configuredApiBase && !configuredApiBase.includes('todotime-mauve.vercel.app')
  ? configuredApiBase
  : NEW_API_BASE;

const MIGRATION_KEY = 'todotime_api_migrated_v1';
const MIGRATION_RETRY_KEY = 'todotime_api_migration_retry_at_v1';
const MIGRATION_TIMEOUT_MS = 3000;
const MIGRATION_RETRY_MS = 60_000;
const migrationInFlight = new Map<string, Promise<void>>();

function migrationDone(code: string): boolean {
  try { return localStorage.getItem(`${MIGRATION_KEY}:${code}`) === '1'; }
  catch { return false; }
}
function markMigrationDone(code: string): void {
  try { localStorage.setItem(`${MIGRATION_KEY}:${code}`, '1'); }
  catch { /* storage unavailable: migration will be retried next time */ }
}
function migrationRetryPending(code: string): boolean {
  try {
    const raw = localStorage.getItem(`${MIGRATION_RETRY_KEY}:${code}`);
    return Boolean(raw && Number(raw) > Date.now());
  } catch { return false; }
}
function markMigrationRetry(code: string): void {
  try { localStorage.setItem(`${MIGRATION_RETRY_KEY}:${code}`, String(Date.now() + MIGRATION_RETRY_MS)); }
  catch { /* storage unavailable: no cooldown */ }
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MIGRATION_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** 启动迁移并返回其 Promise；首次读写会等待它完成，避免旧数据未迁入就被覆盖。 */
function scheduleMigration(code: string): Promise<void> | null {
  if (!code || migrationDone(code) || migrationRetryPending(code)) return null;
  const existing = migrationInFlight.get(code);
  if (existing) return existing;
  const task = migrateFromOldApi(code)
    .catch(() => {})
    .finally(() => { migrationInFlight.delete(code); });
  migrationInFlight.set(code, task);
  return task;
}

async function ensureMigrated(code: string): Promise<void> {
  const task = scheduleMigration(code);
  if (!task) return;
  await Promise.race([
    task,
    new Promise<void>(resolve => setTimeout(resolve, MIGRATION_TIMEOUT_MS + 500)),
  ]);
}

/** 首次切换到服务器存储时，从旧 GitHub 后端拉取一次数据并写入新 API。失败不阻塞使用。 */
async function migrateFromOldApi(code: string): Promise<void> {
  if (!code || migrationDone(code)) return;
  try {
    let allReadable = true;
    for (const filePath of ['config.json', 'history.json', 'feedback.json']) {
      let remote: { content: unknown; sha?: string } | null = null;
      try {
        const res = await fetchWithTimeout(`${OLD_API_BASE}/file?path=${encodeURIComponent(filePath)}`, { headers: syncHeaders(code) });
        if (res.status === 404) continue;
        if (!res.ok) { allReadable = false; break; }
        remote = await res.json() as { content: unknown; sha?: string };
      } catch { allReadable = false; break; }
      if (!remote) continue;
      try {
        // 服务器上已有数据时，绝不覆盖；仅补齐尚不存在的文件。
        const existing = await fetchWithTimeout(`${NEW_API_BASE}/file?path=${encodeURIComponent(filePath)}`, { headers: syncHeaders(code) });
        if (existing.status === 200 || existing.status === 409) continue;
        if (existing.status !== 404) { allReadable = false; break; }
        const written = await fetchWithTimeout(`${NEW_API_BASE}/file`, {
          method: 'PUT',
          headers: syncHeaders(code),
          body: JSON.stringify({ path: filePath, content: remote.content }),
        });
        if (!written.ok) { allReadable = false; break; }
      } catch { allReadable = false; break; }
    }
    if (allReadable) markMigrationDone(code);
    else markMigrationRetry(code);
  } catch {
    markMigrationRetry(code);
  }
}

export interface DeveloperUserSummary {
  profileId: string;
  isDeveloper: boolean;
  lastActiveDate: string;
  lastUpdatedAt: string;
  totalFocusMinutes: number;
  totalPomodoros: number;
  taskCount: number;
  completedTaskCount: number;
  activeTaskCount: number;
  feedbackCount: number;
}

export interface DeveloperFeedbackSummary {
  id: string;
  profileId: string;
  createdAt: string;
  content: string;
  language: string;
}

export interface DeveloperOverview {
  generatedAt: string;
  truncated: boolean;
  totals: {
    users: number;
    active7Days: number;
    active30Days: number;
    totalFocusMinutes: number;
    totalPomodoros: number;
    totalTasks: number;
    feedback: number;
  };
  users: DeveloperUserSummary[];
  feedback: DeveloperFeedbackSummary[];
}

interface GitHubFile { sha: string; content: string; }

class SyncConflictError extends Error {}

function syncHeaders(syncCode: string): Record<string, string> {
  return { 'Content-Type': 'application/json', 'X-Sync-Code': syncCode };
}

export async function checkDeveloperAccess(syncCode: string): Promise<boolean> {
  if (!syncCode) return false;
  try {
    const response = await fetch(`${API_BASE}/developer?mode=status`, { headers: syncHeaders(syncCode) });
    if (!response.ok) return false;
    const data = await response.json() as { isDeveloper?: boolean };
    return data.isDeveloper === true;
  } catch {
    return false;
  }
}

export async function loadDeveloperOverview(syncCode: string): Promise<DeveloperOverview> {
  const response = await fetch(`${API_BASE}/developer?mode=overview`, { headers: syncHeaders(syncCode) });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || `开发者概况读取失败：${response.status}`);
  }
  return response.json() as Promise<DeveloperOverview>;
}

async function apiGet(path: string, syncCode: string): Promise<{ content: unknown; sha: string } | null> {
  await ensureMigrated(syncCode);
  const res = await fetch(`${API_BASE}/file?path=${encodeURIComponent(path)}`, {
    headers: syncHeaders(syncCode),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`同步读取失败：${res.status}`);
  return res.json();
}

async function apiPut(path: string, content: unknown, syncCode: string, sha?: string): Promise<string> {
  await ensureMigrated(syncCode);
  const res = await fetch(`${API_BASE}/file`, {
    method: 'PUT', headers: syncHeaders(syncCode),
    body: JSON.stringify({ path, content, sha }),
  });
  if (res.status === 409) throw new SyncConflictError('数据已被另一台设备更新');
  if (!res.ok) throw new Error(`同步写入失败：${res.status}`);
  const d = await res.json() as { sha: string };
  return d.sha;
}

export async function getFile(syncCode: string, path: string): Promise<GitHubFile | null> {
  if (!syncCode) throw new Error('请先创建或输入个人同步识别码');
  const data = await apiGet(path, syncCode);
  if (!data) return null;
  return { sha: data.sha, content: JSON.stringify(data.content) };
}

export async function putFile(syncCode: string, path: string, content: string, sha?: string): Promise<void> {
  if (!syncCode) throw new Error('请先创建或输入个人同步识别码');
  await apiPut(path, JSON.parse(content), syncCode, sha);
}

export async function saveDayData(token: string, data: DayData): Promise<void> {
  const path = 'history.json';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await getFile(token, path);
    const history = existing ? JSON.parse(existing.content) as { days?: Record<string, DayData>; updatedAt?: string } : {};
    const remote = history.days?.[data.date] ?? null;
    const records = new Map<string, DayData['pomodoros'][number]>();
    for (const record of [...(remote?.pomodoros ?? []), ...data.pomodoros]) {
      const key = record.id || [record.start, record.end, record.taskId ?? '', record.createdAt].join('|');
      records.set(key, record);
    }
    const pomodoros = [...records.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const merged: DayData = {
      ...remote,
      ...data,
      pomodoros,
      totalFocusMinutes: pomodoros.reduce((sum, item) => sum + item.duration, 0),
      totalPomodoros: sumPomodoroCounts(pomodoros),
    };
    const days = { ...(history.days ?? {}), [data.date]: merged };
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 400);
    const cutoffDate = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
    for (const date of Object.keys(days)) if (date < cutoffDate) delete days[date];
    try {
      await putFile(token, path, JSON.stringify({ days, updatedAt: new Date().toISOString() }, null, 2), existing?.sha);
      return;
    } catch (error) {
      if (!(error instanceof SyncConflictError) || attempt === 2) throw error;
    }
  }
}

export async function loadDayData(token: string, date: string): Promise<DayData | null> {
  const path = `data/${date.slice(0, 4)}/${date.slice(5, 7)}/${date}.json`;
  const file = await getFile(token, path);
  if (!file) return null;
  return JSON.parse(file.content) as DayData;
}

export async function loadMultipleDays(token: string, dates: string[]): Promise<Map<string, DayData>> {
  const map = new Map<string, DayData>();
  const historyFile = await getFile(token, 'history.json');
  if (historyFile) {
    const history = JSON.parse(historyFile.content) as { days?: Record<string, DayData> };
    for (const date of dates) {
      const day = history.days?.[date];
      if (day) map.set(date, day);
    }
    return map;
  }

  // Compatibility fallback for data written by versions before history.json.
  const concurrency = 6;
  for (let index = 0; index < dates.length; index += concurrency) {
    const batch = dates.slice(index, index + concurrency);
    await Promise.all(batch.map(async date => {
      try {
        const data = await loadDayData(token, date);
        if (data) map.set(date, data);
      } catch (error) {
        console.warn(`Failed to load ${date}`, error);
      }
    }));
  }
  return map;
}

const CONFIG_PATH = 'config.json';

export async function saveConfig(token: string, data: ConfigData): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await getFile(token, CONFIG_PATH);
    const remote = existing ? JSON.parse(existing.content) as ConfigData : null;
    const remoteIsNewer = Boolean(remote && remote.updatedAt > data.updatedAt);
    const preferredSettings = remoteIsNewer ? remote!.settings : data.settings;
    const otherSettings = remoteIsNewer ? data.settings : remote?.settings;
    const categoryMap = new Map((otherSettings?.categories ?? []).map(category => [category.name, category]));
    for (const category of preferredSettings.categories) categoryMap.set(category.name, category);
    const merged: ConfigData = {
      settings: { ...preferredSettings, categories: [...categoryMap.values()] },
      todos: mergeTodosById(data.todos, remote?.todos ?? []),
      updatedAt: new Date().toISOString(),
    };
    try {
      await putFile(token, CONFIG_PATH, JSON.stringify(merged, null, 2), existing?.sha);
      return;
    } catch (error) {
      if (!(error instanceof SyncConflictError) || attempt === 2) throw error;
    }
  }
}

export async function loadConfig(token: string): Promise<ConfigData | null> {
  const file = await getFile(token, CONFIG_PATH);
  if (!file) return null;
  return JSON.parse(file.content) as ConfigData;
}

const FEEDBACK_PATH = 'feedback.json';

export async function saveFeedback(syncCode: string, entry: FeedbackEntry): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await getFile(syncCode, FEEDBACK_PATH);
    const current = existing ? JSON.parse(existing.content) as { items?: FeedbackEntry[] } : { items: [] };
    const items = [...(current.items ?? []), entry];
    try {
      await putFile(syncCode, FEEDBACK_PATH, JSON.stringify({ items }, null, 2), existing?.sha);
      return;
    } catch (error) {
      if (!(error instanceof SyncConflictError) || attempt === 2) throw error;
    }
  }
}
