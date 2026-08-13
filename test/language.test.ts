import assert from 'node:assert/strict';
import test from 'node:test';

test('promotion material includes both Chinese and English launch copy', async () => {
  const { readFile } = await import('node:fs/promises');
  const copy = await readFile(new URL('../docs/PROMOTION.md', import.meta.url), 'utf8');
  assert.match(copy, /中文短介绍/);
  assert.match(copy, /English short description/);
  assert.match(copy, /专属码多端同步/);
  assert.match(copy, /private code-based sync/);
});
