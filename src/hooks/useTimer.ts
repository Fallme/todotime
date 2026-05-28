import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimerMode, TimerSettings, PomodoroRecord, Category } from '../types';
import { formatTime } from '../utils/dateUtils';
import { playWorkComplete, playBreakComplete } from '../utils/sound';

interface UseTimerReturn {
  mode: TimerMode;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  currentCycle: number;
  completedPomodoros: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  selectTaskTitle: string | null;
  setSelectTaskTitle: (t: string | null) => void;
  selectTaskCategory: Category;
  setSelectTaskCategory: (c: Category) => void;
  taskPomodoroMinutes: number;
  setTaskPomodoroMinutes: (m: number) => void;
}

export function useTimer(
  settings: TimerSettings,
  soundEnabled: boolean,
  onPomodoroComplete: (record: PomodoroRecord) => void,
): UseTimerReturn {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(settings.workMinutes * 60);
  const [totalTime, setTotalTime] = useState(settings.workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [selectTaskTitle, setSelectTaskTitle] = useState<string | null>(null);
  const [selectTaskCategory, setSelectTaskCategory] = useState<Category>('其他');
  const [taskPomodoroMinutes, setTaskPomodoroMinutes] = useState(settings.workMinutes);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<string>('');
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const getDuration = useCallback((m: TimerMode): number => {
    const s = settingsRef.current;
    if (m === 'work' && taskPomodoroMinutesRef.current > 0) {
      return taskPomodoroMinutesRef.current * 60;
    }
    switch (m) {
      case 'work': return s.workMinutes * 60;
      case 'shortBreak': return s.shortBreakMinutes * 60;
      case 'longBreak': return s.longBreakMinutes * 60;
    }
  }, []);

  const taskPomodoroMinutesRef = useRef(taskPomodoroMinutes);
  taskPomodoroMinutesRef.current = taskPomodoroMinutes;
  const selectTaskTitleRef = useRef(selectTaskTitle);
  selectTaskTitleRef.current = selectTaskTitle;
  const selectTaskCategoryRef = useRef(selectTaskCategory);
  selectTaskCategoryRef.current = selectTaskCategory;

  const switchMode = useCallback((newMode: TimerMode) => {
    setMode(newMode);
    const dur = getDuration(newMode);
    setTimeLeft(dur);
    setTotalTime(dur);
    setIsRunning(false);
    if (newMode === 'work') {
      startTimeRef.current = '';
    }
  }, [getDuration]);

  const handleTimerEnd = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (mode === 'work') {
      const dur = taskPomodoroMinutesRef.current || settingsRef.current.workMinutes;
      const record: PomodoroRecord = {
        start: startTimeRef.current,
        end: formatTime(new Date()),
        duration: dur,
        taskTitle: selectTaskTitleRef.current || '未命名专注',
        category: selectTaskCategoryRef.current,
        completed: true,
      };
      onPomodoroComplete(record);
      setCompletedPomodoros(prev => prev + 1);
      const nextCycle = currentCycle + 1;
      setCurrentCycle(nextCycle);
      if (soundEnabled) playWorkComplete();

      if (nextCycle % settingsRef.current.longBreakInterval === 0) {
        switchMode('longBreak');
      } else {
        switchMode('shortBreak');
      }
    } else {
      if (soundEnabled) playBreakComplete();
      switchMode('work');
    }
  }, [mode, currentCycle, soundEnabled, onPomodoroComplete, switchMode]);

  useEffect(() => {
    if (!isRunning) return;
    if (!startTimeRef.current) {
      startTimeRef.current = formatTime(new Date());
    }

    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimerEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, handleTimerEnd]);

  useEffect(() => {
    if (mode === 'work') {
      document.title = isRunning
        ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} - 番茄钟`
        : '番茄钟';
    } else {
      document.title = isRunning
        ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')} - 休息中`
        : '番茄钟 - 休息';
    }
  }, [timeLeft, isRunning, mode]);

  // When taskPomodoroMinutes changes and timer is not running in work mode, reset the timer
  useEffect(() => {
    if (!isRunning && mode === 'work') {
      const dur = (taskPomodoroMinutes || settings.workMinutes) * 60;
      setTimeLeft(dur);
      setTotalTime(dur);
    }
  }, [taskPomodoroMinutes, settings.workMinutes, isRunning, mode]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setIsRunning(false);
    const dur = getDuration(mode);
    setTimeLeft(dur);
    setTotalTime(dur);
    startTimeRef.current = '';
  }, [mode, getDuration]);
  const skip = useCallback(() => {
    handleTimerEnd();
  }, [handleTimerEnd]);

  return {
    mode, timeLeft, totalTime, isRunning,
    currentCycle, completedPomodoros,
    start, pause, reset, skip,
    selectTaskTitle, setSelectTaskTitle,
    selectTaskCategory, setSelectTaskCategory,
    taskPomodoroMinutes, setTaskPomodoroMinutes,
  };
}

