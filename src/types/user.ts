// User-related types

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'professor' | 'student';
    createdAt: Date;
    avatarUrl?: string;
}

export interface Profile {
    id: string;
    user_id: string;
    name: string;
    email: string;
    role: string;
    avatar_url?: string;
    position?: string;
    department?: string;
    research_areas?: string[];
    profileCompleted?: boolean;
    created_at?: string; // Optional - may not be present in all contexts
}
