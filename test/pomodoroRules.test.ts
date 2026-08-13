import assert from 'node:assert/strict';
import test from 'node:test';
import { completedMinutes, countsAsPomodoro, getNextCycle, isPomodoroRecord, shouldRecordFocus } from '../src/utils/pomodoroRules.ts';

test('focus duration starts recording at one full minute', () => {
  assert.equal(shouldRecordFocus(59), false);
  assert.equal(shouldRecordFocus(60), true);
  assert.equal(completedMinutes(119), 1);
});

test('a pomodoro is counted at fifteen full minutes', () => {
  assert.equal(countsAsPomodoro(14), false);
  assert.equal(countsAsPomodoro(15), true);
});

test('legacy records derive tomato count from duration', () => {
  const base = { start: '', end: '', taskId: null, taskTitle: '', category: '其他', completed: true, createdAt: '' };
  assert.equal(isPomodoroRecord({ ...base, duration: 10 }), false);
  assert.equal(isPomodoroRecord({ ...base, duration: 25 }), true);
  assert.equal(isPomodoroRecord({ ...base, duration: 25, countsAsPomodoro: false }), false);
});

test('cycle progress advances independently and starts a long break at the group boundary', () => {
  assert.deepEqual(getNextCycle(0, 4), { nextCycle: 1, startsLongBreak: false });
  assert.deepEqual(getNextCycle(3, 4), { nextCycle: 4, startsLongBreak: true });
});
