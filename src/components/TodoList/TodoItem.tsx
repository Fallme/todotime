import { useState, useRef, useEffect } from 'react';
import { Check, Trash2, Play, RotateCcw, Plus, Repeat2 } from 'lucide-react';
import type { Todo, Category, CategoryItem, TaskRecurrence } from '../../types';
import { getCategoryColor } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

function formatIsoTime(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${m}-${day} ${h}:${min}`;
  } catch { return iso; }
}

interface TodoItemProps {
  todo: Todo;
  isSelected: boolean;
  categories: CategoryItem[];
  onToggle: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onAbandon: () => void;
  onRestore: () => void;
  onQuickStart: () => void;
  onQuickStartSubtask: (subtask: { id: string; title: string; category: Category }) => void;
  onAddSubtask: (title: string) => void;
  onToggleSubtask: (subId: string) => void;
  onAbandonSubtask: (subId: string) => void;
  onRestoreSubtask: (subId: string) => void;
  onDeleteSubtask: (subId: string) => void;
  onChangeCategory: (category: Category) => void;
  onChangeRecurrence: (recurrence: TaskRecurrence) => void;
}

export function TodoItem({ todo, isSelected, categories, onToggle, onDelete, onSelect, onAbandon, onRestore, onQuickStart, onQuickStartSubtask, onAddSubtask, onToggleSubtask, onAbandonSubtask, onRestoreSubtask, onDeleteSubtask, onChangeCategory, onChangeRecurrence }: TodoItemProps) {
  const { language, t } = useLanguage();
  const [showSubInput, setShowSubInput] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);
  const catPickerRef = useRef<HTMLDivElement>(null);
  const isActive = !todo.done && !todo.abandoned;
  const catColor = getCategoryColor(categories, todo.category);
  const msg = (zh: string, en: string) => language === 'zh-CN' ? zh : en;
  const recurrence = todo.recurrence ?? 'none';
  const recurrenceOptions: Array<{ id: TaskRecurrence; label: string }> = [
    { id: 'none', label: msg('不自动刷新', 'No repeat') },
    { id: 'daily', label: msg('每日', 'Daily') },
    { id: 'everyOtherDay', label: msg('隔日', 'Every other day') },
    { id: 'weekly', label: msg('每周', 'Weekly') },
  ];
  const recurrenceLabel = recurrenceOptions.find(option => option.id === recurrence)?.label;

  // Click outside to close
  useEffect(() => {
    if (!showCatPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (catPickerRef.current && !catPickerRef.current.contains(e.target as Node)) {
        setShowCatPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick, true);
    return () => document.removeEventListener('mousedown', handleClick, true);
  }, [showCatPicker]);

  const handleAddSub = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!subTitle.trim()) return;
    onAddSubtask(subTitle.trim());
    setSubTitle('');
  };

  return (
    <div className={`todo-card ${todo.done ? 'done' : ''} ${isSelected ? 'selected' : ''} ${todo.abandoned ? 'abandoned' : ''}`}>
      {/* Main row */}
      <div className="todo-card-row" onClick={onSelect}>
        <div className="todo-card-status">
          {todo.done ? (
            <button className="status-dot done" onClick={e => { e.stopPropagation(); onToggle(); }} title={t('restore')} aria-label={`${t('restore')}: ${todo.title}`}><Check size={15} /></button>
          ) : todo.abandoned ? (
            <button className="status-dot restore" onClick={e => { e.stopPropagation(); onRestore(); }} title={t('restore')} aria-label={`${t('restore')}: ${todo.title}`}><RotateCcw size={14} /></button>
          ) : (
            <>
              <button className="status-dot check" onClick={e => { e.stopPropagation(); onToggle(); }} title={t('complete')} aria-label={`${t('complete')}: ${todo.title}`}>✓</button>
              <button className="status-dot abandon" onClick={e => { e.stopPropagation(); onAbandon(); }} title={t('abandon')} aria-label={`${t('abandon')}: ${todo.title}`}>✕</button>
            </>
          )}
        </div>

        <div className="todo-card-body">
          <span className="todo-card-cat" style={{ color: catColor, borderColor: catColor }}
            onClick={e => { e.stopPropagation(); setShowCatPicker(!showCatPicker); }}>
            {todo.category}
          </span>
          <span className="todo-card-title">{todo.title}</span>
          {recurrence !== 'none' && <span className="todo-recurrence-tag"><Repeat2 size={10} />{recurrenceLabel}</span>}
          {todo.abandoned && <span className="abandoned-tag">{t('abandoned')}</span>}
        </div>

        <div className="todo-card-meta">
          {todo.done && todo.completedAt ? (
            <span className="todo-card-time done-time">{formatIsoTime(todo.completedAt)}</span>
          ) : todo.abandoned && todo.abandonedAt ? (
            <span className="todo-card-time abandoned-time">{formatIsoTime(todo.abandonedAt)}</span>
          ) : todo.createdAt ? (
            <span className="todo-card-time">{formatIsoTime(todo.createdAt)}</span>
          ) : null}
          <span className="todo-card-pom">🍅 {todo.completedPomodoros}</span>
        </div>

        <div className="todo-card-actions">
          {isActive && <button className="card-btn" onClick={e => { e.stopPropagation(); onQuickStart(); }} title={t('startPomodoro')}><Play size={14} /></button>}
          {isActive && <button className="card-btn" onClick={e => { e.stopPropagation(); setShowSubInput(!showSubInput); }} title={t('subtask')}><Plus size={14} /></button>}
          <button className={`card-btn ${recurrence !== 'none' ? 'repeat-active' : ''}`} onClick={e => { e.stopPropagation(); setShowRecurrencePicker(!showRecurrencePicker); }} title={msg('设置刷新周期', 'Set repeat cycle')}><Repeat2 size={14} /></button>
          <button className="card-btn del" onClick={e => { e.stopPropagation(); onDelete(); }} title={t('delete')}><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Category picker - inline dropdown */}
      {showCatPicker && (
        <div className="cat-picker-inline" ref={catPickerRef}>
          {categories.map(c => (
            <button key={c.name} className="cat-pick-btn-inline"
              style={{ borderColor: c.color, background: c.name === todo.category ? c.color : undefined, color: c.name === todo.category ? 'white' : undefined }}
              onClick={e => { e.stopPropagation(); onChangeCategory(c.name); setShowCatPicker(false); }}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {showRecurrencePicker && (
        <div className="todo-recurrence-picker" onClick={event => event.stopPropagation()}>
          {recurrenceOptions.map(option => (
            <button key={option.id} className={recurrence === option.id ? 'active' : ''} type="button"
              onClick={() => { onChangeRecurrence(option.id); setShowRecurrencePicker(false); }}>
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Subtasks inline */}
      {todo.subtasks.some(sub => !sub.deletedAt) && (
        <div className="todo-card-subs">
          {todo.subtasks.filter(sub => !sub.deletedAt).map(sub => (
            <div key={sub.id} className={`sub-row ${sub.done ? 'done' : ''} ${sub.abandoned ? 'abandoned' : ''}`}>
              {sub.done ? (
              <button className="sub-dot done" onClick={e => { e.stopPropagation(); onToggleSubtask(sub.id); }} aria-label={`取消完成子任务：${sub.title}`}><Check size={10} /></button>
              ) : sub.abandoned ? (
                <button className="sub-dot restore" onClick={e => { e.stopPropagation(); onRestoreSubtask(sub.id); }} title="恢复子任务" aria-label={`恢复子任务：${sub.title}`}><RotateCcw size={9} /></button>
              ) : (
                <>
                  <button className="sub-dot check" onClick={e => { e.stopPropagation(); onToggleSubtask(sub.id); }} aria-label={`完成子任务：${sub.title}`}>✓</button>
                  <button className="sub-dot abandon" onClick={e => { e.stopPropagation(); onAbandonSubtask(sub.id); }} aria-label={`放弃子任务：${sub.title}`}>✕</button>
                </>
              )}
              <span className="sub-text">{sub.title}</span>
              {sub.createdAt && <span className="sub-time">{formatIsoTime(sub.createdAt)}</span>}
              <span className="sub-pom">🍅 {sub.completedPomodoros}</span>
              {!sub.done && !sub.abandoned && (
                <button className="sub-play" onClick={e => { e.stopPropagation(); onQuickStartSubtask({ id: sub.id, title: sub.title, category: todo.category }); }} title={t('startPomodoro')}><Play size={11} /></button>
              )}
              <button className="sub-del" onClick={e => { e.stopPropagation(); onDeleteSubtask(sub.id); }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Subtask input */}
      {showSubInput && isActive && (
        <form className="todo-card-sub-input" onSubmit={handleAddSub}>
          <input className="sub-input" placeholder={t('subtaskName')} value={subTitle}
            onChange={e => setSubTitle(e.target.value)} autoFocus
            onBlur={() => { if (!subTitle.trim()) setShowSubInput(false); }} />
          <button className="sub-confirm" type="submit" disabled={!subTitle.trim()}>✓</button>
        </form>
      )}
    </div>
  );
}
