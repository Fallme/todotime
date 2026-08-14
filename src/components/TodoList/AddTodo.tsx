import { useState } from 'react';
import { Plus, Repeat2 } from 'lucide-react';
import type { Priority, Category, CategoryItem, TaskRecurrence } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { buildMonthlyRecurrence, buildWeeklyRecurrence, getTaskRecurrenceKind, getWeeklyRecurrenceDays } from '../../utils/taskRecurrence';
import { MonthlyRecurrenceCalendar } from './MonthlyRecurrenceCalendar';

interface AddTodoProps {
  onAdd: (title: string, priority: Priority, category: Category, recurrence: TaskRecurrence) => void;
  categories: CategoryItem[];
  onAddCategory: (name: string, color: string) => void;
  onDeleteCategory: (name: string) => void;
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
  const { language, t } = useLanguage();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('数学');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [showCatAdd, setShowCatAdd] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(getRandomHSL());
  const [randomPreview, setRandomPreview] = useState(getRandomHSL);
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('none');
  const msg = (zh: string, en: string) => language === 'zh-CN' ? zh : en;

  const selectedCategory = categories.some(c => c.name === category) ? category : categories[0]?.name || '其他';
  const currentCat = categories.find(c => c.name === selectedCategory);
  const recurrenceKind = getTaskRecurrenceKind(recurrence);
  const weeklyDays = getWeeklyRecurrenceDays(recurrence);
  const weekdayOptions = language === 'zh-CN'
    ? [{ day: 1, label: '一' }, { day: 2, label: '二' }, { day: 3, label: '三' }, { day: 4, label: '四' }, { day: 5, label: '五' }, { day: 6, label: '六' }, { day: 0, label: '日' }]
    : [{ day: 1, label: 'Mon' }, { day: 2, label: 'Tue' }, { day: 3, label: 'Wed' }, { day: 4, label: 'Thu' }, { day: 5, label: 'Fri' }, { day: 6, label: 'Sat' }, { day: 0, label: 'Sun' }];

  const changeRecurrenceKind = (kind: string) => {
    if (kind === 'weekly') setRecurrence(recurrenceKind === 'weekly' ? recurrence : buildWeeklyRecurrence([1]));
    else if (kind === 'monthly') setRecurrence(recurrenceKind === 'monthly' ? recurrence : buildMonthlyRecurrence(1));
    else setRecurrence(kind as TaskRecurrence);
  };

  const toggleWeekday = (day: number) => {
    const next = weeklyDays.includes(day)
      ? weeklyDays.length > 1 ? weeklyDays.filter(value => value !== day) : weeklyDays
      : [...weeklyDays, day];
    setRecurrence(buildWeeklyRecurrence(next));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), 'medium', selectedCategory, recurrence);
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
        <input className="add-todo-input" placeholder={t('taskNamePlaceholder')}
          value={title} onChange={e => setTitle(e.target.value)} />
        <button className="add-todo-btn" type="submit" disabled={!title.trim()}>
          <Plus size={18} />
        </button>
      </div>

      <div className="add-todo-recurrence">
        <Repeat2 size={13} />
        <span>{msg('刷新周期', 'Repeat')}</span>
        <select value={recurrenceKind} onChange={event => changeRecurrenceKind(event.target.value)}>
          <option value="none">{msg('不自动刷新', 'No repeat')}</option>
          <option value="daily">{msg('每日刷新', 'Daily')}</option>
          <option value="everyOtherDay">{msg('隔日刷新', 'Every other day')}</option>
          <option value="everyTwoDays">{msg('隔二日刷新', 'Every three days')}</option>
          <option value="weekly">{msg('指定星期', 'Selected weekdays')}</option>
          <option value="monthly">{msg('每月指定日期', 'Monthly date')}</option>
        </select>
      </div>

      {recurrenceKind === 'weekly' && (
        <div className="recurrence-detail weekday-selector" aria-label={msg('选择每周刷新日期', 'Choose weekly refresh days')}>
          {weekdayOptions.map(option => (
            <button key={option.day} type="button" className={weeklyDays.includes(option.day) ? 'active' : ''}
              onClick={() => toggleWeekday(option.day)}>{option.label}</button>
          ))}
        </div>
      )}

      {recurrenceKind === 'monthly' && (
        <div className="recurrence-detail monthly-selector">
          <span>{msg('每月', 'Monthly')}</span>
          <MonthlyRecurrenceCalendar recurrence={recurrence} onChange={setRecurrence} />
        </div>
      )}

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
                  style={{ background: randomPreview }}
                  onClick={() => { const c = getRandomHSL(); setRandomPreview(c); setEditColor(c); }}>?</button>
              </div>
              <div className="cat-edit-actions">
                <button type="button" className="cat-edit-save" onClick={saveEdit} disabled={!editName.trim()}>{t('save')}</button>
                <button type="button" className="cat-edit-del" onClick={deleteEditing}>{t('delete')}</button>
                <button type="button" className="cat-edit-cancel" onClick={() => setEditingCat(null)}>{t('cancel')}</button>
              </div>
            </div>
          ) : (
            <>
              <div className="category-chips-row">
                {categories.map(cat => (
                  <div key={cat.name} className="category-chip-wrap">
                    <button type="button"
                      className={`category-chip ${cat.name === selectedCategory ? 'active' : ''}`}
                      style={{ color: 'var(--text)', borderColor: cat.color }}
                      onClick={() => { setCategory(cat.name); setShowCatPicker(false); }}
                      onDoubleClick={(e) => { e.stopPropagation(); startEdit(cat); }}>
                      {cat.name}
                    </button>
                    <button type="button" className="category-chip-del" disabled={categories.length <= 1}
                      onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat.name); if (selectedCategory === cat.name) setCategory(categories.find(c => c.name !== cat.name)?.name || '其他'); }} title={categories.length <= 1 ? t('keepOneCategory') : t('deleteCategory')}>×</button>
                  </div>
                ))}
                <button type="button" className="category-chip add" onClick={() => { setShowCatAdd(!showCatAdd); }}>+</button>
              </div>
              {showCatAdd && (
                <div className="category-add-row">
                  <input className="cat-add-input" placeholder={t('addCategory')}
                    value={newCatName} onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={handleCatKeyDown} autoFocus />
                  <button type="button" className="cat-add-confirm" onClick={handleAddCat} disabled={!newCatName.trim()}>{t('add')}</button>
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
              <div className="cat-edit-hint">{t('editCategoryHint')}</div>
            </>
          )}
        </div>
      )}
    </form>
  );
}
