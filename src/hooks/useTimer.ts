import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimerMode, PomodoroRecord, Category } from '../types';
import { formatTime } from '../utils/dateUtils';
import { playWorkComplete, playBreakComplete, playStart } from '../utils/sound';

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
  toast: string | null;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setTotalTime: (seconds: number) => void;
  setTaskInfo: (id: string | null, title: string, category: Category) => void;
  assignAll: (results: { taskId: string | null; taskTitle: string; category: Category }[]) => void;
  startNextGroup: () => void;
  stop: () => void;
  endNow: () => void;
  resetCycle: () => void;
  addTestPomodoros: (records: PomodoroRecord[]) => void;
  setOnComplete: (cb: (record: PomodoroRecord) => void) => void;
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
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const pendingAssignRef = useRef(pendingAssignments);
  pendingAssignRef.current = pendingAssignments;
  const onCompleteRef = useRef<((r: PomodoroRecord) => void) | null>(null);

  const setOnComplete = useCallback((cb: (r: PomodoroRecord) => void) => {
    onCompleteRef.current = cb;
  }, []);

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

    // < 60s: just reset without recording
    if (elapsedSeconds < 60) {
      setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
      return;
    }

    const task = currentTaskRef.current;
    const nextDot = cycleCountRef.current + 1;
    playWorkComplete();
    setTotalPomodoros(p => p + 1);
    setCycleCount(nextDot);

    const groupDone = nextDot >= 4;

    if (task) {
      // Task selected: record this pomodoro + assign all pending
      recordPomodoro({
        start: '', end: formatTime(new Date()), duration: elapsed,
        taskId: task.id, taskTitle: task.title, category: task.category,
        completed: true, createdAt: formatTime(new Date()),
      });
      const pendingCount = pendingAssignRef.current.length;
      if (pendingCount > 0) {
        pendingAssignRef.current.forEach(pa => {
          recordPomodoro({
            start: pa.start, end: formatTime(new Date()), duration: pa.duration,
            taskId: task.id, taskTitle: task.title, category: task.category,
            completed: true, createdAt: formatTime(new Date()),
          });
        });
        setPendingAssignments([]);
      }
      if (groupDone) {
        setCycleCount(0);
        const totalCount = pendingCount + 1;
        setToast(`🍅 已结算 ${totalCount} 个番茄 → 「${task.title}」`);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 3000);
        startBreakAndContinue(4);
      } else {
        startBreakAndContinue(nextDot);
      }
    } else {
      // No task: queue to pending
      setPendingAssignments(prev => [...prev, { start: '', duration: elapsed }]);
      if (groupDone) {
        setCycleCount(0);
        setGroupPhase('groupDone');
        // Don't start break - show modal first
      } else {
        startBreakAndContinue(nextDot);
      }
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
        taskId: a.taskId, taskTitle: a.taskTitle || '未分配', category: a.category || '其他',
        completed: true, createdAt: formatTime(new Date()),
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

  const endNow = useCallback(() => {
    clearTimer();
    const elapsedSeconds = totalTimeRef.current - timeLeftRef.current;
    const elapsed = Math.round(elapsedSeconds / 60);
    startTimeRef.current = '';

    const task = currentTaskRef.current;
    const allPending = [...pendingAssignRef.current];

    // Add current work pomodoro if >= 60s
    if (mode === 'work' && elapsedSeconds >= 60) {
      allPending.push({ start: '', duration: elapsed });
      playWorkComplete();
    }

    if (task) {
      // Task selected → assign all to task
      allPending.forEach(pa => {
        recordPomodoro({
          start: pa.start, end: formatTime(new Date()), duration: pa.duration,
          taskId: task.id, taskTitle: task.title, category: task.category,
          completed: true, createdAt: formatTime(new Date()),
        });
      });
      setPendingAssignments([]);
      if (allPending.length > 0) {
        setToast(`🍅 已结算 ${allPending.length} 个番茄 → 「${task.title}」`);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 3000);
      }
    } else if (allPending.length > 0) {
      // No task → set pending for modal
      setPendingAssignments(allPending);
      setGroupPhase('groupDone');
    }

    // Reset round
    setIsRunning(false);
    setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
    setCycleCount(0);
    if (allPending.length === 0 || task) setGroupPhase('working');
  }, [clearTimer, mode, recordPomodoro]);

  const resetCycle = useCallback(() => {
    setCycleCount(0); setGroupPhase('working'); setPendingAssignments([]);
  }, []);

  const addTestPomodoros = useCallback((records: PomodoroRecord[]) => {
    setTodayPomodoros(prev => [...prev, ...records]);
    setTotalPomodoros(p => p + records.length);
  }, []);

  const start = useCallback(() => {
    setGroupPhase('working');
    setIsRunning(true);
    playStart();
  }, []);
  const pause = useCallback(() => { setIsRunning(false); clearTimer(); }, [clearTimer]);
  const reset = useCallback(() => {
    endNow();
  }, [endNow]);
  const skip = useCallback(() => {
    if (mode === 'work') {
      clearTimer();
      const elapsedSeconds = totalTimeRef.current - timeLeftRef.current;
      const elapsed = Math.round(elapsedSeconds / 60);
      const task = currentTaskRef.current;
      const nextDot = cycleCountRef.current + 1;
      const groupDone = nextDot >= 4;

      if (elapsedSeconds >= 60) {
        if (task) {
          recordPomodoro({
            start: '', end: formatTime(new Date()), duration: elapsed,
            taskId: task.id, taskTitle: task.title, category: task.category,
            completed: true, createdAt: formatTime(new Date()),
          });
        } else {
          setPendingAssignments(prev => [...prev, { start: '', duration: elapsed }]);
        }
        setTotalPomodoros(p => p + 1);
        playWorkComplete();
      }

      setIsRunning(false);
      setCycleCount(nextDot);
      startTimeRef.current = '';

      if (task) {
        // Auto-assign pending to task
        const pending = pendingAssignRef.current;
        if (pending.length > 0) {
          pending.forEach(pa => {
            recordPomodoro({
              start: pa.start, end: formatTime(new Date()), duration: pa.duration,
              taskId: task.id, taskTitle: task.title, category: task.category,
              completed: true, createdAt: formatTime(new Date()),
            });
          });
          setPendingAssignments([]);
        }
        if (groupDone) {
          setCycleCount(0);
          const count = pending.length + (elapsedSeconds >= 60 ? 1 : 0);
          if (count > 0) {
            setToast(`🍅 已结算 ${count} 个番茄 → 「${task.title}」`);
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            toastTimerRef.current = setTimeout(() => setToast(null), 3000);
          }
          startBreakAndContinue(4);
        } else {
          startBreakAndContinue(nextDot);
        }
      } else {
        if (groupDone) {
          setCycleCount(0);
          setGroupPhase('groupDone');
        } else {
          startBreakAndContinue(nextDot);
        }
      }
    } else {
      // Skip break → back to work
      clearTimer(); setIsRunning(false);
      setMode('work'); setTimeLeft(25 * 60); setTotalTimeState(25 * 60);
      startTimeRef.current = '';
    }
  }, [mode, clearTimer, startBreakAndContinue, recordPomodoro]);

  return {
    mode, timeLeft, totalTime, isRunning, cycleCount, totalPomodoros, todayPomodoros,
    pendingAssignments, groupPhase, toast,
    start, pause, reset, skip, setTotalTime, setTaskInfo,
    assignAll, startNextGroup, stop, endNow, resetCycle, addTestPomodoros, setOnComplete,
  };
}
