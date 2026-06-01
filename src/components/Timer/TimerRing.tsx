import { useRef, useCallback, useState } from 'react';
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
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  const R = 130, STROKE = 8, NR = R - STROKE / 2;
  const CIRC = NR * 2 * Math.PI;
  const progress = totalTime > 0 ? Math.max(0, Math.min(1, timeLeft / totalTime)) : 0;
  const offset = CIRC * (1 - progress);
  const color = MODE_COLORS[mode];
  const mm = String(Math.floor(Math.max(0, timeLeft) / 60)).padStart(2, '0');
  const ss = String(Math.max(0, timeLeft) % 60).padStart(2, '0');

  // Calculate angle from screen coordinates to center
  const screenToAngle = useCallback((sx: number, sy: number): number => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // atan2(dx, -dy): 0=12 o'clock, clockwise
    let angle = Math.atan2(sx - cx, -(sy - cy)) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
  }, []);

  // Angle → seconds (round to 5s)
  const angleToSec = useCallback((angle: number): number => {
    const max = Math.max(60, totalTime || 1500);
    const raw = (angle / 360) * max;
    return Math.max(30, Math.min(max, Math.round(raw / 5) * 5));
  }, [totalTime]);

  // Handle position
  const handleAngle = progress * 360;
  const hx = R + NR * Math.sin((handleAngle * Math.PI) / 180);
  const hy = R - NR * Math.cos((handleAngle * Math.PI) / 180);

  // Grab handle
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isRunning) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    draggingRef.current = true;
    onDragAdjust(angleToSec(screenToAngle(e.clientX, e.clientY)));
  }, [isRunning, screenToAngle, angleToSec, onDragAdjust]);

  // Track pointer move via capture
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    onDragAdjust(angleToSec(screenToAngle(e.clientX, e.clientY)));
  }, [screenToAngle, angleToSec, onDragAdjust]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    draggingRef.current = false;
  }, []);

  return (
    <div className="timer-ring-container">
      <svg ref={svgRef} height={R * 2} width={R * 2} className="timer-ring-svg">
        {/* Background */}
        <circle stroke="var(--ring-bg)" fill="transparent" strokeWidth={STROKE} r={NR} cx={R} cy={R} />
        {/* Progress */}
        <circle stroke={color} fill="transparent" strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={offset}
          r={NR} cx={R} cy={R} className="timer-ring-progress"
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
        {/* Invisible large hit area */}
        <circle cx={hx} cy={hy} r={16} fill="transparent"
          style={{ cursor: isRunning ? 'default' : 'grab', touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {/* Visible handle */}
        <circle cx={hx} cy={hy} r={dragging ? 10 : 7}
          fill={color} stroke="white" strokeWidth={3}
          className="timer-ring-handle"
          style={{ pointerEvents: 'none', transition: dragging ? 'none' : 'r 0.15s' }}
        />
      </svg>
      <div className="timer-ring-text">
        <div className="timer-time">{mm}:{ss}</div>
        {currentTaskName && <div className="timer-task-name">{currentTaskName}</div>}
        <div className="timer-mode-label" style={{ color }}>{MODE_LABELS[mode]}</div>
      </div>
    </div>
  );
}
