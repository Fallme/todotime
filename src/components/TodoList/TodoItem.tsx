import { Check, Trash2, Circle, Play, X } from 'lucide-react';
import type { Todo } from '../../types';
import { CATEGORY_COLORS } from '../../types';

interface TodoItemProps {
  todo: Todo;
  isSelected: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onAbandon: () => void;
  onQuickStart: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#FF6B6B',
  medium: '#FECA57',
  low: '#48DBFB',
};

export function TodoItem({ todo, isSelected, onToggle, onDelete, onSelect, onAbandon, onQuickStart }: TodoItemProps) {
  const isFailed = todo.abandoned || (todo.estimatedPomodoros > 0 && todo.completedPomodoros >= todo.estimatedPomodoros && !todo.done);

  return (
    <div className={`todo-item ${todo.done ? 'done' : ''} ${isSelected ? 'selected' : ''} ${todo.abandoned ? 'abandoned' : ''}`}>
      <button className="todo-check" onClick={onToggle}>
        {todo.done ? <Check size={16} className="check-done" /> : <Circle size={16} style={{ color: PRIORITY_COLORS[todo.priority] }} />}
      </button>

      <div className="todo-content" onClick={onSelect}>
        <div className="todo-title-row">
          {isFailed && <span className="fail-marker">⚠</span>}
          <span className="todo-title">{todo.title}</span>
          <span className="category-badge" style={{ background: CATEGORY_COLORS[todo.category] }}>{todo.category}</span>
        </div>
        <div className="todo-meta">
          <span className="todo-pom-progress">
            {todo.completedPomodoros} 🍅
          </span>
        </div>
      </div>

      <div className="todo-actions">
        {!todo.done && !todo.abandoned && (
          <button className="todo-action-btn start" onClick={e => { e.stopPropagation(); onQuickStart(); }} title="以该任务开始番茄">
            <Play size={14} />
          </button>
        )}
        <button className="todo-action-btn delete" onClick={e => { e.stopPropagation(); onDelete(); }} title="删除">
          <Trash2 size={14} />
        </button>
        {!todo.done && !todo.abandoned && (
          <button className="todo-action-btn abandon" onClick={e => { e.stopPropagation(); onAbandon(); }} title="放弃">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
