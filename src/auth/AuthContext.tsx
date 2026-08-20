import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  createSession,
  deleteSession,
  fetchCurrentSession,
} from "../api/session";
import { getApiErrorMessage } from "../api/client";
import { t } from "../i18n";
import type { AuthUser } from "../types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchCurrentSession()
      .then((session) => {
        if (!active) return;
        setUser(session.user);
        setError(null);
      })
    .catch(() => {
      if (!active) return;
        setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);

    try {
      const session = await createSession(email, password);
      setUser(session.user);
      return true;
    } catch (loginError) {
      setError(getApiErrorMessage(loginError, t("auth.errors.login")));
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await deleteSession();
    } finally {
      setUser(null);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, signIn, signOut, clearError }),
    [clearError, error, loading, signIn, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
