import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Kanban, Users, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BottomNavProps {
  onOpenNewOrder?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenNewOrder }) => {
  const { isSuperAdmin } = useAuth();

  return (
    <nav
      id="bottom-navigation-bar"
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-3 pt-2 px-3 pointer-events-none"
    >
      <div className="w-full max-w-lg bg-white/95 backdrop-blur-md rounded-full px-2.5 py-2 shadow-[0_10px_30px_rgba(230,57,70,0.18)] border border-red-100/70 flex items-center justify-between pointer-events-auto">
        <NavLink
          id="nav-dashboard-link"
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              isActive
                ? 'bg-[#E63946] text-white shadow-md shadow-red-500/30'
                : 'text-slate-500 hover:text-[#E63946] hover:bg-red-50/50'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </NavLink>

        <NavLink
          id="nav-orders-link"
          to="/orders"
          className={({ isActive }) =>
            `flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              isActive
                ? 'bg-[#E63946] text-white shadow-md shadow-red-500/30'
                : 'text-slate-500 hover:text-[#E63946] hover:bg-red-50/50'
            }`
          }
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Pesanan</span>
        </NavLink>

        <NavLink
          id="nav-production-link"
          to="/production"
          className={({ isActive }) =>
            `flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all relative ${
              isActive
                ? 'bg-[#E63946] text-white shadow-md shadow-red-500/30'
                : 'text-slate-500 hover:text-[#E63946] hover:bg-red-50/50'
            }`
          }
        >
          <Kanban className="w-4 h-4" />
          <span className="hidden sm:inline">Produksi</span>
          <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1 right-1 animate-pulse" />
        </NavLink>

        <NavLink
          id="nav-admin-link"
          to="/admin/users"
          className={({ isActive }) =>
            `flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              isActive
                ? 'bg-[#E63946] text-white shadow-md shadow-red-500/30'
                : 'text-slate-500 hover:text-[#E63946] hover:bg-red-50/50'
            }`
          }
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Staf</span>
        </NavLink>

        {onOpenNewOrder && (
          <button
            id="nav-quick-add-btn"
            onClick={onOpenNewOrder}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-[#E63946] to-red-500 text-white flex items-center justify-center shadow-md shadow-red-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Tambah Pesanan Baru"
          >
            <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
      </div>
    </nav>
  );
};


