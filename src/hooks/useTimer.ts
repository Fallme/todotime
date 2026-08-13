import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimerMode, PomodoroRecord, Category } from '../types';
import { formatDate, generateId } from '../utils/dateUtils';
import { profileStorageKey, readProfileStorage } from '../utils/syncIdentity';
import { playStart, playEnterBreak, playCycleComplete } from '../utils/sound';

export interface PendingAssignment {
  start: string;
  end: string;
  date: string;
  duration: number;
}

export type GroupPhase = 'working' | 'settle';

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
  runningMinutes: number;
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

export function useTimer(timerSettings: { workMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; longBreakInterval: number }, soundEnabled: boolean = true, onRecorded?: (record: PomodoroRecord) => void, profileId: string = 'local'): UseTimerReturn {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(timerSettings.workMinutes * 60);
  const [totalTime, setTotalTimeState] = useState(timerSettings.workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  const [totalPomodoros, setTotalPomodoros] = useState(0);
  const [todayPomodoros, setTodayPomodoros] = useState<PomodoroRecord[]>(() => {
    try {
      const storedDate = readProfileStorage('todotime_today_date', profileId);
      const today = formatDate(new Date());
      if (storedDate === today) {
        const stored = readProfileStorage('todotime_today_pomodoros', profileId);
        if (stored) return JSON.parse(stored) as PomodoroRecord[];
      }
    } catch { /* ignore */ }
    return [];
  });
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);
  const [groupPhase, setGroupPhase] = useState<GroupPhase>('working');
  const [toast, setToast] = useState<string | null>(null);
  const [runningMinutes, setRunningMinutes] = useState(0);

  const intervalRef = useRef<number | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const startTimeRef = useRef<string>('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalTimeRef = useRef(totalTime);
  const timeLeftRef = useRef(timeLeft);
  const modeRef = useRef(mode);
  const currentTaskRef = useRef<{ id: string | null; title: string; category: Category } | null>(null);
  const cycleCountRef = useRef(cycleCount);
  const groupPhaseRef = useRef(groupPhase);
  const pendingAssignRef = useRef(pendingAssignments);
  const onCompleteRef = useRef<((r: PomodoroRecord) => void) | null>(null);
  const workMinutesRef = useRef(timerSettings.workMinutes);
  const shortBreakMinutesRef = useRef(timerSettings.shortBreakMinutes);
  const longBreakMinutesRef = useRef(timerSettings.longBreakMinutes);
  const cycleIntervalRef = useRef(timerSettings.longBreakInterval);
  const soundEnabledRef = useRef(soundEnabled);
  const isLongBreakRef = useRef(false);
  const profileIdRef = useRef(profileId);

  const clearTimer = useCallback(() => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } }, []);

  useEffect(() => { totalTimeRef.current = totalTime; }, [totalTime]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { cycleCountRef.current = cycleCount; }, [cycleCount]);
  useEffect(() => { groupPhaseRef.current = groupPhase; }, [groupPhase]);
  useEffect(() => { pendingAssignRef.current = pendingAssignments; }, [pendingAssignments]);
  useEffect(() => { workMinutesRef.current = timerSettings.workMinutes; }, [timerSettings.workMinutes]);
  useEffect(() => { shortBreakMinutesRef.current = timerSettings.shortBreakMinutes; }, [timerSettings.shortBreakMinutes]);
  useEffect(() => { longBreakMinutesRef.current = timerSettings.longBreakMinutes; }, [timerSettings.longBreakMinutes]);
  useEffect(() => { cycleIntervalRef.current = timerSettings.longBreakInterval; }, [timerSettings.longBreakInterval]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  const setTotalTime = useCallback((s: number) => { setTotalTimeState(s); setTimeLeft(s); }, []);
  const setTaskInfo = useCallback((id: string | null, title: string, category: Category) => { currentTaskRef.current = { id, title, category }; }, []);
  const setOnComplete = useCallback((cb: (r: PomodoroRecord) => void) => { onCompleteRef.current = cb; }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Record a pomodoro
  const recordPomodoro = useCallback((record: PomodoroRecord) => {
    const normalized = { ...record, id: record.id || generateId(), date: record.date || formatDate(new Date()) };
    setTodayPomodoros(prev => [...prev, normalized]);
    // Use direct callback if available, fallback to ref
    if (onRecorded) {
      onRecorded(normalized);
    } else {
      onCompleteRef.current?.(normalized);
    }
  }, [onRecorded]);

  // Persist todayPomodoros to localStorage
  useEffect(() => {
    const today = formatDate(new Date());
    localStorage.setItem(profileStorageKey('todotime_today_date', profileIdRef.current), today);
    localStorage.setItem(profileStorageKey('todotime_today_pomodoros', profileIdRef.current), JSON.stringify(todayPomodoros));
  }, [todayPomodoros, profileId]);

  const playSound = useCallback((fn: () => void) => {
    if (soundEnabledRef.current) fn();
  }, []);

  // Start break then auto-continue
  const startBreak = useCallback((isLong: boolean) => {
    if (isLong) {
      setMode('longBreak'); setTimeLeft(longBreakMinutesRef.current * 60); setTotalTimeState(longBreakMinutesRef.current * 60);
    } else {
      setMode('shortBreak'); setTimeLeft(shortBreakMinutesRef.current * 60); setTotalTimeState(shortBreakMinutesRef.current * 60);
    }
    playSound(playEnterBreak);
    setIsRunning(true);
  }, [playSound]);

  // Break completion signal
  const [breakDone, setBreakDone] = useState(0);
  const breakWasLongRef = useRef(false);

  // Break countdown → signal when done
  useEffect(() => {
    if (!isRunning || mode === 'work') return;
    deadlineRef.current = Date.now() + timeLeftRef.current * 1000;
    intervalRef.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil(((deadlineRef.current ?? Date.now()) - Date.now()) / 1000));
      timeLeftRef.current = remaining;
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearTimer();
        breakWasLongRef.current = isLongBreakRef.current;
        setBreakDone(n => n + 1);
      }
    }, 250);
    return clearTimer;
  }, [isRunning, mode, clearTimer]);

  // Handle break completion (runs after re-render)
  useEffect(() => {
    if (breakDone === 0) return;

    if (breakWasLongRef.current) {
      // Long break completed
      breakWasLongRef.current = false;
      playSound(playCycleComplete);
      setCycleCount(0);
      setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
      setIsRunning(false);

      // Only unassigned sessions reach this point; never attach them to a task selected later.
      setPendingAssignments(prev => {
        const totalMinutes = prev.reduce((sum, p) => sum + p.duration, 0);
        if (totalMinutes > 0) {
          setGroupPhase('settle');
          return prev;
        } else {
          setTimeout(() => showToast('一轮完成！无记录'), 0);
          return [];
        }
      });
    } else {
      // Short break → play sound and auto-start next work
      playSound(playStart);
      setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
      startTimeRef.current = '';
      setIsRunning(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakDone]);

  // Complete one work pomodoro
  const completeOne = useCallback((force = false) => {
    clearTimer();
    setIsRunning(false);
    const elapsedSeconds = totalTimeRef.current - timeLeftRef.current;
    const elapsed = Math.floor(elapsedSeconds / 60);
    const startTime = startTimeRef.current || new Date().toISOString();
    const endTime = new Date().toISOString();
    startTimeRef.current = '';

    if (!force && elapsedSeconds < 60) {
      setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
      return;
    }

    const assignment = { start: startTime, end: endTime, date: formatDate(new Date(startTime)), duration: Math.max(1, elapsed) };
    const task = currentTaskRef.current;
    if (task?.id) {
      recordPomodoro({
        ...assignment,
        taskId: task.id, taskTitle: task.title, category: task.category,
        completed: true, createdAt: endTime,
      });
    } else {
      setPendingAssignments(prev => [...prev, assignment]);
    }

    // A completed configured session always counts; short manual sessions use an 80% threshold capped at 20 min.
    const minimumMinutes = Math.max(1, Math.min(20, Math.ceil(workMinutesRef.current * 0.8)));
    if (force || elapsed >= minimumMinutes) {
      setTotalPomodoros(p => p + 1);
      const nextDot = cycleCountRef.current + 1;
      setCycleCount(nextDot);

      if (nextDot >= cycleIntervalRef.current) {
        setCycleCount(0);
        isLongBreakRef.current = true;
        startBreak(true);
      } else {
        isLongBreakRef.current = false;
        startBreak(false);
      }
    } else {
      // Less than 20 min, just go to break without counting
      isLongBreakRef.current = false;
      startBreak(false);
    }
  }, [clearTimer, startBreak, recordPomodoro]);

  // Work countdown — tracks running minutes
  const workSecondsRef = useRef(0);
  useEffect(() => {
    if (!isRunning || mode !== 'work') {
      workSecondsRef.current = 0;
      return;
    }
    if (!startTimeRef.current) startTimeRef.current = new Date().toISOString();
    workSecondsRef.current = totalTimeRef.current - timeLeftRef.current;
    setRunningMinutes(Math.floor(workSecondsRef.current / 60));
    deadlineRef.current = Date.now() + timeLeftRef.current * 1000;
    intervalRef.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil(((deadlineRef.current ?? Date.now()) - Date.now()) / 1000));
      timeLeftRef.current = remaining;
      workSecondsRef.current = totalTimeRef.current - remaining;
      setRunningMinutes(Math.floor(workSecondsRef.current / 60));
      setTimeLeft(remaining);
      if (remaining === 0) completeOne(true);
    }, 250);
    return clearTimer;
  }, [isRunning, mode, clearTimer, completeOne]);

  useEffect(() => {
    if (mode !== 'work') {
      const id = setTimeout(() => setRunningMinutes(0), 0);
      return () => clearTimeout(id);
    }
  }, [mode]);

  // Title
  useEffect(() => {
    if (mode === 'work') {
      document.title = isRunning ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} - 番茄钟` : '番茄钟';
    } else {
      document.title = isRunning ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} - 休息` : '番茄钟';
    }
  }, [timeLeft, isRunning, mode]);

  // Assign all pending from modal
  const assignAll = useCallback((results: { taskId: string | null; taskTitle: string; category: Category }[]) => {
    const pending = pendingAssignRef.current;
    pending.forEach((pa, i) => {
      const a = results[i] || results[results.length - 1];
      recordPomodoro({
        start: pa.start, end: pa.end, date: pa.date, duration: pa.duration,
        taskId: a.taskId, taskTitle: a.taskTitle || '未分配', category: a.category || '其他',
        completed: true, createdAt: pa.end,
      });
    });
    setPendingAssignments([]);
    setGroupPhase('working');
    showToast(`已分配 ${pending.length} 个番茄`);
  }, [recordPomodoro, showToast]);

  // Start next group
  const startNextGroup = useCallback(() => {
    setGroupPhase('working');
    setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
    setIsRunning(true); startTimeRef.current = '';
    playSound(playStart);
  }, [playSound]);

  // Stop
  const stop = useCallback(() => {
    setGroupPhase('working');
    clearTimer(); setIsRunning(false);
    setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
    setCycleCount(0); startTimeRef.current = '';
    isLongBreakRef.current = false;
    setPendingAssignments([]);
    setRunningMinutes(0);
  }, [clearTimer]);

  // End now: settle completed pomodoros, update cycle
  const endNow = useCallback(() => {
    clearTimer();
    const elapsedSeconds = totalTimeRef.current - timeLeftRef.current;
    const elapsed = Math.round(elapsedSeconds / 60);
    const startTime = startTimeRef.current || new Date().toISOString();
    const endTime = new Date().toISOString();
    startTimeRef.current = '';

    setIsRunning(false);
    setRunningMinutes(0);
    setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
    isLongBreakRef.current = false;

    // Use functional update to get latest pendingAssignments
    setPendingAssignments(prev => {
      const minimumMinutes = Math.max(1, Math.min(20, Math.ceil(workMinutesRef.current * 0.8)));
      if (elapsed >= minimumMinutes) {
        setCycleCount(cycleCountRef.current + 1);
        const task = currentTaskRef.current;
        if (task?.id) {
          recordPomodoro({
            start: startTime, end: endTime, date: formatDate(new Date(startTime)), duration: elapsed,
            taskId: task.id, taskTitle: task.title, category: task.category,
            completed: true, createdAt: endTime,
          });
          setCycleCount(0);
          setTimeout(() => showToast(`${elapsed}分钟 · 1个番茄 →「${task.title}」`), 0);
          if (prev.length > 0) setGroupPhase('settle');
          return prev;
        } else {
          setGroupPhase('settle');
          return [...prev, { start: startTime, end: endTime, date: formatDate(new Date(startTime)), duration: elapsed }];
        }
      } else {
        setCycleCount(0);
        if (prev.length > 0) setGroupPhase('settle');
        return prev;
      }
    });
  }, [clearTimer, recordPomodoro, showToast]);

  const resetCycle = useCallback(() => {
    setCycleCount(0); setGroupPhase('working'); setPendingAssignments([]);
    isLongBreakRef.current = false;
  }, []);

  const addTestPomodoros = useCallback((records: PomodoroRecord[]) => {
    setTodayPomodoros(prev => [...prev, ...records]);
    setTotalPomodoros(p => p + records.length);
  }, []);

  const start = useCallback(() => {
    setGroupPhase('working');
    setIsRunning(true);
    playSound(playStart);
  }, [playSound]);

  const pause = useCallback(() => {
    // Immediately update runningMinutes to reflect current elapsed
    if (modeRef.current === 'work') {
      const elapsed = totalTimeRef.current - timeLeftRef.current;
      setRunningMinutes(Math.floor(elapsed / 60));
    }
    setIsRunning(false); clearTimer();
  }, [clearTimer]);
  const reset = useCallback(() => { endNow(); }, [endNow]);

  // Skip: quickly complete current phase and move to next (keeps running)
  const skip = useCallback(() => {
    clearTimer();
    if (modeRef.current === 'work') {
      // Skipping work must not create focus time or advance the completed cycle.
      startTimeRef.current = '';
      setRunningMinutes(0);
      isLongBreakRef.current = false;
      startBreak(false);
    } else {
      // Skip break
      if (isLongBreakRef.current) {
        // Skip long break → settle + cycle complete sound
        isLongBreakRef.current = false;
        playSound(playCycleComplete);
        setCycleCount(0);

        setPendingAssignments(prev => {
          const totalMinutes = prev.reduce((sum, p) => sum + p.duration, 0);
          if (totalMinutes > 0) {
            const task = currentTaskRef.current;
            if (task) {
              prev.forEach(pa => {
                recordPomodoro({
                  start: pa.start, end: pa.end, date: pa.date, duration: pa.duration,
                  taskId: task.id, taskTitle: task.title, category: task.category,
                  completed: true, createdAt: pa.end,
                });
              });
              setTimeout(() => showToast(`一轮完成！${totalMinutes}分钟 →「${task.title}」`), 0);
              return [];
            } else {
              setGroupPhase('settle');
              return [{ start: prev[0]?.start || new Date().toISOString(), end: prev[prev.length - 1]?.end || new Date().toISOString(), date: prev[0]?.date || formatDate(new Date()), duration: totalMinutes }];
            }
          } else {
            setTimeout(() => showToast('一轮完成！无记录'), 0);
            return [];
          }
        });

        // Reset to work mode but DON'T auto-start
        setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
        startTimeRef.current = '';
        setIsRunning(false);
      } else {
        // Skip short break → auto-start next work
        playSound(playStart);
        setMode('work'); setTimeLeft(workMinutesRef.current * 60); setTotalTimeState(workMinutesRef.current * 60);
        startTimeRef.current = '';
        setIsRunning(true);
      }
    }
  }, [clearTimer, startBreak, playSound, recordPomodoro, showToast]);

  return {
    mode, timeLeft, totalTime, isRunning, cycleCount, totalPomodoros, todayPomodoros,
    pendingAssignments, groupPhase, toast, runningMinutes,
    start, pause, reset, skip, setTotalTime, setTaskInfo,
    assignAll, startNextGroup, stop, endNow, resetCycle, addTestPomodoros, setOnComplete,
  };
}
