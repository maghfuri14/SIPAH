export type StatusPendaftaran = 'Baru' | 'Diterima' | 'Ditolak' | 'Menjadi Santri';

export interface Pendaftaran {
  id: string;
  nama_calon: string;
  nama_wali: string;
  no_hp_santri: string;
  no_hp_wali: string;
  kategori: 'Mukim' | 'Nduduk' | 'Kilatan';
  tanggal_pendaftaran: string; // YYYY-MM-DD
  status: StatusPendaftaran;
  nis_generated?: string; // Diisi saat konversi
  santri_id?: string;     // ID santri setelah konversi
  catatan?: string;
  created_at: string;
}
