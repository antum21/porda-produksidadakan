import React, { useState } from 'react';
import { PrintType, SizeBreakdown } from '../types';
import { createOrder } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Plus,
  Minus,
  Sparkles,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Phone,
  Layers,
  Palette,
} from 'lucide-react';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newOrderId: string) => void;
}

const APPAREL_PRESETS = [
  'Cotton Combed 30s Soft Reaktif',
  'Cotton Combed 24s Tebal',
  'Heavyweight Cotton 20s Solid',
  'Hoodie Cotton Fleece 330gsm',
  'Crewneck Sweater Babyterry',
  'Polo Shirt Cotton Pique Premium',
  'Jersey Drifit Milano Sublim',
];

const COLOR_PRESETS = [
  'Hitam Jet Black',
  'Putih Solid',
  'Navy Blue Tua',
  'Bottle Green Hijau Botol',
  'Maroon Burgundy',
  'Sand Beige',
  'Charcoal Grey',
];

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [namaKlien, setNamaKlien] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const [emailKlien, setEmailKlien] = useState('');
  const [alamatKirim, setAlamatKirim] = useState('');
  const [jenisCetak, setJenisCetak] = useState<PrintType>('DTF');
  const [bahanApparel, setBahanApparel] = useState(APPAREL_PRESETS[0]);
  const [warnaBahan, setWarnaBahan] = useState(COLOR_PRESETS[0]);
  const [posisiCetak, setPosisiCetak] = useState('Dada Depan Logo + Punggung Full A3');
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [catatan, setCatatan] = useState('');

  // Sizing breakdown
  const [sizes, setSizes] = useState<SizeBreakdown>({ S: 5, M: 15, L: 15, XL: 5, XXL: 0 });

  const totalPcs = (Object.values(sizes) as (number | undefined)[]).reduce<number>(
    (acc, val) => acc + (val || 0),
    0
  );

  // Pricing default estimation based on pcs & type
  const defaultUnitPrice =
    jenisCetak === 'DTF' ? 75000 : jenisCetak === 'Manual' ? 80000 : 90000;

  const [totalHarga, setTotalHarga] = useState<number>(totalPcs * defaultUnitPrice);
  const [nominalDp, setNominalDp] = useState<number>(Math.round(totalPcs * defaultUnitPrice * 0.75));

  // Recalculate price when total pcs or type changes if user hasn't heavily customized
  const handleSizeChange = (key: keyof SizeBreakdown, val: number) => {
    const nextVal = Math.max(0, val);
    const newSizes: SizeBreakdown = { ...sizes, [key]: nextVal };
    setSizes(newSizes);
    const nextTotal = Object.values(newSizes).reduce((acc: number, v) => acc + (Number(v) || 0), 0);
    const newTotal = nextTotal * defaultUnitPrice;
    setTotalHarga(newTotal);
    setNominalDp(Math.round(newTotal * 0.75));
  };

  const handlePrintTypeChange = (type: PrintType) => {
    setJenisCetak(type);
    const unitPrice = type === 'DTF' ? 75000 : type === 'Manual' ? 80000 : 90000;
    const newTotal = totalPcs * unitPrice;
    setTotalHarga(newTotal);
    setNominalDp(Math.round(newTotal * 0.75));
  };

  const dpPercentage = totalHarga > 0 ? Math.round((nominalDp / totalHarga) * 100) : 0;
  const isDpValidForCommit = dpPercentage >= 70;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!namaKlien.trim()) {
      setError('Nama klien wajib diisi!');
      return;
    }
    if (totalPcs <= 0) {
      setError('Jumlah apparel (pcs) minimal 1 pcs!');
      return;
    }
    if (totalHarga <= 0) {
      setError('Total harga harus lebih besar dari Rp 0!');
      return;
    }

    setLoading(true);
    try {
      const orderId = await createOrder(
        {
          nama_klien: namaKlien.trim(),
          no_telepon: noTelepon.trim(),
          email_klien: emailKlien.trim() || undefined,
          alamat_kirim: alamatKirim.trim() || undefined,
          jenis_cetak: jenisCetak,
          bahan_apparel: bahanApparel,
          warna_bahan: warnaBahan,
          jumlah_pcs: totalPcs,
          rincian_ukuran: sizes,
          posisi_cetak: posisiCetak,
          total_harga: totalHarga,
          nominal_dp: nominalDp,
          status: 'Menunggu Pembayaran',
          deadline,
          catatan: catatan.trim() || undefined,
        },
        userProfile?.nama || 'Admin'
      );

      setLoading(false);
      onSuccess?.(orderId);
      onClose();
    } catch (err: any) {
      console.error('Error creating order:', err);
      setError(err?.message || 'Gagal menyimpan pesanan. Periksa koneksi Firestore.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="new-order-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="new-order-modal-container"
        className="bg-white rounded-3xl sm:rounded-[32px] w-full max-w-lg p-5 sm:p-6 shadow-[0_20px_50px_rgba(230,57,70,0.25)] text-slate-800 my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#E63946] flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-['Outfit'] text-slate-900 leading-tight">
                Tambah Pesanan Apparel Baru
              </h2>
              <p className="text-xs text-slate-500">Form input spesifikasi klien & kalkulasi DP</p>
            </div>
          </div>
          <button
            id="close-new-order-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Section 1: Informasi Klien */}
          <div className="bg-[#F8F5F2] p-3.5 rounded-2xl space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#E63946]" /> 1. Data Klien / Pemesan
            </p>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nama Klien / Brand / Komunitas *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Barbershop Keren, HMJ Teknik, dll"
                  value={namaKlien}
                  onChange={(e) => setNamaKlien(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#E63946] focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">No. WhatsApp</label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={noTelepon}
                    onChange={(e) => setNoTelepon(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#E63946]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Deadline Kirim *</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#E63946]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Alamat Pengiriman</label>
                <input
                  type="text"
                  placeholder="Alamat lengkap tujuan kurir / ekspedisi"
                  value={alamatKirim}
                  onChange={(e) => setAlamatKirim(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#E63946]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Spesifikasi Cetak & Apparel */}
          <div className="bg-[#F8F5F2] p-3.5 rounded-2xl space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#E63946]" /> 2. Spesifikasi Cetak & Bahan
            </p>

            {/* Print Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jenis Cetak</label>
              <div className="grid grid-cols-3 gap-2">
                {(['DTF', 'Manual', 'Digital'] as PrintType[]).map((type) => {
                  const isSelected = jenisCetak === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handlePrintTypeChange(type)}
                      className={`py-2 px-2 text-center rounded-xl font-bold text-xs transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-[#E63946] text-white border-[#E63946] shadow-sm shadow-red-500/20'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-red-200'
                      }`}
                    >
                      {type === 'DTF' ? 'DTF Film' : type === 'Manual' ? 'Sablon Manual' : 'Digital / DTG'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bahan Apparel */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Bahan Blank Apparel</label>
              <select
                value={bahanApparel}
                onChange={(e) => setBahanApparel(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#E63946]"
              >
                {APPAREL_PRESETS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Warna Bahan */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Palette className="w-3 h-3 text-slate-500" /> Warna Bahan Kaos / Apparel
              </label>
              <select
                value={warnaBahan}
                onChange={(e) => setWarnaBahan(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#E63946]"
              >
                {COLOR_PRESETS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Breakdown Ukuran */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-600">Rincian Ukuran & Jumlah</label>
                <span className="text-xs font-bold text-[#E63946] bg-red-50 px-2 py-0.5 rounded-full">
                  Total: {totalPcs} Pcs
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {(['S', 'M', 'L', 'XL', 'XXL'] as (keyof SizeBreakdown)[]).map((sz) => (
                  <div key={sz} className="bg-white p-1.5 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block">{sz}</span>
                    <input
                      type="number"
                      min="0"
                      value={sizes[sz] || 0}
                      onChange={(e) => handleSizeChange(sz, parseInt(e.target.value) || 0)}
                      className="w-full text-center font-bold text-sm text-slate-800 focus:outline-none border-b border-transparent focus:border-[#E63946]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Posisi & Desain Cetak</label>
              <input
                type="text"
                placeholder="Contoh: Dada Depan Logo Kecil + Punggung Full A3"
                value={posisiCetak}
                onChange={(e) => setPosisiCetak(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#E63946]"
              />
            </div>
          </div>

          {/* Section 3: Biaya & Verifikasi DP 70% */}
          <div className="bg-[#F8F5F2] p-3.5 rounded-2xl space-y-3 border border-red-100/80">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E63946]" /> 3. Kalkulasi Harga & Nominal DP
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isDpValidForCommit ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                DP: {dpPercentage}% {isDpValidForCommit ? '(Syarat 70% Terpenuhi)' : '(< 70% Syarat Commit)'}
              </span>
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Total Harga (Rp) *</label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  required
                  value={totalHarga}
                  onChange={(e) => setTotalHarga(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#E63946]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nominal DP Terbayar (Rp) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  required
                  value={nominalDp}
                  onChange={(e) => setNominalDp(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#E63946]"
                />
              </div>
            </div>

            {/* Quick DP calculation buttons */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-500 font-medium">Quick DP:</span>
              <button
                type="button"
                onClick={() => setNominalDp(Math.round(totalHarga * 0.5))}
                className="text-[11px] px-2 py-1 bg-white border border-slate-200 rounded-lg font-semibold hover:border-red-200"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setNominalDp(Math.round(totalHarga * 0.7))}
                className="text-[11px] px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-bold"
              >
                70% (Min Commit)
              </button>
              <button
                type="button"
                onClick={() => setNominalDp(Math.round(totalHarga * 0.8))}
                className="text-[11px] px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-semibold"
              >
                80%
              </button>
              <button
                type="button"
                onClick={() => setNominalDp(totalHarga)}
                className="text-[11px] px-2 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold"
              >
                100% (Lunas)
              </button>
            </div>

            {/* Visual DP Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-300 ${
                    isDpValidForCommit ? 'bg-emerald-500' : 'bg-[#E63946]'
                  }`}
                  style={{ width: `${Math.min(100, dpPercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0%</span>
                <span className="font-bold text-amber-600">Threshold 70%</span>
                <span>100% Lunas</span>
              </div>
            </div>

            {/* Note input */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan Tambahan</label>
              <textarea
                rows={2}
                placeholder="Instruksi packing, kode warna khusus, atau catatan vendor"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 pb-1">
            <button
              id="submit-order-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-[#E63946] hover:bg-red-600 active:scale-98 text-white py-3.5 px-6 rounded-full font-bold text-sm shadow-[0_10px_25px_-5px_rgba(230,57,70,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan & Buat Pesanan Baru</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
