import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  title: string;
  targetDate: string;
  onUpdate: (title: string, date: string) => void;
}

export function CountdownTimer({ title, targetDate, onUpdate }: CountdownTimerProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDate, setEditDate] = useState(targetDate);
  const [now, setNow] = useState(Date.now());

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(targetDate + 'T00:00:00').getTime();
  const diff = target - now;
  const passed = diff <= 0;

  const days = passed ? 0 : Math.floor(diff / 86400000);
  const hours = passed ? 0 : Math.floor((diff % 86400000) / 3600000);
  const minutes = passed ? 0 : Math.floor((diff % 3600000) / 60000);
  const seconds = passed ? 0 : Math.floor((diff % 60000) / 1000);

  const handleSave = () => {
    onUpdate(editTitle, editDate);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="countdown-card editing">
        <div className="cd-edit-row">
          <input className="cd-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="目标名称" />
          <input className="cd-input" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
        </div>
        <div className="cd-edit-btns">
          <button className="cd-btn save" onClick={handleSave}>保存</button>
          <button className="cd-btn cancel" onClick={() => setEditing(false)}>取消</button>
        </div>
      </div>
    );
  }

  return (
    <div className="countdown-card" onClick={() => { setEditTitle(title); setEditDate(targetDate); setEditing(true); }}>
      <div className="cd-top">
        <span className="cd-icon">🎯</span>
        <span className="cd-title">{title}</span>
        <span className="cd-edit-hint">✎</span>
      </div>
      {passed ? (
        <div className="cd-passed">🎉 已到达！</div>
      ) : (
        <div className="cd-blocks">
          <div className="cd-block">
            <span className="cd-num">{days}</span>
            <span className="cd-unit">天</span>
          </div>
          <div className="cd-block">
            <span className="cd-num">{String(hours).padStart(2, '0')}</span>
            <span className="cd-unit">时</span>
          </div>
          <div className="cd-block">
            <span className="cd-num">{String(minutes).padStart(2, '0')}</span>
            <span className="cd-unit">分</span>
          </div>
          <div className="cd-block">
            <span className="cd-num">{String(seconds).padStart(2, '0')}</span>
            <span className="cd-unit">秒</span>
          </div>
        </div>
      )}
    </div>
  );
}
