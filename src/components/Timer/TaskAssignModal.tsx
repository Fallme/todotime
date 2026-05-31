import { useState } from 'react';
import type { Todo, Category } from '../../types';
import { CATEGORY_COLORS } from '../../types';
import type { PendingAssignment } from '../../hooks/useTimer';

interface TaskAssignModalProps {
  assignments: PendingAssignment[];
  todos: Todo[];
  onAssignAll: (results: { taskId: string | null; taskTitle: string; category: Category }[]) => void;
}

export function TaskAssignModal({ assignments, todos, onAssignAll }: TaskAssignModalProps) {
  const activeTodos = todos.filter(t => !t.done && !t.abandoned);
  // Each pomodoro gets its own selection
  const [selections, setSelections] = useState<(string | null)[]>(
    () => assignments.map(() => null)
  );

  const totalMinutes = assignments.reduce((s, a) => s + a.duration, 0);

  const setSelection = (index: number, todoId: string | null) => {
    setSelections(prev => {
      const next = [...prev];
      next[index] = todoId;
      return next;
    });
  };

  // Batch set all to same todo
  const setAllTo = (todoId: string | null) => {
    setSelections(assignments.map(() => todoId));
  };

  const handleConfirm = () => {
    const results = selections.map((todoId) => {
      const todo = todoId ? activeTodos.find(t => t.id === todoId) : null;
      return {
        taskId: todo?.id ?? null,
        taskTitle: todo?.title ?? '未分类专注',
        category: (todo?.category ?? '其他') as Category,
      };
    });
    onAssignAll(results);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title">🍅 番茄完成！</h3>
        <p className="modal-desc">
          {assignments.length} 个番茄 · 共 {totalMinutes} 分钟
          {assignments.length > 1 && ' — 可逐个分配或统一归入同一任务'}
        </p>

        {assignments.length > 1 && (
          <div className="batch-assign-all">
            <span className="batch-label">统一分配给：</span>
            {activeTodos.slice(0, 4).map(t => (
              <button key={t.id} className="batch-chip"
                style={{ borderColor: CATEGORY_COLORS[t.category] }}
                onClick={() => setAllTo(t.id)}
              >{t.title}</button>
            ))}
            <button className="batch-chip" onClick={() => setAllTo(null)}>未分类</button>
          </div>
        )}

        <div className="modal-todo-list">
          {assignments.map((pa, i) => {
            const selected = selections[i];
            const todo = selected ? activeTodos.find(t => t.id === selected) : null;
            return (
              <div key={i} className="modal-pom-item">
                <span className="modal-pom-num">#{i + 1}</span>
                <span className="modal-pom-time">{pa.duration}min</span>
                <select
                  className="modal-pom-select"
                  value={selected || ''}
                  onChange={e => setSelection(i, e.target.value || null)}
                >
                  <option value="">选择任务...</option>
                  {activeTodos.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                  ))}
                </select>
                {todo && (
                  <span className="category-badge" style={{ background: CATEGORY_COLORS[todo.category], fontSize: '11px' }}>{todo.category}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="modal-actions">
          <button className="modal-btn primary" onClick={handleConfirm}>
            确认分配 ({assignments.length})
          </button>
          <button className="modal-btn secondary" onClick={() => {
            onAssignAll(assignments.map(() => ({ taskId: null, taskTitle: '未分类专注', category: '其他' as Category })));
          }}>
            全部跳过
          </button>
        </div>
      </div>
    </div>
  );
}
