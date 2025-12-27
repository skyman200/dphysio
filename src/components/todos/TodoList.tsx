import { useState } from "react";
import { Check, Circle, Plus, MoreHorizontal, Calendar, Trash2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTodos } from "@/hooks/useTodos";
import { useProfiles } from "@/hooks/useProfiles";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const priorityStyles = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/15 text-warning",
  high: "bg-destructive/15 text-destructive",
};

const priorityLabels = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

const DEFAULT_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

export function TodoList() {
  const { todos, loading, addTodo, toggleTodo, deleteTodo } = useTodos();
  const { profiles } = useProfiles();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: "",
    priority: "medium" as "low" | "medium" | "high",
    dueDate: undefined as Date | undefined,
  });

  const handleAddTodo = async () => {
    if (!newTodo.title.trim()) return;

    const { error } = await addTodo(
      newTodo.title,
      newTodo.priority,
      newTodo.dueDate ? format(newTodo.dueDate, "yyyy-MM-dd") : undefined
    );
    if (error) {
      toast({
        title: "오류",
        description: "할 일을 추가하지 못했습니다.",
        variant: "destructive",
      });
    } else {
      setNewTodo({ title: "", priority: "medium", dueDate: undefined });
      setDialogOpen(false);
    }
  };

  const getProfileColor = (userId: string | null) => {
    if (!userId) return DEFAULT_COLORS[0];
    const profile = profiles.find((p) => p.user_id === userId);
    if (profile?.color) return profile.color;
    const index = profiles.findIndex((p) => p.user_id === userId);
    return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  };

  const handleToggle = async (id: string, completed: boolean) => {
    await toggleTodo(id, !completed);
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteTodo(id);
    if (error) {
      toast({
        title: "오류",
        description: "본인이 만든 할 일만 삭제할 수 있습니다.",
        variant: "destructive",
      });
    }
  };

  const getProfileName = (userId: string | null) => {
    if (!userId) return "?";
    const profile = profiles.find((p) => p.user_id === userId);
    return profile?.name || "?";
  };

  const incompleteTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  if (loading) {
    return (
      <div className="glass-card p-8 animate-fade-in">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-6 border-b border-border/30">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">공유 할 일</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {incompleteTodos.length}개의 할 일이 남았습니다
            </p>
          </div>
        </div>

        {/* Add Todo Button */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl px-5 shadow-lg shadow-primary/25 w-full">
              <Plus className="h-4 w-4 mr-2" />
              새 할 일 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-0">
            <DialogHeader>
              <DialogTitle>새 할 일 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>제목</Label>
                <Input
                  placeholder="할 일을 입력하세요"
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                  className="rounded-xl bg-muted/30 border-0"
                />
              </div>
              <div className="space-y-2">
                <Label>마감 기한 (선택)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal rounded-xl bg-muted/30 border-0",
                        !newTodo.dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newTodo.dueDate ? format(newTodo.dueDate, "PPP", { locale: ko }) : "날짜 선택"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={newTodo.dueDate}
                      onSelect={(date) => setNewTodo({ ...newTodo, dueDate: date })}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>우선순위</Label>
                <Select
                  value={newTodo.priority}
                  onValueChange={(v) => setNewTodo({ ...newTodo, priority: v as "low" | "medium" | "high" })}
                >
                  <SelectTrigger className="rounded-xl bg-muted/30 border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">낮음</SelectItem>
                    <SelectItem value="medium">보통</SelectItem>
                    <SelectItem value="high">높음</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddTodo} className="w-full rounded-xl">
                추가
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Todo List */}
      <div className="divide-y divide-border/30">
        {incompleteTodos.length === 0 && completedTodos.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            아직 할 일이 없습니다. 새로운 할 일을 추가해보세요!
          </div>
        ) : (
          <>
            {/* Incomplete Todos */}
            {incompleteTodos.map((todo, index) => (
              <div
                key={todo.id}
                className="todo-item group animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <button
                  onClick={() => handleToggle(todo.id, todo.completed)}
                  className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-muted-foreground/30 hover:border-primary hover:bg-primary/10 transition-all flex items-center justify-center"
                >
                  <Circle className="h-3 w-3 text-transparent" />
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{todo.title}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {todo.due_date && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(todo.due_date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium",
                        priorityStyles[todo.priority]
                      )}
                    >
                      {priorityLabels[todo.priority]}
                    </span>
                  </div>
                </div>

                <Avatar className="h-7 w-7 flex-shrink-0 ring-2 ring-background">
                  <AvatarFallback
                    className="text-[10px] font-bold text-white"
                    style={{ backgroundColor: getProfileColor(todo.created_by) }}
                  >
                    {getProfileName(todo.created_by)[0]}
                  </AvatarFallback>
                </Avatar>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(todo.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {/* Completed Section */}
            {completedTodos.length > 0 && (
              <>
                <div className="px-6 py-3 bg-muted/20">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    완료됨 ({completedTodos.length})
                  </span>
                </div>
                {completedTodos.map((todo) => (
                  <div key={todo.id} className="todo-item opacity-50">
                    <button
                      onClick={() => handleToggle(todo.id, todo.completed)}
                      className="flex-shrink-0 w-6 h-6 rounded-full bg-success flex items-center justify-center"
                    >
                      <Check className="h-3.5 w-3.5 text-success-foreground" />
                    </button>
                    <p className="flex-1 text-sm text-muted-foreground line-through">
                      {todo.title}
                    </p>
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarFallback
                        className="text-[10px] text-white opacity-60"
                        style={{ backgroundColor: getProfileColor(todo.created_by) }}
                      >
                        {getProfileName(todo.created_by)[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}