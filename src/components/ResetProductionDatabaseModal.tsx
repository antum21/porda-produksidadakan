import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { resetProductionDatabase } from '../services/dbService';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Lock,
  Trash2,
  X,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Database,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ResetProductionDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetSuccess?: (totalDeleted: number) => void;
}

export const ResetProductionDatabaseModal: React.FC<ResetProductionDatabaseModalProps> = ({
  isOpen,
  onClose,
  onResetSuccess,
}) => {
  const { userProfile, isSuperAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [step1Confirmed, setStep1Confirmed] = useState(false);
  const [step2Text, setStep2Text] = useState('');
  const [step3Password, setStep3Password] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  if (!isSuperAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full text-center">
          <ShieldAlert className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 text-lg">Akses Ditolak</h3>
          <p className="text-xs text-slate-500 mt-2">
            Hanya akun dengan role Super Admin yang berwenang mengakses modul reset database.
          </p>
          <button
            onClick={onClose}
            className="mt-5 py-2.5 px-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const isStep2Valid = step2Text.trim() === 'RESET PRODUCTION';
  const isFormValid = step1Confirmed && isStep2Valid && step3Password.length > 0;

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!step1Confirmed) {
      setErrorMessage('Langkah 1: Anda wajib menyetujui konfirmasi pembersihan data.');
      return;
    }
    if (!isStep2Valid) {
      setErrorMessage('Langkah 2: Anda wajib mengetik "RESET PRODUCTION" dengan tepat.');
      return;
    }
    if (!step3Password) {
      setErrorMessage('Langkah 3: Masukkan kata sandi Super Admin Anda untuk verifikasi.');
      return;
    }

    setLoading(true);
    try {
      if (!userProfile) throw new Error('Data profil Super Admin tidak ditemukan.');

      const result = await resetProductionDatabase(userProfile, step3Password);
      success(
        'Database Berhasil Direset',
        `Seluruh data test (${result.totalDeleted} dokumen) telah dibersihkan. Akun Super Admin tetap terjaga.`
      );
      onResetSuccess?.(result.totalDeleted);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal mereset database.');
      toastError('Reset Gagal', err?.message || 'Gagal mengeksekusi reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        onClick={loading ? undefined : onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl w-full max-w-xl p-5 sm:p-6 shadow-2xl text-slate-800 my-auto flex flex-col space-y-4 border border-red-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-red-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base font-['Outfit'] flex items-center gap-2">
                  <span>Reset Database Pra-Production</span>
                  <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase">
                    Zona Bahaya
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Pembersihan seluruh data uji/development sebelum aplikasi live ke produksi
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scope Description Box */}
          <div className="bg-red-50/70 p-3.5 rounded-2xl border border-red-200 text-xs space-y-2">
            <p className="font-bold text-red-950 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-red-600 shrink-0" />
              <span>Data yang akan dikosongkan:</span>
            </p>
            <ul className="grid grid-cols-2 gap-1.5 text-[11px] text-red-900 font-medium">
              <li>• Seluruh Pesanan & Invoice</li>
              <li>• Seluruh SPK & Antrean Produksi</li>
              <li>• Seluruh Transaksi Pembayaran DP/Pelunasan</li>
              <li>• Seluruh Biaya Vendor & Operasional</li>
              <li>• Data Stok Bahan & Pembelian Supplier</li>
              <li>• Akun Staf Uji Coba</li>
            </ul>
            <div className="pt-2 border-t border-red-200/80 text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Akun Super Admin (Admin123), konfigurasi aplikasi, dan Firebase Security Rules TIDAK akan dihapus.</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-100 text-red-800 rounded-2xl text-xs font-semibold flex items-center gap-2 border border-red-200">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 3-Tier Multi-Step Form */}
          <form onSubmit={handleExecuteReset} className="space-y-3.5 text-xs">
            {/* Step 1: Checkbox Confirmation */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={step1Confirmed}
                  onChange={(e) => setStep1Confirmed(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 mt-0.5 rounded text-red-600 focus:ring-red-400 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-800 block">
                    Langkah 1: Konfirmasi Persetujuan
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Saya mengerti bahwa seluruh DATA TEST akan dihapus secara permanen dan tindakan ini tidak dapat dibatalkan.
                  </span>
                </div>
              </label>
            </div>

            {/* Step 2: Verification Text Input */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-800">
                Langkah 2: Ketik <span className="font-mono text-red-600 select-all">RESET PRODUCTION</span> di bawah ini:
              </label>
              <input
                type="text"
                value={step2Text}
                onChange={(e) => setStep2Text(e.target.value)}
                disabled={loading}
                placeholder="RESET PRODUCTION"
                className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none ${
                  isStep2Valid ? 'border-emerald-500 text-emerald-700 bg-emerald-50/20' : 'border-slate-300 text-slate-800'
                }`}
              />
              {isStep2Valid && (
                <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Teks konfirmasi cocok
                </p>
              )}
            </div>

            {/* Step 3: Super Admin Password Re-authentication */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-800">
                Langkah 3: Masukkan Kata Sandi Super Admin Saat Ini
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={step3Password}
                  onChange={(e) => setStep3Password(e.target.value)}
                  disabled={loading}
                  placeholder="Kata sandi akun Super Admin Anda"
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-10 py-2 text-xs text-slate-800 focus:outline-none focus:border-red-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Kata sandi Anda akan diverifikasi ke Firebase Authentication sebelum reset dieksekusi.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="py-2.5 px-4 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!isFormValid || loading}
                className="py-2.5 px-6 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengeksekusi Reset Database...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Kosongkan Seluruh Data Test</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
