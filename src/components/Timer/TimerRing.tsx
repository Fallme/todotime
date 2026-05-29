import { useRef, useCallback, useState, useEffect } from 'react';
import type { TimerMode } from '../../types';

interface TimerRingProps {
  timeLeft: number;
  totalTime: number;
  mode: TimerMode;
  isRunning: boolean;
  onDragAdjust: (newTimeLeft: number) => void;
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

export function TimerRing({ timeLeft, totalTime, mode, isRunning, onDragAdjust }: TimerRingProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const radius = 130;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = totalTime > 0 ? Math.max(0, Math.min(1, timeLeft / totalTime)) : 0;
  const offset = circumference * (1 - progress);
  const color = MODE_COLORS[mode];
  const minutes = Math.floor(Math.max(0, timeLeft) / 60);
  const seconds = Math.max(0, timeLeft) % 60;

  // Angle from pointer to center (0=top, clockwise)
  const getAngleFromPointer = useCallback((clientX: number, clientY: number): number => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let angle = Math.atan2(clientX - cx, -(clientY - cy)) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
  }, []);

  // Angle → seconds, rounded to 5s
  const angleToSeconds = useCallback((angle: number): number => {
    const maxSeconds = Math.max(60, totalTime || 1500);
    const raw = (angle / 360) * maxSeconds;
    return Math.max(30, Math.min(maxSeconds, Math.round(raw / 5) * 5));
  }, [totalTime]);

  // Handle position on the ring
  const handleAngleDeg = progress * 360;
  const handleX = radius + normalizedRadius * Math.sin((handleAngleDeg * Math.PI) / 180);
  const handleY = radius - normalizedRadius * Math.cos((handleAngleDeg * Math.PI) / 180);
  const handleRadius = isDragging ? 10 : 8;

  // ONLY the handle starts drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    isDraggingRef.current = true;
    const angle = getAngleFromPointer(e.clientX, e.clientY);
    const newSeconds = angleToSeconds(angle);
    onDragAdjust(newSeconds);
  }, [getAngleFromPointer, angleToSeconds, onDragAdjust]);

  // Global drag handlers
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const angle = getAngleFromPointer(e.clientX, e.clientY);
      const newSeconds = angleToSeconds(angle);
      onDragAdjust(newSeconds);
    };
    const onUp = () => {
      setIsDragging(false);
      isDraggingRef.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, getAngleFromPointer, angleToSeconds, onDragAdjust]);

  return (
    <div className="timer-ring-container">
      <svg
        ref={svgRef}
        height={radius * 2}
        width={radius * 2}
        className="timer-ring-svg"
      >
        {/* Background ring */}
        <circle
          stroke="var(--ring-bg)" fill="transparent"
          strokeWidth={stroke} r={normalizedRadius}
          cx={radius} cy={radius}
        />
        {/* Progress ring */}
        <circle
          stroke={color} fill="transparent"
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          r={normalizedRadius} cx={radius} cy={radius}
          className="timer-ring-progress"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
        {/* Handle — only this element starts drag */}
        <circle
          cx={handleX} cy={handleY} r={handleRadius}
          fill={color} stroke="white" strokeWidth={3}
          className="timer-ring-handle"
          style={{ cursor: isRunning ? 'default' : 'grab', transition: isDragging ? 'none' : 'r 0.15s' }}
          onMouseDown={!isRunning ? handleMouseDown : undefined}
        />
      </svg>
      <div className="timer-ring-text">
        <div className="timer-time">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <div className="timer-mode-label" style={{ color }}>{MODE_LABELS[mode]}</div>
      </div>
    </div>
  );
}
