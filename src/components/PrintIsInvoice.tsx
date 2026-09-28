import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderItem, InvoiceTableRow } from '../types';
import { useToast } from '../context/ToastContext';
import {
  Printer,
  Share2,
  Copy,
  Check,
  X,
  Pencil,
  FileText,
  Receipt,
  ExternalLink,
  Layers,
  ZoomIn,
  Image as ImageIcon,
  FileDown,
} from 'lucide-react';
import { ThermalReceipt80mm } from './ThermalReceipt80mm';
import { openThermalReceiptInNewTab } from '../utils/printReceipt';
import { openPdfInvoiceInNewTab } from '../utils/printPdfInvoice';
import { calculateUnitPriceForSize, calculateEffectiveSablonPrice } from '../utils/pricing';

interface PrintIsInvoiceProps {
  order?: OrderItem | null;
  onClose?: () => void;
  onOrderUpdated?: (updated: Partial<OrderItem>) => void;
  showModalControls?: boolean;
}

interface InvoiceDesignGroup {
  id: string;
  designIndex: number;
  namaDesain: string;
  gambarPreview?: string;
  fileName?: string;
  posisiCetak?: string;
  sablonList: Array<{ id: string; nama: string; harga: number }>;
  items: Array<{
    id: string;
    modelBahan: string;
    ukuran: string;
    sablonNames: string;
    qty: number;
    hargaSatuan: number;
    totalHarga: number;
  }>;
  totalQty: number;
  subtotal: number;
}

export const PrintIsInvoice: React.FC<PrintIsInvoiceProps> = ({
  order,
  onClose,
  showModalControls = true,
}) => {
  const navigate = useNavigate();
  const { success, info } = useToast();

  // Mode View: 'invoice' (Faktur Digital) or 'thermal' (Struk Kasir 80mm)
  const [viewMode, setViewMode] = useState<'invoice' | 'thermal'>('invoice');

  // Invoice Header Display Fields
  const [invoiceNo, setInvoiceNo] = useState('INV-001');
  const [invoiceDate, setInvoiceDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  // Customer Display Fields
  const [namaPelanggan, setNamaPelanggan] = useState('');
  const [noHp, setNoHp] = useState('');
  const [alamat, setAlamat] = useState('');

  // Lightbox enlarged preview
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; title: string } | null>(null);

  const [copied, setCopied] = useState(false);

  // Helper date formatter: DD/MM/YYYY
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

  const formatRupiah = (num: number) => {
    return `Rp ${new Intl.NumberFormat('id-ID').format(Math.max(0, Math.round(num)))}`;
  };

  // Sync state when order prop changes
  useEffect(() => {
    if (!order) return;

    if (order.invoice_no) setInvoiceNo(order.invoice_no);
    if (order.invoice_date) {
      setInvoiceDate(order.invoice_date);
    } else if (order.created_at) {
      setInvoiceDate(order.created_at.split('T')[0]);
    }
    if (order.deadline) {
      setDueDate(order.deadline.split('T')[0]);
    }

    setNamaPelanggan(order.nama_klien || '');
    setNoHp(order.no_telepon || '');
    setAlamat(order.alamat_kirim || '');
  }, [order]);

  // =========================================================================
  // GROUP ITEMS & DESIGNS STRICTLY BY DESIGN
  // "deskripsi item & desain dipisah berdasarkan desain"
  // =========================================================================
  const designGroups = useMemo<InvoiceDesignGroup[]>(() => {
    if (!order) {
      return [
        {
          id: 'sample-group',
          designIndex: 1,
          namaDesain: 'Desain Apparel',
          sablonList: [],
          items: [
            {
              id: 'sample-1',
              modelBahan: 'Item Pesanan',
              ukuran: 'All Size',
              sablonNames: '',
              qty: 1,
              hargaSatuan: 0,
              totalHarga: 0,
            },
          ],
          totalQty: 1,
          subtotal: 0,
        },
      ];
    }

    // CASE 1: Apparel with multiple designs in apparel_designs
    if (order.apparel_designs && order.apparel_designs.length > 0) {
      return order.apparel_designs.map((des, dIdx) => {
        const groupItems: InvoiceDesignGroup['items'] = [];
        let totalQty = 0;
        let subtotal = 0;
        const allSablons: Array<{ id: string; nama: string; harga: number }> = [];

        (des.items || []).forEach((it, iIdx) => {
          const sablonTotal = (it.sablon_list || []).reduce(
            (sum, s) => sum + (s.harga || 0),
            0
          );
          (it.sablon_list || []).forEach((s) => {
            if (!allSablons.some((x) => x.nama === s.nama)) {
              allSablons.push(s);
            }
          });

          const sablonNames = (it.sablon_list || []).map((s) => s.nama).join(', ');
          const modelBahan = it.jenis_pesanan?.trim() || order.bahan_apparel || 'Kaos Apparel';

          if (it.sizes) {
            Object.entries(it.sizes).forEach(([sizeKey, sizeVal]) => {
              const qty = Number(sizeVal) || 0;
              if (qty > 0) {
                const effectiveUnitPrice = calculateUnitPriceForSize(it, sizeKey);
                const rowTotal = effectiveUnitPrice * qty;
                totalQty += qty;
                subtotal += rowTotal;
                groupItems.push({
                  id: `${dIdx}-${iIdx}-${sizeKey}`,
                  modelBahan,
                  ukuran: sizeKey,
                  sablonNames,
                  qty,
                  hargaSatuan: effectiveUnitPrice,
                  totalHarga: rowTotal,
                });
              }
            });
          }
        });

        if (groupItems.length === 0) {
          const fallbackQty = order.jumlah_pcs || 1;
          const fallbackPrice = Math.round((order.total_harga || 0) / order.apparel_designs.length);
          totalQty = fallbackQty;
          subtotal = fallbackPrice;
          groupItems.push({
            id: `fallback-${dIdx}`,
            modelBahan: order.bahan_apparel || 'Kaos Custom Apparel',
            ukuran: 'All Size',
            sablonNames: '',
            qty: fallbackQty,
            hargaSatuan: fallbackPrice,
            totalHarga: fallbackPrice,
          });
        }

        return {
          id: des.id || `design-${dIdx}`,
          designIndex: dIdx + 1,
          namaDesain: des.nama_desain?.trim() || `Desain #${dIdx + 1}`,
          gambarPreview: des.gambar_preview || (dIdx === 0 ? order.mockup_url : undefined),
          fileName: des.file_name,
          posisiCetak: order.posisi_cetak,
          sablonList: allSablons,
          items: groupItems,
          totalQty,
          subtotal,
        };
      });
    }

    // CASE 2: Legacy apparel order with rincian_ukuran
    if (order.rincian_ukuran && Object.keys(order.rincian_ukuran).length > 0) {
      const totalPcs = order.jumlah_pcs || 1;
      const unitPrice = Math.round((order.total_harga || 0) / totalPcs);
      const baseName = order.bahan_apparel || order.jenis_cetak || 'Apparel Kaos';
      const groupItems: InvoiceDesignGroup['items'] = [];
      let totalQty = 0;
      let subtotal = 0;

      Object.entries(order.rincian_ukuran).forEach(([sizeKey, sizeVal], idx) => {
        const qty = Number(sizeVal) || 0;
        if (qty > 0) {
          const rowTotal = unitPrice * qty;
          totalQty += qty;
          subtotal += rowTotal;
          groupItems.push({
            id: `size-${sizeKey}-${idx}`,
            modelBahan: baseName,
            ukuran: sizeKey,
            sablonNames: order.posisi_cetak || '',
            qty,
            hargaSatuan: unitPrice,
            totalHarga: rowTotal,
          });
        }
      });

      return [
        {
          id: 'legacy-apparel',
          designIndex: 1,
          namaDesain: 'Desain Utama Apparel',
          gambarPreview: order.mockup_url,
          posisiCetak: order.posisi_cetak,
          sablonList: [],
          items: groupItems,
          totalQty,
          subtotal,
        },
      ];
    }

    // CASE 3: Grafis
    if (order.kategori_projek === 'grafis') {
      const desc = `${order.tipe_grafis || 'Cetak Grafis'}${
        order.bahan_cetak ? ` - ${order.bahan_cetak}` : ''
      }${order.dimensi_ukuran ? ` (${order.dimensi_ukuran})` : ''}${
        order.finishing ? ` (Fin: ${order.finishing})` : ''
      }`;
      const qty = order.jumlah_pcs || 1;
      const unitPrice = Math.round((order.total_harga || 0) / qty);
      return [
        {
          id: 'grafis-design',
          designIndex: 1,
          namaDesain: order.tipe_grafis || 'Desain Cetak Grafis',
          gambarPreview: order.mockup_url,
          fileName: '',
          posisiCetak: order.finishing,
          sablonList: [],
          items: [
            {
              id: 'g-1',
              modelBahan: desc,
              ukuran: order.dimensi_ukuran || 'Standar',
              sablonNames: order.finishing || '',
              qty,
              hargaSatuan: unitPrice,
              totalHarga: order.total_harga || unitPrice * qty,
            },
          ],
          totalQty: qty,
          subtotal: order.total_harga || unitPrice * qty,
        },
      ];
    }

    // CASE 4: Custom / Lainnya / Fallback
    const qty = order.jumlah_pcs || 1;
    const unitPrice = Math.round((order.total_harga || 0) / qty);
    const desc =
      order.kategori_projek === 'lainnya'
        ? `${order.nama_item_custom || 'Custom Order'}${
            order.deskripsi_custom ? ` - ${order.deskripsi_custom}` : ''
          }`
        : `${order.jenis_cetak || 'Apparel'} - ${order.bahan_apparel || 'Item Pesanan'}`;

    return [
      {
        id: 'default-design',
        designIndex: 1,
        namaDesain: order.kategori_projek === 'lainnya' ? 'Item Custom' : 'Desain Pesanan',
        gambarPreview: order.mockup_url,
        sablonList: [],
        items: [
          {
            id: 'def-1',
            modelBahan: desc,
            ukuran: 'Standar',
            sablonNames: '',
            qty,
            hargaSatuan: unitPrice,
            totalHarga: order.total_harga || unitPrice * qty,
          },
        ],
        totalQty: qty,
        subtotal: order.total_harga || unitPrice * qty,
      },
    ];
  }, [order]);

  // Flattened items for thermal receipt compatibility
  const flattenedItems = useMemo<InvoiceTableRow[]>(() => {
    const res: InvoiceTableRow[] = [];
    designGroups.forEach((g) => {
      const designPrefix = designGroups.length > 1 ? `[${g.namaDesain}] ` : '';
      g.items.forEach((it) => {
        res.push({
          id: it.id,
          deskripsi: `${designPrefix}${it.modelBahan} - Ukuran ${it.ukuran}${
            it.sablonNames ? ` (${it.sablonNames})` : ''
          }`,
          harga_satuan: it.hargaSatuan,
          qty: it.qty,
          total_harga: it.totalHarga,
        });
      });
    });
    return res;
  }, [designGroups]);

  // Overall calculations
  const totalAmount =
    order?.total_harga ||
    designGroups.reduce((acc, g) => acc + g.subtotal, 0);

  const totalQty =
    designGroups.reduce((acc, g) => acc + g.totalQty, 0) || order?.jumlah_pcs || 0;

  const dpAmount =
    typeof order?.nominal_dp === 'number'
      ? order.nominal_dp
      : Math.round(totalAmount * 0.7);

  const sisaPelunasan = Math.max(0, totalAmount - dpAmount);

  // Direct back to Orders for editing
  const handleEditPesanan = () => {
    if (onClose) onClose();
    if (order?.id) {
      navigate(`/orders?edit=${order.id}`);
    } else {
      navigate('/orders');
    }
    info('Mengarahkan ke Pesanan', 'Silakan edit rincian data pada halaman pesanan.');
  };

  // Open & Print PDF Invoice in dedicated clean A4 format
  const handlePrintPdf = () => {
    openPdfInvoiceInNewTab({
      order: order || null,
      invoiceNo,
      invoiceDate,
      dueDate,
      namaPelanggan,
      noHp,
      alamat,
      totalAmount,
      dpAmount,
      sisaPelunasan,
    });
  };

  // Print 80mm Thermal Receipt (Opens in a new tab)
  const handlePrintThermal = () => {
    openThermalReceiptInNewTab({
      order: order || null,
      items: flattenedItems,
      invoiceNo,
      invoiceDate,
      dueDate,
      namaPelanggan,
      noHp,
      alamat,
      totalAmount,
      minDpAmount: dpAmount,
    });
  };

  // Copy Summary (Porda Branded, grouped by design)
  const handleCopySummary = () => {
    const groupsText = designGroups
      .map((g) => {
        const lines = g.items
          .map(
            (it) =>
              `  • ${it.modelBahan} (${it.ukuran}) : ${it.qty} pcs @ ${formatRupiah(
                it.hargaSatuan
              )} = ${formatRupiah(it.totalHarga)}`
          )
          .join('\n');
        return `[Desain #${g.designIndex}: ${g.namaDesain}]\n${lines}\n  Subtotal: ${g.totalQty} pcs • ${formatRupiah(g.subtotal)}`;
      })
      .join('\n\n');

    const summary = `FAKTUR INVOICE - PORDA PRODUKSI DADAKAN\nNo: ${invoiceNo}\nTanggal: ${formatDateDisplay(
      invoiceDate
    )}\nJatuh Tempo: ${formatDateDisplay(dueDate)}\nJumlah Desain: ${designGroups.length} Desain\n\nBill to:\nNama: ${
      namaPelanggan || '-'
    }\nNo HP: ${noHp || '-'}\nAlamat: ${alamat || '-'}\n\nRincian Item per Desain:\n${
      groupsText || '-'
    }\n\nTOTAL KESELURUHAN QTY: ${totalQty} Pcs\nTOTAL TAGIHAN: ${formatRupiah(
      totalAmount
    )}\nDP DITERIMA: ${formatRupiah(dpAmount)}\nSISA TAGIHAN: ${formatRupiah(
      sisaPelunasan
    )}\n\nMetode Pembayaran:\nBCA – 649 602 7721\nA.N Ahmad Quantum Khairil Nikmat`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    success('Ringkasan Disalin', 'Rincian invoice per desain telah disalin ke clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  // Share WhatsApp (Porda Branded, grouped by design)
  const handleShareWhatsApp = () => {
    const groupsText = designGroups
      .map((g) => {
        const lines = g.items
          .map(
            (it) =>
              `  • ${it.modelBahan} (${it.ukuran}): ${it.qty} pcs @ ${formatRupiah(
                it.hargaSatuan
              )} = *${formatRupiah(it.totalHarga)}*`
          )
          .join('\n');
        return `*Desain #${g.designIndex}: ${g.namaDesain}*\n${lines}\n  _Subtotal: ${g.totalQty} pcs • ${formatRupiah(g.subtotal)}_`;
      })
      .join('\n\n');

    const message = `*INVOICE TAGIHAN - PORDA PRODUKSI DADAKAN*\nNo: ${invoiceNo}\nTanggal: ${formatDateDisplay(
      invoiceDate
    )}\nJatuh Tempo: ${formatDateDisplay(dueDate)}\n*Jumlah Desain:* ${designGroups.length} Desain\n\n*Bill to:*\nNama: ${
      namaPelanggan || '-'
    }\nNo HP: ${noHp || '-'}\nAlamat: ${alamat || '-'}\n\n*Rincian Pesanan per Desain:*\n${
      groupsText || '-'
    }\n\n*TOTAL QTY:* *${totalQty} Pcs*\n*TOTAL:* *${formatRupiah(totalAmount)}*\n*DP:* *${formatRupiah(
      dpAmount
    )}*\n*SISA TAGIHAN:* *${formatRupiah(
      sisaPelunasan
    )}*\n\n*Metode Pembayaran:*\nBCA – 649 602 7721\nA.N Ahmad Quantum Khairil Nikmat\n\nTerima kasih atas kerja samanya bersama Porda!`;

    const targetPhone = noHp.trim() ? noHp.replace(/^0/, '62').replace(/\D/g, '') : '';
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    info('Membuka WhatsApp', 'Mengarahkan ke WhatsApp...');
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* TOP ACTION TOOLBAR (OUTSIDE INVOICE CARD, HIDDEN WHEN PRINTING) */}
      {showModalControls && (
        <div className="w-full max-w-4xl mb-3 flex flex-wrap items-center justify-between gap-2 px-1 print:hidden">
          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-800/20 p-1 rounded-full text-xs font-semibold backdrop-blur-xs border border-white/10">
              <button
                id="btn-tab-invoice-digital"
                type="button"
                onClick={() => setViewMode('invoice')}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  viewMode === 'invoice'
                    ? 'bg-[#E63946] text-white shadow-sm font-bold'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                Faktur Digital
              </button>
              <button
                id="btn-tab-struk-thermal"
                type="button"
                onClick={() => setViewMode('thermal')}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'thermal'
                    ? 'bg-slate-900 text-white shadow-sm font-bold'
                    : 'text-slate-200 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Struk 80mm</span>
              </button>
            </div>

            {order && (
              <span className="text-xs text-white/90 font-mono bg-black/30 px-3 py-1 rounded-full border border-white/10 hidden sm:inline">
                #{order.invoice_no || order.id}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* FITUR CETAK PDF */}
            <button
              id="btn-print-pdf-invoice"
              type="button"
              onClick={handlePrintPdf}
              className="bg-[#E63946] hover:bg-red-700 active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-full shadow-md shadow-red-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Buka & Cetak Faktur PDF A4 Berwarna Porda"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Cetak PDF</span>
              <ExternalLink className="w-3 h-3 text-white/80" />
            </button>

            {/* Tombol Cetak Struk 80mm Thermal */}
            <button
              id="btn-print-thermal-80mm"
              type="button"
              onClick={handlePrintThermal}
              title="Buka Tab Baru & Cetak Struk Thermal 80mm"
              className="bg-slate-900 hover:bg-black active:scale-95 text-white font-bold text-xs px-3.5 py-2 rounded-full shadow-sm flex items-center gap-1.5 transition-all cursor-pointer border border-white/15"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak 80mm</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>

            {/* Tombol Edit Pesanan */}
            <button
              id="btn-edit-pesanan-from-invoice"
              type="button"
              onClick={handleEditPesanan}
              className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-full shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Arahkan kembali ke pesanan untuk mengubah rincian data"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Edit Pesanan</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              title="Salin Rincian Teks"
              className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              title="Kirim ke WhatsApp"
              className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Tutup"
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-600 border border-slate-200 flex items-center justify-center transition-all cursor-pointer shadow-xs ml-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW 1: PREVIEW STRUK THERMAL 80MM (HITAM PUTIH MINIMARKET) */}
      {viewMode === 'thermal' && (
        <div className="w-full flex justify-center py-2 animate-in fade-in zoom-in-95 duration-150">
          <ThermalReceipt80mm
            order={order || null}
            items={flattenedItems}
            invoiceNo={invoiceNo}
            invoiceDate={invoiceDate}
            dueDate={dueDate}
            namaPelanggan={namaPelanggan}
            noHp={noHp}
            alamat={alamat}
            totalAmount={totalAmount}
            minDpAmount={dpAmount}
            onPrint={handlePrintThermal}
          />
        </div>
      )}

      {/* VIEW 2: STANDARD DIGITAL INVOICE CARD WITH PORDA BRANDING */}
      <div
        className={
          viewMode === 'invoice'
            ? 'w-full flex justify-center print:w-full'
            : 'hidden'
        }
      >
        <div
          id="printable-invoice"
          className="w-full max-w-4xl bg-white rounded-2xl md:rounded-3xl shadow-xl overflow-hidden border border-slate-200 text-slate-800 print:shadow-none print:border-none print:rounded-none"
        >
          {/* HEADER SECTION (PORDA CRIMSON RED GRADIENT) */}
          <header className="bg-gradient-to-r from-[#E63946] via-[#D90429] to-[#C1121F] text-white p-5 sm:p-7 select-none shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* BRAND LOGO: PORDA */}
              <div className="md:col-span-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-[#E63946] font-['Outfit'] font-black text-2xl shadow-md shadow-red-950/20 shrink-0">
                  P
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-white font-black text-2xl sm:text-3xl tracking-tight font-['Outfit']">
                      PORDA
                    </h1>
                    <span className="text-[10px] font-extrabold bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-xs border border-white/20">
                      ERP Cetak
                    </span>
                  </div>
                  <p className="text-white/90 text-xs font-semibold tracking-wide">
                    Produksi Dadakan • Apparel & Percetakan
                  </p>
                </div>
              </div>

              {/* MIDDLE: Invoice Number, Invoice Date, Due Date */}
              <div className="md:col-span-4 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-28 text-white/95 font-semibold shrink-0">Invoice Number</span>
                  <span className="text-white/80">:</span>
                  <div className="bg-black/20 border border-white/25 rounded-lg px-2.5 py-1 text-white text-xs w-full max-w-[150px] font-mono font-bold tracking-wide">
                    {invoiceNo || '-'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-28 text-white/95 font-semibold shrink-0">Invoice Date</span>
                  <span className="text-white/80">:</span>
                  <div className="bg-black/20 border border-white/25 rounded-lg px-2.5 py-1 text-white text-xs w-full max-w-[150px] font-medium">
                    {formatDateDisplay(invoiceDate)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-28 text-white/95 font-semibold shrink-0">Due Date</span>
                  <span className="text-white/80">:</span>
                  <div className="bg-black/20 border border-white/25 rounded-lg px-2.5 py-1 text-white text-xs w-full max-w-[150px] font-medium">
                    {formatDateDisplay(dueDate)}
                  </div>
                </div>
              </div>

              {/* RIGHT: Bill to (Nama Pelanggan, No HP, Alamat) */}
              <div className="md:col-span-4 space-y-1.5 text-xs">
                <div className="font-bold text-white text-xs tracking-wider uppercase mb-1">
                  Bill To :
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-24 text-white/95 font-semibold shrink-0">Klien</span>
                  <span className="text-white/80">:</span>
                  <div className="bg-black/20 border border-white/25 rounded-lg px-2.5 py-1 text-white text-xs flex-1 font-bold truncate">
                    {namaPelanggan || '-'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-24 text-white/95 font-semibold shrink-0">No HP</span>
                  <span className="text-white/80">:</span>
                  <div className="bg-black/20 border border-white/25 rounded-lg px-2.5 py-1 text-white text-xs flex-1 font-mono">
                    {noHp || '-'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-24 text-white/95 font-semibold shrink-0">Alamat</span>
                  <span className="text-white/80">:</span>
                  <div
                    className="bg-black/20 border border-white/25 rounded-lg px-2.5 py-1 text-white text-xs flex-1 truncate"
                    title={alamat}
                  >
                    {alamat || '-'}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* ========================================================================= */}
          {/* BODY SECTION: DESKRIPSI ITEM & DESAIN DIPISAH BERDASARKAN DESAIN */}
          {/* ========================================================================= */}
          <div className="p-5 sm:p-7 bg-[#FAF7F5] space-y-6">
            {/* Header Ringkasan Desain */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-50 text-[#E63946] flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                    Rincian Pesanan per Desain
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Spesifikasi ukuran dan jumlah pcs dikelompokkan per file desain cetak
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-red-50 text-[#E63946] border border-red-200/80 shadow-2xs font-mono">
                  {designGroups.length} Desain
                </span>
              </div>
            </div>

            {/* DAFTAR DESAIN: SETIAP DESAIN MEMILIKI PREVIEW & TABEL UKURAN SENDIRI */}
            <div className="space-y-6">
              {designGroups.map((group, gIdx) => (
                <div
                  key={group.id || `design-group-${gIdx}`}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
                >
                  {/* HEADER KARTU DESAIN SPESIFIK */}
                  <div className="bg-slate-50/95 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#E63946] text-white font-mono tracking-wide">
                        Desain #{group.designIndex}
                      </span>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                        {group.namaDesain}
                      </h3>
                      {group.fileName && (
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                          ({group.fileName})
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-black text-[#E63946] font-mono">
                        Subtotal: {group.totalQty} Pcs • {formatRupiah(group.subtotal)}
                      </span>
                    </div>
                  </div>

                  {/* CONTENT: 1/3 GAMBAR BESAR + 2/3 TABEL RINCIAN ITEM */}
                  <div className="grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 items-stretch">
                    {/* KOLOM KIRI (1/3 LEBAR): GAMBAR BESAR & DETAIL TEKNIS */}
                    <div className="md:col-span-4 print:col-span-4 p-3.5 bg-[#FAF7F5] border-b md:border-b-0 md:border-r print:border-b-0 print:border-r border-slate-200 flex flex-col justify-between">
                      <div>
                        {/* Container Gambar Besar (1/3 Lebar Table) */}
                        {group.gambarPreview ? (
                          <div
                            className="relative group/thumb w-full bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-2 shadow-2xs min-h-[180px] max-h-[230px] cursor-pointer"
                            onClick={() =>
                              group.gambarPreview &&
                              setEnlargedImage({
                                url: group.gambarPreview,
                                title: group.namaDesain,
                              })
                            }
                            title="Klik untuk memperbesar gambar desain"
                          >
                            <img
                              src={group.gambarPreview}
                              alt={group.namaDesain}
                              className="max-h-[200px] w-full object-contain transition-transform group-hover/thumb:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <ZoomIn className="w-5 h-5 drop-shadow-md" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full bg-white border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-4 text-center text-slate-400 min-h-[180px]">
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E63946] flex items-center justify-center font-bold mb-2">
                              #{group.designIndex}
                            </div>
                            <span className="text-xs font-bold text-slate-600">Visual Desain</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">Tidak ada gambar</span>
                          </div>
                        )}

                        {/* Detail Spesifikasi di Bawah Gambar */}
                        <div className="mt-2.5 space-y-1 text-left text-xs">
                          {group.sablonList.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Sablon:</span>
                              <span className="text-[10px] font-semibold text-[#E63946] bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                {group.sablonList.map((s) => s.nama).join(', ')}
                              </span>
                            </div>
                          )}
                          {group.posisiCetak && (
                            <div className="text-[10px] text-slate-600">
                              <span className="font-bold uppercase text-slate-500">Posisi:</span> {group.posisiCetak}
                            </div>
                          )}
                          {group.fileName && (
                            <div className="text-[10px] text-slate-400 truncate font-mono sm:hidden">
                              File: {group.fileName}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* KOLOM KANAN (2/3 LEBAR): TABEL RINCIAN ITEM */}
                    <div className="md:col-span-8 print:col-span-8 flex flex-col justify-between overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                            <th className="py-2.5 px-3 w-5/12">Model & Deskripsi Item</th>
                            <th className="py-2.5 px-2 text-center w-2/12">Ukuran</th>
                            <th className="py-2.5 px-2 text-center w-1/12">QTY</th>
                            <th className="py-2.5 px-2 text-center w-2/12">Harga Satuan</th>
                            <th className="py-2.5 px-3 text-right w-2/12">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {group.items.map((it, itIdx) => (
                            <tr
                              key={it.id || `item-${gIdx}-${itIdx}`}
                              className="hover:bg-red-50/20 transition-colors"
                            >
                              <td className="py-2.5 px-3 font-semibold text-slate-800 leading-snug">
                                {it.modelBahan}
                                {it.sablonNames && (
                                  <span className="block text-[11px] text-slate-400 font-normal">
                                    Sablon: {it.sablonNames}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-center font-bold text-slate-700 font-mono">
                                {it.ukuran}
                              </td>
                              <td className="py-2.5 px-2 text-center font-black text-slate-900 font-mono">
                                {it.qty}
                              </td>
                              <td className="py-2.5 px-2 text-center text-slate-600 font-mono text-[11px]">
                                {formatRupiah(it.hargaSatuan)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 font-mono">
                                {formatRupiah(it.totalHarga)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Subtotal Footer Baris Tabel */}
                      <div className="bg-slate-50 px-3.5 py-2 border-t border-slate-200 flex items-center justify-between text-xs mt-auto">
                        <span className="text-[11px] text-slate-500 font-medium">
                          Total {group.items.length} varian ukuran
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-bold text-slate-700">
                            Total QTY: <span className="font-mono text-slate-900 font-extrabold">{group.totalQty} Pcs</span>
                          </span>
                          <span className="text-xs font-black text-[#E63946] font-mono">
                            {formatRupiah(group.subtotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* TOTAL KESELURUHAN, DP & SISA PELUNASAN */}
            <div className="pt-2 flex justify-end">
              <div className="space-y-1.5 text-xs min-w-[290px] bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                {/* TOTAL QTY */}
                <div className="flex items-center gap-3 justify-between">
                  <span className="font-semibold text-slate-600">Total Keseluruhan QTY</span>
                  <div className="bg-[#FAF7F5] border border-slate-200 rounded-lg px-3 py-1 text-right font-bold text-slate-800 min-w-[130px] font-mono">
                    {totalQty} Pcs
                  </div>
                </div>

                {/* TOTAL HARGA */}
                <div className="flex items-center gap-3 justify-between">
                  <span className="font-bold text-slate-800">GRAND TOTAL</span>
                  <div className="bg-red-50 border border-red-200/70 rounded-lg px-3 py-1 text-right font-black text-[#E63946] min-w-[130px] font-mono text-sm">
                    {formatRupiah(totalAmount)}
                  </div>
                </div>

                {/* DP */}
                <div className="flex items-center gap-3 justify-between">
                  <span className="font-semibold text-slate-600">DP Diterima</span>
                  <div className="bg-[#FAF7F5] border border-slate-200 rounded-lg px-3 py-1 text-right font-bold text-slate-800 min-w-[130px] font-mono">
                    {formatRupiah(dpAmount)}
                  </div>
                </div>

                {/* SISA YANG PERLU DILUNASKAN */}
                <div className="flex items-center gap-3 justify-between pt-1.5 border-t border-slate-200">
                  <span className="font-black text-[#E63946]">Sisa Tagihan</span>
                  <div className="bg-[#E63946] text-white border border-[#C1121F] rounded-lg px-3 py-1 text-right font-black min-w-[130px] font-mono text-sm shadow-xs">
                    {formatRupiah(sisaPelunasan)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* FOOTER SECTION (PORDA CRIMSON RED - METODE PEMBAYARAN & BRAND INFO) */}
          {/* ========================================================================= */}
          <footer className="bg-gradient-to-r from-[#E63946] via-[#D90429] to-[#C1121F] text-white p-5 sm:p-6 select-none shadow-inner">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* METODE PEMBAYARAN */}
              <div className="space-y-1 text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-white/90 mb-1">
                  Metode Pembayaran :
                </h3>
                <p className="font-black text-white text-base tracking-wide font-mono">
                  BCA – 649 602 7721
                </p>
                <p className="text-white/95 text-xs font-semibold">
                  A.N Ahmad Quantum Khairil Nikmat
                </p>
              </div>

              {/* PORDA BRAND SIGNATURE */}
              <div className="text-left sm:text-right text-xs text-white/95">
                <p className="font-extrabold text-white text-sm font-['Outfit']">
                  PORDA PRODUKSI DADAKAN
                </p>
                <p className="text-white/85 text-[11px] mt-0.5">
                  Apparel Sablon DTF, Kaos Polos & Percetakan Grafis Cepat
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* LIGHTBOX ENLARGED MODAL */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-3 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full pb-2 mb-2 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-800">
                {enlargedImage.title}
              </span>
              <button
                type="button"
                onClick={() => setEnlargedImage(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={enlargedImage.url}
              alt={enlargedImage.title}
              className="max-h-[75vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* RENDER THERMAL RECEIPT FOR PRINT OUTPUT WHEN IN DIGITAL INVOICE VIEW */}
      {viewMode !== 'thermal' && (
        <div className="hidden print:block">
          <ThermalReceipt80mm
            order={order || null}
            items={flattenedItems}
            invoiceNo={invoiceNo}
            invoiceDate={invoiceDate}
            dueDate={dueDate}
            namaPelanggan={namaPelanggan}
            noHp={noHp}
            alamat={alamat}
            totalAmount={totalAmount}
            minDpAmount={dpAmount}
            onPrint={handlePrintThermal}
          />
        </div>
      )}
    </div>
  );
};
