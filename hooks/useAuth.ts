import { useState, useEffect } from "react";
import { api } from "@/lib/api/api";
import { setAuthToken, getAuthToken, removeAuthToken } from "@/lib/api/api";

interface UseAuthReturn {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  otpLogin: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  checkAuth: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = async (): Promise<void> => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const user = await api.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      removeAuthToken();
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.login(email, password);
      setAuthToken(response.token);
      setCurrentUser(response.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  };

    const otpLogin = async (
    email: string,
    otp: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentUser(data.user);
        setAuthToken(data.token);

        return { success: true };
      }

      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = (): void => {
    removeAuthToken();
    setCurrentUser(null);
  };

  return { currentUser, loading, login, logout, otpLogin, checkAuth };
};