import { useMemo, useState, useCallback } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { getCategoryColor, type Category, type CategoryItem, type DayData, type PomodoroRecord, type Todo } from '../../types';
import { X } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

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
  onAddTestData?: (data: Map<string, DayData>) => void;
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
      doneTasks.push({ id: `test-${date}-${j}`, title: task, priority: 'medium', category: cat, estimatedPomodoros: 2, completedPomodoros: Math.floor(Math.random() * 3), done: true, abandoned: false, createdAt: '', completedAt: '', abandonedAt: '', subtasks: [] });
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
  offsetDays: number = 0
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
    let tasksDone = dayData?.tasks?.filter(t => t.done).length ?? 0;
    const totalTasksDay = dayData?.tasks?.length ?? 0;
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
    const doneTasks = dayData?.tasks?.filter(t => t.done) ?? [];
    doneTasks.forEach(t => {
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

function getMetricTotal(data: PeriodResult, metric: ChartMetric): number {
  if (metric === 'minutes') return data.totalMinutes;
  if (metric === 'pomodoros') return data.totalPomodoros;
  return data.totalTasksCompleted;
}

function diffText(current: number, previous: number): { text: string; cls: string } {
  if (previous === 0 && current === 0) return { text: '—', cls: '' };
  if (previous === 0) return { text: `↑ 新增`, cls: 'up' };
  const pct = Math.round((current - previous) / previous * 100);
  if (pct > 0) return { text: `↑ +${pct}%`, cls: 'up' };
  if (pct < 0) return { text: `↓ ${pct}%`, cls: 'down' };
  return { text: '→ 持平', cls: 'same' };
}

function evalText(current: number, previous: number, label: string): string {
  if (previous === 0 && current === 0) return `${label}无数据`;
  if (previous === 0) return `${label}首次记录，加油！`;
  const pct = Math.round((current - previous) / previous * 100);
  if (pct > 20) return `🔥 ${label}大幅进步 (+${pct}%)，继续保持！`;
  if (pct > 0) return `👍 ${label}小幅提升 (+${pct}%)`;
  if (pct === 0) return `➡️ ${label}与上周持平`;
  if (pct > -20) return `📉 ${label}略有下降 (${pct}%)，调整一下`;
  return `⚠️ ${label}明显下滑 (${pct}%)，需要关注`;
}

export function StatsOverview({ dayDataMap, todayPomodoros, categories, onAddTestData }: StatsOverviewProps) {
  const [period, setPeriod] = useState<Period>('week');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('minutes');
  const [showReport, setShowReport] = useState<'week' | 'month' | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const todayData = useMemo(() => {
    const dayData = dayDataMap.get(today);
    let poms = dayData?.pomodoros?.filter(p => p.completed) ?? [];
    const existing = new Set(poms.map(p => `${p.start}-${p.end}`));
    poms = [...poms, ...todayPomodoros.filter(p => p.completed && !existing.has(`${p.start}-${p.end}`))];
    const mins = poms.reduce((s, p) => s + p.duration, 0);
    const tasksDone = dayData?.tasks?.filter(t => t.done).length ?? 0;
    return { pomodoros: poms.length, minutes: mins, tasksDone };
  }, [dayDataMap, todayPomodoros, today]);

  // Current period data
  const weekData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 7, today, 0), [dayDataMap, todayPomodoros, today]);
  const monthData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 30, today, 0), [dayDataMap, todayPomodoros, today]);

  // Previous period data (for comparison)
  const prevWeekData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 7, today, 7), [dayDataMap, todayPomodoros, today]);
  const prevMonthData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 30, today, 30), [dayDataMap, todayPomodoros, today]);

  const activeData = period === 'week' ? weekData : monthData;
  const prevData = period === 'week' ? prevWeekData : prevMonthData;
  const isCompact = period === 'month';

  const handleTest = useCallback(() => { onAddTestData?.(genTestData()); }, [onAddTestData]);

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
      borderRadius: 6, maxBarThickness: isCompact ? 16 : 36,
    }],
  };
  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: unknown) => activeData.daily[(items as Array<{ dataIndex: number }>)[0]?.dataIndex]?.date ?? '',
          label: (ctx: unknown) => {
            const d = activeData.daily[(ctx as { dataIndex: number }).dataIndex];
            return [
              `🍅 ${d.pomodoros}个番茄 · ${d.minutes}分钟`,
              `✅ 完成 ${d.tasksDone} 个任务`,
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
      y: { beginAtZero: true, suggestedMax: maxVal * 1.3, grid: { color: 'var(--border)' }, ticks: { color: '#999' } },
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
    responsive: true, maintainAspectRatio: false, cutout: '55%',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: unknown) => { const v = (ctx as { parsed: number }).parsed; return ` ${v}${metricInfo.unit} (${Math.round(v / pieTotal * 100)}%)`; } } } },
  };

  // Report data
  const reportData = useMemo(() => {
    const rd = showReport === 'week' ? weekData : monthData;
    const pd = showReport === 'week' ? prevWeekData : prevMonthData;
    const count = showReport === 'week' ? 7 : 30;
    return { rd, pd, count };
  }, [showReport, weekData, monthData, prevWeekData, prevMonthData]);

  return (
    <div className="stats-overview">
      {/* Today summary */}
      <div className="stats-top-row">
        <div className="stats-top-item accent"><span className="stats-top-val">{todayData.pomodoros}</span><span className="stats-top-label">🍅 今日番茄</span></div>
        <div className="stats-top-item"><span className="stats-top-val">{todayData.minutes}m</span><span className="stats-top-label">⏱ 今日时长</span></div>
        <div className="stats-top-item"><span className="stats-top-val">{todayData.tasksDone}</span><span className="stats-top-label">✅ 今日完成</span></div>
      </div>

      {/* Toolbar: period toggle + metric toggle + report buttons */}
      <div className="stats-toolbar">
        <div className="stats-period-toggle">
          <button className={`period-btn ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>近七天</button>
          <button className={`period-btn ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>近一个月</button>
        </div>
        <div className="stats-metric-toggle">
          <button className={`metric-btn ${chartMetric === 'minutes' ? 'active' : ''}`} onClick={() => setChartMetric('minutes')}>⏱ 时长</button>
          <button className={`metric-btn ${chartMetric === 'pomodoros' ? 'active' : ''}`} onClick={() => setChartMetric('pomodoros')}>🍅 番茄</button>
          <button className={`metric-btn ${chartMetric === 'tasks' ? 'active' : ''}`} onClick={() => setChartMetric('tasks')}>✅ 任务</button>
        </div>
        <div className="stats-report-btns">
          <button className="btn secondary small" onClick={() => setShowReport('week')}>📋 周报</button>
          <button className="btn secondary small" onClick={() => setShowReport('month')}>📋 月报</button>
        </div>
      </div>

      {/* Aggregate summary */}
      <div className="stats-aggregate-card">
        <div className="agg-item"><span className="agg-val">{activeData.totalPomodoros}</span><span className="agg-label">🍅 番茄</span></div>
        <div className="agg-item"><span className="agg-val">{activeData.totalMinutes}m</span><span className="agg-label">⏱ 时长</span></div>
        <div className="agg-item"><span className="agg-val">{activeData.totalTasksCompleted}</span><span className="agg-label">✅ 完成任务</span></div>
        <div className="agg-item"><span className="agg-val">{activeDays}/{activeData.daily.length}</span><span className="agg-label">📅 活跃天</span></div>
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
      {showReport && (
        <div className="modal-overlay" onClick={() => setShowReport(null)}>
          <div className="report-modal" onClick={e => e.stopPropagation()}>
            <div className="report-modal-header">
              <h3>📊 {showReport === 'week' ? '周报' : '月报'}</h3>
              <button className="report-close" onClick={() => setShowReport(null)}><X size={18} /></button>
            </div>
            <div className="report-modal-body">
              {/* Comparison section */}
              <div className="report-comparison">
                <div className="report-compare-row">
                  <span className="compare-label">🍅 番茄</span>
                  <span className="compare-current">{reportData.rd.totalPomodoros}个</span>
                  <span className={`compare-diff ${diffText(reportData.rd.totalPomodoros, reportData.pd.totalPomodoros).cls}`}>
                    {diffText(reportData.rd.totalPomodoros, reportData.pd.totalPomodoros).text}
                  </span>
                  <span className="compare-prev">(上周{reportData.pd.totalPomodoros}个)</span>
                </div>
                <div className="report-compare-row">
                  <span className="compare-label">⏱ 时长</span>
                  <span className="compare-current">{reportData.rd.totalMinutes}分钟</span>
                  <span className={`compare-diff ${diffText(reportData.rd.totalMinutes, reportData.pd.totalMinutes).cls}`}>
                    {diffText(reportData.rd.totalMinutes, reportData.pd.totalMinutes).text}
                  </span>
                  <span className="compare-prev">(上周{reportData.pd.totalMinutes}分钟)</span>
                </div>
                <div className="report-compare-row">
                  <span className="compare-label">✅ 完成任务</span>
                  <span className="compare-current">{reportData.rd.totalTasksCompleted}个</span>
                  <span className={`compare-diff ${diffText(reportData.rd.totalTasksCompleted, reportData.pd.totalTasksCompleted).cls}`}>
                    {diffText(reportData.rd.totalTasksCompleted, reportData.pd.totalTasksCompleted).text}
                  </span>
                  <span className="compare-prev">(上周{reportData.pd.totalTasksCompleted}个)</span>
                </div>
                <div className="report-compare-row">
                  <span className="compare-label">📅 活跃天</span>
                  <span className="compare-current">{reportData.rd.daily.filter(d => d.pomodoros > 0).length}天</span>
                  <span className={`compare-diff ${diffText(reportData.rd.daily.filter(d => d.pomodoros > 0).length, reportData.pd.daily.filter(d => d.pomodoros > 0).length).cls}`}>
                    {diffText(reportData.rd.daily.filter(d => d.pomodoros > 0).length, reportData.pd.daily.filter(d => d.pomodoros > 0).length).text}
                  </span>
                  <span className="compare-prev">(上周{reportData.pd.daily.filter(d => d.pomodoros > 0).length}天)</span>
                </div>
              </div>

              {/* Evaluation */}
              <div className="report-evaluation">
                <h4>📈 评价</h4>
                <p>{evalText(reportData.rd.totalPomodoros, reportData.pd.totalPomodoros, '番茄数')}</p>
                <p>{evalText(reportData.rd.totalMinutes, reportData.pd.totalMinutes, '专注时长')}</p>
                <p>{evalText(reportData.rd.totalTasksCompleted, reportData.pd.totalTasksCompleted, '完成任务')}</p>
              </div>

              {/* Category breakdown */}
              <div className="report-categories">
                <h4>📂 板块分布</h4>
                {Object.entries(reportData.rd.categoryMinutes).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([cat, mins]) => {
                  const poms = reportData.rd.categoryPomodoros[cat] || 0;
                  const tasks = reportData.rd.categoryTasks[cat] || 0;
                  const total = reportData.rd.totalMinutes;
                  return (
                    <div key={cat} className="report-cat-row">
                      <span className="report-cat-dot" style={{ background: getCategoryColor(categories, cat) }} />
                      <span className="report-cat-name">{cat}</span>
                      <span className="report-cat-val">{mins}m · 🍅{poms} · ✅{tasks}</span>
                      <span className="report-cat-pct">{total > 0 ? Math.round(mins / total * 100) : 0}%</span>
                    </div>
                  );
                })}
              </div>

              {/* Daily breakdown */}
              <div className="report-daily">
                <h4>📅 每日明细</h4>
                {reportData.rd.daily.map(d => (
                  <div key={d.date} className={`report-daily-row ${d.pomodoros > 0 ? 'active' : ''}`}>
                    <span className="report-daily-date">{d.date.slice(5)}</span>
                    <span className="report-daily-poms">🍅{d.pomodoros}</span>
                    <span className="report-daily-mins">⏱{d.minutes}m</span>
                    <span className="report-daily-tasks">✅{d.tasksDone}</span>
                  </div>
                ))}
              </div>

              <button className="btn secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}
                onClick={() => {
                  const { rd, pd } = reportData;
                  const label = showReport === 'week' ? '周报' : '月报';
                  const lines = [`📊 ${label}`, ''];
                  lines.push(`🍅 番茄: ${rd.totalPomodoros}个 (上期${pd.totalPomodoros})`);
                  lines.push(`⏱ 时长: ${rd.totalMinutes}分钟 (上期${pd.totalMinutes})`);
                  lines.push(`✅ 任务: ${rd.totalTasksCompleted}个 (上期${pd.totalTasksCompleted})`);
                  navigator.clipboard.writeText(lines.join('\n'));
                }}>📋 复制到剪贴板</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
