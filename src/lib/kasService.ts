import { api } from './api';
import { Kas } from '../types/kas';

export const kasService = {
  async getKasList(): Promise<Kas[]> {
    const response = await api.get('/kas');
    return response.data.data ?? [];
  },

  async getKasById(id: string): Promise<Kas | null> {
    const list = await this.getKasList();
    return list.find((item) => item.id === id) ?? null;
  },

  async createKas(data: Omit<Kas, 'id' | 'created_at'>): Promise<Kas> {
    const response = await api.post('/kas', data);
    return response.data.data;
  },

  async updateKas(id: string, data: Partial<Omit<Kas, 'id' | 'created_at'>>): Promise<Kas> {
    const response = await api.put(`/kas/${id}`, data);
    if (response.data?.data) return response.data.data as Kas;
    const current = await this.getKasById(id);
    if (current) return current;
    return { id, ...data } as Kas;
  },

  async deleteKas(id: string): Promise<void> {
    await api.delete(`/kas/${id}`);
  },

  async deleteKasBulk(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => api.delete(`/kas/${id}`)));
  },
};
