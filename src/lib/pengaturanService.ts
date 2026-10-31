import { ProfilPondok, TarifDefault, UserAccount } from '../types/pengaturan';
import { syahriyahService } from './syahriyahService';
import { api } from './api';

export const DEFAULT_PROFIL: ProfilPondok = {
  nama_pondok: 'Pondok Al Hidayah Tertek',
  alamat: 'Jln. Mayor Bismo No 71-73 Tertek Pare Kediri',
  pengasuh: 'KH. Mujtaba Thoifur',
  ketua: 'Muhammad Maghfuri',
  bendahara: 'Shofil Mubarok',
};

export const DEFAULT_TARIF: TarifDefault = {
  syahriyah_mukim: 0,
  syahriyah_nduduk: 0,
  syahriyah_kilatan: 0,
  event_kilatan: 0,
};

export const DEFAULT_USERS: UserAccount[] = [];

export const pengaturanService = {
  // PROFIL PONDOK
  getProfil(): ProfilPondok {
    return DEFAULT_PROFIL;
  },

  async fetchProfil(): Promise<ProfilPondok> {
    const response = await api.get('/pengaturan/profil');
    return response.data.data ?? DEFAULT_PROFIL;
  },

  async saveProfil(profil: ProfilPondok): Promise<void> {
    await api.put('/pengaturan/profil', profil);
  },

  // TARIF DEFAULT
  getTarif(): TarifDefault {
    return DEFAULT_TARIF;
  },

  async fetchTarif(): Promise<TarifDefault> {
    const response = await api.get('/pengaturan/tarif');
    return response.data.data ?? DEFAULT_TARIF;
  },

  async saveTarif(tarif: TarifDefault): Promise<void> {
    await api.put('/pengaturan/tarif', tarif);
  },

  async getPaidMonths(tahun: number): Promise<number[]> {
    try {
      const matrix = await syahriyahService.getSyahriyahMatrix(tahun);
      const paidSet = new Set<number>();
      for (const item of matrix) {
        if (item.records) {
          for (const rec of item.records) {
            if (rec.total_dibayar && rec.total_dibayar > 0) {
              paidSet.add(rec.bulan);
            }
          }
        }
      }
      return Array.from(paidSet).sort((a, b) => a - b);
    } catch {
      return [];
    }
  },

  async validateAndSaveTarif(
    tarif: TarifDefault,
    bulan_efektif: number,
    tahun_efektif: number
  ): Promise<void> {
    const paidMonths = await this.getPaidMonths(tahun_efektif);
    if (paidMonths.includes(bulan_efektif)) {
      throw new Error(
        'Gagal! Sudah ada pembayaran di bulan tersebut. Batalkan (Void) pembayaran terlebih dahulu.'
      );
    }
    await api.put('/pengaturan/tarif', {
      ...tarif,
      bulan_efektif,
      tahun_efektif,
    });
  },

  // MANAJEMEN PENGGUNA
  getUsers(): UserAccount[] {
    return [];
  },

  async fetchUsers(): Promise<UserAccount[]> {
    const response = await api.get('/auth/users');
    return response.data.data ?? [];
  },

  async addUser(user: Omit<UserAccount, 'id'>): Promise<UserAccount> {
    const response = await api.post('/auth/users', user);
    return response.data.data;
  },

  async updateUser(id: string, updated: Partial<UserAccount>): Promise<void> {
    await api.put(`/auth/users/${id}`, updated);
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/auth/users/${id}`);
  },
};
