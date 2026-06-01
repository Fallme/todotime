import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { getCategoryColor, type CategoryItem, type PomodoroRecord, type DayData } from '../../types';
ChartJS.register(ArcElement, Tooltip, Legend);

interface Props { dayDataMap: Map<string, DayData>; todayPomodoros: PomodoroRecord[]; categories: CategoryItem[]; }

export function CategoryChart({ dayDataMap, todayPomodoros, categories }: Props) {
  const catMin: Record<string, number> = {};
  dayDataMap.forEach(d => d.pomodoros.forEach(p => { catMin[p.category] = (catMin[p.category] || 0) + p.duration; }));
  todayPomodoros.forEach(p => { catMin[p.category] = (catMin[p.category] || 0) + p.duration; });
  const entries = Object.entries(catMin).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <div className="chart-container"><h3 className="chart-title">分类专注</h3><div className="chart-empty">暂无数据</div></div>;
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const data = { labels: entries.map(([k]) => k), datasets: [{ data: entries.map(([, v]) => v), backgroundColor: entries.map(([k]) => getCategoryColor(categories, k)), borderWidth: 2, borderColor: 'var(--bg-card)' }] };
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: unknown) => { const v = (ctx as { parsed: number }).parsed; return ` ${v}分钟 (${Math.round(v / total * 100)}%)`; } } } } };
  return (
    <div className="chart-container">
      <h3 className="chart-title">分类专注</h3>
      <div className="category-chart-layout">
        <div className="category-chart-donut"><Doughnut data={data} options={options} /></div>
        <div className="category-chart-legend">
          {entries.map(([cat, mins]) => (
            <div key={cat} className="category-legend-item">
              <span className="category-legend-dot" style={{ background: getCategoryColor(categories, cat) }} />
              <span>{cat}</span><span className="category-legend-value">{mins}min</span>
              <span className="category-legend-pct">{total > 0 ? Math.round(mins / total * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
