import { pengaturanService } from './pengaturanService';

export interface AuthResult {
  success: boolean;
  role?: 'super_admin' | 'admin' | 'pemilik';
  nama?: string;
  message?: string;
}

/**
 * Mock authentication function verifying credentials against al_hidayah_users.
 */
export async function mockAuth(usernameInput: string, passwordInput: string): Promise<AuthResult> {
  // Simulate 400ms network latency
  await new Promise((resolve) => setTimeout(resolve, 400));

  const cleanUsername = usernameInput.trim().toLowerCase();
  const users = pengaturanService.getUsers();

  const user = users.find((u) => u.username.toLowerCase() === cleanUsername);

  if (user) {
    if (user.password && user.password !== passwordInput) {
      return { success: false, message: 'Password yang Anda masukkan salah' };
    }
    if (user.status === 'Nonaktif') {
      return { success: false, message: 'Akun Anda sedang dinonaktifkan oleh Administrator' };
    }
    return {
      success: true,
      role: user.role,
      nama: user.nama,
    };
  }

  // Fallback defaults if user was not found in array
  if (cleanUsername === 'superadmin' && passwordInput === 'admin123') {
    return { success: true, role: 'super_admin', nama: 'Muhammad Maghfuri' };
  }
  if (cleanUsername === 'admin1' && passwordInput === 'admin123') {
    return { success: true, role: 'admin', nama: 'Shofil Mubarok' };
  }
  if (cleanUsername === 'pengasuh' && passwordInput === 'admin123') {
    return { success: true, role: 'pemilik', nama: 'KH. Mujtaba Thoifur' };
  }

  return { success: false, message: 'Username atau password salah' };
}
