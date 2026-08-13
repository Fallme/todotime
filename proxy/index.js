const express = require('express');
const cors = require('cors');
const { createHash } = require('node:crypto');
const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_DATA_REPO;
const API = 'https://api.github.com';
const ALLOWED_PATH = /^(config\.json|history\.json|data\/\d{4}\/\d{2}\/\d{4}-\d{2}-\d{2}\.json)$/;
const CODE_PATTERN = /^[A-Z0-9_-]{12,64}$/;

function profilePath(code, filePath) {
  const id = createHash('sha256').update(code).digest('hex').slice(0, 24);
  return `profiles/${id}/${filePath}`;
}

app.use('/api', (req, res, next) => {
  if (!TOKEN || !REPO || REPO === 'Fallme/todotime') {
    return res.status(503).json({ error: 'Private data sync is not configured' });
  }
  const code = (req.get('X-Sync-Code') || req.get('X-Sync-Secret') || '').trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) {
    return res.status(401).json({ error: 'Invalid sync code' });
  }
  req.syncCode = code;
  next();
});

app.get('/api/file', async (req, res) => {
  try {
    if (typeof req.query.path !== 'string' || !ALLOWED_PATH.test(req.query.path)) return res.status(400).json({ error: 'invalid path' });
    const r = await fetch(`${API}/repos/${REPO}/contents/${profilePath(req.syncCode, req.query.path)}`, {
      headers: { Accept: 'application/vnd.github.v3+json', Authorization: `Bearer ${TOKEN}` },
    });
    if (r.status === 404) return res.status(404).json(null);
    if (!r.ok) throw new Error(`${r.status}`);
    const d = await r.json();
    res.json({ content: JSON.parse(Buffer.from(d.content, 'base64').toString()), sha: d.sha });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/file', async (req, res) => {
  try {
    const { path, content, sha } = req.body;
    if (typeof path !== 'string' || !ALLOWED_PATH.test(path)) return res.status(400).json({ error: 'invalid path' });
    const targetPath = profilePath(req.syncCode, path);
    const encoded = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');
    const body = { message: `Update ${targetPath}`, content: encoded };
    if (sha) body.sha = sha;
    const r = await fetch(`${API}/repos/${REPO}/contents/${targetPath}`, {
      method: 'PUT',
      headers: { Accept: 'application/vnd.github.v3+json', Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`${r.status}`);
    const d = await r.json();
    res.json({ sha: d.content.sha });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(process.env.PORT || 3001, () => console.log('Proxy running'));
