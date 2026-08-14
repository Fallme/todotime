import type { SubTask, TaskCompletionRecord, TaskRecurrence, Todo } from '../types';

export type TaskRecurrenceKind = 'none' | 'daily' | 'everyOtherDay' | 'everyTwoDays' | 'weekly' | 'monthly';

const WEEKDAY_LABELS = {
  'zh-CN': ['日', '一', '二', '三', '四', '五', '六'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
} as const;

export function getTaskRecurrenceKind(recurrence: TaskRecurrence): TaskRecurrenceKind {
  if (recurrence.startsWith('weekly')) return 'weekly';
  if (recurrence.startsWith('monthly:')) return 'monthly';
  if (recurrence === 'daily' || recurrence === 'everyOtherDay' || recurrence === 'everyTwoDays') return recurrence;
  return 'none';
}

export function getWeeklyRecurrenceDays(recurrence: TaskRecurrence): number[] {
  if (!recurrence.startsWith('weekly:')) return [];
  return [...new Set(recurrence.slice(7).split(',').map(Number)
    .filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b);
}

export function buildWeeklyRecurrence(days: number[]): TaskRecurrence {
  const normalized = [...new Set(days.filter(day => Number.isInteger(day) && day >= 0 && day <= 6))].sort((a, b) => a - b);
  return `weekly:${normalized.length > 0 ? normalized.join(',') : 1}`;
}

export function getMonthlyRecurrenceDays(recurrence: TaskRecurrence): number[] {
  if (!recurrence.startsWith('monthly:')) return [];
  return [...new Set(recurrence.slice(8).split(',').map(Number)
    .filter(day => Number.isInteger(day) && day >= 1 && day <= 31))].sort((a, b) => a - b);
}

export function getMonthlyRecurrenceDay(recurrence: TaskRecurrence): number {
  return getMonthlyRecurrenceDays(recurrence)[0] ?? 1;
}

export function buildMonthlyRecurrence(days: number | number[]): TaskRecurrence {
  const values = Array.isArray(days) ? days : [days];
  const normalized = [...new Set(values.map(Math.round)
    .filter(day => Number.isInteger(day) && day >= 1 && day <= 31))].sort((a, b) => a - b);
  return `monthly:${normalized.length > 0 ? normalized.join(',') : 1}`;
}

export function normalizeTaskRecurrence(value: unknown): TaskRecurrence {
  if (value === 'daily' || value === 'everyOtherDay' || value === 'everyTwoDays' || value === 'weekly') return value;
  if (typeof value !== 'string') return 'none';
  if (value.startsWith('weekly:')) return buildWeeklyRecurrence(getWeeklyRecurrenceDays(value as TaskRecurrence));
  if (/^monthly:\d{1,2}(,\d{1,2})*$/.test(value)) return buildMonthlyRecurrence(getMonthlyRecurrenceDays(value as TaskRecurrence));
  return 'none';
}

export function getNextTaskRefreshAt(completedAt: string, recurrence: TaskRecurrence): string {
  if (recurrence === 'none') return '';
  const completed = new Date(completedAt);
  if (Number.isNaN(completed.getTime())) return '';
  completed.setHours(0, 0, 0, 0);
  const normalized = normalizeTaskRecurrence(recurrence);

  if (normalized === 'daily' || normalized === 'everyOtherDay' || normalized === 'everyTwoDays' || normalized === 'weekly') {
    const interval = normalized === 'daily' ? 1 : normalized === 'everyOtherDay' ? 2 : normalized === 'everyTwoDays' ? 3 : 7;
    completed.setDate(completed.getDate() + interval);
    return completed.toISOString();
  }

  if (normalized.startsWith('weekly:')) {
    const selectedDays = getWeeklyRecurrenceDays(normalized);
    for (let offset = 1; offset <= 7; offset += 1) {
      const candidate = new Date(completed);
      candidate.setDate(completed.getDate() + offset);
      if (selectedDays.includes(candidate.getDay())) return candidate.toISOString();
    }
  }

  if (normalized.startsWith('monthly:')) {
    const selectedDays = getMonthlyRecurrenceDays(normalized);
    const makeCandidate = (year: number, month: number, targetDay: number) => {
      const lastDay = new Date(year, month + 1, 0).getDate();
      return new Date(year, month, Math.min(targetDay, lastDay), 0, 0, 0, 0);
    };
    const candidates = selectedDays.map(targetDay => {
      let candidate = makeCandidate(completed.getFullYear(), completed.getMonth(), targetDay);
      if (candidate.getTime() <= completed.getTime()) {
        candidate = makeCandidate(completed.getFullYear(), completed.getMonth() + 1, targetDay);
      }
      return candidate;
    });
    return candidates.sort((a, b) => a.getTime() - b.getTime())[0]?.toISOString() ?? '';
  }

  return '';
}

export function getTaskRecurrenceLabel(recurrence: TaskRecurrence, language: 'zh-CN' | 'en'): string {
  const normalized = normalizeTaskRecurrence(recurrence);
  const kind = getTaskRecurrenceKind(normalized);
  if (kind === 'none') return language === 'zh-CN' ? '不自动刷新' : 'No repeat';
  if (kind === 'daily') return language === 'zh-CN' ? '每日' : 'Daily';
  if (kind === 'everyOtherDay') return language === 'zh-CN' ? '隔日' : 'Every other day';
  if (kind === 'everyTwoDays') return language === 'zh-CN' ? '隔二日' : 'Every three days';
  if (kind === 'weekly') {
    const days = getWeeklyRecurrenceDays(normalized);
    if (days.length === 0) return language === 'zh-CN' ? '每周' : 'Weekly';
    const labels = days.map(day => WEEKDAY_LABELS[language][day]);
    return language === 'zh-CN' ? `每周${labels.join('、')}` : `Weekly · ${labels.join(', ')}`;
  }
  const days = getMonthlyRecurrenceDays(normalized);
  return language === 'zh-CN' ? `每月${days.join('、')}号` : `Monthly · days ${days.join(', ')}`;
}

export function getLocalMonthKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function shouldArchiveCompletion(completedAt: string, now: Date = new Date()): boolean {
  const completionMonth = getLocalMonthKey(completedAt);
  return Boolean(completionMonth && completionMonth < getLocalMonthKey(now));
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
