import type { TimerMode } from '../../types';

interface TimerRingProps {
  timeLeft: number;
  totalTime: number;
  mode: TimerMode;
}

const MODE_COLORS: Record<TimerMode, string> = {
  work: '#FF6B6B',
  shortBreak: '#48DBFB',
  longBreak: '#FECA57',
};

const MODE_LABELS: Record<TimerMode, string> = {
  work: '专注中',
  shortBreak: '短休息',
  longBreak: '长休息',
};

export function TimerRing({ timeLeft, totalTime, mode }: TimerRingProps) {
  const radius = 120;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const offset = circumference - progress * circumference;
  const color = MODE_COLORS[mode];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="timer-ring-container">
      <svg height={radius * 2} width={radius * 2} className="timer-ring-svg">
        <circle
          stroke="var(--ring-bg)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="timer-ring-progress"
        />
      </svg>
      <div className="timer-ring-text">
        <div className="timer-time">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <div className="timer-mode-label" style={{ color }}>
          {MODE_LABELS[mode]}
        </div>
      </div>
    </div>
  );
}
