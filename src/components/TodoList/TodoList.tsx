import { useState } from 'react';
import type { Todo, Priority, Category, CategoryItem } from '../../types';
import { getCategoryColor } from '../../types';
import { AddTodo } from './AddTodo';
import { TodoItem } from './TodoItem';
import { ListTodo, ChevronDown, ChevronRight, Archive } from 'lucide-react';

type StatusTab = 'all' | 'active' | 'done' | 'abandoned';

interface TodoListProps {
  todos: Todo[];
  selectedTodoId: string | null;
  todayPomodoros: number;
  categories: CategoryItem[];
  onAdd: (title: string, priority: Priority, category: Category) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAbandon: (id: string) => void;
  onRestore: (id: string) => void;
  onSelect: (id: string | null) => void;
  onQuickStart: (todo: Todo) => void;
  onQuickStartSubtask: (subtask: { id: string; title: string; category: Category }) => void;
  onAddSubtask: (todoId: string, title: string) => void;
  onToggleSubtask: (todoId: string, subId: string) => void;
  onAbandonSubtask: (todoId: string, subId: string) => void;
  onDeleteSubtask: (todoId: string, subId: string) => void;
  onChangeCategory: (todoId: string, category: Category) => void;
  onAddCategory: (name: string, color: string) => void;
  onDeleteCategory: (name: string) => void;
  onRenameCategory: (oldName: string, newName: string, newColor: string) => void;
}

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'all', label: '全部' }, { id: 'active', label: '进行中' },
  { id: 'done', label: '已完成' }, { id: 'abandoned', label: '已放弃' },
];

export function TodoList({ todos, selectedTodoId, todayPomodoros, categories, onAdd, onToggle, onDelete, onAbandon, onRestore, onSelect, onQuickStart, onQuickStartSubtask, onAddSubtask, onToggleSubtask, onAbandonSubtask, onDeleteSubtask, onChangeCategory, onAddCategory, onDeleteCategory, onRenameCategory }: TodoListProps) {
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  const [expandedArchives, setExpandedArchives] = useState<Set<string>>(new Set());

  const toggleArchive = (key: string) => {
    setExpandedArchives(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Separate active tasks from old completed/abandoned tasks

  let activeTasks: Todo[] = [];
  let archivedTasks: Todo[] = [];

  if (statusTab === 'active') {
    activeTasks = todos.filter(t => !t.done && !t.abandoned);
  } else if (statusTab === 'done') {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const done3dCutoff = threeDaysAgo.toISOString().slice(0, 10);
    activeTasks = todos.filter(t => t.done && !t.abandoned && t.completedAt && t.completedAt >= done3dCutoff);
    archivedTasks = todos.filter(t => t.done && !t.abandoned && t.completedAt && t.completedAt < done3dCutoff);
  } else if (statusTab === 'abandoned') {
    activeTasks = todos.filter(t => t.abandoned);
  } else {
    // 'all' tab
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const done3dCutoff = threeDaysAgo.toISOString().slice(0, 10);
    activeTasks = todos.filter(t => {
      if (t.done && t.completedAt && t.completedAt < done3dCutoff) return false;
      return true;
    });
    archivedTasks = todos.filter(t => {
      if (!t.done && !t.abandoned) return false;
      if (t.done && t.completedAt && t.completedAt < done3dCutoff) return true;
      if (t.abandoned && t.abandonedAt && t.abandonedAt < done3dCutoff) return true;
      return false;
    });
  }

  if (filterCategory !== 'all') {
    activeTasks = activeTasks.filter(t => t.category === filterCategory);
    archivedTasks = archivedTasks.filter(t => t.category === filterCategory);
  }

  // Group archived tasks by month
  const archiveGroups = new Map<string, Todo[]>();
  archivedTasks.forEach(t => {
    const dateStr = t.completedAt || t.abandonedAt || '';
    const monthKey = dateStr.slice(0, 7); // "YYYY-MM"
    if (!archiveGroups.has(monthKey)) archiveGroups.set(monthKey, []);
    archiveGroups.get(monthKey)!.push(t);
  });

  const sorted = [...activeTasks].sort((a, b) => {
    const order = (t: Todo) => t.abandoned ? 2 : t.done ? 1 : 0;
    return order(a) - order(b);
  });

  const usedCategories = [...new Set(todos.filter(t => !t.done && !t.abandoned).map(t => t.category))];

  return (
    <div className="todo-list-container">
      <div className="todo-list-header">
        <ListTodo size={20} /><span>任务清单</span>
        <div className="todo-header-stats">
          <span className="todo-stat-done">{todos.filter(t => t.done).length}/{todos.filter(t => !t.abandoned).length}</span>
          <span className="todo-stat-pom">🍅 {todayPomodoros}</span>
        </div>
      </div>

      <div className="status-tabs">
        {STATUS_TABS.map(tab => (
          <button key={tab.id} className={`status-tab ${statusTab === tab.id ? 'active' : ''}`}
            onClick={() => setStatusTab(tab.id)}>{tab.label}</button>
        ))}
      </div>

      {(statusTab === 'all' || statusTab === 'active') && usedCategories.length > 0 && (
        <div className="category-filter-bar">
          <button className={`category-filter-chip ${filterCategory === 'all' ? 'active' : ''}`} onClick={() => setFilterCategory('all')}>全部</button>
          {usedCategories.map(cat => (
            <button key={cat} className={`category-filter-chip ${filterCategory === cat ? 'active' : ''}`}
              style={{ color: 'var(--text)', borderColor: getCategoryColor(categories, cat) }}
              onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}>{cat}</button>
          ))}
        </div>
      )}

      <AddTodo onAdd={onAdd} categories={categories} onAddCategory={onAddCategory} onDeleteCategory={onDeleteCategory} onRenameCategory={onRenameCategory} />

      <div className="todo-list-items">
        {sorted.length === 0 && archiveGroups.size === 0 ? (
          <div className="todo-empty">{statusTab === 'active' ? '没有进行中的任务' : statusTab === 'done' ? '还没有完成的任务' : statusTab === 'abandoned' ? '没有放弃的任务' : '添加一个任务开始吧'}</div>
        ) : (
          <>
            {sorted.map(todo => (
              <TodoItem key={todo.id} todo={todo} isSelected={todo.id === selectedTodoId} categories={categories}
                onToggle={() => onToggle(todo.id)} onDelete={() => onDelete(todo.id)} onAbandon={() => onAbandon(todo.id)}
                onRestore={() => onRestore(todo.id)} onSelect={() => onSelect(todo.id === selectedTodoId ? null : todo.id)}
                onQuickStart={() => onQuickStart(todo)} onQuickStartSubtask={onQuickStartSubtask}
                onAddSubtask={(t) => onAddSubtask(todo.id, t)}
                onToggleSubtask={(s) => onToggleSubtask(todo.id, s)} onAbandonSubtask={(s) => onAbandonSubtask(todo.id, s)}
                onDeleteSubtask={(s) => onDeleteSubtask(todo.id, s)} onChangeCategory={(c) => onChangeCategory(todo.id, c)}
              />
            ))}
            {/* Archive groups */}
            {Array.from(archiveGroups.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([monthKey, tasks]) => {
              const [year, month] = monthKey.split('-');
              const label = `${year}年${parseInt(month)}月`;
              const isExpanded = expandedArchives.has(monthKey);
              return (
                <div key={monthKey} className="archive-group">
                  <button className="archive-toggle" onClick={() => toggleArchive(monthKey)}>
                    <Archive size={14} />
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>{label}</span>
                    <span className="archive-count">{tasks.length}个任务</span>
                  </button>
                  {isExpanded && (
                    <div className="archive-items">
                      {tasks.map(todo => (
                        <TodoItem key={todo.id} todo={todo} isSelected={todo.id === selectedTodoId} categories={categories}
                          onToggle={() => onToggle(todo.id)} onDelete={() => onDelete(todo.id)} onAbandon={() => onAbandon(todo.id)}
                          onRestore={() => onRestore(todo.id)} onSelect={() => onSelect(todo.id === selectedTodoId ? null : todo.id)}
                          onQuickStart={() => onQuickStart(todo)} onQuickStartSubtask={onQuickStartSubtask}
                          onAddSubtask={(t) => onAddSubtask(todo.id, t)}
                          onToggleSubtask={(s) => onToggleSubtask(todo.id, s)} onAbandonSubtask={(s) => onAbandonSubtask(todo.id, s)}
                          onDeleteSubtask={(s) => onDeleteSubtask(todo.id, s)} onChangeCategory={(c) => onChangeCategory(todo.id, c)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
