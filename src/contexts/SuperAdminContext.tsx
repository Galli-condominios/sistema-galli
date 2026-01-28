import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SuperAdminContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  email: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  changeEmail: (newEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

const STORAGE_KEY = "superadmin_session";

interface StoredSession {
  token: string;
  email: string;
  expiresAt: number;
}

export const SuperAdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    checkStoredSession();
  }, []);

  const checkStoredSession = async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setIsLoading(false);
        return;
      }

      const session: StoredSession = JSON.parse(stored);
      
      // Check if token is expired
      if (session.expiresAt < Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        setIsLoading(false);
        return;
      }

      // Verify token with backend
      const { data, error } = await supabase.functions.invoke("superadmin-auth/verify", {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (error || !data?.valid) {
        localStorage.removeItem(STORAGE_KEY);
        setIsLoading(false);
        return;
      }

      setToken(session.token);
      setEmail(session.email);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error checking session:", error);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke("superadmin-auth/login", {
        body: { email, password },
      });

      if (error) {
        return { success: false, error: "Erro ao conectar com o servidor" };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }

      const session: StoredSession = {
        token: data.token,
        email: data.email,
        expiresAt: data.expiresAt,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setToken(data.token);
      setEmail(data.email);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Erro inesperado ao fazer login" };
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setEmail(null);
    setIsAuthenticated(false);
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!token) {
      return { success: false, error: "Não autenticado" };
    }

    try {
      const { data, error } = await supabase.functions.invoke("superadmin-auth/change-password", {
        body: { currentPassword, newPassword },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        return { success: false, error: "Erro ao conectar com o servidor" };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }

      return { success: true };
    } catch (error) {
      console.error("Change password error:", error);
      return { success: false, error: "Erro inesperado ao alterar senha" };
    }
  };

  const changeEmail = async (
    newEmail: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!token) {
      return { success: false, error: "Não autenticado" };
    }

    try {
      const { data, error } = await supabase.functions.invoke("superadmin-auth/change-email", {
        body: { newEmail, password },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (error) {
        return { success: false, error: "Erro ao conectar com o servidor" };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }

      // Update stored session with new token and email
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const session: StoredSession = JSON.parse(stored);
        session.token = data.token;
        session.email = data.email;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      }

      setToken(data.token);
      setEmail(data.email);

      return { success: true };
    } catch (error) {
      console.error("Change email error:", error);
      return { success: false, error: "Erro inesperado ao alterar email" };
    }
  };

  return (
    <SuperAdminContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        email,
        login,
        logout,
        changePassword,
        changeEmail,
      }}
    >
      {children}
    </SuperAdminContext.Provider>
  );
};

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (context === undefined) {
    throw new Error("useSuperAdmin must be used within a SuperAdminProvider");
  }
  return context;
};