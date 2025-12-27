import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface WheelPickerProps {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    height?: number;
    itemHeight?: number;
    className?: string;
}

export function WheelPicker({
    options,
    value,
    onChange,
    height = 200,
    itemHeight = 40,
    className,
}: WheelPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeout = useRef<NodeJS.Timeout>();

    useEffect(() => {
        // Initial scroll to position
        if (containerRef.current) {
            const index = options.findIndex((o) => o.value === value);
            if (index !== -1) {
                containerRef.current.scrollTop = index * itemHeight;
            }
        }
    }, []); // Only on mount to avoid fighting with user scroll

    useEffect(() => {
        // Sync external value changes if not currently scrolling
        if (!isScrolling && containerRef.current) {
            const index = options.findIndex((o) => o.value === value);
            if (index !== -1) {
                const targetScroll = index * itemHeight;
                if (Math.abs(containerRef.current.scrollTop - targetScroll) > itemHeight / 2) {
                    containerRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
                }
            }
        }
    }, [value, isScrolling, itemHeight, options]);

    const handleScroll = () => {
        if (containerRef.current) {
            setIsScrolling(true);
            clearTimeout(scrollTimeout.current);

            const scrollTop = containerRef.current.scrollTop;
            const selectedIndex = Math.round(scrollTop / itemHeight);

            // Debounce the selection update slightly to avoid rapid updates during fast scroll
            // but still feel responsive
            if (options[selectedIndex] && options[selectedIndex].value !== value) {
                // Optionally update immediately if needed, or wait for snap
                // For wheel picker, updating while scrolling is good for visual feedback
                onChange(options[selectedIndex].value);
            }

            scrollTimeout.current = setTimeout(() => {
                setIsScrolling(false);
                // Ensure perfect snap on stop
                const finalIndex = Math.round(containerRef.current!.scrollTop / itemHeight);
                if (options[finalIndex] && options[finalIndex].value !== value) {
                    onChange(options[finalIndex].value);
                }
            }, 150);
        }
    };

    return (
        <div className={cn("relative overflow-hidden group", className)} style={{ height }}>
            {/* Selection Highlight / Magnifier */}
            <div
                className="absolute w-full pointer-events-none z-10 top-1/2 -translate-y-1/2 border-y border-border/10 bg-muted/10 backdrop-blur-[1px]"
                style={{ height: itemHeight }}
            />

            {/* Gradient Masks */}
            <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-background/90 to-transparent pointer-events-none z-20" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/90 to-transparent pointer-events-none z-20" />

            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide no-scrollbar"
                style={{
                    paddingTop: (height / 2) - (itemHeight / 2),
                    paddingBottom: (height / 2) - (itemHeight / 2)
                }}
            >
                {options.map((option, index) => {
                    const isActive = option.value === value;
                    return (
                        <div
                            key={option.value}
                            className={cn(
                                "flex items-center justify-center snap-center transition-all duration-200 cursor-pointer select-none",
                                isActive ? "text-primary font-bold scale-100 opacity-100" : "text-muted-foreground scale-90 opacity-40 hover:opacity-70"
                            )}
                            style={{ height: itemHeight }}
                            onClick={() => {
                                // Scroll to this item on click
                                if (containerRef.current) {
                                    containerRef.current.scrollTo({
                                        top: index * itemHeight,
                                        behavior: 'smooth'
                                    });
                                }
                            }}
                        >
                            {option.label}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
