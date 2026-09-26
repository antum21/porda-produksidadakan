import React, { useState, useEffect } from 'react';
import { PrintIsInvoice } from '../components/PrintIsInvoice';
import { OrderItem } from '../types';
import { subscribeOrders } from '../services/dbService';
import { FileText, ArrowLeft, RotateCcw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export const InvoicePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('orderId');

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeOrders((orderList) => {
      setOrders(orderList);
      if (orderIdFromUrl) {
        const found = orderList.find((o) => o.id === orderIdFromUrl);
        if (found) setSelectedOrder(found);
      }
    });
    return () => unsubscribe();
  }, [orderIdFromUrl]);

  const handleSelectOrder = (orderId: string) => {
    if (!orderId) {
      setSelectedOrder(null);
    } else {
      const found = orders.find((o) => o.id === orderId);
      setSelectedOrder(found || null);
    }
    setKey((prev) => prev + 1);
  };

  const handleReset = () => {
    setSelectedOrder(null);
    setKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#F8F5F2] text-slate-800 flex flex-col items-center py-6 px-3 sm:px-6 print:p-0 print:bg-white">
      {/* Top Header Navigation Bar */}
      <div className="w-full max-w-4xl mb-4 bg-slate-900 text-white p-3 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3 px-4 print:hidden border border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to="/orders"
            className="flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Pesanan</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E63946]" />
            <span className="text-sm font-bold text-white tracking-tight font-['Outfit']">
              Faktur Invoice Porda
            </span>
          </div>
        </div>

        {/* Quick Order Picker */}
        <div className="flex items-center gap-2">
          {orders.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/80 hidden sm:inline">Muat Pesanan:</span>
              <select
                value={selectedOrder?.id || ''}
                onChange={(e) => handleSelectOrder(e.target.value)}
                className="bg-slate-800 text-white text-xs border border-white/20 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#E63946]"
              >
                <option value="" className="text-slate-800">
                  -- Faktur Kosong Baru --
                </option>
                {orders.map((ord) => (
                  <option key={ord.id} value={ord.id} className="text-slate-800">
                    {ord.invoice_no || ord.id} - {ord.nama_klien}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleReset}
            title="Reset ke Template Kosong"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all text-xs flex items-center gap-1.5 font-medium cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Faktur Baru</span>
          </button>
        </div>
      </div>

      {/* Main Invoice Card Component */}
      <div className="w-full max-w-4xl flex justify-center">
        <PrintIsInvoice
          key={key}
          order={selectedOrder}
          showModalControls={true}
          onOrderUpdated={(updated) => {
            if (selectedOrder) {
              setSelectedOrder({ ...selectedOrder, ...updated });
            }
          }}
        />
      </div>
    </div>
  );
};
