import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { OrderItem, WorkOrder, ProductionStage } from '../types';
import { subscribeOrders, subscribeWorkOrders } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { exportOrdersToCsv } from '../utils/exportCsv';
import {
  TrendingUp,
  PackageCheck,
  Clock,
  CircleDollarSign,
  Printer,
  ShoppingBag,
  Cpu,
  Truck,
  Plus,
  ArrowRight,
  Sparkles,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Download,
} from 'lucide-react';

interface DashboardPageProps {
  onOpenNewOrder: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onOpenNewOrder }) => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubOrders = subscribeOrders((data) => {
      setOrders(data);
      setLoading(false);
    });

    const unsubWorkOrders = subscribeWorkOrders((data) => {
      setWorkOrders(data);
    });

    return () => {
      unsubOrders();
      unsubWorkOrders();
    };
  }, []);

  // Financial & Production Calculations
  const totalOrdersCount = orders.length;
  const activeOrders = orders.filter((o) => o.status === 'Diproses');
  const completedOrders = orders.filter((o) => o.status === 'Selesai');
  const waitingDpOrders = orders.filter((o) => o.status === 'Menunggu Pembayaran');

  const totalOmset = orders.reduce((sum, o) => sum + (o.total_harga || 0), 0);
  const totalDpReceived = orders.reduce((sum, o) => sum + (o.nominal_dp || 0), 0);

  // Estimasi keuntungan (Apparel average gross profit margin ~ 38%)
  const estimatedProfit = Math.round(totalOmset * 0.38);

  const totalPcsActive = activeOrders.reduce((sum, o) => sum + (o.jumlah_pcs || 0), 0);

  // 4 Stages Count from Work Orders
  const stageCounts: Record<ProductionStage, number> = {
    Printing: workOrders.filter((w) => w.tahap_sekarang === 'Printing' && !w.completed_at).length,
    Belanja: workOrders.filter((w) => w.tahap_sekarang === 'Belanja' && !w.completed_at).length,
    Produksi: workOrders.filter((w) => w.tahap_sekarang === 'Produksi' && !w.completed_at).length,
    Pengantaran: workOrders.filter((w) => w.tahap_sekarang === 'Pengantaran' && !w.completed_at).length,
  };

  // Breakdown by Print Type
  const dtfCount = orders.filter((o) => o.jenis_cetak === 'DTF').length;
  const manualCount = orders.filter((o) => o.jenis_cetak === 'Manual').length;
  const digitalCount = orders.filter((o) => o.jenis_cetak === 'Digital').length;

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

      <div className="px-4 py-5 space-y-4">
        {/* Quick CTA banner */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_10px_25px_-5px_rgba(230,57,70,0.12)] border border-red-100/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-50 text-[#E63946] flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Produksi Dadakan Siap Jalan</p>
              <p className="text-[11px] text-slate-500">
                {activeOrders.length} order aktif ({totalPcsActive} pcs sedang diproses)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => exportOrdersToCsv(orders)}
              title="Unduh Laporan Rekap Keuangan & Produksi"
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs p-2 sm:px-3 rounded-full flex items-center gap-1 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#E63946]" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>
            <button
              id="dashboard-new-order-cta"
              onClick={onOpenNewOrder}
              className="bg-[#E63946] hover:bg-red-600 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-full flex items-center gap-1 shadow-sm shadow-red-500/30 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Order Baru</span>
            </button>
          </div>
        </div>

        {/* Ringkasan Finansial & Keuntungan Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card Estimasi Keuntungan */}
          <div className="col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-4 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.25)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E63946]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Estimasi Keuntungan (Profit)
              </span>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                Margin ~38%
              </span>
            </div>
            <p className="text-2xl font-black font-['Outfit'] tracking-tight text-white">
              {formatRupiah(estimatedProfit)}
            </p>
            <div className="mt-3 pt-2.5 border-t border-slate-700/80 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Total Omset Pesanan:</span>
                <span className="font-bold text-slate-200">{formatRupiah(totalOmset)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Total DP Diterima:</span>
                <span className="font-bold text-emerald-400">{formatRupiah(totalDpReceived)}</span>
              </div>
            </div>
          </div>

          {/* Metric 1: Order Aktif */}
          <div className="bg-white rounded-3xl p-4 shadow-[0_10px_25px_-5px_rgba(230,57,70,0.12)] border border-red-100/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500">Order Aktif</span>
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl font-bold font-['Outfit'] text-slate-900">{activeOrders.length}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{totalPcsActive} pcs sedang diproses</p>
          </div>

          {/* Metric 2: Order Selesai */}
          <div className="bg-white rounded-3xl p-4 shadow-[0_10px_25px_-5px_rgba(230,57,70,0.12)] border border-red-100/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500">Order Selesai</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <PackageCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl font-bold font-['Outfit'] text-slate-900">{completedOrders.length}</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Tuntas & Terkirim</p>
          </div>
        </div>

        {/* 4 Tahap Antrean Produksi (Kanban Pipeline Overview) */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_10px_25px_-5px_rgba(230,57,70,0.12)] border border-red-100/50 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Alur 4 Tahap Produksi
              </h2>
              <p className="text-[11px] text-slate-400">Distribusi antrean work order saat ini</p>
            </div>
            <button
              onClick={() => navigate('/production')}
              className="text-[11px] font-bold text-[#E63946] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Buka Kanban</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Tahap 1: Printing */}
            <div
              onClick={() => navigate('/production')}
              className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 cursor-pointer hover:bg-amber-100/70 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-1">
                <Printer className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-black font-['Outfit'] bg-white px-2 py-0.5 rounded-full text-amber-800 border border-amber-200">
                  {stageCounts.Printing}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 leading-tight">1. Printing</p>
              <p className="text-[10px] text-slate-500">Cetak DTF / Sablon</p>
            </div>

            {/* Tahap 2: Logistik */}
            <div
              onClick={() => navigate('/production')}
              className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 cursor-pointer hover:bg-blue-100/70 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-1">
                <ShoppingBag className="w-4 h-4 text-blue-700" />
                <span className="text-xs font-black font-['Outfit'] bg-white px-2 py-0.5 rounded-full text-blue-800 border border-blue-200">
                  {stageCounts.Belanja}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 leading-tight">2. Logistik</p>
              <p className="text-[10px] text-slate-500">Bahan & Supplier</p>
            </div>

            {/* Tahap 3: Produksi */}
            <div
              onClick={() => navigate('/production')}
              className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 cursor-pointer hover:bg-emerald-100/70 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-1">
                <Cpu className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-black font-['Outfit'] bg-white px-2 py-0.5 rounded-full text-emerald-800 border border-emerald-200">
                  {stageCounts.Produksi}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 leading-tight">3. Produksi</p>
              <p className="text-[10px] text-slate-500">Press, QC, Packing</p>
            </div>

            {/* Tahap 4: Pengantaran */}
            <div
              onClick={() => navigate('/production')}
              className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3 cursor-pointer hover:bg-purple-100/70 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-1">
                <Truck className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-black font-['Outfit'] bg-white px-2 py-0.5 rounded-full text-purple-800 border border-purple-200">
                  {stageCounts.Pengantaran}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 leading-tight">4. Antar</p>
              <p className="text-[10px] text-slate-500">Kurir & Kirim</p>
            </div>
          </div>
        </div>

        {/* Breakdown Jenis Cetak Apparel */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_10px_25px_-5px_rgba(230,57,70,0.12)] border border-red-100/50 space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#E63946]" /> Komposisi Jenis Cetak
          </h2>

          <div className="space-y-2 text-xs">
            {/* DTF */}
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-slate-700">DTF (Direct to Film)</span>
                <span className="font-bold text-slate-900">{dtfCount} Order</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-[#E63946] h-2 rounded-full"
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
                  className="bg-amber-500 h-2 rounded-full"
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
                  className="bg-blue-500 h-2 rounded-full"
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
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-3xl p-4 space-y-2.5">
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
  );
};
