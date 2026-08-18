export type Priority = 'high' | 'medium' | 'low';
export type TaskRecurrence =
  | 'none'
  | 'daily'
  | 'everyOtherDay'
  | 'everyTwoDays'
  | 'weekly'
  | `weekly:${string}`
  | `monthly:${string}`;

export type Category = string;

export interface CategoryItem {
  name: string;
  color: string;
}

// 「其他」是系统兜底分类：未指定任务的专注都会归到它，因此它必须始终存在。
// 名称与颜色均为固定默认值，不可修改、不可删除（默认用暖色，不再用灰色）。
export const OTHER_CATEGORY_NAME = '其他';
export const OTHER_CATEGORY_COLOR = '#b08968';

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { name: '数学', color: '#0984e3' },
  { name: '专业课', color: '#6c5ce7' },
  { name: '英语', color: '#e84393' },
  { name: '政治', color: '#d63031' },
  { name: '运动', color: '#00cec9' },
  { name: OTHER_CATEGORY_NAME, color: OTHER_CATEGORY_COLOR },
];

export function getCategoryColor(categories: CategoryItem[], name: string): string {
  return categories.find(c => c.name === name)?.color || OTHER_CATEGORY_COLOR;
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
  completedPomodoros: number;
  pomodoroRecordIds?: string[];
  legacyPomodoroCount?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Todo {
  id: string;
  title: string;
  priority: Priority;
  category: Category;
  estimatedPomodoros: number;
  completedPomodoros: number;
  pomodoroRecordIds?: string[];
  legacyPomodoroCount?: number;
  done: boolean;
  abandoned: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
  recurrence?: TaskRecurrence;
  nextRefreshAt?: string;
  completionHistory?: TaskCompletionRecord[];
  abandonedAt: string;
  subtasks: SubTask[];
  deletedAt?: string;
}

export interface PomodoroRecord {
  id?: string;
  date?: string;
  start: string;
  end: string;
  duration: number;
  countsAsPomodoro?: boolean;
  taskId: string | null;
  taskTitle: string;
  category: Category;
  completed: boolean;
  manual?: boolean;
  createdAt: string;
}

export interface TaskCompletionRecord {
  id: string;
  completedAt: string;
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

export const THEME_IDS = [
  'tomato',
  'apple',
  'sketch',
  'pixel',
  'cyber',
  'matcha',
  'ocean',
  'ink',
  'midnight',
  'monochrome',
  'constructivist',
  'toy3d',
  'oilpaint',
  'modernist',
  'lineart',
  'crayon',
  'liquidglass',
  'guohua',
  'inkwash',
  'woodcut',
  'metallic',
  'stainedglass',
  'tarot',
  'anime',
  'farmcraft',
] as const;

export type ThemeId = typeof THEME_IDS[number];

export function normalizeTheme(value: unknown): ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value)
    ? value as ThemeId
    : 'tomato';
}

export interface TimerSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
}

export interface AppSettings extends TimerSettings {
  soundEnabled: boolean;
  darkMode: boolean;
  theme: ThemeId;
  syncCode: string;
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
  theme: 'tomato',
  syncCode: '',
  countdownTitle: '2026考研',
  countdownDate: '2026-12-27',
  categories: [...DEFAULT_CATEGORIES],
};

export interface ConfigData {
  settings: Omit<AppSettings, 'syncCode'>;
  todos: Todo[];
  updatedAt: string;
}

export interface FeedbackEntry {
  id: string;
  createdAt: string;
  content: string;
  language: string;
  userAgent?: string;
}
