export const USER_COLORS = [
    "red", "orange", "amber", "yellow", "lime",
    "green", "emerald", "teal", "cyan", "sky",
    "blue", "indigo", "violet", "purple", "fuchsia",
    "pink", "rose", "slate", "stone", "neutral"
] as const;

export type UserColor = typeof USER_COLORS[number];

/**
 * Generates a consistent color from the USER_COLORS palette based on a user ID or name.
 * Uses a simple hashing algorithm to ensure the same user always gets the same color.
 */
export function getUserColor(userId: string): UserColor {
    if (!userId) return "slate";

    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % USER_COLORS.length;
    return USER_COLORS[index];
}

// Safe lookup tables for Tailwind JIT
const EVENT_STYLES: Record<UserColor, string> = {
    "red": "bg-red-50 text-red-700 border-red-500 border-l-4",
    "orange": "bg-orange-50 text-orange-700 border-orange-500 border-l-4",
    "amber": "bg-amber-50 text-amber-700 border-amber-500 border-l-4",
    "yellow": "bg-yellow-50 text-yellow-700 border-yellow-500 border-l-4",
    "lime": "bg-lime-50 text-lime-700 border-lime-500 border-l-4",
    "green": "bg-green-50 text-green-700 border-green-500 border-l-4",
    "emerald": "bg-emerald-50 text-emerald-700 border-emerald-500 border-l-4",
    "teal": "bg-teal-50 text-teal-700 border-teal-500 border-l-4",
    "cyan": "bg-cyan-50 text-cyan-700 border-cyan-500 border-l-4",
    "sky": "bg-sky-50 text-sky-700 border-sky-500 border-l-4",
    "blue": "bg-blue-50 text-blue-700 border-blue-500 border-l-4",
    "indigo": "bg-indigo-50 text-indigo-700 border-indigo-500 border-l-4",
    "violet": "bg-violet-50 text-violet-700 border-violet-500 border-l-4",
    "purple": "bg-purple-50 text-purple-700 border-purple-500 border-l-4",
    "fuchsia": "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-500 border-l-4",
    "pink": "bg-pink-50 text-pink-700 border-pink-500 border-l-4",
    "rose": "bg-rose-50 text-rose-700 border-rose-500 border-l-4",
    "slate": "bg-slate-50 text-slate-700 border-slate-500 border-l-4",
    "stone": "bg-stone-50 text-stone-700 border-stone-500 border-l-4",
    "neutral": "bg-neutral-50 text-neutral-700 border-neutral-500 border-l-4",
};

const CHIP_STYLES: Record<UserColor, string> = {
    "red": "bg-red-50 text-red-700 border-red-500 border-l-2",
    "orange": "bg-orange-50 text-orange-700 border-orange-500 border-l-2",
    "amber": "bg-amber-50 text-amber-700 border-amber-500 border-l-2",
    "yellow": "bg-yellow-50 text-yellow-700 border-yellow-500 border-l-2",
    "lime": "bg-lime-50 text-lime-700 border-lime-500 border-l-2",
    "green": "bg-green-50 text-green-700 border-green-500 border-l-2",
    "emerald": "bg-emerald-50 text-emerald-700 border-emerald-500 border-l-2",
    "teal": "bg-teal-50 text-teal-700 border-teal-500 border-l-2",
    "cyan": "bg-cyan-50 text-cyan-700 border-cyan-500 border-l-2",
    "sky": "bg-sky-50 text-sky-700 border-sky-500 border-l-2",
    "blue": "bg-blue-50 text-blue-700 border-blue-500 border-l-2",
    "indigo": "bg-indigo-50 text-indigo-700 border-indigo-500 border-l-2",
    "violet": "bg-violet-50 text-violet-700 border-violet-500 border-l-2",
    "purple": "bg-purple-50 text-purple-700 border-purple-500 border-l-2",
    "fuchsia": "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-500 border-l-2",
    "pink": "bg-pink-50 text-pink-700 border-pink-500 border-l-2",
    "rose": "bg-rose-50 text-rose-700 border-rose-500 border-l-2",
    "slate": "bg-slate-50 text-slate-700 border-slate-500 border-l-2",
    "stone": "bg-stone-50 text-stone-700 border-stone-500 border-l-2",
    "neutral": "bg-neutral-50 text-neutral-700 border-neutral-500 border-l-2",
};

const AVATAR_STYLES: Record<UserColor, string> = {
    "red": "bg-red-500 text-white",
    "orange": "bg-orange-500 text-white",
    "amber": "bg-amber-500 text-white",
    "yellow": "bg-yellow-500 text-white",
    "lime": "bg-lime-500 text-white",
    "green": "bg-green-500 text-white",
    "emerald": "bg-emerald-500 text-white",
    "teal": "bg-teal-500 text-white",
    "cyan": "bg-cyan-500 text-white",
    "sky": "bg-sky-500 text-white",
    "blue": "bg-blue-500 text-white",
    "indigo": "bg-indigo-500 text-white",
    "violet": "bg-violet-500 text-white",
    "purple": "bg-purple-500 text-white",
    "fuchsia": "bg-fuchsia-500 text-white",
    "pink": "bg-pink-500 text-white",
    "rose": "bg-rose-500 text-white",
    "slate": "bg-slate-500 text-white",
    "stone": "bg-stone-500 text-white",
    "neutral": "bg-neutral-500 text-white",
};

/**
 * Returns the Tailwind classes for a user's multi-day event bar (solid background).
 */
export function getUserEventStyle(userId: string): string {
    const color = getUserColor(userId);
    return EVENT_STYLES[color];
}

/**
 * Returns the Tailwind classes for a user's single-day event "chip" (light background).
 */
export function getUserChipStyle(userId: string): string {
    const color = getUserColor(userId);
    return CHIP_STYLES[color];
}

/**
 * Returns the Tailwind classes for a user's avatar (solid background).
 */
export function getUserAvatarStyle(userId: string): string {
    const color = getUserColor(userId);
    return AVATAR_STYLES[color];
}

// ============================================
// 프로필 기반 색상 유틸리티
// ============================================

// 밝은 색상 팔레트 (캘린더 이벤트용)
export const BRIGHT_COLORS = [
    "#FF3B30", // Bright Red
    "#FF9500", // Bright Orange  
    "#FFCC00", // Bright Yellow
    "#34C759", // Bright Green
    "#007AFF", // Bright Blue
    "#5856D6", // Bright Purple
    "#FF2D55", // Bright Pink
    "#00C7BE", // Bright Teal
] as const;

// 그라데이션 색상 팔레트 (Avatar용)
export const GRADIENT_COLORS = [
    "from-professor-terracotta to-professor-terracotta/80",
    "from-professor-burgundy to-professor-burgundy/80",
    "from-professor-sage to-professor-sage/80",
    "from-professor-gold to-professor-gold/80",
    "from-professor-mauve to-professor-mauve/80",
    "from-professor-rose to-professor-rose/80",
] as const;

interface Profile {
    id: string;
    user_id: string;
    color?: string;
}

/**
 * 프로필 목록과 userId를 받아 해당 사용자의 색상을 반환합니다.
 * 프로필에 커스텀 색상이 있으면 그것을 사용하고, 없으면 인덱스 기반으로 색상을 할당합니다.
 * 
 * @param profiles - 프로필 목록
 * @param userId - 조회할 사용자 ID
 * @returns 색상 문자열 (hex 또는 Tailwind 클래스)
 */
export function getProfileColorByProfiles(
    profiles: Profile[],
    userId: string
): string {
    const profile = profiles.find((p) => p.user_id === userId);
    if (profile?.color) return profile.color;

    const index = profiles.findIndex((p) => p.user_id === userId);
    return BRIGHT_COLORS[Math.max(0, index) % BRIGHT_COLORS.length];
}

/**
 * 프로필 목록과 userId를 받아 Avatar용 그라데이션 클래스를 반환합니다.
 */
export function getProfileGradient(
    profiles: Profile[],
    userId: string
): string {
    const index = profiles.findIndex((p) => p.user_id === userId);
    return GRADIENT_COLORS[Math.max(0, index) % GRADIENT_COLORS.length];
}


/**
 * Returns the Tailwind classes for event types (Department, Professor, etc.)
 * Specifically returns a style with a strong left border color.
 */
export function getEventTypeStyle(type: string): string | undefined {
    switch (type) {
        case 'department':
            return "bg-[#FFFBEB] text-[#B45309] border-[#D97706] border-l-4"; // Amber/Gold
        case 'professor':
            return "bg-[#DCFCE7] text-[#15803D] border-[#16A34A] border-l-4"; // Green
        case 'external':
            return "bg-[#F3E8FF] text-[#7E22CE] border-[#9333EA] border-l-4"; // Purple
        case 'caldav':
            return "bg-[#FEF2F2] text-[#B91C1C] border-[#EF4444] border-l-4"; // Red
        default:
            return undefined;
    }
}
