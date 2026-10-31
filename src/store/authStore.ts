export type UserRole = 'super_admin' | 'admin' | 'pemilik';

export interface AuthUser {
  username: string;
  role: UserRole;
  nama: string;
}

const STORAGE_KEY = 'hidayah_auth_user';

export const authStore = {
  getUser(): AuthUser | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  setUser(user: AuthUser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  },

  clearUser() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('token');
  },

  logout() {
    this.clearUser();
    window.location.href = '/login';
  },
};
