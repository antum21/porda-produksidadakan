import React, { useState } from 'react';
import { OrderItem, MaterialStock, MaterialUsage, OrderProductionCost } from '../../types';
import {
  recordMaterialUsage,
  recordOrderProductionCost,
  deleteMaterialUsage,
  deleteOrderProductionCost,
} from '../../services/dbService';
import {
  X,
  Layers,
  Cpu,
  Plus,
  Trash2,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Package,
  Calculator,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';

interface OrderHppDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderItem | null;
  availableStocks: MaterialStock[];
  allUsages?: MaterialUsage[];
  allCosts?: OrderProductionCost[];
  userName?: string;
  onRefresh?: () => void;
}

const PRODUCTION_COST_TYPES = [
  'Jahit',
  'Bordir',
  'Sablon Vendor',
  'Finishing',
  'Cutting',
  'Packaging',
  'Setting Desain / Film',
  'Ongkos Cetak',
  'Tenaga Kerja Langsung',
  'Vendor Lainnya',
];

export const OrderHppDetailModal: React.FC<OrderHppDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  availableStocks,
  allUsages = [],
  allCosts = [],
  userName = 'Admin',
  onRefresh,
}) => {
  // Input Form Modes: 'material' | 'vendor' | 'quick'
  const [activeInputTab, setActiveInputTab] = useState<'material' | 'vendor' | 'quick'>('material');

  // Material Form State
  const [isCustomMaterial, setIsCustomMaterial] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const [customMaterialName, setCustomMaterialName] = useState('');
  const [customSatuan, setCustomSatuan] = useState('Pcs');
  const [materialQty, setMaterialQty] = useState<number>(1);
  const [materialUnitCost, setMaterialUnitCost] = useState<number>(0);
  const [materialCatatan, setMaterialCatatan] = useState('');

  // Vendor Form State
  const [vendorCostType, setVendorCostType] = useState<string>('Jahit');
  const [vendorName, setVendorName] = useState('');
  const [vendorDescription, setVendorDescription] = useState('');
  const [vendorAmount, setVendorAmount] = useState<number>(0);

  // Quick Direct Modal State
  const [quickTitle, setQuickTitle] = useState('Alokasi Modal Pokok Pesanan');
  const [quickAmount, setQuickAmount] = useState<number>(0);
  const [quickNotes, setQuickNotes] = useState('');

  // Submission States
  const [loading, setLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-fill material price when stock changes
  const handleStockChange = (stockId: string) => {
    setSelectedStockId(stockId);
    const stock = availableStocks.find((s) => s.id === stockId);
    if (stock) {
      setMaterialUnitCost(stock.harga_modal || 0);
    }
  };

  if (!isOpen || !order) return null;

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Find all current usages and costs specifically for this order
  const orderUsages = allUsages.filter(
    (u) => u.order_id === order.id || (u.invoice_no && u.invoice_no === order.invoice_no)
  );
  const orderCosts = allCosts.filter(
    (c) => c.order_id === order.id || (c.invoice_no && c.invoice_no === order.invoice_no)
  );

  const totalBahan = orderUsages.reduce((sum, u) => sum + (u.total_biaya || 0), 0);
  const totalVendor = orderCosts.reduce((sum, c) => sum + (c.biaya || 0), 0);
  const totalModal = totalBahan + totalVendor;

  const totalHargaJual = order.total_harga || 0;
  const labaKotor = totalHargaJual - totalModal;
  const marginPersen = totalHargaJual > 0 ? (labaKotor / totalHargaJual) * 100 : 0;
  const modalPerPcs = order.jumlah_pcs > 0 ? Math.round(totalModal / order.jumlah_pcs) : totalModal;
  const hargaJualPerPcs = order.jumlah_pcs > 0 ? Math.round(totalHargaJual / order.jumlah_pcs) : totalHargaJual;

  // 1. Submit Material Usage
  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setActionSuccessMsg('');

    if (materialQty <= 0) {
      setErrorMsg('Jumlah (Qty) bahan harus lebih dari 0.');
      return;
    }
    if (materialUnitCost < 0) {
      setErrorMsg('Harga modal satuan tidak boleh negatif.');
      return;
    }

    let namaBahan = '';
    let satuan = 'Pcs';
    let stockId = '';

    if (isCustomMaterial) {
      if (!customMaterialName.trim()) {
        setErrorMsg('Masukkan nama bahan non-stok / custom.');
        return;
      }
      namaBahan = customMaterialName.trim();
      satuan = customSatuan.trim() || 'Pcs';
      stockId = 'CUSTOM_NON_STOCK';
    } else {
      if (!selectedStockId) {
        setErrorMsg('Pilih bahan baku dari stok gudang.');
        return;
      }
      const st = availableStocks.find((s) => s.id === selectedStockId);
      if (!st) {
        setErrorMsg('Bahan baku tidak ditemukan di stok.');
        return;
      }
      namaBahan = st.nama_bahan;
      satuan = st.satuan;
      stockId = st.id;

      if (materialQty > st.stok) {
        const confirmExceed = window.confirm(
          `Peringatan: Qty yang dimasukkan (${materialQty} ${st.satuan}) melebihi sisa stok di gudang (${st.stok} ${st.satuan}). Tetap lanjutkan? (Stok akan menjadi 0)`
        );
        if (!confirmExceed) return;
      }
    }

    setLoading(true);
    try {
      await recordMaterialUsage(
        {
          order_id: order.id,
          invoice_no: order.invoice_no,
          nama_klien: order.nama_klien,
          material_stock_id: stockId,
          nama_bahan: namaBahan,
          qty: materialQty,
          satuan,
          harga_modal_satuan: materialUnitCost,
          tanggal: new Date().toISOString().split('T')[0],
          catatan: materialCatatan.trim(),
        },
        userName
      );

      setActionSuccessMsg(`Bahan "${namaBahan}" berhasil ditambahkan ke modal order.`);
      // Reset form
      setSelectedStockId('');
      setCustomMaterialName('');
      setMaterialQty(1);
      setMaterialUnitCost(0);
      setMaterialCatatan('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error saving material:', err);
      setErrorMsg(err?.message || 'Gagal menyimpan pemakaian bahan.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Vendor / Maklon Cost
  const handleAddVendorCost = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setActionSuccessMsg('');

    if (!vendorDescription.trim()) {
      setErrorMsg('Deskripsi pekerjaan / biaya vendor wajib diisi.');
      return;
    }
    if (vendorAmount <= 0) {
      setErrorMsg('Nominal biaya vendor harus lebih besar dari 0.');
      return;
    }

    setLoading(true);
    try {
      await recordOrderProductionCost(
        {
          order_id: order.id,
          invoice_no: order.invoice_no,
          jenis_biaya: vendorCostType,
          nama_vendor: vendorName.trim(),
          deskripsi: vendorDescription.trim(),
          biaya: vendorAmount,
          tanggal: new Date().toISOString().split('T')[0],
        },
        userName
      );

      setActionSuccessMsg(`Biaya ${vendorCostType} (${formatRupiah(vendorAmount)}) berhasil ditambahkan.`);
      // Reset
      setVendorName('');
      setVendorDescription('');
      setVendorAmount(0);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error saving vendor cost:', err);
      setErrorMsg(err?.message || 'Gagal menyimpan biaya vendor.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Submit Quick Direct Modal
  const handleAddQuickModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setActionSuccessMsg('');

    if (quickAmount <= 0) {
      setErrorMsg('Nominal modal yang akan dialokasikan harus lebih besar dari 0.');
      return;
    }

    setLoading(true);
    try {
      await recordOrderProductionCost(
        {
          order_id: order.id,
          invoice_no: order.invoice_no,
          jenis_biaya: 'Alokasi Modal Pokok',
          nama_vendor: 'Internal Workshop',
          deskripsi: `${quickTitle.trim()} ${quickNotes.trim() ? `(${quickNotes.trim()})` : ''}`,
          biaya: quickAmount,
          tanggal: new Date().toISOString().split('T')[0],
        },
        userName
      );

      setActionSuccessMsg(`Alokasi modal langsung sebesar ${formatRupiah(quickAmount)} berhasil ditambahkan.`);
      setQuickAmount(0);
      setQuickNotes('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Error saving quick modal:', err);
      setErrorMsg(err?.message || 'Gagal menyimpan alokasi modal.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Delete Material Usage Item
  const handleDeleteMaterial = async (u: MaterialUsage) => {
    if (
      window.confirm(
        `Hapus bahan "${u.nama_bahan}" (${u.qty} ${u.satuan} = ${formatRupiah(u.total_biaya)}) dari modal order ini?\n(Stok di gudang akan otomatis dikembalikan).`
      )
    ) {
      setLoading(true);
      try {
        await deleteMaterialUsage(u.id);
        setActionSuccessMsg(`Bahan "${u.nama_bahan}" dihapus & stok dikembalikan.`);
        if (onRefresh) onRefresh();
      } catch (err: any) {
        console.error('Error deleting usage:', err);
        setErrorMsg('Gagal menghapus bahan.');
      } finally {
        setLoading(false);
      }
    }
  };

  // 5. Delete Production Cost Item
  const handleDeleteCost = async (c: OrderProductionCost) => {
    if (
      window.confirm(
        `Hapus biaya ${c.jenis_biaya} "${c.deskripsi}" (${formatRupiah(c.biaya)}) dari modal order ini?`
      )
    ) {
      setLoading(true);
      try {
        await deleteOrderProductionCost(c.id);
        setActionSuccessMsg(`Biaya ${c.jenis_biaya} dihapus dari modal.`);
        if (onRefresh) onRefresh();
      } catch (err: any) {
        console.error('Error deleting cost:', err);
        setErrorMsg('Gagal menghapus biaya vendor.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-100 my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-6 py-4.5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-600/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white font-['Outfit']">
                  Input & Kelola Modal Pesanan #{order.invoice_no}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  HPP Order
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Klien: <strong className="text-white">{order.nama_klien}</strong> • {order.jumlah_pcs} Pcs • Total Omzet: {formatRupiah(totalHargaJual)}
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

        {/* Financial Metrics Summary Banner */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200/80 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Omzet Jual */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Omzet (Jual)
              </span>
              <p className="text-base font-black text-slate-900 font-['Outfit'] mt-0.5">
                {formatRupiah(totalHargaJual)}
              </p>
              <span className="text-[10px] text-slate-400">@{formatRupiah(hargaJualPerPcs)}/pcs</span>
            </div>

            {/* Total Modal Terinput */}
            <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200/70 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                  Total Modal (HPP)
                </span>
                <span className="text-[10px] font-semibold text-rose-600">
                  {orderUsages.length + orderCosts.length} Item
                </span>
              </div>
              <p className="text-base font-black text-rose-600 font-['Outfit'] mt-0.5">
                {formatRupiah(totalModal)}
              </p>
              <span className="text-[10px] text-rose-600/80">@{formatRupiah(modalPerPcs)}/pcs</span>
            </div>

            {/* Proyeksi Laba Kotor */}
            <div
              className={`p-3 rounded-2xl border shadow-2xs ${
                labaKotor >= 0
                  ? 'bg-emerald-50/70 border-emerald-200/70'
                  : 'bg-red-50/70 border-red-200/70'
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase tracking-wider block ${
                  labaKotor >= 0 ? 'text-emerald-800' : 'text-red-800'
                }`}
              >
                Proyeksi Laba Kotor
              </span>
              <p
                className={`text-base font-black font-['Outfit'] mt-0.5 ${
                  labaKotor >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {formatRupiah(labaKotor)}
              </p>
              <span className="text-[10px] text-slate-500">Omzet - Modal</span>
            </div>

            {/* Margin Laba (%) */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Margin Laba (%)
              </span>
              <p
                className={`text-base font-black font-['Outfit'] mt-0.5 ${
                  marginPersen >= 30
                    ? 'text-emerald-600'
                    : marginPersen >= 15
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}
              >
                {marginPersen.toFixed(1)}%
              </p>
              <span className="text-[10px] text-slate-400">
                {totalModal === 0
                  ? 'Modal belum diisi'
                  : marginPersen >= 30
                  ? 'Target Tercapai (Sehat)'
                  : marginPersen >= 15
                  ? 'Margin Wajar'
                  : 'Margin Tipis / Minus'}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Content: Form + Existing Items Table */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}
          {actionSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* Section A: Form Tambah Modal */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-['Outfit'] flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-rose-600" />
                  <span>Tambah Modal untuk Pesanan Ini</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Input bahan baku yang dipakai, ongkos vendor/maklon, atau alokasi modal langsung
                </p>
              </div>

              {/* Mode Switch Tabs */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveInputTab('material')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeInputTab === 'material'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>1. Bahan Baku</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputTab('vendor')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeInputTab === 'vendor'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>2. Biaya Vendor / Maklon</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputTab('quick')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeInputTab === 'quick'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>3. Input Cepat Modal</span>
                </button>
              </div>
            </div>

            {/* TAB 1: FORM BAHAN BAKU */}
            {activeInputTab === 'material' && (
              <form onSubmit={handleAddMaterial} className="space-y-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Sumber Bahan:</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
                      <input
                        type="radio"
                        name="mat_source"
                        checked={!isCustomMaterial}
                        onChange={() => setIsCustomMaterial(false)}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>Ambil dari Stok Gudang</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
                      <input
                        type="radio"
                        name="mat_source"
                        checked={isCustomMaterial}
                        onChange={() => setIsCustomMaterial(true)}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>Bahan Bebas / Non-Stok</span>
                    </label>
                  </div>
                </div>

                {!isCustomMaterial ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pilih Bahan dari Stok Gudang <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedStockId}
                      onChange={(e) => handleStockChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      required
                    >
                      <option value="">-- Pilih Bahan Baku di Gudang --</option>
                      {availableStocks.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama_bahan} (Stok: {s.stok} {s.satuan} @{formatRupiah(s.harga_modal)})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nama Bahan Custom / Non-Stok <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customMaterialName}
                        onChange={(e) => setCustomMaterialName(e.target.value)}
                        placeholder="Contoh: Kaos Polos Warna Lilac Khusus Klien"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Satuan</label>
                      <input
                        type="text"
                        value={customSatuan}
                        onChange={(e) => setCustomSatuan(e.target.value)}
                        placeholder="Pcs / Meter / Roll"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Jumlah (Qty) Terpakai <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={materialQty}
                      onChange={(e) => setMaterialQty(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Harga Modal Satuan (Rp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={materialUnitCost}
                      onChange={(e) => setMaterialUnitCost(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Subtotal Biaya Bahan
                    </label>
                    <div className="w-full px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200 text-xs font-extrabold text-amber-800 font-['Outfit'] flex items-center justify-between">
                      <span>{formatRupiah((materialQty || 0) * (materialUnitCost || 0))}</span>
                      <span className="text-[10px] font-normal text-amber-600">Masuk HPP</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                  <input
                    type="text"
                    value={materialCatatan}
                    onChange={(e) => setMaterialCatatan(e.target.value)}
                    placeholder="Contoh: Pemotongan bahan kaos untuk ukuran S/M/L"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{loading ? 'Menyimpan...' : '+ Tambahkan Bahan ke Modal Order'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: FORM BIAYA VENDOR / MAKLON */}
            {activeInputTab === 'vendor' && (
              <form onSubmit={handleAddVendorCost} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Jenis Biaya / Maklon <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={vendorCostType}
                      onChange={(e) => setVendorCostType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {PRODUCTION_COST_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Vendor / Penjahit / Mitra
                    </label>
                    <input
                      type="text"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      placeholder="Contoh: Penjahit Pak Wawan / Bordir Komputer"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Rincian Pekerjaan / Deskripsi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vendorDescription}
                      onChange={(e) => setVendorDescription(e.target.value)}
                      placeholder="Contoh: Jahit kerah & manset polo 50 pcs @Rp6.000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nominal Biaya (Rp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={vendorAmount || ''}
                      onChange={(e) => setVendorAmount(Number(e.target.value))}
                      placeholder="Rp0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-extrabold text-indigo-700 bg-white font-['Outfit']"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{loading ? 'Menyimpan...' : '+ Tambahkan Biaya Vendor ke Modal'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: FORM INPUT CEPAT MODAL LANGSUNG */}
            {activeInputTab === 'quick' && (
              <form onSubmit={handleAddQuickModal} className="space-y-3.5">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    Gunakan fitur ini jika Anda ingin <strong>langsung mengalokasikan total modal pokok</strong> pesanan (misal: estimasi modal bahan + produksi all-in) tanpa perlu mendata komponen bahan stok satu-persatu.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Alokasi Modal <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      placeholder="Contoh: Alokasi Modal Produksi Kaos Sablon"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nominal Modal (Rp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={quickAmount || ''}
                      onChange={(e) => setQuickAmount(Number(e.target.value))}
                      placeholder="Rp0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-900 bg-white font-['Outfit']"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan / Rincian Singkat (Opsional)
                  </label>
                  <input
                    type="text"
                    value={quickNotes}
                    onChange={(e) => setQuickNotes(e.target.value)}
                    placeholder="Contoh: Estimasi modal kain combed 30s + tinta DTF + sablon + jahit"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black active:scale-98 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{loading ? 'Menyimpan...' : '+ Simpan Alokasi Modal Langsung'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Section B: Rincian Modal yang Sudah Diinput */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-['Outfit']">
                  Daftar Modal Terinput untuk Pesanan Ini ({orderUsages.length + orderCosts.length} Item)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Subtotal Bahan: <strong className="text-amber-700">{formatRupiah(totalBahan)}</strong> • Subtotal Vendor: <strong className="text-indigo-700">{formatRupiah(totalVendor)}</strong>
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                  Total Modal
                </span>
                <span className="text-base font-extrabold text-rose-600 font-['Outfit']">
                  {formatRupiah(totalModal)}
                </span>
              </div>
            </div>

            {orderUsages.length === 0 && orderCosts.length === 0 ? (
              <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center bg-slate-50/50">
                <Calculator className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Modal Belum Diinput</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                  Belum ada bahan baku atau biaya vendor yang dicatat untuk pesanan ini. Gunakan form di atas untuk memasukkan modal yang digunakan.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-3.5 py-2.5">Kategori Modal</th>
                      <th className="px-3.5 py-2.5">Bahan / Pekerjaan</th>
                      <th className="px-3.5 py-2.5">Qty / Satuan</th>
                      <th className="px-3.5 py-2.5">Modal Satuan</th>
                      <th className="px-3.5 py-2.5">Subtotal Biaya</th>
                      <th className="px-3.5 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Material Usages */}
                    {orderUsages.map((u) => (
                      <tr key={u.id} className="hover:bg-amber-50/30">
                        <td className="px-3.5 py-2.5">
                          <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
                            <Layers className="w-3 h-3 text-amber-600" />
                            <span>Bahan Baku</span>
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                          {u.nama_bahan}
                          {u.catatan && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {u.catatan}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-700">
                          {u.qty} {u.satuan}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-700">
                          {formatRupiah(u.harga_modal_satuan)}
                        </td>
                        <td className="px-3.5 py-2.5 font-extrabold text-amber-700 font-['Outfit']">
                          {formatRupiah(u.total_biaya)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterial(u)}
                            title="Hapus Bahan & Kembalikan Stok"
                            className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Production Costs */}
                    {orderCosts.map((c) => (
                      <tr key={c.id} className="hover:bg-indigo-50/30">
                        <td className="px-3.5 py-2.5">
                          <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1 w-fit">
                            <Cpu className="w-3 h-3 text-indigo-600" />
                            <span>{c.jenis_biaya}</span>
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="font-semibold text-slate-800">{c.deskripsi}</span>
                          {c.nama_vendor && (
                            <span className="block text-[10px] text-slate-400 font-medium">
                              Vendor: {c.nama_vendor}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-500 text-[11px]">-</td>
                        <td className="px-3.5 py-2.5 text-slate-500 text-[11px]">-</td>
                        <td className="px-3.5 py-2.5 font-extrabold text-indigo-700 font-['Outfit']">
                          {formatRupiah(c.biaya)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteCost(c)}
                            title="Hapus Biaya Vendor"
                            className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="px-3.5 py-2.5 text-right uppercase tracking-wider text-[10px] text-slate-500">
                        Total Modal Pesanan (HPP):
                      </td>
                      <td className="px-3.5 py-2.5 font-black text-rose-600 font-['Outfit'] text-sm">
                        {formatRupiah(totalModal)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Modal yang diinput otomatis masuk ke perhitungan HPP, Laba Kotor, dan Laba Bersih Porda ERP.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black active:scale-98 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
