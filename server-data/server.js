#!/usr/bin/env node
/**
 * TodoTime 数据存储服务（服务器版）
 * 兼容原 Vercel /api/file 与 /api/developer 接口契约，数据落盘到本地文件。
 * 无第三方依赖，Node 18+ 可直接运行。
 */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DATA_DIR = process.env.DATA_DIR || '/home/ubuntu/apps/todotime/data';
const PORT = Number(process.env.PORT || 3010);
const HOST = process.env.HOST || '127.0.0.1';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://todotime-mauve.vercel.app';
const CODE_PATTERN = /^[A-Z0-9_-]{12,64}$/;
const ALLOWED_PATH = /^(config\.json|history\.json|feedback\.json|data\/\d{4}\/\d{2}\/\d{4}-\d{2}-\d{2}\.json)$/;
const MAX_CONTENT_BYTES = 2 * 1024 * 1024;
const FALLBACK_DEVELOPER_CODE_HASH = 'b6da8821ad2a6fb44864e84c60d013bbcd9313f9aae8de93cf5097249d5230ee';
const MAX_PROFILES = 250;

function sha256(v) { return crypto.createHash('sha256').update(v).digest('hex'); }
function gitBlobSha(content) {
  const buf = Buffer.from(content, 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest('hex');
}
function profileId(code) { return sha256(code).slice(0, 24); }
function profileDir(code) { return path.join(DATA_DIR, 'profiles', profileId(code)); }
function safeFilePath(code, filePath) { return path.join(profileDir(code), filePath); }

function getHeader(req, name) {
  const v = req.headers[name];
  return (Array.isArray(v) ? v[0] : v || '').trim();
}
function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && (origin === ALLOWED_ORIGIN || ALLOWED_ORIGIN === '*')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sync-Code, X-Sync-Secret');
  res.setHeader('Cache-Control', 'private, no-store');
}
function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > MAX_CONTENT_BYTES + 65536) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
function normalizedCode(req) {
  return (getHeader(req, 'x-sync-code') || getHeader(req, 'x-sync-secret') || '').toUpperCase();
}
function isDeveloper(code, expectedHash) {
  if (!CODE_PATTERN.test(code) || !/^[a-f0-9]{64}$/i.test(expectedHash)) return false;
  const a = Buffer.from(sha256(code), 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function handleFile(req, res, url) {
  const code = normalizedCode(req);
  if (!code || !CODE_PATTERN.test(code)) return json(res, 401, { error: 'Invalid sync code' });
  const filePath = req.method === 'PUT' ? undefined : url.searchParams.get('path');
  if (req.method === 'GET') {
    if (!filePath || !ALLOWED_PATH.test(filePath)) return json(res, 400, { error: 'invalid path' });
    const full = safeFilePath(code, filePath);
    if (!fs.existsSync(full)) return json(res, 404, null);
    const raw = fs.readFileSync(full, 'utf8');
    try { return json(res, 200, { content: JSON.parse(raw), sha: gitBlobSha(raw) }); }
    catch { return json(res, 500, { error: 'corrupt stored file' }); }
  }
  if (req.method === 'PUT') {
    return readBody(req).then(body => {
      const p = body && body.path;
      if (typeof p !== 'string' || !ALLOWED_PATH.test(p)) return json(res, 400, { error: 'invalid path' });
      if (body.content === undefined) return json(res, 400, { error: 'content required' });
      const serialized = JSON.stringify(body.content, null, 2);
      if (Buffer.byteLength(serialized, 'utf8') > MAX_CONTENT_BYTES) return json(res, 413, { error: 'content too large' });
      const full = safeFilePath(code, p);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      if (body.sha) {
        if (!fs.existsSync(full)) return json(res, 409, { error: 'file changed' });
        const current = gitBlobSha(fs.readFileSync(full, 'utf8'));
        if (body.sha !== current) return json(res, 409, { error: 'file changed' });
      }
      fs.writeFileSync(full, serialized, 'utf8');
      return json(res, 200, { sha: gitBlobSha(serialized) });
    }).catch(e => json(res, 400, { error: e.message }));
  }
  return json(res, 405, { error: 'Method not allowed' });
}

function getStoredPomodoroCount(r) {
  if (Number.isFinite(r.pomodoroCount)) return Math.max(0, Math.floor(Number(r.pomodoroCount)));
  if (typeof r.countsAsPomodoro === 'boolean') return r.countsAsPomodoro ? 1 : 0;
  return Number(r.duration) >= 15 ? 1 : 0;
}
function lastDate(v) { return v.filter(Boolean).sort((a, b) => b.localeCompare(a))[0] || ''; }

function buildOverview(developerCode) {
  const root = path.join(DATA_DIR, 'profiles');
  const ids = fs.existsSync(root)
    ? fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory() && /^[a-f0-9]{24}$/.test(d.name)).map(d => d.name).slice(0, MAX_PROFILES)
    : [];
  const devId = profileId(developerCode);
  const feedback = [];
  const users = ids.map(id => {
    const dir = path.join(root, id);
    const readJson = name => {
      const f = path.join(dir, name);
      if (!fs.existsSync(f)) return undefined;
      try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return undefined; }
    };
    const config = readJson('config.json');
    const history = readJson('history.json');
    const fb = readJson('feedback.json');
    const todos = (config && config.todos ? config.todos : []).filter(t => !t.deletedAt);
    const days = Object.entries((history && history.days) || {});
    let totalFocusMinutes = 0, totalPomodoros = 0;
    const activeDates = [];
    for (const [date, day] of days) {
      const records = (day && day.pomodoros) || [];
      const minutes = records.length
        ? records.reduce((s, r) => s + Math.max(0, Number(r.duration) || 0), 0)
        : Math.max(0, Number(day.totalFocusMinutes) || 0);
      const poms = records.length
        ? records.reduce((s, r) => s + getStoredPomodoroCount(r), 0)
        : Math.max(0, Number(day.totalPomodoros) || 0);
      totalFocusMinutes += minutes; totalPomodoros += poms;
      if (minutes > 0 || poms > 0) activeDates.push(date);
    }
    for (const item of (fb && fb.items) || []) {
      if (!item.content || !item.createdAt) continue;
      feedback.push({ id: item.id || `${id}-${item.createdAt}`, profileId: id, createdAt: item.createdAt, content: String(item.content).slice(0, 2000), language: item.language || '' });
    }
    return {
      profileId: id, isDeveloper: id === devId,
      lastActiveDate: lastDate(activeDates),
      lastUpdatedAt: lastDate([(config && config.updatedAt) || '', (history && history.updatedAt) || '', ...((fb && fb.items) || []).map(i => i.createdAt || '')]),
      totalFocusMinutes, totalPomodoros,
      taskCount: todos.length, completedTaskCount: todos.filter(t => t.done).length,
      activeTaskCount: todos.filter(t => !t.done && !t.abandoned).length,
      feedbackCount: ((fb && fb.items) || []).length,
    };
  }).sort((a, b) => (b.lastActiveDate || b.lastUpdatedAt).localeCompare(a.lastActiveDate || a.lastUpdatedAt));
  feedback.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const cutoff7 = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const cutoff30 = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  return {
    generatedAt: new Date().toISOString(),
    truncated: ids.length >= MAX_PROFILES,
    totals: {
      users: users.length,
      active7Days: users.filter(u => u.lastActiveDate >= cutoff7).length,
      active30Days: users.filter(u => u.lastActiveDate >= cutoff30).length,
      totalFocusMinutes: users.reduce((s, u) => s + u.totalFocusMinutes, 0),
      totalPomodoros: users.reduce((s, u) => s + u.totalPomodoros, 0),
      totalTasks: users.reduce((s, u) => s + u.taskCount, 0),
      feedback: feedback.length,
    },
    users, feedback: feedback.slice(0, 500),
  };
}

function handleDeveloper(req, res, url) {
  const code = normalizedCode(req);
  if (!isDeveloper(code, process.env.DEVELOPER_SYNC_CODE_HASH || FALLBACK_DEVELOPER_CODE_HASH)) {
    return json(res, 403, { error: 'Developer access required' });
  }
  const mode = url.searchParams.get('mode');
  if (mode === 'status') return json(res, 200, { isDeveloper: true });
  if (mode === 'overview') {
    try { return json(res, 200, buildOverview(code)); }
    catch (e) { return json(res, 500, { error: e.message }); }
  }
  return json(res, 400, { error: 'invalid mode' });
}

const server = http.createServer((req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  // Caddy handle_path strips /todotime-api, so upstream sees /file and /developer.
  // Accept both stripped and /api-prefixed forms.
  let apiPath = url.pathname;
  if (apiPath === '/file') apiPath = '/api/file';
  if (apiPath === '/developer') apiPath = '/api/developer';
  try {
    if (apiPath === '/api/file') return handleFile(req, res, url);
    if (apiPath === '/api/developer') return handleDeveloper(req, res, url);
    if (apiPath === '/healthz') return json(res, 200, { ok: true });
    return json(res, 404, { error: 'not found' });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
});

fs.mkdirSync(DATA_DIR, { recursive: true });
server.listen(PORT, HOST, () => console.log(`todotime-data listening on ${HOST}:${PORT}, data=${DATA_DIR}`));
