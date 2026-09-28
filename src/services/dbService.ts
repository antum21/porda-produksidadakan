import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  OrderItem,
  WorkOrder,
  UserProfile,
  ProductionStage,
  MaterialStock,
  MaterialPurchase,
  SupplierPayment,
  MaterialUsage,
  OrderProductionCost,
  OperationalExpense,
  CustomerPaymentRecord,
  OtherRevenue,
} from '../types';
import { sanitizeApparelDesignsForStorage } from '../utils/imageCompressor';

export const ORDERS_COLLECTION = 'orders';
export const WORK_ORDERS_COLLECTION = 'work_orders';
export const USERS_COLLECTION = 'users';
export const MATERIAL_STOCKS_COLLECTION = 'material_stocks';
export const MATERIAL_PURCHASES_COLLECTION = 'material_purchases';
export const SUPPLIER_PAYMENTS_COLLECTION = 'supplier_payments';
export const MATERIAL_USAGES_COLLECTION = 'material_usages';
export const ORDER_PRODUCTION_COSTS_COLLECTION = 'order_production_costs';
export const OPERATIONAL_EXPENSES_COLLECTION = 'operational_expenses';
export const CUSTOMER_PAYMENTS_COLLECTION = 'customer_payments';
export const OTHER_REVENUES_COLLECTION = 'other_revenues';


/**
 * Recursively remove undefined properties from any object or array to ensure Firestore setDoc/updateDoc never fails
 */
export function cleanUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => (typeof item === 'object' && item !== null ? cleanUndefinedFields(item) : item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = typeof value === 'object' && value !== null ? cleanUndefinedFields(value) : value;
      }
    }
    return cleaned as T;
  }
  return obj;
}

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

// Real-time listener for Users / Staff (Admin Panel)
export function subscribeUsers(callback: (users: UserProfile[]) => void) {
  const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ uid: docSnap.id, ...(docSnap.data() as Omit<UserProfile, 'uid'>) });
      });
      callback(list);
    },
    (error) => {
      console.error('Error fetching real-time users:', error);
    }
  );
}

// Fetch all users
export async function getUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, USERS_COLLECTION));
  const list: UserProfile[] = [];
  snap.forEach((docSnap) => {
    list.push({ uid: docSnap.id, ...(docSnap.data() as Omit<UserProfile, 'uid'>) });
  });
  return list;
}

// Super Admin: Create new staff profile (no plaintext passwords)
export async function createUserByAdmin(data: {
  username: string;
  nama: string;
  role: UserProfile['role'];
  email?: string;
  phone?: string;
}): Promise<UserProfile> {
  const cleanUsername = data.username.trim().toLowerCase().replace(/\s+/g, '_');
  
  // Check if username already exists
  const q = query(collection(db, USERS_COLLECTION), where('username', '==', cleanUsername));
  const existingSnap = await getDocs(q);
  if (!existingSnap.empty) {
    throw new Error(`Username "${cleanUsername}" sudah digunakan. Silakan pilih username lain.`);
  }

  const uid = `usr-${Date.now().toString().slice(-6)}-${cleanUsername}`;
  const now = new Date().toISOString();
  const generatedEmail = data.email?.trim() || `${cleanUsername}@porda.app`;

  const newProfile: UserProfile = {
    uid,
    username: cleanUsername,
    nama: data.nama.trim(),
    email: generatedEmail,
    role: data.role,
    phone: data.phone?.trim() || '',
    status: 'active',
    createdAt: now,
  };

  await setDoc(doc(db, USERS_COLLECTION, uid), newProfile);
  return newProfile;
}

// Super Admin: Update user profile / role
export async function updateUserByAdmin(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  // Guarantee password is never written into Firestore
  const { ...safeUpdates } = updates as any;
  delete safeUpdates.password;
  await updateDoc(userRef, safeUpdates);
}

// Super Admin: Delete user account
export async function deleteUserByAdmin(uid: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await deleteDoc(userRef);
}

export const DEFAULT_SYSTEM_USERS: UserProfile[] = [
  {
    uid: 'usr-superadmin-01',
    username: 'Admin123',
    nama: 'Super Admin PORDA',
    email: 'admin@porda.app',
    role: 'super_admin',
    phone: '081234567890',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    uid: 'usr-printing-01',
    username: 'printing',
    nama: 'Rian Pratama (Div. Cetak & Film)',
    email: 'printing@porda.app',
    role: 'Printing',
    phone: '081298761122',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    uid: 'usr-logistik-01',
    username: 'logistik',
    nama: 'Doni Saputra (Div. Bahan & Supplier)',
    email: 'logistik@porda.app',
    role: 'Logistik',
    phone: '085678901234',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    uid: 'usr-produksi-01',
    username: 'produksi',
    nama: 'Agus Setiawan (Div. Finishing, Press & QC)',
    email: 'produksi@porda.app',
    role: 'Produksi',
    phone: '087812345678',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    uid: 'usr-pengantaran-01',
    username: 'kurir',
    nama: 'Hadi Kurnia (Div. Delivery & Kurir)',
    email: 'kurir@porda.app',
    role: 'Pengantaran',
    phone: '081399887766',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    uid: 'usr-keuangan-01',
    username: 'finance',
    nama: 'Siti Rahma (Div. Finance & Kasir)',
    email: 'finance@porda.app',
    role: 'Keuangan',
    phone: '082155667788',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

// Create New Order
export async function createOrder(
  data: Omit<OrderItem, 'id' | 'created_at' | 'status'> & {
    invoice_no?: string;
    status?: OrderItem['status'];
    nominal_dp: number;
    total_harga: number;
  },
  userName: string = 'Staff Admin'
): Promise<string> {
  const orderId = `ORD-${Date.now().toString().slice(-6)}`;
  const invoiceNo = data.invoice_no || `${Math.floor(100000 + Math.random() * 900000)}`;
  const now = new Date().toISOString();

  const newOrder: OrderItem = {
    ...data,
    id: orderId,
    invoice_no: invoiceNo,
    status: data.status || 'Menunggu Pembayaran',
    created_at: now,
    created_by: userName,
  };

  const sanitizedOrder = await sanitizeApparelDesignsForStorage(newOrder);
  await setDoc(doc(db, ORDERS_COLLECTION, orderId), cleanUndefinedFields(sanitizedOrder));

  // Auto record initial payment in customer_payments if nominal_dp > 0
  if (Number(data.nominal_dp) > 0) {
    try {
      const payId = `PAY-${Date.now().toString().slice(-6)}`;
      const isFull = Number(data.nominal_dp) >= Number(data.total_harga);
      const paymentRecord: CustomerPaymentRecord = {
        id: payId,
        order_id: orderId,
        invoice_no: invoiceNo,
        nama_klien: data.nama_klien,
        jenis_pembayaran: isFull ? 'Pembayaran Penuh' : 'DP',
        nominal: Number(data.nominal_dp),
        metode_pembayaran: 'Transfer Bank',
        tanggal: now.split('T')[0],
        catatan: isFull ? 'Pembayaran lunas saat pembuatan pesanan' : 'DP awal saat pembuatan pesanan',
        diterima_oleh: userName,
        created_at: now,
      };
      await setDoc(doc(db, CUSTOMER_PAYMENTS_COLLECTION, payId), cleanUndefinedFields(paymentRecord));
    } catch (e) {
      console.warn('Could not auto-record customer payment on createOrder:', e);
    }
  }

  return orderId;
}

// Update Order (e.g. update DP, items, status)
export async function updateOrder(orderId: string, updates: Partial<OrderItem>): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const sanitizedUpdates = await sanitizeApparelDesignsForStorage(updates);
  await updateDoc(orderRef, cleanUndefinedFields(sanitizedUpdates));
}

export interface DeleteOrderResult {
  success: boolean;
  deletedOrderId: string;
  deletedWorkOrdersCount: number;
  deletedPaymentsCount: number;
  deletedProductionCostsCount: number;
  deletedMaterialUsagesCount: number;
  restoredStockItemsCount: number;
}

/**
 * Delete an order and cascade delete all associated production and financial records:
 * 1. Work Orders / SPK (in work_orders collection)
 * 2. Customer Payments / DP / Pelunasan (in customer_payments collection)
 * 3. Order Production Costs / Biaya Vendor (in order_production_costs collection)
 * 4. Material Usages / Pemakaian Bahan (in material_usages collection, with optional stock return)
 * 5. The Order document itself (in orders collection)
 */
export async function deleteOrder(
  orderId: string,
  options: { restoreMaterialStock?: boolean; operatorName?: string } = { restoreMaterialStock: true }
): Promise<DeleteOrderResult> {
  const result: DeleteOrderResult = {
    success: false,
    deletedOrderId: orderId,
    deletedWorkOrdersCount: 0,
    deletedPaymentsCount: 0,
    deletedProductionCostsCount: 0,
    deletedMaterialUsagesCount: 0,
    restoredStockItemsCount: 0,
  };

  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) {
    throw new Error(`Pesanan dengan ID ${orderId} tidak ditemukan.`);
  }

  const orderData = orderSnap.data() as OrderItem;
  const invoiceNo = orderData.invoice_no;
  const workOrderId = orderData.work_order_id;

  // 1. Delete associated Work Orders (Data Produksi / SPK)
  const workOrderDocIds = new Set<string>();
  if (workOrderId) workOrderDocIds.add(workOrderId);

  // Search by order_id == orderId
  try {
    const woQuery1 = query(collection(db, WORK_ORDERS_COLLECTION), where('order_id', '==', orderId));
    const woSnap1 = await getDocs(woQuery1);
    woSnap1.forEach((d) => workOrderDocIds.add(d.id));
  } catch (err) {
    console.warn('Error querying work orders by order_id:', err);
  }

  // Search by order_id == invoiceNo
  if (invoiceNo) {
    try {
      const woQuery2 = query(collection(db, WORK_ORDERS_COLLECTION), where('order_id', '==', invoiceNo));
      const woSnap2 = await getDocs(woQuery2);
      woSnap2.forEach((d) => workOrderDocIds.add(d.id));
    } catch (err) {
      console.warn('Error querying work orders by invoice_no:', err);
    }
  }

  for (const woId of workOrderDocIds) {
    try {
      await deleteDoc(doc(db, WORK_ORDERS_COLLECTION, woId));
      result.deletedWorkOrdersCount++;
    } catch (err) {
      console.warn(`Failed to delete work order ${woId}:`, err);
    }
  }

  // 2. Delete Customer Payments (Data Keuangan - Pembayaran Customer)
  const paymentDocIds = new Set<string>();
  try {
    const payQuery1 = query(collection(db, CUSTOMER_PAYMENTS_COLLECTION), where('order_id', '==', orderId));
    const paySnap1 = await getDocs(payQuery1);
    paySnap1.forEach((d) => paymentDocIds.add(d.id));
  } catch (err) {
    console.warn('Error querying customer payments by order_id:', err);
  }

  if (invoiceNo) {
    try {
      const payQuery2 = query(collection(db, CUSTOMER_PAYMENTS_COLLECTION), where('invoice_no', '==', invoiceNo));
      const paySnap2 = await getDocs(payQuery2);
      paySnap2.forEach((d) => paymentDocIds.add(d.id));
    } catch (err) {
      console.warn('Error querying customer payments by invoice_no:', err);
    }
  }

  for (const payId of paymentDocIds) {
    try {
      await deleteDoc(doc(db, CUSTOMER_PAYMENTS_COLLECTION, payId));
      result.deletedPaymentsCount++;
    } catch (err) {
      console.warn(`Failed to delete payment ${payId}:`, err);
    }
  }

  // 3. Delete Order Production Costs (Data Keuangan - Biaya Vendor Sablon/Jahit dll)
  const costDocIds = new Set<string>();
  try {
    const costQuery1 = query(collection(db, ORDER_PRODUCTION_COSTS_COLLECTION), where('order_id', '==', orderId));
    const costSnap1 = await getDocs(costQuery1);
    costSnap1.forEach((d) => costDocIds.add(d.id));
  } catch (err) {
    console.warn('Error querying production costs by order_id:', err);
  }

  if (invoiceNo) {
    try {
      const costQuery2 = query(collection(db, ORDER_PRODUCTION_COSTS_COLLECTION), where('invoice_no', '==', invoiceNo));
      const costSnap2 = await getDocs(costQuery2);
      costSnap2.forEach((d) => costDocIds.add(d.id));
    } catch (err) {
      console.warn('Error querying production costs by invoice_no:', err);
    }
  }

  for (const costId of costDocIds) {
    try {
      await deleteDoc(doc(db, ORDER_PRODUCTION_COSTS_COLLECTION, costId));
      result.deletedProductionCostsCount++;
    } catch (err) {
      console.warn(`Failed to delete production cost ${costId}:`, err);
    }
  }

  // 4. Delete Material Usages (Data Keuangan & Bahan Baku - Pemakaian Bahan) and restore stock
  const usageDocs: Array<{ id: string; data: MaterialUsage }> = [];
  try {
    const usageQuery1 = query(collection(db, MATERIAL_USAGES_COLLECTION), where('order_id', '==', orderId));
    const usageSnap1 = await getDocs(usageQuery1);
    usageSnap1.forEach((d) => usageDocs.push({ id: d.id, data: d.data() as MaterialUsage }));
  } catch (err) {
    console.warn('Error querying material usages by order_id:', err);
  }

  if (invoiceNo) {
    try {
      const usageQuery2 = query(collection(db, MATERIAL_USAGES_COLLECTION), where('invoice_no', '==', invoiceNo));
      const usageSnap2 = await getDocs(usageQuery2);
      usageSnap2.forEach((d) => {
        if (!usageDocs.some((u) => u.id === d.id)) {
          usageDocs.push({ id: d.id, data: d.data() as MaterialUsage });
        }
      });
    } catch (err) {
      console.warn('Error querying material usages by invoice_no:', err);
    }
  }

  for (const item of usageDocs) {
    try {
      // Restore stock if requested
      if (options.restoreMaterialStock !== false && item.data.material_stock_id && item.data.qty) {
        try {
          const stockRef = doc(db, MATERIAL_STOCKS_COLLECTION, item.data.material_stock_id);
          const stockSnap = await getDoc(stockRef);
          if (stockSnap.exists()) {
            const stockData = stockSnap.data() as MaterialStock;
            const restoredStock = Number(stockData.stok || 0) + Number(item.data.qty);
            await updateDoc(stockRef, {
              stok: restoredStock,
              updated_at: new Date().toISOString(),
            });
            result.restoredStockItemsCount++;
          }
        } catch (stockErr) {
          console.warn(`Failed to restore stock for usage ${item.id}:`, stockErr);
        }
      }

      await deleteDoc(doc(db, MATERIAL_USAGES_COLLECTION, item.id));
      result.deletedMaterialUsagesCount++;
    } catch (err) {
      console.warn(`Failed to delete material usage ${item.id}:`, err);
    }
  }

  // 5. Finally, Delete the Order itself
  await deleteDoc(orderRef);
  result.success = true;

  return result;
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
    kategori_projek: order.kategori_projek || 'apparel',
    nama_klien: order.nama_klien,
    jenis_cetak: order.jenis_cetak,
    bahan_apparel: order.bahan_apparel || undefined,
    warna_bahan: order.warna_bahan || undefined,
    jumlah_pcs: order.jumlah_pcs,
    rincian_ukuran: order.rincian_ukuran || undefined,
    tipe_grafis: order.tipe_grafis || undefined,
    bahan_cetak: order.bahan_cetak || undefined,
    dimensi_ukuran: order.dimensi_ukuran || undefined,
    finishing: order.finishing || undefined,
    satuan_grafis: order.satuan_grafis || undefined,
    nama_item_custom: order.nama_item_custom || undefined,
    satuan_custom: order.satuan_custom || undefined,
    deskripsi_custom: order.deskripsi_custom || undefined,
    deadline: order.deadline,
    apparel_designs: order.apparel_designs || undefined,
    mockup_url: order.mockup_url || undefined,
    tahap_sekarang: 'Waiting',
    nama_vendor: initialVendor || null,
    diupdate_oleh: updatedBy,
    updated_at: now,
    started_at: now,
    catatan_tahap: 'Pesanan resmi di-commit ke antrean produksi Tahap 1 (Waiting: Menunggu Bahan & Antrean).',
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
        tahap: 'Waiting',
        waktu: now,
        oleh: updatedBy,
        catatan: `Order di-commit dari invoice ${order.invoice_no}. Masuk antrean Waiting.`,
        vendor: initialVendor || undefined,
      },
    ],
  };

  // Save work order to Firestore
  const sanitizedWorkOrder = await sanitizeApparelDesignsForStorage(workOrderData);
  await setDoc(doc(db, WORK_ORDERS_COLLECTION, workOrderId), cleanUndefinedFields(sanitizedWorkOrder));

  // Update original order status to 'Diproses'
  await updateDoc(doc(db, ORDERS_COLLECTION, order.id), cleanUndefinedFields({
    status: 'Diproses',
    committed_at: now,
    work_order_id: workOrderId,
  }));

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
    reopenFromArchive?: boolean;
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
    catatan: details?.catatan_tahap || (details?.isFinalComplete ? 'Pesanan selesai diproduksi & masuk arsip' : `Dipindahkan ke tahap ${newStage}`),
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
    // Mark the original order in orders collection as 'Selesai'
    if (currentData.order_id) {
      try {
        const directDoc = await getDoc(doc(db, ORDERS_COLLECTION, currentData.order_id));
        if (directDoc.exists()) {
          await updateDoc(doc(db, ORDERS_COLLECTION, currentData.order_id), cleanUndefinedFields({
            status: 'Selesai',
          }));
        } else {
          // Search by work_order_id or invoice_no
          const qOrd = query(collection(db, ORDERS_COLLECTION), where('work_order_id', '==', workOrderId));
          const qSnap = await getDocs(qOrd);
          if (!qSnap.empty) {
            for (const d of qSnap.docs) {
              await updateDoc(d.ref, { status: 'Selesai' });
            }
          } else {
            const qInv = query(collection(db, ORDERS_COLLECTION), where('invoice_no', '==', currentData.order_id));
            const qInvSnap = await getDocs(qInv);
            for (const d of qInvSnap.docs) {
              await updateDoc(d.ref, { status: 'Selesai' });
            }
          }
        }
      } catch (err) {
        console.warn('Could not update order status to Selesai:', err);
      }
    }
  } else if (details?.reopenFromArchive) {
    updates.completed_at = null as any;
    // Restore order status to 'Diproses'
    if (currentData.order_id) {
      try {
        const directDoc = await getDoc(doc(db, ORDERS_COLLECTION, currentData.order_id));
        if (directDoc.exists()) {
          await updateDoc(doc(db, ORDERS_COLLECTION, currentData.order_id), { status: 'Diproses' });
        } else {
          const qOrd = query(collection(db, ORDERS_COLLECTION), where('work_order_id', '==', workOrderId));
          const qSnap = await getDocs(qOrd);
          for (const d of qSnap.docs) {
            await updateDoc(d.ref, { status: 'Diproses' });
          }
        }
      } catch (err) {
        console.warn('Could not revert order status:', err);
      }
    }
  }

  await updateDoc(woRef, cleanUndefinedFields(updates));
}

// Attach image or production proof to Work Order
export async function attachImageToWorkOrder(
  workOrderId: string,
  image: { url: string; label?: string },
  uploadedBy: string
): Promise<void> {
  const woRef = doc(db, WORK_ORDERS_COLLECTION, workOrderId);
  const snap = await getDoc(woRef);
  if (!snap.exists()) return;
  const currentData = snap.data() as WorkOrder;
  const now = new Date().toISOString();
  const newImg = {
    url: image.url,
    label: image.label || 'Foto Bukti / Sampel Produksi',
    uploaded_at: now,
    uploaded_by: uploadedBy,
  };
  const existingImages = currentData.production_images || [];
  await updateDoc(woRef, cleanUndefinedFields({
    production_images: [...existingImages, newImg],
    updated_at: now,
  }));
}

// Quick User Profile Sync
export async function syncUserProfile(user: UserProfile): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  await setDoc(userRef, cleanUndefinedFields(user), { merge: true });
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
    // 1. Seed initial users if users collection is empty
    const usersSnap = await getDocs(collection(db, USERS_COLLECTION));
    if (usersSnap.empty) {
      console.log('Seeding initial staff & super admin users...');
      const defaultUsers: UserProfile[] = [
        {
          uid: 'usr-superadmin-01',
          username: 'Admin123',
          nama: 'Super Admin PORDA',
          email: 'admin@porda.app',
          role: 'super_admin',
          phone: '081234567890',
          status: 'active',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          uid: 'usr-printing-01',
          username: 'printing',
          nama: 'Rian Pratama (Div. Cetak & Film)',
          email: 'printing@porda.app',
          role: 'Printing',
          phone: '081298761122',
          status: 'active',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          uid: 'usr-logistik-01',
          username: 'logistik',
          nama: 'Doni Saputra (Div. Bahan & Supplier)',
          email: 'logistik@porda.app',
          role: 'Logistik',
          phone: '085678901234',
          status: 'active',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          uid: 'usr-produksi-01',
          username: 'produksi',
          nama: 'Agus Setiawan (Div. Finishing, Press & QC)',
          email: 'produksi@porda.app',
          role: 'Produksi',
          phone: '087812345678',
          status: 'active',
          avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          uid: 'usr-pengantaran-01',
          username: 'kurir',
          nama: 'Hadi Kurnia (Div. Delivery & Kurir)',
          email: 'kurir@porda.app',
          role: 'Pengantaran',
          phone: '081399887766',
          status: 'active',
          avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          uid: 'usr-keuangan-01',
          username: 'finance',
          nama: 'Siti Rahma (Div. Finance & Kasir)',
          email: 'finance@porda.app',
          role: 'Keuangan',
          phone: '082155667788',
          status: 'active',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      for (const u of defaultUsers) {
        await setDoc(doc(db, USERS_COLLECTION, u.uid), cleanUndefinedFields(u));
      }
    }

    // 2. Seed initial orders if empty
    const ordersSnap = await getDocs(collection(db, ORDERS_COLLECTION));
    if (ordersSnap.empty) {
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
      await setDoc(doc(db, ORDERS_COLLECTION, ord.id), cleanUndefinedFields(ord));
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
      await setDoc(doc(db, WORK_ORDERS_COLLECTION, wo.id), cleanUndefinedFields(wo));
    }
  }

  console.log('Seeding completed successfully.');
} catch (err) {
    console.error('Error during initial seed:', err);
  }
}

// =========================================================================
// REAL-TIME FINANCIAL SUBSCRIPTIONS
// =========================================================================

// 1. Material Stocks (Inventori Bahan)
export function subscribeMaterialStocks(callback: (stocks: MaterialStock[]) => void) {
  const q = query(collection(db, MATERIAL_STOCKS_COLLECTION), orderBy('nama_bahan', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: MaterialStock[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<MaterialStock, 'id'>) });
      });
      callback(list);
    },
    (error) => {
      console.error('Error fetching real-time material stocks:', error);
    }
  );
}

// 2. Material Purchases (Pembelian Bahan & Hutang Supplier)
export function subscribeMaterialPurchases(callback: (purchases: MaterialPurchase[]) => void) {
  const q = query(collection(db, MATERIAL_PURCHASES_COLLECTION), orderBy('tanggal', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: MaterialPurchase[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<MaterialPurchase, 'id'>) });
      });
      callback(list);
    },
    (error) => {
      console.error('Error fetching real-time material purchases:', error);
    }
  );
}

// 3. Supplier Payments (Riwayat Pembayaran Hutang Supplier)
export function subscribeSupplierPayments(callback: (payments: SupplierPayment[]) => void) {
  const q = query(collection(db, SUPPLIER_PAYMENTS_COLLECTION), orderBy('tanggal', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: SupplierPayment[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<SupplierPayment, 'id'>) });
      });
      callback(list);
    },
    (error) => {
      console.error('Error fetching real-time supplier payments:', error);
    }
  );
}

// 4. Material Usages (Pemakaian Bahan per Order)
export function subscribeMaterialUsages(callback: (usages: MaterialUsage[]) => void) {
  const q = query(collection(db, MATERIAL_USAGES_COLLECTION), orderBy('tanggal', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: MaterialUsage[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<MaterialUsage, 'id'>) });
      });
      callback(list);
    },
    (error) => {
      console.error('Error fetching real-time material usages:', error);
    }
  );
}

// 5. Order Production Costs (Biaya Vendor / Maklon Langsung per Order)
export function subscribeOrderProductionCosts(callback: (costs: OrderProductionCost[]) => void) {
  const q = query(collection(db, ORDER_PRODUCTION_COSTS_COLLECTION), orderBy('tanggal', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: OrderProductionCost[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<OrderProductionCost, 'id'>) });
      });
      callback(list);
    },
    (error) => {
      console.error('Error fetching real-time production costs:', error);
    }
  );
}

// 6. Operational Expenses (Biaya Operasional Umum)
export function subscribeOperationalExpenses(callback: (expenses: OperationalExpense[]) => void) {
  const q = query(collection(db, OPERATIONAL_EXPENSES_COLLECTION), orderBy('tanggal', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: OperationalExpense[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<OperationalExpense, 'id'>) });
      });
      callback(list);
    },
    (error) => {
      console.error('Error fetching real-time operational expenses:', error);
    }
  );
}

// 7. Customer Payments (Riwayat Pembayaran DP & Pelunasan)
export function subscribeCustomerPayments(callback: (payments: CustomerPaymentRecord[]) => void) {
  const q = query(collection(db, CUSTOMER_PAYMENTS_COLLECTION), orderBy('tanggal', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: CustomerPaymentRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<CustomerPaymentRecord, 'id'>) });
      });
      callback(list);
    },
    (error) => {
      console.error('Error fetching real-time customer payments:', error);
    }
  );
}

// =========================================================================
// FINANCIAL & INVENTORY MUTATIONS
// =========================================================================

// Upsert Material Stock item
export async function upsertMaterialStock(
  stock: Partial<MaterialStock> & { nama_bahan: string; kategori: string; satuan: string; harga_modal: number; stok_minimum: number }
): Promise<string> {
  const now = new Date().toISOString();
  const stockId = stock.id || `stk-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5)}`;
  const cleanData: MaterialStock = {
    id: stockId,
    nama_bahan: stock.nama_bahan.trim(),
    kategori: stock.kategori,
    stok: Number(stock.stok || 0),
    satuan: stock.satuan.trim(),
    harga_modal: Number(stock.harga_modal || 0),
    stok_minimum: Number(stock.stok_minimum || 5),
    supplier_terakhir: stock.supplier_terakhir || '',
    catatan: stock.catatan || '',
    updated_at: now,
  };

  await setDoc(doc(db, MATERIAL_STOCKS_COLLECTION, stockId), cleanUndefinedFields(cleanData), { merge: true });
  return stockId;
}

// Manual stock adjustment
export async function adjustMaterialStock(stockId: string, newStockQty: number, catatan?: string): Promise<void> {
  const stockRef = doc(db, MATERIAL_STOCKS_COLLECTION, stockId);
  const now = new Date().toISOString();
  await updateDoc(stockRef, cleanUndefinedFields({
    stok: Math.max(0, Number(newStockQty)),
    updated_at: now,
    catatan: catatan ? catatan : undefined,
  }));
}

// Create Material Purchase (Purchasing -> Menambah Stok & Mencatat Pengeluaran/Hutang)
export async function createMaterialPurchase(
  data: {
    nomor_pembelian?: string;
    tanggal: string;
    supplier: string;
    nama_bahan: string;
    kategori: string;
    qty: number;
    satuan: string;
    harga_satuan: number;
    total?: number;
    status_pembayaran: MaterialPurchase['status_pembayaran'];
    jumlah_dibayar: number;
    metode_pembayaran: string;
    catatan?: string;
  },
  createdBy: string = 'Admin'
): Promise<string> {
  const purchaseId = `PO-${Date.now().toString().slice(-6)}`;
  const nomorPembelian = data.nomor_pembelian?.trim() || `PO/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();
  const calculatedTotal = Number(data.qty) * Number(data.harga_satuan);
  const total = data.total !== undefined ? Number(data.total) : calculatedTotal;
  
  let jumlahDibayar = Number(data.jumlah_dibayar || 0);
  if (data.status_pembayaran === 'Lunas') {
    jumlahDibayar = total;
  } else if (data.status_pembayaran === 'Belum Lunas') {
    jumlahDibayar = 0;
  }
  const sisaHutang = Math.max(0, total - jumlahDibayar);

  // 1. Sync / Update Stock in MaterialStock
  const stocksSnap = await getDocs(collection(db, MATERIAL_STOCKS_COLLECTION));
  let matchedStockId: string | null = null;
  let currentStockQty = 0;

  stocksSnap.forEach((docSnap) => {
    const s = docSnap.data() as MaterialStock;
    if (s.nama_bahan.toLowerCase().trim() === data.nama_bahan.toLowerCase().trim()) {
      matchedStockId = docSnap.id;
      currentStockQty = Number(s.stok || 0);
    }
  });

  if (matchedStockId) {
    // Update existing stock
    const stockRef = doc(db, MATERIAL_STOCKS_COLLECTION, matchedStockId);
    await updateDoc(stockRef, cleanUndefinedFields({
      stok: currentStockQty + Number(data.qty),
      harga_modal: Number(data.harga_satuan),
      satuan: data.satuan,
      supplier_terakhir: data.supplier,
      updated_at: now,
    }));
  } else {
    // Create new stock entry
    matchedStockId = await upsertMaterialStock({
      nama_bahan: data.nama_bahan,
      kategori: data.kategori,
      stok: Number(data.qty),
      satuan: data.satuan,
      harga_modal: Number(data.harga_satuan),
      stok_minimum: 10,
      supplier_terakhir: data.supplier,
    });
  }

  // 2. Save Purchase Record
  const purchaseRecord: MaterialPurchase = {
    id: purchaseId,
    nomor_pembelian: nomorPembelian,
    tanggal: data.tanggal || now.split('T')[0],
    supplier: data.supplier.trim(),
    nama_bahan: data.nama_bahan.trim(),
    kategori: data.kategori,
    qty: Number(data.qty),
    satuan: data.satuan.trim(),
    harga_satuan: Number(data.harga_satuan),
    total,
    status_pembayaran: data.status_pembayaran,
    jumlah_dibayar: jumlahDibayar,
    sisa_hutang: sisaHutang,
    metode_pembayaran: data.metode_pembayaran,
    catatan: data.catatan || '',
    material_stock_id: matchedStockId,
    created_at: now,
    created_by: createdBy,
  };

  await setDoc(doc(db, MATERIAL_PURCHASES_COLLECTION, purchaseId), cleanUndefinedFields(purchaseRecord));

  // 3. If there is payment made upfront, record initial supplier payment
  if (jumlahDibayar > 0) {
    const payId = `SP-${Date.now().toString().slice(-6)}`;
    const paymentRecord: SupplierPayment = {
      id: payId,
      purchase_id: purchaseId,
      nomor_pembelian: nomorPembelian,
      supplier: data.supplier.trim(),
      tanggal: data.tanggal || now.split('T')[0],
      nominal: jumlahDibayar,
      metode_pembayaran: data.metode_pembayaran,
      catatan: `Pembayaran awal pembelian bahan ${data.nama_bahan}`,
      created_at: now,
      created_by: createdBy,
    };
    await setDoc(doc(db, SUPPLIER_PAYMENTS_COLLECTION, payId), cleanUndefinedFields(paymentRecord));
  }

  return purchaseId;
}

// Pay Supplier Debt (Bayar Hutang Supplier)
export async function paySupplierDebt(
  purchaseId: string,
  nominal: number,
  metodePembayaran: string,
  catatan: string = '',
  paidBy: string = 'Admin'
): Promise<void> {
  const purchaseRef = doc(db, MATERIAL_PURCHASES_COLLECTION, purchaseId);
  const snap = await getDoc(purchaseRef);
  if (!snap.exists()) {
    throw new Error('Data pembelian tidak ditemukan.');
  }

  const purchase = snap.data() as MaterialPurchase;
  const payAmount = Number(nominal);
  if (payAmount <= 0) {
    throw new Error('Nominal pembayaran harus lebih besar dari 0.');
  }

  const newJumlahDibayar = Number(purchase.jumlah_dibayar || 0) + payAmount;
  const newSisaHutang = Math.max(0, Number(purchase.total) - newJumlahDibayar);
  const newStatus: MaterialPurchase['status_pembayaran'] = newSisaHutang <= 0 ? 'Lunas' : 'DP / Sebagian';
  const now = new Date().toISOString();

  // Update purchase document
  await updateDoc(purchaseRef, cleanUndefinedFields({
    jumlah_dibayar: newJumlahDibayar,
    sisa_hutang: newSisaHutang,
    status_pembayaran: newStatus,
  }));

  // Record payment in supplier_payments
  const payId = `SP-${Date.now().toString().slice(-6)}`;
  const paymentRecord: SupplierPayment = {
    id: payId,
    purchase_id: purchaseId,
    nomor_pembelian: purchase.nomor_pembelian,
    supplier: purchase.supplier,
    tanggal: now.split('T')[0],
    nominal: payAmount,
    metode_pembayaran: metodePembayaran,
    catatan: catatan || `Pelunasan/cicilan hutang pembelian ${purchase.nomor_pembelian}`,
    created_at: now,
    created_by: paidBy,
  };

  await setDoc(doc(db, SUPPLIER_PAYMENTS_COLLECTION, payId), cleanUndefinedFields(paymentRecord));
}

// Record Material Usage (Memotong Stok & Menambah HPP Order)
export async function recordMaterialUsage(
  data: {
    order_id: string;
    invoice_no: string;
    nama_klien?: string;
    material_stock_id: string;
    nama_bahan: string;
    qty: number;
    satuan: string;
    harga_modal_satuan: number;
    tanggal?: string;
    catatan?: string;
  },
  createdBy: string = 'Staff Produksi'
): Promise<string> {
  const usageId = `USG-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();
  const totalBiaya = Number(data.qty) * Number(data.harga_modal_satuan);

  const usageRecord: MaterialUsage = {
    id: usageId,
    order_id: data.order_id,
    invoice_no: data.invoice_no,
    nama_klien: data.nama_klien || '',
    material_stock_id: data.material_stock_id,
    nama_bahan: data.nama_bahan,
    qty: Number(data.qty),
    satuan: data.satuan,
    harga_modal_satuan: Number(data.harga_modal_satuan),
    total_biaya: totalBiaya,
    tanggal: data.tanggal || now.split('T')[0],
    catatan: data.catatan || '',
    created_at: now,
    created_by: createdBy,
  };

  // 1. Save usage record
  await setDoc(doc(db, MATERIAL_USAGES_COLLECTION, usageId), cleanUndefinedFields(usageRecord));

  // 2. Decrement stock in material_stocks
  try {
    const stockRef = doc(db, MATERIAL_STOCKS_COLLECTION, data.material_stock_id);
    const stockSnap = await getDoc(stockRef);
    if (stockSnap.exists()) {
      const stockData = stockSnap.data() as MaterialStock;
      const newStock = Math.max(0, Number(stockData.stok || 0) - Number(data.qty));
      await updateDoc(stockRef, cleanUndefinedFields({
        stok: newStock,
        updated_at: now,
      }));
    }
  } catch (err) {
    console.warn('Could not decrement material stock:', err);
  }

  // 3. Recalculate HPP for the order
  await recalculateOrderHpp(data.order_id);

  return usageId;
}

// Record Direct Order Production Cost (Jahit, Bordir, Sablon Vendor, Finishing, dll)
export async function recordOrderProductionCost(
  data: {
    order_id: string;
    invoice_no: string;
    jenis_biaya: string;
    nama_vendor?: string;
    deskripsi: string;
    biaya: number;
    tanggal?: string;
  },
  createdBy: string = 'Staff Produksi'
): Promise<string> {
  const costId = `COST-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  const costRecord: OrderProductionCost = {
    id: costId,
    order_id: data.order_id,
    invoice_no: data.invoice_no,
    jenis_biaya: data.jenis_biaya,
    nama_vendor: data.nama_vendor || '',
    deskripsi: data.deskripsi || '',
    biaya: Number(data.biaya || 0),
    tanggal: data.tanggal || now.split('T')[0],
    created_at: now,
    created_by: createdBy,
  };

  // 1. Save cost record
  await setDoc(doc(db, ORDER_PRODUCTION_COSTS_COLLECTION, costId), cleanUndefinedFields(costRecord));

  // 2. Recalculate HPP for the order
  await recalculateOrderHpp(data.order_id);

  return costId;
}

// Recalculate HPP, Laba Kotor, and Margin for an Order
export async function recalculateOrderHpp(orderId: string): Promise<{ hpp: number; labaKotor: number; marginPersen: number }> {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      return { hpp: 0, labaKotor: 0, marginPersen: 0 };
    }

    const order = orderSnap.data() as OrderItem;

    // Fetch all material usages for this order
    const usagesSnap = await getDocs(
      query(collection(db, MATERIAL_USAGES_COLLECTION), where('order_id', '==', orderId))
    );
    let totalMaterialCost = 0;
    const usagesList: MaterialUsage[] = [];
    usagesSnap.forEach((d) => {
      const u = d.data() as MaterialUsage;
      totalMaterialCost += Number(u.total_biaya || 0);
      usagesList.push({ id: d.id, ...u });
    });

    // Fetch all production costs for this order
    const costsSnap = await getDocs(
      query(collection(db, ORDER_PRODUCTION_COSTS_COLLECTION), where('order_id', '==', orderId))
    );
    let totalProductionCost = 0;
    const costsList: OrderProductionCost[] = [];
    costsSnap.forEach((d) => {
      const c = d.data() as OrderProductionCost;
      totalProductionCost += Number(c.biaya || 0);
      costsList.push({ id: d.id, ...c });
    });

    const totalHpp = totalMaterialCost + totalProductionCost;
    const totalHarga = Number(order.total_harga || 0);
    const labaKotor = totalHarga - totalHpp;
    const marginPersen = totalHarga > 0 ? (labaKotor / totalHarga) * 100 : 0;

    await updateDoc(orderRef, cleanUndefinedFields({
      hpp: totalHpp,
      laba_kotor: labaKotor,
      margin_persen: marginPersen,
      material_usages: usagesList,
      production_costs: costsList,
    }));

    return { hpp: totalHpp, labaKotor, marginPersen };
  } catch (err) {
    console.error('Error recalculating order HPP:', err);
    return { hpp: 0, labaKotor: 0, marginPersen: 0 };
  }
}

// Delete Material Usage and return stock
export async function deleteMaterialUsage(usageId: string): Promise<void> {
  const usageRef = doc(db, MATERIAL_USAGES_COLLECTION, usageId);
  const snap = await getDoc(usageRef);
  if (!snap.exists()) return;
  const usage = snap.data() as MaterialUsage;

  // 1. Restore stock if material_stock_id exists
  if (usage.material_stock_id && usage.qty) {
    try {
      const stockRef = doc(db, MATERIAL_STOCKS_COLLECTION, usage.material_stock_id);
      const stockSnap = await getDoc(stockRef);
      if (stockSnap.exists()) {
        const stockData = stockSnap.data() as MaterialStock;
        const newStock = Number(stockData.stok || 0) + Number(usage.qty);
        await updateDoc(stockRef, cleanUndefinedFields({
          stok: newStock,
          updated_at: new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.warn('Could not restore material stock on usage delete:', err);
    }
  }

  // 2. Delete usage document
  await deleteDoc(usageRef);

  // 3. Recalculate HPP for order
  if (usage.order_id) {
    await recalculateOrderHpp(usage.order_id);
  }
}

// Delete Production Cost
export async function deleteOrderProductionCost(costId: string): Promise<void> {
  const costRef = doc(db, ORDER_PRODUCTION_COSTS_COLLECTION, costId);
  const snap = await getDoc(costRef);
  if (!snap.exists()) return;
  const cost = snap.data() as OrderProductionCost;

  // 1. Delete cost document
  await deleteDoc(costRef);

  // 2. Recalculate HPP for order
  if (cost.order_id) {
    await recalculateOrderHpp(cost.order_id);
  }
}

// Record Customer Payment (DP, Pelunasan, Cicilan)
export async function recordCustomerPayment(
  data: {
    order_id: string;
    invoice_no: string;
    nama_klien: string;
    jenis_pembayaran: CustomerPaymentRecord['jenis_pembayaran'];
    nominal: number;
    metode_pembayaran: string;
    tanggal?: string;
    catatan?: string;
  },
  receivedBy: string = 'Kasir'
): Promise<string> {
  const payId = `PAY-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();
  const paymentAmount = Number(data.nominal);

  const paymentRecord: CustomerPaymentRecord = {
    id: payId,
    order_id: data.order_id,
    invoice_no: data.invoice_no,
    nama_klien: data.nama_klien,
    jenis_pembayaran: data.jenis_pembayaran,
    nominal: paymentAmount,
    metode_pembayaran: data.metode_pembayaran,
    tanggal: data.tanggal || now.split('T')[0],
    catatan: data.catatan || '',
    diterima_oleh: receivedBy,
    created_at: now,
  };

  // 1. Save payment record
  await setDoc(doc(db, CUSTOMER_PAYMENTS_COLLECTION, payId), cleanUndefinedFields(paymentRecord));

  // 2. Safely sync to order total paid (nominal_dp)
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, data.order_id);
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
      const orderData = orderSnap.data() as OrderItem;
      const currentDp = Number(orderData.nominal_dp || 0);
      const newTotalPaid = Math.min(orderData.total_harga, currentDp + paymentAmount);
      
      const updates: Partial<OrderItem> = {
        nominal_dp: newTotalPaid,
      };

      if (newTotalPaid >= orderData.total_harga && orderData.status === 'Menunggu Pembayaran') {
        updates.status = 'Diproses';
      }

      await updateDoc(orderRef, cleanUndefinedFields(updates));
    }
  } catch (err) {
    console.warn('Could not sync payment to order document:', err);
  }

  return payId;
}

// Operational Expenses CRUD
export async function createOperationalExpense(
  data: {
    nomor_transaksi?: string;
    tanggal: string;
    kategori: string;
    deskripsi: string;
    nominal: number;
    metode_pembayaran: string;
    catatan?: string;
  },
  createdBy: string = 'Finance'
): Promise<string> {
  const expId = `EXP-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();
  const nomorTransaksi = data.nomor_transaksi || `BOP/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;

  const expenseRecord: OperationalExpense = {
    id: expId,
    nomor_transaksi: nomorTransaksi,
    tanggal: data.tanggal || now.split('T')[0],
    kategori: data.kategori,
    deskripsi: data.deskripsi.trim(),
    nominal: Number(data.nominal),
    metode_pembayaran: data.metode_pembayaran,
    catatan: data.catatan || '',
    created_at: now,
    created_by: createdBy,
  };

  await setDoc(doc(db, OPERATIONAL_EXPENSES_COLLECTION, expId), cleanUndefinedFields(expenseRecord));
  return expId;
}

export async function updateOperationalExpense(
  id: string,
  updates: Partial<OperationalExpense>,
  updatedBy: string = 'Finance'
): Promise<void> {
  const expenseRef = doc(db, OPERATIONAL_EXPENSES_COLLECTION, id);
  const dataToUpdate = cleanUndefinedFields({
    ...updates,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  });
  await updateDoc(expenseRef, dataToUpdate);
}

export async function voidOperationalExpense(
  id: string,
  voidReason: string,
  voidedBy: string = 'Finance'
): Promise<void> {
  const expenseRef = doc(db, OPERATIONAL_EXPENSES_COLLECTION, id);
  await updateDoc(
    expenseRef,
    cleanUndefinedFields({
      is_void: true,
      void_reason: voidReason.trim(),
      void_at: new Date().toISOString(),
      void_by: voidedBy,
      updated_at: new Date().toISOString(),
      updated_by: voidedBy,
    })
  );
}

export async function restoreOperationalExpense(
  id: string,
  restoredBy: string = 'Finance'
): Promise<void> {
  const expenseRef = doc(db, OPERATIONAL_EXPENSES_COLLECTION, id);
  await updateDoc(
    expenseRef,
    cleanUndefinedFields({
      is_void: false,
      void_reason: '',
      void_at: '',
      void_by: '',
      updated_at: new Date().toISOString(),
      updated_by: restoredBy,
    })
  );
}

export async function deleteOperationalExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, OPERATIONAL_EXPENSES_COLLECTION, id));
}

export async function deleteMaterialPurchase(id: string): Promise<void> {
  await deleteDoc(doc(db, MATERIAL_PURCHASES_COLLECTION, id));
}

export async function deleteMaterialStock(id: string): Promise<void> {
  await deleteDoc(doc(db, MATERIAL_STOCKS_COLLECTION, id));
}

/**
 * Reset all financial data across all financial Firestore collections:
 * - material_stocks
 * - material_purchases
 * - supplier_payments
 * - material_usages
 * - order_production_costs
 * - operational_expenses
 * - customer_payments
 * - other_revenues
 */
export async function resetFinancialData(): Promise<{ success: boolean; count: number }> {
  const financialCollections = [
    MATERIAL_STOCKS_COLLECTION,
    MATERIAL_PURCHASES_COLLECTION,
    SUPPLIER_PAYMENTS_COLLECTION,
    MATERIAL_USAGES_COLLECTION,
    ORDER_PRODUCTION_COSTS_COLLECTION,
    OPERATIONAL_EXPENSES_COLLECTION,
    CUSTOMER_PAYMENTS_COLLECTION,
    OTHER_REVENUES_COLLECTION,
  ];

  let totalDeleted = 0;
  for (const colName of financialCollections) {
    const snap = await getDocs(collection(db, colName));
    const deletePromises = snap.docs.map(async (docSnap) => {
      await deleteDoc(docSnap.ref);
      totalDeleted++;
    });
    await Promise.all(deletePromises);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('porda_financial_reset_done', 'true');
    localStorage.setItem('porda_financial_seeded_v1', 'reset_done');
  }

  return { success: true, count: totalDeleted };
}

// Seed Sample Financial & Inventory Data if collections are empty (Permanently Disabled)
export async function seedSampleFinancialDataIfEmpty(): Promise<void> {
  // Permanently disabled: do not automatically seed financial data so resets persist cleanly across all sessions
  return;
}

export async function legacySeedSampleFinancialDataIfEmpty(): Promise<void> {
  try {
    const alreadySeeded = typeof window !== 'undefined' && localStorage.getItem('porda_financial_seeded_v1');
    if (alreadySeeded) {
      return;
    }

    const stockSnap = await getDocs(collection(db, MATERIAL_STOCKS_COLLECTION));
    const purchaseSnap = await getDocs(collection(db, MATERIAL_PURCHASES_COLLECTION));
    if (!stockSnap.empty || !purchaseSnap.empty) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('porda_financial_seeded_v1', 'true');
      }
      return; // Already seeded
    }

    console.log('Seeding initial financial, inventory & material data...');
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // 1. Initial Stocks
    const sampleStocks: MaterialStock[] = [
      {
        id: 'stk-001',
        nama_bahan: 'Kaos Cotton Combed 30s Hitam',
        kategori: 'Kaos Polos',
        stok: 145,
        satuan: 'Pcs',
        harga_modal: 38000,
        stok_minimum: 30,
        supplier_terakhir: 'PT Indo Kaos Polos Bandung',
        updated_at: now,
      },
      {
        id: 'stk-002',
        nama_bahan: 'Kaos Heavyweight Cotton 20s Solid',
        kategori: 'Kaos Polos',
        stok: 65,
        satuan: 'Pcs',
        harga_modal: 48000,
        stok_minimum: 25,
        supplier_terakhir: 'Gudang Kaos Polos Nusantara',
        updated_at: now,
      },
      {
        id: 'stk-003',
        nama_bahan: 'PET Film DTF Premium Cold Peel 60cm',
        kategori: 'DTF / Film',
        stok: 18,
        satuan: 'Roll',
        harga_modal: 680000,
        stok_minimum: 5,
        supplier_terakhir: 'Digital Printing Solution Jkt',
        updated_at: now,
      },
      {
        id: 'stk-004',
        nama_bahan: 'Tinta DTF White Textile 1000ml',
        kategori: 'Tinta & Kimia',
        stok: 6,
        satuan: 'Botol',
        harga_modal: 320000,
        stok_minimum: 8, // Triggers "Stok Menipis" warning!
        supplier_terakhir: 'Digital Printing Solution Jkt',
        updated_at: now,
      },
      {
        id: 'stk-005',
        nama_bahan: 'Tinta DTF CMYK 4 Warna Set (1L/btl)',
        kategori: 'Tinta & Kimia',
        stok: 12,
        satuan: 'Set',
        harga_modal: 980000,
        stok_minimum: 4,
        supplier_terakhir: 'Digital Printing Solution Jkt',
        updated_at: now,
      },
      {
        id: 'stk-006',
        nama_bahan: 'Polymailer Hitam Premium 30x40cm',
        kategori: 'Plastik & Packaging',
        stok: 4,
        satuan: 'Pack',
        harga_modal: 45000,
        stok_minimum: 10, // Triggers "Stok Menipis" warning!
        supplier_terakhir: 'Toko Plastik Makmur',
        updated_at: now,
      },
      {
        id: 'stk-007',
        nama_bahan: 'Kardus Box Apparel Sablon Porda',
        kategori: 'Plastik & Packaging',
        stok: 250,
        satuan: 'Pcs',
        harga_modal: 6500,
        stok_minimum: 50,
        supplier_terakhir: 'Percetakan Karton Yogyakarta',
        updated_at: now,
      },
      {
        id: 'stk-008',
        nama_bahan: 'Cat Sablon Rubber White Matsui Japan',
        kategori: 'Tinta & Kimia',
        stok: 8,
        satuan: 'Kg',
        harga_modal: 135000,
        stok_minimum: 5,
        supplier_terakhir: 'Toko Sablon Grafika Sejahtera',
        updated_at: now,
      },
    ];

    for (const s of sampleStocks) {
      await setDoc(doc(db, MATERIAL_STOCKS_COLLECTION, s.id), s);
    }

    // 2. Initial Purchases (Including partial payments to demonstrate Hutang Supplier!)
    const samplePurchases: MaterialPurchase[] = [
      {
        id: 'PO-901',
        nomor_pembelian: 'PO/2026/0101',
        tanggal: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        supplier: 'PT Indo Kaos Polos Bandung',
        nama_bahan: 'Kaos Cotton Combed 30s Hitam',
        kategori: 'Kaos Polos',
        qty: 150,
        satuan: 'Pcs',
        harga_satuan: 38000,
        total: 5700000,
        status_pembayaran: 'Lunas',
        jumlah_dibayar: 5700000,
        sisa_hutang: 0,
        metode_pembayaran: 'Transfer Bank',
        catatan: 'Restock bahan kaos hitam reguler.',
        material_stock_id: 'stk-001',
        created_at: now,
        created_by: 'Budi (Admin)',
      },
      {
        id: 'PO-902',
        nomor_pembelian: 'PO/2026/0102',
        tanggal: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        supplier: 'Gudang Kaos Polos Nusantara',
        nama_bahan: 'Kaos Heavyweight Cotton 20s Solid',
        kategori: 'Kaos Polos',
        qty: 120,
        satuan: 'Pcs',
        harga_satuan: 48000,
        total: 5760000,
        status_pembayaran: 'DP / Sebagian',
        jumlah_dibayar: 3000000, // Hutang Rp 2.760.000
        sisa_hutang: 2760000,
        metode_pembayaran: 'Transfer Bank',
        catatan: 'Bahan untuk order Himpunan Mahasiswa UI. Sisa bayar tempo 14 hari.',
        material_stock_id: 'stk-002',
        created_at: now,
        created_by: 'Doni (Logistik)',
      },
      {
        id: 'PO-903',
        nomor_pembelian: 'PO/2026/0103',
        tanggal: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        supplier: 'Digital Printing Solution Jkt',
        nama_bahan: 'PET Film DTF Premium Cold Peel 60cm',
        kategori: 'DTF / Film',
        qty: 5,
        satuan: 'Roll',
        harga_satuan: 680000,
        total: 3400000,
        status_pembayaran: 'Belum Lunas', // Hutang penuh Rp 3.400.000
        jumlah_dibayar: 0,
        sisa_hutang: 3400000,
        metode_pembayaran: 'Tempo / Hutang',
        catatan: 'Faktur tempo jatuh tempo akhir bulan.',
        material_stock_id: 'stk-003',
        created_at: now,
        created_by: 'Doni (Logistik)',
      },
    ];

    for (const p of samplePurchases) {
      await setDoc(doc(db, MATERIAL_PURCHASES_COLLECTION, p.id), p);
    }

    // 3. Initial Supplier Payments (for PO-901 and PO-902)
    const sampleSupplierPayments: SupplierPayment[] = [
      {
        id: 'SP-901',
        purchase_id: 'PO-901',
        nomor_pembelian: 'PO/2026/0101',
        supplier: 'PT Indo Kaos Polos Bandung',
        tanggal: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        nominal: 5700000,
        metode_pembayaran: 'Transfer Bank',
        catatan: 'Pelunasan faktur pembelian bahan kaos',
        created_at: now,
        created_by: 'Siti Rahma (Finance)',
      },
      {
        id: 'SP-902',
        purchase_id: 'PO-902',
        nomor_pembelian: 'PO/2026/0102',
        supplier: 'Gudang Kaos Polos Nusantara',
        tanggal: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        nominal: 3000000,
        metode_pembayaran: 'Transfer Bank',
        catatan: 'DP 50% pembelian kaos heavyweight 20s',
        created_at: now,
        created_by: 'Siti Rahma (Finance)',
      },
    ];

    for (const sp of sampleSupplierPayments) {
      await setDoc(doc(db, SUPPLIER_PAYMENTS_COLLECTION, sp.id), sp);
    }

    // 4. Initial Operational Expenses
    const sampleOperationalExpenses: OperationalExpense[] = [
      {
        id: 'EXP-101',
        nomor_transaksi: 'BOP/2026/0101',
        tanggal: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        kategori: 'Listrik',
        deskripsi: 'Token listrik PLN 5500VA Workshop Sablon & Mesin DTF',
        nominal: 750000,
        metode_pembayaran: 'Transfer Bank',
        catatan: 'Biaya operasional bulanan listrik',
        created_at: now,
        created_by: 'Siti Rahma (Finance)',
      },
      {
        id: 'EXP-102',
        nomor_transaksi: 'BOP/2026/0102',
        tanggal: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        kategori: 'Internet',
        deskripsi: 'Langganan internet Biznet Dedicated 100 Mbps',
        nominal: 450000,
        metode_pembayaran: 'Transfer Bank',
        catatan: 'Koneksi upload file desain & operasional ERP',
        created_at: now,
        created_by: 'Siti Rahma (Finance)',
      },
      {
        id: 'EXP-103',
        nomor_transaksi: 'BOP/2026/0103',
        tanggal: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        kategori: 'Transportasi & Bensin',
        deskripsi: 'Bensin & operasional motor kurir pickup bahan & antar sample',
        nominal: 120000,
        metode_pembayaran: 'Tunai / Cash',
        catatan: 'Voucher bensin operasional kurir',
        created_at: now,
        created_by: 'Hadi (Kurir)',
      },
      {
        id: 'EXP-104',
        nomor_transaksi: 'BOP/2026/0104',
        tanggal: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        kategori: 'Maintenance Mesin',
        deskripsi: 'Cairan cleaner printhead DTF & wiper blade replacement',
        nominal: 280000,
        metode_pembayaran: 'Transfer Bank',
        catatan: 'Perawatan rutin berkala mesin cetak DTF',
        created_at: now,
        created_by: 'Rian (Printing)',
      },
    ];

    for (const exp of sampleOperationalExpenses) {
      await setDoc(doc(db, OPERATIONAL_EXPENSES_COLLECTION, exp.id), exp);
    }

    // 5. Initial Customer Payments (from existing sample orders)
    const sampleCustomerPayments: CustomerPaymentRecord[] = [
      {
        id: 'PAY-001',
        order_id: 'ORD-882101',
        invoice_no: 'INV/PRD/2026/0101',
        nama_klien: 'Komunitas Vespa Runner',
        jenis_pembayaran: 'DP',
        nominal: 3000000,
        metode_pembayaran: 'Transfer Bank',
        tanggal: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        catatan: 'DP 80% order 50 pcs kaos DTF',
        diterima_oleh: 'Siti Rahma (Finance)',
        created_at: now,
      },
      {
        id: 'PAY-002',
        order_id: 'ORD-882102',
        invoice_no: 'INV/PRD/2026/0102',
        nama_klien: 'Himpunan Mahasiswa Teknik UI',
        jenis_pembayaran: 'DP',
        nominal: 7200000,
        metode_pembayaran: 'Transfer Bank',
        tanggal: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        catatan: 'DP 75% order 120 pcs kaos manual rubber',
        diterima_oleh: 'Siti Rahma (Finance)',
        created_at: now,
      },
      {
        id: 'PAY-003',
        order_id: 'ORD-882103',
        invoice_no: 'INV/PRD/2026/0103',
        nama_klien: 'Kedai Kopi Sudut Temu',
        jenis_pembayaran: 'DP',
        nominal: 2000000,
        metode_pembayaran: 'QRIS',
        tanggal: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        catatan: 'DP 47% order hoodie cotton fleece',
        diterima_oleh: 'Siti Rahma (Finance)',
        created_at: now,
      },
    ];

    for (const cp of sampleCustomerPayments) {
      await setDoc(doc(db, CUSTOMER_PAYMENTS_COLLECTION, cp.id), cp);
    }

    // 6. Initial Material Usages & Production Costs for ORD-882101
    const sampleUsage: MaterialUsage = {
      id: 'USG-001',
      order_id: 'ORD-882101',
      invoice_no: 'INV/PRD/2026/0101',
      nama_klien: 'Komunitas Vespa Runner',
      material_stock_id: 'stk-001',
      nama_bahan: 'Kaos Cotton Combed 30s Hitam',
      qty: 50,
      satuan: 'Pcs',
      harga_modal_satuan: 38000,
      total_biaya: 1900000,
      tanggal: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      catatan: 'Bahan 50 pcs kaos untuk sablon DTF',
      created_at: now,
      created_by: 'Doni (Logistik)',
    };
    await setDoc(doc(db, MATERIAL_USAGES_COLLECTION, sampleUsage.id), sampleUsage);

    const sampleCost: OrderProductionCost = {
      id: 'COST-001',
      order_id: 'ORD-882101',
      invoice_no: 'INV/PRD/2026/0101',
      jenis_biaya: 'Packaging',
      nama_vendor: 'Tim Finishing Porda',
      deskripsi: 'Plastik opp satuan + hangtag + sticker pack',
      biaya: 150000,
      tanggal: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: now,
      created_by: 'Agus (Produksi)',
    };
    await setDoc(doc(db, ORDER_PRODUCTION_COSTS_COLLECTION, sampleCost.id), sampleCost);

    // Update ORD-882101 HPP & margin
    const hpp882101 = 1900000 + 150000; // 2.050.000
    const total882101 = 3750000;
    const laba882101 = total882101 - hpp882101; // 1.700.000
    const margin882101 = (laba882101 / total882101) * 100; // ~45.3%

    await updateDoc(doc(db, ORDERS_COLLECTION, 'ORD-882101'), cleanUndefinedFields({
      hpp: hpp882101,
      laba_kotor: laba882101,
      margin_persen: margin882101,
      material_usages: [sampleUsage],
      production_costs: [sampleCost],
    }));

    console.log('Financial seed completed.');
    if (typeof window !== 'undefined') {
      localStorage.setItem('porda_financial_seeded_v1', 'true');
    }
  } catch (err) {
    console.error('Error seeding financial data:', err);
  }
}

/**
 * Super Admin function to clear test operational database records
 * while safely preserving the Super Admin account and configuration.
 */
export async function resetProductionDatabase(
  userProfile: UserProfile,
  confirmPassword?: string
): Promise<{ success: boolean; totalDeleted: number }> {
  // If confirmPassword provided, verify against server authentication endpoint
  if (confirmPassword) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: userProfile.username || 'Admin123',
        password: confirmPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error('Kata sandi Super Admin tidak valid.');
    }
  }

  const collectionsToClear = [
    ORDERS_COLLECTION,
    WORK_ORDERS_COLLECTION,
    MATERIAL_STOCKS_COLLECTION,
    MATERIAL_PURCHASES_COLLECTION,
    MATERIAL_USAGES_COLLECTION,
    ORDER_PRODUCTION_COSTS_COLLECTION,
    OPERATIONAL_EXPENSES_COLLECTION,
    CUSTOMER_PAYMENTS_COLLECTION,
    SUPPLIER_PAYMENTS_COLLECTION,
    OTHER_REVENUES_COLLECTION,
  ];

  let totalDeleted = 0;

  for (const collName of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, collName));
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
        totalDeleted++;
      }
    } catch (e) {
      console.warn(`Error clearing collection ${collName}:`, e);
    }
  }

  return { success: true, totalDeleted };
}


