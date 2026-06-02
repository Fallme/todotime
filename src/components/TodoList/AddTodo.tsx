import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Priority, Category, CategoryItem } from '../../types';

interface AddTodoProps {
  onAdd: (title: string, priority: Priority, category: Category) => void;
  categories: CategoryItem[];
  onAddCategory: (name: string, color: string) => void;
  onDeleteCategory: (name: string) => void;
  onChangeCategoryColor: (name: string, color: string) => void;
}

function getRandomHSL(): string {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h}, 65%, 50%)`;
}

export function AddTodo({ onAdd, categories, onAddCategory, onDeleteCategory, onChangeCategoryColor }: AddTodoProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('数学');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showCatAdd, setShowCatAdd] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const currentCat = categories.find(c => c.name === category);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), 'medium', category as Category);
    setTitle('');
  };

  const handleAddCat = () => {
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim(), getRandomHSL());
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
          style={{ color: currentCat?.color || '#636e72', borderColor: currentCat?.color || '#636e72' }}
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
              <div key={cat.name} className="category-chip-wrapper">
                <button type="button" className={`category-chip ${cat.name === category ? 'active' : ''}`}
                  style={{ color: cat.color, borderColor: cat.color }}
                  onClick={() => { setCategory(cat.name); setShowCatPicker(false); }}>
                  {cat.name}
                </button>
                <button type="button" className="cat-color-btn" title="修改颜色"
                  onClick={(e) => { e.stopPropagation(); onChangeCategoryColor(cat.name, getRandomHSL()); }}>
                  <span className="cat-color-dot" style={{ background: cat.color }} />
                </button>
                <button type="button" className="cat-del-btn" onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat.name); }}>×</button>
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
