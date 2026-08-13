const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_DATA_REPO;
const SYNC_SECRET = process.env.SYNC_SECRET;
const API = 'https://api.github.com';

app.use('/api', (req, res, next) => {
  if (!TOKEN || !REPO || REPO === 'Fallme/todotime' || !SYNC_SECRET) {
    return res.status(503).json({ error: 'Private data sync is not configured' });
  }
  if (req.get('X-Sync-Secret') !== SYNC_SECRET) {
    return res.status(401).json({ error: 'Invalid sync password' });
  }
  next();
});

app.get('/api/file', async (req, res) => {
  try {
    const r = await fetch(`${API}/repos/${REPO}/contents/${req.query.path}`, {
      headers: { Accept: 'application/vnd.github.v3+json', Authorization: `Bearer ${TOKEN}` },
    });
    if (r.status === 404) return res.json(null);
    if (!r.ok) throw new Error(`${r.status}`);
    const d = await r.json();
    res.json({ content: JSON.parse(Buffer.from(d.content, 'base64').toString()), sha: d.sha });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/file', async (req, res) => {
  try {
    const { path, content, sha } = req.body;
    const encoded = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');
    const body = { message: `Update ${path}`, content: encoded };
    if (sha) body.sha = sha;
    const r = await fetch(`${API}/repos/${REPO}/contents/${path}`, {
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
