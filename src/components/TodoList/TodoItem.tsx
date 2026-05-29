import { Check, Trash2, Circle } from 'lucide-react';
import type { Todo } from '../../types';
import { CATEGORY_COLORS } from '../../types';

interface TodoItemProps {
  todo: Todo;
  isSelected: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onSelect: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#FF6B6B',
  medium: '#FECA57',
  low: '#48DBFB',
};

export function TodoItem({ todo, isSelected, onToggle, onDelete, onSelect }: TodoItemProps) {
  return (
    <div className={`todo-item ${todo.done ? 'done' : ''} ${isSelected ? 'selected' : ''}`}>
      <button className="todo-check" onClick={onToggle}>
        {todo.done ? <Check size={16} className="check-done" /> : <Circle size={16} style={{ color: PRIORITY_COLORS[todo.priority] }} />}
      </button>
      <div className="todo-content" onClick={onSelect}>
        <div className="todo-title-row">
          <span className="todo-title">{todo.title}</span>
          <span className="category-badge" style={{ background: CATEGORY_COLORS[todo.category] }}>{todo.category}</span>
        </div>
        <div className="todo-meta">
          <span className="todo-pom-progress">
            {todo.completedPomodoros}/{todo.estimatedPomodoros} 🍅
          </span>
        </div>
      </div>
      <div className="todo-priority-dot" style={{ background: PRIORITY_COLORS[todo.priority] }} />
      <button className="todo-delete" onClick={onDelete} title="删除"><Trash2 size={14} /></button>
    </div>
  );
}
