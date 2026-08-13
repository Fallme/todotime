import assert from 'node:assert/strict';
import test from 'node:test';
import { completedMinutes, countsAsPomodoro, getNextCycle, isPomodoroRecord, shouldRecordFocus } from '../src/utils/pomodoroRules.ts';
import { mergeDayDataMaps, mergePomodoroRecords } from '../src/utils/syncMerge.ts';

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

test('local and remote focus records are merged without either side losing data', () => {
  const base = { date: '2026-08-13', end: '', taskId: null, taskTitle: '', category: '其他', completed: true } as const;
  const local = { ...base, id: 'local', start: 'local', duration: 10, createdAt: '2026-08-13T01:00:00Z' };
  const remote = { ...base, id: 'remote', start: 'remote', duration: 20, createdAt: '2026-08-13T02:00:00Z' };
  assert.deepEqual(mergePomodoroRecords([local], [remote]).map(item => item.id), ['local', 'remote']);

  const day = (pomodoros: Array<typeof local | typeof remote>) => ({
    date: '2026-08-13', pomodoros, tasks: [], totalFocusMinutes: 0,
    totalPomodoros: 0, totalTasksCompleted: 0, streak: 0,
  });
  const merged = mergeDayDataMaps(new Map([['2026-08-13', day([local])]]), new Map([['2026-08-13', day([remote])]]));
  assert.equal(merged.get('2026-08-13')?.totalFocusMinutes, 30);
  assert.equal(merged.get('2026-08-13')?.totalPomodoros, 1);

  const updatedCheckpoint = { ...local, duration: 2, end: 'updated' };
  const checkpointMerge = mergePomodoroRecords([updatedCheckpoint], [local]);
  assert.equal(checkpointMerge.length, 1);
  assert.equal(checkpointMerge[0]?.duration, 2);
});
