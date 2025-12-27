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
    }, []); // Only on mount

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

            if (options[selectedIndex] && options[selectedIndex].value !== value) {
                onChange(options[selectedIndex].value);
            }

            scrollTimeout.current = setTimeout(() => {
                setIsScrolling(false);
                const finalIndex = Math.round(containerRef.current!.scrollTop / itemHeight);
                if (options[finalIndex] && options[finalIndex].value !== value) {
                    onChange(options[finalIndex].value);
                }
            }, 150);
        }
    };

    return (
        <div className={cn("relative overflow-hidden group", className)} style={{ height }}>
            {/* Selection Highlight - Z-index fixed to be behind text */}
            <div
                className="absolute w-full pointer-events-none top-1/2 -translate-y-1/2 border-y border-border/20 bg-muted/5 z-0"
                style={{ height: itemHeight }}
            />

            {/* Gradient Masks - Reduced opacity and size for clarity */}
            <div className="absolute inset-x-0 top-0 h-[30%] bg-gradient-to-b from-background to-transparent pointer-events-none z-10 opacity-90" />
            <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-background to-transparent pointer-events-none z-10 opacity-90" />

            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="relative h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide no-scrollbar z-20"
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
                                isActive ? "text-primary font-bold scale-100 opacity-100" : "text-muted-foreground/80 font-medium scale-100 opacity-50 hover:opacity-80"
                            )}
                            style={{ height: itemHeight }}
                            onClick={() => {
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
