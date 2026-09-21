import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { OrderItem, WorkOrder, ProductionStage } from '../types';
import { subscribeOrders, subscribeWorkOrders } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { exportOrdersToCsv } from '../utils/exportCsv';
import {
  TrendingUp,
  PackageCheck,
  Clock,
  Printer,
  ShoppingBag,
  Cpu,
  Truck,
  ArrowRight,
  Plus,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Download,
  Sparkles,
} from 'lucide-react';

interface DashboardPageProps {
  onOpenNewOrder?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onOpenNewOrder }) => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { success, info } = useToast();

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Realtime subscription to Firestore collections
  useEffect(() => {
    const unsubOrders = subscribeOrders((data) => {
      setOrders(data);
      setLoading(false);
    });

    const unsubWO = subscribeWorkOrders((data) => {
      setWorkOrders(data);
    });

    return () => {
      unsubOrders();
      unsubWO();
    };
  }, []);

  const handleExportCsv = () => {
    if (orders.length === 0) {
      info('Data Kosong', 'Belum ada data pesanan untuk diekspor.');
      return;
    }
    exportOrdersToCsv(orders);
    success('Ekspor Berhasil', `${orders.length} data pesanan telah diunduh ke file CSV.`);
  };

  // Compute key financial and production metrics
  const totalOmset = orders.reduce((acc, curr) => acc + (curr.total_biaya || 0), 0);
  const totalDpReceived = orders.reduce((acc, curr) => acc + (curr.nominal_dp || 0), 0);

  // Estimasi keuntungan kasar ~35-40% dari total omset produksi apparel
  const estimatedProfit = Math.round(totalOmset * 0.38);

  const activeOrders = orders.filter((o) => o.status === 'Diproses' || o.status === 'Menunggu Pembayaran');
  const completedOrders = orders.filter((o) => o.status === 'Selesai');
  const waitingDpOrders = orders.filter((o) => (o.nominal_dp || 0) < o.total_biaya * 0.7 && o.status !== 'Selesai');

  // Breakdown stages in WorkOrders
  const stageCounts: Record<ProductionStage, number> = {
    Printing: workOrders.filter((w) => w.tahap_sekarang === 'Printing' && !w.completed_at).length,
    Belanja: workOrders.filter((w) => w.tahap_sekarang === 'Belanja' && !w.completed_at).length,
    Produksi: workOrders.filter((w) => w.tahap_sekarang === 'Produksi' && !w.completed_at).length,
    Pengantaran: workOrders.filter((w) => w.tahap_sekarang === 'Pengantaran' && !w.completed_at).length,
  };

  const totalPcsActive = activeOrders.reduce((acc, o) => acc + (o.jumlah_pcs || 0), 0);

  // Printing type breakdown
  const dtfCount = orders.filter((o) => o.jenis_cetak === 'DTF').length;
  const manualCount = orders.filter((o) => o.jenis_cetak === 'Sablon Manual').length;
  const digitalCount = orders.filter((o) => o.jenis_cetak === 'Digital').length;
  const totalOrdersCount = orders.length || 1;

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div id="dashboard-page" className="w-full flex flex-col">
      <Header
        badge="Realtime Firestore ERP"
        title="Ringkasan Produksi"
        subtitle="Pantau omset, laba, dan antrean 4 tahap cetak apparel"
      />

      <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
        {/* Quick CTA banner */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_10px_25px_-5px_rgba(230,57,70,0.12)] border border-red-100/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#E63946] flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Produksi Dadakan Siap Jalan</p>
              <p className="text-xs text-slate-500">
                {activeOrders.length} order aktif ({totalPcsActive} pcs sedang diproses di workshop)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleExportCsv}
              title="Unduh Laporan Rekap Keuangan & Produksi"
              className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs py-2 px-3.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-[#E63946]" />
              <span>Ekspor CSV</span>
            </button>
            {onOpenNewOrder && (
              <button
                id="dashboard-new-order-cta"
                onClick={onOpenNewOrder}
                className="bg-[#E63946] hover:bg-red-600 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-sm shadow-red-500/30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Order Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* Ringkasan Finansial & Keuntungan Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Card Estimasi Keuntungan (Spans 2 cols on md/lg) */}
          <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.25)] relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#E63946]/20 rounded-full blur-3xl pointer-events-none" />
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Estimasi Keuntungan (Gross Profit)
                </span>
                <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                  Margin ~38%
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black font-['Outfit'] tracking-tight text-white mt-1">
                {formatRupiah(estimatedProfit)}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/80 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Omset Pesanan:</span>
                <span className="font-bold text-base text-slate-200">{formatRupiah(totalOmset)}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Total DP Diterima:</span>
                <span className="font-bold text-base text-emerald-400">{formatRupiah(totalDpReceived)}</span>
              </div>
            </div>
          </div>

          {/* Metric 1: Order Aktif */}
          <div className="bg-white rounded-3xl p-5 shadow-[0_10px_25px_-5px_rgba(230,57,70,0.12)] border border-red-100/50 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order Aktif</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold font-['Outfit'] text-slate-900">{activeOrders.length}</p>
              <p className="text-xs text-slate-400 mt-1">{totalPcsActive} pcs sedang diproses</p>
            </div>
          </div>

          {/* Metric 2: Order Selesai */}
          <div className="bg-white rounded-3xl p-5 shadow-[0_10px_25px_-5px_rgba(230,57,70,0.12)] border border-red-100/50 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order Selesai</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <PackageCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold font-['Outfit'] text-slate-900">{completedOrders.length}</p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">Tuntas & Terkirim</p>
            </div>
          </div>
        </div>

        {/* Responsive Two-Column Layout on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 4 Tahap Antrean Produksi (Spans 7 cols on lg) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-5 shadow-[0_10px_25px_-5px_rgba(230,57,70,0.12)] border border-red-100/50 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Alur 4 Tahap Produksi
                </h2>
                <p className="text-xs text-slate-400">Distribusi antrean work order saat ini</p>
              </div>
              <button
                onClick={() => navigate('/production')}
                className="text-xs font-bold text-[#E63946] hover:underline flex items-center gap-1 cursor-pointer bg-red-50 hover:bg-red-100/80 px-3 py-1.5 rounded-full transition-all"
              >
                <span>Buka Kanban</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Tahap 1: Printing */}
              <div
                onClick={() => navigate('/production')}
                className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 cursor-pointer hover:bg-amber-100/70 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <Printer className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-black font-['Outfit'] bg-white px-2 py-0.5 rounded-full text-amber-800 border border-amber-200">
                    {stageCounts.Printing}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 leading-tight">1. Printing</p>
                <p className="text-[11px] text-slate-500">Cetak DTF / Sablon</p>
              </div>

              {/* Tahap 2: Logistik */}
              <div
                onClick={() => navigate('/production')}
                className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 cursor-pointer hover:bg-blue-100/70 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <ShoppingBag className="w-4 h-4 text-blue-700" />
                  <span className="text-xs font-black font-['Outfit'] bg-white px-2 py-0.5 rounded-full text-blue-800 border border-blue-200">
                    {stageCounts.Belanja}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 leading-tight">2. Logistik</p>
                <p className="text-[11px] text-slate-500">Bahan & Supplier</p>
              </div>

              {/* Tahap 3: Produksi */}
              <div
                onClick={() => navigate('/production')}
                className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 cursor-pointer hover:bg-emerald-100/70 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <Cpu className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-black font-['Outfit'] bg-white px-2 py-0.5 rounded-full text-emerald-800 border border-emerald-200">
                    {stageCounts.Produksi}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 leading-tight">3. Produksi</p>
                <p className="text-[11px] text-slate-500">Press, QC, Pack</p>
              </div>

              {/* Tahap 4: Pengantaran */}
              <div
                onClick={() => navigate('/production')}
                className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 cursor-pointer hover:bg-purple-100/70 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <Truck className="w-4 h-4 text-purple-700" />
                  <span className="text-xs font-black font-['Outfit'] bg-white px-2 py-0.5 rounded-full text-purple-800 border border-purple-200">
                    {stageCounts.Pengantaran}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 leading-tight">4. Antar</p>
                <p className="text-[11px] text-slate-500">Kurir & Kirim</p>
              </div>
            </div>
          </div>

          {/* Breakdown & Alerts (Spans 5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Breakdown Jenis Cetak Apparel */}
            <div className="bg-white rounded-3xl p-5 shadow-[0_10px_25px_-5px_rgba(230,57,70,0.12)] border border-red-100/50 space-y-3">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#E63946]" /> Komposisi Jenis Cetak
              </h2>

              <div className="space-y-2.5 text-xs">
                {/* DTF */}
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-700">DTF (Direct to Film)</span>
                    <span className="font-bold text-slate-900">{dtfCount} Order</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-[#E63946] h-2 rounded-full transition-all"
                      style={{
                        width: `${totalOrdersCount > 0 ? (dtfCount / totalOrdersCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Sablon Manual */}
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-700">Sablon Manual (Rubber/Plastisol)</span>
                    <span className="font-bold text-slate-900">{manualCount} Order</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${totalOrdersCount > 0 ? (manualCount / totalOrdersCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Digital */}
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-700">Digital DTG / Sublimasi</span>
                    <span className="font-bold text-slate-900">{digitalCount} Order</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${totalOrdersCount > 0 ? (digitalCount / totalOrdersCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pesanan Butuh Perhatian (DP < 70% atau Menunggu Pembayaran) */}
            {waitingDpOrders.length > 0 && (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-3xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs font-bold text-amber-900">
                    {waitingDpOrders.length} Pesanan Menunggu DP 70%
                  </p>
                </div>
                <p className="text-[11px] text-amber-800">
                  Pesanan belum dapat di-commit ke antrean produksi karena DP belum mencapai ambang batas minimal 70%.
                </p>
                <button
                  onClick={() => navigate('/orders')}
                  className="text-xs font-bold text-amber-900 bg-white px-3 py-1.5 rounded-full border border-amber-300 hover:bg-amber-100 transition-all flex items-center gap-1 cursor-pointer w-fit"
                >
                  <span>Buka Manajemen Pesanan</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
