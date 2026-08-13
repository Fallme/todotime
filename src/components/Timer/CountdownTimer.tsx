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
  const [now, setNow] = useState<number | null>(null);

  // Tick every second
  useEffect(() => {
    const initial = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearTimeout(initial); clearInterval(id); };
  }, []);

  const target = new Date(targetDate + 'T00:00:00').getTime();
  const invalidTarget = !Number.isFinite(target);
  const diff = now === null ? 0 : target - now;
  const passed = diff <= 0;

  const days = passed ? 0 : Math.floor(diff / 86400000);
  const hours = passed ? 0 : Math.floor((diff % 86400000) / 3600000);
  const minutes = passed ? 0 : Math.floor((diff % 3600000) / 60000);
  const seconds = passed ? 0 : Math.floor((diff % 60000) / 1000);

  const handleSave = () => {
    if (!editTitle.trim() || !editDate) return;
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
          <button className="cd-btn save" onClick={handleSave} disabled={!editTitle.trim() || !editDate}>保存</button>
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
      {invalidTarget ? (
        <div className="cd-passed">日期无效，点击修改</div>
      ) : now === null ? null : passed ? (
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
