import React, { useState } from 'react';
import { OrderItem } from '../types';
import { deleteOrder, DeleteOrderResult } from '../services/dbService';
import { playFeedbackSound } from '../utils/audio';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Trash2,
  X,
  Layers,
  DollarSign,
  Package,
  FileText,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface DeleteOrderModalProps {
  order: OrderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: (result: DeleteOrderResult) => void;
}

export const DeleteOrderModal: React.FC<DeleteOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onDeleted,
}) => {
  const [loading, setLoading] = useState(false);
  const [restoreStock, setRestoreStock] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!order) return null;

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await deleteOrder(order.id, {
        restoreMaterialStock: restoreStock,
      });
      playFeedbackSound('click');
      if (onDeleted) {
        onDeleted(result);
      }
      onClose();
    } catch (err: any) {
      console.error('Error deleting order:', err);
      setErrorMsg(err?.message || 'Terjadi kesalahan saat menghapus pesanan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="delete-order-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            id="delete-order-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-white rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl text-slate-800 my-auto flex flex-col space-y-4 border border-red-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base font-['Outfit']">
                    Hapus Pesanan & Data Terkait
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfirmasi pembersihan data pesanan, keuangan, dan produksi
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order Target Summary */}
            <div className="bg-red-50/70 p-3.5 rounded-2xl border border-red-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-red-700 bg-white px-2.5 py-0.5 rounded-md border border-red-200">
                  {order.invoice_no}
                </span>
                <span className="font-bold text-slate-700">
                  {formatRupiah(order.total_harga)}
                </span>
              </div>
              <div className="font-semibold text-slate-900 text-sm">
                {order.nama_klien}
              </div>
              <div className="text-[11px] text-slate-500">
                {order.jumlah_pcs} pcs • {order.jenis_cetak || order.tipe_grafis || 'Apparel'} • Status: {order.status}
              </div>
            </div>

            {/* Cascading Deletion Explanation */}
            <div className="space-y-2 text-xs">
              <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <span>⚠️ Data yang akan ikut terhapus secara otomatis:</span>
              </p>

              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div className="flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">1. Data Pesanan & Invoice</span>
                    <p className="text-[11px] text-slate-500">
                      Invoice #{order.invoice_no} akan dihapus permanen dari daftar pesanan.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Layers className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">2. Data Produksi & Antrian SPK</span>
                    <p className="text-[11px] text-slate-500">
                      Surat Perintah Kerja (SPK) di antrian printing, logistik, produksi, atau arsip selesai akan dihapus.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <DollarSign className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">3. Data Keuangan & Arus Kas</span>
                    <p className="text-[11px] text-slate-500">
                      Catatan pembayaran DP/pelunasan customer ({formatRupiah(order.nominal_dp || 0)}) dan biaya vendor internal pesanan ini akan dibersihkan dari buku kas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Package className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">4. Beban HPP & Pemakaian Bahan Baku</span>
                    <p className="text-[11px] text-slate-500">
                      Biaya pemakaian bahan kain/film/tinta terkait pesanan ini akan dihapus dari perhitungan HPP.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkbox: Restore Material Stock */}
            <label className="flex items-center gap-2 p-2.5 bg-blue-50/70 hover:bg-blue-50 rounded-xl border border-blue-200 cursor-pointer transition-colors text-xs">
              <input
                type="checkbox"
                checked={restoreStock}
                onChange={(e) => setRestoreStock(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-400 cursor-pointer"
              />
              <div className="flex-1">
                <span className="font-bold text-blue-950">
                  Kembalikan stok bahan baku yang terpakai ke gudang
                </span>
                <p className="text-[10px] text-blue-700">
                  Rekomendasi: kuantitas bahan yang pernah dialokasikan ke pesanan ini akan otomatis dikembalikan ke stok gudang.
                </p>
              </div>
            </label>

            {/* Error Message if any */}
            {errorMsg && (
              <div className="p-3 bg-red-100 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-200">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menghapus Semua Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Pesanan & Data Terkait</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
