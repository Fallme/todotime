import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';
import { getWeekDayShort } from '../../utils/dateUtils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

interface WeeklyChartProps {
  data: { date: string; minutes: number }[];
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  const chartData = {
    labels: data.map(d => getWeekDayShort(d.date)),
    datasets: [
      {
        data: data.map(d => d.minutes),
        backgroundColor: data.map((_, i) =>
          i === data.length - 1 ? '#FF6B6B' : 'rgba(255, 107, 107, 0.4)'
        ),
        borderRadius: 6,
        borderSkipped: false as const,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: unknown) => {
            const parsed = (ctx as { parsed: { y: number | null } }).parsed;
            return `${parsed?.y ?? 0} 分钟`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'var(--text-secondary)' },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'var(--border)' },
        ticks: {
          color: 'var(--text-secondary)',
          callback: (v: string | number) => `${v}m`,
        },
      },
    },
  };

  return (
    <div className="chart-container">
      <h3 className="chart-title">本周专注</h3>
      <div className="chart-wrapper">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
