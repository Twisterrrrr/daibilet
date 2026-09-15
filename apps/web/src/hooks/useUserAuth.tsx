'use client';

import * as React from 'react';

import { accountPurchases, userLogin, userLogout, userMe, userRefresh, userRegister, type SiteUserProfile } from '@/lib/user-api';
import { clearStoredToken, getStoredToken, setStoredToken } from '@/lib/user-auth';

type UserAuthContextValue = {
  user: SiteUserProfile | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
};

const UserAuthContext = React.createContext<UserAuthContextValue | null>(null);

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SiteUserProfile | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const validateToken = React.useCallback(async (accessToken: string) => {
    try {
      const profile = await userMe(accessToken);
      setUser(profile);
      return true;
    } catch {
      clearStoredToken();
      setToken(null);
      setUser(null);
      return false;
    }
  }, []);

  React.useEffect(() => {
    let disposed = false;

    const bootstrap = async () => {
      const stored = getStoredToken();
      if (stored) {
        const ok = await validateToken(stored);
        if (!disposed && ok) setToken(stored);
        if (!disposed) setIsLoading(false);
        return;
      }

      try {
        const refreshed = await userRefresh();
        if (refreshed.accessToken) {
          setStoredToken(refreshed.accessToken);
          if (!disposed) setToken(refreshed.accessToken);
          await validateToken(refreshed.accessToken);
        }
      } catch {
        // guest session
      } finally {
        if (!disposed) setIsLoading(false);
      }
    };

    void bootstrap();
    return () => {
      disposed = true;
    };
  }, [validateToken]);

  const login = React.useCallback(
    async (email: string, password: string) => {
      const result = await userLogin({ email, password });
      setStoredToken(result.accessToken);
      setToken(result.accessToken);
      await validateToken(result.accessToken);
    },
    [validateToken],
  );

  const register = React.useCallback(
    async (email: string, password: string, name: string) => {
      const result = await userRegister({ email, password, name });
      setStoredToken(result.accessToken);
      setToken(result.accessToken);
      await validateToken(result.accessToken);
    },
    [validateToken],
  );

  const logout = React.useCallback(async () => {
    const current = getStoredToken();
    if (current) {
      try {
        await userLogout(current);
      } catch {
        // ignore network errors on logout
      }
    }
    clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  const value: UserAuthContextValue = {
    user,
    token,
    isLoading,
    isLoggedIn: Boolean(token && user),
    login,
    register,
    logout,
  };

  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
}

export function useUserAuth() {
  const context = React.useContext(UserAuthContext);
  if (!context) throw new Error('useUserAuth must be used within UserAuthProvider');
  return context;
}

export function useUserAuthOptional() {
  return React.useContext(UserAuthContext);
}

export function useAccountPurchases(page = 1) {
  const { token, isLoggedIn } = useUserAuth();
  const [payload, setPayload] = React.useState<Awaited<ReturnType<typeof accountPurchases>> | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isLoggedIn || !token) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    accountPurchases(token, { page, limit: 10 })
      .then((data) => {
        if (!controller.signal.aborted) setPayload(data);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : String(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [isLoggedIn, token, page]);

  return { payload, isLoading, error };
}
