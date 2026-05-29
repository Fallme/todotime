import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { PomodoroRecord } from '../../types';
import { CATEGORY_COLORS } from '../../types';
import type { DayData } from '../../types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CategoryChartProps {
  dayDataMap: Map<string, DayData>;
  todayPomodoros: PomodoroRecord[];
}

export function CategoryChart({ dayDataMap, todayPomodoros }: CategoryChartProps) {
  // Aggregate minutes by category across all data
  const categoryMinutes: Record<string, number> = {};

  dayDataMap.forEach(data => {
    data.pomodoros.forEach(p => {
      categoryMinutes[p.category] = (categoryMinutes[p.category] || 0) + p.duration;
    });
  });

  todayPomodoros.forEach(p => {
    categoryMinutes[p.category] = (categoryMinutes[p.category] || 0) + p.duration;
  });

  const entries = Object.entries(categoryMinutes)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">分类专注</h3>
        <div className="chart-empty">暂无数据</div>
      </div>
    );
  }

  const total = entries.reduce((s, [, v]) => s + v, 0);

  const chartData = {
    labels: entries.map(([k]) => k),
    datasets: [{
      data: entries.map(([, v]) => v),
      backgroundColor: entries.map(([k]) => (CATEGORY_COLORS as Record<string, string>)[k] || '#636e72'),
      borderWidth: 2,
      borderColor: 'var(--bg-card)',
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: unknown) => {
            const parsed = (ctx as { parsed: number }).parsed;
            const pct = total > 0 ? Math.round(parsed / total * 100) : 0;
            return ` ${parsed}分钟 (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="chart-container">
      <h3 className="chart-title">分类专注</h3>
      <div className="category-chart-layout">
        <div className="category-chart-donut">
          <Doughnut data={chartData} options={options} />
        </div>
        <div className="category-chart-legend">
          {entries.map(([cat, mins]) => (
            <div key={cat} className="category-legend-item">
              <span className="category-legend-dot" style={{ background: (CATEGORY_COLORS as Record<string, string>)[cat] }} />
              <span className="category-legend-name">{cat}</span>
              <span className="category-legend-value">{mins}min</span>
              <span className="category-legend-pct">{total > 0 ? Math.round(mins / total * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
