export type JenisKas = 'Pemasukan' | 'Pengeluaran';

export interface Kas {
  id: string;
  tanggal: string; // YYYY-MM-DD
  jenis: JenisKas;
  kategori_nama: string; // Contoh: Listrik, Donasi, ATK, Konsumsi, Perbaikan, Lainnya
  nominal: number;
  keterangan?: string;
  created_at: string;
}
