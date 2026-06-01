import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimerMode, PomodoroRecord, Category } from '../types';
import { formatTime } from '../utils/dateUtils';
import { playWorkComplete, playBreakComplete } from '../utils/sound';

export interface PendingAssignment {
  start: string;
  duration: number;
}

export type GroupPhase = 'working' | 'groupDone';

interface UseTimerReturn {
  mode: TimerMode;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  cycleCount: number;
  totalPomodoros: number;
  todayPomodoros: PomodoroRecord[];
  pendingAssignments: PendingAssignment[];
  groupPhase: GroupPhase;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setTotalTime: (seconds: number) => void;
  setTaskInfo: (id: string | null, title: string, category: Category) => void;
  assignAll: (results: { taskId: string | null; taskTitle: string; category: Category }[]) => void;
  startNextGroup: () => void;
  stop: () => void;
  resetCycle: () => void;
  addTestPomodoros: (records: PomodoroRecord[]) => void;
}

export function useTimer(): UseTimerReturn {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalTime, setTotalTimeState] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [totalPomodoros, setTotalPomodoros] = useState(0);
  const [todayPomodoros, setTodayPomodoros] = useState<PomodoroRecord[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);
  const [groupPhase, setGroupPhase] = useState<GroupPhase>('working');

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<string>('');
  const totalTimeRef = useRef(totalTime);
  totalTimeRef.current = totalTime;
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const currentTaskRef = useRef<{ id: string | null; title: string; category: Category } | null>(null);
  const cycleCountRef = useRef(cycleCount);
  cycleCountRef.current = cycleCount;
  const groupPhaseRef = useRef(groupPhase);
  groupPhaseRef.current = groupPhase;
  const onCompleteRef = useRef<((r: PomodoroRecord) => void) | null>(null);

  const clearTimer = useCallback(() => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } }, []);
  const setTotalTime = useCallback((s: number) => { setTotalTimeState(s); setTimeLeft(s); }, []);
  const setTaskInfo = useCallback((id: string | null, title: string, category: Category) => { currentTaskRef.current = { id, title, category }; }, []);

  const startBreakAndContinue = useCallback((dotCount: number) => {
    if (dotCount >= 4) {
      setMode('longBreak'); setTimeLeft(15 * 60); setTotalTimeState(15 * 60);
    } else {
      setMode('shortBreak'); setTimeLeft(5 * 60); setTotalTimeState(5 * 60);
    }
    setIsRunning(true);
  }, []);

  // Record a completed pomodoro to local state
  const recordPomodoro = useCallback((record: PomodoroRecord) => {
    setTodayPomodoros(prev => [...prev, record]);
    onCompleteRef.current?.(record);
  }, []);

  const completeOne = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    const elapsedSeconds = totalTimeRef.current - timeLeftRef.current;
    const elapsed = Math.round(elapsedSeconds / 60);
    startTimeRef.current = '';

    if (elapsedSeconds < 60) {
      setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
      return;
    }

    const task = currentTaskRef.current;
    const nextDot = cycleCountRef.current + 1;
    playWorkComplete();

    if (task) {
      recordPomodoro({
        start: '', end: formatTime(new Date()), duration: elapsed,
        taskId: task.id, taskTitle: task.title, category: task.category, completed: true,
      });
    } else {
      setPendingAssignments(prev => [...prev, { start: '', duration: elapsed }]);
    }

    setTotalPomodoros(p => p + 1);
    setCycleCount(nextDot);

    if (nextDot >= 4) {
      setCycleCount(0);
      setGroupPhase('groupDone');
      setIsRunning(false);
    } else {
      startBreakAndContinue(nextDot);
    }
  }, [clearTimer, startBreakAndContinue, recordPomodoro]);

  // Work countdown
  useEffect(() => {
    if (!isRunning || mode !== 'work') return;
    if (!startTimeRef.current) startTimeRef.current = formatTime(new Date());
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { completeOne(); return 0; } return prev - 1; });
    }, 1000);
    return clearTimer;
  }, [isRunning, mode, clearTimer, completeOne]);

  // Break countdown
  useEffect(() => {
    if (!isRunning || mode === 'work') return;
    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer();
          playBreakComplete();
          if (groupPhaseRef.current !== 'groupDone') {
            setTimeout(() => {
              setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
              setIsRunning(true); startTimeRef.current = '';
            }, 500);
          } else {
            setIsRunning(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [isRunning, mode, clearTimer]);

  // Title
  useEffect(() => {
    if (mode === 'work') {
      document.title = isRunning ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} - 番茄钟` : '番茄钟';
    } else {
      document.title = isRunning ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} - 休息` : '番茄钟';
    }
  }, [timeLeft, isRunning, mode]);

  const assignAll = useCallback((results: { taskId: string | null; taskTitle: string; category: Category }[]) => {
    pendingAssignments.forEach((pa, i) => {
      const a = results[i] || results[results.length - 1];
      recordPomodoro({
        start: pa.start, end: formatTime(new Date()), duration: pa.duration,
        taskId: a.taskId, taskTitle: a.taskTitle || '未分配', category: a.category || '其他', completed: true,
      });
    });
    setPendingAssignments([]);
  }, [pendingAssignments, recordPomodoro]);

  const startNextGroup = useCallback(() => {
    setGroupPhase('working');
    setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
    setIsRunning(true); startTimeRef.current = '';
  }, []);

  const stop = useCallback(() => {
    setGroupPhase('working');
    clearTimer(); setIsRunning(false);
    setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
    setCycleCount(0); startTimeRef.current = '';
  }, [clearTimer]);

  const resetCycle = useCallback(() => {
    setCycleCount(0); setGroupPhase('working'); setPendingAssignments([]);
  }, []);

  const addTestPomodoros = useCallback((records: PomodoroRecord[]) => {
    setTodayPomodoros(prev => [...prev, ...records]);
    setTotalPomodoros(p => p + records.length);
  }, []);

  const start = useCallback(() => { setGroupPhase('working'); setIsRunning(true); }, []);
  const pause = useCallback(() => { setIsRunning(false); clearTimer(); }, [clearTimer]);
  const reset = useCallback(() => {
    setIsRunning(false); clearTimer();
    setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
    setCycleCount(0); setGroupPhase('working');
    startTimeRef.current = '';
  }, [clearTimer]);
  const skip = useCallback(() => {
    if (mode === 'work') { completeOne(); }
    else { clearTimer(); setIsRunning(false); setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60); startTimeRef.current = ''; }
  }, [mode, clearTimer, completeOne]);

  return {
    mode, timeLeft, totalTime, isRunning, cycleCount, totalPomodoros, todayPomodoros,
    pendingAssignments, groupPhase,
    start, pause, reset, skip, setTotalTime, setTaskInfo,
    assignAll, startNextGroup, stop, resetCycle, addTestPomodoros,
  };
}
