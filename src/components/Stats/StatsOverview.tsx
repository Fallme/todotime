import { useMemo, useState, useCallback } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarController, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { getCategoryColor, OTHER_CATEGORY_NAME, type CategoryItem, type DayData, type PomodoroRecord, type Todo } from '../../types';
import { X, Clock, CheckCircle2, BarChart3, TrendingUp, TrendingDown, Minus, RefreshCw, Download } from 'lucide-react';
import { formatDate, formatDuration } from '../../utils/dateUtils';
import { isPomodoroRecord } from '../../utils/pomodoroRules';
import { generateReportInsights, type ReportInsight } from '../../utils/reportInsights';
import { useLanguage } from '../../i18n/LanguageContext';
import { getTodoCompletionRecords } from '../../utils/taskRecurrence';

ChartJS.register(CategoryScale, LinearScale, BarController, BarElement, ArcElement, Tooltip, Legend);

type Period = 'day' | 'week' | 'month';
type ChartMetric = 'minutes' | 'pomodoros' | 'tasks';

interface StatsOverviewProps {
  dayDataMap: Map<string, DayData>;
  todayPomodoros: PomodoroRecord[];
  categories: CategoryItem[];
  todos: Todo[];
  runningMinutes?: number;
  runningCategory?: string;
  /** Trigger a full sync refresh from git */
  onRefresh?: () => Promise<void>;
}

interface PeriodResult {
  daily: { date: string; minutes: number; pomodoros: number; tasksDone: number; totalTasks: number }[];
  totalPomodoros: number;
  totalMinutes: number;
  totalTasks: number;
  totalTasksCompleted: number;
  categoryMinutes: Record<string, number>;
  categoryPomodoros: Record<string, number>;
  categoryTasks: Record<string, number>;
}

function computePeriodData(
  dayDataMap: Map<string, DayData>,
  todayPomodoros: PomodoroRecord[],
  count: number,
  today: string,
  offsetDays: number = 0,
  todos: Todo[] = [],
  runningMinutes: number = 0,
  runningCategory: string = OTHER_CATEGORY_NAME,
): PeriodResult {
  const now = new Date();
  const days: string[] = [];
  for (let i = count - 1 + offsetDays; i >= offsetDays; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    days.push(formatDate(d));
  }
  let totalPomodoros = 0, totalMinutes = 0, totalTasks = 0, totalTasksCompleted = 0;
  const categoryMinutes: Record<string, number> = {};
  const categoryPomodoros: Record<string, number> = {};
  const categoryTasks: Record<string, number> = {};

  const daily = days.map(date => {
    const dayData = dayDataMap.get(date);
    let poms = dayData?.pomodoros?.filter(p => p.completed) ?? [];
    // Count completed tasks from local todos by completedAt date (ISO format: 2026-06-03T...)
    // Deduplicate by task ID: toggling a task done/undone/done on the same day should count once.
    const doneTodayMap = new Map<string, { todo: Todo; record: { id: string; completedAt: string } }>();
    todos.filter(todo => !todo.deletedAt).forEach(todo => {
      getTodoCompletionRecords(todo)
        .filter(record => record.completedAt.startsWith(date))
        .forEach(record => { if (!doneTodayMap.has(todo.id)) doneTodayMap.set(todo.id, { todo, record }); });
    });
    const tasksDone = doneTodayMap.size;
    const totalTasksDay = Math.max(todos.filter(t => !t.deletedAt && t.createdAt.startsWith(date)).length, tasksDone);
    if (date === today) {
      const existing = new Set(poms.map(p => p.id || `${p.start}-${p.end}`));
      poms = [...poms, ...todayPomodoros.filter(p => p.completed && (p.date || today) === date && !existing.has(p.id || `${p.start}-${p.end}`))];
    }
    const liveMinutes = date === today ? runningMinutes : 0;
    const mins = poms.reduce((s, p) => s + p.duration, 0) + liveMinutes;
    const tomatoCount = poms.filter(isPomodoroRecord).length;
    totalPomodoros += tomatoCount;
    totalMinutes += mins;
    totalTasks += totalTasksDay;
    totalTasksCompleted += tasksDone;
    poms.forEach(p => {
      categoryMinutes[p.category] = (categoryMinutes[p.category] || 0) + p.duration;
      if (isPomodoroRecord(p)) {
        categoryPomodoros[p.category] = (categoryPomodoros[p.category] || 0) + 1;
      }
    });
    if (liveMinutes > 0) {
      categoryMinutes[runningCategory] = (categoryMinutes[runningCategory] || 0) + liveMinutes;
    }
    doneTodayMap.forEach(({ todo }) => {
      categoryTasks[todo.category] = (categoryTasks[todo.category] || 0) + 1;
    });
    return { date, minutes: mins, pomodoros: tomatoCount, tasksDone, totalTasks: totalTasksDay };
  });

  return { daily, totalPomodoros, totalMinutes, totalTasks, totalTasksCompleted, categoryMinutes, categoryPomodoros, categoryTasks };
}

// For the "today" view the trend chart buckets the day into 2-hour slots.
const DAY_SLOT_HOURS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

function getHour(iso: string): number {
  return new Date(iso).getHours();
}

function slotOf(hour: number): number {
  return Math.floor(hour / 2);
}

function computeTodaySlots(
  records: PomodoroRecord[],
  todos: Todo[],
  today: string,
  runningMinutes: number,
): { label: string; minutes: number; pomodoros: number; tasksDone: number }[] {
  const slots = DAY_SLOT_HOURS.map(start => ({
    label: `${String(start).padStart(2, '0')}:00`,
    minutes: 0,
    pomodoros: 0,
    tasksDone: 0,
  }));
  for (const record of records) {
    const idx = slotOf(getHour(record.start));
    if (idx >= 0 && idx < slots.length) {
      slots[idx].minutes += record.duration;
      if (isPomodoroRecord(record)) slots[idx].pomodoros += 1;
    }
  }
  if (runningMinutes > 0) {
    const idx = slotOf(new Date().getHours());
    if (idx >= 0 && idx < slots.length) slots[idx].minutes += runningMinutes;
  }
  // Deduplicate by task: multiple completions on the same day count once.
  const seenTaskIds = new Set<string>();
  for (const todo of todos.filter(todo => !todo.deletedAt)) {
    const records = getTodoCompletionRecords(todo).filter(record => record.completedAt.startsWith(today));
    if (records.length === 0) continue;
    const idx = slotOf(getHour(records[0].completedAt));
    if (idx >= 0 && idx < slots.length && !seenTaskIds.has(todo.id)) {
      slots[idx].tasksDone += 1;
      seenTaskIds.add(todo.id);
    }
  }
  return slots;
}

function getCategoryData(data: PeriodResult, metric: ChartMetric, categories: CategoryItem[]): { label: string; value: number; color: string }[] {
  const source = metric === 'minutes' ? data.categoryMinutes : metric === 'pomodoros' ? data.categoryPomodoros : data.categoryTasks;
  return Object.entries(source)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ label: k, value: v, color: getCategoryColor(categories, k) }))
    .sort((a, b) => b.value - a.value);
}

function diffText(current: number, previous: number): { text: string; cls: string; icon: React.ReactNode } {
  if (previous === 0 && current === 0) return { text: '—', cls: '', icon: <Minus size={12} /> };
  if (previous === 0) return { text: `新增${current}`, cls: 'up', icon: <TrendingUp size={12} /> };
  const pct = Math.round((current - previous) / previous * 100);
  const diff = current - previous;
  if (pct > 0) return { text: `+${pct}% (+${diff})`, cls: 'up', icon: <TrendingUp size={12} /> };
  if (pct < 0) return { text: `${pct}% (${diff})`, cls: 'down', icon: <TrendingDown size={12} /> };
  return { text: '持平', cls: 'same', icon: <Minus size={12} /> };
}

// Chart colors are derived from the active theme's accent variables so every theme
// gets its own bar colors. Chart.js renders to canvas, so CSS `var(--x)` strings do
// not work — the values must be resolved to concrete rgba() strings in JS.
type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function rgba(c: RGB, alpha: number): string {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

function readCssColor(prop: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : fallback;
}

export function StatsOverview({ dayDataMap, todayPomodoros, categories, todos, runningMinutes = 0, runningCategory = OTHER_CATEGORY_NAME, onRefresh }: StatsOverviewProps) {
  const { language, t } = useLanguage();
  const [period, setPeriod] = useState<Period>('day');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('minutes');
  const [showReport, setShowReport] = useState<'week' | 'month' | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Hidden pie slices are scoped so switching metric/period/report starts fresh without an effect.
  const [hiddenCats, setHiddenCats] = useState<{ scope: string; labels: ReadonlySet<string> }>({ scope: '', labels: new Set() });
  const [reportHiddenCats, setReportHiddenCats] = useState<{ scope: string; labels: ReadonlySet<string> }>({ scope: '', labels: new Set() });
  const today = formatDate(new Date());

  // Current period data
  const weekData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 7, today, 0, todos, runningMinutes, runningCategory), [dayDataMap, todayPomodoros, today, todos, runningMinutes, runningCategory]);
  const monthData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 30, today, 0, todos, runningMinutes, runningCategory), [dayDataMap, todayPomodoros, today, todos, runningMinutes, runningCategory]);
  const dayData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 1, today, 0, todos, runningMinutes, runningCategory), [dayDataMap, todayPomodoros, today, todos, runningMinutes, runningCategory]);

  // Previous period data (for comparison)
  const prevWeekData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 7, today, 7, todos), [dayDataMap, todayPomodoros, today, todos]);
  const prevMonthData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 30, today, 30, todos), [dayDataMap, todayPomodoros, today, todos]);

  const activeData = period === 'day' ? dayData : period === 'week' ? weekData : monthData;
  const isCompact = period === 'month';

  // Merged completed records for today (dedup between git history and live session).
  const todayRecords = useMemo(() => {
    const day = dayDataMap.get(today);
    const poms = day?.pomodoros?.filter(p => p.completed) ?? [];
    const existing = new Set(poms.map(p => p.id || `${p.start}-${p.end}`));
    return [...poms, ...todayPomodoros.filter(p => p.completed && (p.date || today) === today && !existing.has(p.id || `${p.start}-${p.end}`))];
  }, [dayDataMap, todayPomodoros, today]);
  const daySlots = useMemo(() => computeTodaySlots(todayRecords, todos, today, runningMinutes), [todayRecords, todos, today, runningMinutes]);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }, [onRefresh, refreshing]);

  // Toggling a category in the custom pie legend hides/shows its slice.
  // Hidden sets are scoped by the current metric/period (main) and report (modal),
  // so switching context naturally shows everything again without an effect.
  const pieScope = `${period}:${chartMetric}`;
  const reportScope = showReport ?? '';
  const toggleCat = useCallback((label: string) => {
    setHiddenCats(prev => {
      const current = prev.scope === pieScope ? prev.labels : new Set<string>();
      const next = new Set(current);
      if (next.has(label)) next.delete(label); else next.add(label);
      return { scope: pieScope, labels: next };
    });
  }, [pieScope]);

  const toggleReportCat = useCallback((label: string) => {
    setReportHiddenCats(prev => {
      const current = prev.scope === reportScope ? prev.labels : new Set<string>();
      const next = new Set(current);
      if (next.has(label)) next.delete(label); else next.add(label);
      return { scope: reportScope, labels: next };
    });
  }, [reportScope]);

  const handleDownload = useCallback((rd: PeriodResult, reportType: string, insights: ReportInsight[]) => {
    const lines: string[] = [];
    lines.push(`${reportType}`);
    lines.push(`日期: ${rd.daily[0]?.date} ~ ${rd.daily[rd.daily.length - 1]?.date}`);
    lines.push('');
    lines.push(`番茄: ${rd.totalPomodoros}个`);
    lines.push(`专注时长: ${rd.totalMinutes}分钟`);
    lines.push(`完成任务: ${rd.totalTasksCompleted}个`);
    lines.push(`活跃天数: ${rd.daily.filter(d => d.pomodoros > 0).length}天`);
    lines.push('');
    lines.push('--- 数据分析 ---');
    insights.forEach(insight => lines.push(`${insight.title}: ${insight.text}`));
    lines.push('');
    lines.push('--- 每日明细 ---');
    rd.daily.forEach(d => {
      if (d.pomodoros > 0 || d.tasksDone > 0) {
        lines.push(`${d.date}: 番茄${d.pomodoros}个 ${d.minutes}分钟 任务${d.tasksDone}个`);
      }
    });
    lines.push('');
    lines.push('--- 板块分布 ---');
    Object.entries(rd.categoryMinutes).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).forEach(([cat, mins]) => {
      const poms = rd.categoryPomodoros[cat] || 0;
      const tasks = rd.categoryTasks[cat] || 0;
      lines.push(`${cat}: ${mins}分钟, ${poms}个番茄, ${tasks}个任务`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todotime-${reportType}-${rd.daily[0]?.date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const metricInfo = chartMetric === 'minutes' ? { label: t('focusDuration'), unit: language === 'zh-CN' ? '分钟' : 'min' } : chartMetric === 'pomodoros' ? { label: t('pomodoroCount'), unit: language === 'zh-CN' ? '个' : '' } : { label: t('completedTasks'), unit: language === 'zh-CN' ? '个' : '' };
  const periodLabel = period === 'day' ? t('today') : period === 'week' ? t('lastSevenDays') : t('lastMonth');
  const firstDate = activeData.daily[0]?.date ?? '';
  const lastDate = activeData.daily[activeData.daily.length - 1]?.date ?? '';
  const dateRange = period === 'day' ? firstDate : `${firstDate.slice(5)} ~ ${lastDate.slice(5)}`;

  // Resolve the theme accent into the three semantic bar colors (duration / pomodoros / tasks).
  // Each metric keeps its own hue identity but is shifted toward the active theme.
  const accent = readCssColor('--accent', '#FF6B6B');
  const accentLight = readCssColor('--accent-light', '#FFA07A');
  const durationColor = mixRgb(hexToRgb(accentLight), hexToRgb('#e8c87a'), 0.7); // 专注时长：浅金
  const pomodoroColor = mixRgb(hexToRgb(accent), hexToRgb('#d2704a'), 0.3);
  const tasksColor = mixRgb(hexToRgb(accentLight), hexToRgb('#4caf50'), 0.72);
  // Axis labels need a deeper gold to stay readable on light cards (bars keep the light gold above).
  const durationAxisColor = mixRgb(durationColor, hexToRgb('#8a6a2f'), 0.5);

  // All three metrics use grouped square bars so values can be compared directly.
  // For "today" the x-axis is 4-hour slots instead of dates.
  const trendPoints = period === 'day'
    ? daySlots.map((s, i) => {
        const startHour = DAY_SLOT_HOURS[i] ?? 0;
        const endHour = startHour + 2;
        return { label: s.label, title: `${s.label}–${String(endHour).padStart(2, '0')}:00`, minutes: s.minutes, pomodoros: s.pomodoros, tasksDone: s.tasksDone };
      })
    : activeData.daily.map(d => ({ label: d.date.slice(5), title: d.date, minutes: d.minutes, pomodoros: d.pomodoros, tasksDone: d.tasksDone }));
  const trendData = {
    labels: trendPoints.map(p => p.label),
    datasets: [
      {
        type: 'bar' as const,
        label: `${t('focusDuration')} (${language === 'zh-CN' ? '分钟' : 'min'})`, data: trendPoints.map(p => p.minutes), yAxisID: 'minutes',
        borderColor: rgba(durationColor, 0.6), backgroundColor: rgba(durationColor, 0.33), borderWidth: 1,
        borderRadius: 0, borderSkipped: false, maxBarThickness: isCompact ? 12 : 24, order: 3,
      },
      {
        type: 'bar' as const,
        label: t('pomodoroCount'), data: trendPoints.map(p => p.pomodoros), yAxisID: 'counts',
        borderColor: rgba(pomodoroColor, 1), backgroundColor: rgba(pomodoroColor, 0.6), borderWidth: 1,
        borderRadius: 0, borderSkipped: false, maxBarThickness: isCompact ? 10 : 20, order: 1,
      },
      {
        type: 'bar' as const,
        label: t('completedTasks'), data: trendPoints.map(p => p.tasksDone), yAxisID: 'counts',
        borderColor: rgba(tasksColor, 1), backgroundColor: rgba(tasksColor, 0.6), borderWidth: 1,
        borderRadius: 0, borderSkipped: false, maxBarThickness: isCompact ? 10 : 20, order: 2,
      },
    ],
  };
  const trendOptions = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
    interaction: { mode: 'index' as const, intersect: false },
    layout: { padding: { left: 2, right: 2, top: 4, bottom: 0 } },
    plugins: {
      legend: {
        display: true, position: 'top' as const,
        labels: { boxWidth: 13, boxHeight: 8, padding: 12, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          title: (items: unknown) => trendPoints[(items as Array<{ dataIndex: number }>)[0]?.dataIndex]?.title ?? '',
          label: (ctx: unknown) => {
            const item = ctx as { dataset: { label?: string; yAxisID?: string }; parsed: { y: number } };
            return ` ${item.dataset.label}: ${item.parsed.y}${item.dataset.yAxisID === 'minutes' ? '分钟' : '个'}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#999', font: { size: isCompact ? 8 : 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: isCompact ? 8 : 7 },
      },
      minutes: { type: 'linear' as const, position: 'left' as const, beginAtZero: true, grid: { color: 'rgba(128,128,128,0.12)' }, ticks: { color: rgba(durationAxisColor, 1), precision: 0 }, title: { display: true, text: '分钟', color: rgba(durationAxisColor, 1), font: { size: 10 } } },
      counts: { type: 'linear' as const, position: 'right' as const, beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { color: rgba(pomodoroColor, 1), precision: 0 }, title: { display: true, text: '番茄 / 任务', color: rgba(pomodoroColor, 1), font: { size: 10 } } },
    },
  };

  // Pie chart
  const pieCategories = useMemo(() => getCategoryData(activeData, chartMetric, categories), [activeData, chartMetric, categories]);
  const pieTotal = pieCategories.reduce((s, c) => s + c.value, 0);
  const activeHiddenCats = hiddenCats.scope === pieScope ? hiddenCats.labels : new Set<string>();
  const visiblePieCategories = pieCategories.filter(c => !activeHiddenCats.has(c.label));
  const visiblePieTotal = visiblePieCategories.reduce((s, c) => s + c.value, 0);
  const pieData = visiblePieCategories.length > 0 ? {
    labels: visiblePieCategories.map(c => c.label),
    datasets: [{ data: visiblePieCategories.map(c => c.value), backgroundColor: visiblePieCategories.map(c => c.color), borderWidth: 2, borderColor: 'var(--bg-card)' }],
  } : null;
  const pieOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '55%', animation: { duration: 0 },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: unknown) => { const v = (ctx as { parsed: number }).parsed; return ` ${v}${metricInfo.unit} (${visiblePieTotal > 0 ? Math.round(v / visiblePieTotal * 100) : 0}%)`; } } } },
  };

  // Report data
  const reportData = useMemo(() => {
    const rd = showReport === 'week' ? weekData : monthData;
    const pd = showReport === 'week' ? prevWeekData : prevMonthData;
    const count = showReport === 'week' ? 7 : 30;
    return { rd, pd, count };
  }, [showReport, weekData, monthData, prevWeekData, prevMonthData]);

  // Combined grouped bar chart: duration + pomodoros + tasks
  const combinedBarData = {
    labels: reportData.rd.daily.map(d => d.date.slice(5)),
    datasets: [
      { label: `${t('duration')} (${language === 'zh-CN' ? '分钟' : 'min'})`, data: reportData.rd.daily.map(d => d.minutes), backgroundColor: rgba(durationColor, 0.67), borderRadius: 0, borderSkipped: false as const, maxBarThickness: 14, yAxisID: 'minutes' },
      { label: t('pomodoros'), data: reportData.rd.daily.map(d => d.pomodoros), backgroundColor: rgba(pomodoroColor, 0.67), borderRadius: 0, borderSkipped: false as const, maxBarThickness: 14, yAxisID: 'counts' },
      { label: t('tasks'), data: reportData.rd.daily.map(d => d.tasksDone), backgroundColor: rgba(tasksColor, 0.67), borderRadius: 0, borderSkipped: false as const, maxBarThickness: 14, yAxisID: 'counts' },
    ],
  };
  const combinedBarOpts = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
    plugins: { legend: { position: 'top' as const, labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#999', font: { size: 9 }, maxRotation: 45 } },
      minutes: { type: 'linear' as const, position: 'left' as const, beginAtZero: true, grid: { color: 'var(--border)' }, ticks: { color: rgba(durationAxisColor, 1), precision: 0 } },
      counts: { type: 'linear' as const, position: 'right' as const, beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { color: rgba(pomodoroColor, 1), precision: 0 } },
    },
  };

  // Report pie chart computed inline in modal IIFE

  return (
    <div className="stats-overview">
      {/* Toolbar: unified period switch + reports */}
      <div className="stats-toolbar">
        <div className="stats-period-toggle" aria-label="统计时间范围">
          <button className={`period-btn ${period === 'day' ? 'active' : ''}`} onClick={() => setPeriod('day')}>{t('today')}</button>
          <button className={`period-btn ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>{t('lastSevenDays')}</button>
          <button className={`period-btn ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>{t('lastMonth')}</button>
        </div>
        <div className="stats-report-btns">
          <button className="btn secondary small" onClick={() => setShowReport('week')}><BarChart3 size={13} /> {t('weeklyReport')}</button>
          <button className="btn secondary small" onClick={() => setShowReport('month')}><BarChart3 size={13} /> {t('monthlyReport')}</button>
        </div>
      </div>

      {/* Unified summary (pomodoros / duration / completed) for the selected period */}
      <div className="stats-top-row">
        <div className="stats-top-item accent"><span className="stats-top-val">{activeData.totalPomodoros}</span><span className="stats-top-label">🍅 {t('pomodoros')}</span></div>
        <div className="stats-top-item"><span className="stats-top-val">{activeData.totalMinutes}m</span><span className="stats-top-label"><Clock size={12} /> {t('duration')}</span></div>
        <div className="stats-top-item"><span className="stats-top-val">{activeData.totalTasksCompleted}</span><span className="stats-top-label"><CheckCircle2 size={12} /> {t('completedTasks')}</span></div>
      </div>

      {/* Pie chart immediately below the summary */}
      <div className="stats-card-full">
        <div className="chart-header pie-chart-header">
          <h4 className="chart-sub-title">{t('categoryShare')} · {metricInfo.label}</h4>
          <div className="stats-metric-toggle" aria-label="饼图分布指标">
            <button className={`metric-btn ${chartMetric === 'minutes' ? 'active' : ''}`} onClick={() => setChartMetric('minutes')}><Clock size={12} /> {t('duration')}</button>
            <button className={`metric-btn ${chartMetric === 'pomodoros' ? 'active' : ''}`} onClick={() => setChartMetric('pomodoros')}>🍅 {t('pomodoros')}</button>
            <button className={`metric-btn ${chartMetric === 'tasks' ? 'active' : ''}`} onClick={() => setChartMetric('tasks')}><CheckCircle2 size={12} /> {t('tasks')}</button>
          </div>
        </div>
        {pieCategories.length > 0 ? (
          <div className="pie-layout">
            <div className="chart-wrapper-pie">
              {visiblePieCategories.length > 0 && pieData
                ? <Doughnut data={pieData} options={pieOptions} />
                : <div className="chart-empty">{t('noData')}</div>}
            </div>
            <div className="pie-legend">
              {pieCategories.map(c => {
                const hidden = activeHiddenCats.has(c.label);
                return (
                  <div key={c.label} className={`pie-legend-item${hidden ? ' hidden' : ''}`}
                    onClick={() => toggleCat(c.label)} role="button" tabIndex={0} aria-pressed={!hidden}
                    title={hidden ? t('showCategory') : t('hideCategory')}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCat(c.label); } }}>
                    <span className="pie-dot" style={{ background: c.color }} />
                    <span>{c.label}</span>
                    <span className="pie-legend-val">{Math.round(c.value / pieTotal * 100)}% ({c.value}{metricInfo.unit})</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : <div className="chart-empty">{t('noData')}</div>}
      </div>

      {/* Combined trend chart */}
      <div className="stats-card-full">
        <div className="chart-header">
          <h4 className="chart-sub-title">{periodLabel} · {t('combinedTrend')}</h4>
          <span className="stats-period-range">{dateRange}</span>
        </div>
        <div className="chart-wrapper-lg trend-chart"><Bar data={trendData} options={trendOptions} /></div>
      </div>

      {/* Report Modal */}
      {showReport && (() => {
        const { rd, pd } = reportData;
        const reportType = showReport === 'week' ? t('weeklyReport') : t('monthlyReport');
        const activeDays = rd.daily.filter(d => d.pomodoros > 0).length;
        const reportCats = Object.entries(rd.categoryMinutes).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

        // Pie chart data for categories
        const pieCategories = reportCats.map(([k, v]) => ({ label: k, value: v, color: getCategoryColor(categories, k) }));
        const pieTotal = pieCategories.reduce((s, c) => s + c.value, 0);
        const activeReportHidden = reportHiddenCats.scope === reportScope ? reportHiddenCats.labels : new Set<string>();
        const visiblePieCategories = pieCategories.filter(c => !activeReportHidden.has(c.label));
        const visiblePieTotal = visiblePieCategories.reduce((s, c) => s + c.value, 0);
        const pieData = visiblePieCategories.length > 0 ? {
          labels: visiblePieCategories.map(c => c.label),
          datasets: [{ data: visiblePieCategories.map(c => c.value), backgroundColor: visiblePieCategories.map(c => c.color), borderWidth: 2, borderColor: 'var(--bg)' }],
        } : null;
        const pieOpts = {
          responsive: true, maintainAspectRatio: false, cutout: '60%', animation: { duration: 0 },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: unknown) => { const v = (ctx as { parsed: number }).parsed; return ` ${v}分钟 (${visiblePieTotal > 0 ? Math.round(v / visiblePieTotal * 100) : 0}%)`; } } } },
        };

        // Completed tasks in period (deduplicated by task ID)
        const periodStart = rd.daily[0]?.date ?? '';
        const periodEnd = rd.daily[rd.daily.length - 1]?.date ?? '';
        const periodTaskMap = new Map<string, { todo: Todo; record: { id: string; completedAt: string } }>();
        todos.filter(todo => !todo.deletedAt).forEach(todo => {
          getTodoCompletionRecords(todo)
            .filter(record => record.completedAt >= periodStart && record.completedAt <= periodEnd + 'T23:59:59')
            .forEach(record => { if (!periodTaskMap.has(todo.id)) periodTaskMap.set(todo.id, { todo, record }); });
        });
        const periodTasks = [...periodTaskMap.values()];

        const insights = generateReportInsights({
          language,
          period: showReport,
          daily: rd.daily,
          totalMinutes: rd.totalMinutes,
          totalPomodoros: rd.totalPomodoros,
          totalTasksCompleted: rd.totalTasksCompleted,
          categoryMinutes: rd.categoryMinutes,
          previousMinutes: pd.totalMinutes,
          previousPomodoros: pd.totalPomodoros,
          previousTasksCompleted: pd.totalTasksCompleted,
        });

        return (
          <div className="modal-overlay" onClick={() => setShowReport(null)}>
            <div className="report-modal apple-style" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="report-header-apple">
                <button className="report-close-btn" onClick={() => setShowReport(null)}><X size={18} /></button>
                <h3>{reportType}</h3>
                <span className="report-date-range">{rd.daily[0]?.date.slice(5)} ~ {rd.daily[rd.daily.length - 1]?.date.slice(5)}</span>
              </div>

              {/* Summary stats row */}
              <div className="report-apple-stats">
                <div className="report-apple-stat">
                  <span className="report-apple-stat-label">{t('focusDuration')}</span>
                  <span className="report-apple-stat-val">{formatDuration(rd.totalMinutes)}</span>
                  <span className={`report-apple-stat-diff ${diffText(rd.totalMinutes, pd.totalMinutes).cls}`}>
                    {diffText(rd.totalMinutes, pd.totalMinutes).icon} {diffText(rd.totalMinutes, pd.totalMinutes).text}
                  </span>
                </div>
                <div className="report-apple-stat">
                  <span className="report-apple-stat-label">🍅 {t('pomodoros')}</span>
                  <span className="report-apple-stat-val">{rd.totalPomodoros}个</span>
                  <span className={`report-apple-stat-diff ${diffText(rd.totalPomodoros, pd.totalPomodoros).cls}`}>
                    {diffText(rd.totalPomodoros, pd.totalPomodoros).icon} {diffText(rd.totalPomodoros, pd.totalPomodoros).text}
                  </span>
                </div>
                <div className="report-apple-stat">
                  <span className="report-apple-stat-label">✓ {t('tasks')}</span>
                  <span className="report-apple-stat-val">{rd.totalTasksCompleted}个</span>
                  <span className={`report-apple-stat-diff ${diffText(rd.totalTasksCompleted, pd.totalTasksCompleted).cls}`}>
                    {diffText(rd.totalTasksCompleted, pd.totalTasksCompleted).icon} {diffText(rd.totalTasksCompleted, pd.totalTasksCompleted).text}
                  </span>
                </div>
                <div className="report-apple-stat">
                  <span className="report-apple-stat-label">{t('activeDays')}</span>
                  <span className="report-apple-stat-val">{activeDays}天</span>
                </div>
              </div>

              {/* Data-aware analysis */}
              <div className="report-insights" aria-label={t('reportAnalysis')}>
                {insights.map(insight => (
                  <div key={`${insight.title}-${insight.text}`} className={`report-insight ${insight.kind}`}>
                    <strong>{insight.title}</strong>
                    <span>{insight.text}</span>
                  </div>
                ))}
              </div>

              {/* Combined grouped bar chart */}
              <div className="report-section-apple">
                <div className="report-bar-wrap"><Bar data={combinedBarData} options={combinedBarOpts} /></div>
              </div>

              {/* Pie chart - category distribution */}
              {pieCategories.length > 0 && (
                <div className="report-section-apple">
                  <h4>{t('categoryDistribution')}</h4>
                  <div className="report-pie-layout">
                    <div className="report-pie-chart">
                      {visiblePieCategories.length > 0 && pieData
                        ? <Doughnut data={pieData} options={pieOpts} />
                        : <div className="chart-empty">{t('noData')}</div>}
                    </div>
                    <div className="report-pie-legend">
                      {pieCategories.map(c => {
                        const hidden = activeReportHidden.has(c.label);
                        return (
                          <div key={c.label} className={`report-pie-item${hidden ? ' hidden' : ''}`}
                            onClick={() => toggleReportCat(c.label)} role="button" tabIndex={0} aria-pressed={!hidden}
                            title={hidden ? t('showCategory') : t('hideCategory')}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleReportCat(c.label); } }}>
                            <span className="report-pie-dot" style={{ background: c.color }} />
                            <span className="report-pie-name">{c.label}</span>
                            <span className="report-pie-val">{formatDuration(c.value)} ({pieTotal > 0 ? Math.round(c.value / pieTotal * 100) : 0}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Completed tasks */}
              {periodTasks.length > 0 && (
                <div className="report-section-apple">
                  <h4>{t('completedTaskSection')} ({periodTasks.length})</h4>
                  <div className="report-task-list">
                    {periodTasks.slice(0, 8).map(({ todo, record }) => (
                      <div key={`${todo.id}-${record.id}`} className="report-task-row">
                        <span className="report-task-dot" style={{ background: getCategoryColor(categories, todo.category) }} />
                        <span className="report-task-name">{todo.title}</span>
                        <span className="report-task-cat">{todo.category}</span>
                        <span className="report-task-pom">🍅 {todo.completedPomodoros}</span>
                      </div>
                    ))}
                    {periodTasks.length > 8 && <div className="report-task-more">{t('moreTasks', { count: periodTasks.length - 8 })}</div>}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="report-footer-apple">
                <button className="report-share-btn" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> {refreshing ? t('refreshing') : t('refresh')}
                </button>
                <button className="report-share-btn primary" onClick={() => handleDownload(rd, reportType, insights)}>
                  <Download size={14} /> {t('download')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
