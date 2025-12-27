import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_TYPES, ViewMode } from "@/types";

interface CalendarHeaderProps {
    dateRangeLabel: string;
    viewMode: ViewMode;
    searchQuery: string;
    activeFilters: string[];
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onViewModeChange: (mode: ViewMode) => void;
    onSearchChange: (query: string) => void;
    onAddClick: () => void;
    onToggleFilter: (filterId: string) => void;
}

export function CalendarHeader({
    dateRangeLabel,
    viewMode,
    searchQuery,
    activeFilters,
    onPrev,
    onNext,
    onToday,
    onViewModeChange,
    onSearchChange,
    onAddClick,
    onToggleFilter,
}: CalendarHeaderProps) {
    return (
        <>
            {/* Header Controls */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={onPrev}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <h2 className="text-2xl font-bold min-w-[200px] text-center">
                            {dateRangeLabel}
                        </h2>
                        <Button variant="ghost" size="icon" onClick={onNext}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={onToday}>
                        오늘
                    </Button>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* View Mode Toggle */}
                    <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                        {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                            <Button
                                key={mode}
                                variant={viewMode === mode ? "default" : "ghost"}
                                size="sm"
                                onClick={() => onViewModeChange(mode)}
                                className="text-xs"
                            >
                                {mode === "month" ? "월" : mode === "week" ? "주" : "일"}
                            </Button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="일정 검색..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-9 w-[200px]"
                        />
                    </div>

                    {/* Add Event Button */}
                    <Button onClick={onAddClick} className="gap-2">
                        <Plus className="h-4 w-4" />
                        일정 추가
                    </Button>
                </div>
            </div>

            {/* Filter Toggles */}
            <div className="flex gap-2 flex-wrap">
                {EVENT_TYPES.map((type) => (
                    <Toggle
                        key={type.id}
                        pressed={activeFilters.includes(type.id)}
                        onPressedChange={() => onToggleFilter(type.id)}
                        className="gap-2 data-[state=on]:bg-primary/20"
                    >
                        <div className={cn("w-3 h-3 rounded-full", type.color)} />
                        {type.label}
                    </Toggle>
                ))}
            </div>
        </>
    );
}
