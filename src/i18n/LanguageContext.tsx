import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'zh-CN' | 'en';

const LANGUAGE_KEY = 'todotime_language';

const messages = {
  'zh-CN': {
    appName: '番茄钟', focus: '专注', stats: '统计', settings: '设置', nav: '主导航',
    syncing: '同步中...', syncFailed: '同步失败', toggleTheme: '切换主题', switchLanguage: 'Switch to English',
    quote: '每一个番茄都是进步', start: '开始', pause: '暂停', endRound: '结束并记录本轮', skipStage: '跳过当前阶段',
    focusing: '专注中', shortBreak: '短休息', longBreak: '长休息', paused: '已暂停',
    targetName: '目标名称', save: '保存', cancel: '取消', invalidDate: '日期无效，点击修改', arrived: '🎉 已到达！',
    days: '天', hours: '时', minutesShort: '分', seconds: '秒',
    taskList: '任务清单', all: '全部', active: '进行中', done: '已完成', abandoned: '已放弃',
    noActiveTasks: '没有进行中的任务', noDoneTasks: '还没有完成的任务', noAbandonedTasks: '没有放弃的任务', emptyTasks: '添加一个任务开始吧',
    tasksCount: '个任务', taskNamePlaceholder: '输入任务名称...', subtaskName: '子任务名称',
    addCategory: '输入新分类名称', add: '添加', editCategoryHint: '双击标签可编辑名称和颜色', delete: '删除', restore: '恢复', complete: '完成', abandon: '放弃',
    startPomodoro: '开始番茄', subtask: '子任务', keepOneCategory: '至少保留一个板块', deleteCategory: '删除板块',
    timer: '计时器', workDuration: '工作时长（分钟）', shortBreakDuration: '短休息（分钟）', longBreakDuration: '长休息（分钟）', longBreakInterval: '每轮组数',
    general: '通用', sound: '提示音', darkMode: '深色模式', on: '开', off: '关', language: '界面语言', chinese: '中文', english: 'English',
    personalSync: '个人数据同步', syncCode: '个人同步识别码', syncCodePlaceholder: '输入已有识别码，或点击创建', createCode: '生成新识别码', show: '显示', hide: '隐藏', copy: '复制',
    enableNewCode: '启用新识别码', loadExistingCode: '加载已有识别码', exportData: '导出数据', importData: '导入数据', clearData: '清除数据', confirm: '确认',
    syncHint: '每个识别码对应完全独立的任务、设置和统计文件。创建新码会从空白数据开始，不会复制当前用户数据；其他设备输入同一码即可同步。识别码等同于访问凭证，请勿分享，遗失后无法找回。',
    lastSynced: '最近同步', clearConfirm: '确认清除当前识别码在本机的数据并退出？云端数据及其他识别码不会删除。',
    gateKicker: '你的专注，只属于你', gateTitle: '输入个人专属码', gateDesc: '同一个码可在你的多台设备同步；不同码的任务、番茄记录、统计和设置完全分开。',
    haveCode: '我已有专属码', createNewCode: '创建新专属码', newCode: '新专属码', codeExample: '例如 TT-XXXXX-XXXXX-XXXXX-XXXXX',
    enterTodoTime: '进入我的 TodoTime', saveCodeStart: '保存专属码并开始', processing: '正在处理…', regenerate: '重新生成一个码', noCodeCreate: '没有专属码？立即创建',
    protectCode: '请妥善保存专属码', protectCodeDesc: '它相当于数据钥匙，遗失后无法找回；知道该码的人也能访问对应数据。',
    promoTitle: '专注、任务与成长趋势，一处管理', promoDesc: '轻量番茄钟结合任务管理、跨设备同步和智能周报月报，让每一分钟都有迹可循。',
    todayPomodoros: '今日番茄', todayDuration: '今日时长', todayCompleted: '今日完成', lastSevenDays: '近七天', lastMonth: '近一个月', weeklyReport: '周报', monthlyReport: '月报',
    pomodoros: '番茄', duration: '时长', completedTasks: '完成任务', activeDays: '活跃天', combinedTrend: '综合走势', categoryShare: '板块占比', noData: '暂无数据',
    focusDuration: '专注时长', pomodoroCount: '番茄数', tasks: '任务', refresh: '刷新', refreshing: '同步中...', download: '下载', categoryDistribution: '板块分布', reportAnalysis: '报告分析',
    completedTaskSection: '完成的任务', moreTasks: '还有 {count} 个任务...', switchTask: '切换任务', noTaskOther: '无任务（其他）',
    groupComplete: '一组完成！', focusRecords: '条专注记录', total: '共', assignTo: '分配给：', otherUnassigned: '其他（不分配任务）', assign: '分配', assignContinue: '分配并继续', unassigned: '未分配', other: '其他',
  },
  en: {
    appName: 'Pomodoro', focus: 'Focus', stats: 'Insights', settings: 'Settings', nav: 'Main navigation',
    syncing: 'Syncing...', syncFailed: 'Sync failed', toggleTheme: 'Toggle theme', switchLanguage: '切换到中文',
    quote: 'Every focused minute moves you forward', start: 'Start', pause: 'Pause', endRound: 'End and save this session', skipStage: 'Skip current stage',
    focusing: 'Focusing', shortBreak: 'Short break', longBreak: 'Long break', paused: 'Paused',
    targetName: 'Goal name', save: 'Save', cancel: 'Cancel', invalidDate: 'Invalid date — click to edit', arrived: '🎉 Goal reached!',
    days: 'Days', hours: 'Hours', minutesShort: 'Min', seconds: 'Sec',
    taskList: 'Tasks', all: 'All', active: 'Active', done: 'Completed', abandoned: 'Dropped',
    noActiveTasks: 'No active tasks', noDoneTasks: 'No completed tasks yet', noAbandonedTasks: 'No dropped tasks', emptyTasks: 'Add a task to get started',
    tasksCount: 'tasks', taskNamePlaceholder: 'Enter a task...', subtaskName: 'Subtask name',
    addCategory: 'New category name', add: 'Add', editCategoryHint: 'Double-click a category to edit its name and color', delete: 'Delete', restore: 'Restore', complete: 'Complete', abandon: 'Drop',
    startPomodoro: 'Start focus', subtask: 'Subtask', keepOneCategory: 'Keep at least one category', deleteCategory: 'Delete category',
    timer: 'Timer', workDuration: 'Focus duration (min)', shortBreakDuration: 'Short break (min)', longBreakDuration: 'Long break (min)', longBreakInterval: 'Groups per cycle',
    general: 'General', sound: 'Sounds', darkMode: 'Dark mode', on: 'On', off: 'Off', language: 'Language', chinese: '中文', english: 'English',
    personalSync: 'Personal data sync', syncCode: 'Personal sync code', syncCodePlaceholder: 'Enter an existing code or create one', createCode: 'Generate new code', show: 'Show', hide: 'Hide', copy: 'Copy',
    enableNewCode: 'Use new code', loadExistingCode: 'Load existing code', exportData: 'Export data', importData: 'Import data', clearData: 'Clear data', confirm: 'Confirm',
    syncHint: 'Each code has completely separate tasks, settings, and statistics. A new code starts with empty data; enter the same code on another device to sync. Treat the code as a private access key—it cannot be recovered if lost.',
    lastSynced: 'Last synced', clearConfirm: 'Clear this code’s local data and sign out? Cloud data and other codes will not be deleted.',
    gateKicker: 'Your focus belongs to you', gateTitle: 'Enter your personal code', gateDesc: 'Use the same code across your devices. Different codes keep tasks, focus history, insights, and settings completely separate.',
    haveCode: 'I have a code', createNewCode: 'Create a new code', newCode: 'New personal code', codeExample: 'Example: TT-XXXXX-XXXXX-XXXXX-XXXXX',
    enterTodoTime: 'Open my TodoTime', saveCodeStart: 'Save code and begin', processing: 'Working...', regenerate: 'Generate another code', noCodeCreate: 'No code yet? Create one',
    protectCode: 'Keep your code safe', protectCodeDesc: 'It is the key to your data. It cannot be recovered, and anyone who knows it can access that profile.',
    promoTitle: 'Focus, tasks, and progress in one calm workspace', promoDesc: 'A lightweight Pomodoro timer with task planning, cross-device sync, and smart weekly and monthly reviews.',
    todayPomodoros: 'Today’s pomodoros', todayDuration: 'Today’s focus', todayCompleted: 'Completed today', lastSevenDays: 'Last 7 days', lastMonth: 'Last 30 days', weeklyReport: 'Weekly report', monthlyReport: 'Monthly report',
    pomodoros: 'Pomodoros', duration: 'Duration', completedTasks: 'Tasks done', activeDays: 'Active days', combinedTrend: 'Combined trend', categoryShare: 'Category share', noData: 'No data yet',
    focusDuration: 'Focus time', pomodoroCount: 'Pomodoros', tasks: 'Tasks', refresh: 'Refresh', refreshing: 'Syncing...', download: 'Download', categoryDistribution: 'Category distribution', reportAnalysis: 'Report analysis',
    completedTaskSection: 'Completed tasks', moreTasks: '{count} more tasks...', switchTask: 'Switch task', noTaskOther: 'No task (Other)',
    groupComplete: 'Set complete!', focusRecords: 'focus records', total: 'Total', assignTo: 'Assign to:', otherUnassigned: 'Other (no task)', assign: 'Assign', assignContinue: 'Assign and continue', unassigned: 'Unassigned', other: 'Other',
  },
} as const;

export type MessageKey = keyof typeof messages['zh-CN'];

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: MessageKey, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function initialLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored === 'zh-CN' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const setLanguage = (next: Language) => { localStorage.setItem(LANGUAGE_KEY, next); setLanguageState(next); };
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === 'zh-CN' ? 'TodoTime 番茄钟' : 'TodoTime Focus Timer';
  }, [language]);
  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    toggleLanguage: () => setLanguage(language === 'zh-CN' ? 'en' : 'zh-CN'),
    t: (key, replacements) => {
      let text: string = messages[language][key];
      for (const [name, value] of Object.entries(replacements ?? {})) text = text.replace(`{${name}}`, String(value));
      return text;
    },
  }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
