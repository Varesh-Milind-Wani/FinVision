import * as React from 'react';

export type AuthUser = {
  id: string;
  name?: string;
  email?: string;
};

export type AuthContextValue = {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  authError?: string;
  login?: (input: { email: string; password: string }) => any;
  register?: (input: any) => any;
  logout?: () => void;
  updateProfile?: (changes: any) => any;
  clearAuthError?: () => void;
};

export const AuthProvider: React.FC<{ children?: React.ReactNode }>;
export const useAuth: () => AuthContextValue;

