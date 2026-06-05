import type { DayData, ConfigData } from '../types';

const GITHUB_API = 'https://api.github.com';
const PROXY_URL = 'https://todotime-api.onrender.com';

interface GitHubFile { sha: string; content: string; }

async function githubFetch(token: string, url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json', ...options.headers as Record<string, string> };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

// Read via proxy (no token needed)
async function proxyGet(path: string): Promise<{ content: unknown; sha: string } | null> {
  const res = await fetch(`${PROXY_URL}/api/file?path=${encodeURIComponent(path)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
  return res.json();
}

// Write via proxy (no token needed)
async function proxyPut(path: string, content: unknown, sha?: string): Promise<string> {
  const res = await fetch(`${PROXY_URL}/api/file`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content, sha }),
  });
  if (!res.ok) throw new Error(`Proxy write error: ${res.status}`);
  const d = await res.json();
  return d.sha;
}

export async function getFile(repo: string, token: string, path: string): Promise<GitHubFile | null> {
  if (!token) {
    const d = await proxyGet(path);
    if (!d) return null;
    return { sha: d.sha, content: JSON.stringify(d.content) };
  }
  const res = await githubFetch(token, `${GITHUB_API}/repos/${repo}/contents/${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = await res.json();
  return { sha: data.sha, content: decodeURIComponent(escape(atob(data.content))) };
}

export async function putFile(repo: string, token: string, path: string, content: string, sha?: string, message?: string): Promise<void> {
  if (!token) {
    await proxyPut(path, JSON.parse(content), sha);
    return;
  }
  const body: Record<string, string> = { message: message || `Update ${path}`, content: btoa(unescape(encodeURIComponent(content))) };
  if (sha) body.sha = sha;
  const res = await githubFetch(token, `${GITHUB_API}/repos/${repo}/contents/${path}`, { method: 'PUT', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`GitHub commit failed: ${res.status}`);
}

export async function saveDayData(repo: string, token: string, data: DayData): Promise<void> {
  const path = `data/${data.date.slice(0, 4)}/${data.date.slice(5, 7)}/${data.date}.json`;
  const existing = await getFile(repo, token, path);
  await putFile(repo, token, path, JSON.stringify(data, null, 2), existing?.sha);
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
    try { const data = await loadDayData(repo, token, date); if (data) map.set(date, data); } catch {}
  }));
  return map;
}

const CONFIG_PATH = 'config.json';

export async function saveConfig(repo: string, token: string, data: ConfigData): Promise<void> {
  const existing = await getFile(repo, token, CONFIG_PATH);
  await putFile(repo, token, CONFIG_PATH, JSON.stringify(data, null, 2), existing?.sha);
}

export async function loadConfig(repo: string, token: string): Promise<ConfigData | null> {
  const file = await getFile(repo, token, CONFIG_PATH);
  if (!file) return null;
  return JSON.parse(file.content) as ConfigData;
}
