import React, { useState } from 'react';
import { OrderItem } from '../../types';
import { recordOrderProductionCost } from '../../services/dbService';
import { X, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';

interface RecordProductionCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderItem[];
  userName?: string;
  onSuccess?: () => void;
  prefilledOrderId?: string;
}

const PRODUCTION_COST_TYPES = [
  'Jahit',
  'Bordir',
  'Sablon Vendor',
  'Finishing',
  'Cutting',
  'Packaging',
  'Setting Desain / Film',
  'Vendor Lainnya',
];

export const RecordProductionCostModal: React.FC<RecordProductionCostModalProps> = ({
  isOpen,
  onClose,
  orders,
  userName = 'Staff Produksi',
  onSuccess,
  prefilledOrderId,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(prefilledOrderId || orders[0]?.id || '');
  const [jenisBiaya, setJenisBiaya] = useState<string>('Jahit');
  const [namaVendor, setNamaVendor] = useState<string>('');
  const [deskripsi, setDeskripsi] = useState<string>('');
  const [biaya, setBiaya] = useState<number>(100000);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const targetOrder = orders.find((o) => o.id === selectedOrderId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrder) {
      setErrorMsg('Pilih pesanan yang akan dibebankan biaya produksi');
      return;
    }
    if (!deskripsi.trim()) {
      setErrorMsg('Deskripsi pekerjaan / biaya wajib diisi');
      return;
    }
    if (biaya <= 0) {
      setErrorMsg('Nominal biaya harus lebih besar dari 0');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await recordOrderProductionCost(
        {
          order_id: targetOrder.id,
          invoice_no: targetOrder.invoice_no,
          jenis_biaya: jenisBiaya,
          nama_vendor: namaVendor.trim(),
          deskripsi: deskripsi.trim(),
          biaya,
          tanggal: new Date().toISOString().split('T')[0],
        },
        userName
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error recording production cost:', err);
      setErrorMsg(err?.message || 'Gagal mencatat biaya produksi');
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
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-['Outfit']">Tambah Biaya Produksi / Vendor</h2>
              <p className="text-xs text-slate-300">Biaya vendor/maklon langsung yang masuk ke HPP pesanan</p>
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
              Pilih Pesanan / Invoice <span className="text-red-500">*</span>
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
                  {o.invoice_no} - {o.nama_klien} ({o.jumlah_pcs} pcs - {formatRupiah(o.total_harga)})
                </option>
              ))}
            </select>
          </div>

          {/* Jenis Biaya & Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Jenis Pekerjaan / Biaya <span className="text-red-500">*</span>
              </label>
              <select
                value={jenisBiaya}
                onChange={(e) => setJenisBiaya(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              >
                {PRODUCTION_COST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nama Vendor / Maklon
              </label>
              <input
                type="text"
                value={namaVendor}
                onChange={(e) => setNamaVendor(e.target.value)}
                placeholder="Contoh: Maklon Jahit Mas Joko"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              />
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Rincian Pekerjaan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Contoh: Biaya jahit rantai + overdeck 50 pcs @ Rp3.000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              required
            />
          </div>

          {/* Biaya (Rp) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Nominal Biaya (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={biaya || ''}
              onChange={(e) => setBiaya(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              required
            />
          </div>

          {/* Info Card */}
          <div className="bg-indigo-50 p-3.5 rounded-2xl border border-indigo-100 text-xs text-indigo-900 flex justify-between items-center">
            <span>Biaya langsung bertambah ke HPP:</span>
            <span className="font-extrabold text-indigo-900 text-sm font-['Outfit']">{formatRupiah(biaya)}</span>
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
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-indigo-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Menyimpan...' : 'Simpan Biaya Produksi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
