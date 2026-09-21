import React, { useState, useEffect } from 'react';
import { WorkOrder, ProductionStage, UserRole } from '../types';
import { updateWorkOrderStage } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { playFeedbackSound } from '../utils/audio';
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
  Sparkles,
  Save,
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface WorkOrderDetailModalProps {
  workOrder: WorkOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

const STAGES: ProductionStage[] = ['Printing', 'Belanja', 'Produksi', 'Pengantaran'];

export const WorkOrderDetailModal: React.FC<WorkOrderDetailModalProps> = ({
  workOrder,
  isOpen,
  onClose,
}) => {
  const { userProfile, role } = useAuth();
  const { success, info, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [vendorInput, setVendorInput] = useState(workOrder?.nama_vendor || '');
  const [catatanInput, setCatatanInput] = useState('');
  const [checklist, setChecklist] = useState<NonNullable<WorkOrder['checklist']>>(
    workOrder?.checklist || {}
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (workOrder) {
      setVendorInput(workOrder.nama_vendor || '');
      setChecklist(workOrder.checklist || {});
      setCatatanInput('');
    }
  }, [workOrder]);

  if (!workOrder) return null;

  const currentStageIndex = STAGES.indexOf(workOrder.tahap_sekarang);
  const isFinalStage = currentStageIndex === STAGES.length - 1;
  const isCompleted = !!workOrder.completed_at;

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
        catatan_tahap: catatanInput.trim() || 'Pesanan telah selesai & terkirim ke klien.',
        checklistUpdates: { ...checklist, delivered_to_customer: true },
        isFinalComplete: true,
      });

      playFeedbackSound('complete');
      success('Produksi Selesai!', `Work Order ${workOrder.id} telah sukses diselesaikan & dikirim.`);

      // Celebration effect
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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            id="wo-detail-modal-card"
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="bg-white rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl text-slate-800 my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#E63946] flex items-center justify-center font-bold">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base font-['Outfit']">{workOrder.id}</h3>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                      {workOrder.jenis_cetak}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold">{workOrder.nama_klien}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body / Printable SPK Container */}
            <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1 text-xs" id="printable-spk">
              {/* Visual Step Tracker */}
              <div className="bg-[#F8F5F2] p-3 rounded-2xl">
                <p className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wider">
                  Status Alur Produksi:
                </p>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {STAGES.map((st, idx) => {
                    const isPassed = currentStageIndex > idx || isCompleted;
                    const isCurrent = currentStageIndex === idx && !isCompleted;
                    return (
                      <div
                        key={st}
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

              {/* Spesifikasi Item Sesuai Kategori */}
              <div className="bg-slate-50 p-3 rounded-2xl space-y-2 border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
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
                ) : workOrder.apparel_designs && workOrder.apparel_designs.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-200">
                      <span className="text-slate-500">Total Produksi Baju:</span>
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                        {workOrder.jumlah_pcs} Pcs
                      </span>
                    </div>

                    {workOrder.apparel_designs.map((design, dIdx) => (
                      <div key={design.id || dIdx} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                          {design.gambar_preview ? (
                            <img
                              src={design.gambar_preview}
                              alt={design.nama_desain || `Desain ${dIdx + 1}`}
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-red-50 text-[#E63946] border border-red-100 flex items-center justify-center font-bold text-xs shrink-0">
                              D#{dIdx + 1}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-slate-900 text-xs truncate">
                              {design.nama_desain || `Desain #${dIdx + 1}`}
                            </h5>
                            <p className="text-[10px] text-slate-500 truncate">
                              {design.file_name || 'File Master Desain'}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {design.items.reduce((acc, it) => acc + (it.total_pcs || 0), 0)} pcs
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {design.items.map((item, iIdx) => (
                            <div key={item.id || iIdx} className="bg-slate-50 p-2 rounded-lg text-xs space-y-1 border border-slate-200/60">
                              <div className="flex justify-between font-semibold text-slate-800">
                                <span>{item.jenis_pesanan || 'Item Kaos'}</span>
                                <span className="text-slate-900 font-bold">{item.total_pcs} pcs</span>
                              </div>

                              {item.sablon_list && item.sablon_list.length > 0 && (
                                <div className="flex flex-wrap gap-1 items-center">
                                  <span className="text-[10px] text-slate-400">Sablon:</span>
                                  {item.sablon_list.map((s, sIdx) => (
                                    <span key={s.id || sIdx} className="bg-white text-slate-700 text-[10px] px-1.5 py-0.5 rounded border border-slate-200">
                                      {s.nama}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="flex flex-wrap gap-1 pt-0.5 border-t border-slate-200/50">
                                {Object.entries(item.sizes).map(([sz, qty]) => {
                                  if (!qty) return null;
                                  return (
                                    <span key={sz} className="bg-white text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                      {sz}: {qty}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
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
                          {Object.entries(workOrder.rincian_ukuran).map(([sz, qty]) => {
                            if (!qty) return null;
                            return (
                              <span
                                key={sz}
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

                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Target Deadline:</span>
                  <span className="font-bold text-red-600">
                    {new Date(workOrder.deadline).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Form Vendor (Opsional / Eksternal Cetak & Supplier Blank Apparel) */}
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
                <p className="text-[10px] text-slate-500">
                  Isi jika tahap Printing atau Belanja blank apparel dialihkan ke vendor pihak ketiga.
                </p>
              </div>

              {/* Checklist Kontrol Kualitas per Tahap */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Checklist Tim:
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
                    <span>Tahap 3: Curing / Heat Press & Jahit Label Selesai</span>
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

              {/* Riwayat Timeline */}
              {workOrder.riwayat_tahap && workOrder.riwayat_tahap.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="font-bold text-slate-600 text-[11px] mb-2">Riwayat Perjalanan Work Order:</p>
                  <div className="space-y-2 border-l-2 border-red-200 pl-3 ml-2">
                    {workOrder.riwayat_tahap.map((r, i) => (
                      <div key={i} className="relative text-[11px]">
                        <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-[#E63946]" />
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>Tahap {r.tahap}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(r.waktu).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[10px]">{r.catatan}</p>
                        <p className="text-[9px] text-slate-400">Oleh: {r.oleh}</p>
                      </div>
                    ))}
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
                    <span>Selesaikan & Tandai Pesanan Siap / Terkirim</span>
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
                <div className="text-center py-2 px-3 bg-emerald-50 text-emerald-800 rounded-full font-bold text-xs border border-emerald-200">
                  ✓ Work Order ini telah SELESAI diproduksi & dikirim.
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

