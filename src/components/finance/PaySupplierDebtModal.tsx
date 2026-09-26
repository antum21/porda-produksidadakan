import React, { useState } from 'react';
import { MaterialPurchase, PaymentMethod } from '../../types';
import { paySupplierDebt } from '../../services/dbService';
import { X, Landmark, CheckCircle2, AlertCircle } from 'lucide-react';

interface PaySupplierDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: MaterialPurchase | null;
  userName?: string;
  onSuccess?: () => void;
}

export const PaySupplierDebtModal: React.FC<PaySupplierDebtModalProps> = ({
  isOpen,
  onClose,
  purchase,
  userName = 'Finance',
  onSuccess,
}) => {
  const [nominal, setNominal] = useState<number>(purchase?.sisa_hutang || 0);
  const [metodePembayaran, setMetodePembayaran] = useState<PaymentMethod>('Transfer Bank');
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Update nominal if purchase changes
  React.useEffect(() => {
    if (purchase) {
      setNominal(purchase.sisa_hutang || 0);
    }
  }, [purchase]);

  if (!isOpen || !purchase) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nominal <= 0) {
      setErrorMsg('Nominal pembayaran harus lebih dari 0');
      return;
    }
    if (nominal > (purchase.sisa_hutang || 0)) {
      setErrorMsg('Nominal pembayaran tidak boleh melebihi sisa hutang');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await paySupplierDebt(
        purchase.id,
        nominal,
        metodePembayaran,
        catatan,
        userName
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error paying supplier debt:', err);
      setErrorMsg(err?.message || 'Gagal memproses pembayaran hutang supplier');
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

  const sisaSetelahBayar = Math.max(0, (purchase.sisa_hutang || 0) - nominal);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-['Outfit']">Bayar Hutang Supplier</h2>
              <p className="text-xs text-slate-300">Pelunasan atau cicilan pembelian bahan ke supplier</p>
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

          {/* Invoice & Supplier Summary */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">No. Pembelian / PO:</span>
              <span className="font-bold text-slate-900">{purchase.nomor_pembelian}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Supplier:</span>
              <span className="font-bold text-slate-900">{purchase.supplier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Bahan:</span>
              <span className="font-semibold text-slate-700">
                {purchase.nama_bahan} ({purchase.qty} {purchase.satuan})
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-500 font-medium">Total Nilai Pembelian:</span>
              <span className="font-semibold text-slate-800">{formatRupiah(purchase.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Sudah Dibayar Sebelumnya:</span>
              <span className="font-semibold text-emerald-700">{formatRupiah(purchase.jumlah_dibayar || 0)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="text-rose-700 font-bold">Sisa Hutang Saat Ini:</span>
              <span className="text-sm font-extrabold text-rose-600 font-['Outfit']">
                {formatRupiah(purchase.sisa_hutang || 0)}
              </span>
            </div>
          </div>

          {/* Nominal Bayar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Nominal Pembayaran Sekarang (Rp) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setNominal(purchase.sisa_hutang || 0)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
              >
                Lunasi Semua
              </button>
            </div>
            <input
              type="number"
              min="1"
              step="any"
              max={purchase.sisa_hutang || 0}
              value={nominal || ''}
              onChange={(e) => setNominal(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-lg font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Metode Pembayaran */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Metode Pembayaran
            </label>
            <select
              value={metodePembayaran}
              onChange={(e) => setMetodePembayaran(e.target.value as PaymentMethod)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Transfer Bank">Transfer Bank</option>
              <option value="Tunai / Cash">Tunai / Cash</option>
              <option value="QRIS">QRIS</option>
            </select>
          </div>

          {/* Sisa Setelah Bayar Notice */}
          <div className={`p-3.5 rounded-2xl border text-xs flex justify-between items-center ${
            sisaSetelahBayar === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <span>Status Setelah Pembayaran:</span>
            <span className="font-extrabold">
              {sisaSetelahBayar === 0 ? 'LUNAS SEPENUHNYA' : `Sisa Hutang: ${formatRupiah(sisaSetelahBayar)}`}
            </span>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Catatan / Ref Transfer (Opsional)
            </label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Transfer via BCA Finance ref #99210"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              disabled={loading || nominal <= 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-emerald-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Memproses...' : 'Konfirmasi Pembayaran'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
