// Event-related types - centralized type definitions
// 이벤트 관련 타입 정의 중앙화

import { Building2, User, ExternalLink, Users, BookOpen, Calendar, LucideIcon, Briefcase, FileText, MessageCircle } from "lucide-react";

// ============================================
// 이벤트 기본 타입
// ============================================

export interface Event {
    id: string;
    title: string;
    start_date: string;
    end_date: string | null;
    location: string | null;
    description: string | null;
    created_by: string;
    created_at: string;
    category?: string;
    type?: string;
    priority?: string;
    source?: "local" | "caldav";
    caldav_calendar_color?: string;
    read_by?: string[];
}

export interface TransformedEvent extends Event {
    type: string;
    category: string;
    priority: string;
}

// 주간 캘린더용 확장 이벤트 타입
export interface ProcessedEvent extends TransformedEvent {
    span: number;
    startOffset: number;
    isContinuedBefore: boolean;
    isContinuedAfter: boolean;
    isMultiDay: boolean;
    originalStart: Date;
    originalEnd: Date;
    rowIndex: number;
}

export interface ParsedEvent {
    title: string;
    start_date: string;
    end_date: string | null;
    location: string | null;
    description: string | null;
}

export interface ParseResponse {
    success: boolean;
    event: ParsedEvent;
    model: string;
}

export type EventFormData = {
    title: string;
    description?: string;
    start_date: Date;
    end_date?: Date;
    location?: string;
    category?: string;
    type?: string;
};

export type ViewMode = "month" | "week" | "day";

// ============================================
// 이벤트 폼 상태 타입
// ============================================

export interface NewEventFormState {
    title: string;
    date: string;
    endDate: string;
    time: string;
    endTime: string;
    type: string;
    category: string;
    location: string;
    description: string;
    priority: string;
}

export const INITIAL_EVENT_FORM_STATE: NewEventFormState = {
    title: "",
    date: "",
    endDate: "",
    time: "",
    endTime: "",
    type: "department",
    category: "event",
    location: "",
    description: "",
    priority: "normal",
};

// ============================================
// 이벤트 타입/카테고리 상수
// ============================================

export interface EventTypeConfig {
    id: string;
    label: string;
    icon: LucideIcon;
    color: string;
}

export interface EventCategoryConfig {
    id: string;
    label: string;
    icon: LucideIcon;
}

export const EVENT_TYPES: EventTypeConfig[] = [
    { id: "department", label: "학과", icon: Building2, color: "bg-professor-gold" },
    { id: "professor", label: "교수", icon: User, color: "bg-professor-sage" },
    { id: "external", label: "외부", icon: ExternalLink, color: "bg-professor-mauve" },
    { id: "caldav", label: "Apple", icon: Calendar, color: "bg-[#FF6B6B]" },
];

export const EVENT_CATEGORIES: EventCategoryConfig[] = [
    { id: "counseling", label: "학생상담", icon: MessageCircle },
    { id: "meeting", label: "회의", icon: Users },
    { id: "education", label: "교육/연수", icon: BookOpen },
    { id: "trip", label: "출장", icon: Briefcase },
    { id: "personal", label: "개인업무", icon: User },
    { id: "report", label: "보고서", icon: FileText },
    { id: "admin", label: "행정업무", icon: Building2 },
    { id: "other", label: "기타", icon: Calendar },
];

// ============================================
// Dashboard 이벤트 타입
// ============================================

export interface DashboardEvent {
    id: string;
    title: string;
    type: 'URGENT' | 'NOTICE' | 'NORMAL';
    dDay?: number;
    date: string;
    content: string;
    category: string;
    originalDate: Date;
    createdBy: string;
    read_by?: string[];
    location?: string;
    end_date: string | null;
}
