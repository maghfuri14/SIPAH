export interface SyahriyahWaiver {
  id: string;
  santri_id: string;
  tahun: number;
  bulan_mulai: number; // 1-12
  bulan_selesai: number; // 1-12
  jenis: 'Bebas' | 'Keringanan'; // Bebas (gratis) atau Keringanan (sebagian 50%)
  keterangan?: string;
  created_at: string;
}

const STORAGE_KEY = 'al_hidayah_syahriyah_waivers';

export const waiverService = {
  getWaivers(): SyahriyahWaiver[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  getWaiversForSantri(santriId: string): SyahriyahWaiver[] {
    return this.getWaivers().filter((w) => w.santri_id === santriId);
  },

  addWaiver(waiver: Omit<SyahriyahWaiver, 'id' | 'created_at'>): SyahriyahWaiver {
    const list = this.getWaivers();
    const newWaiver: SyahriyahWaiver = {
      ...waiver,
      id: 'w_' + Date.now(),
      created_at: new Date().toISOString(),
    };
    list.push(newWaiver);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return newWaiver;
  },

  deleteWaiver(id: string): void {
    const list = this.getWaivers().filter((w) => w.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  },
};
