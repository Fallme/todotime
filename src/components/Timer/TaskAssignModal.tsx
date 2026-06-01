import { useState } from 'react';
import type { Todo, Category } from '../../types';
import { CATEGORY_COLORS } from '../../types';
import type { PendingAssignment } from '../../hooks/useTimer';

interface TaskAssignModalProps {
  assignments: PendingAssignment[];
  todos: Todo[];
  currentTaskName: string | null;
  onAssignAll: (results: { taskId: string | null; taskTitle: string; category: Category }[]) => void;
  onStartNextGroup: () => void;
}

export function TaskAssignModal({ assignments, todos, currentTaskName, onAssignAll, onStartNextGroup }: TaskAssignModalProps) {
  const totalMinutes = assignments.reduce((s, a) => s + a.duration, 0);
  const hasTask = !!currentTaskName;

  // If task is already selected → just show summary + 再来一轮
  if (hasTask) {
    const todo = todos.find(t => t.title === currentTaskName);
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3 className="modal-title">🍅 一组完成！</h3>
          <p className="modal-desc">{assignments.length} 个番茄 · 共 {totalMinutes} 分钟</p>
          <div className="modal-single-assign">
            <span className="modal-assign-label">任务：</span>
            <span className="todo-title">{currentTaskName}</span>
            {todo && <span className="category-badge" style={{ background: CATEGORY_COLORS[todo.category] }}>{todo.category}</span>}
          </div>
          <p className="modal-desc" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>已自动分配，无需手动选择</p>
          <div className="modal-actions">
            <button className="modal-btn primary" onClick={onStartNextGroup}>再来一轮</button>
          </div>
        </div>
      </div>
    );
  }

  // No task → show task picker
  const activeTodos = todos.filter(t => !t.done && !t.abandoned);
  const [selectedTodoId, setSelectedTodoId] = useState('');

  const handleConfirm = () => {
    const todo = selectedTodoId ? activeTodos.find(t => t.id === selectedTodoId) : null;
    const result = {
      taskId: todo?.id ?? null,
      taskTitle: todo?.title ?? '未分类专注',
      category: (todo?.category ?? '其他') as Category,
    };
    onAssignAll(assignments.map(() => result));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title">🍅 一组完成！</h3>
        <p className="modal-desc">{assignments.length} 个番茄 · 共 {totalMinutes} 分钟</p>

        <div className="modal-single-assign">
          <label className="modal-assign-label">分配给：</label>
          <select className="modal-assign-select" value={selectedTodoId} onChange={e => setSelectedTodoId(e.target.value)}>
            <option value="">选择一个任务...</option>
            {activeTodos.map(t => (
              <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
            ))}
          </select>
          {selectedTodoId && (() => {
            const todo = activeTodos.find(t => t.id === selectedTodoId);
            return todo ? <span className="category-badge" style={{ background: CATEGORY_COLORS[todo.category] }}>{todo.category}</span> : null;
          })()}
        </div>

        <div className="modal-actions">
          <button className="modal-btn primary" onClick={handleConfirm}>分配</button>
          <button className="modal-btn secondary" onClick={() => {
            onAssignAll(assignments.map(() => ({ taskId: null, taskTitle: '未分类专注', category: '其他' as Category })));
          }}>跳过分配</button>
        </div>
        <div className="modal-actions" style={{ marginTop: '8px' }}>
          <button className="modal-btn accent" onClick={onStartNextGroup}>再来一轮</button>
        </div>
      </div>
    </div>
  );
}
