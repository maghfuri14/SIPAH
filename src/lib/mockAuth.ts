import { api } from './api';

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
  try {
    const response = await api.post('/auth/login', {
      username: usernameInput.trim(),
      password: passwordInput,
    });
    localStorage.setItem('token', response.data.token);
    return {
      success: true,
      role: response.data.user.role,
      nama: response.data.user.nama_lengkap,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.response?.data?.message || 'Username atau password salah',
    };
  }
}
