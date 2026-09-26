import React from 'react';
import { NavLink } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Kanban,
  PlusCircle,
  ShieldCheck,
  Printer,
  CircleDollarSign,
  LogOut,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onOpenNewOrder?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onOpenNewOrder }) => {
  const { userProfile, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8F5F2] flex flex-col lg:flex-row text-slate-800 selection:bg-[#E63946] selection:text-white">
      {/* ================= DESKTOP SIDEBAR (Visible on lg and larger screens) ================= */}
      <aside
        id="desktop-sidebar"
        className="hidden lg:flex w-64 xl:w-72 bg-white border-r border-slate-200/90 flex-col justify-between shrink-0 sticky top-0 h-screen py-6 px-5 z-30 shadow-xs"
      >
        {/* Brand Header */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#E63946] to-red-500 flex items-center justify-center shadow-md shadow-red-500/30 text-white font-['Outfit'] font-black text-2xl">
              P
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight font-['Outfit'] text-slate-900">
                  PORDA
                </span>
                <span className="text-[10px] font-bold bg-red-50 text-[#E63946] px-2 py-0.5 rounded-full border border-red-100 uppercase">
                  ERP Cetak
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Produksi Dadakan Apparel</p>
            </div>
          </div>

          {/* Quick Create Order CTA */}
          {onOpenNewOrder && (
            <button
              id="desktop-new-order-btn"
              onClick={onOpenNewOrder}
              className="w-full py-3 px-4 rounded-2xl bg-[#E63946] hover:bg-red-600 active:scale-98 text-white font-bold text-sm shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buat Pesanan Baru</span>
            </button>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
              Menu Utama
            </p>
            <NavLink
              id="sidebar-nav-dashboard"
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                  isActive
                    ? 'bg-red-50 text-[#E63946] shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard Ringkasan</span>
            </NavLink>

            <NavLink
              id="sidebar-nav-finance"
              to="/finance"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                  isActive
                    ? 'bg-red-50 text-[#E63946] shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <CircleDollarSign className="w-5 h-5 text-[#E63946]" />
              <span>Manajemen Keuangan</span>
            </NavLink>

            <NavLink
              id="sidebar-nav-orders"
              to="/orders"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                  isActive
                    ? 'bg-red-50 text-[#E63946] shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <FileText className="w-5 h-5" />
              <span>Manajemen Pesanan</span>
            </NavLink>

            <NavLink
              id="sidebar-nav-invoice"
              to="/invoice"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                  isActive
                    ? 'bg-red-50 text-[#E63946] shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Printer className="w-5 h-5" />
              <span>Faktur Invoice</span>
            </NavLink>

            <NavLink
              id="sidebar-nav-production"
              to="/production"
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                  isActive
                    ? 'bg-red-50 text-[#E63946] shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Kanban className="w-5 h-5" />
                <span>Antrean Produksi</span>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            </NavLink>

            <NavLink
              id="sidebar-nav-admin-users"
              to="/admin/users"
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                  isActive
                    ? 'bg-red-50 text-[#E63946] shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#E63946]" />
                <span>Manajemen Staf</span>
              </div>
              <span className="text-[10px] font-extrabold bg-red-100 text-[#E63946] px-2 py-0.5 rounded-full uppercase">
                Admin
              </span>
            </NavLink>
          </nav>
        </div>

        {/* User Profile & Logout Footer */}
        <div className="pt-4 border-t border-slate-100 space-y-3 relative">
          <div className="bg-[#F8F5F2] p-3 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase text-slate-400">Akun Aktif</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                Terverifikasi
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#E63946] text-white flex items-center justify-center text-xs shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate">Super Admin</p>
                <p className="text-[10px] text-slate-500 truncate">{userProfile?.nama || 'Super Admin PORDA'}</p>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-[#E63946] text-slate-600 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* ================= MAIN RESPONSIVE CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <main className="flex-1 w-full max-w-7xl mx-auto pb-24 lg:pb-12">
          {children}
        </main>

        {/* Mobile bottom navigation bar (Hidden on lg desktop) */}
        <div className="lg:hidden">
          <BottomNav onOpenNewOrder={onOpenNewOrder} />
        </div>
      </div>
    </div>
  );
};
