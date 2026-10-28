import { kasService } from './kasService';
import { santriService } from './santriService';
import { pendaftaranService } from './pendaftaranService';
import { syahriyahService } from './syahriyahService';
import { Kas } from '../types/kas';
import { Santri } from '../types/santri';
import { Pendaftaran } from '../types/pendaftaran';
import { formatRupiah } from './formatter';

export interface LaporanKeuanganData {
  list: Kas[];
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoBersih: number;
}

export interface LaporanSyahriyahRow {
  santriId: string;
  nis: string;
  nama: string;
  kategori: string;
  totalTagihan: number;
  totalDibayar: number;
  sisaTunggakan: number;
  statusTahunan: 'Lunas' | 'Sebagian' | 'Belum';
}

export const laporanService = {
  async getLaporanKeuangan(
    tahun: number,
    bulan: string,
    jenis: string
  ): Promise<LaporanKeuanganData> {
    const kasList = await kasService.getKasList();

    const filtered = kasList.filter((item) => {
      // Check year
      if (item.tanggal) {
        const itemYear = new Date(item.tanggal).getFullYear();
        if (itemYear !== tahun) return false;
      }

      // Check month
      if (bulan !== 'Semua') {
        const itemMonth = (new Date(item.tanggal).getMonth() + 1).toString();
        if (itemMonth !== bulan) return false;
      }

      // Check jenis
      if (jenis !== 'Semua' && item.jenis !== jenis) {
        return false;
      }

      return true;
    });

    const totalPemasukan = filtered
      .filter((k) => k.jenis === 'Pemasukan')
      .reduce((sum, k) => sum + k.nominal, 0);

    const totalPengeluaran = filtered
      .filter((k) => k.jenis === 'Pengeluaran')
      .reduce((sum, k) => sum + k.nominal, 0);

    const saldoBersih = totalPemasukan - totalPengeluaran;

    return {
      list: filtered,
      totalPemasukan,
      totalPengeluaran,
      saldoBersih,
    };
  },

  async getLaporanSantri(kategori: string, status: string): Promise<Santri[]> {
    const list = await santriService.getSantriList();

    return list.filter((s) => {
      if (kategori !== 'Semua' && s.kategori !== kategori) return false;
      if (status !== 'Semua' && s.status !== status) return false;
      return true;
    });
  },

  async getLaporanPendaftaran(
    tahun: number,
    bulan: string,
    status: string
  ): Promise<Pendaftaran[]> {
    const list = await pendaftaranService.getPendaftaranList();

    return list.filter((item) => {
      if (item.tanggal_pendaftaran) {
        const itemYear = new Date(item.tanggal_pendaftaran).getFullYear();
        if (itemYear !== tahun) return false;
      }

      if (bulan !== 'Semua') {
        const itemMonth = (new Date(item.tanggal_pendaftaran).getMonth() + 1).toString();
        if (itemMonth !== bulan) return false;
      }

      if (status !== 'Semua' && item.status !== status) {
        return false;
      }

      return true;
    });
  },

  async getLaporanSyahriyah(
    tahun: number,
    kategori: string
  ): Promise<LaporanSyahriyahRow[]> {
    const matrix = await syahriyahService.getSyahriyahMatrix(tahun);

    return matrix
      .filter(({ santri }) => {
        if (kategori !== 'Semua' && santri.kategori !== kategori) return false;
        return true;
      })
      .map(({ santri, records }) => {
        const totalTagihan = records.reduce((sum, r) => sum + r.nominal_tagihan, 0);
        const totalDibayar = records.reduce((sum, r) => sum + r.total_dibayar, 0);
        const sisaTunggakan = Math.max(0, totalTagihan - totalDibayar);

        let statusTahunan: 'Lunas' | 'Sebagian' | 'Belum' = 'Belum';
        if (sisaTunggakan === 0 && totalDibayar > 0) {
          statusTahunan = 'Lunas';
        } else if (totalDibayar > 0) {
          statusTahunan = 'Sebagian';
        }

        return {
          santriId: santri.id,
          nis: santri.nis,
          nama: santri.nama,
          kategori: santri.kategori,
          totalTagihan,
          totalDibayar,
          sisaTunggakan,
          statusTahunan,
        };
      });
  },
};
