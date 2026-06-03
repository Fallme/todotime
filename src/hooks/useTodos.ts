import { useState, useCallback, useEffect } from 'react';
import type { Todo, Priority, Category } from '../types';
import { generateId } from '../utils/dateUtils';

interface UseTodosReturn {
  todos: Todo[];
  addTodo: (title: string, priority: Priority, category: Category) => void;
  toggleTodo: (id: string) => void;
  abandonTodo: (id: string) => void;
  restoreTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateTodoPomodoros: (id: string) => void;
  updateSubtaskPomodoros: (subId: string) => void;
  addSubtask: (todoId: string, title: string) => void;
  toggleSubtask: (todoId: string, subId: string) => void;
  abandonSubtask: (todoId: string, subId: string) => void;
  deleteSubtask: (todoId: string, subId: string) => void;
  changeCategory: (id: string, category: Category) => void;
  renameTodosCategory: (oldName: string, newName: string) => void;
  mergeTodos: (gitTodos: Todo[]) => void;
  selectedTodoId: string | null;
  selectTodo: (id: string | null) => void;
}

const now = () => new Date().toISOString();

export function useTodos(): UseTodosReturn {
  const [todos, setTodos] = useState<Todo[]>(() => {
    try {
      const stored = localStorage.getItem('todotime_todos');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((t: Record<string, unknown>) => ({
          id: t.id as string,
          title: t.title as string,
          priority: (t.priority as Priority) || 'medium',
          category: (t.category as Category) || '数学',
          estimatedPomodoros: (t.estimatedPomodoros as number) || 0,
          completedPomodoros: (t.completedPomodoros as number) || 0,
          done: (t.done as boolean) || false,
          abandoned: (t.abandoned as boolean) || false,
          createdAt: (t.createdAt as string) || '',
          updatedAt: (t.updatedAt as string) || (t.createdAt as string) || '',
          completedAt: (t.completedAt as string) || '',
          abandonedAt: (t.abandonedAt as string) || '',
          subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
        }));
      }
      return [];
    } catch { return []; }
  });

  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('todotime_todos', JSON.stringify(todos)); }, [todos]);

  const addTodo = useCallback((title: string, priority: Priority, category: Category) => {
    const ts = now();
    setTodos(prev => [{
      id: generateId(), title, priority, category,
      estimatedPomodoros: 0, completedPomodoros: 0,
      done: false, abandoned: false, createdAt: ts, updatedAt: ts, completedAt: '', abandonedAt: '',
      subtasks: [],
    }, ...prev]);
  }, []);

  const toggleTodo = useCallback((id: string) => {
    const ts = now();
    setTodos(prev => prev.map(t => t.id === id ? {
      ...t,
      done: !t.done,
      updatedAt: ts,
      completedAt: !t.done ? ts : '',
    } : t));
  }, []);

  const abandonTodo = useCallback((id: string) => {
    const ts = now();
    setTodos(prev => prev.map(t => t.id === id ? { ...t, abandoned: true, abandonedAt: ts, updatedAt: ts } : t));
  }, []);

  const restoreTodo = useCallback((id: string) => {
    const ts = now();
    setTodos(prev => prev.map(t => t.id === id ? { ...t, abandoned: false, abandonedAt: '', updatedAt: ts } : t));
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    setSelectedTodoId(prev => prev === id ? null : prev);
  }, []);

  const updateTodoPomodoros = useCallback((id: string) => {
    const ts = now();
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completedPomodoros: t.completedPomodoros + 1, updatedAt: ts } : t));
  }, []);

  const updateSubtaskPomodoros = useCallback((subId: string) => {
    const ts = now();
    setTodos(prev => prev.map(t => ({
      ...t, updatedAt: ts,
      subtasks: t.subtasks.map(s => s.id === subId ? { ...s, completedPomodoros: s.completedPomodoros + 1, updatedAt: ts } : s),
    })));
  }, []);

  const addSubtask = useCallback((todoId: string, title: string) => {
    const ts = now();
    setTodos(prev => prev.map(t => t.id === todoId ? {
      ...t, updatedAt: ts,
      subtasks: [...t.subtasks, { id: generateId(), title, done: false, abandoned: false, completedPomodoros: 0, createdAt: ts, updatedAt: ts }],
    } : t));
  }, []);

  const toggleSubtask = useCallback((todoId: string, subId: string) => {
    const ts = now();
    setTodos(prev => prev.map(t => t.id === todoId ? {
      ...t, updatedAt: ts,
      subtasks: t.subtasks.map(s => s.id === subId ? { ...s, done: !s.done, updatedAt: ts } : s),
    } : t));
  }, []);

  const abandonSubtask = useCallback((todoId: string, subId: string) => {
    const ts = now();
    setTodos(prev => prev.map(t => t.id === todoId ? {
      ...t, updatedAt: ts,
      subtasks: t.subtasks.map(s => s.id === subId ? { ...s, abandoned: true, updatedAt: ts } : s),
    } : t));
  }, []);

  const deleteSubtask = useCallback((todoId: string, subId: string) => {
    const ts = now();
    setTodos(prev => prev.map(t => t.id === todoId ? {
      ...t, updatedAt: ts,
      subtasks: t.subtasks.filter(s => s.id !== subId),
    } : t));
  }, []);

  const selectTodo = useCallback((id: string | null) => setSelectedTodoId(id), []);

  const changeCategory = useCallback((id: string, category: Category) => {
    const ts = now();
    setTodos(prev => prev.map(t => t.id === id ? { ...t, category, updatedAt: ts } : t));
  }, []);

  const renameTodosCategory = useCallback((oldName: string, newName: string) => {
    const ts = now();
    setTodos(prev => prev.map(t => t.category === oldName ? { ...t, category: newName, updatedAt: ts } : t));
  }, []);

  // Bidirectional merge: per-todo updatedAt comparison, latest wins
  const mergeTodos = useCallback((gitTodos: Todo[]) => {
    setTodos(prev => {
      const localMap = new Map(prev.map(t => [t.id, t]));
      const gitMap = new Map(gitTodos.map(t => [t.id, t]));
      const result: Todo[] = [];
      let changed = false;

      // Process all todos that exist in either local or git
      const allIds = new Set([...localMap.keys(), ...gitMap.keys()]);
      for (const id of allIds) {
        const local = localMap.get(id);
        const git = gitMap.get(id);

        if (local && !git) {
          // Local only → keep (will be pushed to git)
          result.push(local);
        } else if (!local && git) {
          // Git only → add
          result.push(git);
          changed = true;
        } else if (local && git) {
          // Both exist → compare updatedAt, latest wins
          const localTime = local.updatedAt || local.createdAt || '';
          const gitTime = git.updatedAt || git.createdAt || '';
          if (gitTime > localTime) {
            // Git is newer → use git version
            result.push(git);
            if (git.done !== local.done || git.abandoned !== local.abandoned
              || git.completedPomodoros !== local.completedPomodoros
              || git.title !== local.title || git.category !== local.category) {
              changed = true;
            }
          } else {
            // Local is newer or equal → keep local
            result.push(local);
          }
        }
      }

      return changed ? result : prev;
    });
  }, []);

  return {
    todos, addTodo, toggleTodo, abandonTodo, restoreTodo, deleteTodo,
    updateTodoPomodoros, updateSubtaskPomodoros, addSubtask, toggleSubtask, abandonSubtask, deleteSubtask, changeCategory, renameTodosCategory, mergeTodos,
    selectedTodoId, selectTodo,
  };
}
