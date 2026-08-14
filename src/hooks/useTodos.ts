import { useState, useCallback, useEffect, useRef } from 'react';
import type { Todo, Priority, Category, PomodoroRecord } from '../types';
import { generateId } from '../utils/dateUtils';
import { getDeviceId, readProfileStorage, profileStorageKey } from '../utils/syncIdentity';
import { addPomodoroRecord, mergeTodosById, normalizePomodoroCounter, normalizeTodo } from '../utils/todoMerge';
import { isPomodoroRecord } from '../utils/pomodoroRules';
import { pomodoroRecordKey } from '../utils/syncMerge';

interface UseTodosReturn {
  todos: Todo[];
  addTodo: (title: string, priority: Priority, category: Category) => Todo;
  toggleTodo: (id: string) => void;
  abandonTodo: (id: string) => void;
  restoreTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateTodoPomodoros: (id: string, recordId: string) => void;
  updateSubtaskPomodoros: (subId: string, recordId: string) => void;
  reconcilePomodoroRecords: (records: PomodoroRecord[]) => void;
  addSubtask: (todoId: string, title: string) => void;
  toggleSubtask: (todoId: string, subId: string) => void;
  abandonSubtask: (todoId: string, subId: string) => void;
  restoreSubtask: (todoId: string, subId: string) => void;
  deleteSubtask: (todoId: string, subId: string) => void;
  changeCategory: (id: string, category: Category) => void;
  renameTodosCategory: (oldName: string, newName: string) => void;
  mergeTodos: (gitTodos: Todo[]) => void;
  replaceTodos: (todos: Todo[]) => void;
  selectedTodoId: string | null;
  selectTodo: (id: string | null) => void;
}

const now = () => new Date().toISOString();

export function useTodos(profileId: string): UseTodosReturn {
  const deviceIdRef = useRef(getDeviceId());
  const [todos, setTodos] = useState<Todo[]>(() => {
    try {
      const stored = readProfileStorage('todotime_todos', profileId);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((t: Record<string, unknown>) => normalizeTodo({
          id: t.id as string,
          title: t.title as string,
          priority: (t.priority as Priority) || 'medium',
          category: (t.category as Category) || '数学',
          estimatedPomodoros: (t.estimatedPomodoros as number) || 0,
          completedPomodoros: (t.completedPomodoros as number) || 0,
          pomodoroRecordIds: Array.isArray(t.pomodoroRecordIds) ? t.pomodoroRecordIds as string[] : undefined,
          legacyPomodoroCount: typeof t.legacyPomodoroCount === 'number' ? t.legacyPomodoroCount : undefined,
          done: (t.done as boolean) || false,
          abandoned: (t.abandoned as boolean) || false,
          createdAt: (t.createdAt as string) || '',
          updatedAt: (t.updatedAt as string) || (t.createdAt as string) || '',
          completedAt: (t.completedAt as string) || '',
          abandonedAt: (t.abandonedAt as string) || '',
          subtasks: Array.isArray(t.subtasks) ? t.subtasks.map(subtask => normalizePomodoroCounter(subtask)) : [],
          deletedAt: (t.deletedAt as string) || '',
        }));
      }
      return [];
    } catch { return []; }
  });

  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem(profileStorageKey('todotime_todos', profileId), JSON.stringify(todos)); }, [todos, profileId]);

  const addTodo = useCallback((title: string, priority: Priority, category: Category) => {
    const ts = now();
    const todo: Todo = {
      id: `task-${deviceIdRef.current}-${generateId()}`, title, priority, category,
      estimatedPomodoros: 0, completedPomodoros: 0,
      pomodoroRecordIds: [], legacyPomodoroCount: 0,
      done: false, abandoned: false, createdAt: ts, updatedAt: ts, completedAt: '', abandonedAt: '',
      subtasks: [], deletedAt: '',
    };
    setTodos(prev => [todo, ...prev]);
    return todo;
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
    const ts = now();
    setTodos(prev => prev.map(t => t.id === id ? { ...t, deletedAt: ts, updatedAt: ts } : t));
    setSelectedTodoId(prev => prev === id ? null : prev);
  }, []);

  const updateTodoPomodoros = useCallback((id: string, recordId: string) => {
    setTodos(prev => prev.map(t => t.id === id ? addPomodoroRecord(t, recordId) : t));
  }, []);

  const updateSubtaskPomodoros = useCallback((subId: string, recordId: string) => {
    setTodos(prev => prev.map(t => t.subtasks.some(s => s.id === subId) ? ({
      ...t,
      subtasks: t.subtasks.map(s => s.id === subId ? addPomodoroRecord(s, recordId) : s),
    }) : t));
  }, []);

  const reconcilePomodoroRecords = useCallback((records: PomodoroRecord[]) => {
    const completedRecords = records.filter(record => record.completed && record.taskId && isPomodoroRecord(record));
    if (completedRecords.length === 0) return;
    setTodos(previous => {
      const next = previous.map(todo => {
        let updatedTodo = todo;
        for (const record of completedRecords) {
          if (record.taskId === todo.id) updatedTodo = addPomodoroRecord(updatedTodo, pomodoroRecordKey(record));
        }
        const subtasks = updatedTodo.subtasks.map(subtask => {
          let updatedSubtask = subtask;
          for (const record of completedRecords) {
            if (record.taskId === subtask.id) updatedSubtask = addPomodoroRecord(updatedSubtask, pomodoroRecordKey(record));
          }
          return updatedSubtask;
        });
        return subtasks.some((subtask, index) => subtask !== updatedTodo.subtasks[index])
          ? { ...updatedTodo, subtasks }
          : updatedTodo;
      });
      return next.some((todo, index) => todo !== previous[index]) ? next : previous;
    });
  }, []);

  const addSubtask = useCallback((todoId: string, title: string) => {
    const ts = now();
    setTodos(prev => prev.map(t => t.id === todoId ? {
      ...t, updatedAt: ts,
      subtasks: [...t.subtasks, { id: `subtask-${deviceIdRef.current}-${generateId()}`, title, done: false, abandoned: false, completedPomodoros: 0, pomodoroRecordIds: [], legacyPomodoroCount: 0, createdAt: ts, updatedAt: ts }],
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

  const restoreSubtask = useCallback((todoId: string, subId: string) => {
    const ts = now();
    setTodos(prev => prev.map(t => t.id === todoId ? {
      ...t, updatedAt: ts,
      subtasks: t.subtasks.map(s => s.id === subId ? { ...s, done: false, abandoned: false, updatedAt: ts } : s),
    } : t));
  }, []);

  const deleteSubtask = useCallback((todoId: string, subId: string) => {
    const ts = now();
    setTodos(prev => prev.map(t => t.id === todoId ? {
      ...t, updatedAt: ts,
      subtasks: t.subtasks.map(s => s.id === subId ? { ...s, deletedAt: ts, updatedAt: ts } : s),
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

  // Metadata uses latest-write-wins while additive pomodoro event IDs are unioned.
  const mergeTodos = useCallback((gitTodos: Todo[]) => {
    setTodos(prev => {
      const result = mergeTodosById(prev, gitTodos);
      return JSON.stringify(result) === JSON.stringify(prev) ? prev : result;
    });
  }, []);

  const replaceTodos = useCallback((nextTodos: Todo[]) => {
    setTodos(nextTodos);
    setSelectedTodoId(null);
  }, []);

  return {
    todos, addTodo, toggleTodo, abandonTodo, restoreTodo, deleteTodo,
    updateTodoPomodoros, updateSubtaskPomodoros, reconcilePomodoroRecords, addSubtask, toggleSubtask, abandonSubtask, restoreSubtask, deleteSubtask, changeCategory, renameTodosCategory, mergeTodos,
    selectedTodoId, selectTodo, replaceTodos,
  };
}
