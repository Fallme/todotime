import { useRef, useCallback, useState, useEffect } from 'react';
import type { TimerMode } from '../../types';

interface TimerRingProps {
  timeLeft: number;
  totalTime: number;
  mode: TimerMode;
  isRunning: boolean;
  onDragAdjust: (newTimeLeft: number, newTotalTime: number) => void;
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
  const [hovering, setHovering] = useState(false);

  const radius = 130;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = totalTime > 0 ? Math.max(0, Math.min(1, timeLeft / totalTime)) : 0;
  const offset = circumference * (1 - progress);
  const color = MODE_COLORS[mode];
  const minutes = Math.floor(Math.max(0, timeLeft) / 60);
  const seconds = Math.max(0, timeLeft) % 60;

  // Calculate pointer position as angle (0 = top, clockwise)
  const getAngleFromPointer = useCallback((clientX: number, clientY: number): number => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // atan2(dx, -dy) gives angle from top (12 o'clock), clockwise
    let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
  }, []);

  // Convert angle to seconds, rounded to nearest 5s for smooth UX
  const angleToSeconds = useCallback((angle: number): number => {
    const maxSeconds = Math.max(60, totalTime || 1500);
    const raw = (angle / 360) * maxSeconds;
    return Math.max(30, Math.min(maxSeconds, Math.round(raw / 5) * 5));
  }, [totalTime]);

  // Pointer down - start dragging
  const handlePointerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    isDraggingRef.current = true;
    const angle = getAngleFromPointer(e.clientX, e.clientY);
    const newSeconds = angleToSeconds(angle);
    const ratio = totalTime > 0 ? timeLeft / totalTime : 1;
    if (isRunning) {
      // When running: adjust total, keep progress ratio
      const newTotal = newSeconds;
      const newLeft = Math.round(newTotal * ratio);
      onDragAdjust(newLeft, newTotal);
    } else {
      // When paused: set both to new value
      onDragAdjust(newSeconds, newSeconds);
    }
  }, [getAngleFromPointer, angleToSeconds, totalTime, timeLeft, isRunning, onDragAdjust]);

  // Global move/up handlers during drag
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const angle = getAngleFromPointer(e.clientX, e.clientY);
      const newSeconds = angleToSeconds(angle);
      const ratio = totalTime > 0 ? timeLeft / totalTime : 1;
      if (isRunning) {
        const newTotal = newSeconds;
        const newLeft = Math.round(newTotal * ratio);
        onDragAdjust(newLeft, newTotal);
      } else {
        onDragAdjust(newSeconds, newSeconds);
      }
    };
    const onUp = () => {
      setIsDragging(false);
      isDraggingRef.current = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      const t = e.touches[0];
      const angle = getAngleFromPointer(t.clientX, t.clientY);
      const newSeconds = angleToSeconds(angle);
      onDragAdjust(newSeconds, newSeconds);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDragging, totalTime, timeLeft, isRunning, getAngleFromPointer, angleToSeconds, onDragAdjust]);

  // Handle position: where the current time maps to on the ring
  const handleAngle = progress * 360;
  const handleX = radius + normalizedRadius * Math.sin((handleAngle * Math.PI) / 180);
  const handleY = radius - normalizedRadius * Math.cos((handleAngle * Math.PI) / 180);

  return (
    <div className="timer-ring-container">
      <svg
        ref={svgRef}
        height={radius * 2}
        width={radius * 2}
        className={`timer-ring-svg ${!isRunning || isDragging ? 'draggable' : ''}`}
        onMouseDown={handlePointerDown}
        onTouchStart={(e) => {
          const t = e.touches[0];
          handlePointerDown({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => {} } as React.MouseEvent);
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* Background ring */}
        <circle
          stroke="var(--ring-bg)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Progress ring */}
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
        {/* Drag handle */}
        <circle
          cx={handleX}
          cy={handleY}
          r={isDragging ? 8 : hovering ? 7 : 0}
          fill={color}
          stroke="white"
          strokeWidth={2}
          className="timer-ring-handle"
          style={{ transition: isDragging ? 'none' : 'r 0.2s, opacity 0.2s' }}
        />
      </svg>
      <div className="timer-ring-text">
        <div className="timer-time">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <div className="timer-mode-label" style={{ color }}>{MODE_LABELS[mode]}</div>
      </div>
      {hovering && !isRunning && !isDragging && (
        <div className="timer-drag-hint">拖动圆环调整时长</div>
      )}
    </div>
  );
}
