import React from 'react';
import { OrderItem } from '../types';
import {
  X,
  Printer,
  Share2,
  CheckCircle2,
  Clock,
  Building2,
  Phone,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

interface InvoiceModalProps {
  order: OrderItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const dpPercent = Math.round((order.nominal_dp / (order.total_harga || 1)) * 100);
  const sisaBayar = Math.max(0, order.total_harga - order.nominal_dp);
  const isLunas = sisaBayar === 0;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*FAKTUR INVOICE PORDA APPAREL*\nNo: ${order.invoice_no}\nKlien: ${order.nama_klien}\nJenis Cetak: ${order.jenis_cetak}\nBahan: ${order.bahan_apparel} (${order.warna_bahan})\nTotal Pcs: ${order.jumlah_pcs} pcs\nTotal Tagihan: ${formatRupiah(order.total_harga)}\nDP Terbayar: ${formatRupiah(order.nominal_dp)} (${dpPercent}%)\nSisa Pelunasan: ${formatRupiah(sisaBayar)}\nStatus: ${order.status}\n\nTerima kasih telah mempercayakan produksi apparel di Porda!`;
    const url = `https://wa.me/${order.no_telepon ? order.no_telepon.replace(/^0/, '62') : ''}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      id="invoice-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="invoice-modal-card"
        className="bg-white rounded-3xl w-full max-w-md p-6 shadow-[0_25px_60px_rgba(230,57,70,0.22)] text-slate-800 my-auto max-h-[92vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Action Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-50 text-[#E63946] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm font-['Outfit']">Digital Invoice Faktur</h3>
              <p className="text-[11px] text-slate-400">{order.invoice_no}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Invoice Container */}
        <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1 text-xs" id="printable-invoice">
          {/* Brand & Invoice Header */}
          <div className="bg-[#E63946] text-white p-4 rounded-2xl relative overflow-hidden shadow-inner">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black font-['Outfit'] tracking-wider">PORDA</h2>
                <p className="text-[10px] text-white/80 font-medium">Produksi Dadakan - Custom Apparel</p>
                <p className="text-[9px] text-white/70 mt-1">Workshop: Jl. Apparel No. 7, Sleman - DIY</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full border border-white/20 block mb-1">
                  INVOICE
                </span>
                <p className="text-[10px] font-mono text-white/90">{order.invoice_no}</p>
                <p className="text-[9px] text-white/75 mt-0.5">
                  Tgl: {new Date(order.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-white/20 flex justify-between items-center text-[10px]">
              <div>
                <span className="text-white/70 block">Ditujukan Kepada:</span>
                <span className="font-bold text-white text-xs">{order.nama_klien}</span>
              </div>
              <div className="text-right">
                <span className="text-white/70 block">Target Deadline:</span>
                <span className="font-bold text-amber-200">
                  {new Date(order.deadline).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Spesifikasi Detail */}
          <div className="bg-[#F8F5F2] p-3.5 rounded-2xl space-y-2 border border-slate-200/70">
            <div className="flex items-center justify-between text-slate-700 font-bold border-b border-slate-200 pb-1.5">
              <span>Rincian Item & Spesifikasi</span>
              <span className="text-[#E63946]">{order.jenis_cetak} Print</span>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Bahan Apparel:</span>
                <span className="font-semibold text-slate-800 text-right">{order.bahan_apparel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Warna Kain:</span>
                <span className="font-semibold text-slate-800">{order.warna_bahan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Posisi Cetak:</span>
                <span className="font-medium text-slate-700 text-right max-w-[200px] truncate">
                  {order.posisi_cetak || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jumlah Total:</span>
                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  {order.jumlah_pcs} Pcs
                </span>
              </div>

              {/* Sizing Breakdown Chips */}
              {order.rincian_ukuran && (
                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 block mb-1">Rincian Size:</span>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(order.rincian_ukuran).map(([sz, qty]) => {
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
            </div>
          </div>

          {/* Financial Calculation */}
          <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2 border border-slate-200/80">
            <div className="flex justify-between text-slate-600">
              <span>Total Tagihan:</span>
              <span className="font-bold text-slate-900">{formatRupiah(order.total_harga)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                DP Terbayar ({dpPercent}%):
              </span>
              <span className="font-bold">{formatRupiah(order.nominal_dp)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm">
              <span className="font-bold text-slate-800">Sisa Pelunasan:</span>
              <span
                className={`font-black font-['Outfit'] text-base ${
                  isLunas ? 'text-emerald-600' : 'text-[#E63946]'
                }`}
              >
                {isLunas ? 'LUNAS (Rp 0)' : formatRupiah(sisaBayar)}
              </span>
            </div>
          </div>

          {/* Payment Account Details */}
          <div className="p-3 bg-red-50/60 rounded-2xl border border-red-100 text-[11px] text-slate-700 space-y-1">
            <p className="font-bold text-[#E63946] flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Rekening Pembayaran Resmi:
            </p>
            <p className="text-slate-600">BCA: 8730-9912-34 a/n Porda Apparel Studio</p>
            <p className="text-slate-600">Mandiri: 137-00-9876543-1 a/n Produksi Dadakan</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 shrink-0">
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Kirim ke WA</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-[#E63946] hover:bg-red-600 text-white font-bold text-xs transition-all shadow-[0_8px_20px_-4px_rgba(230,57,70,0.35)] cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Faktur</span>
          </button>
        </div>
      </div>
    </div>
  );
};
