export type Priority = 'high' | 'medium' | 'low';

export type Category =
  | '嵌入式' | 'AI' | '游戏' | '数学' | '物理'
  | '英语' | '政治' | '音乐' | '画画' | '运动'
  | '其他';

export const CATEGORIES: Category[] = [
  '嵌入式', 'AI', '游戏', '数学', '物理',
  '英语', '政治', '音乐', '画画', '运动', '其他',
];

export const CATEGORY_COLORS: Record<Category, string> = {
  '嵌入式': '#e17055',
  'AI':    '#6c5ce7',
  '游戏':  '#00b894',
  '数学':  '#0984e3',
  '物理':  '#fdcb6e',
  '英语':  '#e84393',
  '政治':  '#d63031',
  '音乐':  '#a29bfe',
  '画画':  '#fd79a8',
  '运动':  '#00cec9',
  '其他':  '#636e72',
};

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
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
};
