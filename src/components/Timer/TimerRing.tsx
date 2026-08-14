import type { TimerMode, Category } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { getElapsedProgress, getTimerEndpoint } from '../../utils/timerGeometry';

interface TimerRingProps {
  timeLeft: number;
  totalTime: number;
  mode: TimerMode;
  isRunning: boolean;
  currentTaskName: string | null;
  currentCategory: Category | null;
  onClick?: () => void;
}

const MODE_COLORS: Record<TimerMode, string> = {
  work: 'var(--accent)',
  shortBreak: 'var(--blue)',
  longBreak: 'var(--yellow)',
};

export function TimerRing({ timeLeft, totalTime, mode, isRunning, currentTaskName, currentCategory, onClick }: TimerRingProps) {
  const { t } = useLanguage();
  const R = 130, STROKE = 8, NR = R - STROKE / 2;
  const CIRC = NR * 2 * Math.PI;
  const progress = getElapsedProgress(timeLeft, totalTime);
  const offset = CIRC * (1 - progress);
  const color = MODE_COLORS[mode];
  const endpoint = getTimerEndpoint(progress, NR, R);
  const mm = String(Math.floor(Math.max(0, timeLeft) / 60)).padStart(2, '0');
  const ss = String(Math.max(0, timeLeft) % 60).padStart(2, '0');

  const label = isRunning ? t(mode === 'work' ? 'focusing' : mode === 'shortBreak' ? 'shortBreak' : 'longBreak') : t('paused');

  return (
    <div
      className={`timer-ring-container${isRunning ? ' running' : ''}`}
      data-mode={mode}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : undefined }}
    >
      <svg height={R * 2} width={R * 2} className="timer-ring-svg">
        <circle className="timer-ring-track" stroke="var(--ring-bg)" fill="transparent" strokeWidth={STROKE} r={NR} cx={R} cy={R} />
        <circle stroke={color} fill="transparent" strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={offset}
          r={NR} cx={R} cy={R} className="timer-ring-progress"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.3s ease' }} />
        {isRunning && (
          <g className="timer-ring-endpoint-marker" aria-hidden="true">
            <circle className="timer-ring-endpoint-halo" cx={endpoint.x} cy={endpoint.y} r="10" fill={color} />
            <circle className="timer-ring-endpoint" cx={endpoint.x} cy={endpoint.y} r="5" fill={color} />
          </g>
        )}
      </svg>
      <div className="timer-ring-text">
        <div className="timer-time">{mm}:{ss}</div>
        {currentTaskName && <div className="timer-task-name">{currentTaskName}</div>}
        {currentCategory && <div className="timer-task-category">{currentCategory}</div>}
        <div className="timer-mode-label" style={{ color }}>{label}</div>
      </div>
    </div>
  );
}
