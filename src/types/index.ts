export type Priority = 'high' | 'medium' | 'low';

export type Category =
  | '嵌入式' | 'AI' | '游戏' | '数学' | '物理'
  | '英语' | '政治' | '音乐' | '画画' | '运动'
  | '其他';

export interface CategoryItem {
  name: string;
  color: string;
}

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { name: '嵌入式', color: '#e17055' },
  { name: 'AI', color: '#6c5ce7' },
  { name: '游戏', color: '#00b894' },
  { name: '数学', color: '#0984e3' },
  { name: '物理', color: '#fdcb6e' },
  { name: '英语', color: '#e84393' },
  { name: '政治', color: '#d63031' },
  { name: '音乐', color: '#a29bfe' },
  { name: '画画', color: '#fd79a8' },
  { name: '运动', color: '#00cec9' },
  { name: '其他', color: '#636e72' },
];

export function getCategoryColor(categories: CategoryItem[], name: string): string {
  return categories.find(c => c.name === name)?.color || '#636e72';
}

export function getRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 65%, 50%)`;
}

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
  abandoned: boolean;
}

export interface Todo {
  id: string;
  title: string;
  priority: Priority;
  category: Category;
  estimatedPomodoros: number;
  completedPomodoros: number;
  done: boolean;
  abandoned: boolean;
  createdAt: string;
  subtasks: SubTask[];
}

export interface PomodoroRecord {
  start: string;
  end: string;
  duration: number;
  taskId: string | null;
  taskTitle: string;
  category: Category;
  completed: boolean;
  createdAt: string;
}

export interface DayData {
  date: string;
  pomodoros: PomodoroRecord[];
  tasks: Todo[];
  totalFocusMinutes: number;
  totalPomodoros: number;
  totalTasksCompleted: number;
  streak: number;
}

export type TimerMode = 'work' | 'shortBreak' | 'longBreak';

export interface TimerSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
}

export interface AppSettings extends TimerSettings {
  soundEnabled: boolean;
  darkMode: boolean;
  githubToken: string;
  githubRepo: string;
  countdownTitle: string;
  countdownDate: string;
  categories: CategoryItem[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  soundEnabled: true,
  darkMode: false,
  githubToken: '',
  githubRepo: 'Fallme/todotime',
  countdownTitle: '2026考研',
  countdownDate: '2026-12-27',
  categories: [...DEFAULT_CATEGORIES],
};
