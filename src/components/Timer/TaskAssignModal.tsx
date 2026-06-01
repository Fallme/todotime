import { useState } from 'react';
import type { Todo, Category } from '../../types';
import type { PendingAssignment } from '../../hooks/useTimer';

interface TaskAssignModalProps {
  assignments: PendingAssignment[];
  todos: Todo[];
  currentTaskName: string | null;
  onAssignAll: (results: { taskId: string | null; taskTitle: string; category: Category }[]) => void;
  onStartNextGroup: () => void;
  onStop: () => void;
}

export function TaskAssignModal({ assignments, todos, currentTaskName, onAssignAll, onStartNextGroup, onStop }: TaskAssignModalProps) {
  const activeTodos = todos.filter(t => !t.done && !t.abandoned);
  const [selectedTodoId, setSelectedTodoId] = useState('');
  const totalMinutes = assignments.reduce((s, a) => s + a.duration, 0);

  const handleContinue = () => {
    // Assign to current task or selected task
    if (currentTaskName) {
      const todo = activeTodos.find(t => t.title === currentTaskName);
      onAssignAll(assignments.map(() => ({
        taskId: todo?.id ?? null,
        taskTitle: currentTaskName,
        category: (todo?.category ?? '其他') as Category,
      })));
    } else if (selectedTodoId) {
      const todo = activeTodos.find(t => t.id === selectedTodoId);
      onAssignAll(assignments.map(() => ({
        taskId: todo?.id ?? null,
        taskTitle: todo?.title ?? '未分配',
        category: (todo?.category ?? '其他') as Category,
      })));
    } else {
      onAssignAll(assignments.map(() => ({
        taskId: null, taskTitle: '未分配', category: '其他' as Category,
      })));
    }
    onStartNextGroup();
  };

  const handleRest = () => {
    // Assign to current task or selected task, then stop
    if (currentTaskName) {
      const todo = activeTodos.find(t => t.title === currentTaskName);
      onAssignAll(assignments.map(() => ({
        taskId: todo?.id ?? null,
        taskTitle: currentTaskName,
        category: (todo?.category ?? '其他') as Category,
      })));
    } else if (selectedTodoId) {
      const todo = activeTodos.find(t => t.id === selectedTodoId);
      onAssignAll(assignments.map(() => ({
        taskId: todo?.id ?? null,
        taskTitle: todo?.title ?? '未分配',
        category: (todo?.category ?? '其他') as Category,
      })));
    } else {
      onAssignAll(assignments.map(() => ({
        taskId: null, taskTitle: '未分配', category: '其他' as Category,
      })));
    }
    onStop();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title">🍅 一组完成！</h3>
        <p className="modal-desc">{assignments.length} 个番茄 · 共 {totalMinutes} 分钟</p>

        {currentTaskName ? (
          <div className="modal-single-assign">
            <span className="modal-assign-label">任务：</span>
            <span className="todo-title">{currentTaskName}</span>
            <span className="modal-auto-label">已自动记录</span>
          </div>
        ) : (
          <div className="modal-single-assign">
            <label className="modal-assign-label">分配给：</label>
            <select className="modal-assign-select" value={selectedTodoId} onChange={e => setSelectedTodoId(e.target.value)}>
              <option value="">选择一个任务...</option>
              {activeTodos.map(t => (
                <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
              ))}
            </select>
          </div>
        )}

        <div className="modal-actions">
          <button className="modal-btn primary" onClick={handleContinue}>
            {currentTaskName ? '继续专注' : '分配并继续'}
          </button>
          <button className="modal-btn secondary" onClick={handleRest}>
            {currentTaskName ? '休息' : '分配并休息'}
          </button>
        </div>
      </div>
    </div>
  );
}
