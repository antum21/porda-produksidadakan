export type UserRole = 'super_admin' | 'Admin' | 'Keuangan' | 'Printing' | 'Logistik' | 'Produksi' | 'Pengantaran';

export type ProductionStage = 'Printing' | 'Logistik' | 'Belanja' | 'Produksi' | 'Pengantaran';

export type OrderStatus = 'Menunggu Pembayaran' | 'Diproses' | 'Selesai';

export type PrintType = 'Manual' | 'Digital' | 'DTF';

export type ProjectCategory = 'apparel' | 'grafis' | 'lainnya';

export interface UserProfile {
  uid: string;
  username: string;
  nama: string;
  email?: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  status?: 'active' | 'inactive';
  createdAt?: string;
  lastLogin?: string;
}

export interface SizeBreakdown {
  S?: number;
  M?: number;
  L?: number;
  XL?: number;
  XXL?: number;
  '2XL'?: number;
  '3XL'?: number;
  '4XL'?: number;
  custom?: number;
  [key: string]: number | undefined;
}

export interface SablonOption {
  id: string;
  nama: string; // 'Nama', 'Logo', 'A5', 'A4', 'A3'
  harga: number; // 5000, 8000, 12000, 20000, 30000
}

export interface ApparelOrderItemRow {
  id: string;
  jenis_pesanan: string; // Bebas teks, e.g. "Kaos Combed 30s Hitam"
  harga_satuan: number; // Nominal Rp
  sizes: {
    S: number;
    M: number;
    L: number;
    XL: number;
    '2XL': number;
    '3XL': number;
    '4XL': number;
  };
  sablon_list: Array<{ id: string; nama: string; harga: number }>;
  diskon_sablon: number; // Nominal diskon Rp
}

export interface ApparelDesignCard {
  id: string;
  nama_desain?: string;
  gambar_preview?: string; // base64 / URL
  file_name?: string;
  items: ApparelOrderItemRow[];
}

export interface InvoiceTableRow {
  id: string;
  deskripsi: string;
  harga_satuan: number;
  qty: number;
  total_harga: number;
}

export interface OrderItem {
  id: string;
  kategori_projek?: ProjectCategory; // 'apparel' | 'grafis' | 'lainnya'
  nama_klien: string;
  no_telepon?: string;
  email_klien?: string;
  alamat_kirim?: string;
  jenis_cetak: PrintType | string;
  bahan_apparel?: string; // e.g. "Cotton Combed 30s Reaktif", "Hoodie Fleece 330gsm", "Polo Cotton Pique"
  warna_bahan?: string;
  jumlah_pcs: number;
  rincian_ukuran?: SizeBreakdown;
  posisi_cetak?: string; // e.g. "Dada A3 + Punggung A3"
  // Spesifikasi Percetakan Grafis
  tipe_grafis?: string; // e.g. "Banner / Spanduk", "Stiker & Label", "Brosur & Flyer"
  bahan_cetak?: string; // e.g. "Flexi Korea 440g", "Vinyl Glossy", "Art Paper 260g"
  dimensi_ukuran?: string; // e.g. "3 x 1 Meter", "A3+ (32 x 48 cm)", "Diameter 5 cm"
  finishing?: string; // e.g. "Mata Ayam 4 Sudut", "Laminasi Doff", "Kiss Cut"
  satuan_grafis?: string; // e.g. "m²", "Lembar", "Pcs", "Box", "Rim"
  // Spesifikasi Order Bebas / Lainnya
  nama_item_custom?: string; // e.g. "Jasa Branding & Desain Logo", "Souvenir Payung Custom"
  satuan_custom?: string; // e.g. "Paket", "Pcs", "Set", "Hari"
  deskripsi_custom?: string;
  total_harga: number;
  nominal_dp: number;
  status: OrderStatus;
  invoice_no: string;
  invoice_date?: string;
  deadline: string;
  apparel_designs?: ApparelDesignCard[];
  invoice_items?: InvoiceTableRow[];
  mockup_url?: string;
  catatan?: string;
  created_at: string;
  created_by?: string;
  committed_at?: string;
  work_order_id?: string;
  // Financial & HPP Fields (internal only, optional for backward compatibility)
  hpp?: number;
  laba_kotor?: number;
  margin_persen?: number;
  material_usages?: MaterialUsage[];
  production_costs?: OrderProductionCost[];
  payment_history?: CustomerPaymentRecord[];
}

export type MaterialCategory =
  | 'Kaos Polos'
  | 'Kain'
  | 'DTF / Film'
  | 'Tinta & Kimia'
  | 'Kertas & Stiker'
  | 'Plastik & Packaging'
  | 'Bahan Percetakan'
  | 'Aksesoris & Finishing'
  | 'Bahan Lainnya';

export type PaymentMethod =
  | 'Cash'
  | 'Tunai / Cash'
  | 'Transfer'
  | 'Transfer Bank'
  | 'QRIS'
  | 'Debit'
  | 'Tempo / Hutang'
  | 'Lainnya';

export type PurchasePaymentStatus = 'Lunas' | 'Belum Lunas' | 'DP / Sebagian';

export type OperationalExpenseCategory =
  | 'Listrik'
  | 'Internet'
  | 'Transportasi'
  | 'Bensin'
  | 'Maintenance Mesin'
  | 'Sewa'
  | 'Sewa Tempat / Workshop'
  | 'Sewa Tempat'
  | 'Gaji'
  | 'Gaji & Upah Karyawan'
  | 'Gaji & Uang Makan'
  | 'Marketing'
  | 'Marketing & Iklan'
  | 'Pemasaran & Iklan'
  | 'ATK'
  | 'ATK & Perlengkapan'
  | 'Alat Tulis & Kantor'
  | 'Administrasi'
  | 'Biaya Administrasi'
  | 'Packaging'
  | 'Biaya Bank'
  | 'Air'
  | 'Konsumsi Workshop'
  | 'Biaya Lainnya'
  | 'Lain-lain'
  | 'Lainnya';

export type CustomerPaymentType = 'DP' | 'Pelunasan' | 'Cicilan' | 'Pembayaran Penuh';

export interface MaterialStock {
  id: string;
  nama_bahan: string;
  kategori: MaterialCategory | string;
  stok: number;
  satuan: string; // 'Pcs', 'Meter', 'Roll', 'Kg', 'Lembar', 'Botol', 'Pack', 'Box', etc.
  harga_modal: number; // Rp per unit
  stok_minimum: number;
  supplier_terakhir?: string;
  catatan?: string;
  updated_at: string;
}

export interface MaterialPurchase {
  id: string;
  nomor_pembelian: string;
  tanggal: string; // YYYY-MM-DD
  supplier: string;
  nama_bahan: string;
  kategori: MaterialCategory | string;
  qty: number;
  satuan: string;
  harga_satuan: number;
  total: number;
  status_pembayaran: PurchasePaymentStatus;
  jumlah_dibayar: number;
  sisa_hutang: number;
  metode_pembayaran: PaymentMethod | string;
  catatan?: string;
  material_stock_id?: string;
  created_at: string;
  created_by?: string;
}

export interface SupplierPayment {
  id: string;
  purchase_id: string;
  nomor_pembelian: string;
  supplier: string;
  tanggal: string;
  nominal: number;
  metode_pembayaran: PaymentMethod | string;
  catatan?: string;
  created_at: string;
  created_by?: string;
}

export interface MaterialUsage {
  id: string;
  order_id: string;
  invoice_no: string;
  nama_klien?: string;
  material_stock_id: string;
  nama_bahan: string;
  qty: number;
  satuan: string;
  harga_modal_satuan: number;
  total_biaya: number; // qty * harga_modal_satuan
  tanggal: string;
  catatan?: string;
  created_at: string;
  created_by?: string;
}

export interface OrderProductionCost {
  id: string;
  order_id: string;
  invoice_no: string;
  jenis_biaya: 'Jahit' | 'Bordir' | 'Sablon Vendor' | 'Finishing' | 'Cutting' | 'Packaging' | 'Vendor Lainnya' | string;
  nama_vendor?: string;
  deskripsi: string;
  biaya: number;
  tanggal: string;
  created_at: string;
  created_by?: string;
}

export interface OperationalExpense {
  id: string;
  nomor_transaksi: string;
  tanggal: string;
  kategori: OperationalExpenseCategory | string;
  deskripsi: string;
  nominal: number;
  metode_pembayaran: PaymentMethod | string;
  catatan?: string;
  created_at: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
  is_void?: boolean;
  void_reason?: string;
  void_at?: string;
  void_by?: string;
}

export interface CustomerPaymentRecord {
  id: string;
  order_id: string;
  invoice_no: string;
  nama_klien: string;
  jenis_pembayaran: CustomerPaymentType;
  nominal: number;
  metode_pembayaran: PaymentMethod | string;
  tanggal: string;
  catatan?: string;
  diterima_oleh?: string;
  created_at: string;
}

export interface OtherRevenue {
  id: string;
  tanggal: string;
  sumber: string;
  nominal: number;
  metode_pembayaran: PaymentMethod | string;
  catatan?: string;
  created_at: string;
  created_by?: string;
}

export type FinancePeriod = 'today' | 'week' | 'month' | 'custom';


export interface StageLog {
  tahap: ProductionStage;
  waktu: string;
  oleh: string;
  catatan?: string;
  vendor?: string;
}

export interface WorkOrder {
  id: string;
  order_id: string;
  kategori_projek?: ProjectCategory;
  nama_klien: string;
  jenis_cetak: PrintType | string;
  bahan_apparel?: string;
  warna_bahan?: string;
  jumlah_pcs: number;
  rincian_ukuran?: SizeBreakdown;
  // Spesifikasi Grafis
  tipe_grafis?: string;
  bahan_cetak?: string;
  dimensi_ukuran?: string;
  finishing?: string;
  satuan_grafis?: string;
  // Spesifikasi Lainnya
  nama_item_custom?: string;
  satuan_custom?: string;
  deskripsi_custom?: string;
  deadline: string;
  apparel_designs?: ApparelDesignCard[];
  mockup_url?: string;
  production_images?: Array<{ url: string; label?: string; uploaded_at?: string; uploaded_by?: string }>;
  tahap_sekarang: ProductionStage;
  nama_vendor: string | null; // Vendor cetak eksternal atau vendor supplier blank apparel
  diupdate_oleh: string;
  updated_at: string;
  started_at: string;
  completed_at?: string;
  catatan_tahap?: string;
  checklist?: {
    printing_done?: boolean;
    blank_apparel_ready?: boolean;
    curing_press_done?: boolean;
    qc_passed?: boolean;
    packaging_done?: boolean;
    picked_by_courier?: boolean;
    delivered_to_customer?: boolean;
  };
  riwayat_tahap?: StageLog[];
}
