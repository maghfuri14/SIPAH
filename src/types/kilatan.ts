export type EventKilatan = 'Jumadil Ula' | 'Maulid' | 'Romadhon' | 'Dzulhijjah';
export type StatusKilatan = 'Lunas' | 'Sebagian' | 'Belum';

export interface KilatanEvent {
  tahun: number;
  event: EventKilatan;
  nominal_tagihan: number;
  total_dibayar: number;
  status: StatusKilatan;
}

export interface KilatanItemInput {
  tahun: number;
  event: EventKilatan;
  nominal: number;
  jenis: 'Penuh' | 'Sebagian';
}

export interface KilatanIuranTambahanInput {
  id: string;
  nama: string;
  nominal: number;
}

export interface KilatanTransaksiData {
  tanggal_bayar: string;
  metode: 'Tunai' | 'Transfer' | 'Lainnya';
  keterangan?: string;
  iuran_tambahan?: KilatanIuranTambahanInput[];
}

export interface KilatanTransaksiRecord {
  id: string;
  santri_id: string;
  santri_nama: string;
  santri_nis: string;
  items: KilatanItemInput[];
  transaksi_data: KilatanTransaksiData;
  total_pembayaran: number;
  created_at: string;
}
