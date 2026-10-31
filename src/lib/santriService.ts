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
    const current = await this.getSantriById(id);
    const response = await api.put(`/santri/${id}`, { ...data, version: current?.version ?? 1 });
    if (response.data?.data) return { ...(current ?? {}), ...response.data.data, version: (current?.version ?? 1) + 1 } as Santri;
    return await this.getSantriById(id) as Santri;
  },

  async deleteSantri(id: string): Promise<void> {
    await api.delete(`/santri/${id}`);
  },

  async updateSantriStatus(ids: string[], status: 'Aktif' | 'Tidak Aktif'): Promise<void> {
    await Promise.all(ids.map(async (id) => {
      const current = await this.getSantriById(id);
      await api.put(`/santri/${id}`, { status, version: current?.version ?? 1 });
    }));
  },

  async deleteSantriBulk(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => api.delete(`/santri/${id}`)));
  },

  async updateSyahriyahStatusBulk(ids: string[], status: 'Normal' | 'Keringanan' | 'Bebas'): Promise<void> {
    await Promise.all(ids.map(async (id) => {
      const current = await this.getSantriById(id);
      await api.put(`/santri/${id}`, { status_syahriyah: status, version: current?.version ?? 1 });
    }));
  },

  async updateStatusPermanenBulk(
    ids: string[],
    statusSyahriyah: 'Normal' | 'Keringanan' | 'Bebas',
    statusKilatan: 'Normal' | 'Keringanan' | 'Bebas',
  ): Promise<void> {
    await api.put('/santri/status-permanen/bulk', {
      ids,
      status_syahriyah: statusSyahriyah,
      status_kilatan: statusKilatan,
    });
  },
};
