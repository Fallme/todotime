import type { DayData, ConfigData } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '')
  || '/api';

interface GitHubFile { sha: string; content: string; }

class SyncConflictError extends Error {}

function syncHeaders(syncSecret: string): Record<string, string> {
  return { 'Content-Type': 'application/json', 'X-Sync-Secret': syncSecret };
}

async function apiGet(path: string, syncSecret: string): Promise<{ content: unknown; sha: string } | null> {
  const res = await fetch(`${API_BASE}/file?path=${encodeURIComponent(path)}`, {
    headers: syncHeaders(syncSecret),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`同步读取失败：${res.status}`);
  return res.json();
}

async function apiPut(path: string, content: unknown, syncSecret: string, sha?: string): Promise<string> {
  const res = await fetch(`${API_BASE}/file`, {
    method: 'PUT', headers: syncHeaders(syncSecret),
    body: JSON.stringify({ path, content, sha }),
  });
  if (res.status === 409) throw new SyncConflictError('数据已被另一台设备更新');
  if (!res.ok) throw new Error(`同步写入失败：${res.status}`);
  const d = await res.json() as { sha: string };
  return d.sha;
}

export async function getFile(_repo: string, syncSecret: string, path: string): Promise<GitHubFile | null> {
  if (!syncSecret) throw new Error('请先在设置中填写同步密码');
  const data = await apiGet(path, syncSecret);
  if (!data) return null;
  return { sha: data.sha, content: JSON.stringify(data.content) };
}

export async function putFile(_repo: string, syncSecret: string, path: string, content: string, sha?: string): Promise<void> {
  if (!syncSecret) throw new Error('请先在设置中填写同步密码');
  await apiPut(path, JSON.parse(content), syncSecret, sha);
}

export async function saveDayData(repo: string, token: string, data: DayData): Promise<void> {
  const path = `data/${data.date.slice(0, 4)}/${data.date.slice(5, 7)}/${data.date}.json`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await getFile(repo, token, path);
    const remote = existing ? JSON.parse(existing.content) as DayData : null;
    const records = new Map<string, DayData['pomodoros'][number]>();
    for (const record of [...(remote?.pomodoros ?? []), ...data.pomodoros]) {
      const key = [record.start, record.end, record.taskId ?? '', record.createdAt].join('|');
      records.set(key, record);
    }
    const pomodoros = [...records.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const merged: DayData = {
      ...remote,
      ...data,
      pomodoros,
      totalFocusMinutes: pomodoros.reduce((sum, item) => sum + item.duration, 0),
      totalPomodoros: pomodoros.length,
    };
    try {
      await putFile(repo, token, path, JSON.stringify(merged, null, 2), existing?.sha);
      return;
    } catch (error) {
      if (!(error instanceof SyncConflictError) || attempt === 2) throw error;
    }
  }
}

export async function loadDayData(repo: string, token: string, date: string): Promise<DayData | null> {
  const path = `data/${date.slice(0, 4)}/${date.slice(5, 7)}/${date}.json`;
  const file = await getFile(repo, token, path);
  if (!file) return null;
  return JSON.parse(file.content) as DayData;
}

export async function loadMultipleDays(repo: string, token: string, dates: string[]): Promise<Map<string, DayData>> {
  const map = new Map<string, DayData>();
  await Promise.all(dates.map(async (date) => {
    try {
      const data = await loadDayData(repo, token, date);
      if (data) map.set(date, data);
    } catch (error) {
      console.warn(`Failed to load ${date}`, error);
    }
  }));
  return map;
}

const CONFIG_PATH = 'config.json';

export async function saveConfig(repo: string, token: string, data: ConfigData): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await getFile(repo, token, CONFIG_PATH);
    const remote = existing ? JSON.parse(existing.content) as ConfigData : null;
    const todoMap = new Map((remote?.todos ?? []).map(todo => [todo.id, todo]));
    for (const todo of data.todos) {
      const current = todoMap.get(todo.id);
      const currentTime = current?.updatedAt || current?.createdAt || '';
      const nextTime = todo.updatedAt || todo.createdAt || '';
      if (!current || nextTime >= currentTime) todoMap.set(todo.id, todo);
    }
    const merged: ConfigData = {
      settings: remote && remote.updatedAt > data.updatedAt ? remote.settings : data.settings,
      todos: [...todoMap.values()],
      updatedAt: new Date().toISOString(),
    };
    try {
      await putFile(repo, token, CONFIG_PATH, JSON.stringify(merged, null, 2), existing?.sha);
      return;
    } catch (error) {
      if (!(error instanceof SyncConflictError) || attempt === 2) throw error;
    }
  }
}

export async function loadConfig(repo: string, token: string): Promise<ConfigData | null> {
  const file = await getFile(repo, token, CONFIG_PATH);
  if (!file) return null;
  return JSON.parse(file.content) as ConfigData;
}
