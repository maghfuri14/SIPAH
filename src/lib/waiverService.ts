import { api } from './api';

export interface SyahriyahWaiver {
  id: string;
  santri_id: string;
  tahun: number;
  bulan_mulai: number;
  bulan_selesai: number;
  jenis: 'Bebas' | 'Keringanan';
  keterangan?: string;
  created_at: string;
}

export const waiverService = {
  async getWaiversForSantri(santriId: string): Promise<SyahriyahWaiver[]> {
    const response = await api.get(`/santri/${santriId}/keringanan`);
    return response.data.data;
  },

  async getPaidMonths(santriId: string, tahun: number): Promise<number[]> {
    const response = await api.get(`/santri/${santriId}/keringanan/paid-months/${tahun}`);
    return response.data.data;
  },

  async addWaiver(waiver: Omit<SyahriyahWaiver, 'id' | 'created_at'>): Promise<SyahriyahWaiver> {
    const response = await api.post(`/santri/${waiver.santri_id}/keringanan`, waiver);
    return response.data.data;
  },

  async deleteWaiver(id: string): Promise<void> {
    await api.delete(`/santri/keringanan/${id}`);
  },
};
