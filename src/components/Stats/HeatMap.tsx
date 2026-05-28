import { useMemo } from 'react';

interface HeatMapProps {
  data: { date: string; minutes: number }[];
}

const LEVELS = [0, 15, 45, 90, 150]; // minutes thresholds

function getLevel(minutes: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (minutes >= LEVELS[i]) return i;
  }
  return 0;
}

export function HeatMap({ data }: HeatMapProps) {
  const cells = useMemo(() => {
    return data.map(d => ({
      date: d.date,
      day: Number(d.date.slice(8, 10)),
      level: getLevel(d.minutes),
      minutes: d.minutes,
    }));
  }, [data]);

  const year = data[0]?.date.slice(0, 4) || '';
  const month = data[0]?.date.slice(5, 7) || '';

  return (
    <div className="chart-container">
      <h3 className="chart-title">{year}年{Number(month)}月打卡</h3>
      <div className="heatmap-grid">
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`heatmap-cell level-${cell.level}`}
            title={`${cell.date}: ${cell.minutes}分钟`}
          >
            {cell.day}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>少</span>
        {[0, 1, 2, 3, 4].map(l => (
          <div key={l} className={`heatmap-cell level-${l}`} />
        ))}
        <span>多</span>
      </div>
    </div>
  );
}
