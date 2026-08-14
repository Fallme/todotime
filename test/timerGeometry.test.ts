import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getElapsedProgress, getRemainingRingGeometry, getTimerEndpoint } from '../src/utils/timerGeometry.ts';

const closeTo = (actual: number, expected: number) => {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} should be close to ${expected}`);
};

test('timer endpoint starts at 12 o clock', () => {
  const point = getTimerEndpoint(0, 40, 50);
  closeTo(point.x, 50);
  closeTo(point.y, 10);
});

test('timer endpoint moves clockwise with ring progress', () => {
  const point = getTimerEndpoint(0.25, 40, 50);
  closeTo(point.x, 90);
  closeTo(point.y, 50);
});

test('timer endpoint clamps invalid progress', () => {
  assert.deepEqual(getTimerEndpoint(-1, 10, 20), getTimerEndpoint(0, 10, 20));
  const tooLarge = getTimerEndpoint(2, 10, 20);
  const full = getTimerEndpoint(1, 10, 20);
  closeTo(tooLarge.x, full.x);
  closeTo(tooLarge.y, full.y);
});

test('timer progress grows from zero to one as time elapses', () => {
  assert.equal(getElapsedProgress(1500, 1500), 0);
  assert.equal(getElapsedProgress(750, 1500), 0.5);
  assert.equal(getElapsedProgress(0, 1500), 1);
});

test('countdown ring starts full and empties clockwise', async () => {
  assert.deepEqual(getRemainingRingGeometry(100, 100, 200), {
    elapsedProgress: 0,
    remainingProgress: 1,
    dashLength: 200,
    dashOffset: 0,
  });
  assert.deepEqual(getRemainingRingGeometry(75, 100, 200), {
    elapsedProgress: 0.25,
    remainingProgress: 0.75,
    dashLength: 150,
    dashOffset: 50,
  });
  assert.equal(getRemainingRingGeometry(0, 100, 200).dashLength, 0);
  assert.equal(getRemainingRingGeometry(0, 100, 200).dashOffset, 200);
  const source = await readFile(new URL('../src/components/Timer/TimerRing.tsx', import.meta.url), 'utf8');
  assert.match(source, /strokeDasharray={`\$\{CIRC\} \$\{CIRC\}`}/);
  assert.match(source, /strokeDashoffset={ring\.dashOffset}/);
});
