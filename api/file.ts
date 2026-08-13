import { createHash } from 'node:crypto';

interface ApiRequest {
  method?: string;
  query: { path?: string | string[] };
  body?: { path?: string; content?: unknown; sha?: string };
  headers: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  end: () => void;
}

interface GitHubContentResponse { content: string; sha: string }
interface GitHubWriteResponse { content?: { sha?: string } }

const ALLOWED_PATH = /^(config\.json|history\.json|data\/\d{4}\/\d{2}\/\d{4}-\d{2}-\d{2}\.json)$/;
const CODE_PATTERN = /^[A-Z0-9_-]{12,64}$/;
const MAX_CONTENT_BYTES = 2 * 1024 * 1024;

function getProfilePath(syncCode: string, filePath: string): string {
  const profileId = createHash('sha256').update(syncCode).digest('hex').slice(0, 24);
  return `profiles/${profileId}/${filePath}`;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const allowedOrigin = process.env.SYNC_ALLOWED_ORIGIN;
  const requestOrigin = req.headers.origin;
  if (allowedOrigin && requestOrigin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sync-Code, X-Sync-Secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const TOKEN = process.env.GITHUB_TOKEN;
  const REPO = process.env.GITHUB_DATA_REPO;
  const API = 'https://api.github.com';
  const suppliedCode = req.headers['x-sync-code'] ?? req.headers['x-sync-secret'];
  const syncCode = (Array.isArray(suppliedCode) ? suppliedCode[0] : suppliedCode)?.trim().toUpperCase();
  if (!REPO || REPO === 'Fallme/todotime') {
    return res.status(503).json({ error: 'A separate private data repository is required' });
  }
  if (!syncCode || !CODE_PATTERN.test(syncCode)) {
    return res.status(401).json({ error: 'Invalid sync code' });
  }
  const filePath = req.method === 'PUT' ? req.body?.path : req.query.path;
  if (typeof filePath !== 'string' || !ALLOWED_PATH.test(filePath)) {
    return res.status(400).json({ error: 'invalid path' });
  }
  if (!TOKEN) return res.status(503).json({ error: 'GitHub sync is not configured' });
  const profilePath = getProfilePath(syncCode, filePath);

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${API}/repos/${REPO}/contents/${profilePath}`, {
        headers: { Accept: 'application/vnd.github.v3+json', Authorization: `Bearer ${TOKEN}` },
      });
      if (r.status === 404) return res.status(404).json(null);
      if (r.status === 409 || r.status === 422) return res.status(409).json({ error: 'file changed' });
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json() as GitHubContentResponse;
      const content = JSON.parse(Buffer.from(d.content, 'base64').toString());
      return res.json({ content, sha: d.sha });
    }
    if (req.method === 'PUT') {
      const { content, sha } = req.body ?? {};
      if (content === undefined) return res.status(400).json({ error: 'content required' });
      const serialized = JSON.stringify(content, null, 2);
      if (Buffer.byteLength(serialized, 'utf8') > MAX_CONTENT_BYTES) {
        return res.status(413).json({ error: 'content too large' });
      }
      const encoded = Buffer.from(serialized).toString('base64');
      const body: { message: string; content: string; sha?: string } = { message: `Update ${profilePath}`, content: encoded };
      if (sha) body.sha = sha;
      const r = await fetch(`${API}/repos/${REPO}/contents/${profilePath}`, {
        method: 'PUT',
        headers: { Accept: 'application/vnd.github.v3+json', Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.status === 409 || r.status === 422) return res.status(409).json({ error: 'file changed' });
      if (!r.ok) throw new Error(`${r.status}`);
      const result = await r.json() as GitHubWriteResponse;
      if (!result.content?.sha) throw new Error('GitHub returned no file SHA');
      return res.json({ sha: result.content.sha });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    res.status(502).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
