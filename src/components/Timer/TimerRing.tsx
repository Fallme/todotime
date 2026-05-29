import { useRef, useCallback, useState, useEffect } from 'react';
import type { TimerMode } from '../../types';

interface TimerRingProps {
  timeLeft: number;
  totalTime: number;
  mode: TimerMode;
  isRunning: boolean;
  onAdjust: (newSeconds: number) => void;
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

export function TimerRing({ timeLeft, totalTime, mode, isRunning, onAdjust }: TimerRingProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  const radius = 130;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const offset = circumference - progress * circumference;
  const color = MODE_COLORS[mode];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const angleFromEvent = useCallback((e: MouseEvent | React.MouseEvent): number => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const me = e as MouseEvent;
    const x = me.clientX - cx;
    const y = me.clientY - cy;
    let angle = Math.atan2(x, -y) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
  }, []);

  const handlePointerDown = useCallback((e: React.MouseEvent) => {
    if (isRunning) return;
    e.preventDefault();
    setIsDragging(true);
    const angle = angleFromEvent(e);
    const newSeconds = Math.round((angle / 360) * totalTime);
    const clamped = Math.max(60, Math.min(totalTime > 0 ? totalTime : 5400, newSeconds));
    onAdjust(clamped);
  }, [isRunning, totalTime, angleFromEvent, onAdjust]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const angle = angleFromEvent(e);
      const newSeconds = Math.round((angle / 360) * totalTime);
      const clamped = Math.max(60, Math.min(totalTime > 0 ? totalTime : 5400, newSeconds));
      onAdjust(clamped);
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isDragging, totalTime, angleFromEvent, onAdjust]);

  const showAdjustHint = !isRunning && hovering && mode === 'work';

  return (
    <div className="timer-ring-container">
      <svg
        ref={svgRef}
        height={radius * 2}
        width={radius * 2}
        className={`timer-ring-svg ${!isRunning ? 'draggable' : ''}`}
        onMouseDown={handlePointerDown}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
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
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
        {/* Drag indicator dot */}
        {!isRunning && (
          <circle
            cx={radius + normalizedRadius * Math.sin((timeLeft / (totalTime || 1)) * 2 * Math.PI)}
            cy={radius - normalizedRadius * Math.cos((timeLeft / (totalTime || 1)) * 2 * Math.PI)}
            r={6}
            fill={color}
            className="timer-ring-handle"
            opacity={hovering || isDragging ? 1 : 0}
          />
        )}
      </svg>
      <div className="timer-ring-text">
        <div className="timer-time">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <div className="timer-mode-label" style={{ color }}>{MODE_LABELS[mode]}</div>
      </div>
      {showAdjustHint && <div className="timer-drag-hint">拖动圆环调整时长</div>}
    </div>
  );
}
