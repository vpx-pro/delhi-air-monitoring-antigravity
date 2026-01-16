
import { AuthState, UserProfile, UserRole } from './auth';

// Simulate a database of users in localStorage for dev persistence
const STORAGE_KEY = 'delhi_air_mock_auth';

export const MockAuthService = {

    signUp: async (phone: string, fullName: string, role: UserRole, email?: string): Promise<{ user: UserProfile | null, error: string | null }> => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (phone === '9999999999') {
            return { user: null, error: 'User already exists with this phone number.' };
        }

        const newUser: UserProfile = {
            id: `user_${Math.random().toString(36).substr(2, 9)}`,
            fullName,
            phone,
            role,
            email
        };

        // Persist to local storage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
        return { user: newUser, error: null };
    },

    signIn: async (phone: string): Promise<{ user: UserProfile | null, error: string | null }> => {
        await new Promise(resolve => setTimeout(resolve, 800));

        // For mock, we just check if "any" user is stored or if phone matches the one we just made
        // OR simply allow any phone to "login" if it looks valid

        // Check local storage primarily
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const user = JSON.parse(stored) as UserProfile;
            if (user.phone === phone) {
                return { user, error: null };
            }
        }

        // If not found in simple mock storage, return error or auto-create? 
        // Let's return error to force signup flow for better testing
        return { user: null, error: 'User not found. Please sign up.' };
    },

    signOut: async (): Promise<void> => {
        localStorage.removeItem(STORAGE_KEY);
    },

    getCurrentUser: (): UserProfile | null => {
        if (typeof window === 'undefined') return null;
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    }
};
