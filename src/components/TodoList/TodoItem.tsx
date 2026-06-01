import { Check, Trash2, Circle, Play, X, RotateCcw } from 'lucide-react';
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

const PRIORITY_COLORS: Record<string, string> = {
  high: '#FF6B6B',
  medium: '#FECA57',
  low: '#48DBFB',
};

export function TodoItem({ todo, isSelected, onToggle, onDelete, onSelect, onAbandon, onRestore, onQuickStart }: TodoItemProps) {
  return (
    <div className={`todo-item ${todo.done ? 'done' : ''} ${isSelected ? 'selected' : ''} ${todo.abandoned ? 'abandoned' : ''}`}>
      <button className="todo-col todo-check" onClick={onToggle}>
        {todo.done
          ? <Check size={16} className="check-done" />
          : <Circle size={16} style={{ color: PRIORITY_COLORS[todo.priority] }} />
        }
      </button>

      <div className="todo-col todo-content" onClick={onSelect}>
        {todo.abandoned && <span className="abandoned-label">已放弃</span>}
        <span className="todo-title">{todo.title}</span>
        <span className="category-badge" style={{ background: CATEGORY_COLORS[todo.category] }}>{todo.category}</span>
      </div>

      <div className="todo-col todo-count">
        {todo.completedPomodoros} 🍅
      </div>

      <div className="todo-col todo-actions">
        {todo.abandoned ? (
          <button className="todo-action-btn restore" onClick={e => { e.stopPropagation(); onRestore(); }} title="恢复">
            <RotateCcw size={14} />
          </button>
        ) : !todo.done ? (
          <button className="todo-action-btn start" onClick={e => { e.stopPropagation(); onQuickStart(); }} title="开始番茄">
            <Play size={14} />
          </button>
        ) : null}
        {!todo.abandoned && !todo.done && (
          <button className="todo-action-btn abandon" onClick={e => { e.stopPropagation(); onAbandon(); }} title="放弃">
            <X size={14} />
          </button>
        )}
        <button className="todo-action-btn delete" onClick={e => { e.stopPropagation(); onDelete(); }} title="删除">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
