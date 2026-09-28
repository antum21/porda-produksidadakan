import React, { useState, useEffect } from 'react';
import { OrderItem, SizeBreakdown, ApparelDesignCard } from '../types';
import { updateOrder } from '../services/dbService';
import { useToast } from '../context/ToastContext';
import { calculateDesignsGrandTotal, getSizeExtraCharge } from '../utils/pricing';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Save,
  Loader2,
  Calendar,
  Phone,
  MapPin,
  User,
  Hash,
  DollarSign,
  Layers,
  FileText,
} from 'lucide-react';

interface EditOrderModalProps {
  isOpen: boolean;
  order: OrderItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const sumSizes = (sizesObj?: Partial<SizeBreakdown> | Record<string, any>): number => {
  if (!sizesObj) return 0;
  let total = 0;
  for (const key of Object.keys(sizesObj)) {
    total += Number(sizesObj[key]) || 0;
  }
  return total;
};

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  order,
  onClose,
  onSuccess,
}) => {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [namaKlien, setNamaKlien] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const [alamatKirim, setAlamatKirim] = useState('');
  const [deadline, setDeadline] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [totalHarga, setTotalHarga] = useState<number>(0);
  const [nominalDp, setNominalDp] = useState<number>(0);
  const [catatan, setCatatan] = useState('');

  // Apparel Designs / Sizes (if apparel)
  const [apparelDesigns, setApparelDesigns] = useState<ApparelDesignCard[]>([]);
  const [simpleSizes, setSimpleSizes] = useState<SizeBreakdown>({
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    '2XL': 0,
    '3XL': 0,
    '4XL': 0,
  });

  useEffect(() => {
    if (!order) return;
    setNamaKlien(order.nama_klien || '');
    setNoTelepon(order.no_telepon || '');
    setAlamatKirim(order.alamat_kirim || '');
    setDeadline(order.deadline ? order.deadline.split('T')[0] : '');
    setInvoiceNo(order.invoice_no || '');
    setTotalHarga(order.total_harga || 0);
    setNominalDp(order.nominal_dp || 0);
    setCatatan(order.catatan || '');

    if (order.apparel_designs && order.apparel_designs.length > 0) {
      setApparelDesigns(JSON.parse(JSON.stringify(order.apparel_designs)));
    } else if (order.rincian_ukuran) {
      setSimpleSizes({
        S: order.rincian_ukuran.S || 0,
        M: order.rincian_ukuran.M || 0,
        L: order.rincian_ukuran.L || 0,
        XL: order.rincian_ukuran.XL || 0,
        '2XL': order.rincian_ukuran['2XL'] || order.rincian_ukuran.XXL || 0,
        '3XL': order.rincian_ukuran['3XL'] || 0,
        '4XL': order.rincian_ukuran['4XL'] || 0,
      });
    }
  }, [order]);

  if (!isOpen || !order) return null;

  // Handle apparel size update inside designs
  const handleApparelSizeChange = (
    designIdx: number,
    itemIdx: number,
    sizeKey: string,
    val: number
  ) => {
    const updatedDesigns = [...apparelDesigns];
    const targetItem = updatedDesigns[designIdx]?.items[itemIdx];
    if (!targetItem) return;

    targetItem.sizes = {
      ...targetItem.sizes,
      [sizeKey]: Math.max(0, val),
    };

    // Recalculate item total pcs
    const itemTotalPcs = sumSizes(targetItem.sizes);

    const sablonTotal = (targetItem.sablon_list || []).reduce(
      (sum, s) => sum + (Number(s?.harga) || 0),
      0
    );
    const unitPrice = Math.max(
      0,
      (targetItem.harga_satuan || 0) + sablonTotal - (targetItem.diskon_sablon || 0)
    );

    // Update state
    setApparelDesigns(updatedDesigns);

    // Recalculate overall total with size tiers (+5000) and allow negative discounts
    const { totalHarga: newGrandTotal } = calculateDesignsGrandTotal(updatedDesigns);
    if (newGrandTotal > 0) {
      setTotalHarga(newGrandTotal);
    }
  };

  // Handle simple size breakdown change
  const handleSimpleSizeChange = (sizeKey: string, val: number) => {
    const nextSizes: SizeBreakdown = { ...simpleSizes, [sizeKey]: Math.max(0, val) };
    setSimpleSizes(nextSizes);

    const baseUnitPrice =
      order.total_harga && order.jumlah_pcs ? Math.round(order.total_harga / order.jumlah_pcs) : 75000;
    
    let calculatedTotal = 0;
    Object.entries(nextSizes).forEach(([sz, count]) => {
      const q = Number(count) || 0;
      if (q > 0) {
        const extra = getSizeExtraCharge(sz);
        calculatedTotal += (baseUnitPrice + extra) * q;
      }
    });

    if (calculatedTotal > 0) {
      setTotalHarga(calculatedTotal);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKlien.trim()) {
      error('Validasi Gagal', 'Nama klien wajib diisi!');
      return;
    }

    setLoading(true);
    try {
      let finalJumlahPcs = order.jumlah_pcs;

      // Calculate total pcs from apparel designs if applicable
      if (apparelDesigns.length > 0) {
        let pcsCount = 0;
        apparelDesigns.forEach((d) => {
          d.items.forEach((it) => {
            pcsCount += sumSizes(it.sizes);
          });
        });
        if (pcsCount > 0) finalJumlahPcs = pcsCount;
      } else if (order.rincian_ukuran) {
        const pcsCount = sumSizes(simpleSizes);
        if (pcsCount > 0) finalJumlahPcs = pcsCount;
      }

      const updates: Partial<OrderItem> = {
        nama_klien: namaKlien.trim(),
        no_telepon: noTelepon.trim(),
        alamat_kirim: alamatKirim.trim(),
        deadline: deadline || order.deadline,
        invoice_no: invoiceNo.trim() || order.invoice_no,
        total_harga: Math.max(0, Number(totalHarga)),
        nominal_dp: Math.max(0, Number(nominalDp)),
        catatan: catatan.trim(),
        jumlah_pcs: finalJumlahPcs,
        ...(apparelDesigns.length > 0 ? { apparel_designs: apparelDesigns } : {}),
        ...(order.rincian_ukuran && apparelDesigns.length === 0
          ? { rincian_ukuran: simpleSizes }
          : {}),
      };

      await updateOrder(order.id, updates);
      success('Pesanan Diperbarui', `Pesanan ${order.invoice_no} berhasil disimpan.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating order:', err);
      error('Gagal Menyimpan', err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl w-full max-w-2xl my-auto overflow-hidden shadow-2xl border border-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                ✎
              </div>
              <div>
                <h3 className="font-bold text-sm font-['Outfit']">Edit Data Pesanan</h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {order.invoice_no} • {order.kategori_projek || 'Apparel'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Info Klien */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-red-500" />
                <span>Informasi Pelanggan</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Klien / Instansi</label>
                  <input
                    type="text"
                    value={namaKlien}
                    onChange={(e) => setNamaKlien(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    value={noTelepon}
                    onChange={(e) => setNoTelepon(e.target.value)}
                    placeholder="08xxxxxxxx"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="font-semibold text-slate-700 block mb-1">Alamat Kirim</label>
                <input
                  type="text"
                  value={alamatKirim}
                  onChange={(e) => setAlamatKirim(e.target.value)}
                  placeholder="Alamat lengkap tujuan kirim"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Rincian Ukuran / Pesanan (Jika Apparel) */}
            {apparelDesigns.length > 0 ? (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>Rincian Ukuran Apparel yang Dipesan</span>
                </h4>

                <div className="space-y-3">
                  {apparelDesigns.map((design, dIdx) => (
                    <div key={`edit-desain-${design.id || 'd'}-${dIdx}`} className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                      <div className="font-bold text-xs text-slate-800 mb-2">
                        {design.nama_desain || `Desain #${dIdx + 1}`}
                      </div>
                      {design.items.map((it, iIdx) => (
                        <div key={`edit-item-${it.id || 'i'}-${dIdx}-${iIdx}`} className="space-y-2">
                          <span className="text-[11px] font-semibold text-slate-600 block">
                            {it.jenis_pesanan || 'Item Kaos'}
                          </span>
                          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 text-xs">
                            {['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'].map((sz, szIdx) => (
                              <div key={`edit-sz-${dIdx}-${iIdx}-${sz}-${szIdx}`} className="text-center">
                                <span className="text-[10px] font-bold text-slate-500 block mb-0.5">
                                  {sz}
                                </span>
                                <input
                                  type="number"
                                  min={0}
                                  value={it.sizes?.[sz as keyof typeof it.sizes] || 0}
                                  onChange={(e) =>
                                    handleApparelSizeChange(
                                      dIdx,
                                      iIdx,
                                      sz,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-full bg-white border border-slate-200 rounded-lg py-1 text-center font-bold text-slate-800 text-xs focus:border-red-500 outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : order.rincian_ukuran ? (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>Rincian Ukuran Apparel</span>
                </h4>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  {['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'].map((sz) => (
                    <div key={sz} className="text-center">
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">
                        {sz}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={simpleSizes[sz] || 0}
                        onChange={(e) => handleSimpleSizeChange(sz, parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-1 text-center font-bold text-slate-800 text-xs focus:border-red-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Deadline & Keuangan */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <span>Tanggal & Keuangan</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Deadline Selesai</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Total Harga (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={totalHarga || ''}
                    onChange={(e) => setTotalHarga(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nominal DP (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={nominalDp || ''}
                    onChange={(e) => setNominalDp(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Catatan Pesanan */}
            <div className="text-xs">
              <label className="font-semibold text-slate-700 block mb-1">Catatan Produksi / Klien</label>
              <textarea
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan khusus untuk pengerjaan pesanan ini..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-red-500 text-xs"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#D32F2F] hover:bg-red-700 active:scale-95 text-white font-bold text-xs px-5 py-2 rounded-full shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
