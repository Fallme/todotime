import type { PomodoroRecord } from '../types/index.ts';
import { OTHER_CATEGORY_NAME } from '../types/index.ts';
import { formatDate } from './dateUtils.ts';
import { countsAsPomodoro } from './pomodoroRules.ts';
import { mergePomodoroRecords } from './syncMerge.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

export function normalizeImportedPomodoros(value: unknown): PomodoroRecord[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap(item => {
    if (!isRecord(item) || !validDate(item.start) || !validDate(item.end)) return [];

    const duration = Math.floor(Number(item.duration));
    if (!Number.isFinite(duration) || duration < 1) return [];

    const createdAt = validDate(item.createdAt) ? item.createdAt : item.end;
    const taskId = typeof item.taskId === 'string' ? item.taskId : null;
    const importedCount = item.pomodoroCount;
    const pomodoroCount = typeof importedCount === 'number' && Number.isFinite(importedCount)
      ? Math.max(0, Math.floor(importedCount))
      : undefined;

    return [{
      id: typeof item.id === 'string' && item.id ? item.id : undefined,
      date: typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
        ? item.date
        : formatDate(new Date(item.start)),
      start: item.start,
      end: item.end,
      duration,
      pomodoroCount,
      taskId,
      taskTitle: typeof item.taskTitle === 'string' && item.taskTitle ? item.taskTitle : '未分配',
      category: typeof item.category === 'string' && item.category ? item.category : OTHER_CATEGORY_NAME,
      completed: true,
      countsAsPomodoro: pomodoroCount !== undefined
        ? pomodoroCount > 0
        : item.completed === true && typeof item.countsAsPomodoro === 'boolean'
        ? item.countsAsPomodoro
        : countsAsPomodoro(duration),
      manual: item.manual === true,
      createdAt,
    } satisfies PomodoroRecord];
  });
}

export function mergeImportedPomodoros(current: PomodoroRecord[], value: unknown): PomodoroRecord[] {
  return mergePomodoroRecords(current, normalizeImportedPomodoros(value));
}
