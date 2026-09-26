import React, { useState } from 'react';
import { OrderItem, CustomerPaymentType, PaymentMethod } from '../../types';
import { recordCustomerPayment } from '../../services/dbService';
import { X, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';

interface RecordCustomerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderItem | null;
  userName?: string;
  onSuccess?: () => void;
}

export const RecordCustomerPaymentModal: React.FC<RecordCustomerPaymentModalProps> = ({
  isOpen,
  onClose,
  order,
  userName = 'Kasir',
  onSuccess,
}) => {
  const sisaTagihan = order ? Math.max(0, order.total_harga - (order.nominal_dp || 0)) : 0;
  const [nominal, setNominal] = useState<number>(sisaTagihan);
  const [jenisPembayaran, setJenisPembayaran] = useState<CustomerPaymentType>('Pelunasan');
  const [metodePembayaran, setMetodePembayaran] = useState<PaymentMethod>('Transfer Bank');
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (order) {
      const remaining = Math.max(0, order.total_harga - (order.nominal_dp || 0));
      setNominal(remaining);
      setJenisPembayaran(remaining === order.total_harga ? 'DP' : 'Pelunasan');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nominal <= 0) {
      setErrorMsg('Nominal pembayaran harus lebih dari 0');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await recordCustomerPayment(
        {
          order_id: order.id,
          invoice_no: order.invoice_no,
          nama_klien: order.nama_klien,
          jenis_pembayaran: jenisPembayaran,
          nominal,
          metode_pembayaran: metodePembayaran,
          tanggal: new Date().toISOString().split('T')[0],
          catatan,
        },
        userName
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error recording customer payment:', err);
      setErrorMsg(err?.message || 'Gagal mencatat pembayaran pelanggan');
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

  const currentPaid = Number(order.nominal_dp || 0);
  const newTotalPaid = Math.min(order.total_harga, currentPaid + nominal);
  const newRemaining = Math.max(0, order.total_harga - newTotalPaid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-['Outfit']">Catat Pembayaran Customer</h2>
              <p className="text-xs text-slate-300">Penerimaan DP, cicilan, atau pelunasan tagihan order</p>
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

          {/* Order Details */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">No. Invoice / Pesanan:</span>
              <span className="font-bold text-slate-900">{order.invoice_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Nama Klien / Pelanggan:</span>
              <span className="font-bold text-slate-900">{order.nama_klien}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Total Nilai Pesanan:</span>
              <span className="font-bold text-slate-800">{formatRupiah(order.total_harga)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Sudah Dibayar:</span>
              <span className="font-semibold text-emerald-700">{formatRupiah(currentPaid)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="text-rose-700 font-bold">Sisa Piutang Saat Ini:</span>
              <span className="text-sm font-extrabold text-rose-600 font-['Outfit']">
                {formatRupiah(sisaTagihan)}
              </span>
            </div>
          </div>

          {/* Jenis & Nominal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Jenis Pembayaran
              </label>
              <select
                value={jenisPembayaran}
                onChange={(e) => setJenisPembayaran(e.target.value as CustomerPaymentType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Pelunasan">Pelunasan</option>
                <option value="DP">Uang Muka (DP)</option>
                <option value="Cicilan">Cicilan</option>
                <option value="Pembayaran Penuh">Pembayaran Penuh</option>
              </select>
            </div>

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
          </div>

          {/* Nominal */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Nominal Pembayaran Diterima (Rp) <span className="text-red-500">*</span>
              </label>
              {sisaTagihan > 0 && (
                <button
                  type="button"
                  onClick={() => setNominal(sisaTagihan)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                >
                  Bayar Sisa ({formatRupiah(sisaTagihan)})
                </button>
              )}
            </div>
            <input
              type="number"
              min="1"
              step="any"
              value={nominal || ''}
              onChange={(e) => setNominal(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-lg font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Status Preview */}
          <div className={`p-3.5 rounded-2xl border text-xs flex justify-between items-center ${
            newRemaining === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <span>Status Setelah Transaksi:</span>
            <span className="font-extrabold">
              {newRemaining === 0 ? 'LUNAS (Piutang Rp0)' : `Sisa Piutang: ${formatRupiah(newRemaining)}`}
            </span>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Catatan / No. Referensi Transfer (Opsional)
            </label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Bukti transfer BCA atas nama Klien"
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
              <span>{loading ? 'Menyimpan...' : 'Simpan Pembayaran & Perbarui Piutang'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
