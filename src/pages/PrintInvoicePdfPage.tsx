import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Download, Layers, CheckCircle2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ORDERS_COLLECTION } from '../services/dbService';
import { OrderItem } from '../types';
import { getStoredPdfInvoiceData, PdfInvoicePayload } from '../utils/printPdfInvoice';

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

export const PrintInvoicePdfPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');
  const autoPrint = searchParams.get('autoPrint') === '1';

  const [invoiceData, setInvoiceData] = useState<PdfInvoicePayload | null>(() => {
    return getStoredPdfInvoiceData();
  });
  const [loading, setLoading] = useState(false);

  // Fetch from Firestore if needed
  useEffect(() => {
    const fetchOrderFromDb = async () => {
      if (!orderId) return;
      if (invoiceData?.order?.id === orderId) return;

      setLoading(true);
      try {
        const docRef = doc(db, ORDERS_COLLECTION, orderId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const ord = { id: snap.id, ...snap.data() } as OrderItem;
          const totalAmount = ord.total_harga || 0;
          const dpAmount =
            typeof ord.nominal_dp === 'number'
              ? ord.nominal_dp
              : Math.round(totalAmount * 0.7);
          const sisaPelunasan = Math.max(0, totalAmount - dpAmount);

          setInvoiceData({
            order: ord,
            invoiceNo: ord.invoice_no || ord.id,
            invoiceDate: ord.invoice_date || (ord.created_at ? ord.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
            dueDate: ord.deadline ? ord.deadline.split('T')[0] : '',
            namaPelanggan: ord.nama_klien || '',
            noHp: ord.no_telepon || '',
            alamat: ord.alamat_kirim || '',
            totalAmount,
            dpAmount,
            sisaPelunasan,
          });
        }
      } catch (err) {
        console.error('Error fetching order for PDF print', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderFromDb();
  }, [orderId, invoiceData]);

  // Set page title for clean default filename when "Save as PDF" is used
  useEffect(() => {
    if (invoiceData) {
      const sanitizedName = (invoiceData.namaPelanggan || 'Pelanggan').replace(/[^a-zA-Z0-9]/g, '_');
      const invNo = (invoiceData.invoiceNo || 'INV').replace(/[^a-zA-Z0-9]/g, '_');
      document.title = `Faktur_Invoice_PORDA_${invNo}_${sanitizedName}`;
    }
  }, [invoiceData]);

  // Auto trigger print if requested
  useEffect(() => {
    if (!loading && invoiceData && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [loading, invoiceData, autoPrint]);

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

  // Group items strictly by design
  const designGroups = useMemo<InvoiceDesignGroup[]>(() => {
    const ord = invoiceData?.order;
    if (!ord) return [];

    if (ord.apparel_designs && ord.apparel_designs.length > 0) {
      return ord.apparel_designs.map((des, dIdx) => {
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

          const effectiveUnitPrice = Math.max(
            0,
            (it.harga_satuan || 0) + sablonTotal - (it.diskon_sablon || 0)
          );
          const sablonNames = (it.sablon_list || []).map((s) => s.nama).join(', ');
          const modelBahan = it.jenis_pesanan?.trim() || ord.bahan_apparel || 'Kaos Apparel';

          if (it.sizes) {
            Object.entries(it.sizes).forEach(([sizeKey, sizeVal]) => {
              const qty = Number(sizeVal) || 0;
              if (qty > 0) {
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
          const fallbackQty = ord.jumlah_pcs || 1;
          const fallbackPrice = Math.round((ord.total_harga || 0) / ord.apparel_designs.length);
          totalQty = fallbackQty;
          subtotal = fallbackPrice;
          groupItems.push({
            id: `fallback-${dIdx}`,
            modelBahan: ord.bahan_apparel || 'Kaos Custom Apparel',
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
          gambarPreview: des.gambar_preview || (dIdx === 0 ? ord.mockup_url : undefined),
          fileName: des.file_name,
          posisiCetak: ord.posisi_cetak,
          sablonList: allSablons,
          items: groupItems,
          totalQty,
          subtotal,
        };
      });
    }

    if (ord.rincian_ukuran && Object.keys(ord.rincian_ukuran).length > 0) {
      const totalPcs = ord.jumlah_pcs || 1;
      const unitPrice = Math.round((ord.total_harga || 0) / totalPcs);
      const baseName = ord.bahan_apparel || ord.jenis_cetak || 'Apparel Kaos';
      const groupItems: InvoiceDesignGroup['items'] = [];
      let totalQty = 0;
      let subtotal = 0;

      Object.entries(ord.rincian_ukuran).forEach(([sizeKey, sizeVal], idx) => {
        const qty = Number(sizeVal) || 0;
        if (qty > 0) {
          const rowTotal = unitPrice * qty;
          totalQty += qty;
          subtotal += rowTotal;
          groupItems.push({
            id: `size-${sizeKey}-${idx}`,
            modelBahan: baseName,
            ukuran: sizeKey,
            sablonNames: ord.posisi_cetak || '',
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
          gambarPreview: ord.mockup_url,
          posisiCetak: ord.posisi_cetak,
          sablonList: [],
          items: groupItems,
          totalQty,
          subtotal,
        },
      ];
    }

    if (ord.kategori_projek === 'grafis') {
      const desc = `${ord.tipe_grafis || 'Cetak Grafis'}${
        ord.bahan_cetak ? ` - ${ord.bahan_cetak}` : ''
      }${ord.dimensi_ukuran ? ` (${ord.dimensi_ukuran})` : ''}${
        ord.finishing ? ` (Fin: ${ord.finishing})` : ''
      }`;
      const qty = ord.jumlah_pcs || 1;
      const unitPrice = Math.round((ord.total_harga || 0) / qty);
      return [
        {
          id: 'grafis-design',
          designIndex: 1,
          namaDesain: ord.tipe_grafis || 'Desain Cetak Grafis',
          gambarPreview: ord.mockup_url,
          fileName: '',
          posisiCetak: ord.finishing,
          sablonList: [],
          items: [
            {
              id: 'g-1',
              modelBahan: desc,
              ukuran: ord.dimensi_ukuran || 'Standar',
              sablonNames: ord.finishing || '',
              qty,
              hargaSatuan: unitPrice,
              totalHarga: ord.total_harga || unitPrice * qty,
            },
          ],
          totalQty: qty,
          subtotal: ord.total_harga || unitPrice * qty,
        },
      ];
    }

    const qty = ord.jumlah_pcs || 1;
    const unitPrice = Math.round((ord.total_harga || 0) / qty);
    const desc = ord.kategori_projek === 'lainnya'
      ? `${ord.nama_item_custom || 'Custom Order'}${ord.deskripsi_custom ? ` - ${ord.deskripsi_custom}` : ''}`
      : `${ord.jenis_cetak || 'Apparel'} - ${ord.bahan_apparel || 'Item Pesanan'}`;

    return [
      {
        id: 'default-design',
        designIndex: 1,
        namaDesain: ord.kategori_projek === 'lainnya' ? 'Item Custom' : 'Desain Pesanan',
        gambarPreview: ord.mockup_url,
        sablonList: [],
        items: [
          {
            id: 'def-1',
            modelBahan: desc,
            ukuran: 'Standar',
            sablonNames: '',
            qty,
            hargaSatuan: unitPrice,
            totalHarga: ord.total_harga || unitPrice * qty,
          },
        ],
        totalQty: qty,
        subtotal: ord.total_harga || unitPrice * qty,
      },
    ];
  }, [invoiceData]);

  const grandTotalQty = designGroups.reduce((acc, g) => acc + g.totalQty, 0) || invoiceData?.order?.jumlah_pcs || 0;
  const grandTotalAmount = invoiceData?.totalAmount || designGroups.reduce((acc, g) => acc + g.subtotal, 0);
  const dpAmount = invoiceData?.dpAmount || 0;
  const sisaPelunasan = invoiceData?.sisaPelunasan || Math.max(0, grandTotalAmount - dpAmount);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5F2] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-2xl bg-[#E63946] text-white flex items-center justify-center font-black text-xl mb-3 animate-pulse">
          P
        </div>
        <p className="text-sm font-bold text-slate-800">Menyiapkan Faktur PDF Porda...</p>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="min-h-screen bg-[#F8F5F2] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-bold text-slate-800 mb-3">Data Invoice Tidak Ditemukan</p>
        <button
          onClick={() => navigate('/orders')}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
        >
          Kembali ke Daftar Pesanan
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#52525B] print:bg-white text-slate-800 flex flex-col items-center py-4 px-2 sm:px-4 print:p-0 print:m-0">
      {/* SCOPED A4 PRINT RULES */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm 6mm;
        }
        @media print {
          html, body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          body * {
            visibility: visible !important;
          }
          .print\\:hidden, #btn-trigger-pdf-print {
            display: none !important;
            visibility: hidden !important;
          }
          #pdf-printable-invoice {
            visibility: visible !important;
            display: block !important;
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background-color: #ffffff !important;
          }
          #pdf-printable-invoice * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #pdf-printable-invoice img {
            visibility: visible !important;
            display: block !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* FLOATING ACTION TOOLBAR (HIDDEN IN PRINT) */}
      <div className="w-full max-w-4xl mb-4 bg-slate-900 text-white p-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 px-4 print:hidden border border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.close()}
            className="flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tutup Halaman</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E63946] animate-pulse" />
            <span className="text-sm font-bold text-white tracking-tight font-['Outfit']">
              Pratinjau Cetak PDF • Porda ERP
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-white/70 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Siap Cetak / Simpan PDF (A4)</span>
          </div>
          <button
            id="btn-trigger-pdf-print"
            type="button"
            onClick={handlePrint}
            className="bg-[#E63946] hover:bg-red-600 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-full shadow-md shadow-red-500/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Simpan PDF / Cetak</span>
          </button>
        </div>
      </div>

      {/* A4 PRINTABLE INVOICE CONTAINER */}
      <div
        id="pdf-printable-invoice"
        className="w-full max-w-4xl bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 text-slate-800 print:shadow-none print:border-none print:rounded-none print:w-full print:max-w-none print:p-0"
      >
        {/* HEADER SECTION (PORDA CRIMSON RED) */}
        <header className="bg-gradient-to-r from-[#E63946] via-[#D90429] to-[#C1121F] text-white p-5 sm:p-7 select-none print:p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* BRAND LOGO: PORDA */}
            <div className="md:col-span-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-[#E63946] font-['Outfit'] font-black text-2xl shadow-md shrink-0">
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

            {/* MIDDLE: Invoice Number, Dates */}
            <div className="md:col-span-4 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-28 text-white/95 font-semibold shrink-0">Invoice Number</span>
                <span className="text-white/80">:</span>
                <div className="bg-black/20 border border-white/25 rounded-lg px-2.5 py-1 text-white text-xs w-full max-w-[150px] font-mono font-bold tracking-wide">
                  {invoiceData.invoiceNo || '-'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-28 text-white/95 font-semibold shrink-0">Invoice Date</span>
                <span className="text-white/80">:</span>
                <div className="bg-black/20 border border-white/25 rounded-lg px-2.5 py-1 text-white text-xs w-full max-w-[150px] font-medium">
                  {formatDateDisplay(invoiceData.invoiceDate)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-28 text-white/95 font-semibold shrink-0">Due Date</span>
                <span className="text-white/80">:</span>
                <div className="bg-black/20 border border-white/25 rounded-lg px-2.5 py-1 text-white text-xs w-full max-w-[150px] font-medium">
                  {formatDateDisplay(invoiceData.dueDate)}
                </div>
              </div>
            </div>

            {/* RIGHT: Bill to */}
            <div className="md:col-span-4 space-y-1.5 text-xs">
              <div className="font-bold text-white text-xs tracking-wider uppercase mb-1">
                Bill To :
              </div>

              <div className="flex items-center gap-2">
                <span className="w-24 text-white/95 font-semibold shrink-0">Klien</span>
                <span className="text-white/80">:</span>
                <div className="bg-black/20 border border-white/25 rounded-lg px-2.5 py-1 text-white text-xs flex-1 font-bold truncate">
                  {invoiceData.namaPelanggan || '-'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-24 text-white/95 font-semibold shrink-0">No HP</span>
                <span className="text-white/80">:</span>
                <div className="bg-black/20 border border-white/25 rounded-lg px-2.5 py-1 text-white text-xs flex-1 font-mono">
                  {invoiceData.noHp || '-'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-24 text-white/95 font-semibold shrink-0">Alamat</span>
                <span className="text-white/80">:</span>
                <div className="bg-black/20 border border-white/25 rounded-lg px-2.5 py-1 text-white text-xs flex-1 truncate">
                  {invoiceData.alamat || '-'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* BODY: DESKRIPSI ITEM & DESAIN DIPISAH BERDASARKAN DESAIN */}
        {/* ========================================================================= */}
        <div className="p-5 sm:p-7 bg-[#FAF7F5] space-y-5 print:p-4 print:space-y-4">
          {/* Header Baris Ringkasan Desain */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-50 text-[#E63946] flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                Rincian Pesanan per Desain
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-red-50 text-[#E63946] border border-red-200 font-mono">
              {designGroups.length} Desain Terlampir
            </span>
          </div>

          {/* ITERASI SETIAP DESAIN: 1/3 GAMBAR BESAR & 2/3 TABEL RINCIAN ITEM */}
          <div className="space-y-5 print:space-y-3.5">
            {designGroups.map((group, gIdx) => (
              <div
                key={group.id || `design-group-${gIdx}`}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden break-inside-avoid print:shadow-none print:border-slate-300"
              >
                {/* HEADER KARTU DESAIN */}
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
                        <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-2 shadow-2xs min-h-[180px] max-h-[220px]">
                          <img
                            src={group.gambarPreview}
                            alt={group.namaDesain}
                            className="max-h-[190px] w-full object-contain"
                          />
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
                          <th className="py-2.5 px-3 w-5/12">Model & Spesifikasi</th>
                          <th className="py-2.5 px-2 text-center w-2/12">Ukuran</th>
                          <th className="py-2.5 px-2 text-center w-1/12">QTY</th>
                          <th className="py-2.5 px-2 text-center w-2/12">Harga</th>
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
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {it.sablonNames}
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

          {/* SUMMARY TOTALS & SISA TAGIHAN */}
          <div className="flex justify-end pt-2">
            <div className="space-y-1.5 text-xs min-w-[290px] bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3 justify-between">
                <span className="font-semibold text-slate-600">Total Keseluruhan QTY</span>
                <div className="bg-[#FAF7F5] border border-slate-200 rounded-lg px-3 py-1 text-right font-bold text-slate-800 min-w-[130px] font-mono">
                  {grandTotalQty} Pcs
                </div>
              </div>

              <div className="flex items-center gap-3 justify-between">
                <span className="font-bold text-slate-800">GRAND TOTAL</span>
                <div className="bg-red-50 border border-red-200/70 rounded-lg px-3 py-1 text-right font-black text-[#E63946] min-w-[130px] font-mono text-sm">
                  {formatRupiah(grandTotalAmount)}
                </div>
              </div>

              <div className="flex items-center gap-3 justify-between">
                <span className="font-semibold text-slate-600">DP Diterima</span>
                <div className="bg-[#FAF7F5] border border-slate-200 rounded-lg px-3 py-1 text-right font-bold text-slate-800 min-w-[130px] font-mono">
                  {formatRupiah(dpAmount)}
                </div>
              </div>

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
        {/* FOOTER SECTION (PORDA CRIMSON RED) */}
        {/* ========================================================================= */}
        <footer className="bg-gradient-to-r from-[#E63946] via-[#D90429] to-[#C1121F] text-white p-5 sm:p-6 select-none print:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
  );
};
