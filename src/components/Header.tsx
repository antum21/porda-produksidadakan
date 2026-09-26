import React from 'react';
import {
  ShieldCheck,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  badge?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, badge }) => {
  const { userProfile, logout } = useAuth();

  return (
    <header
      id="app-header"
      className="relative bg-[#E63946] text-white pt-6 pb-7 px-5 sm:px-8 rounded-b-[32px] sm:rounded-b-[38px] lg:rounded-3xl lg:m-5 lg:mb-0 shadow-[0_14px_35px_-8px_rgba(230,57,70,0.38)] z-20"
    >
      {/* Top bar with branding and Super Admin status */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
            <span className="font-extrabold text-xl tracking-tight text-white font-['Outfit']">P</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight font-['Outfit'] text-white">PORDA</span>
              <span className="text-[10px] uppercase tracking-wider bg-white/20 font-bold px-2 py-0.5 rounded-full border border-white/25">
                ERP Cetak
              </span>
            </div>
            <p className="text-[11px] text-white/80 font-medium">Produksi Dadakan Apparel</p>
          </div>
        </div>

        {/* Super Admin Status & Mobile Logout */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full border border-white/25 backdrop-blur-md shadow-xs text-xs font-semibold"
            title="Sesi Aktif: Super Admin"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span className="truncate max-w-[120px]">Super Admin</span>
          </div>

          <button
            id="logout-btn"
            onClick={logout}
            className="lg:hidden w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 flex items-center justify-center text-white/90 transition-all border border-white/20 cursor-pointer"
            title="Keluar / Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dynamic Title / Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mt-2">
        <div>
          {badge && (
            <div className="inline-flex items-center gap-1 bg-white/20 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full mb-1.5 backdrop-blur-sm">
              <Sparkles className="w-3 h-3" />
              {badge}
            </div>
          )}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-tight font-['Outfit']">
            {title || `Halo, ${userProfile?.nama || 'Super Admin'}!`}
          </h1>
          <p className="text-xs sm:text-sm text-white/85 mt-1 font-medium max-w-xl">
            {subtitle || 'Kelola alur order sablon, DTF, cetak offset, antrean bengkel & finansial.'}
          </p>
        </div>

        {/* Super Admin Badge on desktop */}
        <div className="hidden sm:flex items-center gap-2 bg-black/15 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-xs text-white/90 self-start sm:self-auto">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Super Admin Mode</span>
        </div>
      </div>
    </header>
  );
};
