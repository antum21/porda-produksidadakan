import React, { useState } from 'react';
import { MaterialStock, OrderItem } from '../../types';
import { recordMaterialUsage } from '../../services/dbService';
import { X, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

interface RecordUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableStocks: MaterialStock[];
  orders: OrderItem[];
  userName?: string;
  onSuccess?: () => void;
  prefilledOrderId?: string;
}

export const RecordUsageModal: React.FC<RecordUsageModalProps> = ({
  isOpen,
  onClose,
  availableStocks,
  orders,
  userName = 'Staff Produksi',
  onSuccess,
  prefilledOrderId,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(prefilledOrderId || orders[0]?.id || '');
  const [selectedStockId, setSelectedStockId] = useState<string>(availableStocks[0]?.id || '');
  const [qtyUsed, setQtyUsed] = useState<number>(1);
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const targetOrder = orders.find((o) => o.id === selectedOrderId);
  const targetStock = availableStocks.find((s) => s.id === selectedStockId);

  const totalBiaya = (qtyUsed || 0) * (targetStock?.harga_modal || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrder) {
      setErrorMsg('Pilih pesanan yang akan dibebankan pemakaian bahan');
      return;
    }
    if (!targetStock) {
      setErrorMsg('Pilih bahan yang digunakan dari stok');
      return;
    }
    if (qtyUsed <= 0) {
      setErrorMsg('Qty pemakaian harus lebih dari 0');
      return;
    }
    if (qtyUsed > targetStock.stok) {
      setErrorMsg(`Qty pemakaian (${qtyUsed}) melebihi stok yang tersedia (${targetStock.stok} ${targetStock.satuan})!`);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await recordMaterialUsage(
        {
          order_id: targetOrder.id,
          invoice_no: targetOrder.invoice_no,
          nama_klien: targetOrder.nama_klien,
          material_stock_id: targetStock.id,
          nama_bahan: targetStock.nama_bahan,
          qty: qtyUsed,
          satuan: targetStock.satuan,
          harga_modal_satuan: targetStock.harga_modal,
          tanggal: new Date().toISOString().split('T')[0],
          catatan,
        },
        userName
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error recording material usage:', err);
      setErrorMsg(err?.message || 'Gagal mencatat pemakaian bahan');
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-['Outfit']">Catat Pemakaian Bahan (HPP)</h2>
              <p className="text-xs text-slate-300">Potong stok bahan dan tambahkan ke biaya HPP pesanan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Select Order */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Pilih Pesanan / Invoice Tujuan <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              required
            >
              <option value="">-- Pilih Pesanan --</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.invoice_no} - {o.nama_klien} ({o.jumlah_pcs} pcs - {formatRupiah(o.total_harga)}) [{o.status}]
                </option>
              ))}
            </select>
          </div>

          {/* Select Material from Stock */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Pilih Bahan dari Inventori Stok <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedStockId}
              onChange={(e) => setSelectedStockId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              required
            >
              <option value="">-- Pilih Bahan --</option>
              {availableStocks.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_bahan} | Sisa Stok: {s.stok} {s.satuan} | Modal: {formatRupiah(s.harga_modal)}/{s.satuan}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Info Callout */}
          {targetStock && (
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Bahan Terpilih:</span>
                <span className="font-bold text-slate-800">{targetStock.nama_bahan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Stok Tersedia Saat Ini:</span>
                <span
                  className={`font-bold ${
                    targetStock.stok <= targetStock.stok_minimum ? 'text-amber-600' : 'text-emerald-700'
                  }`}
                >
                  {targetStock.stok} {targetStock.satuan}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Harga Modal Satuan:</span>
                <span className="font-bold text-slate-800">{formatRupiah(targetStock.harga_modal)}</span>
              </div>
            </div>
          )}

          {/* Qty Used */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Jumlah / Qty yang Digunakan ({targetStock?.satuan || 'Unit'}) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.001"
                step="any"
                max={targetStock?.stok || 9999}
                value={qtyUsed || ''}
                onChange={(e) => setQtyUsed(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
                required
              />
              <span className="text-xs font-bold text-slate-500 px-3 py-2.5 bg-slate-100 rounded-xl border border-slate-200">
                {targetStock?.satuan || 'Pcs'}
              </span>
            </div>
          </div>

          {/* HPP Cost Summary */}
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-900 font-bold">Biaya Bahan Masuk ke HPP Order</p>
              <p className="text-xs text-amber-700">
                {qtyUsed} {targetStock?.satuan} × {formatRupiah(targetStock?.harga_modal || 0)}
              </p>
            </div>
            <p className="text-lg font-extrabold text-amber-900 font-['Outfit']">{formatRupiah(totalBiaya)}</p>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Keterangan / Catatan Pemakaian (Opsional)
            </label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Kaos hitam 50 pcs untuk sablon dada dan punggung"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !targetStock || targetStock.stok <= 0}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-xs shadow-md shadow-amber-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Memproses...' : 'Catat & Potong Stok'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
