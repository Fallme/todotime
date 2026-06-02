import { useMemo, useState, useCallback } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { getCategoryColor, type Category, type CategoryItem, type DayData, type PomodoroRecord } from '../../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type Period = 'day' | 'week' | 'month';

interface StatsOverviewProps {
  dayDataMap: Map<string, DayData>;
  todayPomodoros: PomodoroRecord[];
  categories: CategoryItem[];
  onAddTestData?: (data: Map<string, DayData>) => void;
}

function genTestData(): Map<string, DayData> {
  const cats: Category[] = ['数学', '英语', '专业课', '政治', '运动', '绘画', '开发'];
  const tasks: Record<string, string[]> = {
    '数学': ['刷高数真题', '线性代数'], '英语': ['背单词', '阅读理解'],
    '专业课': ['数据结构', '操作系统'], '政治': ['马原复习', '肖四'],
    '运动': ['跑步', '健身'], '绘画': ['素描练习', '色彩'],
    '开发': ['React项目', '算法题'],
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

export function StatsOverview({ dayDataMap, todayPomodoros, categories, onAddTestData }: StatsOverviewProps) {
  const [period, setPeriod] = useState<Period>('week');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const data = useMemo(() => {
    const now = new Date();
    const count = period === 'day' ? 1 : period === 'week' ? 7 : 30;
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
  }, [dayDataMap, todayPomodoros, period, today]);

  const aggregates = useMemo(() => {
    const activeDays = data.daily.filter(d => d.pomodoros > 0).length;
    const avgDaily = data.daily.length > 0 ? (data.totalPomodoros / data.daily.length).toFixed(1) : '0';
    const bestDay = data.daily.reduce((best, d) => d.minutes > best.minutes ? d : best, data.daily[0] || { date: '', minutes: 0 });
    const avgMinutes = data.daily.length > 0 ? Math.round(data.totalMinutes / data.daily.length) : 0;
    const topCat = Object.entries(data.categoryMinutes).sort((a, b) => b[1] - a[1])[0];
    const topCatPomos = topCat ? (data.categoryPomodoros[topCat[0]] || 0) : 0;
    return { activeDays, avgDaily, bestDay, avgMinutes, topCat, topCatPomos };
  }, [data]);

  const handleTest = useCallback(() => { onAddTestData?.(genTestData()); }, [onAddTestData]);

  const periodLabel = period === 'day' ? '今日' : period === 'week' ? '本周' : '本月';
  const dateRange = `${data.daily[0]?.date.slice(5)} ~ ${data.daily[data.daily.length - 1]?.date.slice(5)}`;
  const maxMin = Math.max(...data.daily.map(d => d.minutes), 1);
  const completionRate = data.totalTasks > 0 ? Math.round(data.totalTasksCompleted / data.totalTasks * 100) : 0;

  // Bar chart
  const barData = {
    labels: data.daily.map(d => d.date.slice(5)),
    datasets: [{
      data: data.daily.map(d => d.minutes),
      backgroundColor: data.daily.map(d => d.date === selectedDate ? '#FF6B6B' : d.date === today ? 'rgba(255,107,107,0.7)' : 'rgba(255,107,107,0.4)'),
      borderRadius: 6, maxBarThickness: period === 'month' ? 16 : 36,
    }],
  };
  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    onClick: (_e: unknown, els: Array<{ index: number }>) => {
      if (els.length > 0) {
        const d = data.daily[els[0].index]?.date;
        setSelectedDate(prev => prev === d ? null : d);
      }
    },
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
          c.ctx.font = `bold ${period === 'month' ? '9' : '11'}px system-ui`;
          c.ctx.fillStyle = data.daily[i]?.date === selectedDate ? '#FF6B6B' : 'rgba(255,107,107,0.8)';
          c.ctx.textAlign = 'center';
          c.ctx.fillText(`${data.daily[i]?.pomodoros}`, x, y - 5);
          c.ctx.restore();
        });
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#999', font: { size: period === 'month' ? 8 : 10 }, maxRotation: period === 'month' ? 45 : 0 } },
      y: { beginAtZero: true, suggestedMax: maxMin * 1.3, grid: { color: 'var(--border)' }, ticks: { color: '#999', callback: (v: string | number) => `${v}m` } },
    },
  };

  // Pie chart
  const cats = Object.entries(selectedDate
    ? data.daily.find(d => d.date === selectedDate)
      ? (() => {
          const dayData = dayDataMap.get(selectedDate!);
          let poms = dayData?.pomodoros?.filter(p => p.completed) ?? [];
          if (selectedDate === today) {
            const existing = new Set(poms.map(p => `${p.start}-${p.end}`));
            poms = [...poms, ...todayPomodoros.filter(p => p.completed && !existing.has(`${p.start}-${p.end}`))];
          }
          const m: Record<string, number> = {};
          poms.forEach(p => { m[p.category] = (m[p.category] || 0) + p.duration; });
          return m;
        })()
      : {}
    : data.categoryMinutes
  ).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

  const pieData = cats.length > 0 ? {
    labels: cats.map(([k]) => k),
    datasets: [{ data: cats.map(([, v]) => v), backgroundColor: cats.map(([k]) => getCategoryColor(categories, k)), borderWidth: 3, borderColor: 'var(--bg-card)' }],
  } : null;
  const pieOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '55%',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: unknown) => { const v = (ctx as { parsed: number }).parsed; const t = cats.reduce((s, [, m]) => s + m, 0); return ` ${v}分钟 (${Math.round(v / t * 100)}%)`; } } } },
  };
  const pieTotal = cats.reduce((s, [, m]) => s + m, 0);

  // Copy report
  const reportText = useMemo(() => {
    const lines = [`📊 ${periodLabel}总结 (${dateRange})`, ''];
    lines.push(`🍅 番茄: ${data.totalPomodoros} 个`);
    lines.push(`⏱ 总时长: ${data.totalMinutes}分钟 (${(data.totalMinutes / 60).toFixed(1)}小时)`);
    lines.push(`✅ 完成任务: ${data.totalTasksCompleted}/${data.totalTasks} (${completionRate}%)`);
    if (period !== 'day') {
      lines.push(`📊 活跃天数: ${aggregates.activeDays}/${data.daily.length}`);
      lines.push(`📈 日均番茄: ${aggregates.avgDaily}  日均时长: ${aggregates.avgMinutes}m`);
      if (aggregates.topCat) lines.push(`🏆 最常学习: ${aggregates.topCat[0]} (${aggregates.topCat[1]}分钟)`);
    }
    lines.push('');
    lines.push('--- 板块分布 ---');
    cats.forEach(([cat, mins]) => {
      const p = pieTotal > 0 ? Math.round(mins / pieTotal * 100) : 0;
      lines.push(`  ${cat}: ${mins}分钟 (${p}%)`);
    });
    lines.push('');
    lines.push('--- 每日明细 ---');
    data.daily.forEach(d => {
      if (d.pomodoros > 0) {
        lines.push(`${d.date}: 🍅${d.pomodoros} ⏱${d.minutes}m`);
      }
    });
    return lines.join('\n');
  }, [period, dateRange, data, aggregates, cats, pieTotal, completionRate, periodLabel]);

  const copyReport = () => { navigator.clipboard.writeText(reportText); };

  return (
    <div className="stats-overview">
      {/* Summary */}
      <div className="stats-top-row">
        <div className="stats-top-item accent"><span className="stats-top-val">{data.totalPomodoros}</span><span className="stats-top-label">🍅 番茄</span></div>
        <div className="stats-top-item"><span className="stats-top-val">{data.totalMinutes}m</span><span className="stats-top-label">⏱ 时长</span></div>
        <div className="stats-top-item"><span className="stats-top-val">{completionRate}%</span><span className="stats-top-label">✅ 完成率({data.totalTasksCompleted}/{data.totalTasks})</span></div>
        <div className="stats-period-toggle">
          <button className={`period-btn ${period === 'day' ? 'active' : ''}`} onClick={() => { setPeriod('day'); setSelectedDate(null); }}>日</button>
          <button className={`period-btn ${period === 'week' ? 'active' : ''}`} onClick={() => { setPeriod('week'); setSelectedDate(null); }}>周</button>
          <button className={`period-btn ${period === 'month' ? 'active' : ''}`} onClick={() => { setPeriod('month'); setSelectedDate(null); }}>月</button>
        </div>
      </div>

      {/* Aggregate summary for week/month */}
      {period !== 'day' && (
        <div className="stats-aggregate-card">
          <div className="agg-item"><span className="agg-val">{aggregates.activeDays}/{data.daily.length}</span><span className="agg-label">活跃天数</span></div>
          <div className="agg-item"><span className="agg-val">🍅{aggregates.avgDaily}/天</span><span className="agg-label">日均番茄</span></div>
          <div className="agg-item"><span className="agg-val">{aggregates.avgMinutes}m/天</span><span className="agg-label">日均时长</span></div>
          {aggregates.topCat && <div className="agg-item"><span className="agg-val" style={{ color: getCategoryColor(categories, aggregates.topCat[0]) }}>{aggregates.topCat[0]}</span><span className="agg-label">最常学习({aggregates.topCatPomos}个🍅)</span></div>}
          {aggregates.bestDay.minutes > 0 && <div className="agg-item"><span className="agg-val">{aggregates.bestDay.date.slice(5)}</span><span className="agg-label">最佳({aggregates.bestDay.minutes}m)</span></div>}
        </div>
      )}

      {/* Bar chart */}
      <div className="stats-card-full">
        <div className="chart-header">
          <h4 className="chart-sub-title">{selectedDate ? `${selectedDate} 数据` : `${periodLabel}每日数据`}</h4>
          {selectedDate && <button className="chart-reset-btn" onClick={() => setSelectedDate(null)}>返回全部</button>}
        </div>
        <div className="chart-wrapper-lg"><Bar data={barData} options={barOptions} /></div>
      </div>

      {/* Pie chart */}
      <div className="stats-card-full">
        <h4 className="chart-sub-title">{selectedDate ? `${selectedDate.slice(5)} 板块占比` : `${periodLabel}板块占比`}</h4>
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

      {/* Copy report */}
      {data.totalPomodoros > 0 && (
        <button className="btn secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={copyReport}>📋 复制{periodLabel}报告</button>
      )}

      {data.totalPomodoros === 0 && (
        <button className="btn secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleTest}>🧪 注入测试数据</button>
      )}
    </div>
  );
}
