import React, { useState } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    onDelete: () => void;
    onEdit?: () => void;
    children: React.ReactNode;
    className?: string;
    confirmDelete?: boolean;
}

export default function SwipeableItemWrapper({ onDelete, onEdit, children, className }: Props) {
    const controls = useAnimation();
    const [isOpen, setIsOpen] = useState(false);

    // 드래그가 끝났을 때 실행되는 함수
    const handleDragEnd = async (event: any, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        // 왼쪽으로 -60px 이상 밀었으면 "열림" 상태로 고정 (버튼 2개 너비 고려)
        if (offset < -60 || velocity < -500) {
            await controls.start({ x: -120, transition: { type: "spring", stiffness: 400, damping: 40 } });
            setIsOpen(true);
        } else {
            // 아니면 닫음
            await controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 40 } });
            setIsOpen(false);
        }
    };

    const handleDeleteClick = () => {
        // 닫은 후 삭제 호출
        controls.start({ x: 0 });
        onDelete();
    };

    const handleEditClick = () => {
        controls.start({ x: 0 });
        onEdit?.();
    }

    return (
        <div className={cn("relative w-full mb-3 group", className)}>
            {/* 1. 배경 (액션 버튼들) */}
            <div className="absolute inset-y-0 right-0 flex w-[120px] rounded-xl overflow-hidden shadow-inner z-0">
                <button
                    type="button"
                    onClick={handleEditClick}
                    className="flex-1 bg-blue-500 flex flex-col items-center justify-center text-white gap-1 transition-colors hover:bg-blue-600 active:bg-blue-700"
                >
                    <Edit2 size={18} />
                    <span className="text-[10px] font-bold">수정</span>
                </button>
                <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="flex-1 bg-red-500 flex flex-col items-center justify-center text-white gap-1 transition-colors hover:bg-red-600 active:bg-red-700"
                >
                    <Trash2 size={18} />
                    <span className="text-[10px] font-bold">삭제</span>
                </button>
            </div>

            {/* 2. 전경 (실제 컨텐츠) */}
            <motion.div
                drag="x" // 가로로만 드래그 가능
                dragConstraints={{ left: -120, right: 0 }} // 왼쪽으로 최대 120px (버튼 너비)
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                animate={controls}
                whileTap={{ cursor: "grabbing" }}
                className="relative w-full h-full bg-white z-10 touch-pan-y"
                style={{ x: 0 }}
            >
                {children}
            </motion.div>
        </div>
    );
}
