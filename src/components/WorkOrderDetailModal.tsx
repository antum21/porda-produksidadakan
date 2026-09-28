import React, { useState, useEffect, useRef } from 'react';
import { WorkOrder, ProductionStage } from '../types';
import { updateWorkOrderStage, attachImageToWorkOrder } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { playFeedbackSound } from '../utils/audio';
import { uploadProductionImage, validateImageFile } from '../services/storageService';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Printer,
  ShoppingBag,
  Cpu,
  Truck,
  CheckCircle2,
  Clock,
  Building,
  User,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Layers,
  Save,
  FileText,
  Upload,
  Image as ImageIcon,
  ZoomIn,
  Loader2,
  ExternalLink,
  ClipboardPaste,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { extractImageFromClipboardEvent, readImageFromSystemClipboard } from '../utils/clipboardHelper';

interface WorkOrderDetailModalProps {
  workOrder: WorkOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

const STAGES: ProductionStage[] = ['Waiting', 'Print', 'Heat Press', 'Packing', 'Shipping'];

export const WorkOrderDetailModal: React.FC<WorkOrderDetailModalProps> = ({
  workOrder,
  isOpen,
  onClose,
}) => {
  const { userProfile, role } = useAuth();
  const { success, info, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [vendorInput, setVendorInput] = useState(workOrder?.nama_vendor || '');
  const [catatanInput, setCatatanInput] = useState('');
  const [checklist, setChecklist] = useState<NonNullable<WorkOrder['checklist']>>(
    workOrder?.checklist || {}
  );

  // Lightbox Zoom state for inspection
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  const lastPasteTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomImage) {
          setZoomImage(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, zoomImage, onClose]);

  useEffect(() => {
    if (workOrder) {
      setVendorInput(workOrder.nama_vendor || '');
      setChecklist(workOrder.checklist || {});
      setCatatanInput('');
    }
  }, [workOrder]);

  // Handle image upload from SPK detail via Firebase Storage / Data fallback
  const handleUploadNewImage = async (file: File) => {
    if (!file || !workOrder) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toastError('Gagal Mengunggah', validation.error || 'Format atau ukuran file tidak didukung');
      return;
    }

    setUploadingImage(true);
    try {
      const uploadRes = await uploadProductionImage(
        workOrder.id,
        file,
        userProfile?.nama || role
      );
      await attachImageToWorkOrder(
        workOrder.id,
        { url: uploadRes.downloadUrl, label: file.name || 'Foto Tambahan Produksi' },
        userProfile?.nama || role
      );
      playFeedbackSound('click');
      success('Foto Berhasil Diunggah', 'Gambar sampel/desain berhasil diunggah ke Firebase Storage.');
    } catch (err: any) {
      console.error('Error uploading image to storage:', err);
      toastError('Gagal Mengunggah', err?.message || 'Gagal memproses gambar');
    } finally {
      setUploadingImage(false);
    }
  };

  // Global paste handler when modal is open (called unconditionally to respect Rules of Hooks)
  useEffect(() => {
    if (!isOpen || !workOrder) return;
    const handlePaste = async (e: ClipboardEvent) => {
      if (!workOrder) return;
      // Debounce duplicate triggers within 400ms
      if (Date.now() - lastPasteTimeRef.current < 400) return;
      lastPasteTimeRef.current = Date.now();

      const file = await extractImageFromClipboardEvent(e);
      if (file) {
        e.preventDefault();
        e.stopPropagation();
        await handleUploadNewImage(file);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [isOpen, workOrder]);

  if (!workOrder) return null;

  const normalizeStageName = (st: string): ProductionStage => {
    const s = (st || '').toLowerCase().trim();
    if (s === 'waiting' || s === 'menunggu') return 'Waiting';
    if (s === 'print' || s === 'printing') return 'Print';
    if (s === 'heat press' || s === 'heatpress' || s === 'press' || s === 'curing') return 'Heat Press';
    if (s === 'packing' || s === 'produksi' || s === 'qc') return 'Packing';
    if (s === 'shipping' || s === 'pengantaran' || s === 'antar' || s === 'kirim') return 'Shipping';
    if (s === 'logistik' || s === 'belanja') return 'Waiting';
    return 'Waiting';
  };

  const currNormStage = normalizeStageName(workOrder.tahap_sekarang);
  const currentStageIndex = STAGES.indexOf(currNormStage);
  const isFinalStage = currentStageIndex === STAGES.length - 1;
  const isCompleted = !!workOrder.completed_at;

  // Collect all available preview images (designs, mockup, production photos)
  const allImages: Array<{ url: string; title: string; subtitle?: string; type: 'design' | 'mockup' | 'photo' }> = [];

  if (workOrder.apparel_designs && Array.isArray(workOrder.apparel_designs)) {
    workOrder.apparel_designs.forEach((d, idx) => {
      if (d.gambar_preview) {
        allImages.push({
          url: d.gambar_preview,
          title: d.nama_desain || `Desain #${idx + 1}`,
          subtitle: d.file_name || 'Artwork Desain',
          type: 'design',
        });
      }
    });
  }

  if (workOrder.mockup_url) {
    allImages.push({
      url: workOrder.mockup_url,
      title: 'Mockup / File Master',
      subtitle: 'Referensi Visual Pesanan',
      type: 'mockup',
    });
  }

  if (workOrder.production_images && Array.isArray(workOrder.production_images)) {
    workOrder.production_images.forEach((img, idx) => {
      allImages.push({
        url: img.url,
        title: img.label || `Foto Produksi #${idx + 1}`,
        subtitle: img.uploaded_at ? new Date(img.uploaded_at).toLocaleString('id-ID') : undefined,
        type: 'photo',
      });
    });
  }

  // Paste handler from button click
  const handlePasteWorkOrderImage = async () => {
    setUploadingImage(true);
    try {
      const res = await readImageFromSystemClipboard();
      if (res.file) {
        await handleUploadNewImage(res.file);
      } else {
        if (res.isPermissionDenied) {
          info('Gunakan Ctrl + V', 'Tekan tombol keyboard Ctrl + V untuk langsung menempelkan foto.');
        } else {
          toastError('Clipboard Kosong', res.error || 'Salin gambar terlebih dahulu (Screenshot / Copy Image).');
        }
      }
    } catch {
      info('Gunakan Ctrl + V', 'Tekan tombol keyboard Ctrl + V untuk langsung menempelkan foto.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleNextStage = async () => {
    if (currentStageIndex < STAGES.length - 1) {
      const nextStage = STAGES[currentStageIndex + 1];
      setLoading(true);
      try {
        await updateWorkOrderStage(workOrder.id, nextStage, userProfile?.nama || role, {
          nama_vendor: vendorInput.trim() || null,
          catatan_tahap: catatanInput.trim() || `Lanjut ke tahap ${nextStage}`,
          checklistUpdates: checklist,
        });
        playFeedbackSound('advance');
        success(`Maju ke Tahap ${nextStage}`, `${workOrder.id} (${workOrder.nama_klien}) berhasil dipindahkan.`);
        setLoading(false);
        onClose();
      } catch (err: any) {
        console.error('Error updating stage:', err);
        toastError('Gagal Memperbarui Tahap', err?.message || 'Terjadi kesalahan sistem.');
        setLoading(false);
      }
    }
  };

  const handlePreviousStage = async () => {
    if (currentStageIndex > 0) {
      const prevStage = STAGES[currentStageIndex - 1];
      setLoading(true);
      try {
        await updateWorkOrderStage(workOrder.id, prevStage, userProfile?.nama || role, {
          nama_vendor: vendorInput.trim() || null,
          catatan_tahap: catatanInput.trim() || `Dikembalikan ke tahap ${prevStage}`,
          checklistUpdates: checklist,
        });
        playFeedbackSound('click');
        info(`Kembali ke Tahap ${prevStage}`, `${workOrder.id} dikembalikan ke ${prevStage}.`);
        setLoading(false);
        onClose();
      } catch (err: any) {
        console.error('Error reverting stage:', err);
        toastError('Gagal Mengembalikan Tahap', err?.message || 'Terjadi kesalahan sistem.');
        setLoading(false);
      }
    }
  };

  const handleMarkComplete = async () => {
    setLoading(true);
    try {
      await updateWorkOrderStage(workOrder.id, 'Pengantaran', userProfile?.nama || role, {
        nama_vendor: vendorInput.trim() || null,
        catatan_tahap: catatanInput.trim() || 'Pesanan telah selesai & masuk arsip selesai.',
        checklistUpdates: { ...checklist, delivered_to_customer: true },
        isFinalComplete: true,
      });

      playFeedbackSound('complete');
      success('Produksi Selesai!', `Work Order ${workOrder.id} telah selesai & masuk ke Arsip Selesai.`);

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      setLoading(false);
      onClose();
    } catch (err: any) {
      console.error('Error completing work order:', err);
      toastError('Gagal Menyelesaikan WO', err?.message || 'Terjadi kesalahan sistem.');
      setLoading(false);
    }
  };

  const handleSaveOnly = async () => {
    setLoading(true);
    try {
      await updateWorkOrderStage(workOrder.id, workOrder.tahap_sekarang, userProfile?.nama || role, {
        nama_vendor: vendorInput.trim() || null,
        catatan_tahap: catatanInput.trim() || undefined,
        checklistUpdates: checklist,
      });
      playFeedbackSound('click');
      success('Catatan Tersimpan', `Data untuk ${workOrder.id} berhasil diperbarui.`);
      setLoading(false);
      onClose();
    } catch (err: any) {
      console.error('Error saving details:', err);
      toastError('Gagal Menyimpan Catatan', err?.message || 'Terjadi kesalahan sistem.');
      setLoading(false);
    }
  };

  const handlePrintSpk = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="wo-detail-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            id="wo-detail-modal-card"
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="bg-white rounded-3xl w-full max-w-2xl p-4 sm:p-6 shadow-2xl text-slate-800 my-auto max-h-[94vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#E63946] flex items-center justify-center font-bold shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-base font-['Outfit']">{workOrder.id}</h3>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                      {workOrder.jenis_cetak}
                    </span>
                    {isCompleted && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                        ✓ Arsip Selesai
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-semibold truncate">{workOrder.nama_klien}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body / Printable SPK Container */}
            <div className="mt-3.5 space-y-4 overflow-y-auto pr-1 flex-1 text-xs" id="printable-spk">
              {/* Visual Step Tracker */}
              <div className="bg-[#F8F5F2] p-3 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Status Alur Produksi:
                  </p>
                  <span className="text-[10px] font-bold text-slate-500">
                    Tahap: <strong className="text-slate-900">{currNormStage}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {STAGES.map((st, idx) => {
                    const isPassed = currentStageIndex > idx || isCompleted;
                    const isCurrent = currentStageIndex === idx && !isCompleted;
                    return (
                      <div
                        key={`stage-${st}-${idx}`}
                        className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all border ${
                          isCurrent
                            ? 'bg-[#E63946] text-white border-[#E63946] shadow-xs'
                            : isPassed
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                        <span className="block text-[9px] opacity-75">T{idx + 1}</span>
                        <span className="truncate block">{st}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ======================================================== */}
              {/* PREVIEW GAMBAR & ARTWORK DESAIN (REQUESTED FEATURE)       */}
              {/* ======================================================== */}
              <div className="bg-gradient-to-r from-red-50/70 via-slate-50 to-amber-50/40 p-3.5 rounded-2xl border border-red-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-[#E63946] text-white flex items-center justify-center">
                      <ImageIcon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs font-['Outfit']">
                        Preview Gambar & Desain Produksi
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Klik gambar untuk memperbesar resolusi tinggi
                      </p>
                    </div>
                  </div>

                  {/* Tombol Unggah Foto Tambahan & Paste Clipboard */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePasteWorkOrderImage}
                      disabled={uploadingImage}
                      className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-[#E63946] border border-red-200 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all shadow-2xs disabled:opacity-50 active:scale-95"
                      title="Tempel foto dari clipboard (Ctrl+V)"
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      <span>Paste (Ctrl+V)</span>
                    </button>

                    <label className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all shadow-2xs active:scale-95">
                      {uploadingImage ? (
                        <Loader2 className="w-3 h-3 animate-spin text-[#E63946]" />
                      ) : (
                        <Upload className="w-3 h-3 text-[#E63946]" />
                      )}
                      <span>{uploadingImage ? 'Mengunggah...' : '+ File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadNewImage(f);
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Grid Gallery Preview Gambar */}
                {allImages.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {allImages.map((img, i) => (
                      <div
                        key={`img-${img.type}-${i}-${img.url.slice(-10)}`}
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden group hover:border-red-300 transition-all flex flex-col"
                      >
                        <div
                          className="relative h-44 bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer"
                          onClick={() => setZoomImage(img)}
                        >
                          <img
                            src={img.url}
                            alt={img.title}
                            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <span className="bg-white/90 text-slate-900 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md">
                              <ZoomIn className="w-3.5 h-3.5 text-[#E63946]" />
                              <span>Perbesar</span>
                            </span>
                          </div>
                          <span
                            className={`absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full ${
                              img.type === 'design'
                                ? 'bg-amber-500 text-white'
                                : img.type === 'mockup'
                                ? 'bg-blue-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {img.type === 'design' ? 'Desain Sablon' : img.type === 'mockup' ? 'Mockup Order' : 'Foto Sampel'}
                          </span>
                        </div>

                        <div className="p-2.5 flex items-center justify-between gap-2 border-t border-slate-100">
                          <div className="min-w-0">
                            <h5 className="font-bold text-slate-900 text-xs truncate">{img.title}</h5>
                            {img.subtitle && (
                              <p className="text-[10px] text-slate-500 truncate">{img.subtitle}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setZoomImage(img)}
                            className="text-[#E63946] hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Perbesar gambar"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-slate-300 space-y-2">
                    <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Belum ada preview gambar diunggah</p>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                      Unggah file artwork desain atau foto sampel kain/cetak agar tim printing & produksi dapat mencocokkan hasil kerja secara presisi.
                    </p>
                    <label className="mt-2 inline-flex items-center gap-1.5 bg-[#E63946] hover:bg-red-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-full cursor-pointer transition-all shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah Gambar Sekarang</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadNewImage(f);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Spesifikasi Item Sesuai Kategori */}
              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2 border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Spesifikasi SPK Produksi
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {workOrder.kategori_projek === 'grafis'
                      ? 'Projek Grafis & Cetak'
                      : workOrder.kategori_projek === 'lainnya'
                      ? 'Custom Order Bebas'
                      : 'Apparel & Baju'}
                  </span>
                </div>

                {workOrder.kategori_projek === 'grafis' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Produk Grafis:</span>
                      <span className="font-semibold text-slate-800 text-right">{workOrder.tipe_grafis || 'Cetak Grafis'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bahan Media:</span>
                      <span className="font-semibold text-slate-800 text-right">{workOrder.bahan_cetak || workOrder.bahan_apparel || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Dimensi Ukuran:</span>
                      <span className="font-semibold text-slate-800">{workOrder.dimensi_ukuran || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Finishing:</span>
                      <span className="font-medium text-slate-700 text-right">{workOrder.finishing || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Kuantitas Produksi:</span>
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                        {workOrder.jumlah_pcs} {workOrder.satuan_grafis || 'Pcs'}
                      </span>
                    </div>
                  </>
                ) : workOrder.kategori_projek === 'lainnya' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Item Custom:</span>
                      <span className="font-bold text-slate-900 text-right">{workOrder.nama_item_custom || workOrder.bahan_apparel || 'Order Bebas'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Kuantitas:</span>
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                        {workOrder.jumlah_pcs} {workOrder.satuan_custom || 'Unit'}
                      </span>
                    </div>
                    {workOrder.deskripsi_custom && (
                      <div className="pt-1">
                        <span className="text-slate-500 block mb-0.5">Spesifikasi Bebas:</span>
                        <p className="bg-white p-2 rounded-xl text-slate-700 border border-slate-200 text-[11px] leading-relaxed">
                          {workOrder.deskripsi_custom}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bahan Apparel:</span>
                      <span className="font-semibold text-slate-800 text-right">{workOrder.bahan_apparel || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Warna Kain:</span>
                      <span className="font-semibold text-slate-800">{workOrder.warna_bahan || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Jumlah Total:</span>
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                        {workOrder.jumlah_pcs} Pcs
                      </span>
                    </div>
                    {workOrder.rincian_ukuran && (
                      <div className="pt-1">
                        <span className="text-[10px] text-slate-400 block mb-1 font-semibold">Rincian Size:</span>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(workOrder.rincian_ukuran).map(([sz, qty], szIdx) => {
                            if (!qty) return null;
                            return (
                              <span
                                key={`sz-${sz}-${szIdx}`}
                                className="bg-white text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200"
                              >
                                {sz}: {qty} pcs
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between pt-1.5 border-t border-slate-200">
                  <span className="text-slate-500">Target Deadline:</span>
                  <span className="font-bold text-red-600">
                    {new Date(workOrder.deadline).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Form Vendor */}
              <div className="bg-red-50/50 p-3.5 rounded-2xl border border-red-100 space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#E63946]" />
                  Nama Vendor / Supplier (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Vendor DTF Jaya Express / Supplier Bahan Nusantara"
                  value={vendorInput}
                  onChange={(e) => setVendorInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946] transition-colors"
                />
              </div>

              {/* Checklist Kontrol Kualitas per Tahap */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Checklist Kontrol Kualitas:
                </p>
                <div className="space-y-1.5 text-slate-700">
                  <label className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={checklist.printing_done || false}
                      onChange={(e) => setChecklist({ ...checklist, printing_done: e.target.checked })}
                      className="rounded text-[#E63946] focus:ring-red-400 w-4 h-4 cursor-pointer"
                    />
                    <span>Tahap 1: Hasil Cetak / Sablon Film Selesai</span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={checklist.blank_apparel_ready || false}
                      onChange={(e) =>
                        setChecklist({ ...checklist, blank_apparel_ready: e.target.checked })
                      }
                      className="rounded text-[#E63946] focus:ring-red-400 w-4 h-4 cursor-pointer"
                    />
                    <span>Tahap 2: Blank Apparel Lengkap Sesuai Size</span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={checklist.curing_press_done || false}
                      onChange={(e) =>
                        setChecklist({ ...checklist, curing_press_done: e.target.checked })
                      }
                      className="rounded text-[#E63946] focus:ring-red-400 w-4 h-4 cursor-pointer"
                    />
                    <span>Tahap 3: Curing / Heat Press & Jahit Selesai</span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={checklist.qc_passed || false}
                      onChange={(e) => setChecklist({ ...checklist, qc_passed: e.target.checked })}
                      className="rounded text-[#E63946] focus:ring-red-400 w-4 h-4 cursor-pointer"
                    />
                    <span>Tahap 3: Quality Control Lolos & Packing Rapi</span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={checklist.delivered_to_customer || false}
                      onChange={(e) =>
                        setChecklist({ ...checklist, delivered_to_customer: e.target.checked })
                      }
                      className="rounded text-[#E63946] focus:ring-red-400 w-4 h-4 cursor-pointer"
                    />
                    <span>Tahap 4: Diterima Klien / Kurir Selesai Kirim</span>
                  </label>
                </div>
              </div>

              {/* Update Catatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Progres Baru:
                </label>
                <input
                  type="text"
                  placeholder="Tulis update progres / kendala mesin / info vendor..."
                  value={catatanInput}
                  onChange={(e) => setCatatanInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946] transition-colors"
                />
              </div>

              {/* Riwayat Timeline dengan Catatan Waktu Lengkap (REQUESTED FEATURE) */}
              {workOrder.riwayat_tahap && workOrder.riwayat_tahap.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#E63946]" />
                      <span>Catatan Waktu & Riwayat Perjalanan Tahap:</span>
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {workOrder.riwayat_tahap.length} update tercatat
                    </span>
                  </div>

                  <div className="space-y-2.5 border-l-2 border-red-200 pl-3.5 ml-2">
                    {workOrder.riwayat_tahap.map((r, i) => {
                      const logDate = new Date(r.waktu);
                      return (
                        <div key={`timeline-${i}-${r.waktu || 't'}`} className="relative text-[11px] bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
                          <div className="absolute -left-[21px] top-3 w-2.5 h-2.5 rounded-full bg-[#E63946] ring-4 ring-white" />
                          <div className="flex flex-wrap items-center justify-between gap-1 font-bold text-slate-800">
                            <span className="bg-red-50 text-[#E63946] px-2 py-0.5 rounded-md border border-red-100">
                              Tahap: {r.tahap}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {isNaN(logDate.getTime())
                                ? r.waktu
                                : logDate.toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  }) + ' WIB'}
                            </span>
                          </div>
                          {r.catatan && (
                            <p className="text-slate-700 text-xs mt-1.5 font-medium leading-relaxed">
                              {r.catatan}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-200/50">
                            <span>Diupdate oleh: <strong className="text-slate-600">{r.oleh}</strong></span>
                            {r.vendor && (
                              <span>Vendor: <strong className="text-slate-600">{r.vendor}</strong></span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Action Controls */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintSpk}
                  className="py-2.5 px-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5 text-[#E63946]" />
                  <span>Cetak SPK</span>
                </button>

                {currentStageIndex > 0 && !isCompleted && (
                  <button
                    type="button"
                    onClick={handlePreviousStage}
                    disabled={loading}
                    className="py-2.5 px-3 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Mundur</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveOnly}
                  disabled={loading}
                  className="flex-1 py-2.5 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Catatan</span>
                </button>
              </div>

              {!isCompleted ? (
                isFinalStage ? (
                  <button
                    type="button"
                    onClick={handleMarkComplete}
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-[0_8px_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Selesaikan & Masukkan ke Arsip Selesai ✓</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextStage}
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-full bg-[#E63946] hover:bg-red-600 text-white font-bold text-xs shadow-[0_8px_20px_rgba(230,57,70,0.35)] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  >
                    <span>Maju ke Tahap Berikutnya ({STAGES[currentStageIndex + 1]})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )
              ) : (
                <div className="text-center py-2.5 px-3 bg-emerald-50 text-emerald-800 rounded-full font-bold text-xs border border-emerald-300 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Pesanan ini telah SELESAI dan tersimpan di Arsip Selesai.</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Lightbox Fullscreen Image Zoom Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomImage(null)}
        >
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3 px-2">
            <div>
              <h3 className="font-bold text-base">{zoomImage.title}</h3>
              {zoomImage.subtitle && (
                <p className="text-xs text-slate-400">{zoomImage.subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={zoomImage.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
                title="Buka tab baru"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div
            className="relative max-w-4xl max-h-[82vh] w-full flex items-center justify-center p-2 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={zoomImage.url}
              alt={zoomImage.title}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl bg-slate-900/50"
            />
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
