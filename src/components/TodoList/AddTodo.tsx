import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Priority, Category } from '../../types';
import { CATEGORY_COLORS } from '../../types';

interface AddTodoProps {
  onAdd: (title: string, priority: Priority, category: Category) => void;
  categories: Category[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
}

export function AddTodo({ onAdd, categories, onAddCategory, onDeleteCategory }: AddTodoProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('其他');
  const [showCategories, setShowCategories] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), 'medium', category);
    setTitle('');
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim());
    setNewCatName('');
  };

  return (
    <form className="add-todo" onSubmit={handleSubmit}>
      <div className="add-todo-row">
        <button type="button" className="category-badge-add" style={{ background: CATEGORY_COLORS[category] || '#636e72' }}
          onClick={() => setShowCategories(!showCategories)}>
          {category}
        </button>
        <input className="add-todo-input" placeholder="输入任务名称..." value={title} onChange={e => setTitle(e.target.value)} />
        <button className="add-todo-btn" type="submit" disabled={!title.trim()}><Plus size={18} /></button>
      </div>

      {showCategories && (
        <div className="category-picker">
          {categories.map(cat => (
            <div key={cat} className="category-chip-wrapper">
              <button type="button" className={`category-chip ${cat === category ? 'active' : ''}`}
                style={cat === category ? { background: CATEGORY_COLORS[cat] || '#636e72', color: 'white', borderColor: CATEGORY_COLORS[cat] } : { borderColor: CATEGORY_COLORS[cat] || '#636e72' }}
                onClick={() => { setCategory(cat); setShowCategories(false); }}>
                {cat}
              </button>
              <button type="button" className="cat-del-btn" onClick={e => { e.stopPropagation(); onDeleteCategory(cat); }}>×</button>
            </div>
          ))}
          <button type="button" className="category-chip add" onClick={(e) => e.stopPropagation()}>+</button>
          <form className="category-add-inline" onSubmit={handleAddCategory}>
            <input className="cat-add-input" placeholder="新分类名" value={newCatName} onChange={e => setNewCatName(e.target.value)} autoFocus />
          </form>
        </div>
      )}
    </form>
  );
}
