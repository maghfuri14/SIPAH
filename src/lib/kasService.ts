import { Kas } from '../types/kas';

const STORAGE_KEY = 'al_hidayah_kas';

const today = new Date();
const yearMonth = today.toISOString().substring(0, 7); // e.g. "2026-10"

const MOCK_KAS: Kas[] = [
  {
    id: 'k1',
    tanggal: `${yearMonth}-01`,
    jenis: 'Pemasukan',
    kategori_nama: 'Donasi',
    nominal: 1000000,
    keterangan: 'Donasi harian hamba Allah untuk pondok',
    created_at: `${yearMonth}-01T08:00:00Z`,
  },
  {
    id: 'k2',
    tanggal: `${yearMonth}-03`,
    jenis: 'Pengeluaran',
    kategori_nama: 'Listrik',
    nominal: 350000,
    keterangan: 'Pembayaran tagihan listrik PLN bulan ini',
    created_at: `${yearMonth}-03T10:00:00Z`,
  },
  {
    id: 'k3',
    tanggal: `${yearMonth}-05`,
    jenis: 'Pemasukan',
    kategori_nama: 'Donasi',
    nominal: 3500000,
    keterangan: 'Infaq dari donatur utama pondok',
    created_at: `${yearMonth}-05T09:30:00Z`,
  },
  {
    id: 'k4',
    tanggal: `${yearMonth}-08`,
    jenis: 'Pengeluaran',
    kategori_nama: 'ATK',
    nominal: 150000,
    keterangan: 'Pembelian kertas HVS, spidol, dan alat tulis kantor',
    created_at: `${yearMonth}-08T11:00:00Z`,
  },
  {
    id: 'k5',
    tanggal: `${yearMonth}-10`,
    jenis: 'Pemasukan',
    kategori_nama: 'Lainnya',
    nominal: 750000,
    keterangan: 'Hasil penjualan bazar kewirausahaan santri',
    created_at: `${yearMonth}-10T14:15:00Z`,
  },
  {
    id: 'k6',
    tanggal: `${yearMonth}-12`,
    jenis: 'Pengeluaran',
    kategori_nama: 'Konsumsi',
    nominal: 400000,
    keterangan: 'Konsumsi pengajian bulanan dan ustadz pengajar',
    created_at: `${yearMonth}-12T16:00:00Z`,
  },
  {
    id: 'k7',
    tanggal: `${yearMonth}-15`,
    jenis: 'Pemasukan',
    kategori_nama: 'Donasi',
    nominal: 2000000,
    keterangan: 'Sumbangan pembangunan dari alumni pondok',
    created_at: `${yearMonth}-15T09:00:00Z`,
  },
  {
    id: 'k8',
    tanggal: `${yearMonth}-18`,
    jenis: 'Pengeluaran',
    kategori_nama: 'Perbaikan',
    nominal: 250000,
    keterangan: 'Perbaikan instalasi pompa air di asrama mukim',
    created_at: `${yearMonth}-18T13:30:00Z`,
  },
  {
    id: 'k9',
    tanggal: `${yearMonth}-22`,
    jenis: 'Pemasukan',
    kategori_nama: 'Donasi',
    nominal: 1500000,
    keterangan: 'Zakat mal dari jamaah pengajian',
    created_at: `${yearMonth}-22T10:00:00Z`,
  },
  {
    id: 'k10',
    tanggal: `${yearMonth}-25`,
    jenis: 'Pengeluaran',
    kategori_nama: 'Lainnya',
    nominal: 100000,
    keterangan: 'Iuran kebersihan lingkungan dan tempat sampah',
    created_at: `${yearMonth}-25T08:30:00Z`,
  },
];

function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStoredKas(): Kas[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_KAS));
      return MOCK_KAS;
    }
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_KAS));
    return MOCK_KAS;
  }
}

function saveKasList(list: Kas[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const kasService = {
  async getKasList(): Promise<Kas[]> {
    await delay(300);
    return getStoredKas();
  },

  async getKasById(id: string): Promise<Kas | null> {
    await delay(200);
    const list = getStoredKas();
    return list.find((k) => k.id === id) || null;
  },

  async createKas(data: Omit<Kas, 'id' | 'created_at'>): Promise<Kas> {
    await delay(300);
    const list = getStoredKas();
    const newKas: Kas = {
      ...data,
      id: 'k' + Date.now(),
      created_at: new Date().toISOString(),
    };
    const updatedList = [newKas, ...list];
    saveKasList(updatedList);
    return newKas;
  },

  async updateKas(id: string, data: Partial<Omit<Kas, 'id' | 'created_at'>>): Promise<Kas> {
    await delay(300);
    const list = getStoredKas();
    const index = list.findIndex((k) => k.id === id);
    if (index === -1) {
      throw new Error('Data transaksi kas tidak ditemukan');
    }

    const updatedKas = {
      ...list[index],
      ...data,
    };

    list[index] = updatedKas;
    saveKasList(list);
    return updatedKas;
  },

  async deleteKas(id: string): Promise<void> {
    await delay(300);
    const list = getStoredKas();
    const filtered = list.filter((k) => k.id !== id);
    saveKasList(filtered);
  },
};
