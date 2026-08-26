import React from 'react';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: React.ReactNode;
  onOpenNewOrder?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onOpenNewOrder }) => {
  return (
    <div className="min-h-screen bg-[#F8F5F2] flex flex-col items-center justify-start pb-24 text-slate-800 selection:bg-[#E63946] selection:text-white">
      {/* Mobile container centered on large screen */}
      <div className="w-full max-w-lg min-h-screen bg-[#F8F5F2] flex flex-col shadow-2xl relative">
        <main className="flex-1 w-full">{children}</main>
        <BottomNav onOpenNewOrder={onOpenNewOrder} />
      </div>
    </div>
  );
};
