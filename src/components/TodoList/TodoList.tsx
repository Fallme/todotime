import { useState } from 'react';
import type { Todo, Priority, Category } from '../../types';
import { CATEGORY_COLORS } from '../../types';
import { AddTodo } from './AddTodo';
import { TodoItem } from './TodoItem';
import { ListTodo } from 'lucide-react';

interface TodoListProps {
  todos: Todo[];
  selectedTodoId: string | null;
  onAdd: (title: string, priority: Priority, category: Category) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAbandon: (id: string) => void;
  onSelect: (id: string | null) => void;
  onQuickStart: (todo: Todo) => void;
}

export function TodoList({ todos, selectedTodoId, onAdd, onToggle, onDelete, onAbandon, onSelect, onQuickStart }: TodoListProps) {
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');

  const filtered = todos.filter(t => filterCategory === 'all' || t.category === filterCategory);
  // Sort: active → abandoned → done
  const sorted = [...filtered].sort((a, b) => {
    if (a.abandoned !== b.abandoned) return a.abandoned ? 1 : -1;
    if (a.done !== b.done) return a.done ? 1 : -1;
    return 0;
  });

  const activeCount = todos.filter(t => !t.done && !t.abandoned).length;
  const usedCategories = [...new Set(todos.filter(t => !t.done && !t.abandoned).map(t => t.category))];

  return (
    <div className="todo-list-container">
      <div className="todo-list-header">
        <ListTodo size={20} />
        <span>任务清单</span>
        <span className="todo-count">{activeCount} 项</span>
      </div>

      {usedCategories.length > 0 && (
        <div className="category-filter-bar">
          <button className={`category-filter-chip ${filterCategory === 'all' ? 'active' : ''}`} onClick={() => setFilterCategory('all')}>全部</button>
          {usedCategories.map(cat => (
            <button key={cat} className={`category-filter-chip ${filterCategory === cat ? 'active' : ''}`}
              style={filterCategory === cat ? { background: CATEGORY_COLORS[cat], color: 'white', borderColor: CATEGORY_COLORS[cat] } : { borderColor: CATEGORY_COLORS[cat] }}
              onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
            >{cat}</button>
          ))}
        </div>
      )}

      <AddTodo onAdd={onAdd} />
      <div className="todo-list-items">
        {sorted.length === 0 ? (
          <div className="todo-empty">{filterCategory === 'all' ? '添加一个任务开始吧' : `"${filterCategory}" 下没有任务`}</div>
        ) : (
          sorted.map(todo => (
            <TodoItem key={todo.id} todo={todo}
              isSelected={todo.id === selectedTodoId}
              onToggle={() => onToggle(todo.id)}
              onDelete={() => onDelete(todo.id)}
              onAbandon={() => onAbandon(todo.id)}
              onSelect={() => onSelect(todo.id === selectedTodoId ? null : todo.id)}
              onQuickStart={() => onQuickStart(todo)}
            />
          ))
        )}
      </div>
    </div>
  );
}
