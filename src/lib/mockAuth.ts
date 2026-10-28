export interface AuthResult {
  success: boolean;
  role?: 'super_admin' | 'admin' | 'pemilik';
  nama?: string;
  message?: string;
}

/**
 * Mock authentication function simulating backend credentials check.
 * Test credentials:
 * - superadmin / admin123 -> super_admin (Muhammad Maghfuri)
 * - admin1 / admin123 -> admin (Shofil Mubarok)
 * - pengasuh / admin123 -> pemilik (KH. Mujtaba Thoifur)
 */
export async function mockAuth(username: string, password: string): Promise<AuthResult> {
  // Simulate 500ms network latency
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (username === 'superadmin' && password === 'admin123') {
    return { success: true, role: 'super_admin', nama: 'Muhammad Maghfuri' };
  }
  if (username === 'admin1' && password === 'admin123') {
    return { success: true, role: 'admin', nama: 'Shofil Mubarok' };
  }
  if (username === 'pengasuh' && password === 'admin123') {
    return { success: true, role: 'pemilik', nama: 'KH. Mujtaba Thoifur' };
  }

  return { success: false, message: 'Username atau password salah' };
}
