import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, normalizeTheme, THEME_IDS } from '../src/types/index.ts';

test('theme gallery exposes exactly ten distinct styles', () => {
  assert.equal(THEME_IDS.length, 10);
  assert.equal(new Set(THEME_IDS).size, 10);
  assert.deepEqual(THEME_IDS, [
    'tomato', 'apple', 'sketch', 'pixel', 'cyber',
    'matcha', 'ocean', 'ink', 'sunset', 'midnight',
  ]);
});

test('existing profiles keep the classic tomato theme', () => {
  assert.equal(DEFAULT_SETTINGS.theme, 'tomato');
  assert.equal(normalizeTheme(undefined), 'tomato');
  assert.equal(normalizeTheme('unknown-theme'), 'tomato');
});

test('known themes survive settings normalization', () => {
  for (const theme of THEME_IDS) assert.equal(normalizeTheme(theme), theme);
});

test('settings keeps theme selection in a secondary picker', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../src/components/Settings/SettingsPanel.tsx', import.meta.url), 'utf8');
  assert.match(source, /className="theme-picker-trigger"/);
  assert.match(source, /showThemePicker &&/);
  assert.match(source, /className="modal-content theme-picker-modal"/);
});
