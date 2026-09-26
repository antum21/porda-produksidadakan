import React, { useState, useEffect } from 'react';
import { OperationalExpense, OperationalExpenseCategory, PaymentMethod } from '../../types';
import { createOperationalExpense, updateOperationalExpense } from '../../services/dbService';
import { X, Receipt, CheckCircle2, AlertCircle, Calendar, Tag, CreditCard, FileText } from 'lucide-react';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  onSuccess?: () => void;
  expenseToEdit?: OperationalExpense | null;
}

const EXPENSE_CATEGORIES: OperationalExpenseCategory[] = [
  'Listrik',
  'Internet',
  'Transportasi',
  'Bensin',
  'Maintenance Mesin',
  'Sewa',
  'Gaji',
  'Marketing',
  'ATK',
  'Administrasi',
  'Packaging',
  'Biaya Bank',
  'Lainnya',
];

const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Transfer',
  'QRIS',
  'Debit',
  'Lainnya',
];

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({
  isOpen,
  onClose,
  userName = 'Finance',
  onSuccess,
  expenseToEdit = null,
}) => {
  const isEditing = Boolean(expenseToEdit);
  const todayStr = new Date().toISOString().split('T')[0];

  const [tanggal, setTanggal] = useState<string>(todayStr);
  const [kategori, setKategori] = useState<OperationalExpenseCategory>('Transportasi');
  const [deskripsi, setDeskripsi] = useState('');
  const [nominal, setNominal] = useState<number>(50000);
  const [metodePembayaran, setMetodePembayaran] = useState<PaymentMethod>('Cash');
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Synchronize state when modal opens or expenseToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (expenseToEdit) {
        setTanggal(expenseToEdit.tanggal || todayStr);
        setKategori((expenseToEdit.kategori as OperationalExpenseCategory) || 'Transportasi');
        setDeskripsi(expenseToEdit.deskripsi || '');
        setNominal(Number(expenseToEdit.nominal) || 0);
        setMetodePembayaran((expenseToEdit.metode_pembayaran as PaymentMethod) || 'Cash');
        setCatatan(expenseToEdit.catatan || '');
      } else {
        setTanggal(todayStr);
        setKategori('Transportasi');
        setDeskripsi('');
        setNominal(50000);
        setMetodePembayaran('Cash');
        setCatatan('');
      }
      setErrorMsg('');
    }
  }, [isOpen, expenseToEdit, todayStr]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tanggal) {
      setErrorMsg('Tanggal pengeluaran wajib diisi');
      return;
    }
    if (!deskripsi.trim()) {
      setErrorMsg('Deskripsi pengeluaran wajib diisi');
      return;
    }
    if (!nominal || nominal <= 0) {
      setErrorMsg('Nominal pengeluaran harus lebih besar dari 0');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      if (isEditing && expenseToEdit) {
        await updateOperationalExpense(
          expenseToEdit.id,
          {
            tanggal,
            kategori,
            deskripsi: deskripsi.trim(),
            nominal: Number(nominal),
            metode_pembayaran: metodePembayaran,
            catatan: catatan.trim(),
          },
          userName
        );
      } else {
        await createOperationalExpense(
          {
            tanggal,
            kategori,
            deskripsi: deskripsi.trim(),
            nominal: Number(nominal),
            metode_pembayaran: metodePembayaran,
            catatan: catatan.trim(),
          },
          userName
        );
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving operational expense:', err);
      setErrorMsg(err?.message || 'Gagal menyimpan transaksi pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const quickDescriptions: { [key in OperationalExpenseCategory]?: string[] } = {
    Transportasi: ['Bensin pengantaran order', 'Ongkos kirim ekspedisi', 'Parkir & tol pickup barang'],
    Bensin: ['Bensin motor kurir', 'Bensin mobil pickup workshop'],
    Listrik: ['Token listrik PLN workshop', 'Tagihan listrik bulanan 5500VA'],
    Internet: ['Wifi Biznet dedicated workshop', 'Paket data sim card admin'],
    'Maintenance Mesin': ['Pembersih printhead DTF & wiper blade', 'Service rutin mesin press kaos', 'Pelumas mesin sablon'],
    Packaging: ['Plastik opp packing baju', 'Lakban fragile & kardus box', 'Polymailer packing pakaian'],
    ATK: ['Kertas print nota & invoice', 'Spidol, solasi & atk kasir'],
    Administrasi: ['Biaya materai & surat jalan', 'Keperluan kantor workshop'],
    'Biaya Bank': ['Biaya admin transfer antar bank', 'Biaya administrasi rekening'],
    Sewa: ['Uang sewa gedung workshop', 'Sewa ruko studio sablon'],
    Gaji: ['Uang makan lembur tim sablon', 'Gaji mingguan tim finishing'],
    Marketing: ['Iklan Instagram Ads order apparel', 'Cetak brosur & kartu nama workshop'],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-600/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-['Outfit']">
                {isEditing ? 'Edit Pengeluaran Operasional' : 'Tambah Pengeluaran Operasional'}
              </h2>
              <p className="text-xs text-slate-300">
                {isEditing
                  ? `Perbarui transaksi #${expenseToEdit?.nomor_transaksi || ''}`
                  : 'Catat pengeluaran kas operasional bisnis workshop'}
              </p>
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

          {/* Row 1: Tanggal & Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Tanggal <span className="text-red-500">*</span></span>
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>Kategori <span className="text-red-500">*</span></span>
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as OperationalExpenseCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Deskripsi Pengeluaran <span className="text-red-500">*</span></span>
            </label>
            <input
              type="text"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Contoh: Bensin pengantaran order"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              required
            />
            {/* Quick description suggestions */}
            {quickDescriptions[kategori] && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] text-slate-400 font-medium self-center">Pilihan cepat:</span>
                {quickDescriptions[kategori]?.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setDeskripsi(item)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-all"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Row 3: Nominal & Metode Pembayaran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nominal (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={nominal || ''}
                onChange={(e) => setNominal(Number(e.target.value))}
                placeholder="50000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                <span>Metode Pembayaran <span className="text-red-500">*</span></span>
              </label>
              <select
                value={metodePembayaran}
                onChange={(e) => setMetodePembayaran(e.target.value as PaymentMethod)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Visual Callout for Cash Out */}
          <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-100 flex items-center justify-between">
            <span className="text-xs text-rose-800 font-medium">Beban Operasional (Cash Out):</span>
            <span className="text-base font-extrabold text-rose-700 font-['Outfit']">{formatRupiah(nominal)}</span>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Catatan (Opsional)
            </label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Bukti struk SPBU terlampir / nota kasir #12"
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
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-rose-600/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

