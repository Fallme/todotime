import assert from 'node:assert/strict';
import test from 'node:test';
import type { Todo } from '../src/types/index.ts';
import { addPomodoroRecord, mergeTodosById } from '../src/utils/todoMerge.ts';
import { createManualFocusRecord, resolveManualFocusCategory } from '../src/utils/manualFocus.ts';
import { pomodoroCounterRecordIds } from '../src/utils/syncMerge.ts';

function task(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'task-1', title: '共同任务', priority: 'medium', category: '其他',
    estimatedPomodoros: 0, completedPomodoros: 3,
    done: false, abandoned: false, createdAt: '2026-08-14T00:00:00Z',
    updatedAt: '2026-08-14T00:00:00Z', completedAt: '', abandonedAt: '',
    subtasks: [], deletedAt: '', ...overrides,
  };
}

test('simultaneous device pomodoros are unioned instead of overwriting each other', () => {
  const base = task();
  const deviceA = addPomodoroRecord(base, 'device-a-record');
  const deviceB = addPomodoroRecord(base, 'device-b-record');
  const [merged] = mergeTodosById([deviceA], [deviceB]);
  assert.deepEqual(merged.pomodoroRecordIds, ['device-a-record', 'device-b-record']);
  assert.equal(merged.legacyPomodoroCount, 3);
  assert.equal(merged.completedPomodoros, 5);
});

test('replaying the same focus event never increments a task twice', () => {
  const once = addPomodoroRecord(task(), 'same-record');
  const twice = addPomodoroRecord(once, 'same-record');
  assert.equal(twice.completedPomodoros, 4);
  assert.deepEqual(twice.pomodoroRecordIds, ['same-record']);
});

test('manual focus follows configured rounds and the fifteen-minute remainder rule', () => {
  const common = { endAt: '2026-08-14T10:00', taskId: 'task-1', taskTitle: '共同任务', category: '其他', createdAt: '2026-08-14T10:01:00Z' };
  const fourteen = createManualFocusRecord({ ...common, duration: 14, workMinutes: 25, id: 'manual-14' });
  const fifteen = createManualFocusRecord({ ...common, duration: 15, workMinutes: 25, id: 'manual-15' });
  const sixtyFive = createManualFocusRecord({ ...common, duration: 65, workMinutes: 25, id: 'manual-65' });
  assert.equal(fourteen.duration, 14);
  assert.equal(fourteen.countsAsPomodoro, false);
  assert.equal(fifteen.countsAsPomodoro, true);
  assert.equal(sixtyFive.pomodoroCount, 3);
  assert.equal(fifteen.manual, true);

  const updatedTask = pomodoroCounterRecordIds(sixtyFive).reduce(
    (current, recordId) => addPomodoroRecord(current, recordId),
    task(),
  );
  assert.equal(updatedTask.completedPomodoros, 6);
});

test('manual assignment defaults to other, inherits existing category, and only new tasks use configured category', () => {
  const todos = [{ id: 'existing', category: '英语' }];
  assert.equal(resolveManualFocusCategory('none', todos, '数学'), '其他');
  assert.equal(resolveManualFocusCategory('existing', todos, '数学'), '英语');
  assert.equal(resolveManualFocusCategory('new', todos, '数学'), '数学');
});
