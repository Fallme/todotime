import { useState, useCallback, useEffect } from 'react';
import type { Todo, Priority, Category } from '../types';
import { generateId, formatTime } from '../utils/dateUtils';

interface UseTodosReturn {
  todos: Todo[];
  addTodo: (title: string, priority: Priority, category: Category, pomodoroMinutes: number, estimatedPomodoros: number) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateTodoPomodoros: (id: string) => void;
  selectedTodoId: string | null;
  selectTodo: (id: string | null) => void;
}

export function useTodos(initialTodos: Todo[] = []): UseTodosReturn {
  const [todos, setTodos] = useState<Todo[]>(() => {
    if (initialTodos.length > 0) return initialTodos;
    try {
      const stored = localStorage.getItem('todotime_todos');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migrate old todos without category/timer fields
        return parsed.map((t: Record<string, unknown>) => ({
          id: t.id,
          title: t.title,
          priority: t.priority || 'medium',
          category: t.category || '其他',
          pomodoroMinutes: t.pomodoroMinutes || 25,
          estimatedPomodoros: t.estimatedPomodoros || 1,
          completedPomodoros: t.completedPomodoros || 0,
          done: t.done || false,
          createdAt: t.createdAt || '',
        }));
      }
      return [];
    } catch {
      return [];
    }
  });

  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('todotime_todos', JSON.stringify(todos));
  }, [todos]);

  const addTodo = useCallback((title: string, priority: Priority, category: Category, pomodoroMinutes: number, estimatedPomodoros: number) => {
    const newTodo: Todo = {
      id: generateId(),
      title,
      priority,
      category,
      pomodoroMinutes,
      estimatedPomodoros,
      completedPomodoros: 0,
      done: false,
      createdAt: formatTime(new Date()),
    };
    setTodos(prev => [newTodo, ...prev]);
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, done: !t.done } : t)
    );
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    if (selectedTodoId === id) setSelectedTodoId(null);
  }, [selectedTodoId]);

  const updateTodoPomodoros = useCallback((id: string) => {
    setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, completedPomodoros: t.completedPomodoros + 1 } : t)
    );
  }, []);

  const selectTodo = useCallback((id: string | null) => {
    setSelectedTodoId(id);
  }, []);

  return {
    todos, addTodo, toggleTodo, deleteTodo,
    updateTodoPomodoros, selectedTodoId, selectTodo,
  };
}
