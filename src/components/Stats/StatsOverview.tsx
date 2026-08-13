import { useMemo, useState, useCallback } from 'react';
import { Bar, Chart, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarController, LineController, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { getCategoryColor, type CategoryItem, type DayData, type PomodoroRecord, type Todo } from '../../types';
import { X, Clock, CheckCircle2, Calendar, BarChart3, TrendingUp, TrendingDown, Minus, RefreshCw, Download } from 'lucide-react';
import { formatDate, formatDuration } from '../../utils/dateUtils';
import { isPomodoroRecord } from '../../utils/pomodoroRules';
import { generateReportInsights, type ReportInsight } from '../../utils/reportInsights';
import { useLanguage } from '../../i18n/LanguageContext';

ChartJS.register(CategoryScale, LinearScale, BarController, LineController, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend);

type Period = 'week' | 'month';
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
  runningCategory: string = '其他',
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
    const doneToday = todos.filter(t => !t.deletedAt && t.done && t.completedAt.startsWith(date));
    const tasksDone = doneToday.length;
    const totalTasksDay = todos.filter(t => !t.deletedAt && t.createdAt.startsWith(date)).length || tasksDone;
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
    doneToday.forEach(t => {
      categoryTasks[t.category] = (categoryTasks[t.category] || 0) + 1;
    });
    return { date, minutes: mins, pomodoros: tomatoCount, tasksDone, totalTasks: totalTasksDay };
  });

  return { daily, totalPomodoros, totalMinutes, totalTasks, totalTasksCompleted, categoryMinutes, categoryPomodoros, categoryTasks };
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

export function StatsOverview({ dayDataMap, todayPomodoros, categories, todos, runningMinutes = 0, runningCategory = '其他', onRefresh }: StatsOverviewProps) {
  const { language, t } = useLanguage();
  const [period, setPeriod] = useState<Period>('week');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('minutes');
  const [showReport, setShowReport] = useState<'week' | 'month' | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const today = formatDate(new Date());

  const todayData = useMemo(() => {
    const dayData = dayDataMap.get(today);
    let poms = dayData?.pomodoros?.filter(p => p.completed) ?? [];
    const existing = new Set(poms.map(p => p.id || `${p.start}-${p.end}`));
    poms = [...poms, ...todayPomodoros.filter(p => p.completed && (p.date || today) === today && !existing.has(p.id || `${p.start}-${p.end}`))];
    const mins = poms.reduce((s, p) => s + p.duration, 0) + runningMinutes;
    const tasksDone = todos.filter(t => !t.deletedAt && t.done && t.completedAt.startsWith(today)).length;
    return { pomodoros: poms.filter(isPomodoroRecord).length, minutes: mins, tasksDone };
  }, [dayDataMap, todayPomodoros, today, todos, runningMinutes]);

  // Current period data
  const weekData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 7, today, 0, todos, runningMinutes, runningCategory), [dayDataMap, todayPomodoros, today, todos, runningMinutes, runningCategory]);
  const monthData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 30, today, 0, todos, runningMinutes, runningCategory), [dayDataMap, todayPomodoros, today, todos, runningMinutes, runningCategory]);

  // Previous period data (for comparison)
  const prevWeekData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 7, today, 7, todos), [dayDataMap, todayPomodoros, today, todos]);
  const prevMonthData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 30, today, 30, todos), [dayDataMap, todayPomodoros, today, todos]);

  const activeData = period === 'week' ? weekData : monthData;
  const isCompact = period === 'month';

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }, [onRefresh, refreshing]);

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
  const dateRange = `${activeData.daily[0]?.date.slice(5)} ~ ${activeData.daily[activeData.daily.length - 1]?.date.slice(5)}`;
  const activeDays = activeData.daily.filter(d => d.minutes > 0 || d.tasksDone > 0).length;

  // Duration is the background bar; tomato and task counts remain readable as two lines.
  const trendData = {
    labels: activeData.daily.map(d => d.date.slice(5)),
    datasets: [
      {
        type: 'bar' as const,
        label: `${t('focusDuration')} (${language === 'zh-CN' ? '分钟' : 'min'})`, data: activeData.daily.map(d => d.minutes), yAxisID: 'minutes',
        borderColor: '#6c5ce799', backgroundColor: '#6c5ce755', borderWidth: 1,
        borderRadius: 0, borderSkipped: false, maxBarThickness: isCompact ? 12 : 24, order: 3,
      },
      {
        type: 'line' as const,
        label: t('pomodoroCount'), data: activeData.daily.map(d => d.pomodoros), yAxisID: 'counts',
        borderColor: '#FF6B6B', backgroundColor: '#FF6B6B33', pointBackgroundColor: '#FF6B6B',
        pointRadius: isCompact ? 2 : 3.5, pointHoverRadius: 5, borderWidth: 2.5, tension: 0.3, order: 1,
      },
      {
        type: 'line' as const,
        label: t('completedTasks'), data: activeData.daily.map(d => d.tasksDone), yAxisID: 'counts',
        borderColor: '#27ae60', backgroundColor: '#27ae6033', pointBackgroundColor: '#27ae60',
        pointRadius: isCompact ? 2 : 3.5, pointHoverRadius: 5, borderWidth: 2.5, borderDash: [5, 4], tension: 0.3, order: 2,
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
          title: (items: unknown) => activeData.daily[(items as Array<{ dataIndex: number }>)[0]?.dataIndex]?.date ?? '',
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
      minutes: { type: 'linear' as const, position: 'left' as const, beginAtZero: true, grid: { color: 'rgba(128,128,128,0.12)' }, ticks: { color: '#6c5ce7', precision: 0 }, title: { display: true, text: '分钟', color: '#6c5ce7', font: { size: 10 } } },
      counts: { type: 'linear' as const, position: 'right' as const, beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { color: '#FF6B6B', precision: 0 }, title: { display: true, text: '番茄 / 任务', color: '#FF6B6B', font: { size: 10 } } },
    },
  };

  // Pie chart
  const pieCategories = useMemo(() => getCategoryData(activeData, chartMetric, categories), [activeData, chartMetric, categories]);
  const pieTotal = pieCategories.reduce((s, c) => s + c.value, 0);
  const pieData = pieCategories.length > 0 ? {
    labels: pieCategories.map(c => c.label),
    datasets: [{ data: pieCategories.map(c => c.value), backgroundColor: pieCategories.map(c => c.color), borderWidth: 2, borderColor: 'var(--bg-card)' }],
  } : null;
  const pieOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '55%', animation: { duration: 0 },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: unknown) => { const v = (ctx as { parsed: number }).parsed; return ` ${v}${metricInfo.unit} (${Math.round(v / pieTotal * 100)}%)`; } } } },
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
      { label: `${t('duration')} (${language === 'zh-CN' ? '分钟' : 'min'})`, data: reportData.rd.daily.map(d => d.minutes), backgroundColor: '#6c5ce7aa', borderRadius: 0, borderSkipped: false as const, maxBarThickness: 14, yAxisID: 'minutes' },
      { label: t('pomodoros'), data: reportData.rd.daily.map(d => d.pomodoros), backgroundColor: '#FF6B6Baa', borderRadius: 0, borderSkipped: false as const, maxBarThickness: 14, yAxisID: 'counts' },
      { label: t('tasks'), data: reportData.rd.daily.map(d => d.tasksDone), backgroundColor: '#27ae60aa', borderRadius: 0, borderSkipped: false as const, maxBarThickness: 14, yAxisID: 'counts' },
    ],
  };
  const combinedBarOpts = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
    plugins: { legend: { position: 'top' as const, labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#999', font: { size: 9 }, maxRotation: 45 } },
      minutes: { type: 'linear' as const, position: 'left' as const, beginAtZero: true, grid: { color: 'var(--border)' }, ticks: { color: '#6c5ce7', precision: 0 } },
      counts: { type: 'linear' as const, position: 'right' as const, beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { color: '#FF6B6B', precision: 0 } },
    },
  };

  // Report pie chart computed inline in modal IIFE

  return (
    <div className="stats-overview">
      {/* Today summary */}
      <div className="stats-top-row">
        <div className="stats-top-item accent"><span className="stats-top-val">{todayData.pomodoros}</span><span className="stats-top-label">🍅 {t('todayPomodoros')}</span></div>
        <div className="stats-top-item"><span className="stats-top-val">{todayData.minutes}m</span><span className="stats-top-label"><Clock size={12} /> {t('todayDuration')}</span></div>
        <div className="stats-top-item"><span className="stats-top-val">{todayData.tasksDone}</span><span className="stats-top-label"><CheckCircle2 size={12} /> {t('todayCompleted')}</span></div>
      </div>

      {/* Toolbar: all controls in one row */}
      <div className="stats-toolbar">
        <div className="stats-period-toggle">
          <button className={`period-btn ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>{t('lastSevenDays')}</button>
          <button className={`period-btn ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>{t('lastMonth')}</button>
        </div>
        <div className="stats-report-btns">
          <button className="btn secondary small" onClick={() => setShowReport('week')}><BarChart3 size={13} /> {t('weeklyReport')}</button>
          <button className="btn secondary small" onClick={() => setShowReport('month')}><BarChart3 size={13} /> {t('monthlyReport')}</button>
        </div>
      </div>

      {/* Aggregate summary */}
      <div className="stats-aggregate-card">
        <div className="agg-item"><span className="agg-val">{activeData.totalPomodoros}</span><span className="agg-label">🍅 {t('pomodoros')}</span></div>
        <div className="agg-item"><span className="agg-val">{activeData.totalMinutes}m</span><span className="agg-label"><Clock size={11} /> {t('duration')}</span></div>
        <div className="agg-item"><span className="agg-val">{activeData.totalTasksCompleted}</span><span className="agg-label"><CheckCircle2 size={11} /> {t('completedTasks')}</span></div>
        <div className="agg-item"><span className="agg-val">{activeDays}/{activeData.daily.length}</span><span className="agg-label"><Calendar size={11} /> {t('activeDays')}</span></div>
      </div>

      {/* Combined trend chart */}
      <div className="stats-card-full">
        <div className="chart-header">
          <h4 className="chart-sub-title">{period === 'week' ? t('lastSevenDays') : t('lastMonth')} · {t('combinedTrend')}</h4>
          <span className="stats-period-range">{dateRange}</span>
        </div>
        <div className="chart-wrapper-lg trend-chart"><Chart type="bar" data={trendData} options={trendOptions} /></div>
      </div>

      {/* Pie chart */}
      <div className="stats-card-full">
        <div className="chart-header pie-chart-header">
          <h4 className="chart-sub-title">{t('categoryShare')} · {metricInfo.label}</h4>
          <div className="stats-metric-toggle" aria-label="饼图分布指标">
            <button className={`metric-btn ${chartMetric === 'minutes' ? 'active' : ''}`} onClick={() => setChartMetric('minutes')}><Clock size={12} /> {t('duration')}</button>
            <button className={`metric-btn ${chartMetric === 'pomodoros' ? 'active' : ''}`} onClick={() => setChartMetric('pomodoros')}>🍅 {t('pomodoros')}</button>
            <button className={`metric-btn ${chartMetric === 'tasks' ? 'active' : ''}`} onClick={() => setChartMetric('tasks')}><CheckCircle2 size={12} /> {t('tasks')}</button>
          </div>
        </div>
        {pieData ? (
          <div className="pie-layout">
            <div className="chart-wrapper-pie"><Doughnut data={pieData} options={pieOptions} /></div>
            <div className="pie-legend">
              {pieCategories.map(c => (
                <div key={c.label} className="pie-legend-item">
                  <span className="pie-dot" style={{ background: c.color }} />
                  <span>{c.label}</span>
                  <span className="pie-legend-val">{Math.round(c.value / pieTotal * 100)}% ({c.value}{metricInfo.unit})</span>
                </div>
              ))}
            </div>
          </div>
        ) : <div className="chart-empty">{t('noData')}</div>}
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
        const pieData = pieCategories.length > 0 ? {
          labels: pieCategories.map(c => c.label),
          datasets: [{ data: pieCategories.map(c => c.value), backgroundColor: pieCategories.map(c => c.color), borderWidth: 2, borderColor: 'var(--bg)' }],
        } : null;
        const pieOpts = {
          responsive: true, maintainAspectRatio: false, cutout: '60%', animation: { duration: 0 },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: unknown) => { const v = (ctx as { parsed: number }).parsed; return ` ${v}分钟 (${pieTotal > 0 ? Math.round(v / pieTotal * 100) : 0}%)`; } } } },
        };

        // Completed tasks in period
        const periodStart = rd.daily[0]?.date ?? '';
        const periodEnd = rd.daily[rd.daily.length - 1]?.date ?? '';
        const periodTasks = todos.filter(t => !t.deletedAt && t.done && t.completedAt && t.completedAt >= periodStart && t.completedAt <= periodEnd + 'T23:59:59');

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
              {pieData && (
                <div className="report-section-apple">
                  <h4>{t('categoryDistribution')}</h4>
                  <div className="report-pie-layout">
                    <div className="report-pie-chart"><Doughnut data={pieData} options={pieOpts} /></div>
                    <div className="report-pie-legend">
                      {pieCategories.map(c => (
                        <div key={c.label} className="report-pie-item">
                          <span className="report-pie-dot" style={{ background: c.color }} />
                          <span className="report-pie-name">{c.label}</span>
                          <span className="report-pie-val">{formatDuration(c.value)} ({pieTotal > 0 ? Math.round(c.value / pieTotal * 100) : 0}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Completed tasks */}
              {periodTasks.length > 0 && (
                <div className="report-section-apple">
                  <h4>{t('completedTaskSection')} ({periodTasks.length})</h4>
                  <div className="report-task-list">
                    {periodTasks.slice(0, 8).map(t => (
                      <div key={t.id} className="report-task-row">
                        <span className="report-task-dot" style={{ background: getCategoryColor(categories, t.category) }} />
                        <span className="report-task-name">{t.title}</span>
                        <span className="report-task-cat">{t.category}</span>
                        <span className="report-task-pom">🍅 {t.completedPomodoros}</span>
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
