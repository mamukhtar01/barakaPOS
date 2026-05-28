"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ConfigProvider, App, theme } from "antd";

interface SessionUser {
  id: number;
  username: string;
  role: string;
}

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/login";
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#16a34a",
          borderRadius: 8,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
      }}
    >
      <App>
        <AuthContext.Provider value={{ user, loading, logout, refresh }}>
          {children}
        </AuthContext.Provider>
      </App>
    </ConfigProvider>
  );
}
