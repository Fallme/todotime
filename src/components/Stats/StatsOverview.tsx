import { useMemo, useCallback } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { getCategoryColor, type Category, type CategoryItem, type DayData, type PomodoroRecord } from '../../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

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
    const count = Math.floor(Math.random() * 6) + 1;
    const pomodoros: PomodoroRecord[] = [];
    for (let j = 0; j < count; j++) {
      const cat = cats[Math.floor(Math.random() * cats.length)];
      const task = tasks[cat][Math.floor(Math.random() * tasks[cat].length)];
      pomodoros.push({ start: '', end: '', duration: 25, taskId: null, taskTitle: task, category: cat, completed: true, createdAt: '' });
    }
    map.set(date, { date, pomodoros, tasks: [], totalFocusMinutes: pomodoros.length * 25, totalPomodoros: pomodoros.length, totalTasksCompleted: 0, streak: 0 });
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
  const today = new Date().toISOString().slice(0, 10);

  // Compute today's data
  const todayData = useMemo(() => {
    const dayData = dayDataMap.get(today);
    let poms = dayData?.pomodoros?.filter(p => p.completed) ?? [];
    const existing = new Set(poms.map(p => `${p.start}-${p.end}`));
    poms = [...poms, ...todayPomodoros.filter(p => p.completed && !existing.has(`${p.start}-${p.end}`))];
    const mins = poms.reduce((s, p) => s + p.duration, 0);
    return { pomodoros: poms.length, minutes: mins };
  }, [dayDataMap, todayPomodoros, today]);

  // 7-day data
  const weekData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 7, today), [dayDataMap, todayPomodoros, today]);
  // 30-day data
  const monthData = useMemo(() => computePeriodData(dayDataMap, todayPomodoros, 30, today), [dayDataMap, todayPomodoros, today]);

  const handleTest = useCallback(() => { onAddTestData?.(genTestData()); }, [onAddTestData]);

  const renderSection = (label: string, data: ReturnType<typeof computePeriodData>, barHeight: number, isCompact: boolean) => {
    const maxMin = Math.max(...data.daily.map(d => d.minutes), 1);

    const barData = {
      labels: data.daily.map(d => d.date.slice(5)),
      datasets: [{
        data: data.daily.map(d => d.minutes),
        backgroundColor: data.daily.map(d => d.date === today ? 'rgba(255,107,107,0.7)' : 'rgba(255,107,107,0.4)'),
        borderRadius: 6, maxBarThickness: isCompact ? 14 : 36,
      }],
    };
    const barOptions = {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx: unknown) => { const d = data.daily[(ctx as { dataIndex: number }).dataIndex]; return ` 🍅${d.pomodoros}个 · ${d.minutes}分钟`; } } },
        afterDatasetsDraw: (chart: unknown) => {
          const c = chart as { ctx: CanvasRenderingContext2D; data: typeof barData; scales: { x: { getPixelForValue: (v: number) => number }; y: { getPixelForValue: (v: number) => number } } };
          if (!c?.scales?.x || !c?.scales?.y) return;
          c.data.datasets[0].data.forEach((val: number, i: number) => {
            if (val === 0) return;
            const x = c.scales.x.getPixelForValue(i);
            const y = c.scales.y.getPixelForValue(val);
            c.ctx.save();
            c.ctx.font = `bold ${isCompact ? '8' : '11'}px system-ui`;
            c.ctx.fillStyle = data.daily[i]?.date === today ? '#FF6B6B' : 'rgba(255,107,107,0.8)';
            c.ctx.textAlign = 'center';
            c.ctx.fillText(`${data.daily[i]?.pomodoros}`, x, y - 5);
            c.ctx.restore();
          });
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#999', font: { size: isCompact ? 7 : 10 }, maxRotation: isCompact ? 60 : 0 } },
        y: { beginAtZero: true, suggestedMax: maxMin * 1.3, grid: { color: 'var(--border)' }, ticks: { color: '#999', callback: (v: string | number) => `${v}m` } },
      },
    };

    const cats = Object.entries(data.categoryMinutes).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const pieData = cats.length > 0 ? {
      labels: cats.map(([k]) => k),
      datasets: [{ data: cats.map(([, v]) => v), backgroundColor: cats.map(([k]) => getCategoryColor(categories, k)), borderWidth: 2, borderColor: 'var(--bg-card)' }],
    } : null;
    const pieTotal = cats.reduce((s, [, m]) => s + m, 0);
    const pieOptions = {
      responsive: true, maintainAspectRatio: false, cutout: '55%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: unknown) => { const v = (ctx as { parsed: number }).parsed; const t = cats.reduce((s, [, m]) => s + m, 0); return ` ${v}分钟 (${Math.round(v / t * 100)}%)`; } } } },
    };

    const activeDays = data.daily.filter(d => d.pomodoros > 0).length;
    const dateRange = `${data.daily[0]?.date.slice(5)} ~ ${data.daily[data.daily.length - 1]?.date.slice(5)}`;

    return (
      <div className="stats-period-section">
        <div className="stats-period-header">
          <h3 className="stats-period-title">{label}</h3>
          <span className="stats-period-range">{dateRange}</span>
          <span className="stats-period-summary">🍅 {data.totalPomodoros}个 · {data.totalMinutes}分钟 · 活跃{activeDays}/{data.daily.length}天</span>
        </div>

        {/* Bar chart */}
        <div className="stats-card-full">
          <div className="chart-wrapper-lg" style={{ height: barHeight }}><Bar data={barData} options={barOptions} /></div>
        </div>

        {/* Pie + legend */}
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
      </div>
    );
  };

  return (
    <div className="stats-overview">
      {/* Today summary */}
      <div className="stats-top-row">
        <div className="stats-top-item accent"><span className="stats-top-val">{todayData.pomodoros}</span><span className="stats-top-label">🍅 今日番茄</span></div>
        <div className="stats-top-item"><span className="stats-top-val">{todayData.minutes}m</span><span className="stats-top-label">⏱ 今日时长</span></div>
        <div className="stats-top-item"><span className="stats-top-val">{weekData.totalPomodoros}</span><span className="stats-top-label">📊 近7天番茄</span></div>
        <div className="stats-top-item"><span className="stats-top-val">{monthData.totalPomodoros}</span><span className="stats-top-label">📊 近30天番茄</span></div>
      </div>

      {/* 7-day section */}
      {renderSection('近七天', weekData, 200, false)}

      {/* 30-day section */}
      {renderSection('近一个月', monthData, 180, true)}

      {/* Copy report */}
      {monthData.totalPomodoros > 0 && (
        <button className="btn secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => {
          const lines = [`📊 近七天总结`, `🍅 ${weekData.totalPomodoros}个 · ${weekData.totalMinutes}分钟`, ''];
          lines.push(`📊 近一个月总结`, `🍅 ${monthData.totalPomodoros}个 · ${monthData.totalMinutes}分钟`, '');
          Object.entries(weekData.categoryMinutes).forEach(([c, m]) => lines.push(`  ${c}: ${m}m`));
          navigator.clipboard.writeText(lines.join('\n'));
        }}>📋 复制报告</button>
      )}

      {weekData.totalPomodoros === 0 && monthData.totalPomodoros === 0 && (
        <button className="btn secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleTest}>🧪 注入测试数据</button>
      )}
    </div>
  );
}
