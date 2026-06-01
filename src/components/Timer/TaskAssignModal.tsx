import { useState } from 'react';
import type { Todo, Category } from '../../types';
import { CATEGORY_COLORS } from '../../types';
import type { PendingAssignment } from '../../hooks/useTimer';

interface TaskAssignModalProps {
  assignments: PendingAssignment[];
  todos: Todo[];
  onAssignAll: (results: { taskId: string | null; taskTitle: string; category: Category }[]) => void;
  onStartNextGroup: () => void;
}

export function TaskAssignModal({ assignments, todos, onAssignAll, onStartNextGroup }: TaskAssignModalProps) {
  const activeTodos = todos.filter(t => !t.done && !t.abandoned);
  const [selections, setSelections] = useState<(string | null)[]>(() => assignments.map(() => null));
  const totalMinutes = assignments.reduce((s, a) => s + a.duration, 0);

  const setSelection = (index: number, todoId: string | null) => {
    setSelections(prev => { const n = [...prev]; n[index] = todoId; return n; });
  };

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
        <h3 className="modal-title">🍅 一组完成！</h3>
        <p className="modal-desc">{assignments.length} 个番茄 · 共 {totalMinutes} 分钟</p>

        {assignments.length > 1 && (
          <div className="batch-assign-all">
            <span className="batch-label">统一分配：</span>
            {activeTodos.slice(0, 4).map(t => (
              <button key={t.id} className="batch-chip"
                style={{ borderColor: CATEGORY_COLORS[t.category] }}
                onClick={() => setAllTo(t.id)}
              >{t.title}</button>
            ))}
            <button className="batch-chip" onClick={() => setAllTo(null)}>未分类</button>
          </div>
        )}

        <div className="modal-pom-list">
          {assignments.map((pa, i) => (
            <div key={i} className="modal-pom-item">
              <span className="modal-pom-num">#{i + 1}</span>
              <span className="modal-pom-time">{pa.duration}min</span>
              <select className="modal-pom-select" value={selections[i] || ''} onChange={e => setSelection(i, e.target.value || null)}>
                <option value="">选择任务...</option>
                {activeTodos.map(t => (
                  <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="modal-btn primary" onClick={handleConfirm}>分配并休息</button>
          <button className="modal-btn secondary" onClick={() => {
            onAssignAll(assignments.map(() => ({ taskId: null, taskTitle: '未分类专注', category: '其他' as Category })));
          }}>全部跳过</button>
        </div>
        <div className="modal-actions" style={{ marginTop: '8px' }}>
          <button className="modal-btn accent" onClick={onStartNextGroup}>再来一轮</button>
        </div>
      </div>
    </div>
  );
}
