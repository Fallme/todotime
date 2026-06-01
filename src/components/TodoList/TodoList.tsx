import { useState } from 'react';
import type { Todo, Priority, Category } from '../../types';
import { CATEGORY_COLORS } from '../../types';
import { AddTodo } from './AddTodo';
import { TodoItem } from './TodoItem';
import { ListTodo } from 'lucide-react';

type StatusTab = 'all' | 'active' | 'done' | 'abandoned';

interface TodoListProps {
  todos: Todo[];
  selectedTodoId: string | null;
  todayPomodoros: number;
  categories: Category[];
  onAdd: (title: string, priority: Priority, category: Category) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAbandon: (id: string) => void;
  onRestore: (id: string) => void;
  onSelect: (id: string | null) => void;
  onQuickStart: (todo: Todo) => void;
  onAddSubtask: (todoId: string, title: string) => void;
  onToggleSubtask: (todoId: string, subId: string) => void;
  onAbandonSubtask: (todoId: string, subId: string) => void;
  onDeleteSubtask: (todoId: string, subId: string) => void;
  onChangeCategory: (todoId: string, category: Category) => void;
  onAddCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
}

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'active', label: '进行中' },
  { id: 'done', label: '已完成' },
  { id: 'abandoned', label: '已放弃' },
];

export function TodoList({ todos, selectedTodoId, todayPomodoros, categories, onAdd, onToggle, onDelete, onAbandon, onRestore, onSelect, onQuickStart, onAddSubtask, onToggleSubtask, onAbandonSubtask, onDeleteSubtask, onChangeCategory, onAddCategory, onDeleteCategory }: TodoListProps) {
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');

  // Filter by status
  let filtered = todos;
  if (statusTab === 'active') filtered = todos.filter(t => !t.done && !t.abandoned);
  else if (statusTab === 'done') filtered = todos.filter(t => t.done && !t.abandoned);
  else if (statusTab === 'abandoned') filtered = todos.filter(t => t.abandoned);

  // Filter by category
  if (filterCategory !== 'all') {
    filtered = filtered.filter(t => t.category === filterCategory);
  }

  // Sort: active top → done → abandoned bottom (within same status)
  const sorted = [...filtered].sort((a, b) => {
    const order = (t: Todo) => t.abandoned ? 2 : t.done ? 1 : 0;
    return order(a) - order(b);
  });

  const usedCategories = [...new Set(todos.filter(t => !t.done && !t.abandoned).map(t => t.category))];

  return (
    <div className="todo-list-container">
      <div className="todo-list-header">
        <ListTodo size={20} />
        <span>任务清单</span>
        <div className="todo-header-stats">
          <span className="todo-stat-done">{todos.filter(t => t.done).length}/{todos.filter(t => !t.abandoned).length}</span>
          <span className="todo-stat-pom">🍅 {todayPomodoros}</span>
        </div>
      </div>

      {/* Status tabs */}
      <div className="status-tabs">
        {STATUS_TABS.map(tab => (
          <button key={tab.id} className={`status-tab ${statusTab === tab.id ? 'active' : ''}`}
            onClick={() => setStatusTab(tab.id)}
          >{tab.label}</button>
        ))}
      </div>

      {/* Category filter (only show for active/all) */}
      {(statusTab === 'all' || statusTab === 'active') && usedCategories.length > 0 && (
        <div className="category-filter-bar">
          <button className={`category-filter-chip ${filterCategory === 'all' ? 'active' : ''}`}
            onClick={() => setFilterCategory('all')}>全部</button>
          {usedCategories.map(cat => (
            <button key={cat} className={`category-filter-chip ${filterCategory === cat ? 'active' : ''}`}
              style={filterCategory === cat ? { background: CATEGORY_COLORS[cat], color: 'white', borderColor: CATEGORY_COLORS[cat] } : { borderColor: CATEGORY_COLORS[cat] }}
              onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
            >{cat}</button>
          ))}
        </div>
      )}

      <AddTodo onAdd={onAdd} categories={categories} onAddCategory={onAddCategory} onDeleteCategory={onDeleteCategory} />
      <div className="todo-list-items">
        {sorted.length === 0 ? (
          <div className="todo-empty">
            {statusTab === 'active' ? '没有进行中的任务' : statusTab === 'done' ? '还没有完成的任务' : statusTab === 'abandoned' ? '没有放弃的任务' : '添加一个任务开始吧'}
          </div>
        ) : (
          sorted.map(todo => (
            <TodoItem key={todo.id} todo={todo}
              isSelected={todo.id === selectedTodoId}
              onToggle={() => onToggle(todo.id)}
              onDelete={() => onDelete(todo.id)}
              onAbandon={() => onAbandon(todo.id)}
              onRestore={() => onRestore(todo.id)}
              onSelect={() => onSelect(todo.id === selectedTodoId ? null : todo.id)}
              onQuickStart={() => onQuickStart(todo)}
              onAddSubtask={(title) => onAddSubtask(todo.id, title)}
              onToggleSubtask={(subId) => onToggleSubtask(todo.id, subId)}
              onAbandonSubtask={(subId) => onAbandonSubtask(todo.id, subId)}
              onDeleteSubtask={(subId) => onDeleteSubtask(todo.id, subId)}
              onChangeCategory={(cat) => onChangeCategory(todo.id, cat)}
            />
          ))
        )}
      </div>
    </div>
  );
}
