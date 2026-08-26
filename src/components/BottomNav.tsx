import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Kanban, PlusCircle } from 'lucide-react';

interface BottomNavProps {
  onOpenNewOrder?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenNewOrder }) => {
  return (
    <nav
      id="bottom-navigation-bar"
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-3 pt-2 px-4 pointer-events-none"
    >
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-full px-3 py-2 shadow-[0_10px_30px_rgba(230,57,70,0.18)] border border-red-100/70 flex items-center justify-between pointer-events-auto">
        <NavLink
          id="nav-dashboard-link"
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
              isActive
                ? 'bg-[#E63946] text-white shadow-md shadow-red-500/30 scale-102'
                : 'text-slate-500 hover:text-[#E63946] hover:bg-red-50/50'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </NavLink>

        {/* Center Quick Action or Orders Tab */}
        <NavLink
          id="nav-orders-link"
          to="/orders"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
              isActive
                ? 'bg-[#E63946] text-white shadow-md shadow-red-500/30 scale-102'
                : 'text-slate-500 hover:text-[#E63946] hover:bg-red-50/50'
            }`
          }
        >
          <FileText className="w-4 h-4" />
          <span>Pesanan</span>
        </NavLink>

        <NavLink
          id="nav-production-link"
          to="/production"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all relative ${
              isActive
                ? 'bg-[#E63946] text-white shadow-md shadow-red-500/30 scale-102'
                : 'text-slate-500 hover:text-[#E63946] hover:bg-red-50/50'
            }`
          }
        >
          <Kanban className="w-4 h-4" />
          <span>Produksi</span>
          <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1.5 right-1.5 animate-pulse" />
        </NavLink>

        {onOpenNewOrder && (
          <button
            id="nav-quick-add-btn"
            onClick={onOpenNewOrder}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#E63946] to-red-500 text-white flex items-center justify-center shadow-md shadow-red-500/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Tambah Pesanan Baru"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </nav>
  );
};

