import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { OrderItem, OrderStatus, PrintType } from '../types';
import { subscribeOrders, commitOrderToProduction, updateOrder } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { InvoiceModal } from '../components/InvoiceModal';
import { NewOrderModal } from '../components/NewOrderModal';
import { exportOrdersToCsv } from '../utils/exportCsv';
import { playFeedbackSound } from '../utils/audio';
import {
  Plus,
  Search,
  FileText,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
  DollarSign,
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

  // Modals state
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<OrderItem | null>(null);

  // Commit and DP Topup modal state
  const [commitLoadingId, setCommitLoadingId] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState<{ id: string; error?: string; success?: string } | null>(
    null
  );

  // Quick DP update dialog state
  const [dpDialogOrder, setDpDialogOrder] = useState<OrderItem | null>(null);
  const [dpInputVal, setDpInputVal] = useState<number>(0);
  const [dpUpdateLoading, setDpUpdateLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Filtered orders list
  const filteredOrders = orders.filter((ord) => {
    const matchesSearch =
      ord.nama_klien.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.bahan_apparel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.jenis_cetak.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'Semua' || ord.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Strict DP 70% validation & commit handler
  const handleCommitOrder = async (order: OrderItem) => {
    const minDp = order.total_harga * 0.7;
    const isDpValid = order.nominal_dp >= minDp;

    if (!isDpValid) {
      setCommitMessage({
        id: order.id,
        error: `DP kurang! Syarat commit minimal 70% (${formatRupiah(minDp)}). DP saat ini baru ${formatRupiah(order.nominal_dp)}. Silakan tambah pembayaran DP terlebih dahulu.`,
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
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        } catch (e) {}
      } else {
        setCommitMessage({
          id: order.id,
          error: res.message || 'Gagal melakukan commit order.',
        });
      }
    } catch (err: any) {
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
    const min70 = Math.round(order.total_harga * 0.7);
    setDpInputVal(order.nominal_dp < min70 ? min70 : order.total_harga);
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

  return (
    <div id="orders-management-page" className="w-full flex flex-col">
      <Header
        badge="Manajemen Pesanan"
        title="Daftar Order Apparel"
        subtitle="Kelola spesifikasi, faktur invoice & komit pesanan ke produksi"
      />

      <div className="px-4 py-5 space-y-4">
        {/* Top Control: Search & New Order CTA */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="search-orders-input"
              type="text"
              placeholder="Cari klien, invoice, bahan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200/80 rounded-full pl-9 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#E63946] shadow-xs"
            />
          </div>

          <button
            id="btn-open-new-order-modal"
            onClick={() => setIsNewOrderOpen(true)}
            className="bg-[#E63946] hover:bg-red-600 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-[0_8px_20px_-4px_rgba(230,57,70,0.4)] transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Order</span>
          </button>
        </div>

        {/* Status Filters Pill Tabs & Export */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <div className="flex items-center gap-1.5 shrink-0">
            {['Semua', 'Menunggu Pembayaran', 'Diproses', 'Selesai'].map((st) => {
              const isSelected = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-[#E63946] text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200/70 hover:bg-slate-50'
                  }`}
                >
                  {st}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => exportOrdersToCsv(filteredOrders)}
            title="Ekspor daftar pesanan ke format CSV Excel"
            className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#E63946]" />
            <span>Ekspor CSV</span>
          </button>
        </div>

        {/* Orders List / Cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs">
            <div className="w-8 h-8 border-3 border-[#E63946] border-t-transparent rounded-full animate-spin mb-3" />
            <span>Memuat data pesanan Firestore...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/70 shadow-sm text-slate-500">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">Tidak ada pesanan ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Coba ubah kata kunci pencarian Anda' : 'Klik tombol Tambah Order untuk membuat pesanan baru'}
            </p>
            <button
              onClick={() => setIsNewOrderOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 bg-[#E63946] text-white text-xs font-bold px-4 py-2 rounded-full cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Pesanan Pertama</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
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
                  className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_10px_25px_-5px_rgba(230,57,70,0.15)] border border-red-100/40 relative overflow-hidden transition-all hover:border-red-200"
                >
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
                      <h3 className="font-bold text-slate-900 text-sm font-['Outfit']">{order.nama_klien}</h3>
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">
                        {order.jumlah_pcs} Pcs
                      </span>
                    </div>

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

                    {order.posisi_cetak && (
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
                          className="text-[#E63946] hover:underline font-bold flex items-center gap-0.5"
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

                  {/* Action Buttons: Buat Invoice & Commit Order */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    {/* Buat / Lihat Invoice */}
                    <button
                      id={`btn-invoice-${order.id}`}
                      type="button"
                      onClick={() => setSelectedInvoiceOrder(order)}
                      className="py-2.5 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Buat Invoice</span>
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
                              {isDpEligibleForCommit ? 'Commit Order' : 'DP < 70% (Tahan)'}
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
            className="bg-white rounded-3xl w-full max-w-xs p-5 shadow-2xl text-slate-800 animate-in fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-sm text-slate-900 mb-1">Update Nominal DP</h3>
            <p className="text-xs text-slate-500 mb-3">
              Klien: <strong>{dpDialogOrder.nama_klien}</strong> (Total: {formatRupiah(dpDialogOrder.total_harga)})
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nominal DP Masuk (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={dpInputVal}
                  onChange={(e) => setDpInputVal(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#F8F5F2] border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#E63946]"
                />
              </div>

              {/* Quick helper buttons */}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setDpInputVal(Math.round(dpDialogOrder.total_harga * 0.7))}
                  className="flex-1 text-[11px] py-1 bg-amber-50 text-amber-800 font-bold rounded-lg border border-amber-200"
                >
                  Min 70%
                </button>
                <button
                  type="button"
                  onClick={() => setDpInputVal(dpDialogOrder.total_harga)}
                  className="flex-1 text-[11px] py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200"
                >
                  Lunas 100%
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDpDialogOrder(null)}
                  className="flex-1 py-2 rounded-full border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveDp}
                  disabled={dpUpdateLoading}
                  className="flex-1 py-2 rounded-full bg-[#E63946] text-white font-bold text-xs hover:bg-red-600 shadow-sm"
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
