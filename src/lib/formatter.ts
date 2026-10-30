export function formatRupiah(angka: number): string {
  if (isNaN(angka)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(angka);
}

export function formatThousand(val: number | string): string {
  if (val === '' || val === null || val === undefined) return '';
  const numStr = val.toString().replace(/\D/g, '');
  if (!numStr) return '';
  return new Intl.NumberFormat('id-ID').format(parseInt(numStr, 10));
}

export function parseThousand(val: string): number {
  const clean = val.replace(/\D/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

export function isBeforeTanggalMasuk(tanggalMasuk: string | undefined, tahun: number, bulan: number): boolean {
  if (!tanggalMasuk) return false;
  const parts = tanggalMasuk.split('-').map(Number);
  if (parts.length < 2) return false;
  const [mYear, mMonth] = parts;
  if (tahun < mYear) return true;
  if (tahun === mYear && bulan < mMonth) return true;
  return false;
}

export const KILATAN_MONTH_MAP: Record<string, number> = {
  'Jumadil Ula': 5,
  'Maulid': 3,
  'Romadhon': 9,
  'Dzulhijjah': 12,
};

export function isKilatanBeforeTanggalMasuk(tanggalMasuk: string | undefined, tahun: number, event: string): boolean {
  if (!tanggalMasuk) return false;
  const parts = tanggalMasuk.split('-').map(Number);
  if (parts.length < 2) return false;
  const [mYear, mMonth] = parts;
  const evMonth = KILATAN_MONTH_MAP[event] || 1;
  if (tahun < mYear) return true;
  if (tahun === mYear && evMonth < mMonth) return true;
  return false;
}

