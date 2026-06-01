import { useState } from 'react';
import { Check, Trash2, Play, RotateCcw, Plus } from 'lucide-react';
import type { Todo, Category } from '../../types';
import { CATEGORIES, CATEGORY_COLORS } from '../../types';

interface TodoItemProps {
  todo: Todo;
  isSelected: boolean;
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

export function TodoItem({ todo, isSelected, onToggle, onDelete, onSelect, onAbandon, onRestore, onQuickStart, onAddSubtask, onToggleSubtask, onAbandonSubtask, onDeleteSubtask, onChangeCategory }: TodoItemProps) {
  const [showSubInput, setShowSubInput] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const isActive = !todo.done && !todo.abandoned;
  const doneCount = todo.subtasks.filter(s => s.done).length;

  const handleAddSub = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!subTitle.trim()) return;
    onAddSubtask(subTitle.trim());
    setSubTitle('');
  };

  const handleCatChange = (cat: Category) => {
    onChangeCategory(cat);
    setShowCatPicker(false);
  };

  return (
    <div className={`todo-item-wrapper ${todo.done ? 'done' : ''} ${isSelected ? 'selected' : ''} ${todo.abandoned ? 'abandoned' : ''}`}>
      <div className="todo-item-main">
        {/* Col 1: Status */}
        <div className="todo-col todo-col-status">
          {todo.done ? (
            <button className="status-btn done" onClick={e => { e.stopPropagation(); onToggle(); }} title="取消完成"><Check size={16} /></button>
          ) : todo.abandoned ? (
            <button className="status-btn restore" onClick={e => { e.stopPropagation(); onRestore(); }} title="恢复"><RotateCcw size={14} /></button>
          ) : (
            <>
              <button className="status-btn check" onClick={e => { e.stopPropagation(); onToggle(); }} title="完成">✓</button>
              <button className="status-btn abandon" onClick={e => { e.stopPropagation(); onAbandon(); }} title="放弃">✕</button>
            </>
          )}
        </div>

        {/* Col 2: Title + Category (clickable) */}
        <div className="todo-col todo-content" onClick={onSelect}>
          {todo.abandoned && <span className="abandoned-label">已放弃</span>}
          <span className="todo-title">{todo.title}</span>
          <span className="category-badge clickable" style={{ background: CATEGORY_COLORS[todo.category] }}
            onClick={e => { e.stopPropagation(); if (isActive) setShowCatPicker(!showCatPicker); }}>
            {todo.category}
          </span>
          {showCatPicker && isActive && (
            <div className="cat-picker-popup" onClick={e => e.stopPropagation()}>
              {CATEGORIES.map(cat => (
                <button key={cat} className={`cat-pick-btn ${cat === todo.category ? 'active' : ''}`}
                  style={cat === todo.category ? { background: CATEGORY_COLORS[cat], color: 'white' } : { borderColor: CATEGORY_COLORS[cat] }}
                  onClick={() => handleCatChange(cat)}>
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Col 3: Count */}
        <div className="todo-col todo-count">
          {todo.completedPomodoros} 🍅
          {todo.subtasks.length > 0 && <span className="sub-count">{doneCount}/{todo.subtasks.length}</span>}
        </div>

        {/* Col 4: Actions */}
        <div className="todo-col todo-actions">
          {isActive && <button className="todo-action-btn add-sub" onClick={e => { e.stopPropagation(); setShowSubInput(!showSubInput); }} title="添加子任务"><Plus size={14} /></button>}
          {isActive && <button className="todo-action-btn start" onClick={e => { e.stopPropagation(); onQuickStart(); }} title="开始番茄"><Play size={14} /></button>}
          <button className="todo-action-btn delete" onClick={e => { e.stopPropagation(); onDelete(); }} title="删除"><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Inline subtask input */}
      {showSubInput && isActive && (
        <form className="subtask-input-inline" onSubmit={handleAddSub}>
          <input className="subtask-input" placeholder="子任务名称" value={subTitle}
            onChange={e => setSubTitle(e.target.value)} autoFocus
            onBlur={() => { if (!subTitle.trim()) setShowSubInput(false); }} />
          <button className="subtask-confirm" type="submit" disabled={!subTitle.trim()}>✓</button>
        </form>
      )}

      {/* Subtask list */}
      {todo.subtasks.length > 0 && (
        <div className="subtask-list-inline">
          {todo.subtasks.map(sub => (
            <div key={sub.id} className={`subtask-row ${sub.done ? 'done' : ''} ${sub.abandoned ? 'abandoned' : ''}`}>
              <button className="subtask-check" onClick={e => { e.stopPropagation(); onToggleSubtask(sub.id); }}>
                {sub.done ? <Check size={11} className="check-done" /> : <span className="subtask-circle" />}
              </button>
              <span className="subtask-text">{sub.title}</span>
              {!sub.done && !sub.abandoned && (
                <button className="subtask-abandon" onClick={e => { e.stopPropagation(); onAbandonSubtask(sub.id); }} title="放弃">✕</button>
              )}
              {sub.abandoned && <span className="subtask-abandoned-tag">放弃</span>}
              <button className="subtask-del" onClick={e => { e.stopPropagation(); onDeleteSubtask(sub.id); }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
