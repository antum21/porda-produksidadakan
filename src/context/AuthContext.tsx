import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase';
import { UserProfile, UserRole } from '../types';
import {
  getUserProfile,
  syncUserProfile,
  seedSampleDataIfEmpty,
  authenticateByUsernameOrPassword,
  createUserByAdmin,
} from '../services/dbService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  role: UserRole;
  isSuperAdmin: boolean;
  loading: boolean;
  login: (usernameOrEmail: string, pass: string) => Promise<void>;
  createAccountByAdmin: (data: {
    username: string;
    nama: string;
    role: UserRole;
    password?: string;
    phone?: string;
    email?: string;
  }) => Promise<UserProfile>;
  quickDemoLogin: (targetRole: UserRole) => Promise<void>;
  switchRole: (newRole: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_PROFILES: Record<UserRole, { username: string; nama: string; email: string; avatar: string }> = {
  Admin: {
    username: 'admin',
    nama: 'Budi Santoso (Owner & Super Admin)',
    email: 'admin@porda.app',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  Printing: {
    username: 'printing',
    nama: 'Rian Pratama (Div. Cetak & Film)',
    email: 'printing@porda.app',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  Logistik: {
    username: 'logistik',
    nama: 'Doni Saputra (Div. Bahan & Supplier)',
    email: 'logistik@porda.app',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  Produksi: {
    username: 'produksi',
    nama: 'Agus Setiawan (Div. Finishing & QC)',
    email: 'produksi@porda.app',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  },
  Pengantaran: {
    username: 'kurir',
    nama: 'Hadi Kurnia (Div. Delivery & Kurir)',
    email: 'kurir@porda.app',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
  },
  Keuangan: {
    username: 'finance',
    nama: 'Siti Rahma (Div. Finance & Kasir)',
    email: 'finance@porda.app',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  },
};

const DEMO_STORAGE_KEY = 'porda_active_user_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading saved profile:', e);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Initialize and listen to Auth state and database
  useEffect(() => {
    // Seed initial sample data & users in background if empty
    seedSampleDataIfEmpty();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user && !userProfile) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
            localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(profile));
          }
        } catch (err) {
          console.warn('Error fetching user profile from auth state:', err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (usernameOrEmail: string, pass: string) => {
    setLoading(true);
    try {
      // 1. Authenticate against Firestore User Database (Supports Username or Email)
      const profile = await authenticateByUsernameOrPassword(usernameOrEmail, pass);
      setUserProfile(profile);
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(profile));

      // Optional: try signing into Firebase Auth in background if email/pass matches
      try {
        if (profile.email) {
          await signInWithEmailAndPassword(auth, profile.email, pass);
        }
      } catch (e) {
        // Non-blocking for custom username store
      }
    } finally {
      setLoading(false);
    }
  };

  const createAccountByAdmin = async (data: {
    username: string;
    nama: string;
    role: UserRole;
    password?: string;
    phone?: string;
    email?: string;
  }): Promise<UserProfile> => {
    if (userProfile?.role !== 'Admin') {
      throw new Error('Akses ditolak: Hanya Super Admin yang dapat membuat akun pengguna baru.');
    }
    return await createUserByAdmin(data);
  };

  const quickDemoLogin = async (targetRole: UserRole) => {
    setLoading(true);
    try {
      const demo = DEMO_PROFILES[targetRole];
      const demoProfile: UserProfile = {
        uid: auth.currentUser?.uid || `usr-demo-${targetRole.toLowerCase()}`,
        username: demo.username,
        nama: demo.nama,
        email: demo.email,
        role: targetRole,
        avatarUrl: demo.avatar,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      
      setUserProfile(demoProfile);
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoProfile));

      // Attempt to sync to Firestore if possible
      try {
        await syncUserProfile(demoProfile);
      } catch (err) {
        console.warn('Demo profile sync to Firestore note:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (newRole: UserRole) => {
    const demo = DEMO_PROFILES[newRole];
    const updated: UserProfile = {
      ...(userProfile || {
        uid: auth.currentUser?.uid || `usr-demo-${newRole.toLowerCase()}`,
        username: demo.username,
        email: demo.email,
        createdAt: new Date().toISOString(),
      }),
      username: userProfile?.username || demo.username,
      role: newRole,
      nama: demo.nama,
      avatarUrl: demo.avatar,
      status: 'active',
    };
    setUserProfile(updated);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated));
    try {
      await syncUserProfile(updated);
    } catch (err) {
      console.warn('Role switch sync note:', err);
    }
  };

  const logout = async () => {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    setUserProfile(null);
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  };

  const role: UserRole = userProfile?.role || 'Admin';
  const isSuperAdmin = role === 'Admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role,
        isSuperAdmin,
        loading,
        login,
        createAccountByAdmin,
        quickDemoLogin,
        switchRole,
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
