import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MOTIVATION_QUOTES, nextQuoteIndex } from '../src/utils/motivation.ts';

test('motivation library offers varied Chinese and English copy', () => {
  assert.ok(MOTIVATION_QUOTES['zh-CN'].length >= 10);
  assert.equal(MOTIVATION_QUOTES.en.length, MOTIVATION_QUOTES['zh-CN'].length);
  assert.equal(nextQuoteIndex(0, 12, () => 0), 1);
});

test('timer exposes quick completion and unassigned skip actions', async () => {
  const controls = await readFile(new URL('../src/components/Timer/TimerControls.tsx', import.meta.url), 'utf8');
  const assignment = await readFile(new URL('../src/components/Timer/TaskAssignModal.tsx', import.meta.url), 'utf8');
  assert.match(controls, /onFinishRound/);
  assert.match(controls, /mode === 'work'/);
  assert.match(controls, /完成本轮/);
  assert.match(controls, /skipStage/);
  assert.match(assignment, /onSkip/);
  assert.match(assignment, /跳过分配/);
});
