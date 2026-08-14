import type { Category, PomodoroRecord, Todo } from '../types';
import { formatDate } from './dateUtils.ts';
import { countsAsPomodoro } from './pomodoroRules.ts';

interface ManualFocusRecordInput {
  duration: number;
  endAt: string;
  taskId: string | null;
  taskTitle: string;
  category: Category;
  createdAt?: string;
  id?: string;
}

export function resolveManualFocusCategory(
  assignment: string,
  todos: Array<Pick<Todo, 'id' | 'category'>>,
  newTaskCategory: Category,
): Category {
  if (assignment === 'new') return newTaskCategory;
  return todos.find(todo => todo.id === assignment)?.category ?? '其他';
}

export function createManualFocusRecord(input: ManualFocusRecordInput): PomodoroRecord {
  const duration = Math.floor(Number(input.duration));
  const end = new Date(input.endAt);
  if (!Number.isFinite(duration) || duration < 1) throw new Error('手动专注时长至少为 1 分钟');
  if (Number.isNaN(end.getTime())) throw new Error('手动专注时间无效');
  const start = new Date(end.getTime() - duration * 60_000);
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    id: input.id,
    date: formatDate(end),
    start: start.toISOString(),
    end: end.toISOString(),
    duration,
    countsAsPomodoro: countsAsPomodoro(duration),
    taskId: input.taskId,
    taskTitle: input.taskTitle,
    category: input.category,
    completed: true,
    manual: true,
    createdAt,
  };
}
