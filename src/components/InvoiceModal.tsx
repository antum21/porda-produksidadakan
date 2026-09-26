import React, { useEffect } from 'react';
import { OrderItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { PrintIsInvoice } from './PrintIsInvoice';

interface InvoiceModalProps {
  order: OrderItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated?: (updated: Partial<OrderItem>) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="invoice-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-[#4B5563]/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static"
        onClick={onClose}
      >
        <motion.div
          id="invoice-modal-card"
          initial={{ opacity: 0, scale: 0.97, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          className="w-full max-w-4xl my-auto py-2 flex flex-col items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <PrintIsInvoice
            order={order}
            onClose={onClose}
            onOrderUpdated={onOrderUpdated}
            showModalControls={true}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
