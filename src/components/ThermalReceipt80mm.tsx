import React from 'react';
import { InvoiceTableRow, OrderItem } from '../types';
import { Printer, Copy, Check, ExternalLink } from 'lucide-react';

interface ThermalReceipt80mmProps {
  order: OrderItem | null;
  items: InvoiceTableRow[];
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  namaPelanggan: string;
  noHp: string;
  alamat: string;
  totalAmount: number;
  minDpAmount: number;
  onPrint?: () => void;
}

export const ThermalReceipt80mm: React.FC<ThermalReceipt80mmProps> = ({
  order,
  items,
  invoiceNo,
  invoiceDate,
  dueDate,
  namaPelanggan,
  noHp,
  alamat,
  totalAmount,
  minDpAmount,
  onPrint,
}) => {
  const [copied, setCopied] = React.useState(false);

  const formatRupiah = (num: number) => {
    return `Rp ${new Intl.NumberFormat('id-ID').format(Math.max(0, Math.round(num)))}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const totalPcs = items.reduce((sum, it) => sum + (it.qty || 0), 0);
  const dpPaid = typeof order?.nominal_dp === 'number' ? order.nominal_dp : (minDpAmount || 0);
  const remaining = Math.max(0, totalAmount - dpPaid);

  let paymentStatus = 'MENUNGGU PEMBAYARAN';
  if (dpPaid >= totalAmount && totalAmount > 0) {
    paymentStatus = 'LUNAS (100%)';
  } else if (dpPaid >= totalAmount * 0.7) {
    paymentStatus = `DP DITERIMA (${Math.round((dpPaid / totalAmount) * 100)}%)`;
  } else if (dpPaid > 0) {
    paymentStatus = `DP SEBAGIAN (Kurang dari 70%)`;
  }

  const handleCopyText = () => {
    const textReceipt = `
========================================
       PORDA PRODUKSI DADAKAN    
    Apparel, Sablon DTF & Percetakan 
          Telp/WA: 0812-3456-7890       
========================================
No. Faktur : ${invoiceNo || '-'}
Tanggal    : ${formatDateDisplay(invoiceDate)}
Jatuh Tempo: ${formatDateDisplay(dueDate)}
Pelanggan  : ${namaPelanggan || '-'}
No. Telp   : ${noHp || '-'}
Alamat     : ${alamat || '-'}
----------------------------------------
ITEM              QTY   HARGA      TOTAL
----------------------------------------
${items
  .map(
    (it) =>
      `${it.deskripsi}\n                  ${it.qty} x ${formatRupiah(it.harga_satuan)}  ${formatRupiah(
        it.harga_satuan * it.qty
      )}`
  )
  .join('\n')}
----------------------------------------
Total Qty (Pcs) : ${totalPcs} pcs
----------------------------------------
TOTAL TAGIHAN   : ${formatRupiah(totalAmount)}
DP Diterima     : ${formatRupiah(dpPaid)}
Sisa Pelunasan  : ${formatRupiah(remaining)}
Status Bayar    : [${paymentStatus}]
========================================
METODE PEMBAYARAN:
Transfer Bank BCA
No. Rek : 649 602 7721
A.N     : Ahmad Quantum Khairil Nikmat
========================================
          *** TERIMA KASIH ***          
  Barang yang sudah dipesan / diproduksi
   tidak dapat dibatalkan atau ditukar. 
  Simpan struk ini sbg bukti pembayaran.
========================================`.trim();

    navigator.clipboard.writeText(textReceipt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Action Controls for Thermal Receipt Preview */}
      <div className="w-full max-w-[340px] mb-3 flex items-center justify-between gap-2 px-1 print:hidden">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
          <span>Struk Kasir 80mm</span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white">Hitam Putih</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyText}
            title="Salin Format Teks Struk"
            className="px-2.5 py-1 rounded bg-black/30 hover:bg-black/40 text-xs text-white/90 border border-white/20 flex items-center gap-1 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Salin</span>
          </button>
          <button
            type="button"
            onClick={onPrint}
            title="Buka Tab Baru & Cetak Struk 80mm"
            className="px-3 py-1 rounded bg-white hover:bg-slate-100 text-xs font-bold text-slate-900 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-900" />
            <span>Cetak 80mm</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 80MM THERMAL RECEIPT CONTAINER (BLACK & WHITE, MONOSPACE, NO IMAGES)     */}
      {/* ========================================================================= */}
      <div
        id="printable-thermal-receipt"
        className="w-[80mm] max-w-[80mm] min-h-[140mm] bg-white text-black p-3.5 shadow-xl font-mono text-[11px] leading-tight select-text border border-slate-300 print:border-none print:shadow-none print:p-0 print:m-0"
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
            <span className="font-bold">{invoiceNo || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span>Tanggal</span>
            <span>{formatDateDisplay(invoiceDate)}</span>
          </div>
          <div className="flex justify-between">
            <span>Jatuh Tempo</span>
            <span>{formatDateDisplay(dueDate)}</span>
          </div>
          <div className="flex justify-between">
            <span>Kasir/Admin</span>
            <span>Staff POS</span>
          </div>
          <div className="flex justify-between">
            <span>Pelanggan</span>
            <span className="font-bold max-w-[140px] truncate text-right">{namaPelanggan || '-'}</span>
          </div>
          {noHp && (
            <div className="flex justify-between">
              <span>No. Telp</span>
              <span>{noHp}</span>
            </div>
          )}
          {alamat && (
            <div className="flex justify-between">
              <span className="shrink-0 mr-1">Alamat</span>
              <span className="text-right break-words max-w-[150px]">{alamat}</span>
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
          {items.map((it, idx) => (
            <div key={it.id ? `${it.id}-${idx}` : `receipt-it-${idx}`} className="text-[10px] leading-tight">
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
    </div>
  );
};
