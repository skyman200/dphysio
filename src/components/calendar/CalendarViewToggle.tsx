import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { List, LayoutTemplate, Layers, Minimize2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewType = "compact" | "stack" | "detailed" | "list";

interface CalendarViewToggleProps {
    currentView: ViewType;
    onViewChange: (view: ViewType) => void;
}

export function CalendarViewToggle({ currentView, onViewChange }: CalendarViewToggleProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    {currentView === "list" ? <List className="h-5 w-5" /> : <LayoutTemplate className="h-5 w-5" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 glass-card border-0 p-2">
                {/* Placeholder options for now, as only detailed/list are requested mainly */}
                <DropdownMenuItem
                    onClick={() => onViewChange("compact")}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg focus:bg-primary/10 cursor-pointer"
                >
                    <Minimize2 className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">축소형</span>
                    {currentView === "compact" && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => onViewChange("stack")}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg focus:bg-primary/10 cursor-pointer"
                >
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">스택형</span>
                    {currentView === "stack" && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => onViewChange("detailed")}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg focus:bg-primary/10 cursor-pointer"
                >
                    <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">상세형</span>
                    {currentView === "detailed" && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-border/30" />

                <DropdownMenuItem
                    onClick={() => onViewChange("list")}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg focus:bg-primary/10 cursor-pointer"
                >
                    <List className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">목록형</span>
                    {currentView === "list" && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
