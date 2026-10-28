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

function getStoredMatrixData(): Record<string, Record<number, KilatanEvent[]>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveMatrixData(data: Record<string, Record<number, KilatanEvent[]>>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getStoredTransaksiData(): KilatanTransaksiRecord[] {
  try {
    const raw = localStorage.getItem(TRANSAKSI_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveTransaksiData(list: KilatanTransaksiRecord[]): void {
  localStorage.setItem(TRANSAKSI_KEY, JSON.stringify(list));
}

export const kilatanService = {
  async getKilatanMatrix(tahun: number): Promise<{ santri: Santri; records: KilatanEvent[] }[]> {
    await delay(200);
    const santriList = await santriService.getSantriList();
    const stored = getStoredMatrixData();

    const matrix = santriList.map((s) => {
      let records: KilatanEvent[];
      if (stored[s.id] && stored[s.id][tahun]) {
        records = stored[s.id][tahun];
      } else {
        records = generateMockKilatan(s.id, tahun);
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

  async simpanPembayaranKilatan(
    santriId: string,
    items: KilatanItemInput[],
    transaksiData: KilatanTransaksiData
  ): Promise<KilatanTransaksiRecord> {
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

    // 1. Update Kilatan matrix records for selected items
    items.forEach((item) => {
      let yearRecords = storedMatrix[santriId][item.tahun];
      if (!yearRecords) {
        yearRecords = generateMockKilatan(santriId, item.tahun);
      }

      const index = yearRecords.findIndex((r) => r.event === item.event);
      if (index !== -1) {
        const currentRecord = yearRecords[index];
        const newTotalDibayar = currentRecord.total_dibayar + item.nominal;
        let newStatus: StatusKilatan = 'Belum';

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
    const newRecord: KilatanTransaksiRecord = {
      id: 'kt_' + Date.now(),
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
    const eventSummary = items
      .map((it) => `${it.event} ${it.tahun}`)
      .join(', ');

    let kasKeterangan = `Iuran Kilatan ${santri.nama} (${eventSummary})`;
    if (transaksiData.iuran_tambahan && transaksiData.iuran_tambahan.length > 0) {
      const iuranStr = transaksiData.iuran_tambahan.map((i) => i.nama).join(', ');
      kasKeterangan += ` + ${iuranStr}`;
    }
    if (transaksiData.keterangan?.trim()) {
      kasKeterangan += ` (${transaksiData.keterangan.trim()})`;
    }

    await kasService.createKas({
      jenis: 'Pemasukan',
      kategori_nama: 'Kilatan',
      tanggal: transaksiData.tanggal_bayar,
      nominal: totalPembayaran,
      keterangan: kasKeterangan,
    });

    return newRecord;
  },
};
