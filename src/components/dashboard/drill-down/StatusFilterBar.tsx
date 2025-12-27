import { motion } from 'framer-motion';
import { AlertTriangle, List, Bell, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterType = 'ALL' | 'URGENT' | 'NOTICE' | null;

interface StatusFilterBarProps {
    currentFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
    counts: {
        urgent: number;
        notice: number;
        all: number;
    };
}

export function StatusFilterBar({ currentFilter, onFilterChange, counts }: StatusFilterBarProps) {
    const handleToggle = (type: 'ALL' | 'URGENT' | 'NOTICE') => {
        // Toggle: clicking same filter hides content, clicking different filter shows that content
        if (currentFilter === type) {
            onFilterChange(null); // Hide content
        } else {
            onFilterChange(type); // Show content
        }
    };

    return (
        <div className="flex gap-4 w-full">
            {/* Urgent Card */}
            <FilterCard
                type="URGENT"
                label="마감 임박"
                count={counts.urgent}
                icon={AlertTriangle}
                colorClass="bg-red-50 text-red-600 border-red-200"
                activeClass="ring-2 ring-red-500 ring-offset-2"
                isActive={currentFilter === 'URGENT'}
                onClick={() => handleToggle('URGENT')}
            />

            {/* Notice Card */}
            <FilterCard
                type="NOTICE"
                label="신규 공지"
                count={counts.notice}
                icon={Bell}
                colorClass="bg-blue-50 text-blue-600 border-blue-200"
                activeClass="ring-2 ring-blue-500 ring-offset-2"
                isActive={currentFilter === 'NOTICE'}
                onClick={() => handleToggle('NOTICE')}
            />

            {/* All Tasks Card */}
            <FilterCard
                type="ALL"
                label="전체 일정"
                count={counts.all}
                icon={List}
                colorClass="bg-white text-gray-600 border-gray-200"
                activeClass="ring-2 ring-gray-400 ring-offset-2"
                isActive={currentFilter === 'ALL'}
                onClick={() => handleToggle('ALL')}
            />
        </div>
    );
}

function FilterCard({
    type,
    label,
    count,
    icon: Icon,
    colorClass,
    activeClass,
    isActive,
    onClick
}: any) {
    return (
        <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={cn(
                "flex-1 p-4 rounded-xl border shadow-sm transition-all flex items-center justify-between group",
                colorClass,
                isActive ? activeClass : "hover:shadow-md"
            )}
        >
            <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg bg-white/50 backdrop-blur-sm shadow-sm", isActive && "bg-white/80")}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm xl:text-base">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">
                    {count}
                </div>
                <ChevronDown
                    className={cn(
                        "w-4 h-4 transition-transform",
                        isActive ? "rotate-180" : ""
                    )}
                />
            </div>
        </motion.button>
    );
}
