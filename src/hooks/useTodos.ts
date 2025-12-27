import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { todosApi, Todo } from "@/services/api/todosApi";

// Todo 타입 re-export (기존 코드 호환성)
export type { Todo } from "@/services/api/todosApi";

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setTodos([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // todosApi 서비스 레이어 사용 (직접 Firestore 호출 대신)
    const unsubscribe = todosApi.subscribe((todosData) => {
      setTodos(todosData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addTodo = useCallback(async (
    title: string,
    priority: "low" | "medium" | "high" = "medium",
    dueDate?: string
  ) => {
    if (!user) return { error: new Error("Not authenticated") };

    const result = await todosApi.create(
      { title, priority, due_date: dueDate },
      user.uid
    );

    if (result.error) {
      return { error: result.error };
    }
    return { error: null };
  }, [user]);

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    const result = await todosApi.toggle(id, completed);
    if (result.error) {
      return { error: result.error };
    }
    return { error: null };
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    const result = await todosApi.delete(id);
    if (result.error) {
      return { error: result.error };
    }
    return { error: null };
  }, []);

  return { todos, loading, addTodo, toggleTodo, deleteTodo };
}