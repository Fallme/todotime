import { useState } from 'react';
import type { Todo, Category } from '../../types';
import { CATEGORIES, CATEGORY_COLORS } from '../../types';

interface TaskAssignModalProps {
  duration: number;
  todos: Todo[];
  onAssign: (taskId: string | null, taskTitle: string, category: Category) => void;
}

export function TaskAssignModal({ duration, todos, onAssign }: TaskAssignModalProps) {
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState<Category>('其他');
  const activeTodos = todos.filter(t => !t.done);
  const selectedTodo = activeTodos.find(t => t.id === selectedTodoId);

  return (
    <div className="modal-overlay" onClick={() => onAssign(null, '未分类专注', customCategory)}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">🍅 番茄完成！({duration}分钟)</h3>
        <p className="modal-desc">选择这个番茄分配给哪个任务：</p>

        <div className="modal-todo-list">
          {activeTodos.map(todo => (
            <button
              key={todo.id}
              className={`modal-todo-item ${todo.id === selectedTodoId ? 'selected' : ''}`}
              onClick={() => setSelectedTodoId(todo.id === selectedTodoId ? null : todo.id)}
            >
              <span className="category-badge" style={{ background: CATEGORY_COLORS[todo.category] }}>{todo.category}</span>
              <span className="modal-todo-title">{todo.title}</span>
              <span className="modal-todo-progress">{todo.completedPomodoros}/{todo.estimatedPomodoros}</span>
            </button>
          ))}
        </div>

        <div className="modal-category-select">
          <label>分类：</label>
          <select
            value={selectedTodo?.category || customCategory}
            onChange={e => setCustomCategory(e.target.value as Category)}
            disabled={!!selectedTodo}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="modal-actions">
          <button
            className="modal-btn primary"
            onClick={() => {
              if (selectedTodo) {
                onAssign(selectedTodo.id, selectedTodo.title, selectedTodo.category);
              } else {
                onAssign(null, '未分类专注', customCategory);
              }
            }}
          >
            确认分配
          </button>
          <button className="modal-btn secondary" onClick={() => onAssign(null, '未分类专注', customCategory)}>
            跳过
          </button>
        </div>
      </div>
    </div>
  );
}
