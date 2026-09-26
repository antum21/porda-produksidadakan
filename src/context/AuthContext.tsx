import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { UserProfile, UserRole } from '../types';
import {
  seedSampleDataIfEmpty,
  createUserByAdmin,
} from '../services/dbService';

interface AuthContextType {
  currentUser: { uid: string; displayName?: string; email?: string } | null;
  user: { name: string; email?: string; username: string } | null;
  userProfile: UserProfile | null;
  role: UserRole;
  isSuperAdmin: boolean;
  loading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  createAccountByAdmin: (data: {
    username: string;
    nama: string;
    role: UserRole;
    phone?: string;
    email?: string;
  }) => Promise<UserProfile>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Check active server-side HTTP-only session on load
  const verifySession = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('porda_session_token');
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const res = await fetch('/api/auth/session', {
        method: 'GET',
        headers,
        credentials: 'include', // Sends HTTP-Only session cookie
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUserProfile({
            uid: data.user.uid || 'usr-superadmin-01',
            username: data.user.username,
            nama: data.user.nama,
            role: data.user.role,
            status: 'active',
          });
        } else {
          localStorage.removeItem('porda_session_token');
          setUserProfile(null);
        }
      } else {
        localStorage.removeItem('porda_session_token');
        setUserProfile(null);
      }
    } catch (err) {
      console.warn('Session verification note:', err);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Seed initial data in Firestore if empty
    seedSampleDataIfEmpty();
    verifySession();
  }, [verifySession]);

  const login = async (username: string, pass: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include', // Stores HTTP-only secure cookie
        body: JSON.stringify({
          username: username.trim(),
          password: pass,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Username atau password salah.');
      }

      if (data.token) {
        localStorage.setItem('porda_session_token', data.token);
      }

      setUserProfile({
        uid: data.user.uid || 'usr-superadmin-01',
        username: data.user.username,
        nama: data.user.nama,
        role: data.user.role,
        status: 'active',
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const storedToken = localStorage.getItem('porda_session_token');
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
      localStorage.removeItem('porda_session_token');

      await fetch('/api/auth/logout', {
        method: 'POST',
        headers,
        credentials: 'include',
      });
    } catch (err) {
      console.warn('Logout note:', err);
    } finally {
      localStorage.removeItem('porda_session_token');
      setUserProfile(null);
    }
  };

  const createAccountByAdmin = async (data: {
    username: string;
    nama: string;
    role: UserRole;
    phone?: string;
    email?: string;
  }): Promise<UserProfile> => {
    const isSuper = userProfile?.role === 'super_admin' || userProfile?.role === 'Admin';
    if (!isSuper) {
      throw new Error('Akses ditolak: Hanya Super Admin yang dapat membuat akun staf.');
    }
    return await createUserByAdmin(data);
  };

  const role: UserRole = userProfile?.role || 'super_admin';
  const isSuperAdmin = userProfile !== null && (role === 'super_admin' || role === 'Admin');

  const user = useMemo(() => {
    if (!userProfile) return null;
    return {
      name: userProfile.nama,
      email: userProfile.email,
      username: userProfile.username,
    };
  }, [userProfile]);

  const currentUser = useMemo(() => {
    if (!userProfile) return null;
    return {
      uid: userProfile.uid,
      displayName: userProfile.nama,
      email: userProfile.email,
    };
  }, [userProfile]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user,
        userProfile,
        role,
        isSuperAdmin,
        loading,
        login,
        createAccountByAdmin,
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
