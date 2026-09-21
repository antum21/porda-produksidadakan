export type UserRole = 'Admin' | 'Keuangan' | 'Printing' | 'Logistik' | 'Produksi' | 'Pengantaran';

export type ProductionStage = 'Printing' | 'Belanja' | 'Produksi' | 'Pengantaran';

export type OrderStatus = 'Menunggu Pembayaran' | 'Diproses' | 'Selesai';

export type PrintType = 'Manual' | 'Digital' | 'DTF';

export type ProjectCategory = 'apparel' | 'grafis' | 'lainnya';

export interface UserProfile {
  uid: string;
  username: string;
  nama: string;
  email: string;
  role: UserRole;
  password?: string;
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
  catatan?: string;
  created_at: string;
  created_by?: string;
  committed_at?: string;
  work_order_id?: string;
}

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
