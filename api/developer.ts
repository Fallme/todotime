import { createHash, timingSafeEqual } from 'node:crypto';

interface ApiRequest {
  method?: string;
  query: { mode?: string | string[] };
  headers: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  end: () => void;
}

interface GitHubRepoResponse { default_branch?: string }
interface GitHubTreeItem { path?: string; type?: string; sha?: string }
interface GitHubTreeResponse { tree?: GitHubTreeItem[]; truncated?: boolean }
interface GitHubBlobResponse { content?: string; encoding?: string }

interface StoredFeedback {
  id?: string;
  createdAt?: string;
  content?: string;
  language?: string;
}

interface StoredTodo {
  id?: string;
  done?: boolean;
  abandoned?: boolean;
  deletedAt?: string;
}

interface StoredPomodoro {
  id?: string;
  duration?: number;
  pomodoroCount?: number;
  countsAsPomodoro?: boolean;
}

interface StoredDay {
  pomodoros?: StoredPomodoro[];
  totalFocusMinutes?: number;
  totalPomodoros?: number;
}

interface ProfileFiles {
  profileId: string;
  config?: { todos?: StoredTodo[]; updatedAt?: string };
  history?: { days?: Record<string, StoredDay>; updatedAt?: string };
  feedback?: { items?: StoredFeedback[] };
}

const FALLBACK_DEVELOPER_CODE_HASH = 'b6da8821ad2a6fb44864e84c60d013bbcd9313f9aae8de93cf5097249d5230ee';
const CODE_PATTERN = /^[A-Z0-9_-]{12,64}$/;
const PROFILE_FILE_PATTERN = /^profiles\/([a-f0-9]{24})\/(config|history|feedback)\.json$/;
const MAX_PROFILES = 250;

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function isDeveloperSyncCode(syncCode: string, expectedHash = process.env.DEVELOPER_SYNC_CODE_HASH || FALLBACK_DEVELOPER_CODE_HASH): boolean {
  const normalized = normalizeCode(syncCode);
  if (!CODE_PATTERN.test(normalized) || !/^[a-f0-9]{64}$/i.test(expectedHash)) return false;
  const actual = Buffer.from(sha256(normalized), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function getHeader(req: ApiRequest, name: string): string {
  const value = req.headers[name];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

function setCors(req: ApiRequest, res: ApiResponse): void {
  const allowedOrigin = process.env.SYNC_ALLOWED_ORIGIN;
  const requestOrigin = req.headers.origin;
  if (allowedOrigin && requestOrigin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sync-Code, X-Sync-Secret');
  res.setHeader('Cache-Control', 'private, no-store');
}

async function githubJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) throw new Error(`GitHub ${response.status}`);
  return response.json() as Promise<T>;
}

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

function parseBlob(blob: GitHubBlobResponse): unknown {
  if (blob.encoding !== 'base64' || !blob.content) return null;
  return JSON.parse(Buffer.from(blob.content.replace(/\n/g, ''), 'base64').toString('utf8'));
}

function lastDate(values: string[]): string {
  return values.filter(Boolean).sort((a, b) => b.localeCompare(a))[0] ?? '';
}

export function getStoredPomodoroCount(record: StoredPomodoro): number {
  if (Number.isFinite(record.pomodoroCount)) return Math.max(0, Math.floor(Number(record.pomodoroCount)));
  if (typeof record.countsAsPomodoro === 'boolean') return record.countsAsPomodoro ? 1 : 0;
  return Number(record.duration) >= 15 ? 1 : 0;
}

function buildOverview(profiles: ProfileFiles[], developerProfileId: string, treeTruncated: boolean) {
  const feedback: Array<{ id: string; profileId: string; createdAt: string; content: string; language: string }> = [];
  const users = profiles.map(profile => {
    const todos = (profile.config?.todos ?? []).filter(todo => !todo.deletedAt);
    const days = Object.entries(profile.history?.days ?? {});
    let totalFocusMinutes = 0;
    let totalPomodoros = 0;
    const activeDates: string[] = [];

    for (const [date, day] of days) {
      const records = day.pomodoros ?? [];
      const minutes = records.length
        ? records.reduce((sum, record) => sum + Math.max(0, Number(record.duration) || 0), 0)
        : Math.max(0, Number(day.totalFocusMinutes) || 0);
      const pomodoros = records.length
        ? records.reduce((sum, record) => sum + getStoredPomodoroCount(record), 0)
        : Math.max(0, Number(day.totalPomodoros) || 0);
      totalFocusMinutes += minutes;
      totalPomodoros += pomodoros;
      if (minutes > 0 || pomodoros > 0) activeDates.push(date);
    }

    for (const item of profile.feedback?.items ?? []) {
      if (!item.content || !item.createdAt) continue;
      feedback.push({
        id: item.id || `${profile.profileId}-${item.createdAt}`,
        profileId: profile.profileId,
        createdAt: item.createdAt,
        content: item.content.slice(0, 2000),
        language: item.language || '',
      });
    }

    const lastActiveDate = lastDate(activeDates);
    const lastUpdatedAt = lastDate([
      profile.config?.updatedAt ?? '',
      profile.history?.updatedAt ?? '',
      ...(profile.feedback?.items ?? []).map(item => item.createdAt ?? ''),
    ]);
    return {
      profileId: profile.profileId,
      isDeveloper: profile.profileId === developerProfileId,
      lastActiveDate,
      lastUpdatedAt,
      totalFocusMinutes,
      totalPomodoros,
      taskCount: todos.length,
      completedTaskCount: todos.filter(todo => todo.done).length,
      activeTaskCount: todos.filter(todo => !todo.done && !todo.abandoned).length,
      feedbackCount: (profile.feedback?.items ?? []).length,
    };
  }).sort((a, b) => (b.lastActiveDate || b.lastUpdatedAt).localeCompare(a.lastActiveDate || a.lastUpdatedAt));

  feedback.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const cutoff7 = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  const cutoff30 = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);
  return {
    generatedAt: new Date().toISOString(),
    truncated: treeTruncated || profiles.length >= MAX_PROFILES,
    totals: {
      users: users.length,
      active7Days: users.filter(user => user.lastActiveDate >= cutoff7).length,
      active30Days: users.filter(user => user.lastActiveDate >= cutoff30).length,
      totalFocusMinutes: users.reduce((sum, user) => sum + user.totalFocusMinutes, 0),
      totalPomodoros: users.reduce((sum, user) => sum + user.totalPomodoros, 0),
      totalTasks: users.reduce((sum, user) => sum + user.taskCount, 0),
      feedback: feedback.length,
    },
    users,
    feedback: feedback.slice(0, 500),
  };
}

async function loadOverview(repo: string, token: string, developerCode: string) {
  const api = 'https://api.github.com';
  const repoInfo = await githubJson<GitHubRepoResponse>(`${api}/repos/${repo}`, token);
  const branch = repoInfo.default_branch || 'main';
  const tree = await githubJson<GitHubTreeResponse>(`${api}/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, token);
  const entries = (tree.tree ?? []).flatMap(item => {
    const match = item.path?.match(PROFILE_FILE_PATTERN);
    return match && item.type === 'blob' && item.sha
      ? [{ profileId: match[1], kind: match[2] as 'config' | 'history' | 'feedback', sha: item.sha }]
      : [];
  });
  const profileIds = [...new Set(entries.map(entry => entry.profileId))].slice(0, MAX_PROFILES);
  const allowedProfiles = new Set(profileIds);
  const relevantEntries = entries.filter(entry => allowedProfiles.has(entry.profileId));
  const loaded = await mapLimit(relevantEntries, 8, async entry => {
    const blob = await githubJson<GitHubBlobResponse>(`${api}/repos/${repo}/git/blobs/${entry.sha}`, token);
    return { ...entry, content: parseBlob(blob) };
  });
  const byProfile = new Map<string, ProfileFiles>(profileIds.map(profileId => [profileId, { profileId }]));
  for (const entry of loaded) {
    const profile = byProfile.get(entry.profileId);
    if (profile && entry.content && typeof entry.content === 'object') {
      profile[entry.kind] = entry.content as never;
    }
  }
  return buildOverview([...byProfile.values()], sha256(normalizeCode(developerCode)).slice(0, 24), Boolean(tree.truncated));
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const developerCode = getHeader(req, 'x-sync-code') || getHeader(req, 'x-sync-secret');
  if (!isDeveloperSyncCode(developerCode)) return res.status(403).json({ error: 'Developer access required' });
  const rawMode = req.query.mode;
  const mode = Array.isArray(rawMode) ? rawMode[0] : rawMode;
  if (mode === 'status') return res.json({ isDeveloper: true });

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_DATA_REPO;
  if (!repo || repo === 'Fallme/todotime') return res.status(503).json({ error: 'A separate private data repository is required' });
  if (!token) return res.status(503).json({ error: 'GitHub sync is not configured' });

  try {
    return res.json(await loadOverview(repo, token, developerCode));
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : 'Unable to load developer overview' });
  }
}
