export type JenisWaiver = 'Bebas' | 'Keringanan Sebagian' | 'Keringanan Custom';

export interface PotonganWaiver {
  label: string; // mis. "Potongan Administrasi"
  nominal: number; // potongan per bulan dalam Rupiah (> 0)
}

export interface SyahriyahWaiver {
  id: string;
  santri_id: string;
  tahun: number;
  bulan_mulai: number; // 1-12
  bulan_selesai: number; // 1-12
  jenis: JenisWaiver; // Bebas (gratis), Keringanan Sebagian (50%), atau Keringanan Custom (potongan itemisasi)
  potongan?: PotonganWaiver[]; // hanya untuk jenis 'Keringanan Custom'
  keterangan?: string;
  created_at: string;
}

// Status global pada data santri yang berlaku sepanjang tahun bila tidak ada periode waiver.
export const GLOBAL_STATUS_LABEL: Record<string, string> = {
  Normal: 'Syahriyah Normal',
  Bebas: 'Bebas Se-full (Satu Tahun Penuh)',
  Keringanan: 'Keringanan Se-full (Satu Tahun Penuh)',
};

const STORAGE_KEY = 'al_hidayah_syahriyah_waivers';

export function isBebasWaiver(w: Pick<SyahriyahWaiver, 'jenis'>): boolean {
  return w.jenis === 'Bebas';
}

export function getWaiverJenisLabel(w: SyahriyahWaiver): string {
  if (w.jenis === 'Bebas') return 'Bebas Syahriyah (Gratis)';
  if (w.jenis === 'Keringanan Custom') {
    const total = (w.potongan || []).reduce((sum, p) => sum + (p.nominal || 0), 0);
    return `Keringanan Custom (-Rp ${total.toLocaleString('id-ID')}/bln)`;
  }
  return 'Keringanan Sebagian (50%)';
}

export function normalizeWaiver(w: SyahriyahWaiver): SyahriyahWaiver {
  // Migrasi data lama: nilai 'Keringanan' berubah nama menjadi 'Keringanan Sebagian'.
  if ((w.jenis as string) === 'Keringanan') {
    return { ...w, jenis: 'Keringanan Sebagian' };
  }
  return w;
}

export const waiverService = {
  getWaivers(): SyahriyahWaiver[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const list: SyahriyahWaiver[] = JSON.parse(raw);
      return list.map(normalizeWaiver);
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
