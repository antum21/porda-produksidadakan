import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ChevronDown,
  LogOut,
  Layers,
  Printer,
  ShoppingBag,
  Cpu,
  Truck,
  ShieldCheck,
  CircleDollarSign,
  UserCheck,
  CheckCircle2,
  X,
} from 'lucide-react';

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ElementType; color: string; desc: string }> = {
  Admin: {
    label: 'Super Admin',
    icon: ShieldCheck,
    color: 'bg-white/20 text-white',
    desc: 'Akses penuh seluruh alur & manajemen',
  },
  Printing: {
    label: 'Divisi Printing',
    icon: Printer,
    color: 'bg-amber-400 text-slate-900',
    desc: 'Tahap 1: Cetak DTF, Manual, & Digital',
  },
  Logistik: {
    label: 'Divisi Logistik',
    icon: ShoppingBag,
    color: 'bg-blue-300 text-slate-900',
    desc: 'Tahap 2: Pengadaan blank apparel & supplier',
  },
  Produksi: {
    label: 'Divisi Produksi',
    icon: Cpu,
    color: 'bg-emerald-300 text-slate-900',
    desc: 'Tahap 3: Finishing, Press, Jahit, QC & Pack',
  },
  Pengantaran: {
    label: 'Divisi Pengantaran',
    icon: Truck,
    color: 'bg-purple-300 text-slate-900',
    desc: 'Tahap 4: Kurir, Pickup & Pengiriman',
  },
  Keuangan: {
    label: 'Divisi Keuangan',
    icon: CircleDollarSign,
    color: 'bg-emerald-400 text-slate-900',
    desc: 'Verifikasi DP & Pelunasan Invoice',
  },
};

interface HeaderProps {
  title?: string;
  subtitle?: string;
  badge?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, badge }) => {
  const { userProfile, role, switchRole, logout } = useAuth();
  const { info } = useToast();
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showRoleModal) {
        setShowRoleModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showRoleModal]);

  const CurrentRoleIcon = ROLE_CONFIG[role]?.icon || Layers;

  return (
    <>
      <header
        id="app-header"
        className="relative bg-[#E63946] text-white pt-6 pb-7 px-5 sm:px-8 rounded-b-[32px] sm:rounded-b-[38px] lg:rounded-3xl lg:m-5 lg:mb-0 shadow-[0_14px_35px_-8px_rgba(230,57,70,0.38)] z-20"
      >
        {/* Top bar with branding (mobile) and active role switcher */}
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

          {/* Quick Role Switcher Pill */}
          <div className="flex items-center gap-2">
            <button
              id="role-switch-btn"
              onClick={() => setShowRoleModal(true)}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-xs font-semibold px-3 py-1.5 rounded-full border border-white/25 backdrop-blur-md shadow-xs cursor-pointer"
              title="Ganti Role Aktif untuk Pengujian"
            >
              <CurrentRoleIcon className="w-3.5 h-3.5" />
              <span className="truncate max-w-[100px]">{role}</span>
              <ChevronDown className="w-3 h-3 text-white/70" />
            </button>

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
              {title || `Halo, ${userProfile?.nama?.split(' ')[0] || 'Tim Porda'} 👋`}
            </h1>
            <p className="text-xs sm:text-sm text-white/85 mt-0.5 font-medium">
              {subtitle || 'Kelola pesanan apparel & pantau antrean produksi real-time'}
            </p>
          </div>
        </div>
      </header>

      {/* Role Switcher Modal with Spring Motion Animation */}
      <AnimatePresence>
        {showRoleModal && (
          <motion.div
            id="role-selector-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4"
            onClick={() => setShowRoleModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="bg-white rounded-3xl w-full max-w-sm sm:max-w-md p-6 shadow-2xl text-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-[#E63946] flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 font-['Outfit']">Pilih Hak Akses (Role)</h3>
                    <p className="text-xs text-slate-500">Uji coba simulasi 4 alur produksi</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {(Object.keys(ROLE_CONFIG) as UserRole[]).map((rKey) => {
                  const conf = ROLE_CONFIG[rKey];
                  const Icon = conf.icon;
                  const isCurrent = role === rKey;
                  return (
                    <button
                      key={rKey}
                      onClick={async () => {
                        await switchRole(rKey);
                        info('Role Diperbarui', `Beralih ke hak akses ${rKey}`);
                        setShowRoleModal(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer active:scale-98 ${
                        isCurrent
                          ? 'border-[#E63946] bg-red-50/70 shadow-xs ring-2 ring-red-500/20'
                          : 'border-slate-200/80 hover:border-red-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                            isCurrent ? 'bg-[#E63946] text-white shadow-xs' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-sm text-slate-900">{rKey}</p>
                            {isCurrent && (
                              <span className="text-[10px] font-bold bg-[#E63946] text-white px-2 py-0.5 rounded-full">
                                Aktif
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1">{conf.desc}</p>
                        </div>
                      </div>
                      {isCurrent && <CheckCircle2 className="w-5 h-5 text-[#E63946]" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-400">
                  Sistem Porda mengontrol aksi & antrean berdasarkan peran tim.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

