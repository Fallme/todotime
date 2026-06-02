import { useState, useRef, useEffect } from 'react';
import { Check, Trash2, Play, RotateCcw, Plus } from 'lucide-react';
import type { Todo, Category, CategoryItem } from '../../types';
import { getCategoryColor } from '../../types';

interface TodoItemProps {
  todo: Todo;
  isSelected: boolean;
  categories: CategoryItem[];
  onToggle: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onAbandon: () => void;
  onRestore: () => void;
  onQuickStart: () => void;
  onAddSubtask: (title: string) => void;
  onToggleSubtask: (subId: string) => void;
  onAbandonSubtask: (subId: string) => void;
  onDeleteSubtask: (subId: string) => void;
  onChangeCategory: (category: Category) => void;
}

export function TodoItem({ todo, isSelected, categories, onToggle, onDelete, onSelect, onAbandon, onRestore, onQuickStart, onAddSubtask, onToggleSubtask, onAbandonSubtask, onDeleteSubtask, onChangeCategory }: TodoItemProps) {
  const [showSubInput, setShowSubInput] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const catPickerRef = useRef<HTMLDivElement>(null);
  const isActive = !todo.done && !todo.abandoned;
  const catColor = getCategoryColor(categories, todo.category);

  // Click outside to close category picker
  useEffect(() => {
    if (!showCatPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (catPickerRef.current && !catPickerRef.current.contains(e.target as Node)) {
        setShowCatPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick, true);
    return () => document.removeEventListener('mousedown', handleClick, true);
  }, [showCatPicker]);

  const handleAddSub = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!subTitle.trim()) return;
    onAddSubtask(subTitle.trim());
    setSubTitle('');
  };

  return (
    <div className={`todo-card ${todo.done ? 'done' : ''} ${isSelected ? 'selected' : ''} ${todo.abandoned ? 'abandoned' : ''}`}>
      {/* Main row */}
      <div className="todo-card-row" onClick={onSelect}>
        <div className="todo-card-status">
          {todo.done ? (
            <button className="status-dot done" onClick={e => { e.stopPropagation(); onToggle(); }} title="取消完成"><Check size={14} /></button>
          ) : todo.abandoned ? (
            <button className="status-dot restore" onClick={e => { e.stopPropagation(); onRestore(); }} title="恢复"><RotateCcw size={12} /></button>
          ) : (
            <>
              <button className="status-dot check" onClick={e => { e.stopPropagation(); onToggle(); }} title="完成">✓</button>
              <button className="status-dot abandon" onClick={e => { e.stopPropagation(); onAbandon(); }} title="放弃">✕</button>
            </>
          )}
        </div>

        <div className="todo-card-body" ref={catPickerRef}>
          {todo.abandoned && <span className="abandoned-tag">已放弃</span>}
          <span className="todo-card-title">{todo.title}</span>
          <span className="todo-card-cat" style={{ color: catColor, borderColor: catColor }}
            onClick={e => { e.stopPropagation(); if (isActive) setShowCatPicker(!showCatPicker); }}>
            {todo.category}
          </span>
          {showCatPicker && isActive && (
            <div className="cat-picker-popup">
              {categories.map(c => (
                <button key={c.name} className="cat-pick-btn" style={{ borderColor: c.color, background: c.name === todo.category ? c.color : undefined, color: c.name === todo.category ? 'white' : undefined }}
                  onClick={e => { e.stopPropagation(); onChangeCategory(c.name); setShowCatPicker(false); }}>
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="todo-card-meta">
          {todo.done && todo.completedAt ? (
            <span className="todo-card-time done-time">{todo.completedAt}</span>
          ) : todo.abandoned && todo.abandonedAt ? (
            <span className="todo-card-time abandoned-time">{todo.abandonedAt}</span>
          ) : todo.createdAt ? (
            <span className="todo-card-time">{todo.createdAt}</span>
          ) : null}
          <span className="todo-card-pom">{todo.completedPomodoros}🍅</span>
        </div>

        <div className="todo-card-actions">
          {isActive && <button className="card-btn" onClick={e => { e.stopPropagation(); onQuickStart(); }} title="开始番茄"><Play size={13} /></button>}
          {isActive && <button className="card-btn" onClick={e => { e.stopPropagation(); setShowSubInput(!showSubInput); }} title="子任务"><Plus size={13} /></button>}
          <button className="card-btn del" onClick={e => { e.stopPropagation(); onDelete(); }} title="删除"><Trash2 size={13} /></button>
        </div>
      </div>

      {/* Subtasks inline */}
      {todo.subtasks.length > 0 && (
        <div className="todo-card-subs">
          {todo.subtasks.map(sub => (
            <div key={sub.id} className={`sub-row ${sub.done ? 'done' : ''} ${sub.abandoned ? 'abandoned' : ''}`}>
              {sub.done ? (
                <button className="sub-dot done" onClick={e => { e.stopPropagation(); onToggleSubtask(sub.id); }}><Check size={10} /></button>
              ) : sub.abandoned ? (
                <button className="sub-dot restore" onClick={e => { e.stopPropagation(); onToggleSubtask(sub.id); }}><RotateCcw size={9} /></button>
              ) : (
                <>
                  <button className="sub-dot check" onClick={e => { e.stopPropagation(); onToggleSubtask(sub.id); }}>✓</button>
                  <button className="sub-dot abandon" onClick={e => { e.stopPropagation(); onAbandonSubtask(sub.id); }}>✕</button>
                </>
              )}
              <span className="sub-text">{sub.title}</span>
              <button className="sub-del" onClick={e => { e.stopPropagation(); onDeleteSubtask(sub.id); }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Subtask input */}
      {showSubInput && isActive && (
        <form className="todo-card-sub-input" onSubmit={handleAddSub}>
          <input className="sub-input" placeholder="子任务名称" value={subTitle}
            onChange={e => setSubTitle(e.target.value)} autoFocus
            onBlur={() => { if (!subTitle.trim()) setShowSubInput(false); }} />
          <button className="sub-confirm" type="submit" disabled={!subTitle.trim()}>✓</button>
        </form>
      )}
    </div>
  );
}
