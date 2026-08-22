import { buildApiUrl as buildSharedApiUrl, createAuth } from '@webhatchery/auth-react';
import { setTokenProvider as setApiTokenProvider } from '../services/api';

export interface User {
  id: string;
  email: string;
  display_name: string;
  username: string;
  role: string;
  is_verified?: boolean;
  is_guest?: boolean;
  auth_type?: 'frontpage' | 'guest';
  created_at?: string;
  updated_at?: string;
}

function requiredEnv(name: string): string {
  const value = import.meta.env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function registerTokenProvider(provider: (() => string | null | Promise<string | null>) | null): void {
  setApiTokenProvider(async () => {
    const token = provider ? await provider() : null;
    if (!token) {
      throw new Error('No authentication token is available.');
    }

    return token;
  });
}

const { AuthProvider, useAuth } = createAuth<User>({
  guestAuthStorageKey: 'story-forge-guest-session',
  loginUrl: requiredEnv('VITE_WEBHATCHERY_LOGIN_URL'),
  signupUrl: requiredEnv('VITE_WEBHATCHERY_SIGNUP_URL'),
  buildApiUrl: (path) => buildSharedApiUrl(requiredEnv('VITE_API_BASE_URL'), '', path),
  setTokenProvider: registerTokenProvider,
});

export { AuthProvider, useAuth };
