import assert from 'node:assert/strict';
import test from 'node:test';
import type { PomodoroRecord } from '../src/types/index.ts';
import { mergeImportedPomodoros, normalizeImportedPomodoros } from '../src/utils/backup.ts';

function record(overrides: Partial<PomodoroRecord> = {}): PomodoroRecord {
  return {
    id: 'focus-1',
    date: '2026-08-15',
    start: '2026-08-15T08:00:00.000Z',
    end: '2026-08-15T08:25:00.000Z',
    duration: 25,
    taskId: 'task-1',
    taskTitle: '复习',
    category: '专业课',
    completed: true,
    countsAsPomodoro: true,
    createdAt: '2026-08-15T08:25:00.000Z',
    ...overrides,
  };
}

test('backup import validates records and recovers unfinished checkpoints', () => {
  const normalized = normalizeImportedPomodoros([
    record(),
    record({ id: 'checkpoint', completed: false, countsAsPomodoro: false, duration: 15 }),
    { duration: 20, start: 'invalid', end: 'invalid' },
  ]);

  assert.equal(normalized.length, 2);
  assert.equal(normalized[1].completed, true);
  assert.equal(normalized[1].countsAsPomodoro, true);
});

test('backup import merges by stable focus id without duplicating existing data', () => {
  const current = record({ taskTitle: '本机版本' });
  const merged = mergeImportedPomodoros([current], [
    record({ taskTitle: '备份版本' }),
    record({ id: 'focus-2', taskId: null, taskTitle: '未分配' }),
  ]);

  assert.equal(merged.length, 2);
  assert.equal(merged.find(item => item.id === 'focus-1')?.taskTitle, '本机版本');
});
