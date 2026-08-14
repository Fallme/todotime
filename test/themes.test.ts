import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, normalizeTheme, THEME_IDS } from '../src/types/index.ts';

test('theme gallery exposes exactly seventeen distinct styles', () => {
  assert.equal(THEME_IDS.length, 17);
  assert.equal(new Set(THEME_IDS).size, 17);
  assert.deepEqual(THEME_IDS, [
    'tomato', 'apple', 'sketch', 'pixel', 'cyber',
    'matcha', 'ocean', 'ink', 'midnight',
    'monochrome', 'constructivist', 'toy3d', 'oilpaint',
    'modernist', 'lineart', 'crayon', 'liquidglass',
  ]);
});

test('existing profiles keep the classic tomato theme', () => {
  assert.equal(DEFAULT_SETTINGS.theme, 'tomato');
  assert.equal(normalizeTheme(undefined), 'tomato');
  assert.equal(normalizeTheme('unknown-theme'), 'tomato');
  assert.equal(normalizeTheme('sunset'), 'tomato');
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

test('new theme choices include matching picker entries and visual rules', async () => {
  const { readFile } = await import('node:fs/promises');
  const picker = await readFile(new URL('../src/components/Settings/SettingsPanel.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');

  for (const theme of THEME_IDS) {
    assert.match(picker, new RegExp(`id: '${theme}'`));
    assert.match(styles, new RegExp(`data-theme="${theme}"`));
    assert.match(styles, new RegExp(`theme-preview-${theme}`));
    assert.match(styles, new RegExp(`data-theme="${theme}"[^}]*--timer-ring-width`));
  }
  assert.doesNotMatch(picker, /id: 'sunset'/);
  assert.doesNotMatch(styles, /data-theme="sunset"|theme-preview-sunset/);
});
