/**
 * Authentication Context Provider
 *
 * Provides user and church context throughout the application.
 *
 * Features:
 * - User authentication state from Supabase
 * - User's church memberships from database
 * - Current active church selection
 * - Loading and error states
 * - Auto-refresh on auth state changes
 *
 * Usage:
 * Wrap your app with <AuthProvider> and use the useAuth() hook
 * to access user and church context in any component.
 *
 * @example
 * const { user, church, isLoading } = useAuth();
 *
 * if (isLoading) return <Loading />;
 * if (!user) return <LoginPrompt />;
 * if (!church) return <CreateChurch />;
 */

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Church membership data
 */
export interface ChurchMembership {
  id: string;
  name: string;
  role: 'ADMIN' | 'TREASURER' | 'MEMBER';
  logoUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
}

/**
 * User data from database
 */
export interface UserData {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

/**
 * Auth context shape
 */
interface AuthContextType {
  // Supabase user (auth)
  supabaseUser: User | null;

  // Database user
  user: UserData | null;

  // User's church memberships
  churches: ChurchMembership[];

  // Currently selected church
  church: ChurchMembership | null;

  // Set active church
  setActiveChurch: (churchId: string) => void;

  // Loading states
  isLoading: boolean;
  isLoadingChurches: boolean;

  // Error state
  error: string | null;

  // Refresh functions
  refreshUser: () => Promise<void>;
  refreshChurches: () => Promise<void>;

  // Sign out
  signOut: () => Promise<void>;
}

/**
 * Auth context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth provider props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth provider component
 *
 * Wraps the app and provides authentication context.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // Supabase user
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);

  // Database user
  const [user, setUser] = useState<UserData | null>(null);

  // Churches
  const [churches, setChurches] = useState<ChurchMembership[]>([]);
  const [church, setChurch] = useState<ChurchMembership | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingChurches, setIsLoadingChurches] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user data from database
   */
  const fetchUser = async (authUser: User) => {
    try {
      const response = await fetch('/api/auth/me');

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Error fetching user:', error);
      setError('Failed to load user data');
      setUser(null);
    }
  };

  /**
   * Fetch user's church memberships
   */
  const fetchChurches = async (userId: string) => {
    setIsLoadingChurches(true);
    setError(null);

    try {
      const response = await fetch(`/api/churches/my-churches?userId=${userId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch churches');
      }

      const data = await response.json();
      const fetchedChurches = data.churches || [];

      setChurches(fetchedChurches);

      // Auto-select first church if none selected
      if (fetchedChurches.length > 0 && !church) {
        setChurch(fetchedChurches[0]);

        // Store in localStorage for persistence
        localStorage.setItem('activeChurchId', fetchedChurches[0].id);
      }
    } catch (error) {
      console.error('Error fetching churches:', error);
      setError('Failed to load churches');
      setChurches([]);
    } finally {
      setIsLoadingChurches(false);
    }
  };

  /**
   * Set active church
   */
  const setActiveChurch = (churchId: string) => {
    const selectedChurch = churches.find((c) => c.id === churchId);

    if (selectedChurch) {
      setChurch(selectedChurch);
      localStorage.setItem('activeChurchId', churchId);
    }
  };

  /**
   * Refresh user data
   */
  const refreshUser = async () => {
    if (supabaseUser) {
      await fetchUser(supabaseUser);
    }
  };

  /**
   * Refresh churches
   */
  const refreshChurches = async () => {
    if (user) {
      await fetchChurches(user.id);
    }
  };

  /**
   * Sign out
   */
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setSupabaseUser(null);
      setUser(null);
      setChurches([]);
      setChurch(null);
      localStorage.removeItem('activeChurchId');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setSupabaseUser(session.user);
          await fetchUser(session.user);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);

        if (session?.user) {
          setSupabaseUser(session.user);
          await fetchUser(session.user);
        } else {
          setSupabaseUser(null);
          setUser(null);
          setChurches([]);
          setChurch(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Fetch churches when user is loaded
   */
  useEffect(() => {
    if (user) {
      fetchChurches(user.id);
    }
  }, [user]);

  /**
   * Restore active church from localStorage
   */
  useEffect(() => {
    if (churches.length > 0 && !church) {
      const storedChurchId = localStorage.getItem('activeChurchId');

      if (storedChurchId) {
        const storedChurch = churches.find((c) => c.id === storedChurchId);
        if (storedChurch) {
          setChurch(storedChurch);
        }
      }
    }
  }, [churches]);

  const value: AuthContextType = {
    supabaseUser,
    user,
    churches,
    church,
    setActiveChurch,
    isLoading,
    isLoadingChurches,
    error,
    refreshUser,
    refreshChurches,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth hook
 *
 * Access authentication context from any component.
 *
 * @returns Auth context
 * @throws Error if used outside AuthProvider
 *
 * @example
 * const { user, church, isLoading } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

/**
 * Hook to require authentication
 *
 * Redirects to login if not authenticated.
 * Shows loading state while checking.
 *
 * @returns User and church (guaranteed to be non-null)
 *
 * @example
 * const { user, church } = useRequireAuth();
 * // If we get here, user and church are definitely set
 */
export function useRequireAuth() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      // Redirect to login
      window.location.href = '/auth/login';
    }
  }, [auth.isLoading, auth.user]);

  return auth;
}

/**
 * Hook to require church context
 *
 * Redirects to church creation if user has no church.
 *
 * @returns Church (guaranteed to be non-null)
 *
 * @example
 * const church = useRequireChurch();
 * // If we get here, church is definitely set
 */
export function useRequireChurch() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isLoadingChurches && auth.user && !auth.church) {
      // Redirect to church creation
      window.location.href = '/dashboard/churches/create';
    }
  }, [auth.isLoading, auth.isLoadingChurches, auth.user, auth.church]);

  return auth.church;
}
