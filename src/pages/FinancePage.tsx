import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  OrderItem,
  MaterialStock,
  MaterialPurchase,
  SupplierPayment,
  MaterialUsage,
  OrderProductionCost,
  OperationalExpense,
  CustomerPaymentRecord,
} from '../types';
import {
  subscribeOrders,
  subscribeMaterialStocks,
  subscribeMaterialPurchases,
  subscribeSupplierPayments,
  subscribeMaterialUsages,
  subscribeOrderProductionCosts,
  subscribeOperationalExpenses,
  subscribeCustomerPayments,
  resetFinancialData,
  deleteMaterialPurchase,
  deleteOperationalExpense,
  updateOperationalExpense,
  voidOperationalExpense,
  restoreOperationalExpense,
  deleteMaterialStock,
  upsertMaterialStock,
  adjustMaterialStock,
} from '../services/dbService';
import {
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  ShoppingCart,
  Package,
  Layers,
  Receipt,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  FileText,
  Building2,
  Landmark,
  ShieldCheck,
  Cpu,
  Eye,
  Trash2,
  DollarSign,
  Edit2,
  Ban,
  RotateCcw,
  Info,
  Calculator,
  BookOpen,
} from 'lucide-react';
import { NewPurchaseModal } from '../components/finance/NewPurchaseModal';
import { RecordUsageModal } from '../components/finance/RecordUsageModal';
import { RecordProductionCostModal } from '../components/finance/RecordProductionCostModal';
import { NewExpenseModal } from '../components/finance/NewExpenseModal';
import { PaySupplierDebtModal } from '../components/finance/PaySupplierDebtModal';
import { OrderHppDetailModal } from '../components/finance/OrderHppDetailModal';
import { RecordCustomerPaymentModal } from '../components/finance/RecordCustomerPaymentModal';
import { FinanceGuideModal } from '../components/finance/FinanceGuideModal';

type FinanceTab =
  | 'dashboard'
  | 'order_modal'
  | 'purchases'
  | 'stocks'
  | 'usages'
  | 'production_costs'
  | 'expenses'
  | 'customer_payments'
  | 'cashflow'
  | 'debts';

type DateFilterMode = 'today' | 'week' | 'month' | 'custom' | 'all';

export const FinancePage: React.FC = () => {
  const { user } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<FinanceTab>('dashboard');

  // Date Filter (defaults to 'all' to show all recorded data immediately)
  const [dateFilter, setDateFilter] = useState<DateFilterMode>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Search & Status Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Order Modal Search & Status Filters
  const [orderModalSearchQuery, setOrderModalSearchQuery] = useState('');
  const [orderModalStatusFilter, setOrderModalStatusFilter] = useState<'All' | 'Unbudgeted' | 'Budgeted'>('All');

  // Real-time State
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [stocks, setStocks] = useState<MaterialStock[]>([]);
  const [purchases, setPurchases] = useState<MaterialPurchase[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [usages, setUsages] = useState<MaterialUsage[]>([]);
  const [productionCosts, setProductionCosts] = useState<OrderProductionCost[]>([]);
  const [expenses, setExpenses] = useState<OperationalExpense[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPaymentRecord[]>([]);

  // Modals state
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OperationalExpense | null>(null);
  const [voidingExpense, setVoidingExpense] = useState<OperationalExpense | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<'All' | 'Active' | 'Void'>('All');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [selectedDebtPurchase, setSelectedDebtPurchase] = useState<MaterialPurchase | null>(null);
  const [isHppModalOpen, setIsHppModalOpen] = useState(false);
  const [selectedHppOrder, setSelectedHppOrder] = useState<OrderItem | null>(null);
  const [isCustPaymentModalOpen, setIsCustPaymentModalOpen] = useState(false);
  const [selectedCustOrder, setSelectedCustOrder] = useState<OrderItem | null>(null);
  const [prefilledStockForPurchase, setPrefilledStockForPurchase] = useState<MaterialStock | null>(null);

  // Manual stock edit modal state
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<MaterialStock | null>(null);
  const [stockFormData, setStockFormData] = useState({
    nama_bahan: '',
    kategori: 'Kaos Polos',
    stok: 0,
    satuan: 'Pcs',
    harga_modal: 0,
    stok_minimum: 10,
    supplier_terakhir: '',
  });

  // Stock inventory filters & search
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'All' | 'Low' | 'Safe'>('All');

  // Interactive delete confirmation states
  const [stockToDelete, setStockToDelete] = useState<MaterialStock | null>(null);
  const [isDeletingStock, setIsDeletingStock] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<MaterialPurchase | null>(null);
  const [isDeletingPurchase, setIsDeletingPurchase] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<OperationalExpense | null>(null);
  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Subscribe to all collections
  useEffect(() => {
    const unsubOrders = subscribeOrders(setOrders);
    const unsubStocks = subscribeMaterialStocks(setStocks);
    const unsubPurchases = subscribeMaterialPurchases(setPurchases);
    const unsubSupplierPayments = subscribeSupplierPayments(setSupplierPayments);
    const unsubUsages = subscribeMaterialUsages(setUsages);
    const unsubCosts = subscribeOrderProductionCosts(setProductionCosts);
    const unsubExpenses = subscribeOperationalExpenses(setExpenses);
    const unsubCustomerPayments = subscribeCustomerPayments(setCustomerPayments);

    return () => {
      unsubOrders();
      unsubStocks();
      unsubPurchases();
      unsubSupplierPayments();
      unsubUsages();
      unsubCosts();
      unsubExpenses();
      unsubCustomerPayments();
    };
  }, []);

  // Format Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Date Filtering Helper
  const isDateInRange = (dateStr: string) => {
    if (!dateStr) return true;
    if (dateFilter === 'all') return true;

    const date = new Date(dateStr);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (dateFilter === 'today') {
      return dateStr.startsWith(todayStr);
    }

    if (dateFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return date >= oneWeekAgo && date <= now;
    }

    if (dateFilter === 'month') {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }

    if (dateFilter === 'custom') {
      if (customStartDate && customEndDate) {
        return dateStr >= customStartDate && dateStr <= customEndDate;
      }
      if (customStartDate) {
        return dateStr >= customStartDate;
      }
      if (customEndDate) {
        return dateStr <= customEndDate;
      }
    }

    return true;
  };

  // Filtered Datasets based on Date Filter
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => isDateInRange(o.created_at));
  }, [orders, dateFilter, customStartDate, customEndDate]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => isDateInRange(p.tanggal));
  }, [purchases, dateFilter, customStartDate, customEndDate]);

  const filteredCustomerPayments = useMemo(() => {
    return customerPayments.filter((cp) => isDateInRange(cp.tanggal));
  }, [customerPayments, dateFilter, customStartDate, customEndDate]);

  const filteredSupplierPayments = useMemo(() => {
    return supplierPayments.filter((sp) => isDateInRange(sp.tanggal));
  }, [supplierPayments, dateFilter, customStartDate, customEndDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => isDateInRange(e.tanggal));
  }, [expenses, dateFilter, customStartDate, customEndDate]);

  const filteredUsages = useMemo(() => {
    return usages.filter((u) => isDateInRange(u.tanggal));
  }, [usages, dateFilter, customStartDate, customEndDate]);

  const filteredProductionCosts = useMemo(() => {
    return productionCosts.filter((c) => isDateInRange(c.tanggal));
  }, [productionCosts, dateFilter, customStartDate, customEndDate]);

  // Filtered Material Stocks for Inventory Tab
  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      const query = stockSearchQuery.toLowerCase().trim();
      const matchesSearch =
        query === '' ||
        s.nama_bahan.toLowerCase().includes(query) ||
        (s.supplier_terakhir && s.supplier_terakhir.toLowerCase().includes(query)) ||
        s.kategori.toLowerCase().includes(query);

      const matchesCat =
        stockCategoryFilter === 'All' || s.kategori.toLowerCase() === stockCategoryFilter.toLowerCase();

      const isLow = s.stok <= s.stok_minimum;
      const matchesStatus =
        stockStatusFilter === 'All'
          ? true
          : stockStatusFilter === 'Low'
          ? isLow
          : !isLow;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [stocks, stockSearchQuery, stockCategoryFilter, stockStatusFilter]);

  // Financial Metrics Calculation
  const financialMetrics = useMemo(() => {
    // 1. Total Omzet (Total nilai penjualan dari pesanan dalam periode)
    const totalOmzet = filteredOrders.reduce((sum, o) => sum + (o.total_harga || 0), 0);

    // 2. Total Uang Masuk (Riwayat pembayaran DP & Pelunasan dari customer dalam periode)
    const totalUangMasuk = filteredCustomerPayments.reduce((sum, cp) => sum + (cp.nominal || 0), 0);

    // 3. Total Pembelian (Nilai transaksi pembelian bahan dalam periode)
    const totalPembelian = filteredPurchases.reduce((sum, p) => sum + (p.total || 0), 0);

    // 4. Total HPP (Harga Pokok Penjualan = Pemakaian bahan + Biaya produksi vendor pada order dalam periode)
    const totalBiayaBahanHpp = filteredUsages.reduce((sum, u) => sum + (u.total_biaya || 0), 0);
    const totalBiayaVendorHpp = filteredProductionCosts.reduce((sum, c) => sum + (c.biaya || 0), 0);
    const totalHpp = totalBiayaBahanHpp + totalBiayaVendorHpp;

    // 5. Total Biaya Operasional (Beban umum: Listrik, Internet, Transportasi, Maintenance, dll. - Hanya yang tidak dibatalkan/void)
    const activeExpenses = filteredExpenses.filter((e) => !e.is_void);
    const voidedExpenses = filteredExpenses.filter((e) => Boolean(e.is_void));
    const totalOperasional = activeExpenses.reduce((sum, e) => sum + (e.nominal || 0), 0);
    const totalOperasionalVoid = voidedExpenses.reduce((sum, e) => sum + (e.nominal || 0), 0);

    // 6. Laba Kotor = Total Omzet - Total HPP
    const labaKotor = totalOmzet - totalHpp;
    const marginKotorPersen = totalOmzet > 0 ? (labaKotor / totalOmzet) * 100 : 0;

    // 7. Laba Bersih = Laba Kotor - Total Biaya Operasional
    const labaBersih = labaKotor - totalOperasional;
    const marginBersihPersen = totalOmzet > 0 ? (labaBersih / totalOmzet) * 100 : 0;

    // 8. Total Piutang Customer (Sisa tagihan pesanan yang belum lunas dihitung dari seluruh pesanan aktif)
    const totalPiutangCustomer = orders.reduce((sum, o) => {
      const remaining = (o.total_harga || 0) - (o.nominal_dp || 0);
      return sum + Math.max(0, remaining);
    }, 0);

    // 9. Total Hutang Supplier (Sisa hutang pembelian bahan yang belum lunas)
    const totalHutangSupplier = purchases.reduce((sum, p) => {
      return sum + (p.sisa_hutang || 0);
    }, 0);

    // 10. Cash Flow Metrics (Uang Masuk Tunai vs Uang Keluar Tunai)
    // Cash In: Pembayaran customer yang benar-benar diterima
    const cashIn = totalUangMasuk;
    // Cash Out: Pembayaran kas/transfer ke supplier + Biaya vendor langsung + Biaya operasional
    const cashPaidToSuppliers = filteredSupplierPayments.reduce((sum, sp) => sum + (sp.nominal || 0), 0);
    const cashOut = cashPaidToSuppliers + totalBiayaVendorHpp + totalOperasional;
    const netCashFlow = cashIn - cashOut;

    // 11. Total Nilai Aset Stok Bahan yang ada di gudang
    const totalNilaiStok = stocks.reduce((sum, s) => sum + (s.stok || 0) * (s.harga_modal || 0), 0);

    // 12. Low stock alert count
    const lowStockCount = stocks.filter((s) => s.stok <= s.stok_minimum).length;

    return {
      totalOmzet,
      totalUangMasuk,
      totalPembelian,
      totalBiayaBahanHpp,
      totalBiayaVendorHpp,
      totalHpp,
      totalOperasional,
      totalOperasionalVoid,
      activeExpensesCount: activeExpenses.length,
      voidedExpensesCount: voidedExpenses.length,
      labaKotor,
      marginKotorPersen,
      labaBersih,
      marginBersihPersen,
      totalPiutangCustomer,
      totalHutangSupplier,
      cashIn,
      cashOut,
      netCashFlow,
      totalNilaiStok,
      lowStockCount,
    };
  }, [
    filteredOrders,
    filteredPurchases,
    filteredCustomerPayments,
    filteredSupplierPayments,
    filteredExpenses,
    filteredUsages,
    filteredProductionCosts,
    orders,
    purchases,
    stocks,
  ]);

  // Combined Cash Flow Journal (Chronological Ledger)
  const cashFlowLedger = useMemo(() => {
    interface LedgerEntry {
      id: string;
      tanggal: string;
      tipe: 'Masuk' | 'Keluar';
      kategori: string;
      deskripsi: string;
      nominal: number;
      metode: string;
      refNo?: string;
    }

    const list: LedgerEntry[] = [];

    // 1. Customer Payments (Cash In)
    filteredCustomerPayments.forEach((cp) => {
      list.push({
        id: cp.id,
        tanggal: cp.tanggal,
        tipe: 'Masuk',
        kategori: `Customer: ${cp.jenis_pembayaran}`,
        deskripsi: `Terima ${cp.jenis_pembayaran} pesanan #${cp.invoice_no} (${cp.nama_klien})`,
        nominal: cp.nominal,
        metode: cp.metode_pembayaran,
        refNo: cp.invoice_no,
      });
    });

    // 2. Supplier Payments (Cash Out)
    filteredSupplierPayments.forEach((sp) => {
      list.push({
        id: sp.id,
        tanggal: sp.tanggal,
        tipe: 'Keluar',
        kategori: 'Bayar Supplier',
        deskripsi: `Pembayaran ke ${sp.supplier} (PO #${sp.nomor_pembelian})`,
        nominal: sp.nominal,
        metode: sp.metode_pembayaran,
        refNo: sp.nomor_pembelian,
      });
    });

    // 3. Operational Expenses (Cash Out - Hanya yang aktif / tidak dibatalkan)
    filteredExpenses.filter((exp) => !exp.is_void).forEach((exp) => {
      list.push({
        id: exp.id,
        tanggal: exp.tanggal,
        tipe: 'Keluar',
        kategori: `BOP: ${exp.kategori}`,
        deskripsi: exp.deskripsi,
        nominal: exp.nominal,
        metode: exp.metode_pembayaran,
        refNo: exp.nomor_transaksi,
      });
    });

    // 4. Production Vendor Costs (Cash Out)
    filteredProductionCosts.forEach((cost) => {
      list.push({
        id: cost.id,
        tanggal: cost.tanggal,
        tipe: 'Keluar',
        kategori: `Vendor: ${cost.jenis_biaya}`,
        deskripsi: `${cost.deskripsi} (Order #${cost.invoice_no})`,
        nominal: cost.biaya,
        metode: 'Transfer/Kas',
        refNo: cost.invoice_no,
      });
    });

    return list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [filteredCustomerPayments, filteredSupplierPayments, filteredExpenses, filteredProductionCosts]);

  // Order Modal & HPP Per-Order Calculations
  const orderModalStats = useMemo(() => {
    return orders.map((o) => {
      const usagesForOrder = usages.filter(
        (u) => u.order_id === o.id || (u.invoice_no && u.invoice_no === o.invoice_no)
      );
      const costsForOrder = productionCosts.filter(
        (c) => c.order_id === o.id || (c.invoice_no && c.invoice_no === o.invoice_no)
      );
      const totalBahan = usagesForOrder.reduce((sum, u) => sum + (u.total_biaya || 0), 0);
      const totalVendor = costsForOrder.reduce((sum, c) => sum + (c.biaya || 0), 0);
      const totalModal = totalBahan + totalVendor > 0 ? totalBahan + totalVendor : (o.hpp || 0);
      const totalJual = o.total_harga || 0;
      const labaKotor = totalJual - totalModal;
      const marginPersen = totalJual > 0 ? (labaKotor / totalJual) * 100 : 0;
      const hasModal = totalModal > 0;

      return {
        order: o,
        usages: usagesForOrder,
        costs: costsForOrder,
        totalBahan,
        totalVendor,
        totalModal,
        totalJual,
        labaKotor,
        marginPersen,
        hasModal,
        itemCount: usagesForOrder.length + costsForOrder.length,
      };
    });
  }, [orders, usages, productionCosts]);

  const unbudgetedOrdersCount = useMemo(() => {
    return orderModalStats.filter((item) => !item.hasModal).length;
  }, [orderModalStats]);

  const orderModalSummary = useMemo(() => {
    const totalOmzetAll = orderModalStats.reduce((sum, item) => sum + item.totalJual, 0);
    const totalModalAll = orderModalStats.reduce((sum, item) => sum + item.totalModal, 0);
    const totalLabaAll = totalOmzetAll - totalModalAll;
    const avgMargin = totalOmzetAll > 0 ? (totalLabaAll / totalOmzetAll) * 100 : 0;
    return {
      totalOmzetAll,
      totalModalAll,
      totalLabaAll,
      avgMargin,
    };
  }, [orderModalStats]);

  const filteredOrderModalList = useMemo(() => {
    return orderModalStats.filter((item) => {
      const o = item.order;
      const q = orderModalSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (o.invoice_no && o.invoice_no.toLowerCase().includes(q)) ||
        (o.nama_klien && o.nama_klien.toLowerCase().includes(q)) ||
        (o.telepon && o.telepon.toLowerCase().includes(q)) ||
        (o.catatan && o.catatan.toLowerCase().includes(q));

      const matchesStatus =
        orderModalStatusFilter === 'All'
          ? true
          : orderModalStatusFilter === 'Unbudgeted'
          ? !item.hasModal
          : item.hasModal;

      return matchesSearch && matchesStatus;
    });
  }, [orderModalStats, orderModalSearchQuery, orderModalStatusFilter]);

  // Handlers for Stock CRUD
  const handleOpenNewStockModal = () => {
    setEditingStock(null);
    setStockFormData({
      nama_bahan: '',
      kategori: 'Kaos Polos',
      stok: 0,
      satuan: 'Pcs',
      harga_modal: 0,
      stok_minimum: 10,
      supplier_terakhir: '',
    });
    setIsStockModalOpen(true);
  };

  const handleOpenEditStockModal = (s: MaterialStock) => {
    setEditingStock(s);
    setStockFormData({
      nama_bahan: s.nama_bahan,
      kategori: s.kategori,
      stok: s.stok,
      satuan: s.satuan,
      harga_modal: s.harga_modal,
      stok_minimum: s.stok_minimum,
      supplier_terakhir: s.supplier_terakhir || '',
    });
    setIsStockModalOpen(true);
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockFormData.nama_bahan.trim()) return;

    try {
      await upsertMaterialStock({
        id: editingStock?.id,
        nama_bahan: stockFormData.nama_bahan,
        kategori: stockFormData.kategori,
        stok: stockFormData.stok,
        satuan: stockFormData.satuan,
        harga_modal: stockFormData.harga_modal,
        stok_minimum: stockFormData.stok_minimum,
        supplier_terakhir: stockFormData.supplier_terakhir,
      });
      setIsStockModalOpen(false);
    } catch (err) {
      console.error('Error saving stock:', err);
    }
  };

  const confirmDeleteStock = async () => {
    if (!stockToDelete) return;
    try {
      setIsDeletingStock(true);
      await deleteMaterialStock(stockToDelete.id);
      setFeedbackToast({
        type: 'success',
        message: `Bahan "${stockToDelete.nama_bahan}" berhasil dihapus dari inventori stok.`
      });
      setTimeout(() => setFeedbackToast(null), 4000);
      const deletedId = stockToDelete.id;
      setStockToDelete(null);
      if (isStockModalOpen && editingStock?.id === deletedId) {
        setIsStockModalOpen(false);
        setEditingStock(null);
      }
    } catch (err: any) {
      console.error('Error deleting material stock:', err);
      setFeedbackToast({
        type: 'error',
        message: `Gagal menghapus bahan: ${err?.message || 'Terjadi kesalahan sistem'}`
      });
      setTimeout(() => setFeedbackToast(null), 5000);
    } finally {
      setIsDeletingStock(false);
    }
  };

  const confirmDeletePurchase = async () => {
    if (!purchaseToDelete) return;
    try {
      setIsDeletingPurchase(true);
      await deleteMaterialPurchase(purchaseToDelete.id);
      setFeedbackToast({
        type: 'success',
        message: `Riwayat pembelian "${purchaseToDelete.nomor_pembelian}" berhasil dihapus.`
      });
      setTimeout(() => setFeedbackToast(null), 4000);
      setPurchaseToDelete(null);
    } catch (err: any) {
      console.error('Error deleting purchase:', err);
      setFeedbackToast({
        type: 'error',
        message: `Gagal menghapus pembelian: ${err?.message || 'Terjadi kesalahan'}`
      });
      setTimeout(() => setFeedbackToast(null), 5000);
    } finally {
      setIsDeletingPurchase(false);
    }
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      setIsDeletingExpense(true);
      await deleteOperationalExpense(expenseToDelete.id);
      setFeedbackToast({
        type: 'success',
        message: `Pengeluaran operasional "${expenseToDelete.deskripsi}" berhasil dihapus.`
      });
      setTimeout(() => setFeedbackToast(null), 4000);
      setExpenseToDelete(null);
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      setFeedbackToast({
        type: 'error',
        message: `Gagal menghapus pengeluaran: ${err?.message || 'Terjadi kesalahan'}`
      });
      setTimeout(() => setFeedbackToast(null), 5000);
    } finally {
      setIsDeletingExpense(false);
    }
  };

  const handleExecuteReset = async () => {
    try {
      setIsResetting(true);
      const res = await resetFinancialData();
      setFeedbackToast({
        type: 'success',
        message: `Seluruh data Manajemen Keuangan berhasil direset bersih (${res.count} catatan dihapus).`
      });
      setTimeout(() => setFeedbackToast(null), 5000);
      setIsResetModalOpen(false);
    } catch (err: any) {
      console.error('Error resetting financial data:', err);
      setFeedbackToast({
        type: 'error',
        message: `Gagal mereset data keuangan: ${err?.message || 'Terjadi kesalahan sistem'}`
      });
      setTimeout(() => setFeedbackToast(null), 5000);
    } finally {
      setIsResetting(false);
    }
  };

  // Filtered Expenses for Tab Table View
  const displayedExpenses = useMemo(() => {
    return filteredExpenses.filter((e) => {
      const matchesCategory =
        expenseCategoryFilter === 'All' ||
        e.kategori.toLowerCase() === expenseCategoryFilter.toLowerCase();

      const matchesStatus =
        expenseStatusFilter === 'All'
          ? true
          : expenseStatusFilter === 'Active'
          ? !e.is_void
          : Boolean(e.is_void);

      const q = expenseSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (e.deskripsi && e.deskripsi.toLowerCase().includes(q)) ||
        (e.nomor_transaksi && e.nomor_transaksi.toLowerCase().includes(q)) ||
        (e.kategori && e.kategori.toLowerCase().includes(q)) ||
        (e.catatan && e.catatan.toLowerCase().includes(q)) ||
        (e.created_by && e.created_by.toLowerCase().includes(q));

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [filteredExpenses, expenseCategoryFilter, expenseStatusFilter, expenseSearchQuery]);

  const handleOpenNewExpense = () => {
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  const handleEditExpense = (expense: OperationalExpense) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const handleOpenVoidModal = (expense: OperationalExpense) => {
    setVoidingExpense(expense);
    setVoidReason('');
  };

  const handleConfirmVoid = async () => {
    if (!voidingExpense) return;
    if (!voidReason.trim()) {
      alert('Mohon masukkan alasan pembatalan / void.');
      return;
    }

    setVoidLoading(true);
    try {
      await voidOperationalExpense(
        voidingExpense.id,
        voidReason.trim(),
        user?.name || user?.email || 'Finance'
      );
      setVoidingExpense(null);
      setVoidReason('');
    } catch (err: any) {
      console.error('Error voiding expense:', err);
      alert('Gagal membatalkan transaksi: ' + (err?.message || 'Error'));
    } finally {
      setVoidLoading(false);
    }
  };

  const handleRestoreExpense = async (expense: OperationalExpense) => {
    if (
      window.confirm(
        `Pulihkan transaksi #${expense.nomor_transaksi} (${formatRupiah(expense.nominal)})? Transaksi akan aktif kembali dan masuk ke perhitungan pengeluaran.`
      )
    ) {
      try {
        await restoreOperationalExpense(expense.id, user?.name || user?.email || 'Finance');
      } catch (err: any) {
        console.error('Error restoring expense:', err);
        alert('Gagal memulihkan transaksi: ' + (err?.message || 'Error'));
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Fast Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#E63946] to-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/25">
            <CircleDollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] tracking-tight">
                Manajemen Keuangan Porda
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                ERP Finance
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Pantau Omzet, Arus Kas, HPP per Pesanan, Biaya Operasional, dan Laba Bersih secara terintegrasi
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPrefilledStockForPurchase(null);
              setIsPurchaseModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#E63946] hover:bg-red-600 active:scale-98 text-white text-xs font-bold shadow-md shadow-red-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>+ Beli Bahan</span>
          </button>
          <button
            type="button"
            onClick={handleOpenNewExpense}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black active:scale-98 text-white text-xs font-bold shadow-md shadow-slate-900/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>+ Tambah Pengeluaran</span>
          </button>
          <button
            type="button"
            onClick={() => setIsUsageModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white text-xs font-bold shadow-md shadow-amber-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>+ Pakai Bahan (HPP)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCostModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold shadow-md shadow-indigo-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>+ Biaya Vendor</span>
          </button>
          <button
            type="button"
            onClick={() => setIsGuideModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 active:scale-98 text-xs font-bold border border-blue-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Buku Panduan & Cara Penggunaan Fitur Keuangan"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Panduan Fitur</span>
          </button>
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 active:scale-98 text-xs font-bold border border-slate-200 hover:border-red-200 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Reset Seluruh Data Manajemen Keuangan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Keuangan</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Periode Laporan:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'today', label: 'Hari Ini' },
              { id: 'week', label: 'Minggu Ini' },
              { id: 'month', label: 'Bulan Ini' },
              { id: 'custom', label: 'Custom Tanggal' },
              { id: 'all', label: 'Semua' },
            ] as { id: DateFilterMode; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setDateFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilter === item.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#E63946]"
            />
            <span className="text-xs text-slate-400">s/d</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#E63946]"
            />
          </div>
        )}
      </div>

      {/* Low Stock Warning Alert if any */}
      {financialMetrics.lowStockCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">
                Peringatan Inventori: Terdapat {financialMetrics.lowStockCount} bahan dengan stok di bawah batas minimum!
              </p>
              <p className="text-[11px] text-amber-800">
                Segera lakukan pembelian ulang agar antrean produksi sablon tidak terhambat.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('stocks')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-all cursor-pointer shadow-2xs"
          >
            Cek Stok Bahan
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200/90 text-xs font-bold scrollbar-none">
        {[
          { id: 'dashboard', label: 'Dashboard Keuangan', icon: CircleDollarSign },
          {
            id: 'order_modal',
            label: 'Modal Pesanan (HPP)',
            icon: Calculator,
            badge: unbudgetedOrdersCount > 0 ? `${unbudgetedOrdersCount} Perlu Input` : undefined,
          },
          { id: 'purchases', label: 'Pembelian Bahan', icon: ShoppingCart },
          { id: 'stocks', label: 'Stok Bahan', icon: Package, badge: financialMetrics.lowStockCount > 0 ? financialMetrics.lowStockCount : undefined },
          { id: 'usages', label: 'Pemakaian Bahan (HPP)', icon: Layers },
          { id: 'production_costs', label: 'Biaya Produksi Vendor', icon: Cpu },
          { id: 'expenses', label: 'Pengeluaran Operasional', icon: Receipt },
          { id: 'customer_payments', label: 'Pembayaran Customer & Piutang', icon: DollarSign },
          { id: 'cashflow', label: 'Arus Kas (Cash Flow)', icon: Wallet },
          { id: 'debts', label: 'Hutang Supplier', icon: Landmark, badge: financialMetrics.totalHutangSupplier > 0 ? 'Ada Hutang' : undefined },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as FinanceTab)}
              className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#E63946]' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isActive ? 'bg-[#E63946] text-white' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: DASHBOARD KEUANGAN */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Main 9 Financial Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Total Omzet */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Omzet (Penjualan)</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 font-['Outfit']">
                {formatRupiah(financialMetrics.totalOmzet)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Dari {filteredOrders.length} pesanan pada periode terpilih
              </p>
            </div>

            {/* 2. Total Uang Masuk */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Uang Masuk (Kas Masuk)</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-600 font-['Outfit']">
                {formatRupiah(financialMetrics.totalUangMasuk)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                DP & pelunasan riil yang diterima dari customer
              </p>
            </div>

            {/* 3. Total Piutang Customer */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Piutang Customer</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-600 font-['Outfit']">
                {formatRupiah(financialMetrics.totalPiutangCustomer)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Tagihan customer yang belum dilunasi
              </p>
            </div>

            {/* 4. Total Pembelian Bahan */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pembelian Bahan</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 font-['Outfit']">
                {formatRupiah(financialMetrics.totalPembelian)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Nilai pengadaan bahan dari {filteredPurchases.length} transaksi PO
              </p>
            </div>

            {/* 5. Total HPP (Harga Pokok Penjualan) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total HPP Produksi</span>
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-600 font-['Outfit']">
                {formatRupiah(financialMetrics.totalHpp)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Bahan: {formatRupiah(financialMetrics.totalBiayaBahanHpp)} • Vendor: {formatRupiah(financialMetrics.totalBiayaVendorHpp)}
              </p>
            </div>

            {/* 6. Total Biaya Operasional */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Biaya Operasional (BOP)</span>
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 font-['Outfit']">
                {formatRupiah(financialMetrics.totalOperasional)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Listrik, internet, bensin, maintenance & umum
              </p>
            </div>

            {/* 7. Laba Kotor */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-3xl shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Laba Kotor</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Margin: {financialMetrics.marginKotorPersen.toFixed(1)}%
                </span>
              </div>
              <p className="text-2xl font-black text-white font-['Outfit']">
                {formatRupiah(financialMetrics.labaKotor)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Total Omzet dikurangi Total HPP
              </p>
            </div>

            {/* 8. Laba Bersih (Net Profit) */}
            <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white p-5 rounded-3xl shadow-md border border-emerald-800/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Laba Bersih (Net Profit)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-400 text-emerald-950">
                  Bersih: {financialMetrics.marginBersihPersen.toFixed(1)}%
                </span>
              </div>
              <p className="text-2xl font-black text-emerald-300 font-['Outfit']">
                {formatRupiah(financialMetrics.labaBersih)}
              </p>
              <p className="text-xs text-emerald-200/70 mt-1">
                Laba Kotor dikurangi Beban Operasional
              </p>
            </div>

            {/* 9. Total Hutang Supplier */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Hutang Supplier</span>
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-600 font-['Outfit']">
                {formatRupiah(financialMetrics.totalHutangSupplier)}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-400">Kewajiban pembelian bahan belum lunas</p>
                {financialMetrics.totalHutangSupplier > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('debts')}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                  >
                    Bayar Hutang →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Analytical Breakdown: Arus Kas & Struktur Biaya */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Arus Kas Riil (Cash Flow Summary) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-['Outfit']">Ringkasan Arus Kas Riil</h3>
                  <p className="text-xs text-slate-500">Uang tunai & transfer yang benar-benar masuk dan keluar</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('cashflow')}
                  className="text-xs font-bold text-[#E63946] hover:underline cursor-pointer"
                >
                  Buka Jurnal Arus Kas →
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">Cash In (Uang Masuk)</span>
                      <span className="text-[11px] text-emerald-700">Pembayaran riil dari customer</span>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-700 font-['Outfit']">
                    {formatRupiah(financialMetrics.cashIn)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-rose-950 block">Cash Out (Uang Keluar)</span>
                      <span className="text-[11px] text-rose-700">Bayar supplier + vendor + operasional</span>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-rose-700 font-['Outfit']">
                    {formatRupiah(financialMetrics.cashOut)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-white shadow-xs">
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">Net Cash Flow (Arus Kas Bersih)</span>
                    <span className="text-[11px] text-slate-400">Surplus / Defisit Kas Periode Ini</span>
                  </div>
                  <span
                    className={`text-base font-black font-['Outfit'] ${
                      financialMetrics.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {financialMetrics.netCashFlow >= 0 ? '+' : ''}
                    {formatRupiah(financialMetrics.netCashFlow)}
                  </span>
                </div>
              </div>
            </div>

            {/* Nilai Aset Stok & Inventori Gudang */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-['Outfit']">Nilai Aset Stok & Gudang</h3>
                  <p className="text-xs text-slate-500">Valuasi stok bahan baku yang siap dipakai produksi</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('stocks')}
                  className="text-xs font-bold text-[#E63946] hover:underline cursor-pointer"
                >
                  Kelola Stok →
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Total Nilai Bahan di Gudang:</span>
                  <span className="text-xl font-extrabold text-slate-900 font-['Outfit']">
                    {formatRupiah(financialMetrics.totalNilaiStok)}
                  </span>
                </div>
                <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700">
                  {stocks.length} Jenis Bahan
                </span>
              </div>

              {/* Sample top stocks preview */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Status Stok Terkini:
                </span>
                {stocks.slice(0, 4).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 text-xs border border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          s.stok <= s.stok_minimum ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                      <span className="font-semibold text-slate-800">{s.nama_bahan}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 block">
                        {s.stok} {s.satuan}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatRupiah(s.stok * s.harga_modal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION: Daftar Order Masuk & Input Modal (HPP Per Order) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 font-['Outfit']">
                    Alokasi Modal Pesanan (HPP Order Masuk)
                  </h3>
                  {unbudgetedOrdersCount > 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>{unbudgetedOrdersCount} Order Perlu Input Modal</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Seluruh Order Sudah Diinput Modal</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Setiap orderan baru otomatis masuk ke daftar ini. Klik <strong>+ Input Modal</strong> untuk mencatat modal bahan baku & ongkos vendor per orderan.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('order_modal')}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Calculator className="w-4 h-4 text-amber-400" />
                  <span>Buka Kelola Modal Order ({orders.length}) →</span>
                </button>
              </div>
            </div>

            {/* Quick Orders Table */}
            <div className="border border-slate-200 rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[780px]">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">No. Invoice & Tanggal</th>
                    <th className="px-4 py-3">Klien & Qty</th>
                    <th className="px-4 py-3">Harga Jual (Omzet)</th>
                    <th className="px-4 py-3">Modal Terinput (HPP)</th>
                    <th className="px-4 py-3">Proyeksi Laba Kotor</th>
                    <th className="px-4 py-3">Margin %</th>
                    <th className="px-4 py-3">Status Modal</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orderModalStats.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Belum ada orderan masuk di sistem. Setiap ada pesanan masuk, daftar akan bertambah di sini secara otomatis.
                      </td>
                    </tr>
                  ) : (
                    orderModalStats.slice(0, 6).map((item) => {
                      const o = item.order;
                      return (
                        <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900 block">#{o.invoice_no}</span>
                            <span className="text-[10px] text-slate-400">{o.created_at ? o.created_at.split('T')[0] : '-'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800 block">{o.nama_klien}</span>
                            <span className="text-[10px] text-slate-500">{o.jumlah_pcs || 1} Pcs</span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {formatRupiah(item.totalJual)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-extrabold text-rose-600 font-['Outfit'] block">
                              {formatRupiah(item.totalModal)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Bahan: {formatRupiah(item.totalBahan)} • Vendor: {formatRupiah(item.totalVendor)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-extrabold font-['Outfit'] ${
                                item.labaKotor >= 0 ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {formatRupiah(item.labaKotor)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.marginPersen >= 30
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.marginPersen >= 15
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.marginPersen.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {item.hasModal ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Modal Terinput</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Belum Diinput</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedHppOrder(o);
                                setIsHppModalOpen(true);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 ml-auto cursor-pointer ${
                                item.hasModal
                                  ? 'bg-slate-900 hover:bg-black text-white'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                              }`}
                            >
                              <Calculator className="w-3.5 h-3.5 text-amber-300" />
                              <span>{item.hasModal ? 'Kelola Modal' : '+ Input Modal'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {orderModalStats.length > 6 && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('order_modal')}
                  className="text-xs font-bold text-slate-700 hover:text-black underline cursor-pointer"
                >
                  Lihat Seluruh {orderModalStats.length} Pesanan & Kelola Modal →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1.5: MODAL PESANAN (HPP ORDER) */}
      {activeTab === 'order_modal' && (
        <div className="space-y-6">
          {/* Header Summary Banner */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-['Outfit']">
                      Manajemen & Input Modal Pesanan (HPP Order)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Setiap orderan masuk dari tim kasir/sales otomatis muncul di sini. Tim keuangan menginput modal bahan baku & ongkos vendor produksi untuk memonitor laba kotor & margin.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Orderan Masuk
                </span>
                <p className="text-xl font-black text-slate-900 font-['Outfit'] mt-0.5">
                  {orders.length} <span className="text-xs font-medium text-slate-400">Order</span>
                </p>
                <span className="text-[10px] text-slate-400">Tersinkronisasi otomatis dari kasir</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Omzet Pesanan
                </span>
                <p className="text-xl font-black text-slate-900 font-['Outfit'] mt-0.5">
                  {formatRupiah(orderModalSummary.totalOmzetAll)}
                </p>
                <span className="text-[10px] text-slate-400">Nilai total harga jual order</span>
              </div>

              <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-200/70">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                  Total Modal Terinput (HPP)
                </span>
                <p className="text-xl font-black text-rose-600 font-['Outfit'] mt-0.5">
                  {formatRupiah(orderModalSummary.totalModalAll)}
                </p>
                <span className="text-[10px] text-rose-500">Bahan Baku + Biaya Vendor</span>
              </div>

              <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/70">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Proyeksi Laba Kotor
                </span>
                <p className="text-xl font-black text-emerald-700 font-['Outfit'] mt-0.5">
                  {formatRupiah(orderModalSummary.totalLabaAll)}
                </p>
                <span className="text-[10px] text-emerald-600">Rata-rata Margin: {orderModalSummary.avgMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Table & Filtering */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setOrderModalStatusFilter('All')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    orderModalStatusFilter === 'All'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua Pesanan ({orderModalStats.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderModalStatusFilter('Unbudgeted')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    orderModalStatusFilter === 'Unbudgeted'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Belum Diinput Modal ({unbudgetedOrdersCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderModalStatusFilter('Budgeted')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    orderModalStatusFilter === 'Budgeted'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Modal Terinput ({orderModalStats.length - unbudgetedOrdersCount})</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={orderModalSearchQuery}
                  onChange={(e) => setOrderModalSearchQuery(e.target.value)}
                  placeholder="Cari no. invoice, klien, catatan..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            {/* Orders Table */}
            <div className="border border-slate-200 rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[900px]">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">No. Invoice & Tanggal</th>
                    <th className="px-4 py-3">Nama Klien & Kontak</th>
                    <th className="px-4 py-3">Detail Pesanan</th>
                    <th className="px-4 py-3">Harga Jual (Omzet)</th>
                    <th className="px-4 py-3">Rincian Modal Bahan</th>
                    <th className="px-4 py-3">Rincian Modal Vendor</th>
                    <th className="px-4 py-3">Total Modal (HPP)</th>
                    <th className="px-4 py-3">Laba & Margin</th>
                    <th className="px-4 py-3">Status Modal</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrderModalList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                        <Calculator className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">Tidak ada data orderan yang sesuai.</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Setiap ada orderan baru yang masuk dari kasir/sales, daftar otomatis bertambah di sini secara real-time.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredOrderModalList.map((item) => {
                      const o = item.order;
                      return (
                        <tr
                          key={o.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            !item.hasModal ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900 block">#{o.invoice_no}</span>
                            <span className="text-[10px] text-slate-400">
                              {o.created_at ? o.created_at.split('T')[0] : '-'}
                            </span>
                            {o.deadline && (
                              <span className="block text-[10px] text-rose-500 font-medium">
                                DL: {o.deadline}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-800 block">{o.nama_klien}</span>
                            {o.telepon && (
                              <span className="text-[10px] text-slate-400 block">{o.telepon}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-800 block">
                              {o.jumlah_pcs || 1} Pcs
                            </span>
                            <span className="text-[10px] text-slate-500 line-clamp-1">
                              {o.jenis_pesanan || o.tipe_layanan || 'Pesanan Konveksi'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-extrabold text-slate-900 font-['Outfit']">
                            {formatRupiah(item.totalJual)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-amber-800 block font-['Outfit']">
                              {formatRupiah(item.totalBahan)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {item.usages.length} item bahan
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-indigo-800 block font-['Outfit']">
                              {formatRupiah(item.totalVendor)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {item.costs.length} item vendor
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-black text-rose-600 font-['Outfit'] text-sm block">
                              {formatRupiah(item.totalModal)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              @{formatRupiah(Math.round(item.totalModal / (o.jumlah_pcs || 1)))}/pcs
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-black font-['Outfit'] block ${
                                item.labaKotor >= 0 ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                            >
                              {formatRupiah(item.labaKotor)}
                            </span>
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                                item.marginPersen >= 30
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.marginPersen >= 15
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.marginPersen.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {item.hasModal ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Modal Terinput</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Belum Diinput</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedHppOrder(o);
                                setIsHppModalOpen(true);
                              }}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 ml-auto cursor-pointer ${
                                item.hasModal
                                  ? 'bg-slate-900 hover:bg-black text-white'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                              }`}
                            >
                              <Calculator className="w-3.5 h-3.5 text-amber-300" />
                              <span>{item.hasModal ? 'Kelola Modal' : '+ Input Modal'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PEMBELIAN BAHAN */}
      {activeTab === 'purchases' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Outfit']">Daftar Pembelian Bahan (Purchasing)</h2>
              <p className="text-xs text-slate-500">Mencatat pembelian kaos polos, kain, DTF, tinta, packaging, dan bahan percetakan</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPrefilledStockForPurchase(null);
                setIsPurchaseModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#E63946] hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-red-500/20 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat Pembelian Baru</span>
            </button>
          </div>

          {/* Purchases Table */}
          <div className="border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[800px]">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">No. Pembelian / Tanggal</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Bahan & Kategori</th>
                  <th className="px-4 py-3">Qty & Satuan</th>
                  <th className="px-4 py-3">Harga Satuan</th>
                  <th className="px-4 py-3">Total Tagihan</th>
                  <th className="px-4 py-3">Status Bayar</th>
                  <th className="px-4 py-3">Sisa Hutang</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                      Belum ada data pembelian bahan pada periode ini.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block">{p.nomor_pembelian}</span>
                        <span className="text-[10px] text-slate-400">{p.tanggal}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{p.supplier}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900 block">{p.nama_bahan}</span>
                        <span className="text-[10px] text-slate-500">{p.kategori}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {p.qty} {p.satuan}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatRupiah(p.harga_satuan)}</td>
                      <td className="px-4 py-3 font-extrabold text-slate-900">{formatRupiah(p.total)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            p.status_pembayaran === 'Lunas'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status_pembayaran === 'DP / Sebagian'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.status_pembayaran}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.sisa_hutang > 0 ? (
                          <span className="font-bold text-rose-600 font-['Outfit']">
                            {formatRupiah(p.sisa_hutang)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">Rp0 (Lunas)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                        {p.sisa_hutang > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDebtPurchase(p);
                              setIsDebtModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Bayar Hutang
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPurchaseToDelete(p)}
                          className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Hapus Pembelian"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STOK BAHAN */}
      {activeTab === 'stocks' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Outfit']">Inventori Stok Bahan Baku</h2>
              <p className="text-xs text-slate-500">
                Pantau stok bahan, beli ulang, perbarui data, atau hapus bahan dari inventori
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenNewStockModal}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Bahan Baru</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
              {/* Search input */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={stockSearchQuery}
                  onChange={(e) => setStockSearchQuery(e.target.value)}
                  placeholder="Cari nama bahan atau supplier..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-slate-400"
                />
                {stockSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setStockSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={stockCategoryFilter}
                  onChange={(e) => setStockCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-hidden focus:border-slate-400"
                >
                  <option value="All">Semua Kategori</option>
                  <option value="Kaos Polos">Kaos Polos</option>
                  <option value="Kain">Kain</option>
                  <option value="DTF / Film">DTF / Film</option>
                  <option value="Tinta & Kimia">Tinta & Kimia</option>
                  <option value="Kertas & Stiker">Kertas & Stiker</option>
                  <option value="Plastik & Packaging">Plastik & Packaging</option>
                  <option value="Bahan Percetakan">Bahan Percetakan</option>
                  <option value="Aksesoris & Finishing">Aksesoris & Finishing</option>
                  <option value="Bahan Lainnya">Bahan Lainnya</option>
                </select>
              </div>

              {/* Status filter pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('All')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    stockStatusFilter === 'All'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('Low')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    stockStatusFilter === 'Low'
                      ? 'bg-amber-100 text-amber-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚠️ Menipis
                </button>
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('Safe')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    stockStatusFilter === 'Safe'
                      ? 'bg-emerald-100 text-emerald-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✓ Aman
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                {filteredStocks.length} bahan
              </span>
            </div>
          </div>

          {/* Stocks Table */}
          <div className="border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Nama Bahan</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Sisa Stok</th>
                  <th className="px-4 py-3">Harga Modal</th>
                  <th className="px-4 py-3">Total Nilai Stok</th>
                  <th className="px-4 py-3">Status Stok</th>
                  <th className="px-4 py-3">Supplier Terakhir</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      {stocks.length === 0
                        ? 'Belum ada data bahan baku di inventori. Klik "+ Bahan Baru" untuk menambahkan.'
                        : 'Tidak ada bahan yang cocok dengan pencarian atau filter yang dipilih.'}
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map((s) => {
                    const isLow = s.stok <= s.stok_minimum;
                    const totalNilai = s.stok * s.harga_modal;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-900">{s.nama_bahan}</td>
                        <td className="px-4 py-3 text-slate-600">{s.kategori}</td>
                        <td className="px-4 py-3 font-extrabold text-slate-900 text-sm">
                          {s.stok} <span className="text-xs font-normal text-slate-500">{s.satuan}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatRupiah(s.harga_modal)}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{formatRupiah(totalNilai)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isLow
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isLow ? `⚠️ Menipis (Min: ${s.stok_minimum})` : '✓ Aman'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">{s.supplier_terakhir || '-'}</td>
                        <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setPrefilledStockForPurchase(s);
                              setIsPurchaseModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#E63946] hover:bg-red-600 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Beli Lagi
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditStockModal(s)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setStockToDelete(s)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors cursor-pointer inline-flex items-center"
                            title={`Hapus bahan ${s.nama_bahan}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PEMAKAIAN BAHAN (HPP) */}
      {activeTab === 'usages' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Outfit']">Riwayat Pemakaian Bahan (HPP)</h2>
              <p className="text-xs text-slate-500">
                Pencatatan bahan yang digunakan untuk tiap pesanan. Mengurangi stok dan otomatis menghitung HPP pesanan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsUsageModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat Pemakaian Bahan</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">No. Invoice / Pesanan</th>
                  <th className="px-4 py-3">Klien</th>
                  <th className="px-4 py-3">Bahan Digunakan</th>
                  <th className="px-4 py-3">Qty Terpakai</th>
                  <th className="px-4 py-3">Modal Satuan</th>
                  <th className="px-4 py-3">Total Masuk HPP</th>
                  <th className="px-4 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsages.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      Belum ada pemakaian bahan yang dicatat pada periode ini.
                    </td>
                  </tr>
                ) : (
                  filteredUsages.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{u.tanggal}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">#{u.invoice_no}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{u.nama_klien}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{u.nama_bahan}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {u.qty} {u.satuan}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatRupiah(u.harga_modal_satuan)}</td>
                      <td className="px-4 py-3 font-extrabold text-amber-700 font-['Outfit']">
                        {formatRupiah(u.total_biaya)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">{u.catatan || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BIAYA PRODUKSI VENDOR */}
      {activeTab === 'production_costs' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Outfit']">Biaya Produksi Vendor & Maklon</h2>
              <p className="text-xs text-slate-500">
                Biaya vendor langsung per order (Jahit, bordir, sablon vendor, finishing, packaging, setting) yang membentuk HPP
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCostModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Biaya Vendor</span>
            </button>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">No. Invoice Order</th>
                  <th className="px-4 py-3">Jenis Biaya</th>
                  <th className="px-4 py-3">Nama Vendor / Mitra</th>
                  <th className="px-4 py-3">Rincian Pekerjaan</th>
                  <th className="px-4 py-3">Nominal Masuk HPP</th>
                  <th className="px-4 py-3">Dicatat Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProductionCosts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Belum ada biaya vendor yang dicatat pada periode ini.
                    </td>
                  </tr>
                ) : (
                  filteredProductionCosts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{c.tanggal}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">#{c.invoice_no}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-200/60">
                          {c.jenis_biaya}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{c.nama_vendor || '-'}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{c.deskripsi}</td>
                      <td className="px-4 py-3 font-extrabold text-indigo-700 font-['Outfit']">
                        {formatRupiah(c.biaya)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">{c.created_by}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: PENGELUARAN OPERASIONAL */}
      {activeTab === 'expenses' && (
        <div className="space-y-5">
          {/* Header & Quick Add */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-['Outfit']">
                  Pengeluaran Operasional Bisnis
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pencatatan pengeluaran rutin operasional: Listrik, Internet, Transportasi, Bensin, Maintenance Mesin, Sewa, Gaji, Marketing, ATK, Administrasi, Packaging, Biaya Bank, dll.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewExpense}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/20 cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Pengeluaran</span>
              </button>
            </div>

            {/* Summary metrics for current period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
              <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-100/90">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                  Total Pengeluaran (Periode)
                </span>
                <p className="text-2xl font-black text-rose-700 font-['Outfit']">
                  {formatRupiah(financialMetrics.totalOperasional)}
                </p>
                <p className="text-[11px] text-rose-600/80 mt-1">
                  Dihitung dari {financialMetrics.activeExpensesCount} transaksi aktif
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Transaksi Aktif
                </span>
                <p className="text-2xl font-black text-slate-900 font-['Outfit']">
                  {financialMetrics.activeExpensesCount}{' '}
                  <span className="text-sm font-semibold text-slate-500">Transaksi</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Masuk ke Laba Bersih & Arus Kas
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                  Beban Masuk Cash Out
                </span>
                <p className="text-2xl font-black text-emerald-700 font-['Outfit']">
                  {formatRupiah(financialMetrics.totalOperasional)}
                </p>
                <p className="text-[11px] text-emerald-700/80 mt-1">
                  Tercatat otomatis sebagai uang keluar
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                  Transaksi Dibatalkan (Void)
                </span>
                <p className="text-2xl font-black text-amber-800 font-['Outfit']">
                  {financialMetrics.voidedExpensesCount}{' '}
                  <span className="text-sm font-semibold text-amber-700">Void</span>
                </p>
                <p className="text-[11px] text-amber-700/80 mt-1">
                  Total {formatRupiah(financialMetrics.totalOperasionalVoid || 0)} (dikeluarkan)
                </p>
              </div>
            </div>

            {/* Toolbar Filters: Search, Category, Status */}
            <div className="pt-2 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search */}
                <div className="relative min-w-[200px] flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={expenseSearchQuery}
                    onChange={(e) => setExpenseSearchQuery(e.target.value)}
                    placeholder="Cari deskripsi, no. transaksi, catatan..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                  {expenseSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setExpenseSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={expenseCategoryFilter}
                    onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="All">Semua Kategori</option>
                    <option value="Listrik">Listrik</option>
                    <option value="Internet">Internet</option>
                    <option value="Transportasi">Transportasi</option>
                    <option value="Bensin">Bensin</option>
                    <option value="Maintenance Mesin">Maintenance Mesin</option>
                    <option value="Sewa">Sewa</option>
                    <option value="Gaji">Gaji</option>
                    <option value="Marketing">Marketing</option>
                    <option value="ATK">ATK</option>
                    <option value="Administrasi">Administrasi</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Biaya Bank">Biaya Bank</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setExpenseStatusFilter('All')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    expenseStatusFilter === 'All'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({filteredExpenses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseStatusFilter('Active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    expenseStatusFilter === 'Active'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Aktif ({financialMetrics.activeExpensesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseStatusFilter('Void')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    expenseStatusFilter === 'Void'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Void ({financialMetrics.voidedExpensesCount})
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">No. Transaksi / Tanggal</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Deskripsi & Catatan</th>
                    <th className="px-4 py-3">Metode Bayar</th>
                    <th className="px-4 py-3">Nominal</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Dicatat Oleh</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">Tidak ada pengeluaran yang sesuai</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {expenses.length === 0
                            ? 'Belum ada data pengeluaran operasional yang dicatat.'
                            : 'Coba ubah filter kategori, status, atau rentang tanggal.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    displayedExpenses.map((exp) => {
                      const isVoid = Boolean(exp.is_void);
                      return (
                        <tr
                          key={exp.id}
                          className={`transition-colors ${
                            isVoid ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span
                              className={`font-bold block ${
                                isVoid ? 'line-through text-slate-400' : 'text-slate-900'
                              }`}
                            >
                              {exp.nomor_transaksi}
                            </span>
                            <span className="text-[10px] text-slate-400">{exp.tanggal}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[11px] inline-block ${
                                isVoid
                                  ? 'bg-slate-100 text-slate-500'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200/60'
                              }`}
                            >
                              {exp.kategori}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p
                              className={`font-semibold ${
                                isVoid ? 'line-through text-slate-500' : 'text-slate-800'
                              }`}
                            >
                              {exp.deskripsi}
                            </p>
                            {exp.catatan && (
                              <p className="text-[11px] text-slate-500 italic mt-0.5">
                                Catatan: {exp.catatan}
                              </p>
                            )}
                            {isVoid && exp.void_reason && (
                              <p className="text-[10px] text-rose-700 font-medium mt-1 bg-rose-100/70 px-2 py-0.5 rounded inline-block">
                                Alasan Void: {exp.void_reason} (oleh {exp.void_by || 'Staff'})
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                              {exp.metode_pembayaran}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-extrabold font-['Outfit'] text-sm ${
                                isVoid ? 'line-through text-slate-400' : 'text-rose-600'
                              }`}
                            >
                              {formatRupiah(exp.nominal)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isVoid ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 w-fit">
                                <Ban className="w-3 h-3 text-rose-600" />
                                <span>VOID</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Aktif</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-[11px]">
                            <span>{exp.created_by}</span>
                            {exp.updated_at && (
                              <span className="text-[10px] text-slate-400 block">
                                Diedit: {exp.updated_by || 'Staff'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!isVoid ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEditExpense(exp)}
                                    title="Edit Pengeluaran"
                                    className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenVoidModal(exp)}
                                    title="Batalkan Transaksi (Void)"
                                    className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreExpense(exp)}
                                  title="Pulihkan Transaksi"
                                  className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setExpenseToDelete(exp)}
                                title="Hapus Permanen"
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: PEMBAYARAN CUSTOMER & PIUTANG */}
      {activeTab === 'customer_payments' && (
        <div className="space-y-6">
          {/* Section 1: Daftar Piutang Customer Belum Lunas */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-['Outfit']">Daftar Tagihan Belum Lunas (Piutang Customer)</h2>
                <p className="text-xs text-slate-500">
                  Total sisa piutang: <strong className="text-amber-600">{formatRupiah(financialMetrics.totalPiutangCustomer)}</strong>
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[750px]">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">No. Invoice</th>
                    <th className="px-4 py-3">Klien</th>
                    <th className="px-4 py-3">Status Order</th>
                    <th className="px-4 py-3">Total Pesanan</th>
                    <th className="px-4 py-3">Sudah Dibayar</th>
                    <th className="px-4 py-3">Sisa Piutang</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders
                    .filter((o) => (o.total_harga || 0) - (o.nominal_dp || 0) > 0)
                    .map((o) => {
                      const sisa = (o.total_harga || 0) - (o.nominal_dp || 0);
                      return (
                        <tr key={o.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-900">#{o.invoice_no}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{o.nama_klien}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {o.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">{formatRupiah(o.total_harga)}</td>
                          <td className="px-4 py-3 font-semibold text-emerald-700">{formatRupiah(o.nominal_dp || 0)}</td>
                          <td className="px-4 py-3 font-extrabold text-amber-600 font-['Outfit']">
                            {formatRupiah(sisa)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustOrder(o);
                                setIsCustPaymentModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            >
                              + Terima Pembayaran
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Riwayat Penerimaan Uang dari Customer */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Outfit']">Riwayat Transaksi Pembayaran Customer</h2>
              <p className="text-xs text-slate-500">History penerimaan uang muka (DP), cicilan, dan pelunasan tagihan</p>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">No. Invoice Order</th>
                    <th className="px-4 py-3">Nama Klien</th>
                    <th className="px-4 py-3">Jenis Pembayaran</th>
                    <th className="px-4 py-3">Metode</th>
                    <th className="px-4 py-3">Nominal Diterima</th>
                    <th className="px-4 py-3">Penerima</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomerPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Belum ada riwayat pembayaran customer pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomerPayments.map((cp) => (
                      <tr key={cp.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600">{cp.tanggal}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">#{cp.invoice_no}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{cp.nama_klien}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {cp.jenis_pembayaran}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{cp.metode_pembayaran}</td>
                        <td className="px-4 py-3 font-extrabold text-emerald-600 font-['Outfit']">
                          {formatRupiah(cp.nominal)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">{cp.diterima_oleh}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: ARUS KAS (CASH FLOW) */}
      {activeTab === 'cashflow' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Outfit']">Jurnal Arus Kas (Cash Flow Ledger)</h2>
              <p className="text-xs text-slate-500">
                Pencatatan kronologis arus uang masuk (Cash In) dan arus uang keluar (Cash Out) secara real-time
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                In: {formatRupiah(financialMetrics.cashIn)}
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200">
                Out: {formatRupiah(financialMetrics.cashOut)}
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold">
                Net: {formatRupiah(financialMetrics.netCashFlow)}
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Arus Kas</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Deskripsi Transaksi</th>
                  <th className="px-4 py-3">Metode</th>
                  <th className="px-4 py-3 text-right">Nominal Masuk (In)</th>
                  <th className="px-4 py-3 text-right">Nominal Keluar (Out)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashFlowLedger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Belum ada transaksi kas pada periode ini.
                    </td>
                  </tr>
                ) : (
                  cashFlowLedger.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{item.tanggal}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            item.tipe === 'Masuk'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.tipe === 'Masuk' ? '↓ KAS MASUK' : '↑ KAS KELUAR'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.kategori}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{item.deskripsi}</td>
                      <td className="px-4 py-3 text-slate-600">{item.metode}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 font-['Outfit']">
                        {item.tipe === 'Masuk' ? formatRupiah(item.nominal) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-rose-600 font-['Outfit']">
                        {item.tipe === 'Keluar' ? formatRupiah(item.nominal) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 9: HUTANG SUPPLIER */}
      {activeTab === 'debts' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Outfit']">Buku Hutang Supplier</h2>
              <p className="text-xs text-slate-500">
                Kewajiban pembayaran pembelian bahan baku yang belum lunas. Total hutang berjalan:{' '}
                <strong className="text-rose-600">{formatRupiah(financialMetrics.totalHutangSupplier)}</strong>
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">No. PO / Tanggal</th>
                  <th className="px-4 py-3">Nama Supplier</th>
                  <th className="px-4 py-3">Bahan Pembelian</th>
                  <th className="px-4 py-3">Total Nilai Faktur</th>
                  <th className="px-4 py-3">Sudah Dibayar</th>
                  <th className="px-4 py-3">Sisa Hutang</th>
                  <th className="px-4 py-3">Metode & Catatan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.filter((p) => (p.sisa_hutang || 0) > 0).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      🎉 Selamat! Seluruh hutang pembelian bahan ke supplier telah LUNAS.
                    </td>
                  </tr>
                ) : (
                  purchases
                    .filter((p) => (p.sisa_hutang || 0) > 0)
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 block">{p.nomor_pembelian}</span>
                          <span className="text-[10px] text-slate-400">{p.tanggal}</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{p.supplier}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800">{p.nama_bahan}</span>
                          <span className="text-[10px] text-slate-500 block">
                            {p.qty} {p.satuan} @{formatRupiah(p.harga_satuan)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{formatRupiah(p.total)}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">
                          {formatRupiah(p.jumlah_dibayar || 0)}
                        </td>
                        <td className="px-4 py-3 font-extrabold text-rose-600 font-['Outfit'] text-sm">
                          {formatRupiah(p.sisa_hutang || 0)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-[11px]">
                          <span className="font-medium text-slate-800 block">{p.metode_pembayaran}</span>
                          {p.catatan && <span className="text-slate-400">{p.catatan}</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDebtPurchase(p);
                              setIsDebtModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            Bayar Hutang
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      <NewPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        availableStocks={stocks}
        userName={user?.name || 'Admin'}
        prefilledStock={prefilledStockForPurchase}
      />

      <RecordUsageModal
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
        availableStocks={stocks}
        orders={orders}
        userName={user?.name || 'Staff Produksi'}
      />

      <RecordProductionCostModal
        isOpen={isCostModalOpen}
        onClose={() => setIsCostModalOpen(false)}
        orders={orders}
        userName={user?.name || 'Staff Produksi'}
      />

      <NewExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        userName={user?.name || user?.email || 'Finance'}
        expenseToEdit={editingExpense}
      />

      {/* Modal Void / Batalkan Pengeluaran */}
      {voidingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 my-8">
            <div className="bg-gradient-to-r from-rose-900 to-red-950 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                  <Ban className="w-5 h-5 text-rose-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-['Outfit']">Batalkan Pengeluaran (Void)</h3>
                  <p className="text-xs text-rose-200">Nonaktifkan transaksi tanpa menghapus histori</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVoidingExpense(null)}
                className="text-rose-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-100 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Transaksi:</span>
                  <span className="font-bold text-slate-800">{voidingExpense.nomor_transaksi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal:</span>
                  <span className="font-semibold text-slate-700">{voidingExpense.tanggal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kategori:</span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-rose-200 text-rose-800 font-bold text-[11px]">
                    {voidingExpense.kategori}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deskripsi:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[200px] truncate">{voidingExpense.deskripsi}</span>
                </div>
                <div className="flex justify-between border-t border-rose-200/70 pt-2">
                  <span className="font-bold text-rose-900">Nominal:</span>
                  <span className="font-extrabold text-rose-600 text-sm font-['Outfit']">
                    {formatRupiah(voidingExpense.nominal)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 flex items-start gap-2.5 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Setelah di-void, nominal <strong>{formatRupiah(voidingExpense.nominal)}</strong> otomatis dikeluarkan dari Total Pengeluaran, Cash Out Arus Kas, dan Laba Bersih. Histori tetap tersimpan untuk audit.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Alasan Pembatalan / Void <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Contoh: Salah ketik nominal / Transaksi dibatalkan / Double input"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVoidingExpense(null)}
                  disabled={voidLoading}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVoid}
                  disabled={voidLoading || !voidReason.trim()}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs font-bold shadow-md shadow-rose-600/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <Ban className="w-4 h-4" />
                  <span>{voidLoading ? 'Menyimpan...' : 'Konfirmasi Void'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PaySupplierDebtModal
        isOpen={isDebtModalOpen}
        onClose={() => {
          setIsDebtModalOpen(false);
          setSelectedDebtPurchase(null);
        }}
        purchase={selectedDebtPurchase}
        userName={user?.name || 'Finance'}
      />

      <OrderHppDetailModal
        isOpen={isHppModalOpen}
        onClose={() => {
          setIsHppModalOpen(false);
          setSelectedHppOrder(null);
        }}
        order={selectedHppOrder}
        availableStocks={stocks}
        allUsages={usages}
        allCosts={productionCosts}
        userName={user?.name || 'Admin'}
      />

      <RecordCustomerPaymentModal
        isOpen={isCustPaymentModalOpen}
        onClose={() => {
          setIsCustPaymentModalOpen(false);
          setSelectedCustOrder(null);
        }}
        order={selectedCustOrder}
        userName={user?.name || 'Kasir'}
      />

      {/* Modal Tambah/Edit Stok Manual */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 my-8">
            <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
              <h3 className="text-base font-bold font-['Outfit']">
                {editingStock ? 'Edit Stok Bahan' : 'Tambah Bahan Baru ke Stok'}
              </h3>
              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveStock} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Bahan Baku</label>
                <input
                  type="text"
                  value={stockFormData.nama_bahan}
                  onChange={(e) => setStockFormData({ ...stockFormData, nama_bahan: e.target.value })}
                  placeholder="Contoh: Kaos Cotton Combed 30s Hitam"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={stockFormData.kategori}
                    onChange={(e) => setStockFormData({ ...stockFormData, kategori: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <option value="Kaos Polos">Kaos Polos</option>
                    <option value="Kain">Kain</option>
                    <option value="DTF / Film">DTF / Film</option>
                    <option value="Tinta & Kimia">Tinta & Kimia</option>
                    <option value="Kertas & Stiker">Kertas & Stiker</option>
                    <option value="Plastik & Packaging">Plastik & Packaging</option>
                    <option value="Bahan Percetakan">Bahan Percetakan</option>
                    <option value="Aksesoris & Finishing">Aksesoris & Finishing</option>
                    <option value="Bahan Lainnya">Bahan Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    value={stockFormData.satuan}
                    onChange={(e) => setStockFormData({ ...stockFormData, satuan: e.target.value })}
                    placeholder="Pcs / Roll / Kg"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stok Sisa</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={stockFormData.stok}
                    onChange={(e) => setStockFormData({ ...stockFormData, stok: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stok Minimum (Batas)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={stockFormData.stok_minimum}
                    onChange={(e) => setStockFormData({ ...stockFormData, stok_minimum: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Harga Modal Satuan (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={stockFormData.harga_modal}
                  onChange={(e) => setStockFormData({ ...stockFormData, harga_modal: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Terakhir</label>
                <input
                  type="text"
                  value={stockFormData.supplier_terakhir}
                  onChange={(e) => setStockFormData({ ...stockFormData, supplier_terakhir: e.target.value })}
                  placeholder="Contoh: PT Indo Kaos Polos Bandung"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
                />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {editingStock ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStockToDelete(editingStock);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Bahan</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsStockModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Simpan Stok
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Bahan Inventori */}
      {stockToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 font-['Outfit']">
                  Hapus Bahan dari Inventori?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Bahan baku ini akan dihapus dari daftar stok aktif gudang.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStockToDelete(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500">Nama Bahan:</span>
                <span className="font-bold text-slate-900 text-right">{stockToDelete.nama_bahan}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Kategori:</span>
                <span className="font-semibold text-slate-700">{stockToDelete.kategori}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Sisa Stok Terakhir:</span>
                <span className="font-bold text-slate-900">{stockToDelete.stok} {stockToDelete.satuan}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Harga Modal Satuan:</span>
                <span className="font-semibold text-slate-700">{formatRupiah(stockToDelete.harga_modal)} / {stockToDelete.satuan}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold">
                <span className="text-slate-700">Total Nilai Aset:</span>
                <span className="text-red-600 font-extrabold">{formatRupiah(stockToDelete.stok * stockToDelete.harga_modal)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px] leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Data riwayat pembelian & pemakaian terdahulu tetap aman tersimpan di pembukuan transaksi.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingStock}
                onClick={() => setStockToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingStock}
                onClick={confirmDeleteStock}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDeletingStock ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Bahan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Pembelian */}
      {purchaseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 font-['Outfit']">
                  Hapus Riwayat Pembelian?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Transaksi pembelian #{purchaseToDelete.nomor_pembelian} akan dihapus dari sistem.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPurchaseToDelete(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">No. Pembelian:</span>
                <span className="font-bold text-slate-900">{purchaseToDelete.nomor_pembelian}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Nama Bahan:</span>
                <span className="font-bold text-slate-900">{purchaseToDelete.nama_bahan}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Supplier:</span>
                <span className="font-semibold text-slate-700">{purchaseToDelete.supplier}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold">
                <span className="text-slate-700">Total Nominal:</span>
                <span className="text-red-600">{formatRupiah(purchaseToDelete.total)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingPurchase}
                onClick={() => setPurchaseToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingPurchase}
                onClick={confirmDeletePurchase}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDeletingPurchase ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Pengeluaran */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 font-['Outfit']">
                  Hapus Pengeluaran Permanen?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Transaksi pengeluaran #{expenseToDelete.nomor_transaksi} akan dihapus secara permanen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">No. Transaksi:</span>
                <span className="font-bold text-slate-900">{expenseToDelete.nomor_transaksi}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Kategori:</span>
                <span className="font-semibold text-slate-700">{expenseToDelete.kategori}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500">Deskripsi:</span>
                <span className="font-medium text-slate-800 text-right">{expenseToDelete.deskripsi}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold">
                <span className="text-slate-700">Nominal:</span>
                <span className="text-red-600">{formatRupiah(expenseToDelete.nominal)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingExpense}
                onClick={() => setExpenseToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingExpense}
                onClick={confirmDeleteExpense}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDeletingExpense ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Permanen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Reset Seluruh Data Keuangan */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-slate-900 font-['Outfit']">
                  Reset Semua Data Keuangan?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tindakan ini akan mengosongkan seluruh pembukuan keuangan dan inventori bahan baku untuk memulai pencatatan dari awal (Rp 0).
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isResetting && setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <p className="font-bold text-slate-800 mb-1">Modul & data yang akan direset:</p>
              <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                <li><strong className="text-slate-700">Pembelian Bahan Baku & Hutang:</strong> Seluruh riwayat PO dan pembayaran ke supplier.</li>
                <li><strong className="text-slate-700">Inventori Stok Gudang:</strong> Seluruh daftar stok bahan baku.</li>
                <li><strong className="text-slate-700">HPP & Biaya Modal Pesanan:</strong> Catatan pemakaian bahan dan biaya vendor pesanan.</li>
                <li><strong className="text-slate-700">Pengeluaran Operasional:</strong> Seluruh beban usaha/BOP aktif maupun void.</li>
                <li><strong className="text-slate-700">Kas & Pembayaran Pelanggan:</strong> Riwayat catatan uang masuk pembayaran faktur.</li>
              </ul>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px] leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong>Perhatian:</strong> Data transaksi keuangan yang direset tidak dapat dipulihkan kembali. Master pesanan utama Anda tetap utuh.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleExecuteReset}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-98 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-600/25 cursor-pointer disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Mereset Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Reset Bersih Data Keuangan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Finance User Guide Modal */}
      <FinanceGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      {/* Toast Feedback Notification */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-semibold ${
              feedbackToast.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : 'bg-red-600 text-white border-red-700'
            }`}
          >
            {feedbackToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
            )}
            <span>{feedbackToast.message}</span>
            <button
              type="button"
              onClick={() => setFeedbackToast(null)}
              className="ml-2 text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
