// API-related types

export interface ApiResult<T> {
    data?: T;
    error: Error | null;
}

export interface ApiResponse<T> {
    data?: T;
    error?: string;
}
