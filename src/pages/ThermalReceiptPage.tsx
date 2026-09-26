import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, Copy, Check, X, ArrowLeft, RefreshCw } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ORDERS_COLLECTION } from '../services/dbService';
import { OrderItem, InvoiceTableRow } from '../types';
import {
  getStoredThermalReceiptData,
  generateThermalReceiptText,
  ThermalReceiptData,
} from '../utils/printReceipt';

export const ThermalReceiptPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const invParam = searchParams.get('inv');
  const autoPrint = searchParams.get('autoPrint') === '1';

  const [receiptData, setReceiptData] = useState<ThermalReceiptData | null>(() => {
    return getStoredThermalReceiptData();
  });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch from Firestore if no localStorage data or if explicit orderId mismatch
  useEffect(() => {
    const fetchOrderFromDb = async () => {
      if (!orderId) return;

      // If we already have matching data from localStorage, we can use it
      if (receiptData?.order?.id === orderId) {
        return;
      }

      setLoading(true);
      try {
        const docRef = doc(db, ORDERS_COLLECTION, orderId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const ord = { id: snap.id, ...snap.data() } as OrderItem;

          // Generate item rows based on sizes / items
          const generatedItems: InvoiceTableRow[] = [];
          if (ord.apparel_designs && ord.apparel_designs.length > 0) {
            ord.apparel_designs.forEach((design, dIdx) => {
              (design.items || []).forEach((item, iIdx) => {
                const sablonTotal = (item.sablon_list || []).reduce(
                  (sum, s) => sum + (s.harga || 0),
                  0
                );
                const unitPrice = Math.max(
                  0,
                  (item.harga_satuan || 0) + sablonTotal - (item.diskon_sablon || 0)
                );
                const sablonNames = (item.sablon_list || []).map((s) => s.nama).join(', ');
                const sablonSuffix = sablonNames ? ` (+Sablon ${sablonNames})` : '';

                Object.entries(item.sizes || {}).forEach(([sizeKey, sizeVal]) => {
                  const qty = Number(sizeVal) || 0;
                  if (qty > 0) {
                    generatedItems.push({
                      id: `d-${dIdx}-i-${iIdx}-s-${sizeKey}`,
                      deskripsi: `${item.jenis_pesanan || 'Apparel'} - Ukuran ${sizeKey}${sablonSuffix}`,
                      harga_satuan: unitPrice,
                      qty: qty,
                      total_harga: unitPrice * qty,
                    });
                  }
                });
              });
            });
          } else if (ord.rincian_ukuran) {
            const baseName = `${ord.jenis_cetak || 'Apparel'} - ${ord.bahan_apparel || 'Kaos'}${
              ord.warna_bahan ? ` (${ord.warna_bahan})` : ''
            }`;
            const totalPcs = ord.jumlah_pcs || 1;
            const unitPrice = ord.total_harga ? Math.round(ord.total_harga / totalPcs) : 75000;

            Object.entries(ord.rincian_ukuran).forEach(([sizeKey, sizeVal]) => {
              const qty = Number(sizeVal) || 0;
              if (qty > 0) {
                generatedItems.push({
                  id: `size-${sizeKey}`,
                  deskripsi: `${baseName} - Ukuran ${sizeKey}`,
                  harga_satuan: unitPrice,
                  qty: qty,
                  total_harga: unitPrice * qty,
                });
              }
            });
          }

          if (generatedItems.length === 0) {
            generatedItems.push({
              id: 'fallback-item',
              deskripsi: ord.jenis_cetak || 'Pesanan Percetakan',
              harga_satuan: ord.total_harga || 0,
              qty: ord.jumlah_pcs || 1,
              total_harga: ord.total_harga || 0,
            });
          }

          const tot = ord.total_harga || generatedItems.reduce((s, it) => s + it.total_harga, 0);

          setReceiptData({
            order: ord,
            items: generatedItems,
            invoiceNo: ord.invoice_no || invParam || `INV-${ord.id.slice(-6).toUpperCase()}`,
            invoiceDate: ord.invoice_date || ord.created_at || new Date().toISOString(),
            dueDate: ord.deadline || new Date().toISOString(),
            namaPelanggan: ord.nama_klien || 'Pelanggan',
            noHp: ord.no_telepon || '',
            alamat: ord.alamat_kirim || '',
            totalAmount: tot,
            minDpAmount: ord.nominal_dp || Math.round(tot * 0.7),
          });
        }
      } catch (err) {
        console.error('Error fetching order for receipt:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderFromDb();
  }, [orderId, receiptData, invParam]);

  // Auto-print effect
  useEffect(() => {
    if (autoPrint && receiptData && !loading) {
      const timer = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, receiptData, loading]);

  const formatRupiah = (num: number) => {
    return `Rp ${new Intl.NumberFormat('id-ID').format(Math.max(0, Math.round(num)))}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const handleCopy = () => {
    if (!receiptData) return;
    const text = generateThermalReceiptText(receiptData);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    window.close();
  };

  const totalPcs = useMemo(() => {
    return receiptData?.items.reduce((sum, it) => sum + (it.qty || 0), 0) || 0;
  }, [receiptData]);

  const dpPaid =
    typeof receiptData?.order?.nominal_dp === 'number'
      ? receiptData.order.nominal_dp
      : receiptData?.minDpAmount || 0;
  const totalAmount = receiptData?.totalAmount || 0;
  const remaining = Math.max(0, totalAmount - dpPaid);

  let paymentStatus = 'MENUNGGU PEMBAYARAN';
  if (dpPaid >= totalAmount && totalAmount > 0) {
    paymentStatus = 'LUNAS (100%)';
  } else if (dpPaid >= totalAmount * 0.7) {
    paymentStatus = `DP DITERIMA (${Math.round((dpPaid / totalAmount) * 100)}%)`;
  } else if (dpPaid > 0) {
    paymentStatus = `DP SEBAGIAN`;
  }

  return (
    <div className="min-h-screen bg-slate-200 text-slate-900 flex flex-col items-center py-4 sm:py-8 font-mono print:bg-white print:p-0 print:m-0">
      {/* SCOPED 80MM THERMAL PRINT RULES */}
      <style>{`
        @page {
          size: 80mm auto;
          margin: 0mm;
        }
      `}</style>

      {/* ========================================================================= */}
      {/* SCREEN TOOLBAR (HIDDEN WHEN PRINTING)                                      */}
      {/* ========================================================================= */}
      <div className="w-full max-w-[420px] mb-4 px-3 flex flex-col gap-2 print:hidden select-none">
        <div className="bg-slate-900 text-white rounded-xl p-3 shadow-md border border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-wide uppercase text-amber-400 flex items-center gap-1.5">
              <span>Struk Thermal 80mm</span>
            </span>
            <span className="text-[11px] text-slate-300">
              Format Hitam Putih Minimarket
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              id="btn-copy-thermal-receipt"
              type="button"
              onClick={handleCopy}
              title="Salin Teks Struk"
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[11px]">Salin</span>
            </button>
            <button
              id="btn-print-receipt-action"
              type="button"
              onClick={handlePrint}
              title="Cetak Struk Sekarang"
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>Cetak</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              title="Tutup Halaman Ini"
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-600 flex justify-between items-center px-1">
          <span>* Pengaturan cetak: Kertas 80mm, Margin: None</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="hover:text-slate-900 underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Muat Ulang</span>
          </button>
        </div>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="p-8 text-center text-xs text-slate-600 print:hidden">
          Memuat data struk thermal...
        </div>
      )}

      {/* EMPTY / ERROR STATE */}
      {!loading && !receiptData && (
        <div className="bg-white rounded-xl p-6 shadow max-w-[340px] text-center text-xs print:hidden">
          <p className="font-bold text-slate-800 mb-1">Data Faktur Tidak Ditemukan</p>
          <p className="text-slate-500 mb-4">
            Silakan kembali ke halaman pesanan dan klik Cetak 80mm pada faktur terkait.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 rounded bg-slate-800 text-white font-semibold cursor-pointer"
          >
            Tutup Tab
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 80MM THERMAL RECEIPT CONTAINER (BLACK & WHITE, MONOSPACE, NO IMAGES)     */}
      {/* ========================================================================= */}
      {receiptData && (
        <div
          id="printable-thermal-receipt"
          className="w-[80mm] max-w-[80mm] min-h-[140mm] bg-white text-black p-3.5 shadow-2xl font-mono text-[11px] leading-tight select-text border border-slate-300 print:border-none print:shadow-none print:p-0 print:m-0"
          style={{
            fontFamily: "'Courier New', Courier, monospace, 'Lucida Console', Monaco",
            color: '#000000',
            backgroundColor: '#ffffff',
          }}
        >
          {/* SHOP HEADER */}
          <div className="text-center mb-2">
            <div className="font-bold text-[14px] uppercase tracking-wide leading-tight">
              PORDA
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider">
              PRODUKSI DADAKAN
            </div>
            <div className="text-[9.5px] mt-0.5">
              Apparel, Sablon DTF & Percetakan Grafis
            </div>
            <div className="text-[9.5px]">
              Telp/WA: 0812-3456-7890
            </div>
          </div>

          {/* DOUBLE SEPARATOR */}
          <div className="border-t border-b border-dashed border-black py-0.5 my-1.5 text-center text-[9px] font-bold">
            ========================================
          </div>

          {/* TRANSACTION METADATA */}
          <div className="space-y-0.5 text-[10px] mb-2">
            <div className="flex justify-between">
              <span>No. Faktur</span>
              <span className="font-bold">{receiptData.invoiceNo || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal</span>
              <span>{formatDateDisplay(receiptData.invoiceDate)}</span>
            </div>
            <div className="flex justify-between">
              <span>Jatuh Tempo</span>
              <span>{formatDateDisplay(receiptData.dueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir/Admin</span>
              <span>Staff POS</span>
            </div>
            <div className="flex justify-between">
              <span>Pelanggan</span>
              <span className="font-bold max-w-[140px] truncate text-right">
                {receiptData.namaPelanggan || '-'}
              </span>
            </div>
            {receiptData.noHp && (
              <div className="flex justify-between">
                <span>No. Telp</span>
                <span>{receiptData.noHp}</span>
              </div>
            )}
            {receiptData.alamat && (
              <div className="flex justify-between">
                <span className="shrink-0 mr-1">Alamat</span>
                <span className="text-right break-words max-w-[150px]">
                  {receiptData.alamat}
                </span>
              </div>
            )}
          </div>

          {/* SINGLE SEPARATOR */}
          <div className="border-t border-dashed border-black my-1 text-center text-[9px]">
            ----------------------------------------
          </div>

          {/* ITEMS HEADER */}
          <div className="flex justify-between font-bold text-[10px] pb-1">
            <span className="w-[45%]">ITEM</span>
            <span className="w-[15%] text-center">QTY</span>
            <span className="w-[20%] text-right">HARGA</span>
            <span className="w-[20%] text-right">TOTAL</span>
          </div>

          <div className="border-t border-dashed border-black my-1 text-center text-[9px]">
            ----------------------------------------
          </div>

          {/* ITEM ROWS */}
          <div className="space-y-2 mb-2">
            {receiptData.items.map((it, idx) => (
              <div key={it.id ? `${it.id}-${idx}` : `rcpt-page-it-${idx}`} className="text-[10px] leading-tight">
                <div className="font-bold break-words">{it.deskripsi}</div>
                <div className="flex justify-between text-[9.5px] pl-2 pt-0.5">
                  <span className="text-left w-[35%]">
                    {it.qty} pcs
                  </span>
                  <span className="text-right w-[30%]">
                    @{new Intl.NumberFormat('id-ID').format(it.harga_satuan)}
                  </span>
                  <span className="text-right w-[35%] font-bold">
                    {new Intl.NumberFormat('id-ID').format(it.harga_satuan * it.qty)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* SINGLE SEPARATOR */}
          <div className="border-t border-dashed border-black my-1 text-center text-[9px]">
            ----------------------------------------
          </div>

          {/* TOTALS & BREAKDOWN */}
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span>Total Item (Pcs)</span>
              <span className="font-bold">{totalPcs} pcs</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatRupiah(totalAmount)}</span>
            </div>

            <div className="border-t border-dashed border-black my-1 text-center text-[9px]">
              ----------------------------------------
            </div>

            <div className="flex justify-between font-bold text-[12px] pt-0.5">
              <span>TOTAL TAGIHAN</span>
              <span>{formatRupiah(totalAmount)}</span>
            </div>

            <div className="flex justify-between text-[10px]">
              <span>DP Diterima</span>
              <span className="font-bold">{formatRupiah(dpPaid)}</span>
            </div>

            <div className="flex justify-between text-[10px]">
              <span>Sisa Pelunasan</span>
              <span className="font-bold">{formatRupiah(remaining)}</span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span>Status</span>
              <span className="font-bold border border-black px-1.5 py-0.5 text-[9px] uppercase">
                {paymentStatus}
              </span>
            </div>
          </div>

          {/* BANK PAYMENT DETAILS */}
          <div className="border-t border-b border-dashed border-black py-1 my-2 text-[9.5px]">
            <div className="font-bold uppercase tracking-wider mb-0.5">
              PEMBAYARAN VIA TRANSFER:
            </div>
            <div className="flex justify-between">
              <span>Bank</span>
              <span className="font-bold">BCA</span>
            </div>
            <div className="flex justify-between">
              <span>No. Rekening</span>
              <span className="font-bold">649 602 7721</span>
            </div>
            <div className="flex justify-between">
              <span>Atas Nama</span>
              <span className="font-bold">Ahmad Quantum Khairil N.</span>
            </div>
          </div>

          {/* FOOTER RECEIPT (MINIMARKET STYLE) */}
          <div className="text-center pt-1 text-[9.5px] leading-tight space-y-1">
            <div className="font-bold text-[11px] tracking-widest">
              *** TERIMA KASIH ***
            </div>
            <div>
              Barang yang sudah dipesan / diproduksi
            </div>
            <div>
              tidak dapat dibatalkan atau ditukar.
            </div>
            <div className="pt-0.5">
              Simpan struk ini sebagai bukti pembayaran.
            </div>
            <div className="border-t border-dashed border-black my-1.5 text-[8.5px] pt-1">
              ========================================
            </div>
            <div className="text-[8.5px] tracking-wider uppercase text-black/80">
              PORDA POS • PRODUKSI DADAKAN
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
