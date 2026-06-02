import { useState } from 'react';
import { Check, Trash2, Play, RotateCcw, Plus } from 'lucide-react';
import type { Todo, Category, CategoryItem } from '../../types';
import { getCategoryColor } from '../../types';

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
  onAddSubtask: (title: string) => void;
  onToggleSubtask: (subId: string) => void;
  onAbandonSubtask: (subId: string) => void;
  onDeleteSubtask: (subId: string) => void;
  onChangeCategory: (category: Category) => void;
}

export function TodoItem({ todo, isSelected, categories, onToggle, onDelete, onSelect, onAbandon, onRestore, onQuickStart, onAddSubtask, onToggleSubtask, onAbandonSubtask, onDeleteSubtask, onChangeCategory }: TodoItemProps) {
  const [showSubInput, setShowSubInput] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const isActive = !todo.done && !todo.abandoned;
  const doneCount = todo.subtasks.filter(s => s.done).length;
  const catColor = getCategoryColor(categories, todo.category);

  const handleAddSub = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!subTitle.trim()) return;
    onAddSubtask(subTitle.trim());
    setSubTitle('');
  };

  return (
    <div className={`todo-item-wrapper ${todo.done ? 'done' : ''} ${isSelected ? 'selected' : ''} ${todo.abandoned ? 'abandoned' : ''}`}>
      <div className="todo-item-main">
        <div className="todo-col todo-col-status">
          {todo.done ? (
            <button className="status-btn done" onClick={e => { e.stopPropagation(); onToggle(); }} title="取消完成"><Check size={16} /></button>
          ) : todo.abandoned ? (
            <button className="status-btn restore" onClick={e => { e.stopPropagation(); onRestore(); }} title="恢复"><RotateCcw size={14} /></button>
          ) : (
            <>
              <button className="status-btn check" onClick={e => { e.stopPropagation(); onToggle(); }} title="完成">✓</button>
              <button className="status-btn abandon" onClick={e => { e.stopPropagation(); onAbandon(); }} title="放弃">✕</button>
            </>
          )}
        </div>

        <div className="todo-col todo-content" onClick={onSelect}>
          {todo.abandoned && <span className="abandoned-label">已放弃</span>}
          <span className="todo-title">{todo.title}</span>
          {todo.createdAt && <span className="todo-time">{todo.createdAt}</span>}
          {todo.done && todo.completedAt && <span className="todo-time completed">完成于 {todo.completedAt}</span>}
          <span className="category-badge clickable" style={{ color: catColor, borderColor: catColor }}
            onClick={e => { e.stopPropagation(); if (isActive) setShowCatPicker(!showCatPicker); }}>
            {todo.category}
          </span>
          {showCatPicker && isActive && (
            <div className="cat-picker-popup">
              {categories.map(c => (
                <button key={c.name} className="cat-pick-btn" style={{ borderColor: c.color, background: c.name === todo.category ? c.color : undefined, color: c.name === todo.category ? 'white' : undefined }}
                  onClick={e => { e.stopPropagation(); onChangeCategory(c.name as Category); setShowCatPicker(false); }}>
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="todo-col todo-count">
          {todo.completedPomodoros} 🍅
          {todo.subtasks.length > 0 && <span className="sub-count">{doneCount}/{todo.subtasks.length}</span>}
        </div>

        <div className="todo-col todo-actions">
          {isActive && <button className="todo-action-btn add-sub" onClick={e => { e.stopPropagation(); setShowSubInput(!showSubInput); }} title="添加子任务"><Plus size={14} /></button>}
          {isActive && <button className="todo-action-btn start" onClick={e => { e.stopPropagation(); onQuickStart(); }} title="开始番茄"><Play size={14} /></button>}
          <button className="todo-action-btn delete" onClick={e => { e.stopPropagation(); onDelete(); }} title="删除"><Trash2 size={14} /></button>
        </div>
      </div>

      {showSubInput && isActive && (
        <form className="subtask-input-inline" onSubmit={handleAddSub}>
          <input className="subtask-input" placeholder="子任务名称" value={subTitle}
            onChange={e => setSubTitle(e.target.value)} autoFocus
            onBlur={() => { if (!subTitle.trim()) setShowSubInput(false); }} />
          <button className="subtask-confirm" type="submit" disabled={!subTitle.trim()}>✓</button>
        </form>
      )}

      {todo.subtasks.length > 0 && (
        <div className="subtask-list-inline">
          {todo.subtasks.map(sub => (
            <div key={sub.id} className={`subtask-row ${sub.done ? 'done' : ''} ${sub.abandoned ? 'abandoned' : ''}`}>
              {sub.done ? (
                <button className="subtask-status done" onClick={e => { e.stopPropagation(); onToggleSubtask(sub.id); }}><Check size={11} /></button>
              ) : sub.abandoned ? (
                <button className="subtask-status restore" onClick={e => { e.stopPropagation(); onToggleSubtask(sub.id); }}><RotateCcw size={10} /></button>
              ) : (
                <>
                  <button className="subtask-status check" onClick={e => { e.stopPropagation(); onToggleSubtask(sub.id); }}>✓</button>
                  <button className="subtask-status abandon" onClick={e => { e.stopPropagation(); onAbandonSubtask(sub.id); }}>✕</button>
                </>
              )}
              {sub.abandoned && <span className="subtask-abandoned-tag">放弃</span>}
              <span className="subtask-text">{sub.title}</span>
              <span className="subtask-pom">0 🍅</span>
              <button className="subtask-del" onClick={e => { e.stopPropagation(); onDeleteSubtask(sub.id); }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
