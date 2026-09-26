import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { OrderItem, UserRole, MaterialStock, WorkOrder } from '../types';
import { subscribeOrders, commitOrderToProduction, updateOrder, subscribeMaterialStocks, subscribeWorkOrders } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { InvoiceModal } from '../components/InvoiceModal';
import { NewOrderModal } from '../components/NewOrderModal';
import { EditOrderModal } from '../components/EditOrderModal';
import { OrderHppDetailModal } from '../components/finance/OrderHppDetailModal';
import { exportOrdersToCsv } from '../utils/exportCsv';
import { playFeedbackSound } from '../utils/audio';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Calendar,
  Play,
  ArrowRight,
  ShieldAlert,
  Edit3,
  Download,
  Check,
  Wallet,
  Banknote,
  List,
  LayoutGrid,
  Layers,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DeleteOrderModal } from '../components/DeleteOrderModal';

export const OrdersPage: React.FC = () => {
  const { userProfile, role, isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');
  const [viewMode, setViewMode] = useState<'rows' | 'grid'>('rows');

  // Modals state
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<OrderItem | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [hppDetailOrder, setHppDetailOrder] = useState<OrderItem | null>(null);
  const [availableStocks, setAvailableStocks] = useState<MaterialStock[]>([]);

  // Delete Order State
  const [orderToDelete, setOrderToDelete] = useState<OrderItem | null>(null);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);

  // Quick DP Update Dialog State
  const [dpDialogOrder, setDpDialogOrder] = useState<OrderItem | null>(null);
  const [dpInputVal, setDpInputVal] = useState<number>(0);
  const [dpUpdateLoading, setDpUpdateLoading] = useState(false);

  // Commit order loading & feedback
  const [commitLoadingId, setCommitLoadingId] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState<{ id: string; success?: string; error?: string } | null>(null);

  // Realtime Firestore subscription
  useEffect(() => {
    const unsubscribeOrders = subscribeOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    const unsubscribeStocks = subscribeMaterialStocks((stocks) => {
      setAvailableStocks(stocks);
    });
    const unsubscribeWO = subscribeWorkOrders((woList) => {
      setWorkOrders(woList);
    });
    return () => {
      unsubscribeOrders();
      unsubscribeStocks();
      unsubscribeWO();
    };
  }, []);

  // Handle edit or highlight query params from Invoice navigation
  useEffect(() => {
    const editId = searchParams.get('edit') || searchParams.get('highlight');
    if (editId && orders.length > 0) {
      const found = orders.find((o) => o.id === editId || o.invoice_no === editId);
      if (found) {
        if (searchParams.get('edit')) {
          setEditingOrder(found);
        }
      }
    }
  }, [searchParams, orders]);

  const handleCommitOrder = async (order: OrderItem) => {
    // DP requirement: minimum 70%
    const minDp = order.total_harga * 0.7;
    if (order.nominal_dp < minDp) {
      setCommitMessage({
        id: order.id,
        error: `DP belum mencukupi! Minimal 70% (${formatRupiah(minDp)}). Silakan perbarui DP klien terlebih dahulu.`,
      });
      return;
    }

    setCommitLoadingId(order.id);
    setCommitMessage(null);

    try {
      const res = await commitOrderToProduction(order, userProfile?.nama || role);
      if (res.success) {
        playFeedbackSound('advance');
        setCommitMessage({
          id: order.id,
          success: `Pesanan berhasil di-commit! Work Order ${res.workOrderId} telah masuk ke Tahap 1 (Printing).`,
        });

        // Trigger confetti for successful production dispatch
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
          });
        } catch (e) {}
      } else {
        setCommitMessage({
          id: order.id,
          error: res.message || 'Gagal memproses commit order.',
        });
      }
    } catch (err: any) {
      console.error('Error committing order:', err);
      setCommitMessage({
        id: order.id,
        error: err?.message || 'Terjadi kesalahan sistem saat commit order.',
      });
    } finally {
      setCommitLoadingId(null);
    }
  };

  const handleOpenDpDialog = (order: OrderItem) => {
    setDpDialogOrder(order);
    setDpInputVal(order.nominal_dp || 0);
  };

  const handleQuickPelunasan = async (order: OrderItem) => {
    try {
      await updateOrder(order.id, { nominal_dp: order.total_harga });
      playFeedbackSound('success');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (err) {
      console.error('Error proses pelunasan:', err);
    }
  };

  const handleSaveDp = async () => {
    if (!dpDialogOrder) return;
    setDpUpdateLoading(true);
    try {
      await updateOrder(dpDialogOrder.id, { nominal_dp: dpInputVal });
      playFeedbackSound('click');
      if (dpInputVal >= dpDialogOrder.total_harga) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
      setDpDialogOrder(null);
    } catch (err) {
      console.error('Error updating DP:', err);
    } finally {
      setDpUpdateLoading(false);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Map of completed work orders by order_id, invoice_no, or work_order_id
  const completedOrderMap = React.useMemo(() => {
    const set = new Set<string>();
    for (const wo of workOrders) {
      if (wo.completed_at) {
        if (wo.order_id) set.add(wo.order_id);
        if (wo.id) set.add(wo.id);
      }
    }
    return set;
  }, [workOrders]);

  const isOrderSelesai = (order: OrderItem) => {
    return (
      order.status === 'Selesai' ||
      completedOrderMap.has(order.id) ||
      (!!order.work_order_id && completedOrderMap.has(order.work_order_id)) ||
      (!!order.invoice_no && completedOrderMap.has(order.invoice_no))
    );
  };

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const isSelesai = isOrderSelesai(order);

    const matchesSearch =
      order.nama_klien.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.bahan_apparel && order.bahan_apparel.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.jenis_cetak && order.jenis_cetak.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.tipe_grafis && order.tipe_grafis.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.nama_item_custom && order.nama_item_custom.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'Semua'
        ? true
        : statusFilter === 'Selesai'
        ? isSelesai
        : statusFilter === 'Diproses'
        ? (order.status === 'Diproses' && !isSelesai)
        : order.status === statusFilter;

    const matchesCategory =
      categoryFilter === 'Semua'
        ? true
        : categoryFilter === 'Apparel'
        ? (order.kategori_projek || 'apparel') === 'apparel'
        : categoryFilter === 'Grafis'
        ? order.kategori_projek === 'grafis'
        : order.kategori_projek === 'lainnya';

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div id="orders-page" className="w-full flex flex-col">
      <Header
        badge="Realtime Firestore Sync"
        title="Daftar Pesanan"
        subtitle="Kelola invoice, validasi DP 70%, dan commit ke antrean produksi"
      />

      <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
        {/* Feedback Delete Toast Notification */}
        {deleteToast && (
          <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{deleteToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setDeleteToast(null)}
              className="text-slate-400 hover:text-white cursor-pointer px-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Control Toolbar: Search & Action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="search-orders-input"
              type="text"
              placeholder="Cari klien, invoice, bahan, produk grafis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200/80 rounded-full pl-9 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#E63946] shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => exportOrdersToCsv(filteredOrders)}
              title="Ekspor daftar pesanan ke format CSV Excel"
              className="px-3.5 py-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-[#E63946]" />
              <span>Ekspor CSV</span>
            </button>

            <button
              id="btn-open-new-order-modal"
              onClick={() => setIsNewOrderOpen(true)}
              className="bg-[#E63946] hover:bg-red-600 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-[0_8px_20px_-4px_rgba(230,57,70,0.4)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Order</span>
            </button>
          </div>
        </div>

        {/* Dual Filters: Kategori Projek & Status & Tampilan Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-1">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Kategori:</span>
            {[
              { id: 'Semua', label: 'Semua Kategori' },
              { id: 'Apparel', label: '👕 Apparel' },
              { id: 'Grafis', label: '🖨️ Grafis & Cetak' },
              { id: 'Lainnya', label: '✨ Order Bebas' },
            ].map((cat) => {
              const isSelected = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-full font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200/70 hover:bg-slate-50'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5">
            {/* Status Filters Pill Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">Status:</span>
              {['Semua', 'Menunggu Pembayaran', 'Diproses', 'Selesai'].map((st) => {
                const isSelected = statusFilter === st;
                return (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-full font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-[#E63946] text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200/70 hover:bg-slate-50'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>

            {/* Layout Toggle (Baris / Kotak) */}
            <div className="flex items-center bg-white p-0.5 rounded-full border border-slate-200/80 shadow-2xs text-xs shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('rows')}
                title="Tampilan Baris"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  viewMode === 'rows'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="text-[11px]">Baris</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Tampilan Kotak (Grid)"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="text-[11px]">Kotak</span>
              </button>
            </div>
          </div>
        </div>

        {/* Orders Responsive Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-xs">
            <div className="w-8 h-8 border-3 border-[#E63946] border-t-transparent rounded-full animate-spin mb-3" />
            <span>Memuat data pesanan Firestore...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/70 shadow-sm text-slate-500 max-w-lg mx-auto">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-bold text-slate-700">Tidak ada pesanan ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Coba ubah kata kunci pencarian Anda' : 'Klik tombol Tambah Order untuk membuat pesanan baru'}
            </p>
            <button
              onClick={() => setIsNewOrderOpen(true)}
              className="mt-5 inline-flex items-center gap-1.5 bg-[#E63946] text-white text-xs font-bold px-4 py-2.5 rounded-full cursor-pointer shadow-md shadow-red-500/25"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Pesanan Pertama</span>
            </button>
          </div>
        ) : viewMode === 'rows' ? (
          /* Tampilan Baris (Row-by-Row Layout) */
          <div className="space-y-3">
            {filteredOrders.map((order, oIdx) => {
              const minDpRequired = order.total_harga * 0.7;
              const dpPercent = Math.round((order.nominal_dp / (order.total_harga || 1)) * 100);
              const isDpEligibleForCommit = order.nominal_dp >= minDpRequired;
              const isSelesai = isOrderSelesai(order);
              const isCommitted = order.status === 'Diproses' || isSelesai;
              const isMsgForThis = commitMessage?.id === order.id;
              const sisaTagihan = Math.max(0, order.total_harga - (order.nominal_dp || 0));
              const isLunas = sisaTagihan === 0 && order.total_harga > 0;

              return (
                <div
                  key={order.id ? `order-row-${order.id}-${oIdx}` : `order-row-${oIdx}`}
                  id={`order-row-${order.id}`}
                  className="bg-white rounded-2xl p-4 sm:px-5 sm:py-4 shadow-xs hover:shadow-md border border-slate-200/80 hover:border-red-200 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-4 relative overflow-hidden"
                >
                  {/* Sisi Kiri: Identitas Pesanan, Klien & Spesifikasi */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Header kecil: Invoice, Tanggal, Kategori, Status */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#E63946] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">
                        {order.invoice_no}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {new Date(order.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.kategori_projek === 'grafis'
                            ? 'bg-blue-100 text-blue-800'
                            : order.kategori_projek === 'lainnya'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-red-50 text-[#E63946]'
                        }`}
                      >
                        {order.kategori_projek === 'grafis'
                          ? '🖨️ Percetakan Grafis'
                          : order.kategori_projek === 'lainnya'
                          ? '✨ Custom Order'
                          : '👕 Apparel'}
                      </span>
                      {isSelesai ? (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-3xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>✓ SELESAI</span>
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            order.status === 'Diproses'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-red-50 text-[#E63946] border-red-200'
                          }`}
                        >
                          {order.status}
                        </span>
                      )}
                    </div>

                    {/* Baris Nama Klien, Kuantitas & Deadline */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-bold text-slate-900 text-base font-['Outfit'] truncate max-w-sm">
                        {order.nama_klien}
                      </h3>
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg shrink-0">
                        {order.jumlah_pcs}{' '}
                        {order.kategori_projek === 'grafis'
                          ? order.satuan_grafis || 'Pcs'
                          : order.kategori_projek === 'lainnya'
                          ? order.satuan_custom || 'Unit'
                          : 'Pcs'}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Deadline:{' '}
                          <strong className="text-red-600">
                            {new Date(order.deadline).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Tags Spesifikasi Singkat */}
                    {order.kategori_projek === 'grafis' ? (
                      <div className="flex flex-wrap gap-1 text-[11px] text-slate-600">
                        <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md">
                          {order.tipe_grafis || 'Cetak Grafis'}
                        </span>
                        <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                          {order.bahan_cetak || order.bahan_apparel}
                        </span>
                        {order.dimensi_ukuran && (
                          <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                            {order.dimensi_ukuran}
                          </span>
                        )}
                        {order.finishing && (
                          <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                            {order.finishing}
                          </span>
                        )}
                      </div>
                    ) : order.kategori_projek === 'lainnya' ? (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                        <span className="bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-md">
                          {order.nama_item_custom || order.bahan_apparel || 'Item Bebas'}
                        </span>
                        {order.deskripsi_custom && (
                          <span className="text-[11px] text-slate-500 truncate max-w-md">
                            {order.deskripsi_custom}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 text-[11px] text-slate-600">
                        <span className="bg-red-50 text-[#E63946] font-bold px-2 py-0.5 rounded-md">
                          {order.jenis_cetak}
                        </span>
                        <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                          {order.bahan_apparel}
                        </span>
                        <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                          {order.warna_bahan}
                        </span>
                        {order.posisi_cetak && (
                          <span className="text-slate-500 text-[11px] ml-1">
                            Posisi: {order.posisi_cetak}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Feedback message if any */}
                    {isMsgForThis && (
                      <div
                        className={`p-2 rounded-xl text-xs flex items-center gap-2 ${
                          commitMessage.error
                            ? 'bg-red-50 border border-red-200 text-red-700'
                            : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        }`}
                      >
                        {commitMessage.error ? (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{commitMessage.error || commitMessage.success}</span>
                      </div>
                    )}
                  </div>

                  {/* Sisi Tengah: Finansial, DP & Sisa Pelunasan */}
                  <div className="bg-[#F8F5F2] p-3 rounded-xl border border-slate-200/70 text-xs w-full xl:w-[320px] shrink-0 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">Total Harga:</span>
                      <span className="font-bold text-slate-900 text-sm font-mono">
                        {formatRupiah(order.total_harga)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600 flex items-center gap-1">
                        <span>DP:</span>
                        <button
                          type="button"
                          onClick={() => handleOpenDpDialog(order)}
                          className="text-[#E63946] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                          title="Ubah Nominal DP"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Ubah</span>
                        </button>
                      </span>
                      <span
                        className={`font-bold font-mono ${
                          isLunas ? 'text-emerald-700' : isDpEligibleForCommit ? 'text-blue-700' : 'text-amber-700'
                        }`}
                      >
                        {formatRupiah(order.nominal_dp)} ({dpPercent}%)
                      </span>
                    </div>

                    {/* Sisa Tagihan & Tombol Lunaskan */}
                    <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200/70">
                      <span className="text-slate-600 font-medium">Sisa Pelunasan:</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold font-mono ${isLunas ? 'text-emerald-600' : 'text-[#B91C1C]'}`}>
                          {isLunas ? 'LUNAS (Rp 0)' : formatRupiah(sisaTagihan)}
                        </span>
                        {!isLunas && (
                          <button
                            type="button"
                            onClick={() => handleQuickPelunasan(order)}
                            title="Proses pelunasan langsung (100%)"
                            className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-0.5 cursor-pointer shadow-2xs transition-all active:scale-95"
                          >
                            <Check className="w-2.5 h-2.5" />
                            <span>Lunaskan</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mini Progress Bar */}
                    <div className="space-y-0.5 pt-0.5">
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                        <div
                          className={`h-full ${
                            isLunas
                              ? 'bg-emerald-500'
                              : isDpEligibleForCommit
                              ? 'bg-blue-600'
                              : 'bg-[#E63946]'
                          }`}
                          style={{ width: `${Math.min(100, dpPercent)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400">
                        <span>DP {dpPercent}%</span>
                        <span
                          className={`font-bold ${
                            isLunas
                              ? 'text-emerald-600'
                              : isDpEligibleForCommit
                              ? 'text-blue-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {isLunas
                            ? '✓ Lunas 100%'
                            : isDpEligibleForCommit
                            ? '✓ Syarat DP Terpenuhi'
                            : `Kurang ${formatRupiah(Math.max(0, minDpRequired - order.nominal_dp))} untuk 70%`}
                        </span>
                      </div>
                    </div>

                    {/* Ringkasan Finansial Internal & HPP (Hanya Admin / Keuangan) */}
                    {(isSuperAdmin || role === 'Admin' || role === 'super_admin' || role === 'Keuangan') && (
                      <div className="mt-2 pt-2 border-t border-slate-200/80 bg-white/90 p-2 rounded-xl text-[11px] space-y-1 shadow-2xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">HPP Modal:</span>
                          <span className="font-bold text-rose-600 font-mono">
                            {order.hpp ? formatRupiah(order.hpp) : 'Belum dihitung'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">Laba Kotor:</span>
                          <span
                            className={`font-bold font-mono ${
                              (order.laba_kotor ?? ((order.total_harga || 0) - (order.hpp || 0))) >= 0
                                ? 'text-emerald-700'
                                : 'text-rose-600'
                            }`}
                          >
                            {formatRupiah(order.laba_kotor ?? ((order.total_harga || 0) - (order.hpp || 0)))}
                            {order.margin_persen !== undefined && (
                              <span className="text-[10px] text-slate-500 font-normal ml-1">
                                ({order.margin_persen.toFixed(0)}%)
                              </span>
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHppDetailOrder(order)}
                          className="w-full mt-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Layers className="w-3 h-3 text-amber-600" />
                          <span>Kelola HPP & Bahan</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sisi Kanan: Tombol Aksi */}
                  <div className="flex sm:flex-row xl:flex-col items-stretch gap-1.5 w-full xl:w-[130px] shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-100">
                    <button
                      id={`btn-invoice-${order.id}`}
                      type="button"
                      onClick={() => setSelectedInvoiceOrder(order)}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span>Invoice</span>
                    </button>

                    <div className="flex items-center gap-1.5 w-full">
                      <button
                        id={`btn-edit-${order.id}`}
                        type="button"
                        onClick={() => setEditingOrder(order)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                        title="Edit pesanan"
                      >
                        <Edit3 className="w-3.5 h-3.5 shrink-0" />
                        <span>Edit</span>
                      </button>

                      <button
                        id={`btn-delete-${order.id}`}
                        type="button"
                        onClick={() => setOrderToDelete(order)}
                        className="py-1.5 px-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80 font-bold text-xs flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        title="Hapus pesanan beserta data keuangan & produksi terkait"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </div>

                    {!isCommitted ? (
                      <button
                        id={`btn-commit-${order.id}`}
                        type="button"
                        onClick={() => handleCommitOrder(order)}
                        disabled={!isDpEligibleForCommit || commitLoadingId === order.id}
                        className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                          isDpEligibleForCommit
                            ? 'bg-[#E63946] hover:bg-red-600 text-white shadow-red-500/25 active:scale-95'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                        }`}
                      >
                        {commitLoadingId === order.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                            <span>{isDpEligibleForCommit ? 'Commit' : 'DP < 70%'}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div
                        className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs ${
                          isSelesai
                            ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                            : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        }`}
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isSelesai ? 'text-white' : 'text-emerald-600'} shrink-0`} />
                        <span>{isSelesai ? 'Selesai ✓' : 'Produksi'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Tampilan Kotak (Grid Layout) */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {filteredOrders.map((order, oIdx) => {
              const minDpRequired = order.total_harga * 0.7;
              const dpPercent = Math.round((order.nominal_dp / (order.total_harga || 1)) * 100);
              const isDpEligibleForCommit = order.nominal_dp >= minDpRequired;
              const isSelesai = isOrderSelesai(order);
              const isCommitted = order.status === 'Diproses' || isSelesai;
              const isMsgForThis = commitMessage?.id === order.id;

              return (
                <div
                  key={order.id ? `order-card-${order.id}-${oIdx}` : `order-card-${oIdx}`}
                  id={`order-card-${order.id}`}
                  className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_10px_25px_-5px_rgba(230,57,70,0.12)] border border-red-100/40 relative overflow-hidden transition-all hover:border-red-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Status Banner */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#E63946] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">
                          {order.invoice_no}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {new Date(order.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isSelesai ? (
                          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-3xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>✓ SELESAI</span>
                          </span>
                        ) : (
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                              order.status === 'Diproses'
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-red-50 text-[#E63946] border-red-200'
                            }`}
                          >
                            {order.status}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setOrderToDelete(order)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Hapus pesanan & data terkait"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Client & Specs info */}
                    <div className="space-y-1.5 mb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm font-['Outfit']">{order.nama_klien}</h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              order.kategori_projek === 'grafis'
                                ? 'bg-blue-100 text-blue-800'
                                : order.kategori_projek === 'lainnya'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-red-50 text-[#E63946]'
                            }`}
                          >
                            {order.kategori_projek === 'grafis'
                              ? '🖨️ Percetakan Grafis'
                              : order.kategori_projek === 'lainnya'
                              ? '✨ Custom Order'
                              : '👕 Apparel & Baju'}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">
                          {order.jumlah_pcs}{' '}
                          {order.kategori_projek === 'grafis'
                            ? order.satuan_grafis || 'Pcs'
                            : order.kategori_projek === 'lainnya'
                            ? order.satuan_custom || 'Unit'
                            : 'Pcs'}
                        </span>
                      </div>

                      {order.kategori_projek === 'grafis' ? (
                        <div className="flex flex-wrap gap-1 text-[11px] text-slate-600">
                          <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md">
                            {order.tipe_grafis || 'Cetak Grafis'}
                          </span>
                          <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                            {order.bahan_cetak || order.bahan_apparel}
                          </span>
                          {order.dimensi_ukuran && (
                            <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                              {order.dimensi_ukuran}
                            </span>
                          )}
                          {order.finishing && (
                            <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                              {order.finishing}
                            </span>
                          )}
                        </div>
                      ) : order.kategori_projek === 'lainnya' ? (
                        <div className="space-y-1 text-[11px] text-slate-600">
                          <span className="bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-md inline-block">
                            {order.nama_item_custom || order.bahan_apparel || 'Item Bebas'}
                          </span>
                          {order.deskripsi_custom && (
                            <p className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              {order.deskripsi_custom}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1 text-[11px] text-slate-600">
                          <span className="bg-red-50 text-[#E63946] font-bold px-2 py-0.5 rounded-md">
                            {order.jenis_cetak}
                          </span>
                          <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                            {order.bahan_apparel}
                          </span>
                          <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                            {order.warna_bahan}
                          </span>
                        </div>
                      )}

                      {order.posisi_cetak && order.kategori_projek === 'apparel' && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          Posisi: <span className="text-slate-700">{order.posisi_cetak}</span>
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Deadline:{' '}
                          <strong className="text-red-600">
                            {new Date(order.deadline).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Financial & DP Progress Section */}
                    {(() => {
                      const sisaTagihan = Math.max(0, order.total_harga - (order.nominal_dp || 0));
                      const isLunas = sisaTagihan === 0 && order.total_harga > 0;

                      return (
                        <div className="bg-[#F8F5F2] p-3 rounded-2xl mb-3 space-y-2 border border-slate-200/60 text-xs">
                          <div className="flex justify-between font-semibold">
                            <span className="text-slate-600">Total Harga:</span>
                            <span className="font-bold text-slate-900">{formatRupiah(order.total_harga)}</span>
                          </div>

                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-600 flex items-center gap-1">
                              <span>DP Terbayar:</span>
                              <button
                                type="button"
                                onClick={() => handleOpenDpDialog(order)}
                                className="text-[#E63946] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                                title="Ubah Nominal DP"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Ubah DP</span>
                              </button>
                            </span>
                            <span
                              className={`font-bold ${
                                isLunas
                                  ? 'text-emerald-700'
                                  : isDpEligibleForCommit
                                  ? 'text-blue-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {formatRupiah(order.nominal_dp)} ({dpPercent}%)
                            </span>
                          </div>

                          {/* Sisa Tagihan & Quick Pelunasan Button */}
                          <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200/70">
                            <span className="text-slate-600 font-medium">Sisa Pelunasan:</span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-bold font-mono ${
                                  isLunas ? 'text-emerald-600' : 'text-[#B91C1C]'
                                }`}
                              >
                                {isLunas ? 'LUNAS (Rp 0)' : formatRupiah(sisaTagihan)}
                              </span>
                              {!isLunas && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickPelunasan(order)}
                                  title="Proses pelunasan langsung (100%)"
                                  className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-0.5 cursor-pointer shadow-2xs transition-all active:scale-95"
                                >
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Lunaskan</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Visual DP Progress Bar */}
                          <div className="space-y-0.5 pt-0.5">
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                              <div
                                className={`h-full ${
                                  isLunas
                                    ? 'bg-emerald-500'
                                    : isDpEligibleForCommit
                                    ? 'bg-blue-600'
                                    : 'bg-[#E63946]'
                                }`}
                                style={{ width: `${Math.min(100, dpPercent)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-400">
                              <span>DP {dpPercent}%</span>
                              <span
                                className={`font-bold ${
                                  isLunas
                                    ? 'text-emerald-600'
                                    : isDpEligibleForCommit
                                    ? 'text-blue-600'
                                    : 'text-amber-600'
                                }`}
                              >
                                {isLunas
                                  ? '✓ Pembayaran Lunas 100%'
                                  : isDpEligibleForCommit
                                  ? '✓ Syarat DP Terpenuhi'
                                  : `Kurang ${formatRupiah(Math.max(0, minDpRequired - order.nominal_dp))} untuk 70%`}
                              </span>
                            </div>
                          </div>

                          {/* Ringkasan Finansial Internal & HPP (Hanya Admin / Keuangan) */}
                          {(isSuperAdmin || role === 'Admin' || role === 'super_admin' || role === 'Keuangan') && (
                            <div className="mt-2 pt-2 border-t border-slate-200/80 bg-white/90 p-2.5 rounded-xl text-[11px] space-y-1 shadow-2xs">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium">HPP Modal:</span>
                                <span className="font-bold text-rose-600 font-mono">
                                  {order.hpp ? formatRupiah(order.hpp) : 'Belum dihitung'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 font-medium">Laba Kotor:</span>
                                <span
                                  className={`font-bold font-mono ${
                                    (order.laba_kotor ?? ((order.total_harga || 0) - (order.hpp || 0))) >= 0
                                      ? 'text-emerald-700'
                                      : 'text-rose-600'
                                  }`}
                                >
                                  {formatRupiah(order.laba_kotor ?? ((order.total_harga || 0) - (order.hpp || 0)))}
                                  {order.margin_persen !== undefined && (
                                    <span className="text-[10px] text-slate-500 font-normal ml-1">
                                      ({order.margin_persen.toFixed(0)}%)
                                    </span>
                                  )}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setHppDetailOrder(order)}
                                className="w-full mt-1.5 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                              >
                                <Layers className="w-3 h-3 text-amber-600" />
                                <span>Kelola HPP & Bahan</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Feedback Message */}
                    {isMsgForThis && (
                      <div
                        className={`mb-3 p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                          commitMessage.error
                            ? 'bg-red-50 border border-red-200 text-red-700'
                            : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        }`}
                      >
                        {commitMessage.error ? (
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <span>{commitMessage.error || commitMessage.success}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons: Edit, Invoice, Hapus & Commit Order */}
                  <div className="grid grid-cols-12 gap-1.5 pt-2 border-t border-slate-100 mt-2">
                    {/* Edit Pesanan */}
                    <button
                      id={`btn-edit-${order.id}`}
                      type="button"
                      onClick={() => setEditingOrder(order)}
                      className="col-span-3 py-2 px-1 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                      title="Edit rincian data & ukuran pesanan"
                    >
                      <Edit3 className="w-3.5 h-3.5 shrink-0" />
                      <span>Edit</span>
                    </button>

                    {/* Buat / Lihat Invoice */}
                    <button
                      id={`btn-invoice-${order.id}`}
                      type="button"
                      onClick={() => setSelectedInvoiceOrder(order)}
                      className="col-span-3 py-2 px-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Invoice</span>
                    </button>

                    {/* Hapus Pesanan */}
                    <button
                      id={`btn-delete-${order.id}`}
                      type="button"
                      onClick={() => setOrderToDelete(order)}
                      className="col-span-2 py-2 px-1 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80 font-bold text-xs flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      title="Hapus pesanan & data terkait"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    </button>

                    {/* Commit Order (With mandatory DP >= 70% React validation) */}
                    {!isCommitted ? (
                      <button
                        id={`btn-commit-${order.id}`}
                        type="button"
                        onClick={() => handleCommitOrder(order)}
                        disabled={!isDpEligibleForCommit || commitLoadingId === order.id}
                        title={
                           !isDpEligibleForCommit
                            ? `Tidak dapat commit: DP kurang dari 70% (${formatRupiah(minDpRequired)})`
                            : 'Commit pesanan ke antrean produksi'
                        }
                        className={`col-span-4 py-2 px-1 rounded-full font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm ${
                          isDpEligibleForCommit
                            ? 'bg-[#E63946] hover:bg-red-600 text-white shadow-red-500/30 active:scale-95'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                        }`}
                      >
                        {commitLoadingId === order.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                            <span className="truncate">
                              {isDpEligibleForCommit ? 'Commit' : 'DP < 70%'}
                            </span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div
                        className={`col-span-4 py-2 px-1 rounded-full font-bold text-[11px] flex items-center justify-center gap-1 truncate shadow-2xs ${
                          isSelesai
                            ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                            : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        }`}
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isSelesai ? 'text-white' : 'text-emerald-600'} shrink-0`} />
                        <span className="truncate">{isSelesai ? 'Selesai ✓' : 'Produksi'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Order Modal */}
      <NewOrderModal isOpen={isNewOrderOpen} onClose={() => setIsNewOrderOpen(false)} />

      {/* Edit Order Modal */}
      <EditOrderModal
        isOpen={!!editingOrder}
        order={editingOrder}
        onClose={() => {
          setEditingOrder(null);
          setSearchParams({});
        }}
        onSuccess={() => {
          setEditingOrder(null);
          setSearchParams({});
        }}
      />

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={!!selectedInvoiceOrder}
        order={selectedInvoiceOrder}
        onClose={() => setSelectedInvoiceOrder(null)}
        onOrderUpdated={(updated) =>
          setSelectedInvoiceOrder((prev) => (prev ? { ...prev, ...updated } : null))
        }
      />

      {/* Modal Quick Update DP */}
      {dpDialogOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDpDialogOrder(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-sm text-slate-900 mb-1">Update Pembayaran / Pelunasan</h3>
            <p className="text-xs text-slate-500 mb-3">
              {dpDialogOrder.nama_klien} ({dpDialogOrder.invoice_no}) • Total: {formatRupiah(dpDialogOrder.total_harga)}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nominal Terbayar (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={dpInputVal || ''}
                  onChange={(e) => setDpInputVal(Number(e.target.value))}
                  placeholder="Contoh: 1500000"
                  className="w-full bg-[#F8F5F2] border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#E63946]"
                />
              </div>

              {/* Sisa yang belum terbayar info */}
              <div className="flex justify-between items-center text-[11px] px-1 font-medium">
                <span className="text-slate-500">Sisa Pelunasan:</span>
                <span className={`font-bold font-mono ${dpInputVal >= dpDialogOrder.total_harga ? 'text-emerald-600' : 'text-[#B91C1C]'}`}>
                  {dpInputVal >= dpDialogOrder.total_harga
                    ? 'Lunas 100%'
                    : formatRupiah(Math.max(0, dpDialogOrder.total_harga - dpInputVal))}
                </span>
              </div>

              {/* Quick Percentage Chips */}
              <div className="flex gap-2">
                {[50, 70].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDpInputVal(Math.round((dpDialogOrder.total_harga * pct) / 100))}
                    className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700 cursor-pointer"
                  >
                    DP {pct}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDpInputVal(dpDialogOrder.total_harga)}
                  className="flex-1 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-[11px] font-bold text-emerald-800 cursor-pointer flex items-center justify-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Lunas (100%)</span>
                </button>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDpDialogOrder(null)}
                  className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveDp}
                  disabled={dpUpdateLoading}
                  className="flex-1 py-2.5 rounded-full bg-[#E63946] hover:bg-red-600 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  {dpUpdateLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Internal Order HPP & Cost Detail Modal */}
      <OrderHppDetailModal
        isOpen={Boolean(hppDetailOrder)}
        onClose={() => setHppDetailOrder(null)}
        order={hppDetailOrder}
        availableStocks={availableStocks}
        userName={userProfile?.nama || role}
      />

      {/* Delete Order Confirmation & Cascading Removal Modal */}
      <DeleteOrderModal
        isOpen={Boolean(orderToDelete)}
        order={orderToDelete}
        onClose={() => setOrderToDelete(null)}
        onDeleted={(result) => {
          setDeleteToast(
            `Pesanan #${orderToDelete?.invoice_no} (${orderToDelete?.nama_klien}) berhasil dihapus beserta data produksi (SPK: ${result.deletedWorkOrdersCount}), keuangan (pembayaran: ${result.deletedPaymentsCount}, biaya vendor: ${result.deletedProductionCostsCount}), dan pemakaian bahan (${result.deletedMaterialUsagesCount}).`
          );
          setOrderToDelete(null);
          setTimeout(() => setDeleteToast(null), 6000);
        }}
      />
    </div>
  );
};
