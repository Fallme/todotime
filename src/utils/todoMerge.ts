import type { SubTask, Todo } from '../types';
import { getTodoCompletionRecords, normalizeTaskRecurrence } from './taskRecurrence.ts';

type PomodoroCounter = {
  completedPomodoros: number;
  pomodoroRecordIds?: string[];
  legacyPomodoroCount?: number;
};

function uniqueRecordIds(...groups: Array<string[] | undefined>): string[] {
  return [...new Set(groups.flatMap(group => group ?? []).filter(Boolean))].sort();
}

function legacyCount(counter: PomodoroCounter): number {
  if (Number.isFinite(counter.legacyPomodoroCount)) return Math.max(0, Number(counter.legacyPomodoroCount));
  const knownRecords = new Set(counter.pomodoroRecordIds ?? []).size;
  return Math.max(0, Number(counter.completedPomodoros || 0) - knownRecords);
}

export function normalizePomodoroCounter<T extends PomodoroCounter>(counter: T): T {
  const pomodoroRecordIds = uniqueRecordIds(counter.pomodoroRecordIds);
  const legacyPomodoroCount = legacyCount(counter);
  return {
    ...counter,
    pomodoroRecordIds,
    legacyPomodoroCount,
    completedPomodoros: legacyPomodoroCount + pomodoroRecordIds.length,
  };
}

export function addPomodoroRecord<T extends PomodoroCounter>(counter: T, recordId: string): T {
  const normalized = normalizePomodoroCounter(counter);
  if (!recordId || normalized.pomodoroRecordIds?.includes(recordId)) return normalized;
  const pomodoroRecordIds = uniqueRecordIds(normalized.pomodoroRecordIds, [recordId]);
  return {
    ...normalized,
    pomodoroRecordIds,
    completedPomodoros: (normalized.legacyPomodoroCount ?? 0) + pomodoroRecordIds.length,
  };
}

function mergeCounter<T extends PomodoroCounter>(preferred: T, other: T): T {
  const pomodoroRecordIds = uniqueRecordIds(preferred.pomodoroRecordIds, other.pomodoroRecordIds);
  const legacyPomodoroCount = Math.max(legacyCount(preferred), legacyCount(other));
  return {
    ...preferred,
    pomodoroRecordIds,
    legacyPomodoroCount,
    completedPomodoros: legacyPomodoroCount + pomodoroRecordIds.length,
  };
}

function mergeSubtask(local: SubTask, remote: SubTask): SubTask {
  const localTime = local.updatedAt || local.createdAt || '';
  const remoteTime = remote.updatedAt || remote.createdAt || '';
  return mergeCounter(remoteTime > localTime ? remote : local, remoteTime > localTime ? local : remote);
}

function mergeSubtasks(local: SubTask[], remote: SubTask[]): SubTask[] {
  const localMap = new Map(local.map(subtask => [subtask.id, subtask]));
  const remoteMap = new Map(remote.map(subtask => [subtask.id, subtask]));
  return [...new Set([...localMap.keys(), ...remoteMap.keys()])].map(id => {
    const localSubtask = localMap.get(id);
    const remoteSubtask = remoteMap.get(id);
    if (!localSubtask) return normalizePomodoroCounter(remoteSubtask as SubTask);
    if (!remoteSubtask) return normalizePomodoroCounter(localSubtask);
    return mergeSubtask(localSubtask, remoteSubtask);
  });
}

export function normalizeTodo(todo: Todo): Todo {
  return {
    ...normalizePomodoroCounter(todo),
    recurrence: normalizeTaskRecurrence(todo.recurrence),
    nextRefreshAt: typeof todo.nextRefreshAt === 'string' ? todo.nextRefreshAt : '',
    completionHistory: getTodoCompletionRecords(todo),
    subtasks: (todo.subtasks ?? []).map(normalizePomodoroCounter),
  };
}

export function mergeTodo(local: Todo, remote: Todo): Todo {
  const localTime = local.updatedAt || local.createdAt || '';
  const remoteTime = remote.updatedAt || remote.createdAt || '';
  const preferred = remoteTime > localTime ? remote : local;
  const other = preferred === remote ? local : remote;
  return {
    ...mergeCounter(preferred, other),
    recurrence: normalizeTaskRecurrence(preferred.recurrence),
    nextRefreshAt: preferred.nextRefreshAt || '',
    completionHistory: [...new Map([
      ...getTodoCompletionRecords(local),
      ...getTodoCompletionRecords(remote),
    ].map(record => [record.id, record])).values()].sort((a, b) => a.completedAt.localeCompare(b.completedAt)),
    subtasks: mergeSubtasks(local.subtasks ?? [], remote.subtasks ?? []),
  };
}

export function mergeTodosById(localTodos: Todo[], remoteTodos: Todo[]): Todo[] {
  const localMap = new Map(localTodos.map(todo => [todo.id, todo]));
  const remoteMap = new Map(remoteTodos.map(todo => [todo.id, todo]));
  return [...new Set([...localMap.keys(), ...remoteMap.keys()])].map(id => {
    const local = localMap.get(id);
    const remote = remoteMap.get(id);
    if (!local) return normalizeTodo(remote as Todo);
    if (!remote) return normalizeTodo(local);
    return mergeTodo(local, remote);
  });
}
