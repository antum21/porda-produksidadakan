import React, { useState } from 'react';
import { MaterialStock, MaterialCategory, PurchasePaymentStatus, PaymentMethod } from '../../types';
import { createMaterialPurchase } from '../../services/dbService';
import { X, ShoppingCart, Plus, CheckCircle2, AlertCircle } from 'lucide-react';

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableStocks: MaterialStock[];
  userName?: string;
  onSuccess?: () => void;
  prefilledStock?: MaterialStock | null;
}

const MATERIAL_CATEGORIES: MaterialCategory[] = [
  'Kaos Polos',
  'Kain',
  'DTF / Film',
  'Tinta & Kimia',
  'Kertas & Stiker',
  'Plastik & Packaging',
  'Bahan Percetakan',
  'Aksesoris & Finishing',
  'Bahan Lainnya',
];

const COMMON_UNITS = ['Pcs', 'Meter', 'Roll', 'Kg', 'Lembar', 'Botol', 'Pack', 'Box', 'Rim', 'Set'];

const COMMON_SUPPLIERS = [
  'PT Indo Kaos Polos Bandung',
  'Gudang Kaos Polos Nusantara',
  'Digital Printing Solution Jkt',
  'Toko Sablon Grafika Sejahtera',
  'Percetakan Karton Yogyakarta',
  'Toko Plastik Makmur',
  'Supplier Kain Mulia Jaya',
  'CV Surya Tekstil',
];

export const NewPurchaseModal: React.FC<NewPurchaseModalProps> = ({
  isOpen,
  onClose,
  availableStocks,
  userName = 'Admin',
  onSuccess,
  prefilledStock,
}) => {
  const [supplier, setSupplier] = useState(prefilledStock?.supplier_terakhir || '');
  const [namaBahan, setNamaBahan] = useState(prefilledStock?.nama_bahan || '');
  const [kategori, setKategori] = useState<string>(prefilledStock?.kategori || 'Kaos Polos');
  const [qty, setQty] = useState<number>(prefilledStock ? 50 : 20);
  const [satuan, setSatuan] = useState<string>(prefilledStock?.satuan || 'Pcs');
  const [hargaSatuan, setHargaSatuan] = useState<number>(prefilledStock?.harga_modal || 40000);
  const [statusPembayaran, setStatusPembayaran] = useState<PurchasePaymentStatus>('Lunas');
  const [jumlahDibayar, setJumlahDibayar] = useState<number>(0);
  const [metodePembayaran, setMetodePembayaran] = useState<PaymentMethod>('Transfer Bank');
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const total = (qty || 0) * (hargaSatuan || 0);

  // Auto handle jumlahDibayar based on status
  const effectiveDibayar =
    statusPembayaran === 'Lunas'
      ? total
      : statusPembayaran === 'Belum Lunas'
      ? 0
      : jumlahDibayar;

  const sisaHutang = Math.max(0, total - effectiveDibayar);

  const handleSelectExistingStock = (stockId: string) => {
    const s = availableStocks.find((item) => item.id === stockId);
    if (s) {
      setNamaBahan(s.nama_bahan);
      setKategori(s.kategori);
      setSatuan(s.satuan);
      setHargaSatuan(s.harga_modal);
      if (s.supplier_terakhir) setSupplier(s.supplier_terakhir);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier.trim()) {
      setErrorMsg('Nama supplier wajib diisi');
      return;
    }
    if (!namaBahan.trim()) {
      setErrorMsg('Nama bahan wajib diisi');
      return;
    }
    if (qty <= 0) {
      setErrorMsg('Kuantitas (Qty) harus lebih dari 0');
      return;
    }
    if (hargaSatuan <= 0) {
      setErrorMsg('Harga satuan harus lebih dari 0');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await createMaterialPurchase(
        {
          tanggal: new Date().toISOString().split('T')[0],
          supplier: supplier.trim(),
          nama_bahan: namaBahan.trim(),
          kategori,
          qty,
          satuan,
          harga_satuan: hargaSatuan,
          total,
          status_pembayaran: statusPembayaran,
          jumlah_dibayar: effectiveDibayar,
          metode_pembayaran: metodePembayaran,
          catatan,
        },
        userName
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error recording purchase:', err);
      setErrorMsg(err?.message || 'Gagal mencatat pembelian bahan');
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
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E63946] flex items-center justify-center text-white shadow-md shadow-red-500/30">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-['Outfit']">Catat Pembelian Bahan</h2>
              <p className="text-xs text-slate-300">Menambah stok otomatis & mencatat pengeluaran / hutang supplier</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Select from Existing Stock */}
          {availableStocks.length > 0 && !prefilledStock && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Pilih dari Stok Bahan Existing (Opsional)
              </label>
              <select
                onChange={(e) => handleSelectExistingStock(e.target.value)}
                defaultValue=""
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              >
                <option value="">-- Atau ketik bahan baru di bawah --</option>
                {availableStocks.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama_bahan} (Stok: {s.stok} {s.satuan}) - @{formatRupiah(s.harga_modal)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Supplier */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Nama Supplier / Toko <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              list="supplier-suggestions"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Contoh: PT Indo Kaos Polos Bandung"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              required
            />
            <datalist id="supplier-suggestions">
              {COMMON_SUPPLIERS.map((sup) => (
                <option key={sup} value={sup} />
              ))}
            </datalist>
          </div>

          {/* Nama Bahan & Kategori */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nama Bahan Baku <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={namaBahan}
                onChange={(e) => setNamaBahan(e.target.value)}
                placeholder="Contoh: Kaos Cotton Combed 30s Hitam"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Kategori Bahan
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              >
                {MATERIAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Qty, Satuan, Harga Satuan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Qty / Jumlah <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.001"
                step="any"
                value={qty || ''}
                onChange={(e) => setQty(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Satuan
              </label>
              <input
                type="text"
                list="unit-suggestions"
                value={satuan}
                onChange={(e) => setSatuan(e.target.value)}
                placeholder="Pcs"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
                required
              />
              <datalist id="unit-suggestions">
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Harga Satuan (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={hargaSatuan || ''}
                onChange={(e) => setHargaSatuan(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
                required
              />
            </div>
          </div>

          {/* Total Calculation Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Nilai Pembelian</p>
              <p className="text-xs text-slate-400">
                {qty} {satuan} × {formatRupiah(hargaSatuan)}
              </p>
            </div>
            <p className="text-xl font-extrabold text-slate-900 font-['Outfit']">{formatRupiah(total)}</p>
          </div>

          {/* Status Pembayaran & Hutang Supplier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Status Pembayaran
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Lunas', 'DP / Sebagian', 'Belum Lunas'] as PurchasePaymentStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStatusPembayaran(st);
                      if (st === 'DP / Sebagian') {
                        setJumlahDibayar(Math.round(total * 0.5));
                      }
                    }}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusPembayaran === st
                        ? st === 'Lunas'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : st === 'DP / Sebagian'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Metode Pembayaran
              </label>
              <select
                value={metodePembayaran}
                onChange={(e) => setMetodePembayaran(e.target.value as PaymentMethod)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              >
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="Tunai / Cash">Tunai / Cash</option>
                <option value="QRIS">QRIS</option>
                <option value="Tempo / Hutang">Tempo / Kredit Hutang</option>
              </select>
            </div>
          </div>

          {/* If DP / Sebagian, input jumlah dibayar */}
          {statusPembayaran === 'DP / Sebagian' && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">Jumlah yang Dibayar Sekarang (Rp)</label>
                <input
                  type="number"
                  min="0"
                  max={total}
                  step="any"
                  value={jumlahDibayar || ''}
                  onChange={(e) => setJumlahDibayar(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 text-sm font-bold text-slate-900 focus:outline-none"
                />
              </div>
              <div className="text-right sm:text-left pl-0 sm:pl-2">
                <span className="text-xs text-amber-800 font-semibold block">Sisa Hutang ke Supplier:</span>
                <span className="text-base font-extrabold text-rose-600 font-['Outfit']">
                  {formatRupiah(sisaHutang)}
                </span>
              </div>
            </div>
          )}

          {statusPembayaran === 'Belum Lunas' && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
              ℹ️ Pembelian ini akan dicatat sebagai <strong>Hutang Supplier sebesar {formatRupiah(total)}</strong>. Uang keluar baru akan tercatat saat Anda melakukan pelunasan nanti.
            </div>
          )}

          {/* Catatan */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Catatan Pembelian (Opsional)
            </label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: No faktur supplier #88921 / Bahan order Komunitas Vespa"
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
              className="px-6 py-2.5 rounded-xl bg-[#E63946] hover:bg-red-600 active:scale-98 text-white font-bold text-xs shadow-md shadow-red-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Menyimpan...' : 'Simpan Pembelian & Tambah Stok'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
