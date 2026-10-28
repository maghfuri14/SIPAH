export type StatusSyahriyah = 'Lunas' | 'Sebagian' | 'Belum';

export interface SyahriyahBulan {
  tahun: number;
  bulan: number; // 1-12
  nominal_tagihan: number;
  total_dibayar: number;
  status: StatusSyahriyah;
}

export interface SyahriyahItemInput {
  tahun: number;
  bulan: number;
  nominal: number;
  jenis: 'Penuh' | 'Sebagian';
}

export interface IuranTambahanInput {
  id: string;
  nama: string;
  nominal: number;
}

export interface SyahriyahTransaksiData {
  tanggal_bayar: string;
  metode: 'Tunai' | 'Transfer' | 'Lainnya';
  keterangan?: string;
  iuran_tambahan?: IuranTambahanInput[];
}

export interface SyahriyahTransaksiRecord {
  id: string;
  santri_id: string;
  santri_nama: string;
  santri_nis: string;
  items: SyahriyahItemInput[];
  transaksi_data: SyahriyahTransaksiData;
  total_pembayaran: number;
  created_at: string;
}
