import type { VercelRequest, VercelResponse } from '@vercel/node';

const TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = 'Fallme/todotime';
const API = 'https://api.github.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: 'path required' });

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${API}/repos/${REPO}/contents/${filePath}`, {
        headers: { Accept: 'application/vnd.github.v3+json', Authorization: `Bearer ${TOKEN}` },
      });
      if (r.status === 404) return res.status(404).json(null);
      if (!r.ok) throw new Error(`${r.status}`);
      const data = await r.json() as { content: string; sha: string };
      const content = JSON.parse(Buffer.from(data.content, 'base64').toString());
      return res.json({ content, sha: data.sha });
    }

    if (req.method === 'PUT') {
      const { content, sha } = req.body;
      const encoded = Buffer.from(JSON.stringify(content, null, 2)).toString('base64');
      const body: Record<string, unknown> = { message: `Update ${filePath}`, content: encoded };
      if (sha) body.sha = sha;
      const r = await fetch(`${API}/repos/${REPO}/contents/${filePath}`, {
        method: 'PUT',
        headers: { Accept: 'application/vnd.github.v3+json', Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      const result = await r.json() as { content: { sha: string } };
      return res.json({ sha: result.content.sha });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
