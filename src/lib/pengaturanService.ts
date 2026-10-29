import { ProfilPondok, TarifDefault, UserAccount } from '../types/pengaturan';

const KEY_PROFIL = 'al_hidayah_profil';
const KEY_TARIF = 'al_hidayah_tarif';
const KEY_USERS = 'al_hidayah_users';

export const DEFAULT_PROFIL: ProfilPondok = {
  nama_pondok: 'Pondok Al Hidayah Tertek',
  alamat: 'Jln. Mayor Bismo No 71-73 Tertek Pare Kediri',
  pengasuh: 'KH. Mujtaba Thoifur',
  ketua: 'Muhammad Maghfuri',
  bendahara: 'Shofil Mubarok',
};

export const DEFAULT_TARIF: TarifDefault = {
  syahriyah_mukim: 150000,
  syahriyah_nduduk: 100000,
  syahriyah_kilatan: 75000,
  event_kilatan: 50000,
};

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'user-1',
    nama: 'Muhammad Maghfuri',
    username: 'superadmin',
    password: 'admin123',
    role: 'super_admin',
    status: 'Aktif',
  },
  {
    id: 'user-2',
    nama: 'Shofil Mubarok',
    username: 'admin1',
    password: 'admin123',
    role: 'admin',
    status: 'Aktif',
  },
  {
    id: 'user-3',
    nama: 'KH. Mujtaba Thoifur',
    username: 'pengasuh',
    password: 'admin123',
    role: 'pemilik',
    status: 'Aktif',
  },
];

export const pengaturanService = {
  // PROFIL PONDOK
  getProfil(): ProfilPondok {
    try {
      const data = localStorage.getItem(KEY_PROFIL);
      if (!data) return DEFAULT_PROFIL;
      return { ...DEFAULT_PROFIL, ...JSON.parse(data) };
    } catch {
      return DEFAULT_PROFIL;
    }
  },

  saveProfil(profil: ProfilPondok): void {
    localStorage.setItem(KEY_PROFIL, JSON.stringify(profil));
  },

  // TARIF DEFAULT
  getTarif(): TarifDefault {
    try {
      const data = localStorage.getItem(KEY_TARIF);
      if (!data) return DEFAULT_TARIF;
      return { ...DEFAULT_TARIF, ...JSON.parse(data) };
    } catch {
      return DEFAULT_TARIF;
    }
  },

  saveTarif(tarif: TarifDefault): void {
    localStorage.setItem(KEY_TARIF, JSON.stringify(tarif));
  },

  // MANAJEMEN PENGGUNA
  getUsers(): UserAccount[] {
    try {
      const data = localStorage.getItem(KEY_USERS);
      if (!data) {
        localStorage.setItem(KEY_USERS, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_USERS;
    }
  },

  saveUsers(users: UserAccount[]): void {
    localStorage.setItem(KEY_USERS, JSON.stringify(users));
  },

  addUser(user: Omit<UserAccount, 'id'>): UserAccount {
    const users = this.getUsers();
    const newUser: UserAccount = {
      ...user,
      id: `user-${Date.now()}`,
    };
    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  },

  updateUser(id: string, updated: Partial<UserAccount>): void {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updated };
      this.saveUsers(users);
    }
  },

  deleteUser(id: string): void {
    const users = this.getUsers();
    const filtered = users.filter((u) => u.id !== id);
    this.saveUsers(filtered);
  },
};
