import type { DayData, ConfigData } from '../types';

// API URL - Vercel serverless function or direct GitHub
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'  // local dev proxy
  : `${window.location.origin}/api`;  // Vercel serverless

const GITHUB_API = 'https://api.github.com';

interface GitHubFile {
  sha: string;
  content: string;
}

// Use Vercel API when no token, direct GitHub API when token available
async function apiFetch(repo: string, token: string, path: string, method = 'GET', body?: unknown): Promise<unknown> {
  if (!token) {
    // Use Vercel serverless API (token on server)
    const url = `${API_BASE}/file?path=${encodeURIComponent(path)}`;
    if (method === 'GET') {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    } else {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    }
  }
  // Direct GitHub API
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}`, opts);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

export async function getFile(repo: string, token: string, path: string): Promise<GitHubFile | null> {
  const data = await apiFetch(repo, token, path) as { content?: string; sha?: string } | null;
  if (!data || !data.content) return null;
  const content = decodeURIComponent(escape(atob(data.content)));
  return { sha: data.sha || '', content };
}

export async function putFile(
  repo: string, token: string, path: string, content: string, sha?: string, message?: string,
): Promise<void> {
  if (!token) {
    // Use Vercel API
    await apiFetch(repo, token, path, 'PUT', { content: JSON.parse(content), sha });
    return;
  }
  const body: Record<string, string> = {
    message: message || `Update ${path}`,
    content: btoa(unescape(encodeURIComponent(content))),
  };
  if (sha) body.sha = sha;
  await apiFetch(repo, token, path, 'PUT', body);
}

export async function saveDayData(repo: string, token: string, data: DayData): Promise<void> {
  const path = `data/${data.date.slice(0, 4)}/${data.date.slice(5, 7)}/${data.date}.json`;
  const content = JSON.stringify(data, null, 2);
  const existing = await getFile(repo, token, path);
  await putFile(repo, token, path, content, existing?.sha, `Update ${data.date} data`);
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
    } catch { /* file doesn't exist */ }
  }));
  return map;
}

const CONFIG_PATH = 'config.json';

export async function saveConfig(repo: string, token: string, data: ConfigData): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  const existing = await getFile(repo, token, CONFIG_PATH);
  await putFile(repo, token, CONFIG_PATH, content, existing?.sha, 'Update config');
}

export async function loadConfig(repo: string, token: string): Promise<ConfigData | null> {
  const file = await getFile(repo, token, CONFIG_PATH);
  if (!file) return null;
  return JSON.parse(file.content) as ConfigData;
}
