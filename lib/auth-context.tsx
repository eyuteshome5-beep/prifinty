"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, setAuthToken, getAuthToken, type User, type UserPreferences } from './api';

interface AuthContextType {
  user: User | null;
  preferences: UserPreferences | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; bonus?: { amount: number; message: string } }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateCredits: (newCredits: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setPreferences(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await authAPI.getMe();
      setUser(response.user);
      setPreferences(response.preferences);
    } catch {
      // If API is not available, clear auth state gracefully
      setAuthToken(null);
      setUser(null);
      setPreferences(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      setAuthToken(response.token);
      setUser(response.user);
      await refreshUser();
      return { 
        success: true, 
        bonus: response.bonus 
      };
    } catch (error) {
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await authAPI.register(username, email, password);
      setAuthToken(response.token);
      setUser(response.user);
      await refreshUser();
      return { success: true };
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore logout errors
    } finally {
      setAuthToken(null);
      setUser(null);
      setPreferences(null);
    }
  };

  const updateCredits = (newCredits: number) => {
    if (user) {
      setUser({ ...user, credits: newCredits });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        preferences,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        updateCredits,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
