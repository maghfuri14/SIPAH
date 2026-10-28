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
