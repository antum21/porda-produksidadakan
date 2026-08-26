import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Layers,
  Printer,
  ShoppingBag,
  Cpu,
  Truck,
  ShieldCheck,
  CircleDollarSign,
  Lock,
  Mail,
  User,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

const DEMO_ROLES: { role: UserRole; title: string; desc: string; icon: React.ElementType; color: string }[] = [
  {
    role: 'Admin',
    title: 'Super Admin',
    desc: 'Semua hak akses & manajemen order',
    icon: ShieldCheck,
    color: 'bg-red-50 text-[#E63946] border-red-200',
  },
  {
    role: 'Printing',
    title: 'Tim Printing (Tahap 1)',
    desc: 'Cetak DTF, sablon manual & digital',
    icon: Printer,
    color: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    role: 'Logistik',
    title: 'Tim Logistik (Tahap 2)',
    desc: 'Pengadaan blank kaos & vendor',
    icon: ShoppingBag,
    color: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  {
    role: 'Produksi',
    title: 'Tim Produksi (Tahap 3)',
    desc: 'Finishing, press, QC & packing',
    icon: Cpu,
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    role: 'Pengantaran',
    title: 'Tim Pengantaran (Tahap 4)',
    desc: 'Kurir, delivery & pickup klien',
    icon: Truck,
    color: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  {
    role: 'Keuangan',
    title: 'Tim Keuangan',
    desc: 'Validasi DP 70% & pelunasan faktur',
    icon: CircleDollarSign,
    color: 'bg-teal-50 text-teal-800 border-teal-200',
  },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, register, loginWithGoogle, quickDemoLogin, loading: authLoading } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nama, setNama] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      onLoginSuccess?.();
    } catch (err: any) {
      console.error('Google login error:', err);
      setError('Gagal login dengan Google. Anda dapat menggunakan 1-Klik Masuk Role di bawah.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegisterMode) {
        if (!nama.trim()) {
          setError('Nama lengkap wajib diisi');
          setLoading(false);
          return;
        }
        await register(email, password, nama.trim(), selectedRole);
      } else {
        await login(email, password);
      }
      onLoginSuccess?.();
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err?.message || 'Gagal masuk akun. Periksa email & password Anda.';
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'Metode email/password belum diaktifkan di Firebase Console. Silakan gunakan tombol "Masuk dengan Google" atau "1-Klik Masuk Role (Demo)".';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Email atau password salah. Coba gunakan 1-Klik Demo Login di bawah.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Email sudah terdaftar. Silakan login.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password minimal 6 karakter.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      await quickDemoLogin(role);
      onLoginSuccess?.();
    } catch (err: any) {
      console.error('Quick demo error:', err);
      setError('Gagal login demo. Mencoba kembali...');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5F2] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[36px] p-6 sm:p-8 shadow-[0_20px_50px_rgba(230,57,70,0.18)] border border-red-100/60 relative overflow-hidden">
        {/* Decorative background circle */}
        <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-[#E63946]/10 blur-2xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#E63946] to-red-500 text-white shadow-lg shadow-red-500/30 mb-3">
            <span className="font-extrabold text-2xl font-['Outfit']">P</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 font-['Outfit'] tracking-tight">
            PORDA ERP
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Produksi Dadakan - Sistem Manajemen Cetak Apparel
          </p>
        </div>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || authLoading}
          className="w-full mb-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-2.5 px-4 rounded-full font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Masuk dengan Akun Google</span>
        </button>

        {/* 1-Click Quick Demo Login Section (Crucial for immediate testing of 6 roles) */}
        <div className="mb-5 bg-[#F8F5F2] p-4 rounded-3xl border border-slate-200/80">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E63946]" /> 1-Klik Masuk Role (Demo Akun)
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">Siap Uji</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO_ROLES.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => handleQuickDemo(d.role)}
                  disabled={loading || authLoading}
                  className={`p-2.5 rounded-2xl border text-left transition-all hover:scale-102 active:scale-98 cursor-pointer ${d.color} shadow-xs`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="text-xs font-bold leading-tight">{d.role}</p>
                      <p className="text-[10px] opacity-75 truncate max-w-[100px]">{d.title}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            Pilih salah satu role untuk langsung masuk ke antrean produksi terkait.
          </p>
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-slate-400 text-[11px] font-medium">
            atau masuk dengan email & password
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Email/Pass Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap Staff"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="nama@porda.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Kata Sandi</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
              />
            </div>
          </div>

          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Divisi / Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
              >
                <option value="Admin">Admin (Full Access)</option>
                <option value="Printing">Printing (Tahap 1 Cetak)</option>
                <option value="Logistik">Logistik (Tahap 2 Blank Kaos)</option>
                <option value="Produksi">Produksi (Tahap 3 Finishing/QC)</option>
                <option value="Pengantaran">Pengantaran (Tahap 4 Delivery)</option>
                <option value="Keuangan">Keuangan (Finance/DP)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || authLoading}
            className="w-full bg-[#E63946] hover:bg-red-600 active:scale-98 text-white py-3 px-6 rounded-full font-bold text-xs shadow-[0_10px_25px_-5px_rgba(230,57,70,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegisterMode ? 'Daftar Akun Baru' : 'Masuk ke Sistem Porda'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError(null);
            }}
            className="text-xs text-slate-500 hover:text-[#E63946] font-semibold cursor-pointer"
          >
            {isRegisterMode ? 'Sudah punya akun? Masuk di sini' : 'Belum punya akun? Buat Akun Baru'}
          </button>
        </div>
      </div>
    </div>
  );
};
