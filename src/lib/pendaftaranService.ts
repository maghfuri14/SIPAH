import { Pendaftaran, StatusPendaftaran } from '../types/pendaftaran';
import { Santri } from '../types/santri';
import { santriService } from './santriService';

const STORAGE_KEY = 'al_hidayah_pendaftaran';

const MOCK_PENDAFTARAN: Pendaftaran[] = [
  {
    id: 'p1',
    nama_calon: 'Hadi Wijaya',
    nama_wali: 'Suwito',
    no_hp_santri: '081398765001',
    no_hp_wali: '081398766001',
    kategori: 'Mukim',
    tanggal_pendaftaran: '2025-02-10',
    status: 'Baru',
    catatan: 'Ingin mendaftar program tahfidz',
    created_at: '2025-02-10T09:00:00Z',
  },
  {
    id: 'p2',
    nama_calon: 'Ilham Ramadhan',
    nama_wali: 'Muzakki',
    no_hp_santri: '081398765002',
    no_hp_wali: '081398766002',
    kategori: 'Nduduk',
    tanggal_pendaftaran: '2025-02-12',
    status: 'Diterima',
    catatan: 'Berkas administrasi lengkap',
    created_at: '2025-02-12T10:30:00Z',
  },
  {
    id: 'p3',
    nama_calon: 'Jafar Shodiq',
    nama_wali: 'Usman',
    no_hp_santri: '081398765003',
    no_hp_wali: '081398766003',
    kategori: 'Mukim',
    tanggal_pendaftaran: '2025-02-14',
    status: 'Baru',
    created_at: '2025-02-14T11:15:00Z',
  },
  {
    id: 'p4',
    nama_calon: 'Karisma Putra',
    nama_wali: 'Kustono',
    no_hp_santri: '081398765004',
    no_hp_wali: '081398766004',
    kategori: 'Kilatan',
    tanggal_pendaftaran: '2025-02-15',
    status: 'Ditolak',
    catatan: 'Usia belum memenuhi syarat minimal program kilatan',
    created_at: '2025-02-15T14:00:00Z',
  },
  {
    id: 'p5',
    nama_calon: 'Luqman Nur',
    nama_wali: 'Nasir',
    no_hp_santri: '081398765005',
    no_hp_wali: '081398766005',
    kategori: 'Nduduk',
    tanggal_pendaftaran: '2025-02-01',
    status: 'Diterima',
    created_at: '2025-02-01T08:00:00Z',
  },
];

function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStoredPendaftaran(): Pendaftaran[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_PENDAFTARAN));
      return MOCK_PENDAFTARAN;
    }
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_PENDAFTARAN));
    return MOCK_PENDAFTARAN;
  }
}

function savePendaftaranList(list: Pendaftaran[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const pendaftaranService = {
  async getPendaftaranList(): Promise<Pendaftaran[]> {
    await delay(300);
    return getStoredPendaftaran();
  },

  async createPendaftaran(
    data: Omit<Pendaftaran, 'id' | 'status' | 'created_at'>
  ): Promise<Pendaftaran> {
    await delay(300);
    const list = getStoredPendaftaran();
    const newPendaftaran: Pendaftaran = {
      ...data,
      id: 'p' + Date.now(),
      status: 'Baru',
      created_at: new Date().toISOString(),
    };
    const updatedList = [newPendaftaran, ...list];
    savePendaftaranList(updatedList);
    return newPendaftaran;
  },

  async updateStatusPendaftaran(id: string, status: StatusPendaftaran): Promise<Pendaftaran> {
    await delay(300);
    const list = getStoredPendaftaran();
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error('Data pendaftaran tidak ditemukan');
    }

    list[index] = {
      ...list[index],
      status,
    };

    savePendaftaranList(list);
    return list[index];
  },

  async konversiKeSantri(
    id: string,
    nis: string,
    tanggal_masuk: string
  ): Promise<{ pendaftaran: Pendaftaran; santri: Santri }> {
    await delay(300);
    const list = getStoredPendaftaran();
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error('Data pendaftaran tidak ditemukan');
    }

    const item = list[index];

    // Create new santri using santriService
    const newSantri = await santriService.createSantri({
      nis,
      nama: item.nama_calon,
      nama_wali: item.nama_wali,
      no_hp_santri: item.no_hp_santri,
      no_hp_wali: item.no_hp_wali,
      kategori: item.kategori,
      status: 'Aktif',
      status_syahriyah: 'Normal',
      tanggal_masuk,
      catatan: item.catatan ? `(Dari Pendaftaran) ${item.catatan}` : 'Dikonversi dari Pendaftaran Santri',
    });

    // Update pendaftaran item
    const updatedPendaftaran: Pendaftaran = {
      ...item,
      status: 'Menjadi Santri',
      nis_generated: nis,
      santri_id: newSantri.id,
    };

    list[index] = updatedPendaftaran;
    savePendaftaranList(list);

    return { pendaftaran: updatedPendaftaran, santri: newSantri };
  },

  async generateAutoNis(): Promise<string> {
    const santriList = await santriService.getSantriList();
    const currentYear = new Date().getFullYear().toString();
    
    // Find highest numerical NIS with current year prefix
    let maxSequence = 30;
    santriList.forEach((s) => {
      if (s.nis.startsWith(currentYear)) {
        const seqNum = parseInt(s.nis.substring(currentYear.length), 10);
        if (!isNaN(seqNum) && seqNum > maxSequence) {
          maxSequence = seqNum;
        }
      }
    });

    const nextSeq = (maxSequence + 1).toString().padStart(3, '0');
    return `${currentYear}${nextSeq}`;
  },
};
