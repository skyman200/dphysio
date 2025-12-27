import React from 'react';
import { Calendar as CalendarIcon, Share } from 'lucide-react'; // 아이콘
import { addToAppleCalendar } from '@/utils/appleCalendarUtils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
    title: string;
    date: Date;
    endDate?: Date; // Added endDate support
    location?: string;
    className?: string; // Support custom styling
}

export default function AddToIosButton({ title, date, endDate, location, className }: Props) {

    // 핸들러
    const handleClick = () => {
        addToAppleCalendar({
            title: title,
            startDate: date,
            endDate: endDate,
            location: location || '물리치료과 실습실', // 기본 장소 지정 가능
            description: '물리치료과 웹앱에서 추가된 일정입니다.',
        });
    };

    // (선택사항) iOS 기기가 아니면 버튼을 숨길 수도 있음 -> 일단 모두 표시 (테스트용)
    // const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    // if (!isIOS) return null; 

    return (
        <Button
            onClick={handleClick}
            className={cn("w-full flex items-center justify-center gap-2 bg-black text-white hover:bg-gray-800 transition-all active:scale-95 shadow-md", className)}
        >
            <CalendarIcon size={18} className="text-white" />
            <span className="font-semibold">Apple Calendar에 추가</span>
        </Button>
    );
}
