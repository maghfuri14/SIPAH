export type UserRole = 'super_admin' | 'admin' | 'pemilik';

export interface AuthUser {
  username: string;
  role: UserRole;
  nama: string;
}

const STORAGE_KEY = 'hidayah_auth_user';

export const USER_PROFILES: Record<string, { username: string; role: UserRole; nama: string }> = {
  superadmin: {
    username: 'superadmin',
    role: 'super_admin',
    nama: 'Muhammad Maghfuri',
  },
  admin1: {
    username: 'admin1',
    role: 'admin',
    nama: 'Shofil Mubarok',
  },
  pengasuh: {
    username: 'pengasuh',
    role: 'pemilik',
    nama: 'KH. Mujtaba Thoifur',
  },
};

export const authStore = {
  getUser(): AuthUser | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('user');
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  setUser(user: AuthUser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));
  },

  clearUser() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('user');
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  },

  logout() {
    this.clearUser();
    window.location.href = '/login';
  },
};
