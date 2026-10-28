import {
  SyahriyahBulan,
  StatusSyahriyah,
  SyahriyahItemInput,
  SyahriyahTransaksiData,
  SyahriyahTransaksiRecord,
} from '../types/syahriyah';
import { Santri } from '../types/santri';
import { santriService } from './santriService';
import { kasService } from './kasService';

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

// Generate realistic mock records per santri for a given year
export function generateMockSyahriyah(
  santriId: string,
  kategori: string,
  tahun: number
): SyahriyahBulan[] {
  const nominalTagihan = getTarifSyahriyah(kategori);
  const result: SyahriyahBulan[] = [];

  const charCodeSum = santriId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  for (let bulan = 1; bulan <= 12; bulan++) {
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

function getStoredMatrixData(): Record<string, Record<number, SyahriyahBulan[]>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveMatrixData(data: Record<string, Record<number, SyahriyahBulan[]>>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getStoredTransaksiData(): SyahriyahTransaksiRecord[] {
  try {
    const raw = localStorage.getItem(TRANSAKSI_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveTransaksiData(list: SyahriyahTransaksiRecord[]): void {
  localStorage.setItem(TRANSAKSI_KEY, JSON.stringify(list));
}

export const syahriyahService = {
  async getSyahriyahMatrix(tahun: number): Promise<{ santri: Santri; records: SyahriyahBulan[] }[]> {
    await delay(200);
    const santriList = await santriService.getSantriList();
    const stored = getStoredMatrixData();

    const matrix = santriList.map((s) => {
      let records: SyahriyahBulan[];
      if (stored[s.id] && stored[s.id][tahun]) {
        records = stored[s.id][tahun];
      } else {
        records = generateMockSyahriyah(s.id, s.kategori, tahun);
        if (!stored[s.id]) stored[s.id] = {};
        stored[s.id][tahun] = records;
      }
      return {
        santri: s,
        records,
      };
    });

    saveMatrixData(stored);
    return matrix;
  },

  async simpanPembayaranSyahriyah(
    santriId: string,
    items: SyahriyahItemInput[],
    transaksiData: SyahriyahTransaksiData
  ): Promise<SyahriyahTransaksiRecord> {
    await delay(300);

    const santriList = await santriService.getSantriList();
    const santri = santriList.find((s) => s.id === santriId);
    if (!santri) {
      throw new Error('Data santri tidak ditemukan');
    }

    const storedMatrix = getStoredMatrixData();
    if (!storedMatrix[santriId]) {
      storedMatrix[santriId] = {};
    }

    // 1. Update Syahriyah matrix records for selected items
    items.forEach((item) => {
      let yearRecords = storedMatrix[santriId][item.tahun];
      if (!yearRecords) {
        yearRecords = generateMockSyahriyah(santriId, santri.kategori, item.tahun);
      }

      const index = yearRecords.findIndex((r) => r.bulan === item.bulan);
      if (index !== -1) {
        const currentRecord = yearRecords[index];
        const newTotalDibayar = currentRecord.total_dibayar + item.nominal;
        let newStatus: StatusSyahriyah = 'Belum';

        if (newTotalDibayar >= currentRecord.nominal_tagihan) {
          newStatus = 'Lunas';
        } else if (newTotalDibayar > 0) {
          newStatus = 'Sebagian';
        }

        yearRecords[index] = {
          ...currentRecord,
          total_dibayar: newTotalDibayar,
          status: newStatus,
        };
      }
      storedMatrix[santriId][item.tahun] = yearRecords;
    });

    saveMatrixData(storedMatrix);

    // 2. Calculate Total Payment
    const totalItems = items.reduce((sum, i) => sum + i.nominal, 0);
    const totalIuranLain = (transaksiData.iuran_tambahan || []).reduce(
      (sum, i) => sum + i.nominal,
      0
    );
    const totalPembayaran = totalItems + totalIuranLain;

    // 3. Save receipt transaction to localStorage
    const newRecord: SyahriyahTransaksiRecord = {
      id: 'st_' + Date.now(),
      santri_id: santri.id,
      santri_nama: santri.nama,
      santri_nis: santri.nis,
      items,
      transaksi_data: transaksiData,
      total_pembayaran: totalPembayaran,
      created_at: new Date().toISOString(),
    };

    const storedTransaksi = getStoredTransaksiData();
    saveTransaksiData([newRecord, ...storedTransaksi]);

    // 4. (PENTING): Automatically create income entry in Buku Kas
    const bulanNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Ags',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    const bulanSummary = items
      .map((it) => `${bulanNames[it.bulan - 1]} ${it.tahun}`)
      .join(', ');

    let kasKeterangan = `Syahriyah ${santri.nama} (${bulanSummary})`;
    if (transaksiData.iuran_tambahan && transaksiData.iuran_tambahan.length > 0) {
      const iuranStr = transaksiData.iuran_tambahan.map((i) => i.nama).join(', ');
      kasKeterangan += ` + ${iuranStr}`;
    }
    if (transaksiData.keterangan?.trim()) {
      kasKeterangan += ` (${transaksiData.keterangan.trim()})`;
    }

    await kasService.createKas({
      jenis: 'Pemasukan',
      kategori_nama: 'Syahriyah',
      tanggal: transaksiData.tanggal_bayar,
      nominal: totalPembayaran,
      keterangan: kasKeterangan,
    });

    return newRecord;
  },
};
