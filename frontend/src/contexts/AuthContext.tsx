import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { setTokenProvider } from '../services/api';

interface User {
  id: string;
  email: string;
  display_name: string;
  username: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface FrontpageStoredUser {
  id?: number | string;
  username?: string;
  display_name?: string;
  role?: string;
  email?: string;
}

interface AuthApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  checkingUserStatus: boolean;
  error: string | null;
  refreshUserInfo: () => Promise<void>;
  loginWithRedirect: () => void;
  logout: () => void;
  getAccessToken: () => Promise<string>;
}

const FRONTPAGE_AUTH_STORAGE_KEY = 'auth-storage';
const FRONTPAGE_LOGIN_PATH = '/login';

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  checkingUserStatus: true,
  error: null,
  refreshUserInfo: async () => undefined,
  loginWithRedirect: () => undefined,
  logout: () => undefined,
  getAccessToken: async () => {
    throw new Error('Not authenticated');
  },
});

export const useAuth = () => useContext(AuthContext);

const readFrontpageToken = (): string | null => {
  const authStorage = localStorage.getItem(FRONTPAGE_AUTH_STORAGE_KEY);
  if (!authStorage) return null;

  try {
    const parsed = JSON.parse(authStorage) as {
      state?: { token?: string | null };
    };
    const token = parsed?.state?.token;
    return typeof token === 'string' && token.trim() !== '' ? token : null;
  } catch (error) {
    console.error('Failed to parse frontpage auth-storage token', error);
    return null;
  }
};

const readFrontpageUser = (): FrontpageStoredUser | null => {
  const authStorage = localStorage.getItem(FRONTPAGE_AUTH_STORAGE_KEY);
  if (!authStorage) return null;

  try {
    const parsed = JSON.parse(authStorage) as {
      state?: { user?: FrontpageStoredUser | null };
    };
    return parsed?.state?.user ?? null;
  } catch (error) {
    console.error('Failed to parse frontpage auth-storage user', error);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const [token, setToken] = useState<string | null>(() => readFrontpageToken());
  const [user, setUser] = useState<User | null>(null);
  const [checkingUserStatus, setCheckingUserStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const syncTokenFromFrontpage = useCallback(() => {
    setToken(readFrontpageToken());
  }, []);

  const logout = useCallback(() => {
    // Campaign Chronicle & Story Forge must not clear shared frontpage auth state.
    window.location.href = FRONTPAGE_LOGIN_PATH;
  }, []);

  const loginWithRedirect = useCallback(() => {
    window.location.href = FRONTPAGE_LOGIN_PATH;
  }, []);

  const getAccessToken = useCallback(async (): Promise<string> => {
    if (!token) {
      throw new Error('Not authenticated');
    }
    return token;
  }, [token]);

  useEffect(() => {
    setTokenProvider(async () => {
      if (!token) {
        throw new Error('No JWT token in session');
      }
      return token;
    });
  }, [token]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === FRONTPAGE_AUTH_STORAGE_KEY) {
        syncTokenFromFrontpage();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [syncTokenFromFrontpage]);

  const refreshUserInfo = useCallback(async (): Promise<void> => {
    if (!apiBaseUrl) {
      throw new Error('Missing required VITE_API_BASE_URL');
    }

    if (!token) {
      setUser(null);
      setCheckingUserStatus(false);
      return;
    }

    setCheckingUserStatus(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/current-user`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const raw = await response.text();
      let result: AuthApiResponse<User> | null = null;
      try {
        result = raw ? (JSON.parse(raw) as AuthApiResponse<User>) : null;
      } catch {
        throw new Error(
          `Auth validation returned non-JSON response (status ${response.status}): ${raw.slice(0, 220)}`
        );
      }

      if (!result || !response.ok || !result.success || !result.data) {
        throw new Error(result?.message || `Authentication check failed (${response.status})`);
      }

      const frontpageUser = readFrontpageUser();
      setUser({
        ...result.data,
        username: frontpageUser?.username || result.data.username,
        display_name:
          frontpageUser?.display_name ||
          frontpageUser?.username ||
          result.data.display_name,
        email: frontpageUser?.email || result.data.email,
        role: frontpageUser?.role || result.data.role,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to validate session';
      setError(message);
      // Do not clear shared auth-storage or force logout from this app.
    } finally {
      setCheckingUserStatus(false);
    }
  }, [apiBaseUrl, token]);

  useEffect(() => {
    syncTokenFromFrontpage();
    refreshUserInfo();
  }, [refreshUserInfo, syncTokenFromFrontpage]);

  const value = useMemo<AuthContextType>(
    () => ({
      isAuthenticated: Boolean(token && user),
      isLoading: checkingUserStatus,
      user,
      checkingUserStatus,
      error,
      refreshUserInfo,
      loginWithRedirect,
      logout,
      getAccessToken,
    }),
    [checkingUserStatus, error, getAccessToken, loginWithRedirect, logout, refreshUserInfo, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
