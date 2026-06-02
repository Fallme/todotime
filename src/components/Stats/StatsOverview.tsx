import { useMemo, useState, useCallback } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { getCategoryColor, type Category, type CategoryItem, type DayData, type PomodoroRecord, type Todo } from '../../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type Period = 'week' | 'month';

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
    // Generate some done tasks
    const doneTasks: Todo[] = [];
    for (let j = 0; j < taskCount; j++) {
      const cat = cats[Math.floor(Math.random() * cats.length)];
      const task = tasks[cat][Math.floor(Math.random() * tasks[cat].length)];
      doneTasks.push({ id: `test-${date}-${j}`, title: task, priority: 'medium', category: cat as Category, estimatedPomodoros: 2, completedPomodoros: Math.floor(Math.random() * 3), done: true, abandoned: false, createdAt: '', completedAt: '', abandonedAt: '', subtasks: [] });
    }
    map.set(date, { date, pomodoros, tasks: doneTasks, totalFocusMinutes: pomodoros.length * 25, totalPomodoros: pomodoros.length, totalTasksCompleted: taskCount, streak: 0 });
  }
  return map;
}

function computePeriodData(
  dayDataMap: Map<string, DayData>,
  todayPomodoros: PomodoroRecord[],
  count: number,
  today: string
) {
  const now = new Date();
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  let totalPomodoros = 0, totalMinutes = 0, totalTasks = 0, totalTasksCompleted = 0;
  const categoryMinutes: Record<string, number> = {};
  const categoryPomodoros: Record<string, number> = {};

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
    return { date, minutes: mins, pomodoros: poms.length, tasksDone, totalTasks: totalTasksDay };
  });

  return { daily, totalPomodoros, totalMinutes, totalTasks, totalTasksCompleted, categoryMinutes, categoryPomodoros };
}

export function StatsOverview({ dayDataMap, todayPomodoros, categories, onAddTestData }: StatsOverviewProps) {
  const [period, setPeriod] = useState<Period>('week');
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

  const weekData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 7, today), [dayDataMap, todayPomodoros, today]);
  const monthData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 30, today), [dayDataMap, todayPomodoros, today]);

  const activeData = period === 'week' ? weekData : monthData;
  const isCompact = period === 'month';

  const handleTest = useCallback(() => { onAddTestData?.(genTestData()); }, [onAddTestData]);

  const maxMin = Math.max(...activeData.daily.map(d => d.minutes), 1);
  const dateRange = `${activeData.daily[0]?.date.slice(5)} ~ ${activeData.daily[activeData.daily.length - 1]?.date.slice(5)}`;
  const activeDays = activeData.daily.filter(d => d.pomodoros > 0).length;

  // Bar chart - minutes
  const barData = {
    labels: activeData.daily.map(d => d.date.slice(5)),
    datasets: [{
      label: '专注时长(分钟)',
      data: activeData.daily.map(d => d.minutes),
      backgroundColor: activeData.daily.map(d => d.date === today ? 'rgba(255,107,107,0.7)' : 'rgba(255,107,107,0.4)'),
      borderRadius: 6, maxBarThickness: isCompact ? 16 : 36,
    }],
  };
  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: unknown) => {
            const idx = (items as Array<{ dataIndex: number }>)[0]?.dataIndex;
            return activeData.daily[idx]?.date ?? '';
          },
          label: (ctx: unknown) => {
            const d = activeData.daily[(ctx as { dataIndex: number }).dataIndex];
            return [`🍅 ${d.pomodoros}个番茄 · ${d.minutes}分钟`, `✅ 完成 ${d.tasksDone} 个任务`];
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
          c.ctx.textAlign = 'center';
          // Pomodoro count
          c.ctx.font = `bold ${isCompact ? '8' : '11'}px system-ui`;
          c.ctx.fillStyle = d?.date === today ? '#FF6B6B' : 'rgba(255,107,107,0.8)';
          c.ctx.fillText(`🍅${d?.pomodoros}`, x, y - (isCompact ? 4 : 6));
          // Task count
          if (d?.tasksDone && d.tasksDone > 0) {
            c.ctx.font = `${isCompact ? '7' : '9'}px system-ui`;
            c.ctx.fillStyle = '#27ae60';
            c.ctx.fillText(`✅${d.tasksDone}`, x, y - (isCompact ? 13 : 18));
          }
          c.ctx.restore();
        });
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#999', font: { size: isCompact ? 7 : 10 }, maxRotation: isCompact ? 60 : 0 } },
      y: { beginAtZero: true, suggestedMax: maxMin * 1.3, grid: { color: 'var(--border)' }, ticks: { color: '#999', callback: (v: string | number) => `${v}m` } },
    },
  };

  // Pie chart
  const cats = Object.entries(activeData.categoryMinutes).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const pieData = cats.length > 0 ? {
    labels: cats.map(([k]) => k),
    datasets: [{ data: cats.map(([, v]) => v), backgroundColor: cats.map(([k]) => getCategoryColor(categories, k)), borderWidth: 2, borderColor: 'var(--bg-card)' }],
  } : null;
  const pieTotal = cats.reduce((s, [, m]) => s + m, 0);
  const pieOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '55%',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: unknown) => { const v = (ctx as { parsed: number }).parsed; const t = cats.reduce((s, [, m]) => s + m, 0); return ` ${v}分钟 (${Math.round(v / t * 100)}%)`; } } } },
  };

  // Report generators
  const generateWeekReport = useCallback(() => {
    const d = weekData;
    const lines = [`📊 周报 (${weekData.daily[0]?.date} ~ ${weekData.daily[6]?.date})`, ''];
    lines.push(`🍅 番茄: ${d.totalPomodoros}个`);
    lines.push(`⏱ 总时长: ${d.totalMinutes}分钟 (${(d.totalMinutes / 60).toFixed(1)}小时)`);
    lines.push(`✅ 完成任务: ${d.totalTasksCompleted}个`);
    lines.push(`📅 活跃天数: ${activeDays}/7`);
    lines.push(`📈 日均番茄: ${(d.totalPomodoros / 7).toFixed(1)}`);
    lines.push('');
    lines.push('--- 板块分布 ---');
    cats.forEach(([cat, mins]) => {
      const p = pieTotal > 0 ? Math.round(mins / pieTotal * 100) : 0;
      lines.push(`  ${cat}: ${mins}分钟 (${p}%)`);
    });
    lines.push('');
    lines.push('--- 每日明细 ---');
    d.daily.forEach(dd => {
      lines.push(`${dd.date}: 🍅${dd.pomodoros}个 ⏱${dd.minutes}m ✅${dd.tasksDone}个任务`);
    });
    navigator.clipboard.writeText(lines.join('\n'));
  }, [weekData, activeDays, cats, pieTotal]);

  const generateMonthReport = useCallback(() => {
    const d = monthData;
    const lines = [`📊 月报 (${monthData.daily[0]?.date} ~ ${monthData.daily[monthData.daily.length - 1]?.date})`, ''];
    lines.push(`🍅 番茄: ${d.totalPomodoros}个`);
    lines.push(`⏱ 总时长: ${d.totalMinutes}分钟 (${(d.totalMinutes / 60).toFixed(1)}小时)`);
    lines.push(`✅ 完成任务: ${d.totalTasksCompleted}个`);
    lines.push(`📅 活跃天数: ${activeDays}/30`);
    lines.push(`📈 日均番茄: ${(d.totalPomodoros / 30).toFixed(1)}`);
    lines.push(`📈 日均时长: ${Math.round(d.totalMinutes / 30)}分钟`);
    if (d.totalTasksCompleted > 0) lines.push(`📈 日均任务: ${(d.totalTasksCompleted / 30).toFixed(1)}个`);
    lines.push('');
    lines.push('--- 板块分布 ---');
    cats.forEach(([cat, mins]) => {
      const p = pieTotal > 0 ? Math.round(mins / pieTotal * 100) : 0;
      lines.push(`  ${cat}: ${mins}分钟 (${p}%)`);
    });
    navigator.clipboard.writeText(lines.join('\n'));
  }, [monthData, activeDays, cats, pieTotal]);

  return (
    <div className="stats-overview">
      {/* Today summary */}
      <div className="stats-top-row">
        <div className="stats-top-item accent"><span className="stats-top-val">{todayData.pomodoros}</span><span className="stats-top-label">🍅 今日番茄</span></div>
        <div className="stats-top-item"><span className="stats-top-val">{todayData.minutes}m</span><span className="stats-top-label">⏱ 今日时长</span></div>
        <div className="stats-top-item"><span className="stats-top-val">{todayData.tasksDone}</span><span className="stats-top-label">✅ 今日完成</span></div>
      </div>

      {/* Period toggle + report buttons */}
      <div className="stats-toolbar">
        <div className="stats-period-toggle">
          <button className={`period-btn ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>近七天</button>
          <button className={`period-btn ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>近一个月</button>
        </div>
        <div className="stats-report-btns">
          <button className="btn secondary small" onClick={generateWeekReport}>📋 周报</button>
          <button className="btn secondary small" onClick={generateMonthReport}>📋 月报</button>
        </div>
      </div>

      {/* Aggregate summary */}
      <div className="stats-aggregate-card">
        <div className="agg-item"><span className="agg-val">{activeData.totalPomodoros}</span><span className="agg-label">🍅 番茄</span></div>
        <div className="agg-item"><span className="agg-val">{activeData.totalMinutes}m</span><span className="agg-label">⏱ 时长</span></div>
        <div className="agg-item"><span className="agg-val">{activeData.totalTasksCompleted}</span><span className="agg-label">✅ 完成任务</span></div>
        <div className="agg-item"><span className="agg-val">{activeDays}/{activeData.daily.length}</span><span className="agg-label">📅 活跃天</span></div>
        {activeData.totalPomodoros > 0 && (
          <div className="agg-item"><span className="agg-val">{(activeData.totalPomodoros / activeData.daily.length).toFixed(1)}</span><span className="agg-label">📈 日均番茄</span></div>
        )}
      </div>

      {/* Bar chart */}
      <div className="stats-card-full">
        <div className="chart-header">
          <h4 className="chart-sub-title">{period === 'week' ? '近七天' : '近一个月'}每日数据</h4>
          <span className="stats-period-range">{dateRange}</span>
        </div>
        <div className="chart-wrapper-lg"><Bar data={barData} options={barOptions} /></div>
        <div className="chart-legend-hint">
          <span className="hint-item"><span className="hint-dot" style={{ background: '#FF6B6B' }} />🍅 番茄数</span>
          <span className="hint-item"><span className="hint-dot" style={{ background: '#27ae60' }} />✅ 完成任务数</span>
        </div>
      </div>

      {/* Pie chart */}
      <div className="stats-card-full">
        <h4 className="chart-sub-title">板块占比</h4>
        {pieData ? (
          <div className="pie-layout">
            <div className="chart-wrapper-pie"><Doughnut data={pieData} options={pieOptions} /></div>
            <div className="pie-legend">
              {cats.map(([cat, mins]) => (
                <div key={cat} className="pie-legend-item">
                  <span className="pie-dot" style={{ background: getCategoryColor(categories, cat) }} />
                  <span>{cat}</span>
                  <span className="pie-legend-val">{Math.round(mins / pieTotal * 100)}% ({mins}m)</span>
                </div>
              ))}
            </div>
          </div>
        ) : <div className="chart-empty">暂无数据</div>}
      </div>

      {activeData.totalPomodoros === 0 && (
        <button className="btn secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleTest}>🧪 注入测试数据</button>
      )}
    </div>
  );
}
