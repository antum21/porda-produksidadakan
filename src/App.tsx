import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductionPage } from './pages/ProductionPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { NewOrderModal } from './components/NewOrderModal';
import { motion, AnimatePresence } from 'motion/react';

// Animated Route Wrapper
const AnimatedRoutes: React.FC<{ onOpenNewOrder: () => void }> = ({ onOpenNewOrder }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full"
      >
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={<DashboardPage onOpenNewOrder={onOpenNewOrder} />}
          />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/production" element={<ProductionPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

// Route Guard Component
const ProtectedApp: React.FC = () => {
  const { currentUser, userProfile, loading } = useAuth();
  const [isGlobalNewOrderOpen, setIsGlobalNewOrderOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F2] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-3xl bg-gradient-to-tr from-[#E63946] to-red-500 text-white flex items-center justify-center text-xl font-bold font-['Outfit'] shadow-lg shadow-red-500/30 mb-4 animate-pulse">
          P
        </div>
        <p className="text-sm font-bold text-slate-800">Menghubungkan ke Porda ERP...</p>
        <p className="text-xs text-slate-400 mt-1">Menginisialisasi Firebase Firestore & Autentikasi</p>
      </div>
    );
  }

  // If not logged in, show login page
  if (!currentUser && !userProfile) {
    return <LoginPage />;
  }

  return (
    <>
      <Layout onOpenNewOrder={() => setIsGlobalNewOrderOpen(true)}>
        <AnimatedRoutes onOpenNewOrder={() => setIsGlobalNewOrderOpen(true)} />
      </Layout>

      {/* Global New Order Modal triggered from bottom nav or pages */}
      <NewOrderModal
        isOpen={isGlobalNewOrderOpen}
        onClose={() => setIsGlobalNewOrderOpen(false)}
      />
    </>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ProtectedApp />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}


