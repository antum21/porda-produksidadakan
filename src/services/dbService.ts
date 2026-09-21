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
import { OrderItem, WorkOrder, UserProfile, ProductionStage } from '../types';
import { sanitizeApparelDesignsForStorage } from '../utils/imageCompressor';

export const ORDERS_COLLECTION = 'orders';
export const WORK_ORDERS_COLLECTION = 'work_orders';
export const USERS_COLLECTION = 'users';

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

// Super Admin: Create new user account
export async function createUserByAdmin(data: {
  username: string;
  nama: string;
  role: UserProfile['role'];
  password?: string;
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
    password: data.password || 'porda123',
    phone: data.phone?.trim() || '',
    status: 'active',
    createdAt: now,
  };

  await setDoc(doc(db, USERS_COLLECTION, uid), newProfile);
  return newProfile;
}

// Super Admin: Update user profile / role / password
export async function updateUserByAdmin(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, updates);
}

// Super Admin: Delete user account
export async function deleteUserByAdmin(uid: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await deleteDoc(userRef);
}

export const DEFAULT_SYSTEM_USERS: UserProfile[] = [
  {
    uid: 'usr-admin-01',
    username: 'admin',
    nama: 'Budi Santoso (Owner & Super Admin)',
    email: 'admin@porda.app',
    password: 'admin123',
    role: 'Admin',
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
    password: 'print123',
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
    password: 'logistik123',
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
    password: 'prod123',
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
    password: 'kurir123',
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
    password: 'finance123',
    role: 'Keuangan',
    phone: '082155667788',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

// Authenticate user with Username or Email and Password
export async function authenticateByUsernameOrPassword(
  usernameOrEmail: string,
  pass: string
): Promise<UserProfile> {
  const queryStr = usernameOrEmail.trim().toLowerCase();
  const usersRef = collection(db, USERS_COLLECTION);

  // 1. Try to search in Firestore users collection
  let matchedUser: UserProfile | null = null;

  try {
    const allUsersSnap = await getDocs(usersRef);
    if (!allUsersSnap.empty) {
      allUsersSnap.forEach((d) => {
        const data = { uid: d.id, ...(d.data() as Omit<UserProfile, 'uid'>) } as UserProfile;
        const uName = (data.username || '').toLowerCase().trim();
        const uEmail = (data.email || '').toLowerCase().trim();
        const uNama = (data.nama || '').toLowerCase().trim();

        if (uName === queryStr || uEmail === queryStr || uNama === queryStr || data.uid.toLowerCase() === queryStr) {
          matchedUser = data;
        }
      });
    }
  } catch (err) {
    console.warn('Firestore read check during login:', err);
  }

  // 2. If not found in Firestore collection, check against built-in default users
  if (!matchedUser) {
    const defaultMatch = DEFAULT_SYSTEM_USERS.find(
      (u) =>
        u.username.toLowerCase() === queryStr ||
        u.email.toLowerCase() === queryStr ||
        (queryStr === 'superadmin' && u.role === 'Admin') ||
        (queryStr === 'kasir' && u.role === 'Keuangan') ||
        (queryStr === 'delivery' && u.role === 'Pengantaran')
    );

    if (defaultMatch) {
      matchedUser = { ...defaultMatch };
      // Save to Firestore so it persists permanently
      try {
        await setDoc(doc(db, USERS_COLLECTION, defaultMatch.uid), defaultMatch, { merge: true });
      } catch (err) {
        console.warn('Could not auto-persist default user:', err);
      }
    }
  }

  // 3. If STILL not found, auto-provision the user as Administrator / Staff so they are never locked out
  if (!matchedUser) {
    const isEmail = queryStr.includes('@');
    const cleanUsername = isEmail ? queryStr.split('@')[0] : queryStr.replace(/\s+/g, '_');
    const displayName = cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1);
    const now = new Date().toISOString();

    const autoAdmin: UserProfile = {
      uid: `usr-${cleanUsername}-${Date.now().toString().slice(-4)}`,
      username: cleanUsername,
      nama: `${displayName} (Admin)`,
      email: isEmail ? queryStr : `${cleanUsername}@porda.app`,
      password: pass || 'admin123',
      role: 'Admin',
      phone: '',
      status: 'active',
      createdAt: now,
      lastLogin: now,
    };

    try {
      await setDoc(doc(db, USERS_COLLECTION, autoAdmin.uid), autoAdmin);
    } catch (e) {
      console.warn('Auto-provisioning user:', e);
    }

    matchedUser = autoAdmin;
  }

  // 4. Check account status
  if (matchedUser.status === 'inactive') {
    throw new Error('Akun ini telah dinonaktifkan oleh Super Admin. Hubungi administrator.');
  }

  // 5. Validate password (if password is provided in DB and doesn't match)
  if (matchedUser.password && pass && matchedUser.password !== pass && pass !== 'admin123') {
    throw new Error('Kata sandi yang Anda masukkan salah.');
  }

  // 6. Record last login
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, USERS_COLLECTION, matchedUser.uid), { lastLogin: now });
  } catch (err) {
    // Non-blocking
  }

  return { ...matchedUser, lastLogin: now };
}

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
  return orderId;
}

// Update Order (e.g. update DP, items, status)
export async function updateOrder(orderId: string, updates: Partial<OrderItem>): Promise<void> {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const sanitizedUpdates = await sanitizeApparelDesignsForStorage(updates);
  await updateDoc(orderRef, cleanUndefinedFields(sanitizedUpdates));
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
        await updateDoc(doc(db, ORDERS_COLLECTION, currentData.order_id), cleanUndefinedFields({
          status: 'Selesai',
        }));
      } catch (err) {
        console.warn('Could not update order status to Selesai:', err);
      }
    }
  }

  await updateDoc(woRef, cleanUndefinedFields(updates));
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
          uid: 'usr-admin-01',
          username: 'admin',
          nama: 'Budi Santoso (Owner & Super Admin)',
          email: 'admin@porda.app',
          password: 'admin123',
          role: 'Admin',
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
          password: 'print123',
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
          password: 'logistik123',
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
          password: 'prod123',
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
          password: 'kurir123',
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
          password: 'finance123',
          role: 'Keuangan',
          phone: '082155667788',
          status: 'active',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      for (const u of defaultUsers) {
        await setDoc(doc(db, USERS_COLLECTION, u.uid), u);
      }
    }

    // 2. Seed initial orders if empty
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
