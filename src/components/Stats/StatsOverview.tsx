import { useMemo, useState, useCallback } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { getCategoryColor, type Category, type CategoryItem, type DayData, type PomodoroRecord, type Todo } from '../../types';
import { X, Clock, Flame, CheckCircle2, Calendar, BarChart3, PieChart, TrendingUp, TrendingDown, Minus, Timer, Target, Award, Sparkles, RefreshCw, Download } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend);

type Period = 'week' | 'month';
type ChartMetric = 'minutes' | 'pomodoros' | 'tasks';

const METRIC_LABELS: Record<ChartMetric, { label: string; unit: string; color: string }> = {
  minutes: { label: '专注时长', unit: '分钟', color: '#FF6B6B' },
  pomodoros: { label: '番茄数', unit: '个', color: '#FF6B6B' },
  tasks: { label: '完成任务', unit: '个', color: '#27ae60' },
};

interface StatsOverviewProps {
  dayDataMap: Map<string, DayData>;
  todayPomodoros: PomodoroRecord[];
  categories: CategoryItem[];
  todos: Todo[];
  onAddTestData?: (data: Map<string, DayData>) => void;
  /** Trigger a full sync refresh from git */
  onRefresh?: () => Promise<void>;
}

function genTestData(): Map<string, DayData> {
  const cats: Category[] = ['数学', '英语', '专业课', '政治', '运动'];
  const tasks: Record<string, string[]> = {
    '数学': ['刷高数真题', '线性代数'], '英语': ['背单词', '阅读理解'],
    '专业课': ['数据结构', '操作系统'], '政治': ['马原复习', '肖四'],
    '运动': ['跑步', '健身'],
  };
  const map = new Map<string, DayData>();
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    if (Math.random() < 0.2) continue;
    const pomodoroCount = Math.floor(Math.random() * 6) + 1;
    const taskCount = Math.floor(Math.random() * 4) + 1;
    const pomodoros: PomodoroRecord[] = [];
    for (let j = 0; j < pomodoroCount; j++) {
      const cat = cats[Math.floor(Math.random() * cats.length)];
      const task = tasks[cat][Math.floor(Math.random() * tasks[cat].length)];
      pomodoros.push({ start: '', end: '', duration: 25, taskId: null, taskTitle: task, category: cat, completed: true, createdAt: '' });
    }
    const doneTasks: Todo[] = [];
    for (let j = 0; j < taskCount; j++) {
      const cat = cats[Math.floor(Math.random() * cats.length)];
      const task = tasks[cat][Math.floor(Math.random() * tasks[cat].length)];
      doneTasks.push({ id: `test-${date}-${j}`, title: task, priority: 'medium', category: cat, estimatedPomodoros: 2, completedPomodoros: Math.floor(Math.random() * 3), done: true, abandoned: false, createdAt: '', updatedAt: '', completedAt: '', abandonedAt: '', subtasks: [] });
    }
    map.set(date, { date, pomodoros, tasks: doneTasks, totalFocusMinutes: pomodoros.length * 25, totalPomodoros: pomodoros.length, totalTasksCompleted: taskCount, streak: 0 });
  }
  return map;
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
): PeriodResult {
  const now = new Date();
  const days: string[] = [];
  for (let i = count - 1 + offsetDays; i >= offsetDays; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  let totalPomodoros = 0, totalMinutes = 0, totalTasks = 0, totalTasksCompleted = 0;
  const categoryMinutes: Record<string, number> = {};
  const categoryPomodoros: Record<string, number> = {};
  const categoryTasks: Record<string, number> = {};

  const daily = days.map(date => {
    const dayData = dayDataMap.get(date);
    let poms = dayData?.pomodoros?.filter(p => p.completed) ?? [];
    // Count completed tasks from local todos by completedAt date (ISO format: 2026-06-03T...)
    const doneToday = todos.filter(t => t.done && t.completedAt.startsWith(date));
    let tasksDone = doneToday.length;
    const totalTasksDay = todos.filter(t => t.createdAt.startsWith(date)).length || tasksDone;
    if (date === today) {
      const existing = new Set(poms.map(p => `${p.start}-${p.end}`));
      poms = [...poms, ...todayPomodoros.filter(p => p.completed && !existing.has(`${p.start}-${p.end}`))];
    }
    const mins = poms.reduce((s, p) => s + p.duration, 0);
    totalPomodoros += poms.length;
    totalMinutes += mins;
    totalTasks += totalTasksDay;
    totalTasksCompleted += tasksDone;
    poms.forEach(p => {
      categoryMinutes[p.category] = (categoryMinutes[p.category] || 0) + p.duration;
      categoryPomodoros[p.category] = (categoryPomodoros[p.category] || 0) + 1;
    });
    doneToday.forEach(t => {
      categoryTasks[t.category] = (categoryTasks[t.category] || 0) + 1;
    });
    return { date, minutes: mins, pomodoros: poms.length, tasksDone, totalTasks: totalTasksDay };
  });

  return { daily, totalPomodoros, totalMinutes, totalTasks, totalTasksCompleted, categoryMinutes, categoryPomodoros, categoryTasks };
}

function getMetricValue(d: PeriodResult['daily'][0], metric: ChartMetric): number {
  if (metric === 'minutes') return d.minutes;
  if (metric === 'pomodoros') return d.pomodoros;
  return d.tasksDone;
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
  if (previous === 0) return { text: '新增', cls: 'up', icon: <TrendingUp size={12} /> };
  const pct = Math.round((current - previous) / previous * 100);
  if (pct > 0) return { text: `+${pct}%`, cls: 'up', icon: <TrendingUp size={12} /> };
  if (pct < 0) return { text: `${pct}%`, cls: 'down', icon: <TrendingDown size={12} /> };
  return { text: '持平', cls: 'same', icon: <Minus size={12} /> };
}

function evalInfo(current: number, previous: number, label: string): { text: string; cls: string; icon: React.ReactNode } {
  if (previous === 0 && current === 0) return { text: `${label}无数据`, cls: 'neutral', icon: <Minus size={18} /> };
  if (previous === 0) return { text: `${label}首次记录，加油!`, cls: 'good', icon: <Sparkles size={18} /> };
  const pct = Math.round((current - previous) / previous * 100);
  if (pct > 20) return { text: `${label}大幅进步 (+${pct}%)，继续保持!`, cls: 'good', icon: <Award size={18} /> };
  if (pct > 0) return { text: `${label}小幅提升 (+${pct}%)`, cls: 'good', icon: <TrendingUp size={18} /> };
  if (pct === 0) return { text: `${label}与上期持平`, cls: 'neutral', icon: <Target size={18} /> };
  if (pct > -20) return { text: `${label}略有下降 (${pct}%)，调整一下`, cls: 'warn', icon: <TrendingDown size={18} /> };
  return { text: `${label}明显下滑 (${pct}%)，需要关注`, cls: 'bad', icon: <TrendingDown size={18} /> };
}

export function StatsOverview({ dayDataMap, todayPomodoros, categories, todos, onAddTestData, onRefresh }: StatsOverviewProps) {
  const [period, setPeriod] = useState<Period>('week');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('minutes');
  const [showReport, setShowReport] = useState<'week' | 'month' | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const todayData = useMemo(() => {
    const dayData = dayDataMap.get(today);
    let poms = dayData?.pomodoros?.filter(p => p.completed) ?? [];
    const existing = new Set(poms.map(p => `${p.start}-${p.end}`));
    poms = [...poms, ...todayPomodoros.filter(p => p.completed && !existing.has(`${p.start}-${p.end}`))];
    const mins = poms.reduce((s, p) => s + p.duration, 0);
    const tasksDone = todos.filter(t => t.done && t.completedAt.startsWith(today)).length;
    return { pomodoros: poms.length, minutes: mins, tasksDone };
  }, [dayDataMap, todayPomodoros, today, todos]);

  // Current period data
  const weekData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 7, today, 0, todos), [dayDataMap, todayPomodoros, today, todos]);
  const monthData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 30, today, 0, todos), [dayDataMap, todayPomodoros, today, todos]);

  // Previous period data (for comparison)
  const prevWeekData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 7, today, 7, todos), [dayDataMap, todayPomodoros, today, todos]);
  const prevMonthData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 30, today, 30, todos), [dayDataMap, todayPomodoros, today, todos]);

  const activeData = period === 'week' ? weekData : monthData;
  const isCompact = period === 'month';

  const handleTest = useCallback(() => { onAddTestData?.(genTestData()); }, [onAddTestData]);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }, [onRefresh, refreshing]);

  const handleDownload = useCallback((rd: PeriodResult, reportType: string) => {
    const lines: string[] = [];
    lines.push(`${reportType}`);
    lines.push(`日期: ${rd.daily[0]?.date} ~ ${rd.daily[rd.daily.length - 1]?.date}`);
    lines.push('');
    lines.push(`番茄: ${rd.totalPomodoros}个`);
    lines.push(`专注时长: ${rd.totalMinutes}分钟`);
    lines.push(`完成任务: ${rd.totalTasksCompleted}个`);
    lines.push(`活跃天数: ${rd.daily.filter(d => d.pomodoros > 0).length}天`);
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

  const metricInfo = METRIC_LABELS[chartMetric];
  const maxVal = Math.max(...activeData.daily.map(d => getMetricValue(d, chartMetric)), 1);
  const dateRange = `${activeData.daily[0]?.date.slice(5)} ~ ${activeData.daily[activeData.daily.length - 1]?.date.slice(5)}`;
  const activeDays = activeData.daily.filter(d => d.pomodoros > 0).length;

  // Bar chart
  const barData = {
    labels: activeData.daily.map(d => d.date.slice(5)),
    datasets: [{
      label: metricInfo.label,
      data: activeData.daily.map(d => getMetricValue(d, chartMetric)),
      backgroundColor: activeData.daily.map(d => d.date === today ? `${metricInfo.color}b3` : `${metricInfo.color}66`),
      borderRadius: 6, maxBarThickness: 24,
    }],
  };
  const barOptions = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
    layout: { padding: { left: 2, right: 4, top: 20, bottom: 0 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: unknown) => activeData.daily[(items as Array<{ dataIndex: number }>)[0]?.dataIndex]?.date ?? '',
          label: (ctx: unknown) => {
            const d = activeData.daily[(ctx as { dataIndex: number }).dataIndex];
            return [
              `番茄 ${d.pomodoros}个  ·  ${d.minutes}分钟`,
              `完成任务 ${d.tasksDone}个`,
            ];
          },
        },
      },
      afterDatasetsDraw: (chart: unknown) => {
        const c = chart as { ctx: CanvasRenderingContext2D; data: typeof barData; scales: { x: { getPixelForValue: (v: number) => number }; y: { getPixelForValue: (v: number) => number } } };
        if (!c?.scales?.x || !c?.scales?.y) return;
        c.data.datasets[0].data.forEach((val: number, i: number) => {
          if (val === 0) return;
          const x = c.scales.x.getPixelForValue(i);
          const y = c.scales.y.getPixelForValue(val);
          const d = activeData.daily[i];
          c.ctx.save();
          c.ctx.font = `bold ${isCompact ? '8' : '11'}px system-ui`;
          c.ctx.fillStyle = d?.date === today ? metricInfo.color : `${metricInfo.color}cc`;
          c.ctx.textAlign = 'center';
          c.ctx.fillText(`${val}${metricInfo.unit}`, x, y - 5);
          c.ctx.restore();
        });
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#999', font: { size: isCompact ? 7 : 10 }, maxRotation: isCompact ? 60 : 0 } },
      y: {
        beginAtZero: true, suggestedMax: maxVal * 1.3, grid: { color: 'var(--border)' },
        ticks: { color: '#999', precision: 0 },
        afterDataLimits: (axis: { max: number }) => { if (axis.max < 10) axis.max = 10; },
      },
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

  // Report bar chart (daily trend)
  const reportBarData = {
    labels: reportData.rd.daily.map(d => d.date.slice(5)),
    datasets: [
      { label: '番茄', data: reportData.rd.daily.map(d => d.pomodoros), backgroundColor: '#FF6B6Bcc', borderRadius: 4, maxBarThickness: 20 },
      { label: '任务', data: reportData.rd.daily.map(d => d.tasksDone), backgroundColor: '#27ae60cc', borderRadius: 4, maxBarThickness: 20 },
    ],
  };
  const reportBarOptions = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
    plugins: { legend: { position: 'top' as const, labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#999', font: { size: 9 }, maxRotation: 45 } },
      y: { beginAtZero: true, grid: { color: 'var(--border)' }, ticks: { color: '#999' } },
    },
  };

  // Combined trend chart: duration + pomodoros + tasks as grouped bars
  const trendData = {
    labels: reportData.rd.daily.map(d => d.date.slice(5)),
    datasets: [
      {
        label: '时长(分钟)', data: reportData.rd.daily.map(d => d.minutes),
        backgroundColor: '#6c5ce7aa', borderRadius: 4, maxBarThickness: 16,
      },
      {
        label: '番茄数', data: reportData.rd.daily.map(d => d.pomodoros),
        backgroundColor: '#FF6B6Baa', borderRadius: 4, maxBarThickness: 16,
      },
      {
        label: '任务数', data: reportData.rd.daily.map(d => d.tasksDone),
        backgroundColor: '#27ae60aa', borderRadius: 4, maxBarThickness: 16,
      },
    ],
  };
  const trendOptions = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
    plugins: { legend: { position: 'top' as const, labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#999', font: { size: 9 }, maxRotation: 45 } },
      y: { beginAtZero: true, grid: { color: 'var(--border)' }, ticks: { color: '#999' } },
    },
  };

  // Report pie chart computed inline in modal IIFE

  return (
    <div className="stats-overview">
      {/* Today summary */}
      <div className="stats-top-row">
        <div className="stats-top-item accent"><span className="stats-top-val">{todayData.pomodoros}</span><span className="stats-top-label"><Flame size={12} /> 今日番茄</span></div>
        <div className="stats-top-item"><span className="stats-top-val">{todayData.minutes}m</span><span className="stats-top-label"><Clock size={12} /> 今日时长</span></div>
        <div className="stats-top-item"><span className="stats-top-val">{todayData.tasksDone}</span><span className="stats-top-label"><CheckCircle2 size={12} /> 今日完成</span></div>
      </div>

      {/* Toolbar: period toggle + metric toggle + report buttons */}
      <div className="stats-toolbar">
        <div className="stats-period-toggle">
          <button className={`period-btn ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>近七天</button>
          <button className={`period-btn ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>近一个月</button>
        </div>
        <div className="stats-metric-toggle">
          <button className={`metric-btn ${chartMetric === 'minutes' ? 'active' : ''}`} onClick={() => setChartMetric('minutes')}><Clock size={12} /> 时长</button>
          <button className={`metric-btn ${chartMetric === 'pomodoros' ? 'active' : ''}`} onClick={() => setChartMetric('pomodoros')}><Flame size={12} /> 番茄</button>
          <button className={`metric-btn ${chartMetric === 'tasks' ? 'active' : ''}`} onClick={() => setChartMetric('tasks')}><CheckCircle2 size={12} /> 任务</button>
        </div>
        <div className="stats-report-btns">
          <button className="btn secondary small" onClick={() => setShowReport('week')}><BarChart3 size={13} /> 周报</button>
          <button className="btn secondary small" onClick={() => setShowReport('month')}><BarChart3 size={13} /> 月报</button>
        </div>
      </div>

      {/* Aggregate summary */}
      <div className="stats-aggregate-card">
        <div className="agg-item"><span className="agg-val">{activeData.totalPomodoros}</span><span className="agg-label"><Flame size={11} /> 番茄</span></div>
        <div className="agg-item"><span className="agg-val">{activeData.totalMinutes}m</span><span className="agg-label"><Clock size={11} /> 时长</span></div>
        <div className="agg-item"><span className="agg-val">{activeData.totalTasksCompleted}</span><span className="agg-label"><CheckCircle2 size={11} /> 完成任务</span></div>
        <div className="agg-item"><span className="agg-val">{activeDays}/{activeData.daily.length}</span><span className="agg-label"><Calendar size={11} /> 活跃天</span></div>
      </div>

      {/* Bar chart */}
      <div className="stats-card-full">
        <div className="chart-header">
          <h4 className="chart-sub-title">{period === 'week' ? '近七天' : '近一个月'} · {metricInfo.label}</h4>
          <span className="stats-period-range">{dateRange}</span>
        </div>
        <div className="chart-wrapper-lg"><Bar data={barData} options={barOptions} /></div>
      </div>

      {/* Pie chart */}
      <div className="stats-card-full">
        <h4 className="chart-sub-title">板块占比 · {metricInfo.label}</h4>
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
        ) : <div className="chart-empty">暂无数据</div>}
      </div>

      {activeData.totalPomodoros === 0 && (
        <button className="btn secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleTest}>🧪 注入测试数据</button>
      )}

      {/* Report Modal */}
      {showReport && (() => {
        const { rd, pd } = reportData;
        const reportType = showReport === 'week' ? '周报' : '月报';
        const prevLabel = showReport === 'week' ? '上周' : '上月';
        const activeDays = rd.daily.filter(d => d.pomodoros > 0).length;
        const prevActiveDays = pd.daily.filter(d => d.pomodoros > 0).length;
        const reportCats = Object.entries(rd.categoryMinutes).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
        const reportPieCats = reportCats.map(([k, v]) => ({ label: k, value: v, color: getCategoryColor(categories, k) }));
        const reportPieTotal = reportPieCats.reduce((s, c) => s + c.value, 0);
        const rPieData = reportPieCats.length > 0 ? {
          labels: reportPieCats.map(c => c.label),
          datasets: [{ data: reportPieCats.map(c => c.value), backgroundColor: reportPieCats.map(c => c.color), borderWidth: 2, borderColor: 'var(--bg-card)' }],
        } : null;
        const rPieOpts = {
          responsive: true, maintainAspectRatio: false, cutout: '62%', animation: { duration: 0 },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: unknown) => { const v = (ctx as { parsed: number }).parsed; return ` ${v}分钟 (${reportPieTotal > 0 ? Math.round(v / reportPieTotal * 100) : 0}%)`; } } } },
        };
        const sumCards = [
          { icon: <Flame size={16} />, bg: '#FF6B6B', val: rd.totalPomodoros, label: '番茄', diff: diffText(rd.totalPomodoros, pd.totalPomodoros), prev: pd.totalPomodoros, unit: '个' },
          { icon: <Clock size={16} />, bg: '#6c5ce7', val: rd.totalMinutes, label: '专注时长', diff: diffText(rd.totalMinutes, pd.totalMinutes), prev: pd.totalMinutes, unit: '分钟' },
          { icon: <CheckCircle2 size={16} />, bg: '#00b894', val: rd.totalTasksCompleted, label: '完成任务', diff: diffText(rd.totalTasksCompleted, pd.totalTasksCompleted), prev: pd.totalTasksCompleted, unit: '个' },
          { icon: <Calendar size={16} />, bg: '#0984e3', val: activeDays, label: '活跃天数', diff: diffText(activeDays, prevActiveDays), prev: prevActiveDays, unit: '天' },
        ];
        const evals = [
          evalInfo(rd.totalPomodoros, pd.totalPomodoros, '番茄数'),
          evalInfo(rd.totalMinutes, pd.totalMinutes, '专注时长'),
          evalInfo(rd.totalTasksCompleted, pd.totalTasksCompleted, '完成任务'),
        ];

        return (
          <div className="modal-overlay" onClick={() => setShowReport(null)}>
            <div className="report-modal" onClick={e => e.stopPropagation()}>
              {/* Banner */}
              <div className="report-banner">
                <div className="report-banner-head">
                  <div className="report-banner-title">
                    <BarChart3 size={22} strokeWidth={2.5} />
                    <h3>{reportType}</h3>
                  </div>
                  <button className="report-banner-close" onClick={() => setShowReport(null)}><X size={16} /></button>
                </div>
                <div className="report-banner-date">
                  {rd.daily[0]?.date.slice(5)} ~ {rd.daily[rd.daily.length - 1]?.date.slice(5)}
                </div>
              </div>

              {/* Summary cards */}
              <div className="report-summary">
                {sumCards.map((c) => (
                  <div key={c.label} className="report-sum-card">
                    <div className="report-sum-icon" style={{ background: c.bg }}>{c.icon}</div>
                    <div className="report-sum-val">{c.val}<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 3 }}>{c.unit}</span></div>
                    <div className="report-sum-label">{c.label}</div>
                    <div className={`report-sum-diff ${c.diff.cls}`}>
                      {c.diff.icon} {c.diff.text}
                      <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: 3 }}>/ {prevLabel}{c.prev}{c.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Evaluation */}
              <div className="report-section-title">评价</div>
              <div className="report-eval">
                {evals.map((e, i) => (
                  <div key={i} className="report-eval-item">
                    <div className={`report-eval-icon ${e.cls}`}>{e.icon}</div>
                    <div className="report-eval-text">{e.text}</div>
                  </div>
                ))}
              </div>

              {/* Category distribution */}
              <div className="report-section-title">板块分布</div>
              {reportCats.length > 0 ? (
                <div className="report-cat-bars">
                  {reportCats.map(([cat, mins]) => {
                    const poms = rd.categoryPomodoros[cat] || 0;
                    const tasks = rd.categoryTasks[cat] || 0;
                    const pct = rd.totalMinutes > 0 ? Math.round(mins / rd.totalMinutes * 100) : 0;
                    const color = getCategoryColor(categories, cat);
                    return (
                      <div key={cat} className="report-cat-bar-item">
                        <div className="report-cat-bar-head">
                          <span className="report-cat-bar-dot" style={{ background: color }} />
                          <span className="report-cat-bar-name">{cat}</span>
                          <span className="report-cat-bar-pct">{pct}%</span>
                        </div>
                        <div className="report-cat-bar-track">
                          <div className="report-cat-bar-fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <div className="report-cat-bar-stats">
                          <span className="report-cat-bar-stat"><Timer size={11} /> {mins}分钟</span>
                          <span className="report-cat-bar-stat"><Flame size={11} /> {poms}个番茄</span>
                          <span className="report-cat-bar-stat"><CheckCircle2 size={11} /> {tasks}个任务</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="chart-empty">暂无数据</div>
              )}

              {/* Category pie + bar charts */}
              <div className="report-section-title">图表分析</div>
              <div className="report-chart-section">
                {rPieData && (
                  <div style={{ marginBottom: 16 }}>
                    <h4><PieChart size={14} /> 板块占比</h4>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ width: 110, height: 110, flexShrink: 0 }}><Doughnut data={rPieData} options={rPieOpts} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {reportPieCats.map(c => (
                          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 12 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                            <span style={{ color: 'var(--text-secondary)' }}>{c.label}</span>
                            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {reportPieTotal > 0 ? Math.round(c.value / reportPieTotal * 100) : 0}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <h4><BarChart3 size={14} /> 每日趋势</h4>
                  <div className="report-bar-wrap"><Bar data={reportBarData} options={reportBarOptions} /></div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <h4><TrendingUp size={14} /> 综合趋势</h4>
                  <div className="report-bar-wrap"><Line data={trendData} options={trendOptions} /></div>
                </div>
              </div>

              {/* Footer */}
              <div className="report-footer">
                <button className="report-share-btn" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> {refreshing ? '同步中...' : '刷新数据'}
                </button>
                <button className="report-share-btn primary" onClick={() => handleDownload(rd, reportType)}>
                  <Download size={14} /> 下载报告
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
