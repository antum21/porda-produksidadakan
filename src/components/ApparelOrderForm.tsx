import React, { useRef, useState, useEffect } from 'react';
import { ApparelDesignCard, ApparelOrderItemRow } from '../types';
import { uploadOrderDesignImage, validateImageFile, deleteStorageFile } from '../services/storageService';
import { extractImageFromClipboardEvent, readImageFromSystemClipboard } from '../utils/clipboardHelper';
import { compressImageFile } from '../utils/imageCompressor';
import { useToast } from '../context/ToastContext';
import {
  getSizeExtraCharge,
  calculateEffectiveSablonPrice,
  calculateApparelItemSubtotal,
  calculateUnitPriceForSize,
} from '../utils/pricing';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Plus,
  RefreshCw,
  Calendar,
  Phone,
  User,
  MapPin,
  Tag,
  Percent,
  Shirt,
  X,
  Sparkles,
  Loader2,
  ClipboardPaste,
  Check,
  Command,
} from 'lucide-react';

export const SABLON_PRESETS: { id: string; nama: string; harga: number }[] = [
  { id: 'nama', nama: 'Nama 5k', harga: 5000 },
  { id: 'logo', nama: 'Logo 8k', harga: 8000 },
  { id: 'a5', nama: 'A5 12k', harga: 12000 },
  { id: 'a4', nama: 'A4 20k', harga: 20000 },
  { id: 'a3', nama: 'A3 30k', harga: 30000 },
];

export const createDefaultItemRow = (): ApparelOrderItemRow => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${Math.random().toString(36).slice(2, 6)}`,
  jenis_pesanan: '',
  harga_satuan: 0,
  sizes: {
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    '2XL': 0,
    '3XL': 0,
    '4XL': 0,
  },
  sablon_list: [],
  diskon_sablon: 0,
});

export const createDefaultDesignCard = (index: number): ApparelDesignCard => ({
  id: `desain-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${Math.random().toString(36).slice(2, 6)}`,
  nama_desain: '',
  gambar_preview: '',
  file_name: '',
  items: [createDefaultItemRow()],
});

interface ApparelOrderFormProps {
  namaKlien: string;
  setNamaKlien: (v: string) => void;
  noTelepon: string;
  setNoTelepon: (v: string) => void;
  alamatKirim: string;
  setAlamatKirim: (v: string) => void;
  invoiceNo: string;
  setInvoiceNo: (v: string) => void;
  onRegenerateInvoiceNo: () => void;
  invoiceDate: string;
  setInvoiceDate: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  catatan: string;
  setCatatan: (v: string) => void;
  designs: ApparelDesignCard[];
  setDesigns: React.Dispatch<React.SetStateAction<ApparelDesignCard[]>>;
}

export const ApparelOrderForm: React.FC<ApparelOrderFormProps> = ({
  namaKlien,
  setNamaKlien,
  noTelepon,
  setNoTelepon,
  alamatKirim,
  setAlamatKirim,
  invoiceNo,
  setInvoiceNo,
  onRegenerateInvoiceNo,
  invoiceDate,
  setInvoiceDate,
  dueDate,
  setDueDate,
  catatan,
  setCatatan,
  designs,
  setDesigns,
}) => {
  const { success: toastSuccess, error: toastError, info: toastInfo, warning: toastWarning } = useToast();
  // Temporary state for the sablon dropdown per item
  const [selectedSablonByItem, setSelectedSablonByItem] = useState<{ [itemId: string]: string }>({});
  // Uploading state per design card for non-blocking background sync
  const [uploadingDesignIds, setUploadingDesignIds] = useState<{ [designId: string]: boolean }>({});
  const [isPastingDesignId, setIsPastingDesignId] = useState<string | null>(null);
  const [activeDesignId, setActiveDesignId] = useState<string>(designs[0]?.id || '');
  const lastPasteTimeRef = useRef<number>(0);

  // Keep activeDesignId synced with existing designs
  useEffect(() => {
    if (!activeDesignId && designs.length > 0) {
      setActiveDesignId(designs[0].id);
    } else if (activeDesignId && !designs.some((d) => d.id === activeDesignId)) {
      setActiveDesignId(designs[0]?.id || '');
    }
  }, [designs, activeDesignId]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Add Design Card
  const handleAddDesign = () => {
    setDesigns((prev) => [...prev, createDefaultDesignCard(prev.length + 1)]);
  };

  // Remove Design Card
  const handleRemoveDesign = (designId: string) => {
    if (designs.length <= 1) return;
    setDesigns((prev) => prev.filter((d) => d.id !== designId));
  };

  // Handle Image Upload for a Design:
  // 1. Instant Optimistic Preview (< 20ms) using compressed base64 so image is immediately visible and safe to store
  // 2. Background async upload to Firebase Storage with status badge
  const handleImageFileChange = async (designId: string, file: File | null) => {
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toastError('Format/Ukuran Tidak Didukung', validation.error || 'Format atau ukuran file tidak didukung.');
      return;
    }

    // 1. INSTANT OPTIMISTIC PREVIEW
    // Produce an immediate, permanent base64 data URL (< 50KB) so the image is valid right away
    try {
      const instantBase64 = await compressImageFile(file, 800, 0.72);
      setDesigns((prev) =>
        prev.map((d) =>
          d.id === designId
            ? {
                ...d,
                gambar_preview: instantBase64,
                file_name: file.name || 'Pasted Image',
              }
            : d
        )
      );
    } catch {
      const instantLocalUrl = URL.createObjectURL(file);
      setDesigns((prev) =>
        prev.map((d) =>
          d.id === designId
            ? {
                ...d,
                gambar_preview: instantLocalUrl,
                file_name: file.name || 'Pasted Image',
              }
            : d
        )
      );
    }

    // 2. BACKGROUND ASYNC UPLOAD TO FIREBASE STORAGE (OR FALLBACK)
    setUploadingDesignIds((prev) => ({ ...prev, [designId]: true }));
    try {
      const uploadRes = await uploadOrderDesignImage('draft-order', file, 'Staff');
      setDesigns((prev) =>
        prev.map((d) =>
          d.id === designId
            ? {
                ...d,
                gambar_preview: uploadRes.downloadUrl,
                storage_path: uploadRes.storagePath || d.storage_path,
                file_name: uploadRes.fileName || d.file_name,
                file_size: uploadRes.fileSize || d.file_size,
                content_type: uploadRes.contentType || d.content_type,
                uploaded_at: uploadRes.uploadedAt,
              }
            : d
        )
      );
    } catch (err: any) {
      console.warn('Storage sync note:', err);
    } finally {
      setUploadingDesignIds((prev) => ({ ...prev, [designId]: false }));
      setIsPastingDesignId(null);
    }
  };

  // Dedicated Paste Handler for Dropzone Container
  const handleDropzonePaste = async (e: React.ClipboardEvent, designId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Debounce duplicate events
    if (Date.now() - lastPasteTimeRef.current < 400) return;
    lastPasteTimeRef.current = Date.now();

    const file = await extractImageFromClipboardEvent(e);
    if (file) {
      await handleImageFileChange(designId, file);
      toastSuccess('Gambar Ditempel!', 'Gambar dari clipboard langsung ditampilkan.');
    }
  };

  // Button click handler to read directly from system clipboard
  const handlePasteButtonClick = async (designId: string) => {
    setIsPastingDesignId(designId);
    try {
      const res = await readImageFromSystemClipboard();
      if (res.file) {
        await handleImageFileChange(designId, res.file);
        toastSuccess('Gambar Ditempel!', 'Gambar dari clipboard langsung ditampilkan.');
      } else {
        if (res.isPermissionDenied) {
          toastInfo(
            'Gunakan Shortcut Ctrl + V',
            'Izin akses clipboard browser dibatasi. Silakan tekan tombol keyboard Ctrl + V (atau Cmd + V) untuk menempelkan gambar.'
          );
        } else {
          toastWarning(
            'Clipboard Belum Ada Gambar',
            res.error || 'Salin gambar terlebih dahulu (Screenshot / Copy Image) lalu tekan Ctrl + V.'
          );
        }
      }
    } catch (err: any) {
      toastInfo('Gunakan Shortcut Ctrl + V', 'Tekan tombol Ctrl + V pada keyboard untuk menempelkan gambar secara instan.');
    } finally {
      setIsPastingDesignId(null);
    }
  };

  // Global window paste listener for instantaneous Ctrl+V anywhere in order form
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      // Check if clipboard contains an image file
      const file = await extractImageFromClipboardEvent(e);
      if (!file) {
        // Normal text paste, allow default browser behavior
        return;
      }

      // If clipboard HAS an image file, intercept paste even if an input was focused
      e.preventDefault();
      e.stopPropagation();

      // Debounce duplicate events
      if (Date.now() - lastPasteTimeRef.current < 400) return;
      lastPasteTimeRef.current = Date.now();

      const targetId = activeDesignId || designs[0]?.id;
      if (!targetId) return;

      await handleImageFileChange(targetId, file);
      toastSuccess('Gambar Ditempel!', 'Gambar dari clipboard langsung ditampilkan.');
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [activeDesignId, designs]);

  const handleRemoveImage = (designId: string) => {
    setDesigns((prev) =>
      prev.map((d) => {
        if (d.id === designId) {
          if (d.storage_path) {
            deleteStorageFile(d.storage_path).catch(() => {});
          }
          return {
            ...d,
            gambar_preview: '',
            storage_path: '',
            file_name: '',
          };
        }
        return d;
      })
    );
  };

  // Add Item Row to a Design Card
  const handleAddItemToDesign = (designId: string) => {
    setDesigns((prev) =>
      prev.map((d) => {
        if (d.id === designId) {
          return {
            ...d,
            items: [...d.items, createDefaultItemRow()],
          };
        }
        return d;
      })
    );
  };

  // Remove Item Row from a Design Card
  const handleRemoveItem = (designId: string, itemId: string) => {
    setDesigns((prev) =>
      prev.map((d) => {
        if (d.id === designId) {
          if (d.items.length <= 1) return d;
          return {
            ...d,
            items: d.items.filter((item) => item.id !== itemId),
          };
        }
        return d;
      })
    );
  };

  // Update Item field
  const handleUpdateItem = (
    designId: string,
    itemId: string,
    field: keyof ApparelOrderItemRow,
    value: any
  ) => {
    setDesigns((prev) =>
      prev.map((d) => {
        if (d.id === designId) {
          return {
            ...d,
            items: d.items.map((item) => {
              if (item.id === itemId) {
                return { ...item, [field]: value };
              }
              return item;
            }),
          };
        }
        return d;
      })
    );
  };

  // Update size in item
  const handleUpdateSize = (
    designId: string,
    itemId: string,
    sizeKey: 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL' | '4XL',
    val: number
  ) => {
    const cleanVal = Math.max(0, val || 0);
    setDesigns((prev) =>
      prev.map((d) => {
        if (d.id === designId) {
          return {
            ...d,
            items: d.items.map((item) => {
              if (item.id === itemId) {
                return {
                  ...item,
                  sizes: {
                    ...item.sizes,
                    [sizeKey]: cleanVal,
                  },
                };
              }
              return item;
            }),
          };
        }
        return d;
      })
    );
  };

  // Add Sablon to item
  const handleAddSablon = (designId: string, itemId: string) => {
    const presetId = selectedSablonByItem[itemId] || 'nama';
    const foundPreset = SABLON_PRESETS.find((p) => p.id === presetId) || SABLON_PRESETS[0];

    setDesigns((prev) =>
      prev.map((d) => {
        if (d.id === designId) {
          return {
            ...d,
            items: d.items.map((item) => {
              if (item.id === itemId) {
                return {
                  ...item,
                  sablon_list: [
                    ...item.sablon_list,
                    {
                      id: `${foundPreset.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      nama: foundPreset.nama,
                      harga: foundPreset.harga,
                    },
                  ],
                };
              }
              return item;
            }),
          };
        }
        return d;
      })
    );
  };

  // Remove a Sablon from item
  const handleRemoveSablon = (designId: string, itemId: string, sablonUniqueId: string) => {
    setDesigns((prev) =>
      prev.map((d) => {
        if (d.id === designId) {
          return {
            ...d,
            items: d.items.map((item) => {
              if (item.id === itemId) {
                return {
                  ...item,
                  sablon_list: item.sablon_list.filter((s) => s.id !== sablonUniqueId),
                };
              }
              return item;
            }),
          };
        }
        return d;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. DATA CUSTOMER & INVOICE DETAILS (Top Section matching Wireframe) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-[#E63946]" />
          Data Pelanggan & Informasi Faktur
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kolom Kiri: Data Klien */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Customer <span className="text-[#E63946]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Masukkan nama customer atau brand..."
                  value={namaKlien}
                  onChange={(e) => setNamaKlien(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946] focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                No. HP / WhatsApp
              </label>
              <input
                type="tel"
                placeholder="Contoh: 08123456789"
                value={noTelepon}
                onChange={(e) => setNoTelepon(e.target.value)}
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                Alamat Kirim
              </label>
              <textarea
                rows={2}
                placeholder="Alamat lengkap penerima / pengiriman..."
                value={alamatKirim}
                onChange={(e) => setAlamatKirim(e.target.value)}
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946] focus:bg-white transition-all resize-none"
              />
            </div>
          </div>

          {/* Kolom Kanan: Detail Faktur & Tanggal */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Invoice Number</label>
                <button
                  type="button"
                  onClick={onRegenerateInvoiceNo}
                  className="text-[11px] font-bold text-[#E63946] hover:underline flex items-center gap-1 cursor-pointer"
                  title="Generate Angka Random Baru"
                >
                  <RefreshCw className="w-3 h-3" />
                  Acak Ulang
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full font-mono font-bold bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E63946]"
                  placeholder="(Random Number)"
                />
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-2 rounded-xl border border-slate-200 shrink-0">
                  Otomatis
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946] focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#E63946]" />
                  Due Date (Deadline)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946] focus:bg-white transition-all font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Produksi / Finishing (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Packing polybag per pcs, hangtag dipasang..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946] focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. TOMBOL TAMBAH DESAIN (Top Action) */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 font-['Outfit'] flex items-center gap-2">
            <Shirt className="w-4 h-4 text-[#E63946]" />
            Daftar Desain & Rincian Pesanan
          </h2>
          <p className="text-[11px] text-slate-500">
            Setiap desain dapat memuat gambar artwork serta beberapa variasi item pakaian dan ukuran sablon.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddDesign}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah Desain
        </button>
      </div>

      {/* 3. CARD-CARD DESAIN (Sesuai Konsep Wireframe) */}
      <div className="space-y-6">
        {designs.map((design, dIdx) => (
          <div
            key={design.id ? `${design.id}-${dIdx}` : `desain-${dIdx}`}
            className="bg-white border-2 border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs relative transition-all"
          >
            {/* Header Card Desain */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="bg-[#E63946] text-white text-[11px] font-black px-2.5 py-0.5 rounded-lg">
                  Desain #{dIdx + 1}
                </span>
                <input
                  type="text"
                  value={design.nama_desain}
                  onChange={(e) =>
                    setDesigns((prev) =>
                      prev.map((d) => (d.id === design.id ? { ...d, nama_desain: e.target.value } : d))
                    )
                  }
                  className="text-xs font-bold text-slate-800 border-b border-dashed border-slate-300 focus:border-[#E63946] focus:outline-none px-1 py-0.5"
                  placeholder={`Desain #${dIdx + 1}`}
                />
              </div>

              {designs.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveDesign(design.id)}
                  className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  title="Hapus Desain ini"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Layout 2 Kolom: Sisi Kiri (Upload) & Sisi Kanan (Form List Ukuran) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* SISI KIRI: Upload & Paste File Gambar */}
              <div
                tabIndex={0}
                onFocus={() => setActiveDesignId(design.id)}
                onClick={() => setActiveDesignId(design.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleImageFileChange(design.id, file);
                }}
                onPaste={(e) => handleDropzonePaste(e, design.id)}
                className={`lg:col-span-4 rounded-2xl p-4 text-center flex flex-col items-center justify-center min-h-[270px] relative overflow-hidden transition-all outline-none ${
                  activeDesignId === design.id
                    ? 'bg-red-50/30 border-2 border-dashed border-[#E63946] shadow-sm ring-2 ring-red-100'
                    : 'bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#E63946]'
                }`}
              >
                {design.gambar_preview ? (
                  <div className="w-full flex flex-col items-center">
                    <div className="relative w-full max-h-[220px] overflow-hidden rounded-xl bg-white border border-slate-200 shadow-xs mb-2 group">
                      <img
                        src={design.gambar_preview}
                        alt="Preview Desain"
                        className="w-full h-auto max-h-[220px] object-contain mx-auto"
                      />

                      {/* Cloud Sync Status Indicator */}
                      {uploadingDesignIds[design.id] ? (
                        <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          <span>Menyimpan ke Cloud...</span>
                        </div>
                      ) : design.storage_path ? (
                        <div className="absolute top-2 left-2 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Check className="w-2.5 h-2.5" />
                          <span>Tersimpan di Cloud</span>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleRemoveImage(design.id)}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-md transition-all cursor-pointer"
                        title="Hapus gambar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-[11px] font-medium text-slate-600 truncate max-w-[220px] mb-2.5">
                      {design.file_name || 'Artwork Desain'}
                    </span>

                    {/* Action buttons for existing image */}
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer text-[11px] font-bold text-slate-700 hover:text-[#E63946] bg-white border border-slate-200 hover:border-red-200 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1 active:scale-95">
                        <Upload className="w-3 h-3 text-[#E63946]" />
                        <span>Ganti File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileChange(design.id, e.target.files?.[0] || null)}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => handlePasteButtonClick(design.id)}
                        className="cursor-pointer text-[11px] font-bold text-slate-700 hover:text-[#E63946] bg-white border border-slate-200 hover:border-red-200 px-2.5 py-1.5 rounded-xl shadow-2xs transition-all flex items-center gap-1 active:scale-95"
                        title="Tempel gambar baru dari clipboard (Ctrl+V)"
                      >
                        <ClipboardPaste className="w-3 h-3 text-[#E63946]" />
                        <span>Paste Baru</span>
                      </button>
                    </div>

                    <p className="text-[9px] text-slate-400 mt-2 flex items-center gap-1">
                      <span>Bisa langsung tekan</span>
                      <kbd className="px-1 py-0.2 bg-slate-200 text-slate-700 rounded font-mono font-bold">
                        Ctrl+V
                      </kbd>
                      <span>untuk menimpa</span>
                    </p>
                  </div>
                ) : isPastingDesignId === design.id ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="w-7 h-7 text-[#E63946] animate-spin mb-2" />
                    <p className="text-xs font-bold text-slate-800">Membaca Clipboard...</p>
                    <p className="text-[10px] text-slate-500">Menyiapkan gambar desain</p>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center py-4 px-2">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-400 group-hover:text-[#E63946] group-hover:border-red-200 transition-all mb-2.5 relative">
                      <Upload className="w-5 h-5 text-slate-500" />
                      <div className="absolute -bottom-1 -right-1 bg-red-50 border border-red-200 text-[#E63946] rounded-md p-0.5 shadow-2xs">
                        <ClipboardPaste className="w-3 h-3" />
                      </div>
                    </div>

                    <p className="text-xs font-bold text-slate-800 mb-0.5">
                      Unggah / Tempel Gambar Desain
                    </p>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Pilih file, seret ke sini, atau gunakan shortcut
                    </p>

                    {/* Visual Shortcut Key Badge */}
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-[#E63946] border border-red-100 rounded-lg text-[10px] font-bold mb-3 shadow-2xs">
                      <ClipboardPaste className="w-3 h-3" />
                      <span>Tempel Langsung:</span>
                      <kbd className="px-1 py-0.5 bg-white border border-red-200 rounded text-[9px] font-mono font-bold shadow-2xs">
                        Ctrl + V
                      </kbd>
                    </div>

                    {/* Dual Action Buttons: File Picker & Paste Button */}
                    <div className="flex flex-wrap items-center justify-center gap-2 w-full max-w-[270px]">
                      <label className="cursor-pointer flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-white text-slate-700 hover:text-[#E63946] hover:border-red-200 px-3 py-2 rounded-xl border border-slate-200 shadow-2xs transition-all active:scale-95">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Pilih File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileChange(design.id, e.target.files?.[0] || null)}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => handlePasteButtonClick(design.id)}
                        className="cursor-pointer flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-[#E63946] hover:bg-red-700 text-white px-3 py-2 rounded-xl shadow-xs transition-all active:scale-95"
                        title="Tempel gambar dari clipboard (Ctrl+V)"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        <span>Paste Gambar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SISI KANAN: List Ukuran & Item Pesanan */}
              <div className="lg:col-span-8 space-y-4">
                {design.items.map((item, iIdx) => {
                  // Total baju & subtotal pada item ini (memperhitungkan penambahan ukuran di atas XL dan diskon minus)
                  const { totalPcs: totalPcsItem, subtotal: itemSubtotal, effectiveSablonPrice } = calculateApparelItemSubtotal(item);
                  const basePricePerPcs = (item.harga_satuan || 0) + effectiveSablonPrice;

                  return (
                    <div
                      key={item.id ? `${item.id}-${iIdx}` : `item-${iIdx}`}
                      className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3 relative hover:border-slate-300 transition-all"
                    >
                      {/* Top Bar of List Ukuran Card */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 font-['Outfit']">
                            List ukuran {design.items.length > 1 ? `#${iIdx + 1}` : ''}
                          </span>
                        </div>

                        {design.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(design.id, item.id)}
                            className="text-slate-400 hover:text-red-500 text-xs flex items-center gap-1 cursor-pointer"
                            title="Hapus baris ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Hapus</span>
                          </button>
                        )}
                      </div>

                      {/* Baris 1: Jenis Pesanan & Harga Satuan */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-8">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            jenis pesanan apparel (Input text)
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Kaos Combed 30s Hitam, Hoodie Fleece, dll."
                            value={item.jenis_pesanan}
                            onChange={(e) =>
                              handleUpdateItem(design.id, item.id, 'jenis_pesanan', e.target.value)
                            }
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            harga satuan (Nominal Rp)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0"
                              value={item.harga_satuan === 0 ? '' : item.harga_satuan}
                              onChange={(e) =>
                                handleUpdateItem(
                                  design.id,
                                  item.id,
                                  'harga_satuan',
                                  e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#E63946]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Baris 2: Grid List Ukuran: S, M, L, XL, 2XL, 3XL, 4XL */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="block text-[11px] font-semibold text-slate-600">
                            Rincian Jumlah Ukuran (Pcs):
                          </span>
                          <span className="text-[10px] font-semibold text-[#E63946] bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            Ukuran &gt; XL bertambah +5.000 / tingkat
                          </span>
                        </div>
                        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
                          {(['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'] as const).map((sz, szIdx) => {
                            const extraCharge = getSizeExtraCharge(sz);
                            return (
                              <div key={`sz-${design.id || dIdx}-${item.id || iIdx}-${sz}-${szIdx}`} className="flex flex-col items-center">
                                <span className="text-[11px] font-bold text-slate-700 mb-0.5">{sz}</span>
                                {extraCharge > 0 ? (
                                  <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1 rounded-sm mb-1">
                                    +{extraCharge / 1000}k
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-slate-400 mb-1">std</span>
                                )}
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={item.sizes[sz] === 0 ? '' : item.sizes[sz]}
                                  onChange={(e) =>
                                    handleUpdateSize(
                                      design.id,
                                      item.id,
                                      sz,
                                      e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                  className="w-full text-center bg-white border border-slate-200 rounded-lg py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#E63946] shadow-2xs"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Baris 3: Ukuran Sablon & Diskon Sablon */}
                      <div className="pt-1 border-t border-slate-200/60">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                          {/* Ukuran Sablon Dropdown + Add Button */}
                          <div className="sm:col-span-7 space-y-1.5">
                            <label className="block text-[11px] font-semibold text-slate-600">
                              Ukuran Sablon :
                            </label>
                            <div className="flex items-center gap-1.5">
                              <select
                                value={selectedSablonByItem[item.id] || 'a4'}
                                onChange={(e) =>
                                  setSelectedSablonByItem((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                className="grow bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
                              >
                                {SABLON_PRESETS.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.nama}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleAddSablon(design.id, item.id)}
                                className="bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer"
                                title="Tambah Ukuran Sablon"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Badges Sablon yang telah ditambahkan */}
                            {item.sablon_list.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.sablon_list.map((sab, sIdx) => (
                                  <span
                                    key={sab.id ? `${sab.id}-${sIdx}` : `sab-${sIdx}`}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs"
                                  >
                                    {sab.nama}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSablon(design.id, item.id, sab.id)}
                                      className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
                                      title="Hapus sablon ini"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400 italic mt-1">
                                Belum ada sablon ditambahkan (opsional)
                              </p>
                            )}
                          </div>

                          {/* Diskon Sablon (Boleh minus) */}
                          <div className="sm:col-span-5">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3 text-slate-400" />
                                Diskon Sablon:
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                (Boleh minus: misal -5000)
                              </span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">Rp</span>
                              <input
                                type="number"
                                step="any"
                                placeholder="0"
                                value={item.diskon_sablon === 0 ? '' : item.diskon_sablon}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    design.id,
                                    item.id,
                                    'diskon_sablon',
                                    e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0
                                  )
                                }
                                className={`w-full bg-white border rounded-xl pl-8 pr-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-[#E63946] ${
                                  (item.diskon_sablon || 0) < 0
                                    ? 'border-amber-400 text-amber-800 bg-amber-50/40'
                                    : 'border-slate-200 text-slate-800'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Realtime Baris Subtotal */}
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                        <div className="flex items-center gap-3">
                          <span>
                            Total: <strong className="text-slate-900">{totalPcsItem} pcs</strong>
                          </span>
                          <span className="text-slate-300">|</span>
                          <span>
                            Sablon/pcs:{' '}
                            <strong className="text-slate-900">{formatRupiah(effectiveSablonPrice)}</strong>
                          </span>
                          <span className="text-slate-300">|</span>
                          <span>
                            Total/pcs:{' '}
                            <strong className="text-slate-900">{formatRupiah(basePricePerPcs)}</strong>
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 mr-1.5">Subtotal:</span>
                          <strong className="text-sm font-bold text-[#E63946] font-['Outfit']">
                            {formatRupiah(itemSubtotal)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Tombol [ Tambah Pesanan ] di bawah card list ukuran pada desain yang sama */}
                <div>
                  <button
                    type="button"
                    onClick={() => handleAddItemToDesign(design.id)}
                    className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer hover:border-slate-300"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#E63946]" />
                    Tambah Pesanan
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. TOMBOL TAMBAH DESAIN DI BAWAH (Tetap ada untuk menambah desain baru di invoice yang sama) */}
      <div className="pt-2 flex justify-center">
        <button
          type="button"
          onClick={handleAddDesign}
          className="bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold px-5 py-2.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#E63946] hover:text-[#E63946] flex items-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Tambah Desain Baru Pada Invoice Ini
        </button>
      </div>
    </div>
  );
};
