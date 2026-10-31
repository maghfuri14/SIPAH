import { api } from './api';
import { Pendaftaran, StatusPendaftaran } from '../types/pendaftaran';

export const pendaftaranService = {
  async getPendaftaranList(): Promise<Pendaftaran[]> {
    const response = await api.get('/pendaftaran');
    return response.data.data ?? [];
  },

  async getPendaftaranById(id: string): Promise<Pendaftaran | null> {
    const list = await this.getPendaftaranList();
    return list.find((item) => item.id === id) ?? null;
  },

  async createPendaftaran(data: Omit<Pendaftaran, 'id' | 'status' | 'created_at'>): Promise<Pendaftaran> {
    const response = await api.post('/pendaftaran', data);
    return response.data.data;
  },

  async updateStatusPendaftaran(id: string, status: StatusPendaftaran): Promise<Pendaftaran> {
    await api.put(`/pendaftaran/${id}/status`, { status });
    return await this.getPendaftaranById(id) as Pendaftaran;
  },

  async deletePendaftaran(id: string): Promise<void> {
    await api.delete(`/pendaftaran/${id}`);
  },

  async deletePendaftaranBulk(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => api.delete(`/pendaftaran/${id}`)));
  },
};
