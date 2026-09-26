import { InvoiceTableRow, OrderItem } from '../types';

export interface ThermalReceiptData {
  order: OrderItem | null;
  items: InvoiceTableRow[];
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  namaPelanggan: string;
  noHp: string;
  alamat: string;
  totalAmount: number;
  minDpAmount: number;
}

const STORAGE_KEY = 'printis_thermal_receipt_payload';

/**
 * Saves receipt data to localStorage and opens the dedicated 80mm thermal receipt
 * HTML page in a new tab.
 */
export function openThermalReceiptInNewTab(data: ThermalReceiptData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save receipt data to localStorage', err);
  }

  const queryParams = new URLSearchParams();
  if (data.order?.id) queryParams.set('orderId', data.order.id);
  if (data.invoiceNo) queryParams.set('inv', data.invoiceNo);
  queryParams.set('autoPrint', '1');

  const targetUrl = `/print/receipt?${queryParams.toString()}`;

  // Try opening via window.open
  const newWin = window.open(targetUrl, '_blank');

  // Fallback if popup was blocked by browser sandbox
  if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
    const link = document.createElement('a');
    link.href = targetUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Retrieves the stored thermal receipt data from localStorage.
 */
export function getStoredThermalReceiptData(): ThermalReceiptData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as ThermalReceiptData;
    }
  } catch (err) {
    console.error('Failed to read thermal receipt data from localStorage', err);
  }
  return null;
}

/**
 * Generates plain text receipt format suitable for clipboard copying
 * or Bluetooth ESC/POS raw printing.
 */
export function generateThermalReceiptText(data: ThermalReceiptData): string {
  const {
    order,
    items,
    invoiceNo,
    invoiceDate,
    dueDate,
    namaPelanggan,
    noHp,
    alamat,
    totalAmount,
    minDpAmount,
  } = data;

  const formatRupiah = (num: number) => {
    return `Rp ${new Intl.NumberFormat('id-ID').format(Math.max(0, Math.round(num)))}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const totalPcs = items.reduce((sum, it) => sum + (it.qty || 0), 0);
  const dpPaid = typeof order?.nominal_dp === 'number' ? order.nominal_dp : (minDpAmount || 0);
  const remaining = Math.max(0, totalAmount - dpPaid);

  let paymentStatus = 'MENUNGGU PEMBAYARAN';
  if (dpPaid >= totalAmount && totalAmount > 0) {
    paymentStatus = 'LUNAS (100%)';
  } else if (dpPaid >= totalAmount * 0.7) {
    paymentStatus = `DP DITERIMA (${Math.round((dpPaid / totalAmount) * 100)}%)`;
  } else if (dpPaid > 0) {
    paymentStatus = `DP SEBAGIAN`;
  }

  return `
========================================
       PORDA PRODUKSI DADAKAN    
    Apparel, Sablon DTF & Percetakan 
          Telp/WA: 0812-3456-7890       
========================================
No. Faktur : ${invoiceNo || '-'}
Tanggal    : ${formatDateDisplay(invoiceDate)}
Jatuh Tempo: ${formatDateDisplay(dueDate)}
Pelanggan  : ${namaPelanggan || '-'}
No. Telp   : ${noHp || '-'}
Alamat     : ${alamat || '-'}
----------------------------------------
ITEM              QTY   HARGA      TOTAL
----------------------------------------
${items
  .map(
    (it) =>
      `${it.deskripsi}\n                  ${it.qty} x ${formatRupiah(it.harga_satuan)}  ${formatRupiah(
        it.harga_satuan * it.qty
      )}`
  )
  .join('\n')}
----------------------------------------
Total Qty (Pcs) : ${totalPcs} pcs
----------------------------------------
TOTAL TAGIHAN   : ${formatRupiah(totalAmount)}
DP Diterima     : ${formatRupiah(dpPaid)}
Sisa Pelunasan  : ${formatRupiah(remaining)}
Status Bayar    : [${paymentStatus}]
========================================
METODE PEMBAYARAN:
Transfer Bank BCA
No. Rek : 649 602 7721
A.N     : Ahmad Quantum Khairil Nikmat
========================================
          *** TERIMA KASIH ***          
  Barang yang sudah dipesan / diproduksi
   tidak dapat dibatalkan atau ditukar. 
  Simpan struk ini sbg bukti pembayaran.
========================================`.trim();
}

/**
 * In-page print fallback using hidden iframe.
 */
export function printThermal80mm(elementId = 'printable-thermal-receipt') {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  let iframe = document.getElementById('thermal-print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Struk Thermal 80mm - Porda</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, monospace, 'Lucida Console', Monaco;
            font-size: 10.5px;
            line-height: 1.3;
            width: 80mm;
            max-width: 80mm;
          }
          body {
            padding: 3mm 2.5mm;
          }
          img, svg { display: none !important; }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Iframe print error, falling back to window.print():', err);
      window.print();
    }
  }, 250);
}
