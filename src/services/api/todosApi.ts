import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ============================================
// Todos API 서비스
// ============================================

export interface Todo {
    id: string;
    title: string;
    completed: boolean;
    due_date: string | null;
    priority: "low" | "medium" | "high";
    assigned_to: string | null;
    created_by: string;
    created_at: string;
}

export interface TodoFormData {
    title: string;
    priority?: "low" | "medium" | "high";
    due_date?: string;
}

export interface ApiResult<T> {
    data?: T;
    error: Error | null;
}

type TodosSubscriber = (todos: Todo[]) => void;

export const todosApi = {
    /**
     * 실시간 todos 구독
     */
    subscribe: (callback: TodosSubscriber): (() => void) => {
        const todosRef = collection(db, "todos");
        const q = query(todosRef, orderBy("created_at", "desc"));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const todosData: Todo[] = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Todo[];
                callback(todosData);
            },
            (error) => {
                console.error("Error fetching todos:", error);
            }
        );

        return unsubscribe;
    },

    /**
     * 할 일 생성
     */
    create: async (
        data: TodoFormData,
        userId: string
    ): Promise<ApiResult<Todo>> => {
        try {
            const docRef = await addDoc(collection(db, "todos"), {
                title: data.title,
                priority: data.priority || "medium",
                due_date: data.due_date || null,
                created_by: userId,
                completed: false,
                assigned_to: null,
                created_at: serverTimestamp(),
            });

            return {
                data: {
                    id: docRef.id,
                    title: data.title,
                    priority: data.priority || "medium",
                    due_date: data.due_date || null,
                    created_by: userId,
                    completed: false,
                    assigned_to: null,
                    created_at: new Date().toISOString(),
                },
                error: null,
            };
        } catch (error) {
            console.error("Error creating todo:", error);
            return { error: error as Error };
        }
    },

    /**
     * 할 일 상태 토글
     */
    toggle: async (
        todoId: string,
        completed: boolean
    ): Promise<ApiResult<void>> => {
        try {
            await updateDoc(doc(db, "todos", todoId), { completed });
            return { error: null };
        } catch (error) {
            console.error("Error toggling todo:", error);
            return { error: error as Error };
        }
    },

    /**
     * 할 일 삭제
     */
    delete: async (todoId: string): Promise<ApiResult<void>> => {
        try {
            await deleteDoc(doc(db, "todos", todoId));
            return { error: null };
        } catch (error) {
            console.error("Error deleting todo:", error);
            return { error: error as Error };
        }
    },
};
