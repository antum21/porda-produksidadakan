import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '../components/Header';
import { WorkOrder, ProductionStage, UserRole, ProjectCategory } from '../types';
import { subscribeWorkOrders, updateWorkOrderStage } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { WorkOrderDetailModal } from '../components/WorkOrderDetailModal';
import { ProductionStatusSlider } from '../components/ProductionStatusSlider';
import { playFeedbackSound } from '../utils/audio';
import {
  Printer,
  ShoppingBag,
  Cpu,
  Truck,
  ArrowRight,
  Building,
  CheckCircle2,
  Clock,
  Layers,
  Calendar,
  Filter,
  Search,
  LayoutList,
  LayoutGrid,
  Eye,
  Check,
  FileText,
  RotateCcw,
  Archive,
  Image as ImageIcon,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

const STAGES_CONFIG: Record<
  ProductionStage,
  {
    id: ProductionStage;
    title: string;
    subtitle: string;
    icon: React.ElementType;
    color: string;
    badgeBg: string;
    roleMatch: UserRole[];
  }
> = {
  Printing: {
    id: 'Printing',
    title: '1. Printing',
    subtitle: 'Cetak DTF / Sablon Manual / Digital',
    icon: Printer,
    color: 'border-amber-400/80 bg-amber-500/10 text-amber-900',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    roleMatch: ['Admin', 'Printing'],
  },
  Logistik: {
    id: 'Logistik',
    title: '2. Logistik',
    subtitle: 'Pengadaan Blank Apparel Supplier',
    icon: ShoppingBag,
    color: 'border-blue-400/80 bg-blue-500/10 text-blue-900',
    badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
    roleMatch: ['Admin', 'Logistik'],
  },
  Belanja: {
    id: 'Belanja',
    title: '2. Logistik',
    subtitle: 'Pengadaan Blank Apparel Supplier',
    icon: ShoppingBag,
    color: 'border-blue-400/80 bg-blue-500/10 text-blue-900',
    badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
    roleMatch: ['Admin', 'Logistik'],
  },
  Produksi: {
    id: 'Produksi',
    title: '3. Produksi',
    subtitle: 'Finishing, Press, Jahit, QC & Pack',
    icon: Cpu,
    color: 'border-emerald-400/80 bg-emerald-500/10 text-emerald-900',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    roleMatch: ['Admin', 'Produksi'],
  },
  Pengantaran: {
    id: 'Pengantaran',
    title: '4. Pengantaran',
    subtitle: 'Kurir, Delivery & Pickup Klien',
    icon: Truck,
    color: 'border-purple-400/80 bg-purple-500/10 text-purple-900',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    roleMatch: ['Admin', 'Pengantaran'],
  },
};

// Urutan baku 4 tahap produksi: Printing -> Logistik -> Produksi -> Pengantaran
const STAGE_KEYS: ProductionStage[] = ['Printing', 'Logistik', 'Produksi', 'Pengantaran'];

// Normalizer untuk memetakan legacy 'Belanja' ke 'Logistik'
const normalizeStage = (st: string): ProductionStage => {
  if (st === 'Belanja' || st === 'Logistik') return 'Logistik';
  if (st === 'Produksi') return 'Produksi';
  if (st === 'Pengantaran') return 'Pengantaran';
  return 'Printing';
};

function formatDateTime(isoStr?: string): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return '-';
  }
}

export const ProductionPage: React.FC = () => {
  const { userProfile, role } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab utama: 'antrian' (Antrian Produksi Aktif) vs 'arsip' (Arsip Selesai)
  const [mainTab, setMainTab] = useState<'antrian' | 'arsip'>('antrian');

  // View mode: 'rows' (Tampilan Baris seperti Manajemen Pesanan) or 'board' (Tampilan Kolom Kanban)
  const [viewMode, setViewMode] = useState<'rows' | 'board'>('rows');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('Semua');
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');

  // Modals & Action States
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Realtime Firestore listener
  useEffect(() => {
    const unsub = subscribeWorkOrders((data) => {
      setWorkOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Stage statistics
  const stageStats = useMemo(() => {
    const active = workOrders.filter((w) => !w.completed_at);
    const archived = workOrders.filter((w) => !!w.completed_at);
    return {
      totalAktif: active.length,
      printing: active.filter((w) => normalizeStage(w.tahap_sekarang) === 'Printing').length,
      logistik: active.filter((w) => normalizeStage(w.tahap_sekarang) === 'Logistik').length,
      produksi: active.filter((w) => normalizeStage(w.tahap_sekarang) === 'Produksi').length,
      pengantaran: active.filter((w) => normalizeStage(w.tahap_sekarang) === 'Pengantaran').length,
      selesai: archived.length,
    };
  }, [workOrders]);

  // Filtered orders depending on mainTab ('antrian' vs 'arsip')
  const filteredOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      const isDone = !!wo.completed_at;

      // 1. Main Tab Filter (Active vs Archived)
      if (mainTab === 'antrian' && isDone) return false;
      if (mainTab === 'arsip' && !isDone) return false;

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesClient = (wo.nama_klien || '').toLowerCase().includes(query);
        const matchesSpk = (wo.id || '').toLowerCase().includes(query);
        const matchesOrder = (wo.order_id || '').toLowerCase().includes(query);
        const matchesBahan = (wo.bahan_apparel || wo.bahan_cetak || '').toLowerCase().includes(query);
        const matchesCetak = (wo.jenis_cetak || wo.tipe_grafis || '').toLowerCase().includes(query);
        const matchesVendor = (wo.nama_vendor || '').toLowerCase().includes(query);
        if (!matchesClient && !matchesSpk && !matchesOrder && !matchesBahan && !matchesCetak && !matchesVendor) {
          return false;
        }
      }

      // 3. Stage Sub-Filter (only in antrian mode)
      if (mainTab === 'antrian' && stageFilter !== 'Semua') {
        const currentNorm = normalizeStage(wo.tahap_sekarang);
        if (currentNorm !== stageFilter) return false;
      }

      // 4. Category Filter
      if (categoryFilter !== 'Semua') {
        if (categoryFilter === 'apparel' && wo.kategori_projek && wo.kategori_projek !== 'apparel') return false;
        if (categoryFilter === 'grafis' && wo.kategori_projek !== 'grafis') return false;
        if (categoryFilter === 'lainnya' && wo.kategori_projek !== 'lainnya') return false;
      }

      return true;
    });
  }, [workOrders, mainTab, searchQuery, stageFilter, categoryFilter]);

  // Direct Slider Stage Change Handler
  const handleStageChange = async (wo: WorkOrder, newStage: ProductionStage) => {
    setActionLoadingId(wo.id);
    try {
      await updateWorkOrderStage(wo.id, newStage, userProfile?.nama || role, {
        catatan_tahap: `Status digeser ke tahap ${newStage}`,
      });
      playFeedbackSound('advance');
      setToastMessage({
        type: 'success',
        text: `Status ${wo.id} (${wo.nama_klien}) berhasil digeser ke ${newStage}.`,
      });
    } catch (err: any) {
      console.error('Error updating stage:', err);
      setToastMessage({
        type: 'error',
        text: `Gagal menggeser tahap: ${err?.message || 'Error'}`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Advance Button (e.g. Printing -> Logistik -> Produksi -> Pengantaran -> Selesai / Arsip)
  const handleQuickAdvance = async (wo: WorkOrder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currNorm = normalizeStage(wo.tahap_sekarang);
    const currIdx = STAGE_KEYS.indexOf(currNorm);

    if (currIdx < STAGE_KEYS.length - 1) {
      const nextStage = STAGE_KEYS[currIdx + 1];
      setActionLoadingId(wo.id);
      try {
        await updateWorkOrderStage(wo.id, nextStage, userProfile?.nama || role, {
          catatan_tahap: `Maju ke tahap ${nextStage} via Quick Action`,
        });
        playFeedbackSound('advance');
        setToastMessage({
          type: 'success',
          text: `Status ${wo.id} maju ke tahap ${nextStage}.`,
        });
      } catch (err) {
        console.error('Error quick advancing stage:', err);
      } finally {
        setActionLoadingId(null);
      }
    } else if (currIdx === STAGE_KEYS.length - 1 && !wo.completed_at) {
      // Mark as Final Complete -> enters archive!
      setActionLoadingId(wo.id);
      try {
        await updateWorkOrderStage(wo.id, 'Pengantaran', userProfile?.nama || role, {
          isFinalComplete: true,
          catatan_tahap: 'Pesanan telah selesai & masuk arsip selesai.',
        });
        playFeedbackSound('complete');
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch (e) {}
        setToastMessage({
          type: 'success',
          text: `Selamat! Work Order ${wo.id} telah selesai & dipindahkan ke Arsip Selesai.`,
        });
      } catch (err) {
        console.error('Error completing:', err);
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  // Re-open from archive back to active queue
  const handleReopen = async (wo: WorkOrder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Buka kembali pesanan ${wo.id} (${wo.nama_klien}) ke Antrian Produksi Aktif?`)) return;
    setActionLoadingId(wo.id);
    try {
      await updateWorkOrderStage(wo.id, 'Pengantaran', userProfile?.nama || role, {
        reopenFromArchive: true,
        catatan_tahap: 'Pesanan dibuka kembali dari Arsip ke Antrian Aktif.',
      });
      playFeedbackSound('click');
      setToastMessage({
        type: 'success',
        text: `Pesanan ${wo.id} berhasil dikembalikan ke Antrian Produksi Aktif.`,
      });
    } catch (err) {
      console.error('Error reopening order:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper to get first preview image of a work order
  const getFirstImage = (wo: WorkOrder): string | null => {
    if (wo.apparel_designs && wo.apparel_designs[0]?.gambar_preview) {
      return wo.apparel_designs[0].gambar_preview;
    }
    if (wo.mockup_url) return wo.mockup_url;
    if (wo.production_images && wo.production_images[0]?.url) {
      return wo.production_images[0].url;
    }
    return null;
  };

  return (
    <div id="production-management-page" className="w-full flex flex-col space-y-6">
      <Header
        badge="ERP Production"
        title="Manajemen Produksi & SPK"
        subtitle="Alur 4 tahap produksi: Printing, Logistik, Produksi, dan Pengantaran"
      />

      <div className="px-4 sm:px-6 lg:px-8 space-y-5">
        {/* ======================================================== */}
        {/* NAVIGASI UTAMA: ANTRIAN AKTIF vs ARSIP SELESAI           */}
        {/* ======================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-3xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMainTab('antrian');
                setStageFilter('Semua');
              }}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                mainTab === 'antrian'
                  ? 'bg-[#E63946] text-white shadow-md shadow-red-500/25 scale-[1.02]'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>⚡ Antrian Produksi Aktif</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  mainTab === 'antrian' ? 'bg-white/30 text-white' : 'bg-white text-slate-800 border border-slate-200'
                }`}
              >
                {stageStats.totalAktif}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMainTab('arsip');
                setStageFilter('Semua');
              }}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
                mainTab === 'arsip'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25 scale-[1.02]'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>📦 Arsip Selesai</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  mainTab === 'arsip' ? 'bg-white/30 text-white' : 'bg-white text-slate-800 border border-slate-200'
                }`}
              >
                {stageStats.selesai}
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 px-2 font-medium hidden md:block">
            {mainTab === 'antrian'
              ? 'Pesanan yang telah selesai akan otomatis masuk ke folder Arsip Selesai'
              : 'Daftar semua work order yang telah berhasil diselesaikan & terkirim ke klien'}
          </div>
        </div>

        {/* Quick Stats Summary Cards (Hanya di Antrian Aktif) */}
        {mainTab === 'antrian' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div
              onClick={() => setStageFilter('Semua')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                stageFilter === 'Semua'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-800 border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className={stageFilter === 'Semua' ? 'text-slate-300' : 'text-slate-500'}>Total Aktif</span>
                <Layers className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-['Outfit']">{stageStats.totalAktif}</div>
              <div className="text-[10px] text-slate-400">Dalam Antrian Produksi</div>
            </div>

            <div
              onClick={() => setStageFilter('Printing')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                stageFilter === 'Printing'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                  : 'bg-white text-slate-800 border-amber-200/80 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className={stageFilter === 'Printing' ? 'text-white' : 'text-amber-800'}>1. Printing</span>
                <Printer className={`w-4 h-4 ${stageFilter === 'Printing' ? 'text-white' : 'text-amber-600'}`} />
              </div>
              <div className="text-xl sm:text-2xl font-black font-['Outfit']">{stageStats.printing}</div>
              <div className={`text-[10px] ${stageFilter === 'Printing' ? 'text-amber-100' : 'text-slate-400'}`}>Cetak Sablon/DTF</div>
            </div>

            <div
              onClick={() => setStageFilter('Logistik')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                stageFilter === 'Logistik'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                  : 'bg-white text-slate-800 border-blue-200/80 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className={stageFilter === 'Logistik' ? 'text-white' : 'text-blue-800'}>2. Logistik</span>
                <ShoppingBag className={`w-4 h-4 ${stageFilter === 'Logistik' ? 'text-white' : 'text-blue-600'}`} />
              </div>
              <div className="text-xl sm:text-2xl font-black font-['Outfit']">{stageStats.logistik}</div>
              <div className={`text-[10px] ${stageFilter === 'Logistik' ? 'text-blue-100' : 'text-slate-400'}`}>Pengadaan Bahan</div>
            </div>

            <div
              onClick={() => setStageFilter('Produksi')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                stageFilter === 'Produksi'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                  : 'bg-white text-slate-800 border-emerald-200/80 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className={stageFilter === 'Produksi' ? 'text-white' : 'text-emerald-800'}>3. Produksi</span>
                <Cpu className={`w-4 h-4 ${stageFilter === 'Produksi' ? 'text-white' : 'text-emerald-600'}`} />
              </div>
              <div className="text-xl sm:text-2xl font-black font-['Outfit']">{stageStats.produksi}</div>
              <div className={`text-[10px] ${stageFilter === 'Produksi' ? 'text-emerald-100' : 'text-slate-400'}`}>Jahit, QC & Pack</div>
            </div>

            <div
              onClick={() => setStageFilter('Pengantaran')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                stageFilter === 'Pengantaran'
                  ? 'bg-purple-600 text-white border-purple-700 shadow-md'
                  : 'bg-white text-slate-800 border-purple-200/80 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className={stageFilter === 'Pengantaran' ? 'text-white' : 'text-purple-800'}>4. Pengantaran</span>
                <Truck className={`w-4 h-4 ${stageFilter === 'Pengantaran' ? 'text-white' : 'text-purple-600'}`} />
              </div>
              <div className="text-xl sm:text-2xl font-black font-['Outfit']">{stageStats.pengantaran}</div>
              <div className={`text-[10px] ${stageFilter === 'Pengantaran' ? 'text-purple-100' : 'text-slate-400'}`}>Delivery & Pickup</div>
            </div>
          </div>
        )}

        {/* Filter, Search Bar & View Mode Switcher */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={
                  mainTab === 'antrian'
                    ? 'Cari antrian klien, SPK, invoice, jenis sablon, atau bahan...'
                    : 'Cari riwayat arsip pesanan selesai...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E63946]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* View Mode & Filter Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Category Filter */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-2xl text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-slate-700 font-bold focus:outline-none cursor-pointer text-xs"
                >
                  <option value="Semua">Semua Kategori</option>
                  <option value="apparel">Apparel</option>
                  <option value="grafis">Percetakan Grafis</option>
                  <option value="lainnya">Custom Order</option>
                </select>
              </div>

              {/* View Mode Toggle: Rows (Baris) vs Board (Kolom) */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('rows')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'rows'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Tampilan Baris (seperti Manajemen Pesanan)"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tampilan Baris</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('board')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'board'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Tampilan Kolom Kanban"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Kolom Board</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stage Filter Tabs (Hanya di Antrian Aktif) */}
          {mainTab === 'antrian' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs border-t border-slate-100 pt-3">
              {[
                { id: 'Semua', label: 'Semua Aktif', count: stageStats.totalAktif },
                { id: 'Printing', label: '1. Printing', count: stageStats.printing },
                { id: 'Logistik', label: '2. Logistik', count: stageStats.logistik },
                { id: 'Produksi', label: '3. Produksi', count: stageStats.produksi },
                { id: 'Pengantaran', label: '4. Pengantaran', count: stageStats.pengantaran },
              ].map((tab) => {
                const isSelected = stageFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStageFilter(tab.id)}
                    className={`px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#E63946] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isSelected ? 'bg-white/30 text-white' : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Feedback Toast Notification */}
        {toastMessage && (
          <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white cursor-pointer px-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content Body: Rows Layout OR Board Layout */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-xs">
            <div className="w-8 h-8 border-3 border-[#E63946] border-t-transparent rounded-full animate-spin mb-3" />
            <span>Memuat data antrean produksi dari Firestore...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-2xs space-y-3">
            <div className="w-12 h-12 bg-red-50 text-[#E63946] rounded-2xl flex items-center justify-center mx-auto">
              {mainTab === 'arsip' ? <Archive className="w-6 h-6 text-emerald-600" /> : <Layers className="w-6 h-6" />}
            </div>
            <h3 className="text-base font-bold text-slate-800 font-['Outfit']">
              {mainTab === 'arsip' ? 'Arsip Selesai Kosong' : 'Tidak ada antrean produksi aktif'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {mainTab === 'arsip'
                ? 'Belum ada pesanan yang diselesaikan. Saat pesanan di tahap Pengantaran ditandai selesai, otomatis diarsipkan di sini.'
                : searchQuery
                ? 'Tidak ditemukan pesanan aktif dengan kata kunci tersebut.'
                : 'Pesanan yang telah di-commit DP 70% dari Manajemen Pesanan akan otomatis muncul di sini.'}
            </p>
          </div>
        ) : viewMode === 'rows' ? (
          /* ======================================================== */
          /* TAMPILAN BARIS (Row Layout Identik Manajemen Pesanan)   */
          /* Dilengkapi 1 Kolom Status Orderan yang Bisa Digeser     */
          /* ======================================================== */
          <div className="space-y-3.5">
            {filteredOrders.map((wo, wIdx) => {
              const currNorm = normalizeStage(wo.tahap_sekarang);
              const isCompleted = !!wo.completed_at;
              const isActionLoading = actionLoadingId === wo.id;
              const currIdx = STAGE_KEYS.indexOf(currNorm);
              const nextStageName = currIdx < STAGE_KEYS.length - 1 ? STAGE_KEYS[currIdx + 1] : null;
              const firstImg = getFirstImage(wo);

              return (
                <div
                  key={wo.id ? `wo-row-${wo.id}-${wIdx}` : `wo-row-${wIdx}`}
                  id={`wo-row-${wo.id}`}
                  className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md border border-slate-200/80 hover:border-red-200 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-4 relative overflow-hidden"
                >
                  {/* SISI KIRI: Identitas SPK, Preview Gambar, Klien, Spesifikasi & Deadline */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Header baris: SPK ID, Order ID / Invoice, Kategori, Label Selesai / Tahap */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-[#E63946] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">
                        {wo.id}
                      </span>

                      {wo.order_id && (
                        <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          Ref: {wo.order_id}
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          wo.kategori_projek === 'grafis'
                            ? 'bg-blue-100 text-blue-800'
                            : wo.kategori_projek === 'lainnya'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-red-50 text-[#E63946]'
                        }`}
                      >
                        {wo.kategori_projek === 'grafis'
                          ? '🖨️ Percetakan Grafis'
                          : wo.kategori_projek === 'lainnya'
                          ? '✨ Custom Order'
                          : '👕 Apparel'}
                      </span>

                      {/* Status Terkirim / Tahap Badge */}
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-3xs'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>✓ Selesai & Masuk Arsip</span>
                          </>
                        ) : (
                          <span>Tahap: {currNorm}</span>
                        )}
                      </span>
                    </div>

                    {/* Baris Thumbnail Gambar Desain + Klien + Kuantitas + Deadline */}
                    <div className="flex items-center gap-3">
                      {/* Thumbnail Gambar Desain yang Diunggah (REQUESTED) */}
                      {firstImg ? (
                        <div
                          onClick={() => setSelectedWO(wo)}
                          className="relative w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-[#E63946] transition-all group"
                          title="Klik untuk lihat detail SPK & perbesar gambar"
                        >
                          <img
                            src={firstImg}
                            alt="Preview Desain"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => setSelectedWO(wo)}
                          className="w-12 h-12 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center shrink-0 cursor-pointer text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-all"
                          title="Klik untuk unggah gambar di SPK"
                        >
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base font-['Outfit'] truncate max-w-sm">
                            {wo.nama_klien}
                          </h3>

                          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">
                            {wo.jumlah_pcs}{' '}
                            {wo.kategori_projek === 'grafis'
                              ? wo.satuan_grafis || 'Pcs'
                              : wo.kategori_projek === 'lainnya'
                              ? wo.satuan_custom || 'Unit'
                              : 'Pcs'}
                          </span>

                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              Deadline:{' '}
                              <strong className="text-red-600">
                                {new Date(wo.deadline).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </strong>
                            </span>
                          </div>
                        </div>

                        {/* Rincian Produk & Spesifikasi */}
                        {wo.kategori_projek === 'grafis' ? (
                          <div className="flex flex-wrap gap-1 text-[11px] text-slate-600">
                            <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md border border-blue-100">
                              {wo.tipe_grafis || 'Cetak Grafis'}
                            </span>
                            <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                              {wo.bahan_cetak || wo.bahan_apparel || 'Bahan Standar'}
                            </span>
                            {wo.dimensi_ukuran && (
                              <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                                {wo.dimensi_ukuran}
                              </span>
                            )}
                            {wo.finishing && (
                              <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                                Finishing: {wo.finishing}
                              </span>
                            )}
                          </div>
                        ) : wo.kategori_projek === 'lainnya' ? (
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                            <span className="bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-md border border-purple-100">
                              {wo.nama_item_custom || wo.bahan_apparel || 'Item Bebas'}
                            </span>
                            {wo.deskripsi_custom && (
                              <span className="text-[11px] text-slate-500 truncate max-w-md italic">
                                "{wo.deskripsi_custom}"
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 text-[11px] text-slate-600">
                            <span className="bg-red-50 text-[#E63946] font-bold px-2 py-0.5 rounded-md border border-red-100">
                              {wo.jenis_cetak}
                            </span>
                            <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                              {wo.bahan_apparel}
                            </span>
                            <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                              {wo.warna_bahan}
                            </span>
                            {wo.posisi_cetak && (
                              <span className="text-slate-500 text-[11px]">
                                Posisi: {wo.posisi_cetak}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Baris Catatan Waktu Update Terakhir & Info Vendor (REQUESTED) */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#E63946] shrink-0" />
                        <span>
                          {isCompleted ? 'Selesai: ' : 'Terakhir Update: '}
                          <strong className="text-slate-800">
                            {formatDateTime(isCompleted ? wo.completed_at : wo.updated_at)}
                          </strong>
                        </span>
                        {wo.diupdate_oleh && (
                          <span className="text-slate-400">({wo.diupdate_oleh})</span>
                        )}
                      </div>

                      {wo.nama_vendor && (
                        <div className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                          <Building className="w-3 h-3 text-[#E63946] shrink-0" />
                          <span>Vendor: <strong>{wo.nama_vendor}</strong></span>
                        </div>
                      )}

                      {wo.catatan_tahap && (
                        <span className="text-slate-400 italic truncate max-w-sm">
                          "{wo.catatan_tahap}"
                        </span>
                      )}
                    </div>
                  </div>

                  {/* SISI TENGAH: 1 KOLOM STATUS ORDERAN YANG BISA DIGESER (Urutan: Printing -> Logistik -> Produksi -> Pengantaran) */}
                  <div className="w-full xl:w-[410px] shrink-0">
                    <ProductionStatusSlider
                      workOrder={wo}
                      onStageChange={(newStage) => handleStageChange(wo, newStage)}
                      isUpdating={isActionLoading}
                      disabled={isCompleted}
                    />
                  </div>

                  {/* SISI KANAN: Aksi & Detail SPK */}
                  <div className="flex flex-row xl:flex-col items-center xl:items-end justify-between xl:justify-center gap-2 border-t xl:border-t-0 pt-3 xl:pt-0 border-slate-100 shrink-0">
                    {/* Tombol Lihat SPK / Detail Preview Gambar */}
                    <button
                      type="button"
                      onClick={() => setSelectedWO(wo)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>Detail SPK & Gambar</span>
                    </button>

                    {/* Tombol Aksi Cepat / Re-open */}
                    {!isCompleted ? (
                      <button
                        type="button"
                        onClick={(e) => handleQuickAdvance(wo, e)}
                        disabled={isActionLoading}
                        className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                          currNorm === 'Pengantaran'
                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                            : 'bg-[#E63946] hover:bg-red-600 shadow-red-500/20'
                        }`}
                      >
                        {isActionLoading ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Memproses...</span>
                          </>
                        ) : currNorm === 'Pengantaran' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Selesaikan & Arsipkan ✓</span>
                          </>
                        ) : (
                          <>
                            <span>Maju ke {nextStageName}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleReopen(wo, e)}
                        disabled={isActionLoading}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        title="Buka kembali pesanan ke antrean produksi aktif"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-500" />
                        <span>Buka Kembali</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ======================================================== */
          /* TAMPILAN KANBAN BOARD                                    */
          /* ======================================================== */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {STAGE_KEYS.map((stageKey) => {
              const cfg = STAGES_CONFIG[stageKey];
              const StageIcon = cfg.icon;
              const items = filteredOrders.filter(
                (wo) => normalizeStage(wo.tahap_sekarang) === stageKey
              );

              return (
                <div
                  key={stageKey}
                  className="bg-slate-50 rounded-3xl p-4 border border-slate-200/80 flex flex-col space-y-3 min-h-[500px]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-700">
                        <StageIcon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-800 text-xs">{cfg.title}</span>
                    </div>
                    <span className="text-xs font-black bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-700">
                      {items.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2.5 overflow-y-auto">
                    {items.length === 0 ? (
                      <div className="h-36 flex flex-col items-center justify-center text-slate-400 text-xs text-center border-2 border-dashed border-slate-200 rounded-2xl p-4">
                        <StageIcon className="w-6 h-6 mb-1 opacity-40" />
                        <span>Tidak ada SPK di tahap ini</span>
                      </div>
                    ) : (
                      items.map((wo, wIdx) => {
                        const firstImg = getFirstImage(wo);
                        return (
                          <div
                            key={wo.id ? `kanban-${stageKey}-${wo.id}-${wIdx}` : `kanban-${stageKey}-${wIdx}`}
                            className="bg-white rounded-2xl p-3.5 shadow-2xs border border-slate-200 space-y-2.5 hover:border-red-200 transition-all cursor-pointer"
                            onClick={() => setSelectedWO(wo)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-bold text-[#E63946] bg-red-50 px-2 py-0.5 rounded-full">
                                {wo.id}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {formatDateTime(wo.updated_at)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2.5">
                              {firstImg && (
                                <img
                                  src={firstImg}
                                  alt="Preview"
                                  className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 text-xs truncate">
                                  {wo.nama_klien}
                                </h4>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {wo.jumlah_pcs} Pcs • {wo.jenis_cetak || wo.tipe_grafis}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleQuickAdvance(wo, e)}
                              className="w-full py-1.5 rounded-xl bg-slate-100 hover:bg-[#E63946] hover:text-white text-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 transition-all"
                            >
                              <span>
                                {stageKey === 'Pengantaran' ? 'Selesaikan ✓' : 'Lanjut Tahap'}
                              </span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail SPK & Image Preview Modal */}
      <WorkOrderDetailModal
        workOrder={selectedWO}
        isOpen={!!selectedWO}
        onClose={() => setSelectedWO(null)}
      />
    </div>
  );
};
