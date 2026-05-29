import { useRef, useCallback, useState, useEffect } from 'react';
import type { TimerMode } from '../../types';

interface TimerRingProps {
  timeLeft: number;
  totalTime: number;
  mode: TimerMode;
  isRunning: boolean;
  currentTaskName: string | null;
  onDragAdjust: (seconds: number) => void;
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

export function TimerRing({ timeLeft, totalTime, mode, isRunning, currentTaskName, onDragAdjust }: TimerRingProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const R = 130, STROKE = 8, NR = R - STROKE / 2;
  const CIRC = NR * 2 * Math.PI;
  const progress = totalTime > 0 ? Math.max(0, Math.min(1, timeLeft / totalTime)) : 0;
  const offset = CIRC * (1 - progress);
  const color = MODE_COLORS[mode];
  const mm = String(Math.floor(Math.max(0, timeLeft) / 60)).padStart(2, '0');
  const ss = String(Math.max(0, timeLeft) % 60).padStart(2, '0');

  const getAngle = useCallback((cx: number, cy: number): number => {
    if (!svgRef.current) return 0;
    const r = svgRef.current.getBoundingClientRect();
    let a = Math.atan2(cx - (r.left + r.width / 2), -(cy - (r.top + r.height / 2))) * (180 / Math.PI);
    if (a < 0) a += 360;
    return a;
  }, []);

  const angleToSec = useCallback((a: number): number => {
    const max = Math.max(60, totalTime || 1500);
    return Math.max(30, Math.min(max, Math.round((a / 360) * max / 5) * 5));
  }, [totalTime]);

  const handleAngle = progress * 360;
  const hx = R + NR * Math.sin((handleAngle * Math.PI) / 180);
  const hy = R - NR * Math.cos((handleAngle * Math.PI) / 180);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(true); isDraggingRef.current = true;
    onDragAdjust(angleToSec(getAngle(e.clientX, e.clientY)));
  }, [getAngle, angleToSec, onDragAdjust]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      onDragAdjust(angleToSec(getAngle(e.clientX, e.clientY)));
    };
    const onUp = () => { setIsDragging(false); isDraggingRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isDragging, getAngle, angleToSec, onDragAdjust]);

  return (
    <div className="timer-ring-container">
      <svg ref={svgRef} height={R * 2} width={R * 2} className="timer-ring-svg">
        <circle stroke="var(--ring-bg)" fill="transparent" strokeWidth={STROKE} r={NR} cx={R} cy={R} />
        <circle stroke={color} fill="transparent" strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={offset}
          r={NR} cx={R} cy={R} className="timer-ring-progress"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
        <circle cx={hx} cy={hy} r={isDragging ? 10 : 8}
          fill={color} stroke="white" strokeWidth={3}
          className="timer-ring-handle"
          style={{ cursor: isRunning ? 'default' : 'grab', transition: isDragging ? 'none' : 'r 0.15s' }}
          onMouseDown={!isRunning ? onMouseDown : undefined} />
      </svg>
      <div className="timer-ring-text">
        <div className="timer-time">{mm}:{ss}</div>
        {currentTaskName && <div className="timer-task-name">{currentTaskName}</div>}
        <div className="timer-mode-label" style={{ color }}>{MODE_LABELS[mode]}</div>
      </div>
    </div>
  );
}
