import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  FileText,
  Kanban,
  PlusCircle,
  ShieldCheck,
  Printer,
  ShoppingBag,
  Cpu,
  Truck,
  CircleDollarSign,
  LogOut,
  ChevronDown,
  Sparkles,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onOpenNewOrder?: () => void;
}

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  Admin: ShieldCheck,
  Printing: Printer,
  Logistik: ShoppingBag,
  Produksi: Cpu,
  Pengantaran: Truck,
  Keuangan: CircleDollarSign,
};

const ALL_ROLES: UserRole[] = ['Admin', 'Printing', 'Logistik', 'Produksi', 'Pengantaran', 'Keuangan'];

export const Layout: React.FC<LayoutProps> = ({ children, onOpenNewOrder }) => {
  const { userProfile, role, switchRole, logout } = useAuth();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const location = useLocation();

  const CurrentRoleIcon = ROLE_ICONS[role] || ShieldCheck;

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
              <span>Dashboard & Finansial</span>
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

            {/* Admin Panel (Accessible for all to view/request, Super Admin to create) */}
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

        {/* User Profile & Role Switcher Footer */}
        <div className="pt-4 border-t border-slate-100 space-y-3 relative">
          <div className="bg-[#F8F5F2] p-3 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase text-slate-400">Hak Akses Aktif</span>
              <button
                type="button"
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="text-[11px] font-bold text-[#E63946] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>Ganti</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#E63946] text-white flex items-center justify-center text-xs">
                <CurrentRoleIcon className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 truncate">{role}</p>
                <p className="text-[10px] text-slate-500 truncate">{userProfile?.nama || 'Tim Porda'}</p>
              </div>
            </div>
          </div>

          {/* Role Dropdown on Desktop */}
          {showRoleDropdown && (
            <div
              className="absolute bottom-20 left-3 right-3 bg-white rounded-2xl p-2 shadow-xl border border-slate-200 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
              onMouseLeave={() => setShowRoleDropdown(false)}
            >
              <p className="text-[10px] font-bold text-slate-400 px-2.5 py-1 uppercase">Ganti Role Kerja</p>
              <div className="space-y-1">
                {ALL_ROLES.map((r) => {
                  const Icon = ROLE_ICONS[r];
                  const isCur = role === r;
                  return (
                    <button
                      key={r}
                      onClick={async () => {
                        await switchRole(r);
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCur
                          ? 'bg-red-50 text-[#E63946]'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{r}</span>
                      </div>
                      {isCur && <CheckCircle2 className="w-3.5 h-3.5 text-[#E63946]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
