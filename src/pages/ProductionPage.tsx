import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { WorkOrder, ProductionStage, UserRole } from '../types';
import { subscribeWorkOrders, updateWorkOrderStage } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { WorkOrderDetailModal } from '../components/WorkOrderDetailModal';
import { playFeedbackSound } from '../utils/audio';
import {
  Printer,
  ShoppingBag,
  Cpu,
  Truck,
  ArrowRight,
  ArrowLeft,
  Building,
  CheckCircle2,
  Clock,
  Layers,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Filter,
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

const STAGE_KEYS: ProductionStage[] = ['Printing', 'Belanja', 'Produksi', 'Pengantaran'];

export const ProductionPage: React.FC = () => {
  const { userProfile, role } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode: 'board' (Kanban columns) or active stage focus tab
  const [activeTab, setActiveTab] = useState<ProductionStage | 'Semua'>('Semua');
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Realtime Firestore listener using onSnapshot
  useEffect(() => {
    const unsub = subscribeWorkOrders((data) => {
      setWorkOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleQuickAdvance = async (wo: WorkOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    const currIdx = STAGE_KEYS.indexOf(wo.tahap_sekarang);
    if (currIdx < STAGE_KEYS.length - 1) {
      const nextStage = STAGE_KEYS[currIdx + 1];
      setActionLoadingId(wo.id);
      try {
        await updateWorkOrderStage(wo.id, nextStage, userProfile?.nama || role, {
          catatan_tahap: `Maju ke tahap ${nextStage} via Quick Action`,
        });
        playFeedbackSound('advance');
      } catch (err) {
        console.error('Error quick advancing stage:', err);
      } finally {
        setActionLoadingId(null);
      }
    } else if (currIdx === STAGE_KEYS.length - 1 && !wo.completed_at) {
      // Complete
      setActionLoadingId(wo.id);
      try {
        await updateWorkOrderStage(wo.id, 'Pengantaran', userProfile?.nama || role, {
          isFinalComplete: true,
          catatan_tahap: 'Pesanan telah selesai & diantar ke klien.',
        });
        playFeedbackSound('complete');
        try {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        } catch (e) {}
      } catch (err) {
        console.error('Error completing:', err);
      } finally {
        setActionLoadingId(null);
      }
    }
  };

  // Group work orders by stage
  const getOrdersForStage = (st: ProductionStage) => {
    return workOrders.filter((w) => w.tahap_sekarang === st && !w.completed_at);
  };

  const completedOrders = workOrders.filter((w) => !!w.completed_at);

  return (
    <div id="production-kanban-page" className="w-full flex flex-col">
      <Header
        badge="Realtime Kanban onSnapshot"
        title="Antrean Produksi"
        subtitle="Monitor alur 4 tahap: Cetak, Belanja, Produksi & Antar"
      />

      <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
        {/* Stage Filter Switcher (Mobile friendly pill tabs + desktop overview) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setActiveTab('Semua')}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'Semua'
                  ? 'bg-[#E63946] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Semua Kolom ({workOrders.filter((w) => !w.completed_at).length})
            </button>

            {STAGE_KEYS.map((st) => {
              const count = getOrdersForStage(st).length;
              const isSelected = activeTab === st;
              const isUserRole = STAGES_CONFIG[st].roleMatch.includes(role);

              return (
                <button
                  key={st}
                  onClick={() => setActiveTab(st)}
                  className={`px-3 py-1.5 rounded-full font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#E63946] text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{st}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-white/30 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                  {isUserRole && role !== 'Admin' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" title="Tanggung jawab role Anda" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-1 text-slate-400 text-[11px] shrink-0 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#E63946]" />
            <span>Tampilan 4 Kolom Aktif</span>
          </div>
        </div>

        {/* Live Kanban Columns: Responsive Multi-Column Board on Desktop */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-xs">
            <div className="w-8 h-8 border-3 border-[#E63946] border-t-transparent rounded-full animate-spin mb-3" />
            <span>Menghubungkan ke antrean Firestore...</span>
          </div>
        ) : (
          <div className="space-y-6">
            <div
              className={`grid gap-4 sm:gap-5 ${
                activeTab === 'Semua'
                  ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
                  : 'grid-cols-1 max-w-2xl mx-auto'
              }`}
            >
              {STAGE_KEYS.filter((st) => activeTab === 'Semua' || activeTab === st).map((stageKey) => {
                const config = STAGES_CONFIG[stageKey];
                const stageOrders = getOrdersForStage(stageKey);
                const StageIcon = config.icon;
                const isMyRoleResponsibility = config.roleMatch.includes(role);

                return (
                  <div
                    key={stageKey}
                    id={`kanban-column-${stageKey.toLowerCase()}`}
                    className="bg-white rounded-3xl p-4 shadow-[0_10px_25px_-5px_rgba(230,57,70,0.12)] border border-red-100/50 flex flex-col justify-between"
                  >
                    <div>
                      {/* Column Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${config.badgeBg}`}>
                            <StageIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h2 className="font-bold text-sm text-slate-900 font-['Outfit']">
                                {config.title}
                              </h2>
                              {isMyRoleResponsibility && role !== 'Admin' && (
                                <span className="text-[9px] font-bold bg-[#E63946] text-white px-2 py-0.2 rounded-full">
                                  Divisi Anda
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1">{config.subtitle}</p>
                          </div>
                        </div>

                        <span className="text-xs font-black bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full border border-slate-200 shrink-0">
                          {stageOrders.length}
                        </span>
                      </div>

                      {/* Cards inside this stage */}
                      {stageOrders.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs bg-[#F8F5F2]/60 rounded-2xl border border-dashed border-slate-200">
                          <span>Tidak ada work order</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {stageOrders.map((wo) => {
                            const isActionLoading = actionLoadingId === wo.id;
                            const isLastStage = stageKey === 'Pengantaran';

                            return (
                              <div
                                key={wo.id}
                                id={`wo-card-${wo.id}`}
                                onClick={() => setSelectedWO(wo)}
                                className="bg-[#F8F5F2] hover:bg-slate-100/90 rounded-2xl p-3.5 border border-slate-200/80 transition-all shadow-2xs cursor-pointer relative group"
                              >
                                {/* WO Header */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-mono text-[11px] font-bold text-[#E63946] bg-white px-2 py-0.5 rounded-md border border-red-100 shrink-0">
                                      {wo.id}
                                    </span>
                                    <span className="text-xs font-bold text-slate-900 truncate">
                                      {wo.nama_klien}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 shrink-0 ml-1">
                                    {wo.jumlah_pcs}{' '}
                                    {wo.kategori_projek === 'grafis'
                                      ? wo.satuan_grafis || 'Pcs'
                                      : wo.kategori_projek === 'lainnya'
                                      ? wo.satuan_custom || 'Unit'
                                      : 'Pcs'}
                                  </span>
                                </div>

                                {/* Category Chip */}
                                <div className="mb-2">
                                  <span
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                      wo.kategori_projek === 'grafis'
                                        ? 'bg-blue-100 text-blue-800'
                                        : wo.kategori_projek === 'lainnya'
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-red-50 text-[#E63946]'
                                    }`}
                                  >
                                    {wo.kategori_projek === 'grafis'
                                      ? '🖨️ Grafis'
                                      : wo.kategori_projek === 'lainnya'
                                      ? '✨ Custom'
                                      : '👕 Apparel'}
                                  </span>
                                </div>

                                {/* Specs details */}
                                <div className="space-y-1 text-xs mb-2.5">
                                  {wo.kategori_projek === 'grafis' ? (
                                    <div className="flex flex-wrap gap-1">
                                      <span className="bg-blue-50 text-blue-700 font-bold text-[10px] px-2 py-0.5 rounded-md border border-blue-100">
                                        {wo.tipe_grafis || 'Cetak Grafis'}
                                      </span>
                                      <span className="bg-white text-slate-700 font-medium text-[10px] px-2 py-0.5 rounded-md border border-slate-200">
                                        {wo.bahan_cetak || wo.bahan_apparel}
                                      </span>
                                      {wo.dimensi_ukuran && (
                                        <span className="bg-white text-slate-700 font-medium text-[10px] px-2 py-0.5 rounded-md border border-slate-200">
                                          {wo.dimensi_ukuran}
                                        </span>
                                      )}
                                    </div>
                                  ) : wo.kategori_projek === 'lainnya' ? (
                                    <div className="space-y-1">
                                      <span className="bg-purple-50 text-purple-700 font-bold text-[10px] px-2 py-0.5 rounded-md border border-purple-100 inline-block">
                                        {wo.nama_item_custom || wo.bahan_apparel || 'Item Bebas'}
                                      </span>
                                      {wo.deskripsi_custom && (
                                        <p className="text-[10px] text-slate-600 line-clamp-1 italic">
                                          {wo.deskripsi_custom}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap gap-1">
                                      <span className="bg-red-50 text-[#E63946] font-bold text-[10px] px-2 py-0.5 rounded-md border border-red-100">
                                        {wo.jenis_cetak}
                                      </span>
                                      <span className="bg-white text-slate-700 font-medium text-[10px] px-2 py-0.5 rounded-md border border-slate-200">
                                        {wo.bahan_apparel}
                                      </span>
                                      <span className="bg-white text-slate-700 font-medium text-[10px] px-2 py-0.5 rounded-md border border-slate-200">
                                        {wo.warna_bahan}
                                      </span>
                                    </div>
                                  )}

                                  {/* Vendor info badge if present */}
                                  {wo.nama_vendor && (
                                    <div className="flex items-center gap-1 text-[11px] text-slate-600 bg-white/80 px-2 py-1 rounded-lg border border-slate-200/80 mt-1">
                                      <Building className="w-3 h-3 text-[#E63946] shrink-0" />
                                      <span className="truncate font-semibold">Vendor: {wo.nama_vendor}</span>
                                    </div>
                                  )}

                                  {wo.catatan_tahap && (
                                    <p className="text-[11px] text-slate-500 line-clamp-1 italic mt-0.5">
                                      "{wo.catatan_tahap}"
                                    </p>
                                  )}
                                </div>

                                {/* Card Footer with Deadline & Advance Button */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[11px]">
                                  <div className="flex items-center gap-1 text-slate-500">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>
                                      DL:{' '}
                                      <strong className="text-slate-700">
                                        {new Date(wo.deadline).toLocaleDateString('id-ID', {
                                          day: 'numeric',
                                          month: 'short',
                                        })}
                                      </strong>
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => handleQuickAdvance(wo, e)}
                                    disabled={isActionLoading}
                                    className={`px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer ${
                                      isLastStage
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        : 'bg-[#E63946] hover:bg-red-600 text-white'
                                    }`}
                                  >
                                    {isActionLoading ? (
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : isLastStage ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Selesai</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>Maju</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Completed Work Orders Archive */}
            {completedOrders.length > 0 && activeTab === 'Semua' && (
              <div className="bg-white rounded-3xl p-5 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.15)] border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 font-['Outfit']">
                        Work Order Selesai ({completedOrders.length})
                      </h3>
                      <p className="text-xs text-slate-400">Telah melewati seluruh 4 tahap & terkirim</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {completedOrders.map((wo) => (
                    <div
                      key={wo.id}
                      onClick={() => setSelectedWO(wo)}
                      className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200/60 flex items-center justify-between text-xs cursor-pointer hover:bg-emerald-50 transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-700">{wo.id}</span>
                          <span className="font-bold text-slate-900">{wo.nama_klien}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {wo.jenis_cetak} • {wo.jumlah_pcs} pcs • {wo.bahan_apparel}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">
                        SELESAI
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Work Order Detail & Progression Modal */}
      <WorkOrderDetailModal
        isOpen={!!selectedWO}
        workOrder={selectedWO}
        onClose={() => setSelectedWO(null)}
      />
    </div>
  );
};
