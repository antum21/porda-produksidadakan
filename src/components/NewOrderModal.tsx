import React, { useState, useEffect } from 'react';
import { PrintType, SizeBreakdown, ProjectCategory, ApparelDesignCard } from '../types';
import { createOrder } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { ApparelOrderForm, createDefaultDesignCard } from './ApparelOrderForm';
import {
  X,
  Plus,
  Sparkles,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Phone,
  Layers,
  Palette,
  Shirt,
  Printer,
  ChevronRight,
  ArrowLeft,
  Tag,
  Scissors,
  FileText,
  Boxes,
  Compass,
} from 'lucide-react';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newOrderId: string) => void;
}

// Preset Data for Apparel
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
  'Sage Green',
];

// Preset Data for Grafis (Cetakan)
const GRAFIS_PRODUCT_PRESETS = [
  'Spanduk & Banner Outdoor',
  'X-Banner / Roll-Up Banner (Include Stand)',
  'Stiker & Label Kemasan Produk (A3+ Sheet)',
  'Brosur & Flyer Promosi',
  'Kartu Nama Bisnis (Box isi 100)',
  'Poster & Sertifikat / Piagam',
  'Merchandise Cetak (Mug / Pin / Lanyard / Tumbler)',
  'Kalender Dinding / Meja',
  'Custom Cetak Grafis',
];

const GRAFIS_MATERIAL_PRESETS = [
  'Flexi Korea 440gsm (Tebal & Tahan Cuaca)',
  'Flexi China 280gsm (Ekonomis Outdoor)',
  'Flexi China 340gsm (Standar Spanduk)',
  'Stiker Vinyl Waterproof (Glossy / Doff)',
  'Stiker Kromo (Ekonomis Label Botol/Toples)',
  'Stiker Transparan / Hologram',
  'Art Paper 150gsm / Art Carton 260gsm',
  'Albatros Hi-Res Indoor (+ Stand)',
  'Backlite Film (Khusus Neonbox)',
  'Kertas HVS 80gsm / Samson Kraft',
];

const GRAFIS_FINISHING_PRESETS = [
  'Mata Ayam (Ring Seng) 4 Sudut',
  'Selongsong Kiri-Kanan / Atas-Bawah',
  'Lipat Lem Keliling Siku Rapi',
  'Potong Pas (Potong Siku Bersih)',
  'Laminasi Panas Doff (Matte Mewah)',
  'Laminasi Panas Glossy (Mengkilap Cerah)',
  'Kiss-Cut (Stiker Setengah Putus Siap Kelupas)',
  'Die-Cut (Potong Pola Putus Lepas)',
  'Jilid Spiral Kawat / Steples Tengah',
  'Tanpa Finishing (Cetak Lembaran Polos)',
];

const GRAFIS_UNIT_PRESETS = ['Lembar', 'Meter² (m²)', 'Pcs', 'Box (100 pcs)', 'Rim', 'Pack', 'Roll'];

const GRAFIS_TECH_PRESETS = [
  'Outdoor Hi-Res (Large Format)',
  'Indoor Eco-Solvent Hi-Res',
  'Digital Printing A3+ Laser',
  'UV Flatbed Print',
  'Offset Cetak Massal',
];

// Custom / Lainnya Satuan Presets
const LAINNYA_SATUAN_PRESETS = ['Paket', 'Pcs', 'Set', 'Proyek', 'Sesi', 'Hari', 'Box'];

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { userProfile } = useAuth();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // STEP MANAGEMENT: 'select_category' | 'fill_form'
  const [step, setStep] = useState<'select_category' | 'fill_form'>('select_category');
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory>('apparel');

  // Random Invoice Number & Invoice Date
  const generateRandomInvoiceNumber = () => `${Math.floor(100000 + Math.random() * 900000)}`;
  const [invoiceNo, setInvoiceNo] = useState(generateRandomInvoiceNumber());
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  // Common Client Data
  const [namaKlien, setNamaKlien] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const [emailKlien, setEmailKlien] = useState('');
  const [alamatKirim, setAlamatKirim] = useState('');
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [catatan, setCatatan] = useState('');

  // 1. APPAREL SPECIFIC STATES (Multi-Design Support)
  const [apparelDesigns, setApparelDesigns] = useState<ApparelDesignCard[]>([createDefaultDesignCard(1)]);
  const [jenisCetakApparel, setJenisCetakApparel] = useState<PrintType>('DTF');
  const [bahanApparel, setBahanApparel] = useState(APPAREL_PRESETS[0]);
  const [warnaBahan, setWarnaBahan] = useState(COLOR_PRESETS[0]);
  const [posisiCetak, setPosisiCetak] = useState('Dada Depan Logo + Punggung Full A3');
  const [sizes, setSizes] = useState<SizeBreakdown>({ S: 0, M: 0, L: 0, XL: 0, XXL: 0 });

  // 2. GRAFIS SPECIFIC STATES
  const [tipeGrafis, setTipeGrafis] = useState(GRAFIS_PRODUCT_PRESETS[0]);
  const [bahanCetak, setBahanCetak] = useState(GRAFIS_MATERIAL_PRESETS[0]);
  const [dimensiUkuran, setDimensiUkuran] = useState('3 x 1 Meter');
  const [finishingGrafis, setFinishingGrafis] = useState(GRAFIS_FINISHING_PRESETS[0]);
  const [satuanGrafis, setSatuanGrafis] = useState('Meter² (m²)');
  const [jenisCetakGrafis, setJenisCetakGrafis] = useState(GRAFIS_TECH_PRESETS[0]);
  const [jumlahGrafis, setJumlahGrafis] = useState<number>(3); // e.g. 3 meter or 3 lembar
  const [hargaSatuanGrafis, setHargaSatuanGrafis] = useState<number>(35000); // e.g. 35.000 / m2

  // 3. LAINNYA / CUSTOM ORDER STATES
  const [namaItemCustom, setNamaItemCustom] = useState('');
  const [satuanCustom, setSatuanCustom] = useState(LAINNYA_SATUAN_PRESETS[0]);
  const [jumlahCustom, setJumlahCustom] = useState<number>(1);
  const [deskripsiCustom, setDeskripsiCustom] = useState('');

  // FINANCIAL STATES
  const [totalHarga, setTotalHarga] = useState<number>(0);
  const [nominalDp, setNominalDp] = useState<number>(0);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select_category');
      setError(null);
      setInvoiceNo(generateRandomInvoiceNumber());
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setApparelDesigns([createDefaultDesignCard(1)]);
    }
  }, [isOpen]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute Total Apparel Pcs across all designs and items
  const totalApparelPcs = apparelDesigns.reduce((accD, d) => {
    return (
      accD +
      d.items.reduce((accI, item) => {
        return (
          accI +
          (item.sizes.S || 0) +
          (item.sizes.M || 0) +
          (item.sizes.L || 0) +
          (item.sizes.XL || 0) +
          (item.sizes['2XL'] || 0) +
          (item.sizes['3XL'] || 0) +
          (item.sizes['4XL'] || 0)
        );
      }, 0)
    );
  }, 0);

  // Compute Total Apparel Price across all designs and items
  // Formula: (Harga Satuan + Harga Sablon) x Total Baju (pcs)
  const totalApparelHarga = apparelDesigns.reduce((accD, d) => {
    return (
      accD +
      d.items.reduce((accI, item) => {
        const itemPcs =
          (item.sizes.S || 0) +
          (item.sizes.M || 0) +
          (item.sizes.L || 0) +
          (item.sizes.XL || 0) +
          (item.sizes['2XL'] || 0) +
          (item.sizes['3XL'] || 0) +
          (item.sizes['4XL'] || 0);
        const rawSablonPrice = item.sablon_list.reduce((accS, s) => accS + (s.harga || 0), 0);
        const effectiveSablonPrice = Math.max(0, rawSablonPrice - (item.diskon_sablon || 0));
        const pricePerPcs = (item.harga_satuan || 0) + effectiveSablonPrice;
        return accI + pricePerPcs * itemPcs;
      }, 0)
    );
  }, 0);

  // Synchronize totalHarga and DP when apparelDesigns change
  useEffect(() => {
    if (selectedCategory === 'apparel') {
      setTotalHarga(totalApparelHarga);
      setNominalDp(totalApparelHarga > 0 ? Math.round(totalApparelHarga * 0.75) : 0);
    }
  }, [totalApparelHarga, selectedCategory]);

  // Recalculate default prices when selecting category
  const handleSelectCategory = (cat: ProjectCategory) => {
    setSelectedCategory(cat);
    if (cat === 'apparel') {
      setTotalHarga(totalApparelHarga);
      setNominalDp(totalApparelHarga > 0 ? Math.round(totalApparelHarga * 0.75) : 0);
    } else if (cat === 'grafis') {
      const initialTotal = Math.max(1, jumlahGrafis) * hargaSatuanGrafis;
      setTotalHarga(initialTotal);
      setNominalDp(Math.round(initialTotal * 0.75));
    } else {
      // Lainnya: Custom pricing
      setTotalHarga(500000);
      setNominalDp(375000);
    }
    setStep('fill_form');
  };

  // Apparel Handlers
  const handleSizeChange = (key: keyof SizeBreakdown, val: number) => {
    const nextVal = Math.max(0, val);
    const newSizes: SizeBreakdown = { ...sizes, [key]: nextVal };
    setSizes(newSizes);
    const nextTotal = Object.values(newSizes).reduce((acc: number, v) => acc + (Number(v) || 0), 0);
    const unitPrice = jenisCetakApparel === 'DTF' ? 75000 : jenisCetakApparel === 'Manual' ? 80000 : 90000;
    const newTotal = nextTotal * unitPrice;
    setTotalHarga(newTotal);
    setNominalDp(Math.round(newTotal * 0.75));
  };

  const handleAddPresetQuantity = (amount: number) => {
    const newSizes: SizeBreakdown = {
      ...sizes,
      M: (sizes.M || 0) + Math.floor(amount / 2),
      L: (sizes.L || 0) + Math.ceil(amount / 2),
    };
    setSizes(newSizes);
    const nextTotal = Object.values(newSizes).reduce((acc: number, v) => acc + (Number(v) || 0), 0);
    const unitPrice = jenisCetakApparel === 'DTF' ? 75000 : jenisCetakApparel === 'Manual' ? 80000 : 90000;
    const newTotal = nextTotal * unitPrice;
    setTotalHarga(newTotal);
    setNominalDp(Math.round(newTotal * 0.75));
  };

  const handleApparelPrintTypeChange = (type: PrintType) => {
    setJenisCetakApparel(type);
    const unitPrice = type === 'DTF' ? 75000 : type === 'Manual' ? 80000 : 90000;
    const newTotal = totalApparelPcs * unitPrice;
    setTotalHarga(newTotal);
    setNominalDp(Math.round(newTotal * 0.75));
  };

  // Grafis Handlers
  const handleGrafisQuantityOrPriceChange = (qty: number, pricePerUnit: number) => {
    const cleanQty = Math.max(1, qty);
    const cleanPrice = Math.max(0, pricePerUnit);
    setJumlahGrafis(cleanQty);
    setHargaSatuanGrafis(cleanPrice);
    const newTotal = cleanQty * cleanPrice;
    setTotalHarga(newTotal);
    setNominalDp(Math.round(newTotal * 0.75));
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const dpPercentage = totalHarga > 0 ? Math.round((nominalDp / totalHarga) * 100) : 0;
  const isDpValidForCommit = totalHarga > 0 && dpPercentage >= 70;

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!namaKlien.trim()) {
      setError('Nama klien atau brand pemesan wajib diisi!');
      return;
    }

    if (selectedCategory === 'apparel' && totalApparelPcs <= 0) {
      setError('Jumlah apparel (pcs) minimal 1 pcs!');
      return;
    }

    if (selectedCategory === 'grafis' && jumlahGrafis <= 0) {
      setError('Jumlah cetakan grafis minimal 1!');
      return;
    }

    if (selectedCategory === 'lainnya') {
      if (!namaItemCustom.trim()) {
        setError('Nama item atau nama proyek custom wajib diisi!');
        return;
      }
      if (jumlahCustom <= 0) {
        setError('Jumlah custom order minimal 1!');
        return;
      }
    }

    if (totalHarga <= 0) {
      setError('Total harga harus lebih besar dari Rp 0!');
      return;
    }

    setLoading(true);
    try {
      let orderPayload: Parameters<typeof createOrder>[0];

      if (selectedCategory === 'apparel') {
        const consolidatedSizes: SizeBreakdown = {
          S: 0,
          M: 0,
          L: 0,
          XL: 0,
          '2XL': 0,
          '3XL': 0,
          '4XL': 0,
          XXL: 0,
        };
        apparelDesigns.forEach((d) => {
          d.items.forEach((it) => {
            consolidatedSizes.S = (consolidatedSizes.S || 0) + (it.sizes.S || 0);
            consolidatedSizes.M = (consolidatedSizes.M || 0) + (it.sizes.M || 0);
            consolidatedSizes.L = (consolidatedSizes.L || 0) + (it.sizes.L || 0);
            consolidatedSizes.XL = (consolidatedSizes.XL || 0) + (it.sizes.XL || 0);
            consolidatedSizes['2XL'] = (consolidatedSizes['2XL'] || 0) + (it.sizes['2XL'] || 0);
            consolidatedSizes['3XL'] = (consolidatedSizes['3XL'] || 0) + (it.sizes['3XL'] || 0);
            consolidatedSizes['4XL'] = (consolidatedSizes['4XL'] || 0) + (it.sizes['4XL'] || 0);
          });
        });
        consolidatedSizes.XXL = consolidatedSizes['2XL'];

        const itemDescriptions = apparelDesigns
          .flatMap((d) => d.items.map((it) => it.jenis_pesanan.trim()))
          .filter(Boolean);
        const uniqueItems = Array.from(new Set(itemDescriptions));
        const bahanApparelSummary = uniqueItems.length > 0 ? uniqueItems.join(', ') : 'Kaos Custom Apparel';

        const allSablons = apparelDesigns.flatMap((d) =>
          d.items.flatMap((it) => it.sablon_list.map((s) => s.nama))
        );
        const uniqueSablons = Array.from(new Set(allSablons));
        const posisiCetakSummary = uniqueSablons.length > 0 ? uniqueSablons.join(' + ') : 'DTF Sablon';

        orderPayload = {
          kategori_projek: 'apparel',
          nama_klien: namaKlien.trim(),
          ...(noTelepon.trim() ? { no_telepon: noTelepon.trim() } : {}),
          ...(emailKlien.trim() ? { email_klien: emailKlien.trim() } : {}),
          ...(alamatKirim.trim() ? { alamat_kirim: alamatKirim.trim() } : {}),
          invoice_no: invoiceNo.trim() || generateRandomInvoiceNumber(),
          invoice_date: invoiceDate,
          jenis_cetak: jenisCetakApparel,
          bahan_apparel: bahanApparelSummary,
          warna_bahan: `${apparelDesigns.length} Desain`,
          jumlah_pcs: totalApparelPcs,
          rincian_ukuran: consolidatedSizes,
          posisi_cetak: posisiCetakSummary,
          total_harga: totalHarga,
          nominal_dp: nominalDp,
          status: 'Menunggu Pembayaran',
          deadline,
          ...(catatan.trim() ? { catatan: catatan.trim() } : {}),
          apparel_designs: apparelDesigns,
        };
      } else if (selectedCategory === 'grafis') {
        orderPayload = {
          kategori_projek: 'grafis',
          nama_klien: namaKlien.trim(),
          ...(noTelepon.trim() ? { no_telepon: noTelepon.trim() } : {}),
          ...(emailKlien.trim() ? { email_klien: emailKlien.trim() } : {}),
          ...(alamatKirim.trim() ? { alamat_kirim: alamatKirim.trim() } : {}),
          invoice_no: invoiceNo.trim() || generateRandomInvoiceNumber(),
          invoice_date: invoiceDate,
          jenis_cetak: jenisCetakGrafis,
          tipe_grafis: tipeGrafis,
          bahan_cetak: bahanCetak,
          dimensi_ukuran: dimensiUkuran,
          finishing: finishingGrafis,
          satuan_grafis: satuanGrafis,
          bahan_apparel: `${tipeGrafis} (${bahanCetak})`,
          warna_bahan: finishingGrafis,
          jumlah_pcs: jumlahGrafis,
          posisi_cetak: `Ukuran: ${dimensiUkuran} | Finishing: ${finishingGrafis}`,
          total_harga: totalHarga,
          nominal_dp: nominalDp,
          status: 'Menunggu Pembayaran',
          deadline,
          ...(catatan.trim() ? { catatan: catatan.trim() } : {}),
        };
      } else {
        // 'lainnya'
        orderPayload = {
          kategori_projek: 'lainnya',
          nama_klien: namaKlien.trim(),
          ...(noTelepon.trim() ? { no_telepon: noTelepon.trim() } : {}),
          ...(emailKlien.trim() ? { email_klien: emailKlien.trim() } : {}),
          ...(alamatKirim.trim() ? { alamat_kirim: alamatKirim.trim() } : {}),
          invoice_no: invoiceNo.trim() || generateRandomInvoiceNumber(),
          invoice_date: invoiceDate,
          jenis_cetak: 'Custom Order',
          nama_item_custom: namaItemCustom.trim(),
          satuan_custom: satuanCustom,
          ...(deskripsiCustom.trim() ? { deskripsi_custom: deskripsiCustom.trim() } : {}),
          bahan_apparel: namaItemCustom.trim(),
          warna_bahan: satuanCustom,
          jumlah_pcs: jumlahCustom,
          ...(deskripsiCustom.trim() ? { posisi_cetak: `Spek: ${deskripsiCustom.trim()}` } : {}),
          total_harga: totalHarga,
          nominal_dp: nominalDp,
          status: 'Menunggu Pembayaran',
          deadline,
          ...(catatan.trim() ? { catatan: catatan.trim() } : {}),
        };
      }

      const orderId = await createOrder(orderPayload, userProfile?.nama || 'Admin');

      setLoading(false);
      const catLabel =
        selectedCategory === 'apparel'
          ? 'Apparel'
          : selectedCategory === 'grafis'
          ? 'Grafis & Cetakan'
          : 'Custom Order Bebas';

      success(
        'Pesanan Berhasil Dibuat!',
        `Order [${catLabel}] untuk ${namaKlien} telah disimpan dengan DP ${dpPercentage}%.`
      );

      try {
        confetti({
          particleCount: 55,
          spread: 65,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      onSuccess?.(orderId);
      onClose();
    } catch (err: any) {
      console.error('Error creating order:', err);
      const errMsg = err?.message || 'Gagal menyimpan pesanan. Periksa koneksi database.';
      setError(errMsg);
      toastError('Gagal Menyimpan Pesanan', errMsg);
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="new-order-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            id="new-order-modal-container"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className={`bg-white rounded-3xl sm:rounded-[32px] w-full ${
              step === 'select_category'
                ? 'max-w-xl'
                : selectedCategory === 'apparel'
                ? 'max-w-5xl'
                : 'max-w-lg lg:max-w-3xl'
            } p-5 sm:p-6 shadow-2xl text-slate-800 my-auto max-h-[92vh] flex flex-col transition-all duration-300`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                {step === 'fill_form' ? (
                  <button
                    type="button"
                    onClick={() => setStep('select_category')}
                    className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                    title="Kembali ke Pilih Projek"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#E63946] flex items-center justify-center font-bold">
                    <Plus className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold font-['Outfit'] text-slate-900 leading-tight">
                    {step === 'select_category'
                      ? 'Pilih Kategori Projek Pesanan'
                      : selectedCategory === 'apparel'
                      ? 'Tambah Pesanan Apparel & Baju'
                      : selectedCategory === 'grafis'
                      ? 'Tambah Pesanan Cetak Grafis'
                      : 'Tambah Order Bebas / Custom Harga'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {step === 'select_category'
                      ? 'Tentukan jenis projek sebelum masuk ke rincian invoice & kalkulasi DP'
                      : `Form rincian spesifikasi, data klien & validasi DP`}
                  </p>
                </div>
              </div>
              <button
                id="close-new-order-modal-btn"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 1: PILIH KATEGORI PROJEK (Apparel, Grafis, Lainnya) */}
            {/* ========================================================================= */}
            {step === 'select_category' && (
              <div className="mt-5 space-y-4 overflow-y-auto pr-1">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Silakan Pilih Kategori Pekerjaan:
                </p>

                <div className="grid grid-cols-1 gap-3.5">
                  {/* Option 1: Apparel */}
                  <button
                    type="button"
                    onClick={() => handleSelectCategory('apparel')}
                    className="group relative text-left bg-gradient-to-r from-red-50/50 to-orange-50/40 hover:from-red-100/60 hover:to-orange-100/60 border-2 border-red-100 hover:border-[#E63946] rounded-3xl p-4 sm:p-5 transition-all shadow-2xs hover:shadow-md cursor-pointer active:scale-[0.99] flex items-start gap-4"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#E63946] text-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/20 group-hover:scale-105 transition-transform">
                      <Shirt className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 text-base font-['Outfit'] group-hover:text-[#E63946] transition-colors">
                          1. Apparel & Baju
                        </h3>
                        <span className="text-[10px] font-bold bg-[#E63946]/10 text-[#E63946] px-2.5 py-0.5 rounded-full border border-red-200">
                          DTF / Sablon / Kaos
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Segala kebutuhan pakaian: Kaos Combed, Hoodie Fleece, Polo Pique, Jersey Sublim, dengan
                        rincian ukuran (S, M, L, XL, XXL) dan kalkulasi biaya sablon DTF/Manual.
                      </p>
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-[#E63946]">
                        <span>Pilih Apparel</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Grafis */}
                  <button
                    type="button"
                    onClick={() => handleSelectCategory('grafis')}
                    className="group relative text-left bg-gradient-to-r from-blue-50/50 to-indigo-50/40 hover:from-blue-100/60 hover:to-indigo-100/60 border-2 border-blue-100 hover:border-blue-500 rounded-3xl p-4 sm:p-5 transition-all shadow-2xs hover:shadow-md cursor-pointer active:scale-[0.99] flex items-start gap-4"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                      <Printer className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 text-base font-['Outfit'] group-hover:text-blue-600 transition-colors">
                          2. Grafis & Percetakan
                        </h3>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                          Digital & Outdoor Print
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Segala kebutuhan cetakan: Spanduk/Banner Flexi Korea/China, Stiker Label Kemasan Vinyl/Kromo,
                        Brosur/Flyer Art Paper, Kartu Nama, Poster, Sertifikat & Merchandise Cetak.
                      </p>
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-blue-600">
                        <span>Pilih Grafis & Percetakan</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>

                  {/* Option 3: Lainnya / Order Bebas */}
                  <button
                    type="button"
                    onClick={() => handleSelectCategory('lainnya')}
                    className="group relative text-left bg-gradient-to-r from-purple-50/50 to-pink-50/40 hover:from-purple-100/60 hover:to-pink-100/60 border-2 border-purple-100 hover:border-purple-500 rounded-3xl p-4 sm:p-5 transition-all shadow-2xs hover:shadow-md cursor-pointer active:scale-[0.99] flex items-start gap-4"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 text-base font-['Outfit'] group-hover:text-purple-600 transition-colors">
                          3. Lainnya (Order Bebas & Custom Harga)
                        </h3>
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200">
                          Bebas & Custom Pricing
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Pesanan fleksibel di luar apparel & grafis standar: Jasa Desain Grafis, Branding, Sewa Alat,
                        Totebag/Souvenir Event Khusus, dengan spesifikasi bebas & penentuan harga custom tersendiri.
                      </p>
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-purple-600">
                        <span>Pilih Order Bebas & Custom</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 2: FORM INPUT SESUAI KATEGORI (Apparel / Grafis / Lainnya) */}
            {/* ========================================================================= */}
            {step === 'fill_form' && (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Active Category Banner Indicator */}
                <div className="flex items-center justify-between bg-[#F8F5F2] px-3.5 py-2 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-semibold">Kategori Projek:</span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                        selectedCategory === 'apparel'
                          ? 'bg-red-50 text-[#E63946] border-red-200'
                          : selectedCategory === 'grafis'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {selectedCategory === 'apparel' && <Shirt className="w-3.5 h-3.5" />}
                      {selectedCategory === 'grafis' && <Printer className="w-3.5 h-3.5" />}
                      {selectedCategory === 'lainnya' && <Sparkles className="w-3.5 h-3.5" />}
                      {selectedCategory === 'apparel'
                        ? 'Apparel & Pakaian'
                        : selectedCategory === 'grafis'
                        ? 'Cetak Grafis & Percetakan'
                        : 'Lainnya (Order Bebas / Custom)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('select_category')}
                    className="text-xs font-bold text-[#E63946] hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <span>Ganti</span>
                  </button>
                </div>

                {selectedCategory === 'apparel' ? (
                  <div className="space-y-5">
                    <ApparelOrderForm
                      namaKlien={namaKlien}
                      setNamaKlien={setNamaKlien}
                      noTelepon={noTelepon}
                      setNoTelepon={setNoTelepon}
                      alamatKirim={alamatKirim}
                      setAlamatKirim={setAlamatKirim}
                      invoiceNo={invoiceNo}
                      setInvoiceNo={setInvoiceNo}
                      onRegenerateInvoiceNo={() => setInvoiceNo(generateRandomInvoiceNumber())}
                      invoiceDate={invoiceDate}
                      setInvoiceDate={setInvoiceDate}
                      dueDate={deadline}
                      setDueDate={setDeadline}
                      catatan={catatan}
                      setCatatan={setCatatan}
                      designs={apparelDesigns}
                      setDesigns={setApparelDesigns}
                    />

                    {/* Ringkasan Total & Validasi DP Realtime */}
                    <div className="bg-[#F8F5F2] p-4 sm:p-5 rounded-2xl border border-red-100/80 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#E63946]" /> Ringkasan Total & Validasi DP (Min 70%)
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Rumus kalkulasi: (Harga Satuan + Harga Sablon) × Total Baju (pcs)
                          </p>
                        </div>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                            isDpValidForCommit
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : 'bg-amber-100 text-amber-700 border border-amber-300'
                          }`}
                        >
                          DP: {dpPercentage}% {isDpValidForCommit ? '✓ Memenuhi Syarat' : '⚠ Kurang dari 70%'}
                        </span>
                      </div>

                      {/* DP Progress Bar */}
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, dpPercentage)}%` }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          className={`h-full ${isDpValidForCommit ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        />
                      </div>

                      {/* Financial Inputs & Realtime Displays */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                            Total Kuantiti Baju
                          </span>
                          <span className="text-lg font-black text-slate-900 font-['Outfit']">
                            {totalApparelPcs} <span className="text-xs font-bold text-slate-500">Pcs</span>
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                            Total Tagihan Keseluruhan
                          </span>
                          <span className="text-lg font-black text-[#E63946] font-['Outfit']">
                            {formatRupiah(totalHarga)}
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Nominal DP (Rp)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">Rp</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={nominalDp === 0 ? '' : nominalDp}
                              onChange={(e) => setNominalDp(e.target.value === '' ? 0 : Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1 text-sm font-bold text-emerald-700 focus:outline-none focus:border-[#E63946]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Quick Buttons & Sisa Pelunasan */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold">Set DP Cepat:</span>
                          {[70, 75, 80, 100].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setNominalDp(Math.round((totalHarga * pct) / 100))}
                              className="text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 transition-colors cursor-pointer"
                            >
                              {pct === 100 ? 'Lunas (100%)' : `${pct}%`}
                            </button>
                          ))}
                        </div>

                        <div className="text-right text-xs">
                          <span className="text-slate-500 mr-1.5">Sisa Pelunasan:</span>
                          <strong className="text-slate-900 font-bold">
                            {formatRupiah(Math.max(0, totalHarga - nominalDp))}
                          </strong>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setStep('select_category')}
                          className="py-2.5 px-4 rounded-full border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Pilih Ulang Kategori</span>
                        </button>

                        <button
                          type="submit"
                          disabled={loading || totalApparelPcs <= 0}
                          className="py-2.5 px-6 rounded-full bg-[#E63946] hover:bg-red-600 active:scale-98 text-white font-bold text-xs shadow-md shadow-red-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                        >
                          {loading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span>Simpan Pesanan & Buat Invoice #{invoiceNo}</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column: Data Klien & Spesifikasi Teknis */}
                  <div className="space-y-4">
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
                            placeholder="Contoh: Kedai Kopi Makmur, Barbershop, HMJ"
                            value={namaKlien}
                            onChange={(e) => setNamaKlien(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#E63946] transition-colors"
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
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#E63946] transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Deadline Kirim *</label>
                            <input
                              type="date"
                              required
                              value={deadline}
                              onChange={(e) => setDeadline(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#E63946] transition-colors"
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
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#E63946] transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    {/* ================================================================= */}
                    {/* SECTION 2A: KHUSUS APPAREL */}
                    {/* ================================================================= */}
                    {selectedCategory === 'apparel' && (
                      <div className="bg-[#F8F5F2] p-3.5 rounded-2xl space-y-3">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#E63946]" /> 2. Spesifikasi Cetak & Bahan Apparel
                        </p>

                        {/* Print Type Selector */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Teknik Cetak</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['DTF', 'Manual', 'Digital'] as PrintType[]).map((type) => {
                              const isSelected = jenisCetakApparel === type;
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => handleApparelPrintTypeChange(type)}
                                  className={`py-2 px-2 text-center rounded-xl font-bold text-xs transition-all border cursor-pointer active:scale-95 ${
                                    isSelected
                                      ? 'bg-[#E63946] text-white border-[#E63946] shadow-xs'
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-red-200'
                                  }`}
                                >
                                  {type === 'DTF' ? 'DTF Film' : type === 'Manual' ? 'Sablon' : 'Digital'}
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
                            <Palette className="w-3 h-3 text-slate-500" /> Warna Kain Kaos / Pakaian
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
                      </div>
                    )}

                    {/* ================================================================= */}
                    {/* SECTION 2B: KHUSUS GRAFIS & PERCETAKAN */}
                    {/* ================================================================= */}
                    {selectedCategory === 'grafis' && (
                      <div className="bg-[#F8F5F2] p-3.5 rounded-2xl space-y-3">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Printer className="w-3.5 h-3.5 text-blue-600" /> 2. Spesifikasi Cetakan Grafis
                        </p>

                        {/* Tipe Produk Grafis */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Jenis Produk Cetak</label>
                          <select
                            value={tipeGrafis}
                            onChange={(e) => setTipeGrafis(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                          >
                            {GRAFIS_PRODUCT_PRESETS.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Bahan Cetak */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Bahan / Media Cetak Grafis
                          </label>
                          <select
                            value={bahanCetak}
                            onChange={(e) => setBahanCetak(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                          >
                            {GRAFIS_MATERIAL_PRESETS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Finishing Cetak */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                            <Scissors className="w-3 h-3 text-slate-500" /> Finishing Cetak
                          </label>
                          <select
                            value={finishingGrafis}
                            onChange={(e) => setFinishingGrafis(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                          >
                            {GRAFIS_FINISHING_PRESETS.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Mesin / Jenis Cetak */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Teknologi Cetak Mesin</label>
                          <select
                            value={jenisCetakGrafis}
                            onChange={(e) => setJenisCetakGrafis(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                          >
                            {GRAFIS_TECH_PRESETS.map((tech) => (
                              <option key={tech} value={tech}>
                                {tech}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* ================================================================= */}
                    {/* SECTION 2C: KHUSUS LAINNYA / ORDER BEBAS */}
                    {/* ================================================================= */}
                    {selectedCategory === 'lainnya' && (
                      <div className="bg-[#F8F5F2] p-3.5 rounded-2xl space-y-3">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" /> 2. Rincian Item Bebas / Custom
                        </p>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Nama Item / Layanan Custom *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Jasa Desain Maskot, Paket Souvenir Event, dll"
                            value={namaItemCustom}
                            onChange={(e) => setNamaItemCustom(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-purple-500 transition-colors"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Satuan Custom</label>
                            <select
                              value={satuanCustom}
                              onChange={(e) => setSatuanCustom(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-purple-500"
                            >
                              {LAINNYA_SATUAN_PRESETS.map((sat) => (
                                <option key={sat} value={sat}>
                                  {sat}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Kuantitas / Jumlah *</label>
                            <input
                              type="number"
                              min="1"
                              value={jumlahCustom}
                              onChange={(e) => setJumlahCustom(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Spesifikasi & Rincian Bebas
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Tuliskan spesifikasi bebas, kesepakatan material, atau rincian item custom di sini..."
                            value={deskripsiCustom}
                            onChange={(e) => setDeskripsiCustom(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Volume, Pricing & DP 70% Calculation */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* ============================================================= */}
                      {/* SECTION 3A: VOLUME & UKURAN APPAREL */}
                      {/* ============================================================= */}
                      {selectedCategory === 'apparel' && (
                        <div className="bg-[#F8F5F2] p-3.5 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              3. Rincian Ukuran & Jumlah
                            </label>
                            <span className="text-xs font-bold text-[#E63946] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">
                              Total: {totalApparelPcs} Pcs
                            </span>
                          </div>

                          <div className="grid grid-cols-5 gap-1.5">
                            {(['S', 'M', 'L', 'XL', 'XXL'] as (keyof SizeBreakdown)[]).map((sz) => (
                              <div
                                key={sz}
                                className="bg-white p-1.5 rounded-xl border border-slate-200 text-center shadow-2xs"
                              >
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

                          {/* Quick preset buttons */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-slate-400 font-bold">Quick +:</span>
                            {[5, 12, 24, 50].map((qty) => (
                              <button
                                key={qty}
                                type="button"
                                onClick={() => handleAddPresetQuantity(qty)}
                                className="text-[10px] font-bold bg-white hover:bg-red-50 hover:text-[#E63946] hover:border-red-200 border border-slate-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                              >
                                +{qty} pcs
                              </button>
                            ))}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Posisi Desain Sablon</label>
                            <input
                              type="text"
                              placeholder="Contoh: Dada Depan Logo + Punggung Full A3"
                              value={posisiCetak}
                              onChange={(e) => setPosisiCetak(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-[#E63946] transition-colors"
                            />
                          </div>
                        </div>
                      )}

                      {/* ============================================================= */}
                      {/* SECTION 3B: VOLUME & DIMENSI GRAFIS */}
                      {/* ============================================================= */}
                      {selectedCategory === 'grafis' && (
                        <div className="bg-[#F8F5F2] p-3.5 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              3. Dimensi & Kuantitas Cetak
                            </label>
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                              {jumlahGrafis} {satuanGrafis}
                            </span>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Dimensi Ukuran Cetak
                            </label>
                            <input
                              type="text"
                              placeholder="Contoh: 3 x 1 Meter, A3+ (32 x 48 cm), Diameter 5 cm"
                              value={dimensiUkuran}
                              onChange={(e) => setDimensiUkuran(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Satuan Cetak</label>
                              <select
                                value={satuanGrafis}
                                onChange={(e) => setSatuanGrafis(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                              >
                                {GRAFIS_UNIT_PRESETS.map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Volume / Jumlah</label>
                              <input
                                type="number"
                                min="1"
                                value={jumlahGrafis}
                                onChange={(e) =>
                                  handleGrafisQuantityOrPriceChange(
                                    parseInt(e.target.value) || 1,
                                    hargaSatuanGrafis
                                  )
                                }
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Estimasi Harga per {satuanGrafis} (Rp)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={hargaSatuanGrafis}
                              onChange={(e) =>
                                handleGrafisQuantityOrPriceChange(
                                  jumlahGrafis,
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* ============================================================= */}
                      {/* SECTION 4: KALKULASI BIAYA & VALIDASI DP 70% */}
                      {/* ============================================================= */}
                      <div className="bg-[#F8F5F2] p-3.5 rounded-2xl space-y-3 border border-red-100/80">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#E63946]" /> 4. Kalkulasi Biaya & DP (Min 70%)
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-colors ${
                              isDpValidForCommit
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-amber-100 text-amber-700 border border-amber-300'
                            }`}
                          >
                            DP: {dpPercentage}% {isDpValidForCommit ? '✓ Memenuhi Syarat' : '⚠ Kurang dari 70%'}
                          </span>
                        </div>

                        {/* DP Progress Bar */}
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, dpPercentage)}%` }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className={`h-full ${isDpValidForCommit ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              {selectedCategory === 'lainnya' ? 'Total Harga Custom (Rp)' : 'Total Tagihan (Rp)'}
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={totalHarga}
                              onChange={(e) => setTotalHarga(Number(e.target.value))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#E63946]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Nominal DP (Rp)</label>
                            <input
                              type="number"
                              min="0"
                              value={nominalDp}
                              onChange={(e) => setNominalDp(Number(e.target.value))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-emerald-700 focus:outline-none focus:border-[#E63946]"
                            />
                          </div>
                        </div>

                        {/* Quick DP calculation buttons */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="text-[10px] text-slate-400 font-bold">Set DP:</span>
                          {[70, 75, 80, 100].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setNominalDp(Math.round((totalHarga * pct) / 100))}
                              className="text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg text-slate-700 transition-colors cursor-pointer"
                            >
                              {pct === 100 ? 'Lunas (100%)' : `${pct}%`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Catatan Khusus */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan Tambahan</label>
                        <textarea
                          rows={2}
                          placeholder="Instruksi packing, vendor cetak eksternal, instruksi desain, dll"
                          value={catatan}
                          onChange={(e) => setCatatan(e.target.value)}
                          className="w-full bg-[#F8F5F2] border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
                        />
                      </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="pt-3 border-t border-slate-100 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStep('select_category')}
                        className="py-2.5 px-4 rounded-full border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Pilih Ulang</span>
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-2.5 px-4 rounded-full bg-[#E63946] hover:bg-red-600 active:scale-98 text-white font-bold text-xs shadow-md shadow-red-500/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>Simpan & Buat Pesanan</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                )}
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
