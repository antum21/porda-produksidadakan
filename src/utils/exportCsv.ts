import { OrderItem } from '../types';

export const exportOrdersToCsv = (orders: OrderItem[]) => {
  if (!orders || orders.length === 0) {
    alert('Tidak ada data pesanan untuk diekspor.');
    return;
  }

  const headers = [
    'No Invoice',
    'Tanggal Order',
    'Nama Klien',
    'No Telepon',
    'Jenis Cetak',
    'Bahan Apparel',
    'Warna Bahan',
    'Jumlah Pcs',
    'Rincian Size',
    'Total Tagihan (Rp)',
    'Nominal DP (Rp)',
    'Sisa Pelunasan (Rp)',
    'Status Order',
    'Target Deadline',
    'Catatan',
  ];

  const rows = orders.map((o) => {
    const sizeBreakdown = o.rincian_ukuran
      ? Object.entries(o.rincian_ukuran)
          .filter(([_, qty]) => Number(qty) > 0)
          .map(([sz, qty]) => `${sz}:${qty}`)
          .join(' | ')
      : '';
    const sisa = Math.max(0, (o.total_harga || 0) - (o.nominal_dp || 0));

    return [
      `"${o.invoice_no || o.id}"`,
      `"${new Date(o.created_at).toLocaleDateString('id-ID')}"`,
      `"${(o.nama_klien || '').replace(/"/g, '""')}"`,
      `"${o.no_telepon || ''}"`,
      `"${o.jenis_cetak}"`,
      `"${o.bahan_apparel}"`,
      `"${o.warna_bahan}"`,
      o.jumlah_pcs,
      `"${sizeBreakdown}"`,
      o.total_harga,
      o.nominal_dp,
      sisa,
      `"${o.status}"`,
      `"${new Date(o.deadline).toLocaleDateString('id-ID')}"`,
      `"${(o.catatan || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  // Include UTF-8 BOM for Microsoft Excel compatibility
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Rekap_Pesanan_Porda_${new Date().toISOString().split('T')[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
