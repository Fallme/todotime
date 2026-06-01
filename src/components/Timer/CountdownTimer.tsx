import { useState, useEffect, useMemo } from 'react';

interface CountdownTimerProps {
  title: string;
  targetDate: string; // YYYY-MM-DD
  onUpdate: (title: string, date: string) => void;
}

export function CountdownTimer({ title, targetDate, onUpdate }: CountdownTimerProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDate, setEditDate] = useState(targetDate);

  const diff = useMemo(() => {
    const now = new Date();
    const target = new Date(targetDate + 'T00:00:00');
    const ms = target.getTime() - now.getTime();
    if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };
    return {
      days: Math.floor(ms / 86400000),
      hours: Math.floor((ms % 86400000) / 3600000),
      minutes: Math.floor((ms % 3600000) / 60000),
      seconds: Math.floor((ms % 60000) / 1000),
      passed: false,
    };
  }, [targetDate]);

  // Refresh every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const handleSave = () => {
    onUpdate(editTitle, editDate);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="countdown editing">
        <input className="countdown-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="标题" />
        <input className="countdown-input" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
        <button className="countdown-save" onClick={handleSave}>✓</button>
        <button className="countdown-cancel" onClick={() => setEditing(false)}>×</button>
      </div>
    );
  }

  return (
    <div className="countdown" onClick={() => setEditing(true)} title="点击编辑">
      <span className="countdown-title">{title}</span>
      {!diff.passed ? (
        <span className="countdown-numbers">
          <span className="countdown-num">{diff.days}<small>天</small></span>
          <span className="countdown-sep">:</span>
          <span className="countdown-num">{String(diff.hours).padStart(2, '0')}<small>时</small></span>
          <span className="countdown-sep">:</span>
          <span className="countdown-num">{String(diff.minutes).padStart(2, '0')}<small>分</small></span>
          <span className="countdown-sep">:</span>
          <span className="countdown-num">{String(diff.seconds).padStart(2, '0')}<small>秒</small></span>
        </span>
      ) : (
        <span className="countdown-passed">已到达！</span>
      )}
      <span className="countdown-edit-hint">✎</span>
    </div>
  );
}
