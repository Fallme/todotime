import { useState, useCallback, useEffect } from 'react';
import type { Todo, Priority, Category } from '../types';
import { generateId, formatTime } from '../utils/dateUtils';

interface UseTodosReturn {
  todos: Todo[];
  addTodo: (title: string, priority: Priority, category: Category) => void;
  toggleTodo: (id: string) => void;
  abandonTodo: (id: string) => void;
  restoreTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateTodoPomodoros: (id: string) => void;
  addSubtask: (todoId: string, title: string) => void;
  toggleSubtask: (todoId: string, subId: string) => void;
  abandonSubtask: (todoId: string, subId: string) => void;
  deleteSubtask: (todoId: string, subId: string) => void;
  selectedTodoId: string | null;
  selectTodo: (id: string | null) => void;
}

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
          category: (t.category as Category) || '其他',
          estimatedPomodoros: (t.estimatedPomodoros as number) || 0,
          completedPomodoros: (t.completedPomodoros as number) || 0,
          done: (t.done as boolean) || false,
          abandoned: (t.abandoned as boolean) || false,
          createdAt: (t.createdAt as string) || '',
          subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
        }));
      }
      return [];
    } catch { return []; }
  });

  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('todotime_todos', JSON.stringify(todos)); }, [todos]);

  const addTodo = useCallback((title: string, priority: Priority, category: Category) => {
    setTodos(prev => [{
      id: generateId(), title, priority, category,
      estimatedPomodoros: 0, completedPomodoros: 0,
      done: false, abandoned: false, createdAt: formatTime(new Date()),
      subtasks: [],
    }, ...prev]);
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }, []);

  const abandonTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, abandoned: true } : t));
  }, []);

  const restoreTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, abandoned: false } : t));
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    if (selectedTodoId === id) setSelectedTodoId(null);
  }, [selectedTodoId]);

  const updateTodoPomodoros = useCallback((id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completedPomodoros: t.completedPomodoros + 1 } : t));
  }, []);

  const addSubtask = useCallback((todoId: string, title: string) => {
    setTodos(prev => prev.map(t => t.id === todoId ? {
      ...t, subtasks: [...t.subtasks, { id: generateId(), title, done: false, abandoned: false }],
    } : t));
  }, []);

  const toggleSubtask = useCallback((todoId: string, subId: string) => {
    setTodos(prev => prev.map(t => t.id === todoId ? {
      ...t, subtasks: t.subtasks.map(s => s.id === subId ? { ...s, done: !s.done } : s),
    } : t));
  }, []);

  const abandonSubtask = useCallback((todoId: string, subId: string) => {
    setTodos(prev => prev.map(t => t.id === todoId ? {
      ...t, subtasks: t.subtasks.map(s => s.id === subId ? { ...s, abandoned: true } : s),
    } : t));
  }, []);

  const deleteSubtask = useCallback((todoId: string, subId: string) => {
    setTodos(prev => prev.map(t => t.id === todoId ? {
      ...t, subtasks: t.subtasks.filter(s => s.id !== subId),
    } : t));
  }, []);

  const selectTodo = useCallback((id: string | null) => setSelectedTodoId(id), []);

  return {
    todos, addTodo, toggleTodo, abandonTodo, restoreTodo, deleteTodo,
    updateTodoPomodoros, addSubtask, toggleSubtask, abandonSubtask, deleteSubtask,
    selectedTodoId, selectTodo,
  };
}
