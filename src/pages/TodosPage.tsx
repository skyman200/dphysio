import { MainLayout } from "@/components/layout/MainLayout";
import { TodoList } from "@/components/todos/TodoList";

const TodosPage = () => {
  return (
    <MainLayout title="할 일">
      <div className="max-w-4xl">
        <TodoList />
      </div>
    </MainLayout>
  );
};

export default TodosPage;
