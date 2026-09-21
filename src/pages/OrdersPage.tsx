import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { OrderItem, UserRole } from '../types';
import { subscribeOrders, commitOrderToProduction, updateOrder } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { InvoiceModal } from '../components/InvoiceModal';
import { NewOrderModal } from '../components/NewOrderModal';
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
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const OrdersPage: React.FC = () => {
  const { userProfile, role } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');

  // Modals state
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<OrderItem | null>(null);

  // Quick DP Update Dialog State
  const [dpDialogOrder, setDpDialogOrder] = useState<OrderItem | null>(null);
  const [dpInputVal, setDpInputVal] = useState<number>(0);
  const [dpUpdateLoading, setDpUpdateLoading] = useState(false);

  // Commit order loading & feedback
  const [commitLoadingId, setCommitLoadingId] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState<{ id: string; success?: string; error?: string } | null>(null);

  // Realtime Firestore subscription
  useEffect(() => {
    const unsubscribe = subscribeOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  const handleSaveDp = async () => {
    if (!dpDialogOrder) return;
    setDpUpdateLoading(true);
    try {
      await updateOrder(dpDialogOrder.id, { nominal_dp: dpInputVal });
      playFeedbackSound('click');
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

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.nama_klien.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.bahan_apparel && order.bahan_apparel.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.jenis_cetak && order.jenis_cetak.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.tipe_grafis && order.tipe_grafis.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.nama_item_custom && order.nama_item_custom.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'Semua' ? true : order.status === statusFilter;

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

        {/* Dual Filters: Kategori Projek & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
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

          {/* Status Filters Pill Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Status:</span>
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {filteredOrders.map((order) => {
              const minDpRequired = order.total_harga * 0.7;
              const dpPercent = Math.round((order.nominal_dp / (order.total_harga || 1)) * 100);
              const isDpEligibleForCommit = order.nominal_dp >= minDpRequired;
              const isCommitted = order.status === 'Diproses' || order.status === 'Selesai';
              const isMsgForThis = commitMessage?.id === order.id;

              return (
                <div
                  key={order.id}
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

                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          order.status === 'Selesai'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : order.status === 'Diproses'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-red-50 text-[#E63946] border-red-200'
                        }`}
                      >
                        {order.status}
                      </span>
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
                            isDpEligibleForCommit ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {formatRupiah(order.nominal_dp)} ({dpPercent}%)
                        </span>
                      </div>

                      {/* Visual DP Progress Bar */}
                      <div className="space-y-0.5">
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                          <div
                            className={`h-full ${isDpEligibleForCommit ? 'bg-emerald-500' : 'bg-[#E63946]'}`}
                            style={{ width: `${Math.min(100, dpPercent)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-400">
                          <span>DP {dpPercent}%</span>
                          <span
                            className={`font-bold ${
                              isDpEligibleForCommit ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {isDpEligibleForCommit ? '✓ Syarat 70% Terpenuhi' : `Kurang ${formatRupiah(Math.max(0, minDpRequired - order.nominal_dp))} untuk 70%`}
                          </span>
                        </div>
                      </div>
                    </div>

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

                  {/* Action Buttons: Buat Invoice & Commit Order */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 mt-2">
                    {/* Buat / Lihat Invoice */}
                    <button
                      id={`btn-invoice-${order.id}`}
                      type="button"
                      onClick={() => setSelectedInvoiceOrder(order)}
                      className="py-2.5 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Invoice</span>
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
                        className={`py-2.5 px-3 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                          isDpEligibleForCommit
                            ? 'bg-[#E63946] hover:bg-red-600 text-white shadow-red-500/30 active:scale-95'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                        }`}
                      >
                        {commitLoadingId === order.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>
                              {isDpEligibleForCommit ? 'Commit Order' : 'DP < 70%'}
                            </span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="py-2 px-3 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px] flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{order.status === 'Selesai' ? 'Selesai' : 'Dalam Produksi'}</span>
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

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={!!selectedInvoiceOrder}
        order={selectedInvoiceOrder}
        onClose={() => setSelectedInvoiceOrder(null)}
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
            <h3 className="font-bold text-sm text-slate-900 mb-1">Update Pembayaran DP</h3>
            <p className="text-xs text-slate-500 mb-3">
              {dpDialogOrder.nama_klien} ({dpDialogOrder.invoice_no}) • Total: {formatRupiah(dpDialogOrder.total_harga)}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nominal DP Diterima (Rp)</label>
                <input
                  type="number"
                  value={dpInputVal || ''}
                  onChange={(e) => setDpInputVal(Number(e.target.value))}
                  placeholder="Contoh: 1500000"
                  className="w-full bg-[#F8F5F2] border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-[#E63946]"
                />
              </div>

              {/* Quick Percentage Chips */}
              <div className="flex gap-2">
                {[50, 70, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDpInputVal(Math.round((dpDialogOrder.total_harga * pct) / 100))}
                    className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700 cursor-pointer"
                  >
                    {pct}% ({formatRupiah((dpDialogOrder.total_harga * pct) / 100)})
                  </button>
                ))}
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
                  {dpUpdateLoading ? 'Menyimpan...' : 'Simpan DP'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
