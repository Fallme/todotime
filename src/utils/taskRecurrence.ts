import type { SubTask, TaskCompletionRecord, TaskRecurrence, Todo } from '../types';

const RECURRENCE_DAYS: Record<Exclude<TaskRecurrence, 'none'>, number> = {
  daily: 1,
  everyOtherDay: 2,
  weekly: 7,
};

export function normalizeTaskRecurrence(value: unknown): TaskRecurrence {
  return value === 'daily' || value === 'everyOtherDay' || value === 'weekly' ? value : 'none';
}

export function getNextTaskRefreshAt(completedAt: string, recurrence: TaskRecurrence): string {
  if (recurrence === 'none') return '';
  const completed = new Date(completedAt);
  if (Number.isNaN(completed.getTime())) return '';
  completed.setHours(0, 0, 0, 0);
  completed.setDate(completed.getDate() + RECURRENCE_DAYS[recurrence]);
  return completed.toISOString();
}

export function getTodoCompletionRecords(todo: Todo): TaskCompletionRecord[] {
  const records = Array.isArray(todo.completionHistory) ? todo.completionHistory : [];
  const normalized = records
    .filter(record => record && typeof record.id === 'string' && typeof record.completedAt === 'string' && record.completedAt)
    .map(record => ({ id: record.id, completedAt: record.completedAt }));
  if (normalized.length === 0 && todo.completedAt) {
    normalized.push({ id: `legacy-${todo.id}-${todo.completedAt}`, completedAt: todo.completedAt });
  }
  return [...new Map(normalized.map(record => [record.id, record])).values()]
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

export function completeTodo(todo: Todo, completedAt: string, completionId: string): Todo {
  const recurrence = normalizeTaskRecurrence(todo.recurrence);
  const completionHistory = getTodoCompletionRecords(todo);
  if (!completionHistory.some(record => record.id === completionId)) {
    completionHistory.push({ id: completionId, completedAt });
  }
  return {
    ...todo,
    done: true,
    abandoned: false,
    abandonedAt: '',
    completedAt,
    updatedAt: completedAt,
    recurrence,
    nextRefreshAt: getNextTaskRefreshAt(completedAt, recurrence),
    completionHistory,
  };
}

export function undoTodoCompletion(todo: Todo, updatedAt: string): Todo {
  const completionHistory = getTodoCompletionRecords(todo)
    .filter(record => record.completedAt !== todo.completedAt);
  return {
    ...todo,
    done: false,
    completedAt: '',
    nextRefreshAt: '',
    completionHistory,
    updatedAt,
  };
}

function reopenSubtask(subtask: SubTask, updatedAt: string): SubTask {
  if (subtask.deletedAt || subtask.abandoned) return subtask;
  return { ...subtask, done: false, updatedAt };
}

export function refreshRecurringTodos(todos: Todo[], nowIso: string): Todo[] {
  let changed = false;
  const refreshed = todos.map(todo => {
    const recurrence = normalizeTaskRecurrence(todo.recurrence);
    if (!todo.done || recurrence === 'none' || !todo.nextRefreshAt || todo.nextRefreshAt > nowIso) return todo;
    changed = true;
    return {
      ...todo,
      done: false,
      completedAt: '',
      nextRefreshAt: '',
      recurrence,
      updatedAt: nowIso,
      subtasks: (todo.subtasks ?? []).map(subtask => reopenSubtask(subtask, nowIso)),
    };
  });
  return changed ? refreshed : todos;
}
