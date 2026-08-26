import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase';
import { UserProfile, UserRole } from '../types';
import { getUserProfile, syncUserProfile, seedSampleDataIfEmpty } from '../services/dbService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, nama: string, role: UserRole) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  quickDemoLogin: (targetRole: UserRole) => Promise<void>;
  switchRole: (newRole: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_PROFILES: Record<UserRole, { nama: string; email: string; avatar: string }> = {
  Admin: {
    nama: 'Budi Santoso (Owner)',
    email: 'admin.porda@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  Printing: {
    nama: 'Rian Pratama (Div. Cetak)',
    email: 'printing.porda@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  Logistik: {
    nama: 'Doni Saputra (Div. Bahan & Supplier)',
    email: 'logistik.porda@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  Produksi: {
    nama: 'Agus Setiawan (Div. Finishing & QC)',
    email: 'produksi.porda@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  },
  Pengantaran: {
    nama: 'Hadi Kurnia (Div. Delivery & Kurir)',
    email: 'kurir.porda@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
  },
  Keuangan: {
    nama: 'Siti Rahma (Div. Finance)',
    email: 'finance.porda@gmail.com',
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

  // Initialize and listen to Auth state
  useEffect(() => {
    // Seed initial sample data in background
    seedSampleDataIfEmpty();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
            localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(profile));
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              nama: user.displayName || user.email?.split('@')[0] || 'Staff Porda',
              email: user.email || 'staff@porda.app',
              role: 'Admin',
              createdAt: new Date().toISOString(),
            };
            await syncUserProfile(newProfile);
            setUserProfile(newProfile);
            localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(newProfile));
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
          const fallbackProfile: UserProfile = {
            uid: user.uid,
            nama: user.displayName || user.email?.split('@')[0] || 'Staff Porda',
            email: user.email || 'staff@porda.app',
            role: 'Admin',
          };
          setUserProfile(fallbackProfile);
          localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(fallbackProfile));
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const user = cred.user;
    let profile = await getUserProfile(user.uid);
    if (!profile) {
      profile = {
        uid: user.uid,
        nama: user.displayName || user.email?.split('@')[0] || 'Staff Porda',
        email: user.email || 'staff@porda.app',
        role: 'Admin',
        avatarUrl: user.photoURL || undefined,
        createdAt: new Date().toISOString(),
      };
      await syncUserProfile(profile);
    }
    setUserProfile(profile);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(profile));
  };

  const login = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const profile = await getUserProfile(cred.user.uid);
    if (profile) {
      setUserProfile(profile);
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(profile));
    }
  };

  const register = async (email: string, pass: string, nama: string, role: UserRole) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      nama,
      email,
      role,
      createdAt: new Date().toISOString(),
    };
    await syncUserProfile(newProfile);
    setUserProfile(newProfile);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(newProfile));
  };

  const quickDemoLogin = async (targetRole: UserRole) => {
    setLoading(true);
    try {
      const demo = DEMO_PROFILES[targetRole];
      const demoProfile: UserProfile = {
        uid: auth.currentUser?.uid || `demo-${targetRole.toLowerCase()}-${Date.now()}`,
        nama: demo.nama,
        email: demo.email,
        role: targetRole,
        avatarUrl: demo.avatar,
        createdAt: new Date().toISOString(),
      };
      
      setUserProfile(demoProfile);
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoProfile));

      // Attempt to sync to Firestore if possible, ignore non-blocking errors
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
        uid: auth.currentUser?.uid || `demo-${newRole.toLowerCase()}`,
        email: demo.email,
        createdAt: new Date().toISOString(),
      }),
      role: newRole,
      nama: demo.nama,
      avatarUrl: demo.avatar,
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

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role,
        loading,
        login,
        register,
        loginWithGoogle,
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
