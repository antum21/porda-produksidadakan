import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UserProfile, UserRole } from '../types';
import {
  subscribeUsers,
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
} from '../services/dbService';
import {
  ShieldCheck,
  UserPlus,
  Search,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  User,
  Printer,
  ShoppingBag,
  Cpu,
  Truck,
  CircleDollarSign,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Users,
  Sparkles,
} from 'lucide-react';

const ROLE_INFO: Record<
  UserRole,
  { label: string; icon: React.ElementType; color: string; badgeColor: string; desc: string }
> = {
  super_admin: {
    label: 'Super Admin',
    icon: ShieldCheck,
    color: 'bg-red-50 text-[#E63946] border-red-200',
    badgeColor: 'bg-red-50 text-[#E63946] border-red-100',
    desc: 'Pemilik workshop & kontrol sistem penuh',
  },
  Admin: {
    label: 'Super Admin',
    icon: ShieldCheck,
    color: 'bg-red-50 text-[#E63946] border-red-200',
    badgeColor: 'bg-red-50 text-[#E63946] border-red-100',
    desc: 'Pemilik workshop & akses seluruh modul',
  },
  Printing: {
    label: 'Divisi Printing',
    icon: Printer,
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-100',
    desc: 'Tahap 1: Cetak DTF, Sablon Manual & Digital',
  },
  Logistik: {
    label: 'Divisi Logistik',
    icon: ShoppingBag,
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-100',
    desc: 'Tahap 2: Pengadaan Blank Kaos & Supplier',
  },
  Produksi: {
    label: 'Divisi Produksi',
    icon: Cpu,
    color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    desc: 'Tahap 3: Finishing, Press, QC & Packing',
  },
  Pengantaran: {
    label: 'Divisi Pengantaran',
    icon: Truck,
    color: 'bg-purple-50 text-purple-800 border-purple-200',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-100',
    desc: 'Tahap 4: Kurir, Pickup & Pengiriman Klien',
  },
  Keuangan: {
    label: 'Divisi Keuangan',
    icon: CircleDollarSign,
    color: 'bg-teal-50 text-teal-800 border-teal-200',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-100',
    desc: 'Verifikasi DP minimal 70% & pelunasan faktur',
  },
};

const ALL_ROLES: UserRole[] = ['Admin', 'Printing', 'Logistik', 'Produksi', 'Pengantaran', 'Keuangan'];

export const AdminUsersPage: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { success, error: toastError } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isChangeAdminPassModalOpen, setIsChangeAdminPassModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Form states for Add User (Staff Profile)
  const [formData, setFormData] = useState({
    username: '',
    nama: '',
    role: 'Printing' as UserRole,
    phone: '',
    email: '',
  });

  // Form states for Super Admin Password Change
  const [currentPass, setCurrentPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Keyboard Escape listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setIsChangeAdminPassModalOpen(false);
        setIsDeleteModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to Firestore Users in real-time
  useEffect(() => {
    const unsubscribe = subscribeUsers((userList) => {
      setUsers(userList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    success('Berhasil', msg);
  };

  // If not Super Admin, show unauthorized screen
  if (!isSuperAdmin) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-100 text-[#E63946] flex items-center justify-center mb-4 shadow-md shadow-red-500/10">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit']">
          Akses Khusus Super Admin
        </h2>
        <p className="text-sm text-slate-500 max-w-md mt-2">
          Halaman pembuatan dan manajemen akun pengguna hanya dapat diakses oleh akun dengan role{' '}
          <strong className="text-slate-800">Super Admin</strong>.
        </p>
      </div>
    );
  }

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      (u.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone || '').includes(searchQuery) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    return matchSearch && matchRole;
  });

  // Count stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status !== 'inactive').length;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (!formData.username.trim()) {
        throw new Error('Username wajib diisi.');
      }
      if (!formData.nama.trim()) {
        throw new Error('Nama lengkap staf wajib diisi.');
      }

      await createUserByAdmin({
        username: formData.username,
        nama: formData.nama,
        role: formData.role,
        phone: formData.phone,
        email: formData.email,
      });

      setIsAddModalOpen(false);
      setFormData({
        username: '',
        nama: '',
        role: 'Printing',
        phone: '',
        email: '',
      });
      showToast('Akun profil staf baru berhasil dibuat!');
    } catch (err: any) {
      setFormError(err.message || 'Gagal membuat profil staf.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError(null);
    setSubmitting(true);

    try {
      await updateUserByAdmin(selectedUser.uid, {
        nama: selectedUser.nama,
        role: selectedUser.role,
        phone: selectedUser.phone,
        email: selectedUser.email,
      });
      setIsEditModalOpen(false);
      showToast('Data staf berhasil diperbarui.');
    } catch (err: any) {
      setFormError(err.message || 'Gagal memperbarui data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (newAdminPass !== confirmAdminPass) {
      setFormError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    if (newAdminPass.length < 6) {
      setFormError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: currentPass,
          newPassword: newAdminPass,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengubah kata sandi.');
      }

      setIsChangeAdminPassModalOpen(false);
      setCurrentPass('');
      setNewAdminPass('');
      setConfirmAdminPass('');
      showToast('Kata sandi Super Admin berhasil diperbarui!');
    } catch (err: any) {
      setFormError(err.message || 'Gagal memperbarui kata sandi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'inactive' ? 'active' : 'inactive';
    try {
      await updateUserByAdmin(user.uid, { status: newStatus });
      showToast(`Status @${user.username} diubah menjadi ${newStatus === 'active' ? 'Aktif' : 'Non-aktif'}`);
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await deleteUserByAdmin(selectedUser.uid);
      setIsDeleteModalOpen(false);
      showToast(`Akun @${selectedUser.username} telah dihapus.`);
    } catch (err: any) {
      toastError('Gagal Menghapus', err.message || 'Gagal menghapus user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-red-100 text-[#E63946] px-3 py-1 rounded-full text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Panel Eksklusif</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit'] tracking-tight">
            Manajemen Pengguna & Staf
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola data staf workshop, divisi kerja, dan keamanan kata sandi Super Admin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFormError(null);
              setCurrentPass('');
              setNewAdminPass('');
              setConfirmAdminPass('');
              setIsChangeAdminPassModalOpen(true);
            }}
            className="py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
            title="Ubah Kata Sandi Super Admin"
          >
            <KeyRound className="w-4 h-4 text-amber-500" />
            <span>Ubah Password Admin</span>
          </button>

          <button
            id="btn-add-new-user"
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            className="py-3 px-5 rounded-2xl bg-[#E63946] hover:bg-red-600 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Staf Baru</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Users className="w-4 h-4 text-[#E63946]" />
            <span className="text-xs font-bold uppercase">Total Staf</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit']">{totalUsers}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{activeUsers} Akun Aktif</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Printer className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold uppercase">Div. Printing</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit']">
            {users.filter((u) => u.role === 'Printing').length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Operator Cetak DTF & Sablon</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Cpu className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold uppercase">Div. Produksi</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit']">
            {users.filter((u) => u.role === 'Produksi').length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Finishing & QC Apparel</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <ShieldCheck className="w-4 h-4 text-[#E63946]" />
            <span className="text-xs font-bold uppercase">Super Admin</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 font-['Outfit']">
            {users.filter((u) => u.role === 'Admin').length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Hak Akses Penuh Sistem</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, username, atau no HP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full pl-10 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
          />
        </div>

        {/* Role Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedRoleFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedRoleFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-[#F8F5F2] text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({users.length})
          </button>
          {ALL_ROLES.map((r) => {
            const count = users.filter((u) => u.role === r).length;
            const isSelected = selectedRoleFilter === r;
            return (
              <button
                key={r}
                onClick={() => setSelectedRoleFilter(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#E63946] text-white shadow-xs'
                    : 'bg-[#F8F5F2] text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Table & Card Grid */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 border-3 border-[#E63946] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p>Memuat daftar pengguna...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700 text-sm">Tidak ada staf yang cocok</p>
            <p className="mt-1">Coba sesuaikan pencarian atau tambahkan staf baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#F8F5F2] text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Pengguna / Karyawan</th>
                  <th className="py-3.5 px-4">Username & Login</th>
                  <th className="py-3.5 px-4">Divisi & Hak Akses</th>
                  <th className="py-3.5 px-4">Kontak</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u, uIdx) => {
                  const roleConfig = ROLE_INFO[u.role] || ROLE_INFO.Admin;
                  const RoleIcon = roleConfig.icon;
                  const isInactive = u.status === 'inactive';

                  return (
                    <tr key={u.uid ? `${u.uid}-${uIdx}` : `user-${uIdx}`} className={`hover:bg-slate-50/80 transition-colors ${isInactive ? 'opacity-60 bg-slate-50/50' : ''}`}>
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 overflow-hidden">
                            {u.avatarUrl ? (
                              <img
                                src={u.avatarUrl}
                                alt={u.nama}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span>{u.nama.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-snug">{u.nama}</p>
                            <p className="text-[11px] text-slate-400">{u.email || `${u.username}@porda.app`}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg font-mono text-xs font-bold border border-slate-200/70">
                          <span>@{u.username}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${roleConfig.badgeColor}`}>
                          <RoleIcon className="w-3.5 h-3.5" />
                          <span>{u.role}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {u.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{u.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                            isInactive
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title="Klik untuk ubah status"
                        >
                          {isInactive ? (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Non-aktif</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Aktif</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit User Button */}
                          <button
                            onClick={() => {
                              setSelectedUser({ ...u });
                              setFormError(null);
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                            title="Edit Data Staf"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User Button */}
                          {u.username.toLowerCase() !== 'admin123' && u.username.toLowerCase() !== 'admin' && (
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-[#E63946] transition-all cursor-pointer"
                              title="Hapus Akun"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: TAMBAH PENGGUNA BARU ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-red-50 text-[#E63946] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Tambah Akun Karyawan</h3>
                  <p className="text-xs text-slate-500">Buat akses login untuk tim workshop</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username <span className="text-[#E63946]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
                  <input
                    type="text"
                    required
                    placeholder="misal: rian_cetak"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full pl-8 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-[#E63946]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama staf lengkap"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Divisi / Hak Akses (Role) <span className="text-[#E63946]">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
                >
                  <option value="Printing">Printing (Tahap 1 - Operator Cetak & Film)</option>
                  <option value="Logistik">Logistik (Tahap 2 - Bahan Kaos & Supplier)</option>
                  <option value="Produksi">Produksi (Tahap 3 - Finishing, Press, QC & Packing)</option>
                  <option value="Pengantaran">Pengantaran (Tahap 4 - Delivery & Kurir)</option>
                  <option value="Keuangan">Keuangan (Finance & Verifikasi DP 70%)</option>
                  <option value="Admin">Super Admin (Akses Penuh Seluruh Alur)</option>
                </select>
              </div>


              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    placeholder="0812xxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Opsional)</label>
                  <input
                    type="email"
                    placeholder="staf@porda.app"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-2.5 px-4 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2.5 px-6 rounded-full bg-[#E63946] hover:bg-red-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-500/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Akun Karyawan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT DATA USER ================= */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Edit Akun @{selectedUser.username}</h3>
                  <p className="text-xs text-slate-500">Perbarui profil atau hak akses divisi</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={selectedUser.nama}
                  onChange={(e) => setSelectedUser({ ...selectedUser, nama: e.target.value })}
                  className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Divisi / Hak Akses (Role)</label>
                <select
                  value={selectedUser.role}
                  onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value as UserRole })}
                  className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
                >
                  <option value="Printing">Printing (Tahap 1 Cetak)</option>
                  <option value="Logistik">Logistik (Tahap 2 Blank Kaos)</option>
                  <option value="Produksi">Produksi (Tahap 3 Finishing/QC)</option>
                  <option value="Pengantaran">Pengantaran (Tahap 4 Delivery)</option>
                  <option value="Keuangan">Keuangan (Finance/DP)</option>
                  <option value="Admin">Super Admin (Full Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">No. WhatsApp / HP</label>
                <input
                  type="text"
                  value={selectedUser.phone || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                  className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={selectedUser.email || ''}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                  className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="py-2.5 px-4 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2.5 px-6 rounded-full bg-[#E63946] hover:bg-red-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-500/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: UBAH PASSWORD SUPER ADMIN ================= */}
      {isChangeAdminPassModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Ubah Password Admin</h3>
                  <p className="text-xs text-slate-500">Akun Super Admin (Admin123)</p>
                </div>
              </div>
              <button
                onClick={() => setIsChangeAdminPassModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleChangeAdminPassword} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi Saat Ini
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan kata sandi lama"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full pl-4 pr-10 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi Baru
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimal 6 karakter"
                  value={newAdminPass}
                  onChange={(e) => setNewAdminPass(e.target.value)}
                  className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Ulangi kata sandi baru"
                  value={confirmAdminPass}
                  onChange={(e) => setConfirmAdminPass(e.target.value)}
                  className="w-full bg-[#F8F5F2] border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#E63946]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsChangeAdminPassModalOpen(false)}
                  className="py-2.5 px-4 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2.5 px-6 rounded-full bg-[#E63946] hover:bg-red-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-500/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Perbarui Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: KONFIRMASI HAPUS ================= */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-[#E63946] flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Hapus Akun Pengguna?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Apakah Anda yakin ingin menghapus akun <strong>{selectedUser.nama}</strong> (@{selectedUser.username})? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="py-2.5 px-4 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteUser}
                className="py-2.5 px-6 rounded-full bg-[#E63946] hover:bg-red-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-500/30 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
