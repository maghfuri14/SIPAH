import React, { useState, useEffect } from 'react';
import {
  Building2,
  DollarSign,
  Users,
  Save,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Shield,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  ProfilPondok,
  TarifDefault,
  UserAccount,
  UserRole,
} from '../../types/pengaturan';
import { pengaturanService } from '../../lib/pengaturanService';
import { UserFormModal } from './UserFormModal';
import { authStore } from '../../store/authStore';

type ActiveTab = 'profil' | 'tarif' | 'users';

export const PengaturanPage: React.FC = () => {
  const currentUser = authStore.getUser();

  const [activeTab, setActiveTab] = useState<ActiveTab>('profil');

  // Profil Form State
  const [profil, setProfil] = useState<ProfilPondok>(
    pengaturanService.getProfil()
  );

  // Tarif Form State
  const [tarif, setTarif] = useState<TarifDefault>(
    pengaturanService.getTarif()
  );

  // Users Table State
  const [users, setUsers] = useState<UserAccount[]>(
    pengaturanService.getUsers()
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const loadAllData = () => {
    setProfil(pengaturanService.getProfil());
    setTarif(pengaturanService.getTarif());
    setUsers(pengaturanService.getUsers());
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Submit Profil
  const handleSaveProfil = (e: React.FormEvent) => {
    e.preventDefault();
    pengaturanService.saveProfil(profil);
    showToast('Profil pondok berhasil disimpan!');
  };

  // Submit Tarif
  const handleSaveTarif = (e: React.FormEvent) => {
    e.preventDefault();
    pengaturanService.saveTarif(tarif);
    showToast('Nominal tarif default berhasil disimpan!');
  };

  // User Actions
  const handleAddUser = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user: UserAccount) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = (user: UserAccount) => {
    if (currentUser && currentUser.username === user.username) {
      showToast('Anda tidak dapat menghapus akun Anda sendiri!', 'error');
      return;
    }

    if (
      window.confirm(
        `Apakah Anda yakin ingin menghapus akun user "${user.nama}" (${user.username})?`
      )
    ) {
      pengaturanService.deleteUser(user.id);
      loadAllData();
      showToast(`User "${user.nama}" telah dihapus.`);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="px-2.5 py-0.5 rounded-md font-semibold text-xs bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
            <Shield className="w-3 h-3 text-purple-600" />
            Super Admin
          </span>
        );
      case 'admin':
        return (
          <span className="px-2.5 py-0.5 rounded-md font-semibold text-xs bg-blue-50 text-blue-700 border border-blue-200">
            Administrator
          </span>
        );
      case 'pemilik':
        return (
          <span className="px-2.5 py-0.5 rounded-md font-semibold text-xs bg-amber-50 text-amber-700 border border-amber-200">
            Pengasuh / Pemilik
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-4 duration-200 ${
            toastType === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-red-600 text-white border-red-500'
          }`}
        >
          {toastType === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
          Pengaturan Sistem
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Kelola profil pondok, nominal tarif default, dan akun pengguna
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 flex gap-4 sm:gap-6 text-sm font-medium overflow-x-auto no-scrollbar">
        {[
          { key: 'profil', label: 'Profil Pondok', icon: Building2 },
          { key: 'tarif', label: 'Tarif Default', icon: DollarSign },
          { key: 'users', label: 'Manajemen Pengguna', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as ActiveTab)}
              className={`pb-3 inline-flex items-center gap-2 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-[#059669] text-[#059669]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PROFIL PONDOK */}
      {activeTab === 'profil' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 shadow-xs">
          <form onSubmit={handleSaveProfil} className="space-y-4 max-w-2xl text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Pondok Pesantren <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={profil.nama_pondok}
                onChange={(e) =>
                  setProfil({ ...profil, nama_pondok: e.target.value })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-transparent outline-none text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Lengkap Pondok <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={profil.alamat}
                onChange={(e) =>
                  setProfil({ ...profil, alamat: e.target.value })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-transparent outline-none text-slate-800"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Pengasuh
                </label>
                <input
                  type="text"
                  value={profil.pengasuh}
                  onChange={(e) =>
                    setProfil({ ...profil, pengasuh: e.target.value })
                  }
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-transparent outline-none text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Ketua Pondok
                </label>
                <input
                  type="text"
                  value={profil.ketua}
                  onChange={(e) =>
                    setProfil({ ...profil, ketua: e.target.value })
                  }
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-transparent outline-none text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Bendahara
                </label>
                <input
                  type="text"
                  value={profil.bendahara}
                  onChange={(e) =>
                    setProfil({ ...profil, bendahara: e.target.value })
                  }
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-transparent outline-none text-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-start">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Profil</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: TARIF DEFAULT */}
      {activeTab === 'tarif' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 shadow-xs">
          <form onSubmit={handleSaveTarif} className="space-y-4 max-w-xl text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tarif Syahriyah - Santri Mukim (Rp / bulan)
              </label>
              <input
                type="number"
                min={0}
                value={tarif.syahriyah_mukim}
                onChange={(e) =>
                  setTarif({
                    ...tarif,
                    syahriyah_mukim: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-transparent outline-none text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tarif Syahriyah - Santri Nduduk (Rp / bulan)
              </label>
              <input
                type="number"
                min={0}
                value={tarif.syahriyah_nduduk}
                onChange={(e) =>
                  setTarif({
                    ...tarif,
                    syahriyah_nduduk: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-transparent outline-none text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tarif Syahriyah - Santri Kilatan (Rp / bulan)
              </label>
              <input
                type="number"
                min={0}
                value={tarif.syahriyah_kilatan}
                onChange={(e) =>
                  setTarif({
                    ...tarif,
                    syahriyah_kilatan: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-transparent outline-none text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tarif Event Kilatan (Rp / event)
              </label>
              <input
                type="number"
                min={0}
                value={tarif.event_kilatan}
                onChange={(e) =>
                  setTarif({
                    ...tarif,
                    event_kilatan: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-transparent outline-none text-slate-800 font-mono"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-start">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Tarif</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: MANAJEMEN PENGGUNA */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-bold text-[#0F172A]">Daftar Pengguna Sistem</h2>
            <button
              onClick={handleAddUser}
              className="px-3.5 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pengguna</span>
            </button>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Nama Lengkap</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isSelf = currentUser?.username === u.username;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#0F172A]">
                          <div className="flex items-center gap-2">
                            <span>{u.nama}</span>
                            {isSelf && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                Saya
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {u.username}
                        </td>
                        <td className="px-4 py-3">{getRoleBadge(u.role)}</td>
                        <td className="px-4 py-3">
                          {u.status === 'Aktif' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <UserCheck className="w-3 h-3 text-emerald-600" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-red-50 text-red-700 border border-red-200">
                              <UserX className="w-3 h-3 text-red-500" />
                              Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleEditUser(u)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs flex items-center gap-1"
                              title="Edit User"
                            >
                              <Edit className="w-3.5 h-3.5 text-slate-500" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={isSelf}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors shadow-2xs flex items-center gap-1 ${
                                isSelf
                                  ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed opacity-60'
                                  : 'border-red-200 text-red-600 bg-white hover:bg-red-50'
                              }`}
                              title={
                                isSelf
                                  ? 'Tidak dapat menghapus akun sendiri'
                                  : 'Hapus User'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit User */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingUser={editingUser}
        onSuccess={loadAllData}
      />
    </div>
  );
};

export default PengaturanPage;
