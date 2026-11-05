import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';
import { getApiUrl } from '../services/api';

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  rollNo?: string;
  studentId?: string;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (role: UserRole, identifier: string, password: string) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean; user?: AuthUser }>;
  registerStudent: (data: any) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  setupInitialPassword: (rollNo: string, currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  requestResetOtp: (identifier: string) => Promise<{ success: boolean; error?: string; message?: string; maskedEmail?: string; emailSent?: boolean; smtpConfigured?: boolean; devOtp?: string }>;
  verifyResetOtp: (identifier: string, otp: string, newPassword: string, confirmPassword?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  resetPassword: (role: UserRole, identifier: string, newPassword: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check saved session in localStorage
    try {
      const savedToken = localStorage.getItem('placemate_auth_token');
      const savedUserStr = localStorage.getItem('placemate_auth_user');

      if (savedToken && savedUserStr) {
        const parsedUser = JSON.parse(savedUserStr);
        setToken(savedToken);
        setUser(parsedUser);
      } else {
        // If not logged in, user is null so login portal is displayed
        setUser(null);
      }
    } catch (e) {
      console.error('Failed to load session:', e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (role: UserRole, identifier: string, password: string) => {
    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, identifier, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Authentication failed' };
      }

      const mustChangePassword = Boolean(data.mustChangePassword);

      const userToStore = {
        ...data.user,
        mustChangePassword,
      };

      setUser(userToStore);
      setToken(data.token);
      localStorage.setItem('placemate_auth_token', data.token);
      localStorage.setItem('placemate_auth_user', JSON.stringify(userToStore));

      return { success: true, mustChangePassword, user: userToStore };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to connect. Please try again.' };
    }
  };

  const setupInitialPassword = async (
    rollNo: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    try {
      const res = await fetch(getApiUrl('/api/auth/setup-initial-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNo, currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Password setup failed' };
      }

      if (data.token) {
        setToken(data.token);
        localStorage.setItem('placemate_auth_token', data.token);
      }
      if (data.user) {
        const updated = { ...data.user, mustChangePassword: false };
        setUser(updated);
        localStorage.setItem('placemate_auth_user', JSON.stringify(updated));
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to update password. Please try again.' };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const currentToken = token || localStorage.getItem('placemate_auth_token');
      const res = await fetch(getApiUrl('/api/auth/change-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Password update failed' };
      }

      if (data.token) {
        setToken(data.token);
        localStorage.setItem('placemate_auth_token', data.token);
      }
      if (data.user) {
        const userObj = { ...data.user, mustChangePassword: false };
        setUser(userObj);
        localStorage.setItem('placemate_auth_user', JSON.stringify(userObj));
      } else if (user) {
        const updatedUser = { ...user, mustChangePassword: false };
        setUser(updatedUser);
        localStorage.setItem('placemate_auth_user', JSON.stringify(updatedUser));
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to update password. Please try again.' };
    }
  };

  const requestResetOtp = async (identifier: string) => {
    try {
      const res = await fetch(getApiUrl('/api/auth/forgot-password-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to dispatch verification code' };
      }

      return {
        success: true,
        message: data.message,
        maskedEmail: data.maskedEmail,
        emailSent: data.emailSent,
        smtpConfigured: data.smtpConfigured,
        devOtp: data.devOtp,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to connect. Please try again.' };
    }
  };

  const verifyResetOtp = async (
    identifier: string,
    otp: string,
    newPassword: string,
    confirmPassword?: string
  ) => {
    try {
      const res = await fetch(getApiUrl('/api/auth/verify-reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp, newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Verification code failed' };
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to complete password reset. Please try again.' };
    }
  };

  const registerStudent = async (studentData: any) => {
    try {
      const res = await fetch(getApiUrl('/api/auth/register-student'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('placemate_auth_token', data.token);
      localStorage.setItem('placemate_auth_user', JSON.stringify(data.user));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to connect. Please try again.' };
    }
  };

  const resetPassword = async (role: UserRole, identifier: string, newPassword: string) => {
    try {
      const res = await fetch(getApiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, identifier, newPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Password reset failed' };
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to connect. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('placemate_auth_token');
    localStorage.removeItem('placemate_auth_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        changePassword,
        setupInitialPassword,
        requestResetOtp,
        verifyResetOtp,
        registerStudent,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
