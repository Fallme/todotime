import { useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { CATEGORY_COLORS } from '../../types';
import type { DayData } from '../../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

interface StatsOverviewProps {
  dayDataMap: Map<string, DayData>;
}

export function StatsOverview({ dayDataMap }: StatsOverviewProps) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const data = useMemo(() => {
    const now = new Date();
    const count = period === 'week' ? 7 : 30;
    const days: string[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    let totalPomodoros = 0;
    let totalMinutes = 0;
    const categoryMinutes: Record<string, number> = {};

    const daily = days.map(date => {
      const dayData = dayDataMap.get(date);
      const poms = dayData?.pomodoros?.filter(p => p.completed) ?? [];
      const mins = poms.reduce((s, p) => s + p.duration, 0);
      totalPomodoros += poms.length;
      totalMinutes += mins;
      poms.forEach(p => {
        categoryMinutes[p.category] = (categoryMinutes[p.category] || 0) + p.duration;
      });
      return { date, minutes: mins, pomodoros: poms.length };
    });

    return { daily, totalPomodoros, totalMinutes, categoryMinutes };
  }, [dayDataMap, period]);

  // Bar chart
  const barData = {
    labels: data.daily.map(d => d.date.slice(5)),
    datasets: [{
      data: data.daily.map(d => d.minutes),
      backgroundColor: 'rgba(255, 107, 107, 0.7)',
      borderRadius: 4,
      maxBarThickness: 20,
    }],
  };
  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: unknown) => `${(ctx as { parsed: { y: number } }).parsed.y} 分钟` } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#999', font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: 'var(--border)' }, ticks: { color: '#999', callback: (v: string | number) => `${v}m` } },
    },
  };

  // Pie chart
  const cats = Object.entries(data.categoryMinutes).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const pieData = {
    labels: cats.map(([k]) => k),
    datasets: [{
      data: cats.map(([, v]) => v),
      backgroundColor: cats.map(([k]) => (CATEGORY_COLORS as Record<string, string>)[k] || '#636e72'),
      borderWidth: 2, borderColor: 'var(--bg-card)',
    }],
  };
  const pieOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: unknown) => { const v = (ctx as { parsed: number }).parsed; const total = cats.reduce((s, [, m]) => s + m, 0); return ` ${v}分钟 (${Math.round(v / total * 100)}%)`; } } },
    },
  };

  const reportText = useMemo(() => {
    const lines = [`📊 ${period === 'week' ? '周报' : '月报'}`, ''];
    lines.push(`🍅 番茄: ${data.totalPomodoros}`);
    lines.push(`⏱ 专注: ${data.totalMinutes}分钟 (${(data.totalMinutes / 60).toFixed(1)}h)`);
    lines.push('');
    cats.forEach(([cat, mins]) => lines.push(`  ${cat}: ${mins}分钟`));
    return lines.join('\n');
  }, [data, period, cats]);

  return (
    <div className="stats-overview">
      {/* Top: summary numbers */}
      <div className="stats-top-row">
        <div className="stats-top-item accent">
          <span className="stats-top-val">{data.totalPomodoros}</span>
          <span className="stats-top-label">🍅 番茄</span>
        </div>
        <div className="stats-top-item">
          <span className="stats-top-val">{(data.totalMinutes / 60).toFixed(1)}h</span>
          <span className="stats-top-label">⏱ 时长</span>
        </div>
        <div className="stats-period-toggle">
          <button className={`period-btn ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>周</button>
          <button className={`period-btn ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>月</button>
        </div>
      </div>

      {/* Middle: bar chart left + pie chart right */}
      <div className="stats-charts-row">
        <div className="stats-chart-left">
          <h4 className="chart-sub-title">每日时长</h4>
          <div className="chart-wrapper-sm"><Bar data={barData} options={barOptions} /></div>
        </div>
        <div className="stats-chart-right">
          <h4 className="chart-sub-title">类别占比</h4>
          {cats.length > 0 ? (
            <>
              <div className="chart-wrapper-pie"><Doughnut data={pieData} options={pieOptions} /></div>
              <div className="pie-legend">
                {cats.map(([cat, mins]) => (
                  <div key={cat} className="pie-legend-item">
                    <span className="pie-dot" style={{ background: (CATEGORY_COLORS as Record<string, string>)[cat] }} />
                    <span>{cat}</span>
                    <span className="pie-legend-val">{mins}m</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="chart-empty">暂无数据</div>
          )}
        </div>
      </div>

      {/* Bottom: copy report */}
      <button className="btn secondary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
        onClick={() => navigator.clipboard.writeText(reportText)}>
        📋 复制报告
      </button>
    </div>
  );
}
