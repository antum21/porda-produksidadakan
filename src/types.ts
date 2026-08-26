export type UserRole = 'Admin' | 'Keuangan' | 'Printing' | 'Logistik' | 'Produksi' | 'Pengantaran';

export type ProductionStage = 'Printing' | 'Belanja' | 'Produksi' | 'Pengantaran';

export type OrderStatus = 'Menunggu Pembayaran' | 'Diproses' | 'Selesai';

export type PrintType = 'Manual' | 'Digital' | 'DTF';

export interface UserProfile {
  uid: string;
  nama: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  createdAt?: string;
}

export interface SizeBreakdown {
  S?: number;
  M?: number;
  L?: number;
  XL?: number;
  XXL?: number;
  custom?: number;
}

export interface OrderItem {
  id: string;
  nama_klien: string;
  no_telepon?: string;
  email_klien?: string;
  alamat_kirim?: string;
  jenis_cetak: PrintType;
  bahan_apparel: string; // e.g. "Cotton Combed 30s Reaktif", "Hoodie Fleece 330gsm", "Polo Cotton Pique"
  warna_bahan: string;
  jumlah_pcs: number;
  rincian_ukuran?: SizeBreakdown;
  posisi_cetak?: string; // e.g. "Dada A3 + Punggung A3"
  total_harga: number;
  nominal_dp: number;
  status: OrderStatus;
  invoice_no: string;
  deadline: string;
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
  nama_klien: string;
  jenis_cetak: PrintType;
  bahan_apparel: string;
  warna_bahan: string;
  jumlah_pcs: number;
  rincian_ukuran?: SizeBreakdown;
  deadline: string;
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
