import React, { useState, useEffect } from 'react';
import { X, User, Lock, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { UserAccount, UserRole, UserStatus } from '../../types/pengaturan';
import { pengaturanService } from '../../lib/pengaturanService';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser: UserAccount | null;
  onSuccess: () => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  editingUser,
  onSuccess,
}) => {
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [status, setStatus] = useState<UserStatus>('Aktif');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingUser) {
      setNama(editingUser.nama);
      setUsername(editingUser.username);
      setPassword('');
      setRole(editingUser.role);
      setStatus(editingUser.status);
    } else {
      setNama('');
      setUsername('');
      setPassword('admin123');
      setRole('admin');
      setStatus('Aktif');
    }
    setError('');
  }, [editingUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nama.trim()) {
      setError('Nama lengkap wajib diisi');
      return;
    }
    if (!username.trim()) {
      setError('Username wajib diisi');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const allUsers = pengaturanService.getUsers();

    // Check username uniqueness
    const exists = allUsers.some(
      (u) =>
        u.username.toLowerCase() === cleanUsername &&
        (!editingUser || u.id !== editingUser.id)
    );

    if (exists) {
      setError('Username sudah digunakan oleh pengguna lain');
      return;
    }

    if (!editingUser && !password.trim()) {
      setError('Password wajib diisi untuk pengguna baru');
      return;
    }

    if (editingUser) {
      pengaturanService.updateUser(editingUser.id, {
        nama: nama.trim(),
        username: cleanUsername,
        role,
        status,
        ...(password.trim() ? { password: password.trim() } : {}),
      });
    } else {
      pengaturanService.addUser({
        nama: nama.trim(),
        username: cleanUsername,
        password: password.trim(),
        role,
        status,
      });
    }

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              <User className="w-5 h-5 text-[#059669]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">
                {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </h2>
              <p className="text-xs text-slate-500">
                {editingUser
                  ? 'Perbarui data dan hak akses pengguna'
                  : 'Buat akun pengguna baru untuk akses sistem'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Muhammad Maghfuri"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: maghfuri"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Password {editingUser ? '(Opsional: isi jika ingin ganti)' : <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editingUser ? 'Kosongkan jika tidak diubah' : 'Masukkan password'}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 pr-8 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Role Akses <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 pr-8 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="super_admin">Super Admin (Akses Penuh + Pengaturan)</option>
                <option value="admin">Administrator (Input & Kelola Data)</option>
                <option value="pemilik">Pengasuh / Pemilik (Lihat Laporan)</option>
              </select>
              <Shield className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Status Akun
            </label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="Aktif"
                  checked={status === 'Aktif'}
                  onChange={() => setStatus('Aktif')}
                  className="w-4 h-4 text-[#059669] focus:ring-[#059669]"
                />
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Aktif
                </span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="Nonaktif"
                  checked={status === 'Nonaktif'}
                  onChange={() => setStatus('Nonaktif')}
                  className="w-4 h-4 text-red-600 focus:ring-red-500"
                />
                <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  Nonaktif
                </span>
              </label>
            </div>
          </div>

          <div className="-mx-6 mt-6 flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
