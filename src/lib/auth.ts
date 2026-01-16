
export type UserRole = 'VOLUNTEER' | 'OFFICIAL' | 'ADMIN';

export interface UserProfile {
    id: string;
    fullName: string;
    phone: string;
    role: UserRole;
    email?: string;
}

export interface AuthState {
    user: UserProfile | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface AuthError {
    message: string;
    code?: string;
}
