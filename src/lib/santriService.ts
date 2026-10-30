import { Santri } from '../types/santri';
import { INITIAL_MOCK_SANTRI } from './mockSantri';

const STORAGE_KEY = 'al_hidayah_santri';

function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStoredSantri(): Santri[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_SANTRI));
      return INITIAL_MOCK_SANTRI;
    }
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_SANTRI));
    return INITIAL_MOCK_SANTRI;
  }
}

function saveSantriList(list: Santri[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const santriService = {
  async getSantriList(): Promise<Santri[]> {
    await delay(300);
    return getStoredSantri();
  },

  async getSantriById(id: string): Promise<Santri | null> {
    await delay(200);
    const list = getStoredSantri();
    const found = list.find((s) => s.id === id);
    return found || null;
  },

  async checkNisUnik(nis: string, excludeId?: string): Promise<boolean> {
    await delay(100);
    const list = getStoredSantri();
    const existing = list.find(
      (s) => s.nis.trim().toLowerCase() === nis.trim().toLowerCase() && s.id !== excludeId
    );
    return !existing;
  },

  async createSantri(data: Omit<Santri, 'id' | 'created_at' | 'updated_at'>): Promise<Santri> {
    await delay(300);
    const list = getStoredSantri();

    // Check NIS uniqueness
    const isUnik = list.every((s) => s.nis.trim().toLowerCase() !== data.nis.trim().toLowerCase());
    if (!isUnik) {
      throw new Error('NIS sudah digunakan');
    }

    const now = new Date().toISOString();
    const newSantri: Santri = {
      ...data,
      id: 's' + Date.now(),
      created_at: now,
      updated_at: now,
    };

    const updatedList = [newSantri, ...list];
    saveSantriList(updatedList);
    return newSantri;
  },

  async updateSantri(
    id: string,
    data: Partial<Omit<Santri, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Santri> {
    await delay(300);
    const list = getStoredSantri();
    const index = list.findIndex((s) => s.id === id);

    if (index === -1) {
      throw new Error('Data santri tidak ditemukan');
    }

    // Check NIS uniqueness if NIS is being updated
    if (data.nis) {
      const isUnik = list.every(
        (s) => s.id === id || s.nis.trim().toLowerCase() !== data.nis!.trim().toLowerCase()
      );
      if (!isUnik) {
        throw new Error('NIS sudah digunakan');
      }
    }

    const updatedSantri: Santri = {
      ...list[index],
      ...data,
      updated_at: new Date().toISOString(),
    };

    list[index] = updatedSantri;
    saveSantriList(list);
    return updatedSantri;
  },

  async deleteSantri(id: string): Promise<void> {
    await delay(300);
    const list = getStoredSantri();
    const filtered = list.filter((s) => s.id !== id);
    saveSantriList(filtered);
  },

  async updateSantriStatus(ids: string[], status: 'Aktif' | 'Tidak Aktif'): Promise<void> {
    await delay(300);
    const list = getStoredSantri();
    const selectedIds = new Set(ids);
    const now = new Date().toISOString();
    const updatedList = list.map((s) =>
      selectedIds.has(s.id) ? { ...s, status, updated_at: now } : s
    );
    saveSantriList(updatedList);
  },

  async deleteSantriBulk(ids: string[]): Promise<void> {
    await delay(300);
    const list = getStoredSantri();
    const selectedIds = new Set(ids);
    saveSantriList(list.filter((s) => !selectedIds.has(s.id)));
  },

  async updateSyahriyahStatusBulk(
    ids: string[],
    status: 'Normal' | 'Keringanan' | 'Bebas'
  ): Promise<void> {
    await delay(300);
    const list = getStoredSantri();
    const selectedIds = new Set(ids);
    const now = new Date().toISOString();
    saveSantriList(list.map((s) =>
      selectedIds.has(s.id) ? { ...s, status_syahriyah: status, updated_at: now } : s
    ));
  },
};
