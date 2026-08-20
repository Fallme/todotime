import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isDeveloperSyncCode } from '../api/developer.ts';

test('developer access uses a timing-safe server-side hash check', () => {
  const testCode = 'TT-UNIT-TEST-DEVELOPER';
  const expectedHash = createHash('sha256').update(testCode).digest('hex');

  assert.equal(isDeveloperSyncCode(testCode, expectedHash), true);
  assert.equal(isDeveloperSyncCode(`  ${testCode.toLowerCase()}  `, expectedHash), true);
  assert.equal(isDeveloperSyncCode('TT-UNIT-TEST-OTHER', expectedHash), false);
  assert.equal(isDeveloperSyncCode('short', expectedHash), false);
});

test('developer code is absent from the browser bundle and the button is server-authorized', async () => {
  const { readFile } = await import('node:fs/promises');
  const api = await readFile(new URL('../api/developer.ts', import.meta.url), 'utf8');
  const settings = await readFile(new URL('../src/components/Settings/SettingsPanel.tsx', import.meta.url), 'utf8');
  const routes = await readFile(new URL('../vercel.json', import.meta.url), 'utf8');

  assert.doesNotMatch(api, /TT-[A-Z0-9-]{12,}/);
  assert.match(api, /timingSafeEqual/);
  assert.match(settings, /checkDeveloperAccess\(settings\.syncCode\)/);
  assert.match(settings, /isDeveloper && <button[^>]+developer-view-btn/);
  assert.ok(routes.indexOf('/api/developer') < routes.indexOf('/api/(.*)'));
});
