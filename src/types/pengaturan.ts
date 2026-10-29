export interface ProfilPondok {
  nama_pondok: string;
  alamat: string;
  pengasuh: string;
  ketua: string;
  bendahara: string;
}

export interface TarifDefault {
  syahriyah_mukim: number;
  syahriyah_nduduk: number;
  syahriyah_kilatan: number;
  event_kilatan: number;
}

export type UserRole = 'super_admin' | 'admin' | 'pemilik';
export type UserStatus = 'Aktif' | 'Nonaktif';

export interface UserAccount {
  id: string;
  nama: string;
  username: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
}
