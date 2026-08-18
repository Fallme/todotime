import { useState } from 'react';
import type { Todo, Category } from '../../types';
import { OTHER_CATEGORY_NAME } from '../../types';
import type { PendingAssignment } from '../../hooks/useTimer';
import { MIN_POMODORO_MINUTES } from '../../utils/pomodoroRules';
import { useLanguage } from '../../i18n/LanguageContext';

interface TaskAssignModalProps {
  assignments: PendingAssignment[];
  todos: Todo[];
  currentTaskId: string | null;
  onAssignAll: (results: { taskId: string | null; taskTitle: string; category: Category }[]) => void;
  onSkip: () => void;
}

export function TaskAssignModal({ assignments, todos, currentTaskId, onAssignAll, onSkip }: TaskAssignModalProps) {
  const { language, t } = useLanguage();
  const msg = (zh: string, en: string) => language === 'zh-CN' ? zh : en;
  const activeTodos = todos.filter(todo => !todo.deletedAt && !todo.done && !todo.abandoned);
  const activeSubtasks = activeTodos.flatMap(todo => todo.subtasks
    .filter(subtask => !subtask.deletedAt && !subtask.done && !subtask.abandoned)
    .map(subtask => ({ ...subtask, category: todo.category, parentTitle: todo.title })));
  const [selectedTodoId, setSelectedTodoId] = useState(currentTaskId ?? '');
  const totalMinutes = assignments.reduce((sum, assignment) => sum + assignment.duration, 0);
  const tomatoCount = assignments.filter(assignment => assignment.duration >= MIN_POMODORO_MINUTES).length;

  const handleAssign = () => {
    const todo = activeTodos.find(item => item.id === selectedTodoId);
    const subtask = activeSubtasks.find(item => item.id === selectedTodoId);
    const result = {
      taskId: todo?.id ?? subtask?.id ?? null,
      taskTitle: todo?.title ?? subtask?.title ?? t('unassigned'),
      category: (todo?.category ?? subtask?.category ?? OTHER_CATEGORY_NAME) as Category,
    };
    if (!result.taskId) return;
    onAssignAll(assignments.map(() => result));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title">{msg('未指派专注已完成', 'Unassigned focus completed')}</h3>
        <p className="modal-desc">
          {assignments.length} {t('focusRecords')} · {t('total')} {totalMinutes} {t('minutesShort')}
          {tomatoCount > 0 ? ` · ${tomatoCount} ${t('pomodoros')}` : ''}
        </p>

        <div className="modal-single-assign">
          <label className="modal-assign-label">{t('assignTo')}</label>
          <select className="modal-assign-select" value={selectedTodoId} onChange={event => setSelectedTodoId(event.target.value)}>
            <option value="">{msg('选择已有任务', 'Choose a task')}</option>
            {activeTodos.map(todo => <option key={todo.id} value={todo.id}>{todo.title} ({todo.category})</option>)}
            {activeSubtasks.map(subtask => <option key={subtask.id} value={subtask.id}>↳ {subtask.title} ({subtask.parentTitle})</option>)}
          </select>
        </div>

        <div className="modal-actions">
          <button className="modal-btn secondary" type="button" onClick={onSkip}>{msg('跳过分配', 'Keep unassigned')}</button>
          <button className="modal-btn primary" type="button" onClick={handleAssign} disabled={!selectedTodoId}>{t('assign')}</button>
        </div>
      </div>
    </div>
  );
}
