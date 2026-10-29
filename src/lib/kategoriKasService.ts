import { KATEGORI_PEMASUKAN, KATEGORI_PENGELUARAN } from './constants';

export const STORAGE_KEY_KATEGORI_KAS = 'al_hidayah_kategori_kas';

export interface KategoriKasConfig {
  pemasukan: string[];
  pengeluaran: string[];
}

/**
 * Nilai fallback (default) agar dropdown kategori tidak kosong/error
 * saat localStorage belum berisi data.
 */
export const DEFAULT_KATEGORI_KAS: KategoriKasConfig = {
  pemasukan: [...KATEGORI_PEMASUKAN],
  pengeluaran: [...KATEGORI_PENGELUARAN],
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '') : [];

/**
 * Membaca konfigurasi kategori kas dari localStorage ('al_hidayah_kategori_kas').
 * - Jika key belum ada / kosong / tidak valid JSON -> kembalikan default & simpan ke localStorage.
 * - Jika salah satu array (pemasukan/pengeluaran) kosong -> gunakan default untuk bagian tersebut.
 */
export const getKategoriKas = (): KategoriKasConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_KATEGORI_KAS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_KATEGORI_KAS, JSON.stringify(DEFAULT_KATEGORI_KAS));
      return { ...DEFAULT_KATEGORI_KAS };
    }
    const parsed = JSON.parse(raw);
    const result: KategoriKasConfig = {
      pemasukan: toStringArray(parsed?.pemasukan),
      pengeluaran: toStringArray(parsed?.pengeluaran),
    };
    if (result.pemasukan.length === 0) result.pemasukan = [...DEFAULT_KATEGORI_KAS.pemasukan];
    if (result.pengeluaran.length === 0) result.pengeluaran = [...DEFAULT_KATEGORI_KAS.pengeluaran];
    return result;
  } catch {
    return { ...DEFAULT_KATEGORI_KAS };
  }
};

/**
 * Mengambil daftar kategori sesuai jenis transaksi kas.
 */
export const getKategoriByJenis = (jenis: 'Pemasukan' | 'Pengeluaran'): string[] => {
  const config = getKategoriKas();
  return jenis === 'Pemasukan' ? config.pemasukan : config.pengeluaran;
};
