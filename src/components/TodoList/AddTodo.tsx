import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Priority, Category, CategoryItem } from '../../types';

interface AddTodoProps {
  onAdd: (title: string, priority: Priority, category: Category) => void;
  categories: CategoryItem[];
  onAddCategory: (name: string, color: string) => void;
  onDeleteCategory: (name: string) => void;
  onChangeCategoryColor: (name: string, color: string) => void;
  onRenameCategory: (oldName: string, newName: string, newColor: string) => void;
}

const PRESET_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#27ae60', '#2980b9',
  '#8e44ad', '#1abc9c', '#e84393', '#6c5ce7', '#00b894',
];

function getRandomHSL(): string {
  const h = Math.floor(Math.random() * 360);
  return `hsl(${h}, 65%, 50%)`;
}

export function AddTodo({ onAdd, categories, onAddCategory, onDeleteCategory, onRenameCategory }: AddTodoProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('数学');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [showCatAdd, setShowCatAdd] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(getRandomHSL());

  const currentCat = categories.find(c => c.name === category);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), 'medium', category as Category);
    setTitle('');
  };

  const startEdit = (cat: CategoryItem) => {
    setEditingCat(cat.name);
    setEditName(cat.name);
    setEditColor(cat.color);
    setShowCatAdd(false);
  };

  const saveEdit = () => {
    if (!editingCat || !editName.trim()) return;
    onRenameCategory(editingCat, editName.trim(), editColor);
    if (category === editingCat && editName.trim() !== editingCat) setCategory(editName.trim());
    setEditingCat(null);
  };

  const deleteEditing = () => {
    if (!editingCat) return;
    onDeleteCategory(editingCat);
    if (category === editingCat) setCategory(categories.find(c => c.name !== editingCat)?.name || '数学');
    setEditingCat(null);
  };

  const handleAddCat = () => {
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim(), newCatColor);
    setCategory(newCatName.trim());
    setNewCatName('');
    setNewCatColor(getRandomHSL());
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
          style={{ color: 'var(--text)', borderColor: currentCat?.color || '#636e72', background: currentCat ? currentCat.color + '18' : 'transparent' }}
          onClick={() => { setShowCatPicker(!showCatPicker); setEditingCat(null); setShowCatAdd(false); }}>
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
          {editingCat ? (
            <div className="cat-edit-panel">
              <input className="cat-edit-input" value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCat(null); }}
                autoFocus />
              <div className="cat-color-palette">
                {PRESET_COLORS.map(c => (
                  <button key={c} type="button" className={`cat-color-swatch ${editColor === c ? 'active' : ''}`}
                    style={{ background: c }} onClick={() => setEditColor(c)} />
                ))}
                <button type="button" className="cat-color-swatch random"
                  style={{ background: getRandomHSL() }}
                  onClick={() => setEditColor(getRandomHSL())}>?</button>
              </div>
              <div className="cat-edit-actions">
                <button type="button" className="cat-edit-save" onClick={saveEdit} disabled={!editName.trim()}>保存</button>
                <button type="button" className="cat-edit-del" onClick={deleteEditing}>删除</button>
                <button type="button" className="cat-edit-cancel" onClick={() => setEditingCat(null)}>取消</button>
              </div>
            </div>
          ) : (
            <>
              <div className="category-chips-row">
                {categories.map(cat => (
                  <button key={cat.name} type="button"
                    className={`category-chip ${cat.name === category ? 'active' : ''}`}
                    style={{ color: 'var(--text)', borderColor: cat.color }}
                    onClick={() => { setCategory(cat.name); setShowCatPicker(false); }}
                    onDoubleClick={(e) => { e.stopPropagation(); startEdit(cat); }}>
                    {cat.name}
                  </button>
                ))}
                <button type="button" className="category-chip add" onClick={() => { setShowCatAdd(!showCatAdd); }}>+</button>
              </div>
              {showCatAdd && (
                <div className="category-add-row">
                  <input className="cat-add-input" placeholder="输入新分类名称"
                    value={newCatName} onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={handleCatKeyDown} autoFocus />
                  <button type="button" className="cat-add-confirm" onClick={handleAddCat} disabled={!newCatName.trim()}>添加</button>
                </div>
              )}
              {showCatAdd && (
                <div className="cat-color-palette" style={{ marginTop: 6 }}>
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" className={`cat-color-swatch ${newCatColor === c ? 'active' : ''}`}
                      style={{ background: c }} onClick={() => setNewCatColor(c)} />
                  ))}
                </div>
              )}
              <div className="cat-edit-hint">双击标签可编辑名称和颜色</div>
            </>
          )}
        </div>
      )}
    </form>
  );
}
