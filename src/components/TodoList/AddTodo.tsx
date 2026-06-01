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
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showCatAdd, setShowCatAdd] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), 'medium', category);
    setTitle('');
  };

  const handleAddCat = () => {
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim());
    setNewCatName('');
    setShowCatAdd(false);
  };

  const handleCatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddCat(); }
    if (e.key === 'Escape') { setShowCatAdd(false); setNewCatName(''); }
  };

  return (
    <form className="add-todo" onSubmit={handleAddTask}>
      <div className="add-todo-row">
        <button type="button" className="category-badge-add"
          style={{ background: CATEGORY_COLORS[category] || '#636e72' }}
          onClick={() => { setShowCatPicker(!showCatPicker); setShowCatAdd(false); }}>
          {category}
        </button>
        <input className="add-todo-input" placeholder="输入任务名称..."
          value={title} onChange={e => setTitle(e.target.value)} />
        <button className="add-todo-btn" type="submit" disabled={!title.trim()}>
          <Plus size={18} />
        </button>
      </div>

      {showCatPicker && (
        <div className="category-picker">
          <div className="category-chips-row">
            {categories.map(cat => (
              <div key={cat} className="category-chip-wrapper">
                <button type="button" className={`category-chip ${cat === category ? 'active' : ''}`}
                  style={cat === category ? { background: CATEGORY_COLORS[cat] || '#636e72', color: 'white', borderColor: CATEGORY_COLORS[cat] } : { borderColor: CATEGORY_COLORS[cat] || '#636e72' }}
                  onClick={() => { setCategory(cat); setShowCatPicker(false); }}>
                  {cat}
                </button>
                <button type="button" className="cat-del-btn" onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat); }}>×</button>
              </div>
            ))}
            <button type="button" className="category-chip add" onClick={(e) => { e.stopPropagation(); setShowCatAdd(!showCatAdd); }}>+</button>
          </div>
          {showCatAdd && (
            <div className="category-add-row">
              <input className="cat-add-input" placeholder="输入新分类名称"
                value={newCatName} onChange={e => setNewCatName(e.target.value)}
                onKeyDown={handleCatKeyDown} autoFocus />
              <button type="button" className="cat-add-confirm" onClick={handleAddCat} disabled={!newCatName.trim()}>添加</button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
