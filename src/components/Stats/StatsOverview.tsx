import { useMemo, useState, useCallback } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { CATEGORY_COLORS, type Category, type DayData, type PomodoroRecord } from '../../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type Period = 'day' | 'week' | 'month';

interface StatsOverviewProps {
  dayDataMap: Map<string, DayData>;
  todayPomodoros: PomodoroRecord[];
  onAddTestData?: (data: Map<string, DayData>) => void;
}

function genTestData(): Map<string, DayData> {
  const cats: Category[] = ['数学', 'AI', '英语', '物理', '嵌入式', '游戏', '音乐', '运动'];
  const tasks: Record<string, string[]> = {
    '数学': ['刷高数真题', '线性代数'], 'AI': ['学习Transformer', '调模型'],
    '英语': ['背单词', '阅读理解'], '物理': ['力学复习', '电磁学'],
    '嵌入式': ['STM32项目', 'RTOS'], '游戏': ['Unity开发', '算法'],
    '音乐': ['练琴', '乐理'], '运动': ['跑步', '健身'],
  };
  const map = new Map<string, DayData>();
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const count = Math.floor(Math.random() * 5) + 1;
    const pomodoros: PomodoroRecord[] = [];
    for (let j = 0; j < count; j++) {
      const cat = cats[Math.floor(Math.random() * cats.length)];
      const task = tasks[cat][Math.floor(Math.random() * tasks[cat].length)];
      pomodoros.push({ start: '', end: '', duration: 25, taskId: null, taskTitle: task, category: cat, completed: true });
    }
    map.set(date, { date, pomodoros, tasks: [], totalFocusMinutes: pomodoros.length * 25, totalPomodoros: pomodoros.length, totalTasksCompleted: 0, streak: 0 });
  }
  return map;
}

export function StatsOverview({ dayDataMap, todayPomodoros, onAddTestData }: StatsOverviewProps) {
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

    let totalPomodoros = 0;
    let totalMinutes = 0;
    let totalTasks = 0;
    let totalTasksCompleted = 0;
    const categoryMinutes: Record<string, number> = {};

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
      poms.forEach(p => { categoryMinutes[p.category] = (categoryMinutes[p.category] || 0) + p.duration; });
      return { date, minutes: mins, pomodoros: poms.length, tasksDone, totalTasks: totalTasksDay };
    });

    return { daily, totalPomodoros, totalMinutes, totalTasks, totalTasksCompleted, categoryMinutes };
  }, [dayDataMap, todayPomodoros, period, today]);

  // Selected day's category data for pie
  const selectedData = useMemo(() => {
    if (!selectedDate) return data.categoryMinutes;
    const dayData = dayDataMap.get(selectedDate);
    let poms = dayData?.pomodoros?.filter(p => p.completed) ?? [];
    if (selectedDate === today) {
      const existing = new Set(poms.map(p => `${p.start}-${p.end}`));
      poms = [...poms, ...todayPomodoros.filter(p => p.completed && !existing.has(`${p.start}-${p.end}`))];
    }
    const cats: Record<string, number> = {};
    poms.forEach(p => { cats[p.category] = (cats[p.category] || 0) + p.duration; });
    return cats;
  }, [selectedDate, dayDataMap, todayPomodoros, today, data.categoryMinutes]);

  const handleTest = useCallback(() => { onAddTestData?.(genTestData()); }, [onAddTestData]);

  const periodLabel = period === 'day' ? '今日' : period === 'week' ? '本周' : '本月';
  const maxMin = Math.max(...data.daily.map(d => d.minutes), 1);
  const completionRate = data.totalTasks > 0 ? Math.round(data.totalTasksCompleted / data.totalTasks * 100) : 0;

  // Bar chart
  const barData = {
    labels: data.daily.map(d => d.date.slice(5)),
    datasets: [{
      data: data.daily.map(d => d.minutes),
      backgroundColor: data.daily.map(d => {
        if (d.date === today && !selectedDate) return '#FF6B6B';
        if (d.date === selectedDate) return '#FF6B6B';
        if (d.date === today) return 'rgba(255,107,107,0.7)';
        return 'rgba(255,107,107,0.4)';
      }),
      borderRadius: 6, maxBarThickness: 36,
    }],
  };
  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    onClick: (_event: unknown, elements: Array<{ index: number }>) => {
      if (elements.length > 0) {
        const idx = elements[0].index;
        const clickedDate = data.daily[idx]?.date;
        setSelectedDate(prev => prev === clickedDate ? null : clickedDate);
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: unknown) => {
            const i = (ctx as { dataIndex: number }).dataIndex;
            const d = data.daily[i];
            return ` 🍅${d.pomodoros}个 · ${d.minutes}分钟`;
          },
        },
      },
      // Custom: draw pomodoro count above bars
      afterDatasetsDraw: (chart: unknown) => {
        const c = chart as { ctx: CanvasRenderingContext2D; data: typeof barData; scales: { x: { getPixelForValue: (v: number) => number }; y: { getPixelForValue: (v: number) => number } } };
        if (!c?.scales?.x || !c?.scales?.y) return;
        c.data.datasets[0].data.forEach((val: number, i: number) => {
          if (val === 0) return;
          const x = c.scales.x.getPixelForValue(i);
          const y = c.scales.y.getPixelForValue(val);
          c.ctx.save();
          c.ctx.font = 'bold 11px system-ui';
          c.ctx.fillStyle = data.daily[i]?.date === selectedDate ? '#FF6B6B' : 'rgba(255,107,107,0.8)';
          c.ctx.textAlign = 'center';
          c.ctx.fillText(`🍅${data.daily[i]?.pomodoros}`, x, y - 6);
          c.ctx.restore();
        });
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#999', font: { size: 10 } } },
      y: { beginAtZero: true, suggestedMax: maxMin * 1.3, grid: { color: 'var(--border)' }, ticks: { color: '#999', callback: (v: string | number) => `${v}m` } },
    },
  };

  // Pie chart from selected day or all days
  const cats = Object.entries(selectedData).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const pieData = cats.length > 0 ? {
    labels: cats.map(([k]) => k),
    datasets: [{
      data: cats.map(([, v]) => v),
      backgroundColor: cats.map(([k]) => (CATEGORY_COLORS as Record<string, string>)[k] || '#636e72'),
      borderWidth: 3, borderColor: 'var(--bg-card)',
    }],
  } : null;
  const pieOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '55%',
    plugins: { legend: { display: false },
      tooltip: { callbacks: { label: (ctx: unknown) => { const v = (ctx as { parsed: number }).parsed; const t = cats.reduce((s, [, m]) => s + m, 0); return ` ${v}分钟 (${Math.round(v / t * 100)}%)`; } } },
    },
  };

  const pieTotal = cats.reduce((s, [, m]) => s + m, 0);

  return (
    <div className="stats-overview">
      {/* Top summary */}
      <div className="stats-top-row">
        <div className="stats-top-item accent">
          <span className="stats-top-val">{data.totalPomodoros}</span>
          <span className="stats-top-label">🍅 番茄</span>
        </div>
        <div className="stats-top-item">
          <span className="stats-top-val">{data.totalMinutes}m</span>
          <span className="stats-top-label">⏱ 时长</span>
        </div>
        <div className="stats-top-item">
          <span className="stats-top-val">{completionRate}%</span>
          <span className="stats-top-label">✅ 完成率({data.totalTasksCompleted}/{data.totalTasks})</span>
        </div>
        <div className="stats-period-toggle">
          <button className={`period-btn ${period === 'day' ? 'active' : ''}`} onClick={() => { setPeriod('day'); setSelectedDate(null); }}>日</button>
          <button className={`period-btn ${period === 'week' ? 'active' : ''}`} onClick={() => { setPeriod('week'); setSelectedDate(null); }}>周</button>
          <button className={`period-btn ${period === 'month' ? 'active' : ''}`} onClick={() => { setPeriod('month'); setSelectedDate(null); }}>月</button>
        </div>
      </div>

      {/* Bar chart */}
      <div className="stats-card-full">
        <div className="chart-header">
          <h4 className="chart-sub-title">{selectedDate ? `${selectedDate.slice(5)} 数据` : `${periodLabel}每日数据`}</h4>
          {selectedDate && <button className="chart-reset-btn" onClick={() => setSelectedDate(null)}>返回全部</button>}
        </div>
        <div className="chart-wrapper-lg"><Bar data={barData} options={barOptions} /></div>
      </div>

      {/* Pie chart */}
      <div className="stats-card-full">
        <h4 className="chart-sub-title">{selectedDate ? `${selectedDate.slice(5)} 板块占比` : '板块占比'}</h4>
        {pieData ? (
          <div className="pie-layout">
            <div className="chart-wrapper-pie"><Doughnut data={pieData} options={pieOptions} /></div>
            <div className="pie-legend">
              {cats.map(([cat, mins]) => (
                <div key={cat} className="pie-legend-item">
                  <span className="pie-dot" style={{ background: (CATEGORY_COLORS as Record<string, string>)[cat] }} />
                  <span>{cat}</span>
                  <span className="pie-legend-val">{Math.round(mins / pieTotal * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : <div className="chart-empty">暂无数据</div>}
      </div>

      {data.totalPomodoros === 0 && (
        <button className="btn secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleTest}>🧪 注入测试数据</button>
      )}
    </div>
  );
}
