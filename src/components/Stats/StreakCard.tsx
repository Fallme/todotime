import { Flame } from 'lucide-react';

interface StreakCardProps {
  streak: number;
  totalPomodoros: number;
  totalFocusHours: number;
}

export function StreakCard({ streak, totalPomodoros, totalFocusHours }: StreakCardProps) {
  return (
    <div className="streak-card">
      <div className="streak-main">
        <Flame size={32} className="streak-icon" />
        <div>
          <div className="streak-number">{streak}</div>
          <div className="streak-label">天连续打卡</div>
        </div>
      </div>
      <div className="streak-stats">
        <div className="streak-stat">
          <span className="streak-stat-value">{totalPomodoros}</span>
          <span className="streak-stat-label">累计番茄</span>
        </div>
        <div className="streak-stat">
          <span className="streak-stat-value">{totalFocusHours}h</span>
          <span className="streak-stat-label">累计专注</span>
        </div>
      </div>
    </div>
  );
}
