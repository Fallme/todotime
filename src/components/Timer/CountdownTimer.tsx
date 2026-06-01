import { useState, useEffect, useMemo } from 'react';

interface CountdownTimerProps {
  title: string;
  targetDate: string;
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
      <div className="countdown-card editing">
        <input className="cd-input cd-title-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="目标名称" />
        <input className="cd-input cd-date-input" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
        <div className="cd-edit-btns">
          <button className="cd-btn save" onClick={handleSave}>保存</button>
          <button className="cd-btn cancel" onClick={() => setEditing(false)}>取消</button>
        </div>
      </div>
    );
  }

  return (
    <div className="countdown-card" onClick={() => setEditing(true)}>
      <div className="cd-top">
        <span className="cd-title">{title}</span>
        <span className="cd-edit-icon">✎</span>
      </div>
      {!diff.passed ? (
        <div className="cd-blocks">
          <div className="cd-block">
            <span className="cd-num">{diff.days}</span>
            <span className="cd-unit">天</span>
          </div>
          <div className="cd-sep">:</div>
          <div className="cd-block">
            <span className="cd-num">{String(diff.hours).padStart(2, '0')}</span>
            <span className="cd-unit">时</span>
          </div>
          <div className="cd-sep">:</div>
          <div className="cd-block">
            <span className="cd-num">{String(diff.minutes).padStart(2, '0')}</span>
            <span className="cd-unit">分</span>
          </div>
          <div className="cd-sep">:</div>
          <div className="cd-block">
            <span className="cd-num">{String(diff.seconds).padStart(2, '0')}</span>
            <span className="cd-unit">秒</span>
          </div>
        </div>
      ) : (
        <div className="cd-passed">🎉 已到达目标日期！</div>
      )}
    </div>
  );
}
