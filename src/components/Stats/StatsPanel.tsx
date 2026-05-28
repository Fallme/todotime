import { Flame, Clock, CheckCircle2, Target } from 'lucide-react';
import type { UseStatsReturn } from '../../hooks/useStats';
import { formatDuration } from '../../utils/dateUtils';

interface StatsPanelProps {
  stats: UseStatsReturn;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="stats-cards">
      <div className="stat-card accent">
        <Target size={24} />
        <div className="stat-value">{stats.todayPomodoros}</div>
        <div className="stat-label">今日番茄</div>
      </div>
      <div className="stat-card">
        <Clock size={24} />
        <div className="stat-value">{formatDuration(stats.todayFocusMinutes)}</div>
        <div className="stat-label">今日专注</div>
      </div>
      <div className="stat-card">
        <CheckCircle2 size={24} />
        <div className="stat-value">{stats.todayTasksCompleted}</div>
        <div className="stat-label">完成任务</div>
      </div>
      <div className="stat-card fire">
        <Flame size={24} />
        <div className="stat-value">{stats.streak}天</div>
        <div className="stat-label">连续打卡</div>
      </div>
    </div>
  );
}
