import type { Signal } from "@/lib/contracts/score";

/**
 * Marketplace Agent — fake sellers and off-platform payment.
 *
 * Domains and typosquats belong to the Link Agent; this module deliberately
 * does not re-run them. "New account / no badge / no address" cannot be seen
 * in a pasted message, so it is not detected here — the gap is stated rather
 * than faked.
 */

const SHOP_CONTEXT =
  /\b(?:jual|dijual|harga|murah|beli|barang|toko|seller|penjual|pembeli|ongkir|paket|kiriman|stok|pre\s*order|dp|cod|marketplace|shopee|tokopedia|lazada|bukalapak|blibli|tiktok\s*shop|refund|pengembalian\s+dana|qris)\b/i;

const PAID_ON_PLATFORM =
  /\b(?:shopee|tokopedia|lazada|bukalapak|blibli|tiktok\s*shop)\b[^.!?]{0,60}\b(?:dibayar|bayar|checkout|pesanan|pesan)\b|\b(?:dibayar|bayar|checkout|pesanan|pesan)\b[^.!?]{0,60}\b(?:shopee|tokopedia|lazada|bukalapak|blibli|tiktok\s*shop)\b/i;

interface ShopRule {
  id: string;
  weight: number;
  label: string;
  pattern: RegExp;
}

const SHOP_RULES: readonly ShopRule[] = [
  {
    id: "mkt-offplatform",
    weight: 0.7,
    label: "Mengajak bayar di luar marketplace, ke rekening pribadi penjual",
    pattern:
      /\b(?:jangan|tidak)\s+(?:lewat|via|di)\s+(?:shopee|tokopedia|lazada|bukalapak|blibli|tiktok\s*shop|marketplace|aplikasi)\b|\bayar\s+di\s+luar\s+(?:marketplace|aplikasi)\b|\btransaksi\s+di\s+luar\s+(?:marketplace|aplikasi)\b/i,
  },
  {
    id: "mkt-personal-rail",
    weight: 0.6,
    label:
      "Pembayaran ke dompet digital/nama pribadi, bukan rekening toko resmi",
    pattern:
      /\b(?:dana|ovo|gopay|shopeepay|linkaja)\b[^.!?]{0,40}\b(?:transfer|bayar|kirim)\b|\ba\.n\.?\s+[A-Z][a-z]+\b/i,
  },
  {
    id: "mkt-giftcard-crypto",
    weight: 0.7,
    label:
      "Meminta gift card atau kripto — pembayaran yang tidak bisa ditarik kembali",
    pattern:
      /\b(?:gift\s*card|voucher\s+google\s+play|bitcoin|usdt|crypto|kripto)\b/i,
  },
  {
    id: "mkt-qris-refund",
    weight: 0.7,
    label:
      "Trik 'refund' lewat QRIS — pembayaran keluar, bukan dana yang kembali",
    pattern:
      /\b(?:refund|pengembalian\s+dana|pembatalan)\b[^.!?]{0,60}\b(?:scan|qris|qr)\b|\bqris\b[^.!?]{0,60}\b(?:refund|pengembalian)\b/i,
  },
  {
    id: "mkt-underprice",
    weight: 0.35,
    label: "Harga jauh di bawah pasaran — umpan yang lazim pada toko palsu",
    pattern:
      /\b(?:harga|murah)\b[^.!?]{0,30}\b(?:\d{2}\s*%|di\s+bawah\s+pasaran)\b/i,
  },
  {
    id: "mkt-dp",
    weight: 0.45,
    label: "Meminta DP/uang muka lewat transfer sebelum barang dikirim",
    pattern:
      /\b(?:dp|uang\s+muka|booking\s+fee)\b[^.!?]{0,20}\b(?:\d{1,3}\s*%|rp\s*\d+)\b[^.!?]{0,30}\b(?:transfer|bayar)\b/i,
  },
  {
    id: "mkt-fake-resi",
    weight: 0.35,
    label: "Nomor resi tidak bisa dilacak — bukti kirim yang tidak nyata",
    pattern:
      /\b(?:resi|nomor\s+kirim)\b[^.!?]{0,40}\b(?:belum|tidak\s+bisa\s+dilacak|tidak\s+valid)\b/i,
  },
  {
    id: "mkt-urgency",
    weight: 0.3,
    label: "Menekan dengan sisa stok/waktu agar pembeli segera transfer",
    pattern:
      /\b(?:sisa\s+\d+|terakhir|hari\s+ini)\b[^.!?]{0,40}\b(?:transfer|bayar)\b/i,
  },
];

export interface MarketplaceResult {
  signals: Signal[];
  note?: string;
}

export function marketplaceSignals(text: string): MarketplaceResult {
  if (!SHOP_CONTEXT.test(text)) {
    return { signals: [], note: "Bukan percakapan jual-beli." };
  }
  if (PAID_ON_PLATFORM.test(text)) {
    return { signals: [] };
  }

  const signals: Signal[] = [];
  for (const rule of SHOP_RULES) {
    const match = text.match(rule.pattern);
    if (match) {
      signals.push({
        label: rule.label,
        weight: rule.weight,
        evidence: match[0].trim(),
        agent: "marketplace",
      });
    }
  }
  return { signals };
}
