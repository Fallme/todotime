import type { TimerMode } from '../../types';

interface TimerRingProps {
  timeLeft: number;
  totalTime: number;
  mode: TimerMode;
  isRunning: boolean;
  currentTaskName: string | null;
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

export function TimerRing({ timeLeft, totalTime, mode, currentTaskName }: TimerRingProps) {
  const R = 130, STROKE = 8, NR = R - STROKE / 2;
  const CIRC = NR * 2 * Math.PI;
  const progress = totalTime > 0 ? Math.max(0, Math.min(1, timeLeft / totalTime)) : 0;
  const offset = CIRC * (1 - progress);
  const color = MODE_COLORS[mode];
  const mm = String(Math.floor(Math.max(0, timeLeft) / 60)).padStart(2, '0');
  const ss = String(Math.max(0, timeLeft) % 60).padStart(2, '0');

  return (
    <div className="timer-ring-container">
      <svg height={R * 2} width={R * 2} className="timer-ring-svg">
        <circle stroke="var(--ring-bg)" fill="transparent" strokeWidth={STROKE} r={NR} cx={R} cy={R} />
        <circle stroke={color} fill="transparent" strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={offset}
          r={NR} cx={R} cy={R} className="timer-ring-progress"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.3s ease' }} />
      </svg>
      <div className="timer-ring-text">
        <div className="timer-time">{mm}:{ss}</div>
        {currentTaskName && <div className="timer-task-name">{currentTaskName}</div>}
        <div className="timer-mode-label" style={{ color }}>{MODE_LABELS[mode]}</div>
      </div>
    </div>
  );
}
