import { create } from 'zustand';
import type { RoleKey } from '@unity/shared';

interface WorkerProfileSummary {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  visibility: string;
}

interface EmployerProfileSummary {
  id: string;
  companyName: string | null;
  contactName: string | null;
  logoUrl: string | null;
  isVerified: boolean;
}

interface AuthUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  roles: RoleKey[];
  activeRole: RoleKey;
  workerProfile?: WorkerProfileSummary | null;
  employerProfile?: EmployerProfileSummary | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: AuthUser | null) => void;
  setActiveRole: (role: RoleKey) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isInitialized: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
      isInitialized: true,
    }),

  setActiveRole: (role) =>
    set((state) => ({
      user: state.user ? { ...state.user, activeRole: role } : null,
    })),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
    }),

  initAuth: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/auth/me`,
        { credentials: 'include', cache: 'no-store' },
      );
      if (res.ok) {
        const json = await res.json();
        set({
          user: json.data.user as AuthUser,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
    }
  },
}));
