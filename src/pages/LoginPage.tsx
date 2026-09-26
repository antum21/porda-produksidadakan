import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, loading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (!username.trim()) {
        throw new Error('Silakan masukkan username Super Admin.');
      }
      if (!password) {
        throw new Error('Silakan masukkan kata sandi.');
      }

      await login(username.trim(), password);
      onLoginSuccess?.();
    } catch (err: any) {
      console.error('Auth error:', err);
      const msg = err?.message || 'Gagal masuk. Periksa username dan password Anda.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = submitting || authLoading;

  return (
    <div className="min-h-screen bg-[#F8F5F2] flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-md lg:max-w-4xl bg-white rounded-3xl sm:rounded-[36px] shadow-[0_20px_50px_rgba(230,57,70,0.14)] border border-red-100/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Presentation Banner (Desktop only) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#E63946] via-[#d62839] to-slate-900 text-white p-8 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-6 border border-white/25">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sistem ERP Produksi Apparel</span>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-white text-[#E63946] flex items-center justify-center font-black text-2xl font-['Outfit'] shadow-lg shadow-black/20 mb-4">
              P
            </div>

            <h2 className="text-3xl font-black font-['Outfit'] tracking-tight leading-tight">
              PORDA ERP
            </h2>
            <p className="text-sm text-white/80 mt-1 font-medium">
              Manajemen Produksi Dadakan & Cetak Apparel Realtime.
            </p>

            <div className="mt-8 space-y-3 text-xs text-white/90">
              <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/15 backdrop-blur-xs">
                <Zap className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Alur 4 Tahap: Cetak, Belanja, Produksi & Kirim</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/15 backdrop-blur-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Validasi Otomatis DP Minimal 70% Sebelum Cetak</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl border border-white/15 backdrop-blur-xs">
                <ShieldCheck className="w-4 h-4 text-rose-300 shrink-0" />
                <span>Autentikasi Terenkripsi Bcrypt & HTTP-Only Session</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/15 text-[11px] text-white/70">
            © {new Date().getFullYear()} PORDA Workshop Apparel System.
          </div>
        </div>

        {/* Right Form & Auth Section */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center relative">
          {/* Brand Header */}
          <div className="text-center lg:text-left mb-6">
            <div className="lg:hidden inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#E63946] to-red-500 text-white shadow-lg shadow-red-500/30 mb-2">
              <span className="font-extrabold text-xl font-['Outfit']">P</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-[#E63946] text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Login Super Admin</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] tracking-tight">
              Masuk ke Sistem ERP
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Silakan masukkan kredensial akun Super Admin untuk melanjutkan.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Super Admin Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username Super Admin
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Masukkan username Super Admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#E63946] focus:bg-white font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan kata sandi akun"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full pl-10 pr-10 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#E63946] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#E63946] hover:bg-red-600 active:scale-98 text-white py-3 px-6 rounded-full font-bold text-xs shadow-[0_10px_25px_-5px_rgba(230,57,70,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Dashboard ERP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="leading-relaxed">
              Sistem login ERP aman: Menggunakan enkripsi kata sandi sisi server dan sesi HTTP-Only Cookie yang terlindungi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
