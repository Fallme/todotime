import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = 'Fallme/todotime';
const API = 'https://api.github.com';

async function gh(path: string, method = 'GET', body?: unknown) {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${await res.text()}`);
  return res.json();
}

// Read file
app.get('/api/file/:path(*)', async (req, res) => {
  try {
    const data = await gh(`/repos/${REPO}/contents/${req.params.path}`);
    const content = JSON.parse(Buffer.from(data.content, 'base64').toString());
    res.json({ content, sha: data.sha });
  } catch (e: any) {
    if (e.message.includes('404')) res.json(null);
    else res.status(500).json({ error: e.message });
  }
});

// Write file (create or update)
app.put('/api/file/:path(*)', async (req, res) => {
  try {
    const filePath = req.params.path;
    const { content, sha } = req.body;
    const encoded = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');
    const body: Record<string, unknown> = { message: `Update ${filePath}`, content: encoded };
    if (sha) body.sha = sha;
    const result = await gh(`/repos/${REPO}/contents/${filePath}`, 'PUT', body);
    res.json({ sha: result.content.sha });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
