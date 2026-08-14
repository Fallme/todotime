import { useMemo, useState } from 'react';
import { Clock3, Plus } from 'lucide-react';
import type { Category, CategoryItem, Todo } from '../../types';
import { MIN_POMODORO_MINUTES } from '../../utils/pomodoroRules';
import { resolveManualFocusCategory } from '../../utils/manualFocus';
import { useLanguage } from '../../i18n/LanguageContext';

export interface ManualFocusInput {
  duration: number;
  endAt: string;
  taskId: string | null;
  newTaskTitle: string;
  category: Category;
}

interface ManualFocusModalProps {
  todos: Todo[];
  categories: CategoryItem[];
  onSave: (input: ManualFocusInput) => void;
  onClose: () => void;
}

function localDateTimeValue(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function ManualFocusModal({ todos, categories, onSave, onClose }: ManualFocusModalProps) {
  const { language } = useLanguage();
  const msg = (zh: string, en: string) => language === 'zh-CN' ? zh : en;
  const activeTodos = useMemo(() => todos.filter(todo => !todo.deletedAt && !todo.done && !todo.abandoned), [todos]);
  const [assignment, setAssignment] = useState('none');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [duration, setDuration] = useState(25);
  const [endAt, setEndAt] = useState(localDateTimeValue);
  const [category, setCategory] = useState<Category>(categories[0]?.name ?? '其他');
  const [error, setError] = useState('');
  const tomatoCount = duration >= MIN_POMODORO_MINUTES ? 1 : 0;
  const selectedTodo = activeTodos.find(todo => todo.id === assignment);

  const submit = () => {
    const safeDuration = Math.floor(Number(duration));
    if (!Number.isFinite(safeDuration) || safeDuration < 1 || safeDuration > 1440) {
      setError(msg('时长需要在 1–1440 分钟之间', 'Duration must be between 1 and 1440 minutes.'));
      return;
    }
    if (!endAt || Number.isNaN(new Date(endAt).getTime())) {
      setError(msg('请选择有效的结束时间', 'Choose a valid end time.'));
      return;
    }
    if (assignment === 'new' && !newTaskTitle.trim()) {
      setError(msg('请输入新任务名称', 'Enter a name for the new task.'));
      return;
    }
    onSave({
      duration: safeDuration,
      endAt,
      taskId: assignment === 'new' || assignment === 'none' ? null : assignment,
      newTaskTitle: assignment === 'new' ? newTaskTitle.trim() : '',
      category: resolveManualFocusCategory(assignment, activeTodos, category),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content manual-focus-modal" onClick={event => event.stopPropagation()}>
        <div className="manual-focus-heading">
          <span><Clock3 size={19} /></span>
          <div>
            <h3 className="modal-title">{msg('手动补录专注', 'Add focus manually')}</h3>
            <p className="modal-desc">{msg('补记遗漏的专注时间，并自动计入任务和统计。', 'Record missed focus time and add it to tasks and insights.')}</p>
          </div>
        </div>

        <div className="manual-focus-grid">
          <label>
            <span>{msg('专注时长', 'Focus duration')}</span>
            <div className="manual-duration-field"><input type="number" min="1" max="1440" value={duration} onChange={event => setDuration(Number(event.target.value))} /><em>{msg('分钟', 'min')}</em></div>
          </label>
          <label>
            <span>{msg('结束时间', 'End time')}</span>
            <input type="datetime-local" value={endAt} max={localDateTimeValue()} onChange={event => setEndAt(event.target.value)} />
          </label>
          <label className="manual-focus-wide">
            <span>{msg('分配给', 'Assign to')}</span>
            <select value={assignment} onChange={event => setAssignment(event.target.value)}>
              <option value="none">{msg('不关联任务（默认）', 'No task (default)')}</option>
              {activeTodos.map(todo => <option key={todo.id} value={todo.id}>{todo.title}（{todo.category}）</option>)}
              <option value="new">＋ {msg('新建任务', 'Create a new task')}</option>
            </select>
          </label>
          {selectedTodo && (
            <div className="manual-derived-category manual-focus-wide">
              <span>{msg('自动使用任务类别', 'Task category selected automatically')}</span>
              <strong>{selectedTodo.category}</strong>
            </div>
          )}
          {assignment === 'new' && (
            <>
              <label className="manual-focus-wide">
                <span>{msg('新任务名称', 'New task name')}</span>
                <div className="manual-new-task-field"><Plus size={16} /><input autoFocus maxLength={80} value={newTaskTitle} placeholder={msg('例如：整理复习笔记', 'For example: Review project notes')} onChange={event => setNewTaskTitle(event.target.value)} /></div>
              </label>
              <label className="manual-focus-wide">
                <span>{msg('新任务类别', 'New task category')}</span>
                <select value={category} onChange={event => setCategory(event.target.value)}>
                  {categories.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
                </select>
              </label>
            </>
          )}
        </div>

        <div className={`manual-pomodoro-rule ${tomatoCount ? 'counts' : ''}`}>
          <span>🍅</span>
          <p>{tomatoCount
            ? msg(`本次将计入 1 个番茄（已满 ${MIN_POMODORO_MINUTES} 分钟）`, `This entry counts as 1 pomodoro (${MIN_POMODORO_MINUTES}+ minutes).`)
            : msg(`本次记录时长，但未满 ${MIN_POMODORO_MINUTES} 分钟，不计番茄`, `Focus time will be saved, but under ${MIN_POMODORO_MINUTES} minutes does not count as a pomodoro.`)}</p>
        </div>
        {error && <p className="manual-focus-error">{error}</p>}
        <div className="modal-actions">
          <button className="modal-btn secondary" type="button" onClick={onClose}>{msg('取消', 'Cancel')}</button>
          <button className="modal-btn primary" type="button" onClick={submit}>{msg('保存补录', 'Save entry')}</button>
        </div>
      </div>
    </div>
  );
}
