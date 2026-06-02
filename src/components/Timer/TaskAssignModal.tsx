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
  onResetCycle: () => void;
}

export function TaskAssignModal({ assignments, todos, currentTaskName, onAssignAll, onStartNextGroup, onStop }: TaskAssignModalProps) {
  const activeTodos = todos.filter(t => !t.done && !t.abandoned);
  const [selectedTodoId, setSelectedTodoId] = useState('');
  const totalMinutes = assignments.reduce((s, a) => s + a.duration, 0);

  const getResult = (todoId: string | null) => {
    const todo = todoId ? activeTodos.find(t => t.id === todoId) : null;
    return {
      taskId: todo?.id ?? null,
      taskTitle: todo?.title ?? '未分配',
      category: (todo?.category ?? '数学') as Category,
    };
  };

  const getSelectedTodoId = () => {
    if (currentTaskName) {
      const todo = activeTodos.find(t => t.title === currentTaskName);
      return todo?.id ?? null;
    }
    return selectedTodoId || null;
  };

  // 分配：分配并关闭，番茄恢复初始
  const handleAssign = () => {
    const result = getResult(getSelectedTodoId());
    onAssignAll(assignments.map(() => result));
    onStop();
  };

  // 分配并继续：分配后以当前任务继续下一轮
  const handleAssignAndContinue = () => {
    const result = getResult(getSelectedTodoId());
    onAssignAll(assignments.map(() => result));
    onStartNextGroup();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title">🍅 一组完成！</h3>
        <p className="modal-desc">{assignments.length} 个番茄 · 共 {totalMinutes} 分钟</p>

        {currentTaskName ? (
          <div className="modal-single-assign">
            <span className="modal-assign-label">任务：</span>
            <span className="modal-auto-label">{currentTaskName}</span>
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
          <button className="modal-btn secondary" onClick={handleAssign}>分配</button>
          <button className="modal-btn primary" onClick={handleAssignAndContinue}>分配并继续</button>
        </div>
      </div>
    </div>
  );
}
