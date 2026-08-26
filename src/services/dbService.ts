import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { OrderItem, WorkOrder, UserProfile, ProductionStage } from '../types';

export const ORDERS_COLLECTION = 'orders';
export const WORK_ORDERS_COLLECTION = 'work_orders';
export const USERS_COLLECTION = 'users';

// Real-time listener for Orders
export function subscribeOrders(callback: (orders: OrderItem[]) => void) {
  const q = query(collection(db, ORDERS_COLLECTION), orderBy('created_at', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: OrderItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<OrderItem, 'id'>) });
      });
      callback(list);
    },
    (error) => {
      console.error('Error fetching real-time orders:', error);
    }
  );
}

// Real-time listener for Work Orders (Kanban Board)
export function subscribeWorkOrders(callback: (workOrders: WorkOrder[]) => void) {
  const q = query(collection(db, WORK_ORDERS_COLLECTION), orderBy('updated_at', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: WorkOrder[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<WorkOrder, 'id'>) });
      });
      callback(list);
    },
    (error) => {
      console.error('Error fetching real-time work orders:', error);
    }
  );
}

// Create New Order
export async function createOrder(
  data: Omit<OrderItem, 'id' | 'invoice_no' | 'created_at' | 'status'> & {
    status?: OrderItem['status'];
    nominal_dp: number;
    total_harga: number;
  },
  userName: string = 'Staff Admin'
): Promise<string> {
  const orderId = `ORD-${Date.now().toString().slice(-6)}`;
  const invoiceNo = `INV/PRD/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  const newOrder: OrderItem = {
    ...data,
    id: orderId,
    invoice_no: invoiceNo,
    status: data.status || 'Menunggu Pembayaran',
    created_at: now,
    created_by: userName,
  };

  await setDoc(doc(db, ORDERS_COLLECTION, orderId), newOrder);
  return orderId;
}

// Update Order (e.g. update DP, items, status)
export async function updateOrder(orderId: string, updates: Partial<OrderItem>): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  await updateDoc(orderRef, updates);
}

// Commit Order to Production with mandatory DP >= 70% validation
export async function commitOrderToProduction(
  order: OrderItem,
  updatedBy: string,
  initialVendor: string | null = null
): Promise<{ success: boolean; workOrderId?: string; message?: string }> {
  // 1. Mandatory DP Validation (DP must be at least 70% of total price)
  const minRequiredDp = order.total_harga * 0.7;
  if (order.nominal_dp < minRequiredDp) {
    const minStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(minRequiredDp);
    const currentDpStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(order.nominal_dp);
    return {
      success: false,
      message: `Gagal commit! DP terbayar (${currentDpStr}) kurang dari syarat minimal 70% (${minStr}). Mohon update pelunasan DP terlebih dahulu.`,
    };
  }

  const workOrderId = `WO-${order.id.replace('ORD-', '')}`;
  const now = new Date().toISOString();

  const workOrderData: WorkOrder = {
    id: workOrderId,
    order_id: order.id,
    nama_klien: order.nama_klien,
    jenis_cetak: order.jenis_cetak,
    bahan_apparel: order.bahan_apparel,
    warna_bahan: order.warna_bahan,
    jumlah_pcs: order.jumlah_pcs,
    rincian_ukuran: order.rincian_ukuran,
    deadline: order.deadline,
    tahap_sekarang: 'Printing',
    nama_vendor: initialVendor || null,
    diupdate_oleh: updatedBy,
    updated_at: now,
    started_at: now,
    catatan_tahap: 'Pesanan resmi di-commit ke antrean produksi Tahap 1 (Printing).',
    checklist: {
      printing_done: false,
      blank_apparel_ready: false,
      curing_press_done: false,
      qc_passed: false,
      packaging_done: false,
      picked_by_courier: false,
      delivered_to_customer: false,
    },
    riwayat_tahap: [
      {
        tahap: 'Printing',
        waktu: now,
        oleh: updatedBy,
        catatan: `Order di-commit dari invoice ${order.invoice_no}. Siap diproses cetak.`,
        vendor: initialVendor || undefined,
      },
    ],
  };

  // Save work order to Firestore
  await setDoc(doc(db, WORK_ORDERS_COLLECTION, workOrderId), workOrderData);

  // Update original order status to 'Diproses'
  await updateDoc(doc(db, ORDERS_COLLECTION, order.id), {
    status: 'Diproses',
    committed_at: now,
    work_order_id: workOrderId,
  });

  return { success: true, workOrderId };
}

// Update Stage of Work Order in Kanban
export async function updateWorkOrderStage(
  workOrderId: string,
  newStage: ProductionStage,
  updatedBy: string,
  details?: {
    nama_vendor?: string | null;
    catatan_tahap?: string;
    checklistUpdates?: Partial<NonNullable<WorkOrder['checklist']>>;
    isFinalComplete?: boolean;
  }
): Promise<void> {
  const woRef = doc(db, WORK_ORDERS_COLLECTION, workOrderId);
  const snap = await getDoc(woRef);
  if (!snap.exists()) return;

  const currentData = snap.data() as WorkOrder;
  const now = new Date().toISOString();

  const newLog: NonNullable<WorkOrder['riwayat_tahap']>[0] = {
    tahap: newStage,
    waktu: now,
    oleh: updatedBy,
    catatan: details?.catatan_tahap || `Dipindahkan ke tahap ${newStage}`,
    vendor: details?.nama_vendor || currentData.nama_vendor || undefined,
  };

  const updatedChecklist = {
    ...currentData.checklist,
    ...(details?.checklistUpdates || {}),
  };

  const updates: Partial<WorkOrder> = {
    tahap_sekarang: newStage,
    diupdate_oleh: updatedBy,
    updated_at: now,
    catatan_tahap: details?.catatan_tahap || currentData.catatan_tahap,
    checklist: updatedChecklist,
    riwayat_tahap: [...(currentData.riwayat_tahap || []), newLog],
  };

  if (details?.nama_vendor !== undefined) {
    updates.nama_vendor = details.nama_vendor;
  }

  if (details?.isFinalComplete) {
    updates.completed_at = now;
    // Also mark the original order as 'Selesai'
    if (currentData.order_id) {
      try {
        await updateDoc(doc(db, ORDERS_COLLECTION, currentData.order_id), {
          status: 'Selesai',
        });
      } catch (err) {
        console.warn('Could not update order status to Selesai:', err);
      }
    }
  }

  await updateDoc(woRef, updates);
}

// Quick User Profile Sync
export async function syncUserProfile(user: UserProfile): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  await setDoc(userRef, user, { merge: true });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  return null;
}

// Seed sample initial data if Firestore is empty so the app is instantly rich & testable
export async function seedSampleDataIfEmpty(): Promise<void> {
  try {
    const ordersSnap = await getDocs(collection(db, ORDERS_COLLECTION));
    if (!ordersSnap.empty) {
      return; // Already populated
    }

    console.log('Seeding initial Porda ERP apparel data...');

    const sampleOrders: OrderItem[] = [
      {
        id: 'ORD-882101',
        nama_klien: 'Komunitas Vespa Runner',
        no_telepon: '081298765432',
        email_klien: 'vesparunner@gmail.com',
        alamat_kirim: 'Jl. Gejayan No. 45, Sleman, DI Yogyakarta',
        jenis_cetak: 'DTF',
        bahan_apparel: 'Cotton Combed 30s Soft Premium',
        warna_bahan: 'Hitam Jet Black',
        jumlah_pcs: 50,
        rincian_ukuran: { S: 10, M: 18, L: 15, XL: 7 },
        posisi_cetak: 'Dada Depan Logo Kecil + Punggung Full A3 Fullcolor',
        total_harga: 3750000,
        nominal_dp: 3000000, // 80% (Valid for commit)
        status: 'Diproses',
        invoice_no: 'INV/PRD/2026/0101',
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        catatan: 'Prioritas tinggi, mau dipakai acara gathering akhir pekan.',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'Budi (Admin)',
        committed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        work_order_id: 'WO-882101',
      },
      {
        id: 'ORD-882102',
        nama_klien: 'Himpunan Mahasiswa Teknik UI',
        no_telepon: '087712348899',
        email_klien: 'hmti@eng.ui.ac.id',
        alamat_kirim: 'Kampus UI Depok, Fakultas Teknik',
        jenis_cetak: 'Manual',
        bahan_apparel: 'Heavyweight Cotton 20s Solid',
        warna_bahan: 'Navy Blue Tua',
        jumlah_pcs: 120,
        rincian_ukuran: { S: 15, M: 45, L: 40, XL: 15, XXL: 5 },
        posisi_cetak: 'Sablon Rubber Matsui 3 Warna (Dada + Lengan Kanan)',
        total_harga: 9600000,
        nominal_dp: 7200000, // 75% (Valid for commit)
        status: 'Diproses',
        invoice_no: 'INV/PRD/2026/0102',
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        catatan: 'Warna sablon harus sesuai kode Pantone 286C.',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'Sarah (Admin)',
        committed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        work_order_id: 'WO-882102',
      },
      {
        id: 'ORD-882103',
        nama_klien: 'Kedai Kopi Sudut Temu',
        no_telepon: '081377889900',
        email_klien: 'suduttemu.cafe@gmail.com',
        alamat_kirim: 'Jl. Kaliurang KM 5, Caturtunggal, Depok',
        jenis_cetak: 'Digital',
        bahan_apparel: 'Hoodie Cotton Fleece 330gsm',
        warna_bahan: 'Beige Sandstone',
        jumlah_pcs: 25,
        rincian_ukuran: { M: 10, L: 10, XL: 5 },
        posisi_cetak: 'Direct to Garment (DTG) Dada & Bordir Halus',
        total_harga: 4250000,
        nominal_dp: 2000000, // 47% (< 70%, Menunggu pelunasan DP)
        status: 'Menunggu Pembayaran',
        invoice_no: 'INV/PRD/2026/0103',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        catatan: 'Klien baru transfer DP 47%. Belum mencapai syarat 70% untuk masuk produksi.',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'Budi (Admin)',
      },
      {
        id: 'ORD-882104',
        nama_klien: 'Barbershop Gentleman Cut',
        no_telepon: '085611223344',
        email_klien: 'gentlemancut.id@gmail.com',
        alamat_kirim: 'Ruko Ringroad Utara Blok B2, Sleman',
        jenis_cetak: 'DTF',
        bahan_apparel: 'Polo Shirt Cotton Pique Premium',
        warna_bahan: 'Maroon Burgundy',
        jumlah_pcs: 30,
        rincian_ukuran: { M: 12, L: 14, XL: 4 },
        posisi_cetak: 'Logo Dada Kiri + Kerah Belakang',
        total_harga: 2850000,
        nominal_dp: 2850000, // 100% Lunas
        status: 'Selesai',
        invoice_no: 'INV/PRD/2026/0099',
        deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        catatan: 'Sudah diantar dan diterima oleh Kasir Barbershop.',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'Sarah (Admin)',
        committed_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        work_order_id: 'WO-882104',
      },
    ];

    for (const ord of sampleOrders) {
      await setDoc(doc(db, ORDERS_COLLECTION, ord.id), ord);
    }

    // Seed corresponding work orders for active orders
    const sampleWorkOrders: WorkOrder[] = [
      {
        id: 'WO-882101',
        order_id: 'ORD-882101',
        nama_klien: 'Komunitas Vespa Runner',
        jenis_cetak: 'DTF',
        bahan_apparel: 'Cotton Combed 30s Soft Premium',
        warna_bahan: 'Hitam Jet Black',
        jumlah_pcs: 50,
        rincian_ukuran: { S: 10, M: 18, L: 15, XL: 7 },
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tahap_sekarang: 'Printing',
        nama_vendor: 'Vendor DTF Jaya Print Express',
        diupdate_oleh: 'Tim Printing (Rian)',
        updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        started_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        catatan_tahap: 'Film DTF sedang dicetak di vendor eksternal Jaya Print. Estimasi matang sore ini.',
        checklist: {
          printing_done: false,
          blank_apparel_ready: true,
          curing_press_done: false,
          qc_passed: false,
          packaging_done: false,
          picked_by_courier: false,
          delivered_to_customer: false,
        },
        riwayat_tahap: [
          {
            tahap: 'Printing',
            waktu: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            oleh: 'Budi (Admin)',
            catatan: 'Order di-commit. Diserahkan ke tim printing.',
            vendor: 'Vendor DTF Jaya Print Express',
          },
        ],
      },
      {
        id: 'WO-882102',
        order_id: 'ORD-882102',
        nama_klien: 'Himpunan Mahasiswa Teknik UI',
        jenis_cetak: 'Manual',
        bahan_apparel: 'Heavyweight Cotton 20s Solid',
        warna_bahan: 'Navy Blue Tua',
        jumlah_pcs: 120,
        rincian_ukuran: { S: 15, M: 45, L: 40, XL: 15, XXL: 5 },
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tahap_sekarang: 'Produksi',
        nama_vendor: 'Gudang Kaos Polos Nusantara (Supplier)',
        diupdate_oleh: 'Tim Produksi (Agus)',
        updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        started_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        catatan_tahap: 'Sablon meja manual selesai 120 pcs. Sedang proses curing heat press & jahit label leher.',
        checklist: {
          printing_done: true,
          blank_apparel_ready: true,
          curing_press_done: true,
          qc_passed: false,
          packaging_done: false,
          picked_by_courier: false,
          delivered_to_customer: false,
        },
        riwayat_tahap: [
          {
            tahap: 'Printing',
            waktu: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            oleh: 'Tim Printing',
            catatan: 'Afdruk screen & master cetak selesai.',
          },
          {
            tahap: 'Belanja',
            waktu: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
            oleh: 'Tim Logistik',
            catatan: '120 pcs bahan Navy 20s ready dari supplier Nusantara.',
            vendor: 'Gudang Kaos Polos Nusantara (Supplier)',
          },
          {
            tahap: 'Produksi',
            waktu: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
            oleh: 'Tim Produksi (Agus)',
            catatan: 'Sablon meja manual selesai. Proses curing press & QC.',
          },
        ],
      },
    ];

    for (const wo of sampleWorkOrders) {
      await setDoc(doc(db, WORK_ORDERS_COLLECTION, wo.id), wo);
    }

    console.log('Seeding completed successfully.');
  } catch (err) {
    console.error('Error during initial seed:', err);
  }
}
