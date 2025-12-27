import { Lock } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
    isChief: boolean;
    hasChiefRole: boolean;
    isChiefVerified: boolean;
    onPinVerifyOpen: () => void;
    onOpenStatistics?: () => void;
}

export function DashboardHeader({
    isChief,
    hasChiefRole,
    isChiefVerified,
    onPinVerifyOpen,
    onOpenStatistics
}: DashboardHeaderProps) {
    return (
        <header className="flex justify-between items-center animate-fade-in mb-2">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tighter">
                    {isChief ? '사령관 모드 🫡' : '대시보드 📋'}
                </h1>
                <p className="text-gray-500 font-bold text-sm mt-1">
                    {isChief ? '오늘도 학과를 완벽하게 지휘하세요.' : '오늘의 학과 현황을 확인하세요.'}
                </p>
            </div>
            {hasChiefRole && !isChiefVerified && (
                <button
                    onClick={onPinVerifyOpen}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-1.5 rounded-full text-xs font-black border border-gray-200 shadow-sm flex items-center gap-2 transition-all"
                >
                    <Lock size={12} />
                    학과장 권한 활성화
                </button>
            )}
            {isChief && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={onOpenStatistics}
                        className="bg-white/50 hover:bg-white text-gray-700 px-3 py-1 rounded-full text-[10px] font-black border border-gray-200 shadow-sm flex items-center gap-1 transition-all"
                    >
                        📊 활동 통계
                    </button>
                    <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg shadow-blue-500/30 animate-pulse flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        COMMANDER ACTIVE
                    </div>
                </div>
            )}
        </header>
    );
}
