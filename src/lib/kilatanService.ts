import {
  KilatanEvent,
  EventKilatan,
  StatusKilatan,
  KilatanItemInput,
  KilatanTransaksiData,
  KilatanTransaksiRecord,
} from '../types/kilatan';
import { Santri } from '../types/santri';
import { santriService } from './santriService';
import { kasService } from './kasService';
import { isKilatanBeforeTanggalMasuk } from './formatter';
import { api } from './api';

const STORAGE_KEY = 'al_hidayah_kilatan';
const TRANSAKSI_KEY = 'al_hidayah_kilatan_transaksi';

export const KILATAN_EVENTS: EventKilatan[] = [
  'Jumadil Ula',
  'Maulid',
  'Romadhon',
  'Dzulhijjah',
];

export const DEFAULT_KILATAN_TARIF = 50000;

function delay(ms = 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generate mock records per santri for a given year
export function generateMockKilatan(santriId: string, tahun: number): KilatanEvent[] {
  const result: KilatanEvent[] = [];
  const charCodeSum = santriId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  KILATAN_EVENTS.forEach((event, idx) => {
    if (tahun !== 2025) {
      result.push({
        tahun,
        event,
        nominal_tagihan: DEFAULT_KILATAN_TARIF,
        total_dibayar: 0,
        status: 'Belum',
      });
      return;
    }

    // For 2025:
    const seed = (charCodeSum + idx * 17) % 10;
    let status: StatusKilatan = 'Belum';
    let totalDibayar = 0;

    if (idx <= 1) {
      // First 2 events: mostly Lunas
      if (seed < 7) {
        status = 'Lunas';
        totalDibayar = DEFAULT_KILATAN_TARIF;
      } else if (seed < 9) {
        status = 'Sebagian';
        totalDibayar = 25000;
      } else {
        status = 'Belum';
        totalDibayar = 0;
      }
    } else {
      // Later events
      if (seed < 4) {
        status = 'Lunas';
        totalDibayar = DEFAULT_KILATAN_TARIF;
      } else if (seed < 7) {
        status = 'Sebagian';
        totalDibayar = 25000;
      } else {
        status = 'Belum';
        totalDibayar = 0;
      }
    }

    result.push({
      tahun,
      event,
      nominal_tagihan: DEFAULT_KILATAN_TARIF,
      total_dibayar: totalDibayar,
      status,
    });
  });

  return result;
}

export const kilatanService = {
  async getKilatanMatrix(tahun: number): Promise<{ santri: Santri; records: KilatanEvent[] }[]> {
    const santriList = await santriService.getSantriList();
    return Promise.all(santriList.map(async (santri) => {
      try {
        const response = await api.get(`/kilatan/${santri.id}/${tahun}`);
        return { santri, records: response.data.data ?? [] };
      } catch (error) {
        console.warn(`Matriks kilatan ${santri.nama} gagal dimuat.`, error);
        return { santri, records: [] };
      }
    }));
  },

  async simpanPembayaranKilatan(
    santriId: string,
    items: KilatanItemInput[],
    transaksiData: KilatanTransaksiData
  ): Promise<KilatanTransaksiRecord> {
    const response = await api.post(`/kilatan/${santriId}/pembayaran`, {
      items,
      iuran_tambahan: transaksiData.iuran_tambahan || [],
      tanggal_bayar: transaksiData.tanggal_bayar,
      keterangan: transaksiData.keterangan,
    });
    const apiSantri = await santriService.getSantriById(santriId);
    if (!apiSantri) throw new Error('Data santri tidak ditemukan');
    const total = items.reduce((sum, item) => sum + item.nominal, 0)
      + (transaksiData.iuran_tambahan || []).reduce((sum, item) => sum + item.nominal, 0);
    return {
      id: response.data?.no_kwitansi || `kilatan-${Date.now()}`,
      santri_id: santriId,
      santri_nama: apiSantri.nama,
      santri_nis: apiSantri.nis,
      items,
      transaksi_data: transaksiData,
      total_pembayaran: total,
      created_at: new Date().toISOString(),
    };
  },
};
