import { Check, Trash2, Play, RotateCcw } from 'lucide-react';
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
}

export function TodoItem({ todo, isSelected, onToggle, onDelete, onSelect, onAbandon, onRestore, onQuickStart }: TodoItemProps) {
  const isActive = !todo.done && !todo.abandoned;

  return (
    <div className={`todo-item ${todo.done ? 'done' : ''} ${isSelected ? 'selected' : ''} ${todo.abandoned ? 'abandoned' : ''}`}>
      {/* Col 1: Abandon (✕) for active / Check (✓) for done / Circle for abandoned */}
      <button className="todo-col todo-col-status" onClick={onToggle}>
        {todo.done ? (
          <Check size={16} className="check-done" />
        ) : todo.abandoned ? (
          <RotateCcw size={14} className="restore-dot" onClick={e => { e.stopPropagation(); onRestore(); }} />
        ) : (
          <button className="abandon-dot" onClick={e => { e.stopPropagation(); onAbandon(); }} title="放弃">
            ✕
          </button>
        )}
      </button>

      {/* Col 2: Title + Badge */}
      <div className="todo-col todo-content" onClick={onSelect}>
        {todo.abandoned && <span className="abandoned-label">已放弃</span>}
        <span className="todo-title">{todo.title}</span>
        <span className="category-badge" style={{ background: CATEGORY_COLORS[todo.category] }}>{todo.category}</span>
      </div>

      {/* Col 3: Tomato count */}
      <div className="todo-col todo-count">
        {todo.completedPomodoros} 🍅
      </div>

      {/* Col 4: Actions */}
      <div className="todo-col todo-actions">
        {isActive && (
          <button className="todo-action-btn start" onClick={e => { e.stopPropagation(); onQuickStart(); }} title="开始番茄">
            <Play size={14} />
          </button>
        )}
        <button className="todo-action-btn delete" onClick={e => { e.stopPropagation(); onDelete(); }} title="删除">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
