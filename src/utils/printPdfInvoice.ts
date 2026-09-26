import { OrderItem } from '../types';

export interface PdfInvoicePayload {
  order: OrderItem | null;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  namaPelanggan: string;
  noHp: string;
  alamat: string;
  totalAmount: number;
  dpAmount: number;
  sisaPelunasan: number;
}

const STORAGE_KEY = 'porda_pdf_invoice_payload';

/**
 * Saves invoice data to localStorage and opens the dedicated PDF invoice
 * printable page in a new tab.
 */
export function openPdfInvoiceInNewTab(data: PdfInvoicePayload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save PDF invoice data to localStorage', err);
  }

  const queryParams = new URLSearchParams();
  if (data.order?.id) queryParams.set('orderId', data.order.id);
  if (data.invoiceNo) queryParams.set('inv', data.invoiceNo);
  queryParams.set('autoPrint', '1');

  const targetUrl = `/print/invoice?${queryParams.toString()}`;

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
 * Retrieves the stored PDF invoice data from localStorage.
 */
export function getStoredPdfInvoiceData(): PdfInvoicePayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as PdfInvoicePayload;
    }
  } catch (err) {
    console.error('Failed to read PDF invoice data from localStorage', err);
  }
  return null;
}
