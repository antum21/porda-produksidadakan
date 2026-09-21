import React, { useEffect, useState } from 'react';
import { OrderItem } from '../types';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
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
  Copy,
  Check,
} from 'lucide-react';

interface InvoiceModalProps {
  order: OrderItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, isOpen, onClose }) => {
  const { info, success } = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!order) return null;

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

  const handleCopySummary = () => {
    const categoryName =
      order.kategori_projek === 'grafis'
        ? 'PERCETAKAN GRAFIS'
        : order.kategori_projek === 'lainnya'
        ? 'CUSTOM ORDER'
        : 'APPAREL';

    let itemDetails = '';
    if (order.kategori_projek === 'grafis') {
      itemDetails = `Produk: ${order.tipe_grafis || 'Cetak Grafis'}\nBahan: ${order.bahan_cetak || '-'}\nUkuran: ${order.dimensi_ukuran || '-'}\nFinishing: ${order.finishing || '-'}\nJumlah: ${order.jumlah_pcs} ${order.satuan_grafis || 'Pcs'}`;
    } else if (order.kategori_projek === 'lainnya') {
      itemDetails = `Item: ${order.nama_item_custom || 'Order Bebas'}\nJumlah: ${order.jumlah_pcs} ${order.satuan_custom || 'Unit'}\nSpek: ${order.deskripsi_custom || '-'}`;
    } else if (order.apparel_designs && order.apparel_designs.length > 0) {
      const designsText = order.apparel_designs
        .map((d, i) => {
          const itemsStr = d.items
            .map((it) => {
              const sablonStr = (it.sablon_list || []).map((s) => s.nama).join(' + ');
              return `  • ${it.jenis_pesanan || 'Item Kaos'} (${it.total_pcs} pcs @ ${formatRupiah(it.harga_satuan)}${sablonStr ? ` + Sablon: ${sablonStr}` : ''}${it.diskon_sablon > 0 ? ` Disc: -${formatRupiah(it.diskon_sablon)}` : ''}) = ${formatRupiah(it.subtotal)}`;
            })
            .join('\n');
          return `[${d.nama_desain || `Desain #${i + 1}`}]\n${itemsStr}`;
        })
        .join('\n\n');
      itemDetails = `Total Kuantitas: ${order.jumlah_pcs} pcs\n${designsText}`;
    } else {
      itemDetails = `Jenis Cetak: ${order.jenis_cetak}\nBahan: ${order.bahan_apparel || '-'} (${order.warna_bahan || '-'})\nTotal: ${order.jumlah_pcs} pcs\nPosisi: ${order.posisi_cetak || '-'}`;
    }

    const text = `FAKTUR INVOICE PORDA [${categoryName}]\nNo: ${order.invoice_no}\nKlien: ${order.nama_klien}\n${itemDetails}\nTotal Tagihan: ${formatRupiah(order.total_harga)}\nDP: ${formatRupiah(order.nominal_dp)} (${dpPercent}%)\nSisa: ${formatRupiah(sisaBayar)}\nStatus: ${order.status}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    success('Ringkasan Disalin', 'Rincian invoice siap dibagikan.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const categoryName =
      order.kategori_projek === 'grafis'
        ? 'PERCETAKAN GRAFIS'
        : order.kategori_projek === 'lainnya'
        ? 'CUSTOM ORDER BEBAS'
        : 'APPAREL';

    let itemDetails = '';
    if (order.kategori_projek === 'grafis') {
      itemDetails = `Produk: ${order.tipe_grafis || 'Cetak Grafis'}\nBahan: ${order.bahan_cetak || '-'}\nUkuran: ${order.dimensi_ukuran || '-'}\nFinishing: ${order.finishing || '-'}\nJumlah: ${order.jumlah_pcs} ${order.satuan_grafis || 'Pcs'}`;
    } else if (order.kategori_projek === 'lainnya') {
      itemDetails = `Item: ${order.nama_item_custom || 'Order Bebas'}\nJumlah: ${order.jumlah_pcs} ${order.satuan_custom || 'Unit'}\nSpek: ${order.deskripsi_custom || '-'}`;
    } else if (order.apparel_designs && order.apparel_designs.length > 0) {
      const designsText = order.apparel_designs
        .map((d, i) => {
          const itemsStr = d.items
            .map((it) => {
              const sablonStr = (it.sablon_list || []).map((s) => s.nama).join(' + ');
              return `  • ${it.jenis_pesanan || 'Item Kaos'} (${it.total_pcs} pcs @ ${formatRupiah(it.harga_satuan)}${sablonStr ? ` + Sablon: ${sablonStr}` : ''}) = ${formatRupiah(it.subtotal)}`;
            })
            .join('\n');
          return `*${d.nama_desain || `Desain #${i + 1}`}*\n${itemsStr}`;
        })
        .join('\n\n');
      itemDetails = `Total Kuantitas: ${order.jumlah_pcs} pcs\n${designsText}`;
    } else {
      itemDetails = `Jenis Cetak: ${order.jenis_cetak}\nBahan: ${order.bahan_apparel || '-'} (${order.warna_bahan || '-'})\nTotal: ${order.jumlah_pcs} pcs\nPosisi: ${order.posisi_cetak || '-'}`;
    }

    const text = `*FAKTUR INVOICE PORDA [${categoryName}]*\nNo: ${order.invoice_no}\nKlien: ${order.nama_klien}\n${itemDetails}\nTotal Tagihan: ${formatRupiah(order.total_harga)}\nDP Terbayar: ${formatRupiah(order.nominal_dp)} (${dpPercent}%)\nSisa Pelunasan: ${formatRupiah(sisaBayar)}\nStatus: ${order.status}\n\nTerima kasih telah mempercayakan produksi Anda di Porda!`;
    const url = `https://wa.me/${order.no_telepon ? order.no_telepon.replace(/^0/, '62') : ''}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    info('Membuka WhatsApp', 'Mengarahkan ke jendela pesan WhatsApp.');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="invoice-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            id="invoice-modal-card"
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="bg-white rounded-3xl w-full max-w-md md:max-w-xl p-5 sm:p-6 shadow-2xl text-slate-800 my-auto max-h-[92vh] flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-[#E63946] flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm font-['Outfit']">Digital Invoice Faktur</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{order.invoice_no}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopySummary}
                  title="Salin Rincian"
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Container */}
            <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1 text-xs" id="printable-invoice">
              {/* Brand & Invoice Header */}
              <div className="bg-[#E63946] text-white p-4 rounded-2xl relative overflow-hidden shadow-inner">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-black font-['Outfit'] tracking-wider">PORDA</h2>
                    <p className="text-[10px] text-white/80 font-medium">Produksi Dadakan - Apparel, Grafis & Custom</p>
                    <p className="text-[9px] text-white/70 mt-0.5">Workshop: Jl. Apparel & Percetakan No. 7, Sleman - DIY</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold bg-white/20 px-2 py-0.5 rounded-full border border-white/20 block mb-1">
                      {order.kategori_projek === 'grafis'
                        ? 'INV GRAFIS'
                        : order.kategori_projek === 'lainnya'
                        ? 'INV CUSTOM'
                        : 'INV APPAREL'}
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

              {/* Spesifikasi Detail Sesuai Kategori */}
              <div className="bg-[#F8F5F2] p-3.5 rounded-2xl space-y-2 border border-slate-200/70">
                <div className="flex items-center justify-between text-slate-700 font-bold border-b border-slate-200 pb-1.5">
                  <span>Rincian Item & Spesifikasi</span>
                  <span className="text-[#E63946] font-bold text-[11px] bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                    {order.kategori_projek === 'grafis'
                      ? 'Cetak Grafis'
                      : order.kategori_projek === 'lainnya'
                      ? 'Custom Order'
                      : `${order.jenis_cetak} Print`}
                  </span>
                </div>

                {/* GRAFIS SPEC */}
                {order.kategori_projek === 'grafis' ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Jenis Cetak:</span>
                      <span className="font-semibold text-slate-800">{order.tipe_grafis || 'Cetak Grafis'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bahan Media:</span>
                      <span className="font-semibold text-slate-800 text-right">{order.bahan_cetak || order.bahan_apparel || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Dimensi Ukuran:</span>
                      <span className="font-semibold text-slate-800">{order.dimensi_ukuran || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Finishing:</span>
                      <span className="font-medium text-slate-700 text-right">{order.finishing || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Kuantitas Cetak:</span>
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                        {order.jumlah_pcs} {order.satuan_grafis || 'Pcs'}
                      </span>
                    </div>
                  </div>
                ) : order.kategori_projek === 'lainnya' ? (
                  /* LAINNYA / CUSTOM SPEC */
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nama Item Custom:</span>
                      <span className="font-bold text-slate-900 text-right">{order.nama_item_custom || order.bahan_apparel || 'Order Bebas'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Kuantitas:</span>
                      <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                        {order.jumlah_pcs} {order.satuan_custom || 'Unit'}
                      </span>
                    </div>
                    {order.deskripsi_custom && (
                      <div className="pt-1">
                        <span className="text-slate-500 block mb-0.5">Spesifikasi Kustom:</span>
                        <p className="bg-white p-2 rounded-xl text-slate-700 border border-slate-200 text-[11px] leading-relaxed">
                          {order.deskripsi_custom}
                        </p>
                      </div>
                    )}
                  </div>
                ) : order.apparel_designs && order.apparel_designs.length > 0 ? (
                  /* APPAREL DESIGNS BREAKDOWN */
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between items-center text-[11px] pb-1 border-b border-slate-200">
                      <span className="text-slate-500 font-semibold">Total Kuantitas Baju:</span>
                      <span className="font-black text-slate-900 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                        {order.jumlah_pcs} Pcs
                      </span>
                    </div>

                    {order.apparel_designs.map((design, dIdx) => (
                      <div key={design.id || dIdx} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                          {design.gambar_preview ? (
                            <img
                              src={design.gambar_preview}
                              alt={design.nama_desain || `Desain #${dIdx + 1}`}
                              className="w-12 h-12 object-cover rounded-xl border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-red-50 text-[#E63946] border border-red-100 flex items-center justify-center font-bold text-xs shrink-0">
                              D#{dIdx + 1}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 text-xs truncate">
                              {design.nama_desain || `Desain #${dIdx + 1}`}
                            </h4>
                            <p className="text-[10px] text-slate-500 truncate">
                              {design.file_name || 'File Desain Siap Cetak'}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            {design.items.reduce((acc, it) => acc + (it.total_pcs || 0), 0)} pcs
                          </span>
                        </div>

                        {/* List Pesanan / Items inside this design */}
                        <div className="space-y-2">
                          {design.items.map((item, iIdx) => (
                            <div
                              key={item.id || iIdx}
                              className="bg-[#F8F5F2] p-2.5 rounded-xl border border-slate-200/70 space-y-1.5"
                            >
                              <div className="flex items-center justify-between font-bold text-xs">
                                <span className="text-slate-800">{item.jenis_pesanan || 'Item Kaos'}</span>
                                <span className="text-[#E63946] font-['Outfit']">{formatRupiah(item.subtotal)}</span>
                              </div>

                              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                                <span>Harga Satuan: {formatRupiah(item.harga_satuan)}</span>
                                <span className="font-semibold text-slate-700">Subtotal: {item.total_pcs} pcs</span>
                              </div>

                              {/* Sablon list & discount badge */}
                              {item.sablon_list && item.sablon_list.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1 pt-1">
                                  <span className="text-[10px] text-slate-400 font-semibold">Sablon:</span>
                                  {item.sablon_list.map((s, sIdx) => (
                                    <span
                                      key={s.id || sIdx}
                                      className="bg-white text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-slate-200"
                                    >
                                      {s.nama} (+{formatRupiah(s.harga)})
                                    </span>
                                  ))}
                                  {item.diskon_sablon > 0 && (
                                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                                      Diskon: -{formatRupiah(item.diskon_sablon)}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Sizing tags */}
                              <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-200/60">
                                {Object.entries(item.sizes).map(([sz, qty]) => {
                                  if (!qty) return null;
                                  return (
                                    <span
                                      key={sz}
                                      className="bg-white text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200"
                                    >
                                      {sz}: {qty}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* APPAREL SPEC (FALLBACK) */
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bahan Apparel:</span>
                      <span className="font-semibold text-slate-800 text-right">{order.bahan_apparel || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Warna Kain:</span>
                      <span className="font-semibold text-slate-800">{order.warna_bahan || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Posisi Sablon:</span>
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
                        <span className="text-[10px] text-slate-400 block mb-1 font-semibold">Rincian Size:</span>
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
                )}
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
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Kirim ke WA</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-[#E63946] hover:bg-red-600 active:scale-95 text-white font-bold text-xs transition-all shadow-[0_8px_20px_-4px_rgba(230,57,70,0.35)] cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Faktur</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

