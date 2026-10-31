import { api } from './api';
import { Santri } from '../types/santri';

export const santriService = {
  async getSantriList(): Promise<Santri[]> {
    const response = await api.get('/santri');
    return response.data.data ?? [];
  },

  async getSantriById(id: string): Promise<Santri | null> {
    try {
      const response = await api.get(`/santri/${id}`);
      return response.data.data ?? null;
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  async checkNisUnik(nis: string, excludeId?: string): Promise<boolean> {
    const list = await this.getSantriList();
    return list.every((santri) =>
      santri.id === excludeId ||
      santri.nis.trim().toLowerCase() !== nis.trim().toLowerCase());
  },

  async createSantri(data: Omit<Santri, 'id' | 'created_at' | 'updated_at'>): Promise<Santri> {
    const response = await api.post('/santri', data);
    return response.data.data;
  },

  async updateSantri(id: string, data: Partial<Omit<Santri, 'id' | 'created_at' | 'updated_at'>>): Promise<Santri> {
    await api.put(`/santri/${id}`, data);
    return await this.getSantriById(id) as Santri;
  },

  async deleteSantri(id: string): Promise<void> {
    await api.delete(`/santri/${id}`);
  },

  async updateSantriStatus(ids: string[], status: 'Aktif' | 'Tidak Aktif'): Promise<void> {
    await Promise.all(ids.map((id) => api.put(`/santri/${id}`, { status })));
  },

  async deleteSantriBulk(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => api.delete(`/santri/${id}`)));
  },

  async updateSyahriyahStatusBulk(ids: string[], status: 'Normal' | 'Keringanan' | 'Bebas'): Promise<void> {
    await Promise.all(ids.map((id) => api.put(`/santri/${id}`, { status_syahriyah: status })));
  },
};
