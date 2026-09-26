import React, { useState } from 'react';
import {
  X,
  BookOpen,
  CircleDollarSign,
  ShoppingCart,
  Package,
  Layers,
  Cpu,
  Receipt,
  DollarSign,
  Wallet,
  Landmark,
  Calculator,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  FileText,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

interface FinanceGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideSection = 'alur' | 'tabs' | 'rumus' | 'tips';

export const FinanceGuideModal: React.FC<FinanceGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<GuideSection>('alur');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#E63946] to-red-500 flex items-center justify-center text-white shadow-md shadow-red-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 font-['Outfit']">
                Buku Panduan Manajemen Keuangan
              </h2>
              <p className="text-xs text-slate-500">
                Panduan praktis pencatatan HPP, Arus Kas, dan Laba Bersih Konveksi & Sablon Porda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-white flex gap-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'alur', label: '1. Alur Kerja Keuangan', icon: TrendingUp },
            { id: 'tabs', label: '2. Fungsi 10 Tab Menu', icon: FileText },
            { id: 'rumus', label: '3. Rumus & Kalkulasi', icon: Calculator },
            { id: 'tips', label: '4. Tips & Best Practice', icon: Lightbulb },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id as GuideSection)}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-[#E63946] text-[#E63946] bg-red-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-sm leading-relaxed">
          {/* TAB 1: ALUR KERJA */}
          {activeSection === 'alur' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 mb-1">
                  Siklus & Alur Kerja Keuangan Konveksi Sablon
                </h3>
                <p className="text-xs text-slate-500">
                  Sistem ERP Porda memisahkan pencatatan antara <strong>Arus Kas (Uang Riil Masuk/Keluar)</strong> dengan <strong>Beban Pokok Penjualan / HPP (Beban Produksi per Pesanan)</strong> agar perhitungan laba rugi akurat.
                </p>
              </div>

              {/* Step Flow Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all">
                  <div className="flex items-center gap-2 text-[#E63946] font-bold text-xs mb-1">
                    <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-[11px]">1</span>
                    <span>BELI BAHAN BAKU (+ Beli Bahan)</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Input pembelian kain/kaos polos/tinta di tab <strong>Pembelian Bahan</strong>. Stok gudang akan otomatis bertambah. Jika beli tempo (hutang), otomatis tercatat di tab <strong>Hutang Supplier</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all">
                  <div className="flex items-center gap-2 text-amber-600 font-bold text-xs mb-1">
                    <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-[11px]">2</span>
                    <span>BEBANI BAHAN KE PESANAN (+ Pakai Bahan)</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Saat kain/kaos mulai diproduksi untuk pesanan (SPK), catat di tab <strong>Pemakaian Bahan</strong>. Stok gudang terpotong otomatis dan biayanya masuk ke <strong>HPP Pesanan</strong> tersebut.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs mb-1">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[11px]">3</span>
                    <span>CATAT BIAYA VENDOR (+ Biaya Vendor)</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Biaya sablon per pcs, ongkos jahit penjahit, bordir, kemasan, atau ongkos kirim dicatat di tab <strong>Biaya Produksi Vendor</strong> dihubungkan ke ID Pesanan terkait.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs mb-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[11px]">4</span>
                    <span>CATAT PEMBAYARAN CUSTOMER (+ Catat Uang Masuk)</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Setiap pelanggan transfer DP, cicilan, atau pelunasan, input di tab <strong>Pembayaran Customer</strong>. Tagihan sisa piutang pesanan berkurang dan kas masuk riil tercatat.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs mb-1">
                    <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[11px]">5</span>
                    <span>INPUT PENGELUARAN OPERASIONAL (+ Tambah Pengeluaran)</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Catat pengeluaran rutin usaha: listrik, token, bensin, konsumsi lembur, sewa ruko, gaji karyawan, pemeliharaan mesin, dll di tab <strong>Pengeluaran Operasional</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all">
                  <div className="flex items-center gap-2 text-purple-600 font-bold text-xs mb-1">
                    <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-[11px]">6</span>
                    <span>PANTAU LABA BERSIH & ARUS KAS DI DASHBOARD</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Buka tab <strong>Dashboard</strong> atau <strong>Modal Pesanan</strong> untuk melihat laba kotor per pesanan, total beban usaha, laba bersih riil, serta saldo kas yang tersedia.
                  </p>
                </div>
              </div>

              {/* Visual Flow diagram summary */}
              <div className="p-4 rounded-2xl bg-red-50/60 border border-red-200/80">
                <h4 className="text-xs font-black uppercase text-red-900 tracking-wider mb-2">
                  Hubungan Data Antar Modul
                </h4>
                <div className="text-xs text-slate-700 space-y-1.5">
                  <p>• <strong>Beli Bahan Tunai</strong>: Kas Keluar ↑, Stok Bahan Gudang ↑</p>
                  <p>• <strong>Beli Bahan Tempo</strong>: Hutang Supplier ↑, Kas Belum Keluar, Stok Gudang ↑</p>
                  <p>• <strong>Bayar Hutang Supplier</strong>: Kas Keluar ↑, Sisa Hutang Supplier ↓</p>
                  <p>• <strong>Pakai Bahan Pesanan</strong>: Stok Gudang ↓, HPP Pesanan ↑ (Laba Kotor Pesanan terhitung otomatis)</p>
                  <p>• <strong>Biaya Vendor (Jahit/Sablon)</strong>: HPP Pesanan ↑, Kas Keluar ↑</p>
                  <p>• <strong>Pelanggan Bayar DP / Lunas</strong>: Kas Masuk ↑, Piutang Pelanggan ↓</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FUNGSI 10 TAB */}
          {activeSection === 'tabs' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 mb-1">
                  Daftar & Penjelasan 10 Tab Manajemen Keuangan
                </h3>
                <p className="text-xs text-slate-500">
                  Setiap tab memiliki tujuan spesifik untuk memudahkan pencatatan tanpa saling tumpang tindih.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                    <CircleDollarSign className="w-4 h-4 text-[#E63946]" />
                    <span>1. Dashboard Keuangan</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Pusat kendali eksekutif. Menampilkan kartu ringkasan Total Omzet (Faktur), Total HPP Pesanan, Total Biaya Operasional (BOP), Laba Bersih, Arus Kas Masuk vs Kas Keluar, serta peringatan stok menipis dan hutang jatuh tempo.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                    <Calculator className="w-4 h-4 text-emerald-600" />
                    <span>2. Modal Pesanan (HPP)</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Menampilkan daftar seluruh pesanan/SPK beserta rincian biaya riil (bahan baku terpakai + biaya vendor sablon/jahit/bordir/ongkir). Anda bisa melihat pesanan mana yang paling menguntungkan (margin %) dan pesanan yang belum diinput HPP-nya. Terdapat tombol <em>Lihat Rincian HPP</em> untuk audit biaya per pcs.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                    <span>3. Pembelian Bahan</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Pencatatan Purchase Order (PO) saat belanja kain, kaos polos, tinta sablon, plastik packing dari supplier. Mendukung opsi pembayaran <strong>Lunas (Tunai/Transfer)</strong> atau <strong>Tempo (Hutang)</strong> dengan tanggal jatuh tempo.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span>4. Stok Bahan (Gudang)</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Katalog inventori gudang. Memantau sisa kuantitas stok bahan baku, estimasi nilai aset gudang, batas stok minimum, dan fitur <strong>Sesuaikan Stok (Stock Opname)</strong> jika terdapat selisih fisik.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                    <Layers className="w-4 h-4 text-amber-500" />
                    <span>5. Pemakaian Bahan (HPP)</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Daftar pemotongan stok bahan baku yang dialokasikan ke pesanan tertentu. Setiap pemakaian langsung memotong stok di tab Stok Bahan dan mengonversinya menjadi biaya HPP pesanan.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    <span>6. Biaya Produksi Vendor</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Pencatatan biaya jasa vendor pihak ketiga atau tukang jahit borongan (sablon plastisol/DTF, ongkos jahit per lusin, bordir komputer, tag label, finishing). Biaya ini diikat ke nomor pesanan.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                    <Receipt className="w-4 h-4 text-slate-800" />
                    <span>7. Pengeluaran Operasional (BOP)</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Biaya rutin di luar pesanan spesifik (sewa ruko/workshop, listrik & air, konsumsi, gaji bulanan, bensin, biaya pemasaran, servis mesin). Dilengkapi fitur <strong>Edit</strong>, <strong>Void (Batalkan transaksi dengan alasan)</strong>, dan <strong>Pulihkan (Restore)</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>8. Pembayaran Customer & Piutang</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Daftar seluruh riwayat pembayaran pelanggan (DP 50%, cicilan, pelunasan sisa tagihan). Anda juga dapat memfilter daftar piutang pesanan yang belum lunas.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                    <Wallet className="w-4 h-4 text-teal-600" />
                    <span>9. Arus Kas (Cash Flow)</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Laporan buku kas riil (Cash Basis). Menampilkan seluruh mutasi uang masuk (dari pembayaran pelanggan) dan mutasi uang keluar (pembelian bahan tunai, bayar vendor, bayar hutang supplier, beban operasional) beserta saldo akhir kas.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs mb-1">
                    <Landmark className="w-4 h-4 text-purple-600" />
                    <span>10. Hutang Supplier</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Daftar tagihan tempo pembelian bahan ke supplier yang belum lunas. Memiliki fitur <strong>Bayar Hutang</strong> (bisa cicil atau lunasi sekaligus) lengkap dengan notifikasi tanggal jatuh tempo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RUMUS & KALKULASI */}
          {activeSection === 'rumus' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 mb-1">
                  Formula & Logika Perhitungan Keuangan
                </h3>
                <p className="text-xs text-slate-500">
                  Memahami cara sistem menghitung angka-angka di laporan keuangan Anda.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">1. HPP Pesanan (Harga Pokok Penjualan)</span>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">Beban Langsung</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-800">
                    HPP Pesanan = Total Biaya Pemakaian Bahan + Total Biaya Vendor (Jahit + Sablon + Bordir + Finishing + Lainnya)
                  </div>
                  <p className="text-xs text-slate-500">
                    Contoh: Kaos Polos 50 pcs @Rp 25.000 (Rp 1.250.000) + Sablon Plastisol 50 pcs @Rp 10.000 (Rp 500.000) + Packing Rp 50.000 = HPP Rp 1.800.000 (HPP per pcs = Rp 36.000).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">2. Laba Kotor Pesanan (Gross Profit)</span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Margin Pesanan</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-800">
                    Laba Kotor = Nilai Total Pesanan (Omzet) - HPP Pesanan
                    <br />
                    Margin Laba Kotor (%) = (Laba Kotor / Total Pesanan) × 100%
                  </div>
                  <p className="text-xs text-slate-500">
                    Jika nilai order Rp 3.000.000 dan HPP Rp 1.800.000, maka Laba Kotor adalah Rp 1.200.000 (Margin 40%).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">3. Laba Bersih Usaha (Net Profit)</span>
                    <span className="text-[11px] font-bold text-[#E63946] bg-red-50 px-2 py-0.5 rounded-md">Hasil Akhir</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-800">
                    Laba Bersih = Total Omzet Pesanan - Total Seluruh HPP Pesanan - Total Beban Operasional (BOP)
                  </div>
                  <p className="text-xs text-slate-500">
                    Mencerminkan keuntungan riil perusahaan setelah dikurangi seluruh biaya bahan, vendor, dan biaya rutin operasional workshop.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">4. Arus Kas Bersih (Net Cash Flow)</span>
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">Uang Nyata</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-800">
                    Net Cash Flow = Total Kas Masuk Riil - Total Kas Keluar Riil
                  </div>
                  <p className="text-xs text-slate-500">
                    Membedakan laba di atas kertas dengan uang fisik/rekening. Pembelian bahan tempo belum memotong arus kas sampai hutang tersebut dibayar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TIPS OPERASIONAL */}
          {activeSection === 'tips' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 mb-1">
                  Tips & Best Practice Pembukuan Konveksi
                </h3>
                <p className="text-xs text-slate-500">
                  Panduan agar data keuangan selalu rapi, tidak terjadi selisih kas, dan stok gudang akurat.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-emerald-950">
                      Disiplin Input Pemakaian Bahan Saat SPK Dimulai
                    </p>
                    <p className="text-xs text-emerald-800">
                      Begitu kain dipotong atau kaos polos dikeluarkan dari rak gudang, langsung catat di menu <strong>+ Pakai Bahan</strong>. Ini menjaga stok fisik gudang selalu sama dengan stok di sistem.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-blue-950">
                      Input Pembayaran Pelanggan Segera Setelah Transfer Diterima
                    </p>
                    <p className="text-xs text-blue-800">
                      Gunakan tombol <strong>+ Catat Uang Masuk</strong> untuk mencatat DP atau pelunasan. Nomor nota atau rekening tujuan (BCA, Mandiri, Kas Tunai) dicatat dengan jelas agar rekonsiliasi mutasi bank mudah dilakukan.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-950">
                      Jika Salah Input Pengeluaran Operasional, Gunakan Fitur Void
                    </p>
                    <p className="text-xs text-amber-800">
                      Di tab <strong>Pengeluaran Operasional</strong>, Anda tidak perlu khawatir jika ada salah nominal atau duplikasi nota. Gunakan tombol <strong>Void (Batalkan)</strong> dengan menyertakan alasan. Transaksi yang divoid tidak akan dihitung di pengeluaran, dan riwayat auditnya tetap tercatat rapi.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-purple-950">
                      Cek Rutin Tab 'Modal Pesanan (HPP)'
                    </p>
                    <p className="text-xs text-purple-800">
                      Perhatikan badge <em>"X Perlu Input"</em> di tab Modal Pesanan. Jika ada pesanan yang selesai diproduksi tapi belum memiliki biaya HPP, segera lengkapi agar laporan laba kotor tidak semu.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-start gap-3">
                  <RotateCcw className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">
                      Tombol Reset Keuangan (Khusus Administrator)
                    </p>
                    <p className="text-xs text-slate-600">
                      Tombol <em>Reset Keuangan</em> di pojok kanan atas digunakan jika Anda ingin mengosongkan seluruh histori transaksi buku keuangan (pembelian, HPP, pengeluaran, kas masuk) untuk memulai pembukuan periode baru dari nol (Rp 0). Master data pesanan pelanggan Anda tetap aman.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Sistem Manajemen Keuangan • Porda Konveksi & Sablon
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
