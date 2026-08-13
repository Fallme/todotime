import { useState } from 'react';
import type { Todo, Category } from '../../types';
import type { PendingAssignment } from '../../hooks/useTimer';
import { MIN_POMODORO_MINUTES } from '../../utils/pomodoroRules';
import { useLanguage } from '../../i18n/LanguageContext';

interface TaskAssignModalProps {
  assignments: PendingAssignment[];
  todos: Todo[];
  currentTaskId: string | null;
  onAssignAll: (results: { taskId: string | null; taskTitle: string; category: Category }[]) => void;
  onStartNextGroup: () => void;
  onStop: () => void;
  onSelectTask: (id: string | null, title: string, category: Category) => void;
}

export function TaskAssignModal({ assignments, todos, currentTaskId, onAssignAll, onStartNextGroup, onStop, onSelectTask }: TaskAssignModalProps) {
  const { t } = useLanguage();
  const activeTodos = todos.filter(t => !t.deletedAt && !t.done && !t.abandoned);
  const activeSubtasks = activeTodos.flatMap(todo => todo.subtasks
    .filter(subtask => !subtask.deletedAt && !subtask.done && !subtask.abandoned)
    .map(subtask => ({ ...subtask, category: todo.category, parentTitle: todo.title })));
  const [selectedTodoId, setSelectedTodoId] = useState(currentTaskId ?? 'other');
  const totalMinutes = assignments.reduce((s, a) => s + a.duration, 0);
  const tomatoCount = assignments.filter(a => a.duration >= MIN_POMODORO_MINUTES).length;

  const getResult = (todoId: string | null) => {
    const todo = todoId ? activeTodos.find(t => t.id === todoId) : null;
    const subtask = todoId ? activeSubtasks.find(t => t.id === todoId) : null;
    return {
      taskId: todo?.id ?? subtask?.id ?? null,
      taskTitle: todo?.title ?? subtask?.title ?? t('unassigned'),
      category: (todo?.category ?? subtask?.category ?? '其他') as Category,
    };
  };

  const getSelectedTodoId = () => selectedTodoId === 'other' ? null : selectedTodoId || null;

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
    // Set the selected task as current for next group
    onSelectTask(result.taskId, result.taskTitle, result.category);
    onStartNextGroup();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title">{t('groupComplete')}</h3>
        <p className="modal-desc">
          {assignments.length} {t('focusRecords')} · {t('total')} {totalMinutes} {t('minutesShort')}
          {tomatoCount > 0 ? ` · ${tomatoCount} ${t('pomodoros')}` : ''}
        </p>

        <div className="modal-single-assign">
            <label className="modal-assign-label">{t('assignTo')}</label>
            <select className="modal-assign-select" value={selectedTodoId} onChange={e => setSelectedTodoId(e.target.value)}>
              <option value="other">{t('otherUnassigned')}</option>
              {activeTodos.map(t => (
                <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
              ))}
              {activeSubtasks.map(t => (
                <option key={t.id} value={t.id}>↳ {t.title} ({t.parentTitle})</option>
              ))}
            </select>
        </div>

        <div className="modal-actions">
          <button className="modal-btn secondary" onClick={handleAssign}>{t('assign')}</button>
          <button className="modal-btn primary" onClick={handleAssignAndContinue}>{t('assignContinue')}</button>
        </div>
      </div>
    </div>
  );
}
