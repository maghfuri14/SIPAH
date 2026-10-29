export type KategoriSantri = 'Mukim' | 'Nduduk' | 'Kilatan';
export type StatusSantri = 'Aktif' | 'Tidak Aktif';
export type StatusSyahriyahSantri = 'Normal' | 'Bebas' | 'Keringanan';

export interface Santri {
  id: string;
  nis: string;
  nama: string;
  nama_wali: string;
  no_hp_santri: string;
  no_hp_wali: string;
  kategori: KategoriSantri;
  status: StatusSantri;
  status_syahriyah?: StatusSyahriyahSantri;
  tanggal_masuk: string;  // ISO date 'YYYY-MM-DD'
  foto?: string;          // URL atau base64
  catatan?: string;
  created_at: string;
  updated_at: string;
}
