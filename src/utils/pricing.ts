import { ApparelOrderItemRow, ApparelDesignCard } from '../types';

/**
 * Mendapatkan biaya tambahan per ukuran (ukuran di atas XL bertambah kelipatan +5.000):
 * - S, M, L, XL: +0
 * - 2XL: +5.000
 * - 3XL: +10.000
 * - 4XL: +15.000
 * - Ukuran lain di atas 4XL jika ada: +5.000 per level
 */
export function getSizeExtraCharge(size: string): number {
  const normalized = (size || '').trim().toUpperCase();
  if (normalized === '2XL' || normalized === 'XXL') return 5000;
  if (normalized === '3XL' || normalized === 'XXXL') return 10000;
  if (normalized === '4XL' || normalized === 'XXXXL') return 15000;
  if (normalized === '5XL') return 20000;
  return 0;
}

/**
 * Menghitung total harga efektif sablon per pcs (setelah diskon sablon).
 * Diskon diperbolehkan bernilai minus (diskon minus = mark-up / charge tambahan).
 */
export function calculateEffectiveSablonPrice(item: ApparelOrderItemRow): number {
  const rawSablonPrice = (item.sablon_list || []).reduce(
    (sum, s) => sum + (Number(s?.harga) || 0),
    0
  );
  // Diskon sablon boleh minus (misal -5000 berarti ada biaya tambahan 5000)
  const diskon = Number(item.diskon_sablon) || 0;
  return rawSablonPrice - diskon;
}

/**
 * Menghitung harga satuan per ukuran untuk item apparel tertentu.
 * Rumus: (harga_satuan_dasar + extra_ukuran) + (sablon_total - diskon_sablon)
 */
export function calculateUnitPriceForSize(
  item: ApparelOrderItemRow,
  size: string
): number {
  const basePrice = Number(item.harga_satuan) || 0;
  const extraSize = getSizeExtraCharge(size);
  const effectiveSablon = calculateEffectiveSablonPrice(item);
  return basePrice + extraSize + effectiveSablon;
}

/**
 * Menghitung subtotal untuk 1 baris ApparelOrderItemRow dengan variasi ukuran dan diskon minus.
 */
export function calculateApparelItemSubtotal(item: ApparelOrderItemRow): {
  totalPcs: number;
  subtotal: number;
  effectiveSablonPrice: number;
} {
  const effectiveSablonPrice = calculateEffectiveSablonPrice(item);
  let totalPcs = 0;
  let subtotal = 0;

  if (item.sizes) {
    Object.entries(item.sizes).forEach(([sizeKey, sizeVal]) => {
      const qty = Number(sizeVal) || 0;
      if (qty > 0) {
        totalPcs += qty;
        const unitPriceForThisSize = calculateUnitPriceForSize(item, sizeKey);
        subtotal += unitPriceForThisSize * qty;
      }
    });
  }

  return { totalPcs, subtotal, effectiveSablonPrice };
}

/**
 * Menghitung total harga keseluruhan dari array ApparelDesignCard.
 */
export function calculateDesignsGrandTotal(designs: ApparelDesignCard[]): {
  totalPcs: number;
  totalHarga: number;
} {
  let totalPcs = 0;
  let totalHarga = 0;

  (designs || []).forEach((des) => {
    (des.items || []).forEach((it) => {
      const res = calculateApparelItemSubtotal(it);
      totalPcs += res.totalPcs;
      totalHarga += res.subtotal;
    });
  });

  return { totalPcs, totalHarga };
}
