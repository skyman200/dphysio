// ============================================
// 앱 전역 상수 정의
// ============================================

// 할 일 우선순위
export const PRIORITY_OPTIONS = [
    { id: "low", label: "낮음", color: "text-blue-500" },
    { id: "medium", label: "보통", color: "text-yellow-500" },
    { id: "high", label: "높음", color: "text-red-500" },
] as const;

export type PriorityType = typeof PRIORITY_OPTIONS[number]["id"];

// Meeting item 타입
export const MEETING_ITEM_TYPES = [
    { id: "decision", label: "결정사항", icon: "CheckCircle" },
    { id: "action", label: "액션아이템", icon: "PlayCircle" },
    { id: "link", label: "링크", icon: "Link" },
] as const;

export type MeetingItemTypeId = typeof MEETING_ITEM_TYPES[number]["id"];

// Meeting item 상태
export const MEETING_ITEM_STATUSES = [
    { id: "open", label: "대기", color: "bg-gray-500" },
    { id: "doing", label: "진행중", color: "bg-blue-500" },
    { id: "done", label: "완료", color: "bg-green-500" },
] as const;

export type MeetingItemStatusId = typeof MEETING_ITEM_STATUSES[number]["id"];

// 자원 타입
export const RESOURCE_TYPES = [
    { id: "room", label: "강의실" },
    { id: "equipment", label: "장비" },
    { id: "vehicle", label: "차량" },
] as const;

export type ResourceType = typeof RESOURCE_TYPES[number]["id"];

// 파일 카테고리
export const FILE_CATEGORIES = [
    { id: "lecture", label: "강의자료" },
    { id: "form", label: "양식" },
    { id: "meeting", label: "회의자료" },
    { id: "research", label: "연구자료" },
    { id: "other", label: "기타" },
] as const;

export type FileCategoryType = typeof FILE_CATEGORIES[number]["id"];

// 날짜 포맷
export const DATE_FORMATS = {
    FULL: "yyyy년 M월 d일 (EEE)",
    SHORT: "M월 d일",
    DATE_ONLY: "yyyy-MM-dd",
    TIME_ONLY: "HH:mm",
    DATETIME: "yyyy-MM-dd HH:mm",
} as const;

// 페이지네이션
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 50,
} as const;
