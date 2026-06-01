import { useState } from 'react';
import { Check, Trash2, Play, RotateCcw, Plus, X } from 'lucide-react';
import type { Todo } from '../../types';
import { CATEGORY_COLORS } from '../../types';

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
  onDeleteSubtask: (subId: string) => void;
}

export function TodoItem({ todo, isSelected, onToggle, onDelete, onSelect, onAbandon, onRestore, onQuickStart, onAddSubtask, onToggleSubtask, onDeleteSubtask }: TodoItemProps) {
  const [showSubInput, setShowSubInput] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const isActive = !todo.done && !todo.abandoned;
  const doneCount = todo.subtasks.filter(s => s.done).length;

  const handleAddSub = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!subTitle.trim()) return;
    onAddSubtask(subTitle.trim());
    setSubTitle('');
  };

  return (
    <div className={`todo-item-wrapper ${todo.done ? 'done' : ''} ${isSelected ? 'selected' : ''} ${todo.abandoned ? 'abandoned' : ''}`}>
      <div className="todo-item-main" onClick={onSelect}>
        {/* Col 1: Status */}
        <button className="todo-col todo-col-status" onClick={e => { e.stopPropagation(); onToggle(); }}>
          {todo.done ? <Check size={16} className="check-done" />
            : todo.abandoned ? <RotateCcw size={14} className="restore-dot" onClick={ev => { ev.stopPropagation(); onRestore(); }} />
            : <button className="abandon-dot" onClick={ev => { ev.stopPropagation(); onAbandon(); }} title="放弃">✕</button>
          }
        </button>

        {/* Col 2: Title + Badge */}
        <div className="todo-col todo-content">
          {todo.abandoned && <span className="abandoned-label">已放弃</span>}
          <span className="todo-title">{todo.title}</span>
          <span className="category-badge" style={{ background: CATEGORY_COLORS[todo.category] }}>{todo.category}</span>
        </div>

        {/* Col 3: Count */}
        <div className="todo-col todo-count">
          {todo.completedPomodoros} 🍅
          {todo.subtasks.length > 0 && <span className="sub-count">{doneCount}/{todo.subtasks.length}</span>}
        </div>

        {/* Col 4: Actions */}
        <div className="todo-col todo-actions">
          {isActive && <button className="todo-action-btn start" onClick={e => { e.stopPropagation(); onQuickStart(); }} title="开始番茄"><Play size={14} /></button>}
          <button className="todo-action-btn delete" onClick={e => { e.stopPropagation(); onDelete(); }} title="删除"><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Subtasks */}
      {todo.subtasks.length > 0 && (
        <div className="subtask-list">
          {todo.subtasks.map(sub => (
            <div key={sub.id} className={`subtask-item ${sub.done ? 'done' : ''}`}>
              <button className="subtask-check" onClick={e => { e.stopPropagation(); onToggleSubtask(sub.id); }}>
                {sub.done ? <Check size={12} className="check-done" /> : <span className="subtask-circle" />}
              </button>
              <span className="subtask-title">{sub.title}</span>
              <button className="subtask-delete" onClick={e => { e.stopPropagation(); onDeleteSubtask(sub.id); }}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Add subtask */}
      {isActive && (
        <div className="subtask-add-row">
          {showSubInput ? (
            <form className="subtask-add-form" onSubmit={handleAddSub}>
              <input className="subtask-add-input" placeholder="子任务名称..." value={subTitle}
                onChange={e => setSubTitle(e.target.value)} autoFocus
                onBlur={() => { if (!subTitle.trim()) setShowSubInput(false); }} />
              <button className="subtask-add-confirm" type="submit" disabled={!subTitle.trim()}><Check size={14} /></button>
            </form>
          ) : (
            <button className="subtask-add-btn" onClick={e => { e.stopPropagation(); setShowSubInput(true); }}>
              <Plus size={12} /> 添加子任务
            </button>
          )}
        </div>
      )}
    </div>
  );
}
