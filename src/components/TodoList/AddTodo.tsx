import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Priority, Category } from '../../types';
import { CATEGORIES, CATEGORY_COLORS } from '../../types';

interface AddTodoProps {
  onAdd: (title: string, priority: Priority, category: Category) => void;
}

export function AddTodo({ onAdd }: AddTodoProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('其他');
  const [showCategories, setShowCategories] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), 'medium', category);
    setTitle('');
  };

  return (
    <form className="add-todo" onSubmit={handleSubmit}>
      <div className="add-todo-row">
        <button
          type="button"
          className="category-badge-add"
          style={{ background: CATEGORY_COLORS[category] }}
          onClick={() => setShowCategories(!showCategories)}
        >
          {category}
        </button>
        <input
          className="add-todo-input"
          placeholder="输入任务名称..."
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <button className="add-todo-btn" type="submit" disabled={!title.trim()}>
          <Plus size={18} />
        </button>
      </div>
      {showCategories && (
        <div className="category-picker">
          {CATEGORIES.map(cat => (
            <button
              key={cat} type="button"
              className={`category-chip ${cat === category ? 'active' : ''}`}
              style={cat === category
                ? { background: CATEGORY_COLORS[cat], color: 'white', borderColor: CATEGORY_COLORS[cat] }
                : { borderColor: CATEGORY_COLORS[cat] }}
              onClick={() => { setCategory(cat); setShowCategories(false); }}
            >{cat}</button>
          ))}
        </div>
      )}
    </form>
  );
}
