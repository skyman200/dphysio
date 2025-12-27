// ============================================
// 캘린더 관련 상수 정의
// ============================================

// 요일 인덱스 (JavaScript Date.getDay() 기준)
export const DAY_INDEX = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
} as const;

// 요일 레이블 (한국어)
export const DAY_LABELS = {
    SHORT: ["일", "월", "화", "수", "목", "금", "토"],
    FULL: ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"],
} as const;

// 캘린더 표시 제한
export const CALENDAR_LIMITS = {
    MAX_VISIBLE_EVENTS_PER_WEEK: 5,      // 주당 최대 표시 이벤트
    MAX_VISIBLE_EVENTS_PER_DAY: 3,       // 일당 최대 표시 이벤트
    MAX_NOTIFICATION_COUNT: 99,          // 알림 카운트 최대값 (99+)
    DEFAULT_WORK_START_HOUR: 9,          // 기본 업무 시작 시간
    DEFAULT_WORK_END_HOUR: 22,           // 기본 업무 종료 시간
    DEFAULT_EVENT_DURATION_HOURS: 1,     // 기본 이벤트 길이 (시간)
} as const;

// 기본 시간 설정
export const DEFAULT_TIMES = {
    START: "09:00",
    END: "10:00",
} as const;

// 뷰 모드
export const VIEW_MODES = {
    MONTH: "month",
    WEEK: "week",
    DAY: "day",
} as const;

export type ViewMode = typeof VIEW_MODES[keyof typeof VIEW_MODES];

// 요일 체크 헬퍼 함수
export const isWeekend = (dayIndex: number): boolean => {
    return dayIndex === DAY_INDEX.SUNDAY || dayIndex === DAY_INDEX.SATURDAY;
};

export const isSunday = (dayIndex: number): boolean => {
    return dayIndex === DAY_INDEX.SUNDAY;
};

export const isSaturday = (dayIndex: number): boolean => {
    return dayIndex === DAY_INDEX.SATURDAY;
};
