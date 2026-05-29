import { useState } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import type { Priority, Category } from '../../types';
import { CATEGORIES, CATEGORY_COLORS } from '../../types';

interface AddTodoProps {
  onAdd: (title: string, priority: Priority, category: Category, estimatedPomodoros: number) => void;
}

export function AddTodo({ onAdd }: AddTodoProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('其他');
  const [pomodoros, setPomodoros] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), priority, category, pomodoros);
    setTitle(''); setPriority('medium'); setPomodoros(1);
    setExpanded(false); setShowCategoryPicker(false);
  };

  return (
    <form className="add-todo" onSubmit={handleSubmit}>
      <div className="add-todo-row">
        <button
          type="button"
          className="category-badge-add"
          style={{ background: CATEGORY_COLORS[category] }}
          onClick={() => { setShowCategoryPicker(!showCategoryPicker); setExpanded(true); }}
        >
          {category} <ChevronDown size={12} />
        </button>
        <input
          className="add-todo-input"
          placeholder="添加新任务..."
          value={title}
          onChange={e => { setTitle(e.target.value); if (!expanded) setExpanded(true); }}
          onFocus={() => setExpanded(true)}
        />
        <button className="add-todo-btn" type="submit" disabled={!title.trim()}>
          <Plus size={20} />
        </button>
      </div>
      {showCategoryPicker && (
        <div className="category-picker">
          {CATEGORIES.map(cat => (
            <button
              key={cat} type="button"
              className={`category-chip ${cat === category ? 'active' : ''}`}
              style={cat === category ? { background: CATEGORY_COLORS[cat], color: 'white', borderColor: CATEGORY_COLORS[cat] } : { borderColor: CATEGORY_COLORS[cat] }}
              onClick={() => { setCategory(cat); setShowCategoryPicker(false); }}
            >{cat}</button>
          ))}
        </div>
      )}
      {expanded && (
        <div className="add-todo-options">
          <div className="add-todo-option-group">
            <label className="add-todo-label">优先</label>
            <select className="add-todo-select" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
          <div className="add-todo-option-group">
            <label className="add-todo-label">番茄数</label>
            <input className="add-todo-number" type="number" min={1} max={20} value={pomodoros} onChange={e => setPomodoros(Number(e.target.value))} />
          </div>
        </div>
      )}
    </form>
  );
}
