import {
  SyahriyahBulan,
  StatusSyahriyah,
  SyahriyahItemInput,
  SyahriyahTransaksiData,
  SyahriyahTransaksiRecord,
  SyahriyahWaiver,
} from '../types/syahriyah';
import { Santri } from '../types/santri';
import { santriService } from './santriService';
import { kasService } from './kasService';
import { waiverService } from './waiverService';
import { api } from './api';
import { isBeforeTanggalMasuk } from './formatter';

const STORAGE_KEY = 'al_hidayah_syahriyah';
const TRANSAKSI_KEY = 'al_hidayah_syahriyah_transaksi';

export function getTarifSyahriyah(kategori: string): number {
  switch (kategori) {
    case 'Mukim':
      return 150000;
    case 'Nduduk':
      return 100000;
    case 'Kilatan':
      return 75000;
    default:
      return 150000;
  }
}

function delay(ms = 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Generate realistic mock records per santri for a given year considering waivers
export function generateMockSyahriyah(
  santriId: string,
  kategori: string,
  tahun: number,
  statusSyahriyah: 'Normal' | 'Bebas' | 'Keringanan' = 'Normal',
  waivers: SyahriyahWaiver[] = []
): SyahriyahBulan[] {
  const baseTarif = getTarifSyahriyah(kategori);
  const result: SyahriyahBulan[] = [];
  const charCodeSum = santriId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  for (let bulan = 1; bulan <= 12; bulan++) {
    const waiver = waivers.find((w) => bulan >= w.bulan_mulai && bulan <= w.bulan_selesai);
    const effectiveStatus = waiver ? waiver.jenis : statusSyahriyah;

    if (effectiveStatus === 'Bebas') {
      result.push({
        tahun,
        bulan,
        nominal_tagihan: 0,
        total_dibayar: 0,
        status: 'Bebas',
      });
      continue;
    }

    let nominalTagihan = baseTarif;
    if (effectiveStatus === 'Keringanan') {
      nominalTagihan = Math.floor(baseTarif / 2);
    }

    if (tahun !== 2025) {
      result.push({
        tahun,
        bulan,
        nominal_tagihan: nominalTagihan,
        total_dibayar: 0,
        status: 'Belum',
      });
      continue;
    }

    const seed = (charCodeSum + bulan * 13) % 10;
    let status: StatusSyahriyah = 'Belum';
    let totalDibayar = 0;

    if (bulan <= 6) {
      if (seed < 8) {
        status = 'Lunas';
        totalDibayar = nominalTagihan;
      } else {
        status = 'Sebagian';
        totalDibayar = Math.floor(nominalTagihan / 2);
      }
    } else if (bulan <= 9) {
      if (seed < 5) {
        status = 'Lunas';
        totalDibayar = nominalTagihan;
      } else if (seed < 8) {
        status = 'Sebagian';
        totalDibayar = Math.floor(nominalTagihan / 2);
      } else {
        status = 'Belum';
        totalDibayar = 0;
      }
    } else {
      if (seed < 3) {
        status = 'Lunas';
        totalDibayar = nominalTagihan;
      } else if (seed < 6) {
        status = 'Sebagian';
        totalDibayar = Math.floor(nominalTagihan / 2);
      } else {
        status = 'Belum';
        totalDibayar = 0;
      }
    }

    result.push({
      tahun,
      bulan,
      nominal_tagihan: nominalTagihan,
      total_dibayar: totalDibayar,
      status,
    });
  }

  return result;
}

export const syahriyahService = {
  async getSyahriyahMatrix(tahun: number): Promise<{ santri: Santri; records: SyahriyahBulan[] }[]> {
    const santriList = await santriService.getSantriList();
    return Promise.all(santriList.map(async (santri) => {
      try {
        const response = await api.get(`/syahriyah/${santri.id}/${tahun}`);
        return { santri, records: response.data.data ?? [] };
      } catch (error) {
        console.warn(`Matriks syahriyah ${santri.nama} gagal dimuat.`, error);
        return { santri, records: [] };
      }
    }));
  },

  async simpanPembayaranSyahriyah(
    santriId: string,
    items: SyahriyahItemInput[],
    transaksiData: SyahriyahTransaksiData,
    idempotencyKey?: string,
  ): Promise<SyahriyahTransaksiRecord> {
    const response = await api.post(`/syahriyah/${santriId}/pembayaran`, {
      items,
      iuran_tambahan: transaksiData.iuran_tambahan || [],
      tanggal_bayar: transaksiData.tanggal_bayar,
      keterangan: transaksiData.keterangan,
    }, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined);
    const apiSantri = await santriService.getSantriById(santriId);
    if (!apiSantri) throw new Error('Data santri tidak ditemukan');
    const total = items.reduce((sum, item) => sum + item.nominal, 0)
      + (transaksiData.iuran_tambahan || []).reduce((sum, item) => sum + item.nominal, 0);
    return {
      id: response.data?.no_kwitansi || `syahriyah-${Date.now()}`,
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
