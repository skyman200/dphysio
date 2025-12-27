import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BriefingItem } from "@/hooks/useBriefingData";
import { ChevronRight, X, AlertCircle, Calendar, Megaphone, Check } from "lucide-react";

interface StoryBriefingModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: BriefingItem[];
}

export default function StoryBriefingModal({ isOpen, onClose, items }: StoryBriefingModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Reset index when items change or modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0);
        }
    }, [isOpen, items]);

    if (!isOpen || items.length === 0) return null;

    // Safety check
    const currentItem = items[currentIndex] || items[0];

    const handleNext = () => {
        if (currentIndex < items.length - 1) {
            setCurrentIndex((prev) => prev + 1);
        } else {
            onClose();
        }
    };

    // Theme based on item type
    const getTheme = (type: string) => {
        switch (type) {
            case "urgent":
                return {
                    bg: "bg-red-500",
                    badge: "bg-red-100 text-red-700",
                    buttonShadow: "shadow-red-500/30",
                    icon: <AlertCircle className="h-8 w-8 text-white" />,
                    label: "긴급 요망"
                };
            case "notice":
                return {
                    bg: "bg-blue-500",
                    badge: "bg-blue-100 text-blue-700",
                    buttonShadow: "shadow-blue-500/30",
                    icon: <Megaphone className="h-8 w-8 text-white" />,
                    label: "필독 공지"
                };
            case "schedule":
                return {
                    bg: "bg-amber-500",
                    badge: "bg-amber-100 text-amber-800",
                    buttonShadow: "shadow-amber-500/30",
                    icon: <Calendar className="h-8 w-8 text-white" />,
                    label: "일정 알림"
                };
            default:
                return {
                    bg: "bg-gray-800",
                    badge: "bg-gray-100 text-gray-800",
                    buttonShadow: "shadow-gray-500/30",
                    icon: <Check className="h-8 w-8 text-white" />,
                    label: "알림"
                };
        }
    };

    const theme = getTheme(currentItem.type);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="w-full max-w-[400px] px-6">

                {/* Progress Bar */}
                <div className="flex gap-1.5 mb-8">
                    {items.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${idx <= currentIndex ? "bg-white" : "bg-white/20"
                                }`}
                        />
                    ))}
                </div>

                {/* Card Content */}
                <div className="relative h-[500px]"> {/* Fixed height container to prevent layout shifts */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ opacity: 0, x: 50, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -50, scale: 0.95 }}
                            transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
                            className="bg-white rounded-[32px] overflow-hidden shadow-2xl absolute inset-0 flex flex-col"
                        >
                            {/* Visual Header */}
                            <div className={`h-[40%] ${theme.bg} flex items-center justify-center relative overflow-hidden transition-colors duration-300`}>
                                {/* Abstract Shapes */}
                                <div className="absolute top-[-50%] right-[-20%] w-[300px] h-[300px] bg-white/10 rounded-full blur-3xl opacity-50" />
                                <div className="absolute bottom-[-20%] left-[-20%] w-[200px] h-[200px] bg-black/10 rounded-full blur-2xl opacity-30" />

                                <motion.div
                                    initial={{ scale: 0, rotate: -20 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ delay: 0.1, type: "spring" }}
                                    className="relative z-10 p-5 bg-white/20 rounded-[2rem] backdrop-blur-md shadow-inner border border-white/20"
                                >
                                    {theme.icon}
                                </motion.div>
                            </div>

                            {/* Content Body */}
                            <div className="flex-1 p-8 flex flex-col items-center text-center">
                                <motion.span
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold mb-5 ${theme.badge} uppercase tracking-wide`}
                                >
                                    {theme.label}
                                </motion.span>

                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-2xl font-bold text-gray-900 mb-4 leading-snug break-keep"
                                >
                                    {currentItem.title.replace(/^(🚨|📢|🗓️|⚠️|✅)\s*/, '')}
                                </motion.h2>

                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-gray-500 mb-auto leading-relaxed text-sm w-full break-keep"
                                >
                                    {currentItem.description}
                                </motion.p>

                                <motion.button
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    onClick={handleNext}
                                    className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6 ${theme.bg} ${theme.buttonShadow}`}
                                >
                                    <span>{currentIndex === items.length - 1 ? "확인 완료 및 입장" : currentItem.actionLabel || "확인했습니다"}</span>
                                    <ChevronRight className="w-5 h-5 opacity-80" />
                                </motion.button>
                            </div>

                            {/* Close X */}
                            <button
                                onClick={onClose}
                                className="absolute top-5 right-5 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full transition-colors backdrop-blur-sm"
                                aria-label="Skip"
                            >
                                <X className="w-4 h-4" />
                            </button>

                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Counter */}
                <motion.p
                    key={currentIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-white/50 text-xs mt-8 font-medium tracking-widest"
                >
                    {currentIndex + 1} / {items.length}
                </motion.p>
            </div>
        </div>
    );
}
