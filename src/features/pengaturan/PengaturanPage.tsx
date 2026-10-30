import React, { useState, useEffect, useRef } from 'react';
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
  Layers,
  FileText,
  Database,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
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
import { api } from '../../lib/api';

type ActiveTab =
  | 'profil'
  | 'tarif'
  | 'users'
  | 'iuran'
  | 'kategori_kas'
  | 'kwitansi'
  | 'backup';

interface IuranTambahanItem {
  id: string;
  nama: string;
  tipe: 'Syahriyah' | 'Kilatan' | 'Keduanya';
  nominal: number;
}

interface KategoriKasConfig {
  pemasukan: string[];
  pengeluaran: string[];
}

interface KwitansiSettingConfig {
  kop_surat: string;
  footer_kwitansi: string;
  nama_penandatangan: string;
  logo_base64?: string;
  catatan_kaki_thermal: string;
  font_size_thermal: '10px' | '12px' | '14px';
  paper_width_thermal: '58mm' | '80mm';
}

const STORAGE_KEY_IURAN = 'al_hidayah_iuran_tambahan';
const STORAGE_KEY_KATEGORI_KAS = 'al_hidayah_kategori_kas';
const STORAGE_KEY_KWITANSI = 'al_hidayah_kwitansi_config';

const DEFAULT_IURAN: IuranTambahanItem[] = [
  { id: 'iur-1', nama: 'Seragam', tipe: 'Keduanya', nominal: 50000 },
  { id: 'iur-2', nama: 'Kitab', tipe: 'Syahriyah', nominal: 35000 },
];

const DEFAULT_KATEGORI_KAS: KategoriKasConfig = {
  pemasukan: ['Syahriyah', 'Kilatan', 'Pendaftaran', 'Donasi', 'Lain-lain'],
  pengeluaran: ['Operasional', 'Listrik & Air', 'Konsumsi', 'Pemeliharaan', 'Lain-lain'],
};

const BULAN_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const PengaturanPage: React.FC = () => {
  const currentUser = authStore.getUser();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [activeTab, setActiveTab] = useState<ActiveTab>('profil');
  const tabContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'kwitansi' && !isSuperAdmin) {
      setActiveTab('profil');
    }
  }, [activeTab, isSuperAdmin]);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabContainerRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      tabContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Profil Form State
  const [profil, setProfil] = useState<ProfilPondok>(
    pengaturanService.getProfil()
  );

  // Tarif Form State
  const [tarif, setTarif] = useState<TarifDefault>(
    pengaturanService.getTarif()
  );
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [paidMonths, setPaidMonths] = useState<number[]>([]);
  const [bulanEfektif, setBulanEfektif] = useState<number>(1);
  const [tahunEfektif, setTahunEfektif] = useState<number>(new Date().getFullYear());
  const [isTarifModalOpen, setIsTarifModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (activeTab === 'tarif') {
      pengaturanService.getPaidMonths(selectedYear).then((months) => {
        setPaidMonths(months);
      });
    }
  }, [activeTab, selectedYear]);

  // Users Table State
  const [users, setUsers] = useState<UserAccount[]>(
    pengaturanService.getUsers()
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // TAB 4: Iuran Tambahan State
  const [iuranList, setIuranList] = useState<IuranTambahanItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_IURAN);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY_IURAN, JSON.stringify(DEFAULT_IURAN));
        return DEFAULT_IURAN;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_IURAN;
    }
  });
  const [isIuranModalOpen, setIsIuranModalOpen] = useState(false);
  const [editingIuran, setEditingIuran] = useState<IuranTambahanItem | null>(null);
  const [iuranForm, setIuranForm] = useState<{
    nama: string;
    tipe: 'Syahriyah' | 'Kilatan' | 'Keduanya';
    nominal: number;
  }>({ nama: '', tipe: 'Keduanya', nominal: 0 });

  // TAB 5: Kategori Kas State
  const [kategoriKas, setKategoriKas] = useState<KategoriKasConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_KATEGORI_KAS);
      if (!raw) {
        localStorage.setItem(
          STORAGE_KEY_KATEGORI_KAS,
          JSON.stringify(DEFAULT_KATEGORI_KAS)
        );
        return DEFAULT_KATEGORI_KAS;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_KATEGORI_KAS;
    }
  });
  const [newKatPemasukan, setNewKatPemasukan] = useState('');
  const [newKatPengeluaran, setNewKatPengeluaran] = useState('');

  // TAB 6: Kop & Kwitansi State
  const [kwitansiConfig, setKwitansiConfig] = useState<KwitansiSettingConfig>(() => {
    const p = pengaturanService.getProfil();
    const def = {
      kop_surat: 'PONDOK AL HIDAYAH TERIEK\nJln. Mayor Bismo No 71-73 Tertek Pare Kediri',
      footer_kwitansi: 'Terima kasih atas pembayaran Anda',
      nama_penandatangan: p.bendahara || 'Shofil Mubarok',
      catatan_kaki_thermal: 'Simpan struk ini sebagai bukti sah.',
      font_size_thermal: '12px' as const,
      paper_width_thermal: '58mm' as const,
    };
    try {
      const raw = localStorage.getItem(STORAGE_KEY_KWITANSI);
      if (!raw) return def;
      return { ...def, ...JSON.parse(raw) };
    } catch {
      return def;
    }
  });

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get('/pengaturan/kwitansi-config')
      .then(({ data }) => {
        if (data?.success && data.data) {
          setKwitansiConfig((current) => ({ ...current, ...data.data }));
        }
      })
      .catch(() => {
        showToast('Konfigurasi cetak dari server tidak dapat dimuat.', 'error');
      });
  }, [isSuperAdmin]);

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
  const handleSaveTarif = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await pengaturanService.validateAndSaveTarif(
        tarif,
        bulanEfektif,
        tahunEfektif
      );
      showToast(
        `Tarif default efektif bulan ${BULAN_NAMES[bulanEfektif - 1]} ${tahunEfektif} berhasil disimpan!`
      );
      setIsTarifModalOpen(false);
    } catch (err: any) {
      showToast(
        err.message ||
          'Gagal! Sudah ada pembayaran di bulan tersebut. Batalkan (Void) pembayaran terlebih dahulu.',
        'error'
      );
    }
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

  // Iuran Tambahan Handlers
  const handleSaveIuran = (e: React.FormEvent) => {
    e.preventDefault();
    if (!iuranForm.nama.trim()) {
      showToast('Nama iuran wajib diisi', 'error');
      return;
    }

    let updated: IuranTambahanItem[];
    if (editingIuran) {
      updated = iuranList.map((item) =>
        item.id === editingIuran.id ? { ...item, ...iuranForm } : item
      );
      showToast('Iuran tambahan berhasil diperbarui');
    } else {
      const newItem: IuranTambahanItem = {
        id: 'iur-' + Date.now(),
        ...iuranForm,
      };
      updated = [...iuranList, newItem];
      showToast('Iuran tambahan berhasil ditambahkan');
    }

    setIuranList(updated);
    localStorage.setItem(STORAGE_KEY_IURAN, JSON.stringify(updated));
    setIsIuranModalOpen(false);
  };

  const handleDeleteIuran = (id: string) => {
    if (window.confirm('Yakin ingin menghapus iuran tambahan ini?')) {
      const updated = iuranList.filter((i) => i.id !== id);
      setIuranList(updated);
      localStorage.setItem(STORAGE_KEY_IURAN, JSON.stringify(updated));
      showToast('Iuran tambahan berhasil dihapus');
    }
  };

  // Kategori Kas Handlers
  const handleAddKatPemasukan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKatPemasukan.trim()) return;
    if (kategoriKas.pemasukan.includes(newKatPemasukan.trim())) {
      showToast('Kategori sudah ada', 'error');
      return;
    }
    const updated = {
      ...kategoriKas,
      pemasukan: [...kategoriKas.pemasukan, newKatPemasukan.trim()],
    };
    setKategoriKas(updated);
    localStorage.setItem(STORAGE_KEY_KATEGORI_KAS, JSON.stringify(updated));
    setNewKatPemasukan('');
    showToast('Kategori pemasukan ditambahkan');
  };

  const handleDeleteKatPemasukan = (cat: string) => {
    const updated = {
      ...kategoriKas,
      pemasukan: kategoriKas.pemasukan.filter((c) => c !== cat),
    };
    setKategoriKas(updated);
    localStorage.setItem(STORAGE_KEY_KATEGORI_KAS, JSON.stringify(updated));
    showToast('Kategori dihapus');
  };

  const handleAddKatPengeluaran = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKatPengeluaran.trim()) return;
    if (kategoriKas.pengeluaran.includes(newKatPengeluaran.trim())) {
      showToast('Kategori sudah ada', 'error');
      return;
    }
    const updated = {
      ...kategoriKas,
      pengeluaran: [...kategoriKas.pengeluaran, newKatPengeluaran.trim()],
    };
    setKategoriKas(updated);
    localStorage.setItem(STORAGE_KEY_KATEGORI_KAS, JSON.stringify(updated));
    setNewKatPengeluaran('');
    showToast('Kategori pengeluaran ditambahkan');
  };

  const handleDeleteKatPengeluaran = (cat: string) => {
    const updated = {
      ...kategoriKas,
      pengeluaran: kategoriKas.pengeluaran.filter((c) => c !== cat),
    };
    setKategoriKas(updated);
    localStorage.setItem(STORAGE_KEY_KATEGORI_KAS, JSON.stringify(updated));
    showToast('Kategori dihapus');
  };

  // Kop & Kwitansi Handlers
  const handleSaveKwitansiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/pengaturan/kwitansi-config', kwitansiConfig);
      if (data?.success) {
        localStorage.setItem(STORAGE_KEY_KWITANSI, JSON.stringify(data.data));
        setKwitansiConfig(data.data);
        showToast('Pengaturan Kop, Kwitansi, dan Thermal berhasil disimpan!');
      }
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Gagal menyimpan pengaturan cetak.', 'error');
    }
  };

  // Backup & Restore Handlers
  const handleDownloadBackup = () => {
    const backupData: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const val = localStorage.getItem(key);
          backupData[key] = val ? JSON.parse(val) : val;
        } catch {
          backupData[key] = localStorage.getItem(key);
        }
      }
    }

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    const dateStr = new Date().toISOString().substring(0, 10);
    downloadAnchor.setAttribute('download', `backup-alhidayah-${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup data berhasil diunduh!');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRestoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      window.confirm(
        'Data saat ini akan ditimpa dengan file backup. Apakah Anda yakin?'
      )
    ) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (json && typeof json === 'object') {
            for (const key of Object.keys(json)) {
              const val = json[key];
              localStorage.setItem(
                key,
                typeof val === 'string' ? val : JSON.stringify(val)
              );
            }
            showToast('Restore data berhasil! Memuat ulang halaman...');
            setTimeout(() => {
              window.location.reload();
            }, 1200);
          } else {
            showToast('Format file JSON tidak valid', 'error');
          }
        } catch (err) {
          showToast('Gagal memproses file JSON backup', 'error');
        }
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
          Kelola profil pondok, nominal tarif default, dan konfigurasi sistem
        </p>
      </div>

      {/* Tab Navigation with Scroll Buttons ('<' and '>') */}
      <div className="relative flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => scrollTabs('left')}
          className="p-1.5 rounded-full bg-white/95 border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-100 transition-colors shrink-0 z-10 cursor-pointer"
          title="Geser Kiri"
          aria-label="Geser Kiri"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={tabContainerRef}
          className="flex overflow-x-auto whitespace-nowrap scrollbar-hide no-scrollbar flex-1 items-center gap-4 sm:gap-6 text-sm font-medium px-2 py-1"
        >
          {[
            { key: 'profil', label: 'Profil Pondok', icon: Building2 },
            { key: 'tarif', label: 'Tarif Default', icon: DollarSign },
            { key: 'users', label: 'Manajemen Pengguna', icon: Users },
            { key: 'iuran', label: 'Iuran Tambahan', icon: Layers },
            { key: 'kategori_kas', label: 'Kategori Kas', icon: DollarSign },
            ...(isSuperAdmin ? [{ key: 'kwitansi', label: 'Kop & Kwitansi', icon: FileText }] : []),
            { key: 'backup', label: 'Backup & Restore', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as ActiveTab)}
                className={`py-3 inline-flex items-center gap-2 font-semibold transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
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

        <button
          type="button"
          onClick={() => scrollTabs('right')}
          className="p-1.5 rounded-full bg-white/95 border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-100 transition-colors shrink-0 z-10 cursor-pointer"
          title="Geser Kanan"
          aria-label="Geser Kanan"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
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
                className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
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
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Pengaturan Tarif Default</h2>
              <p className="text-xs text-slate-500">
                Ringkasan tarif pembayaran santri yang berlaku saat ini.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsTarifModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              <span>Ubah Tarif Default</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Syahriyah Mukim
              </span>
              <div className="text-xl font-bold text-slate-900 font-mono">
                Rp {tarif.syahriyah_mukim.toLocaleString('id-ID')}
                <span className="text-xs font-normal text-slate-500 ml-1">/ bulan</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Syahriyah Nduduk
              </span>
              <div className="text-xl font-bold text-slate-900 font-mono">
                Rp {tarif.syahriyah_nduduk.toLocaleString('id-ID')}
                <span className="text-xs font-normal text-slate-500 ml-1">/ bulan</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Syahriyah Kilatan
              </span>
              <div className="text-xl font-bold text-slate-900 font-mono">
                Rp {tarif.syahriyah_kilatan.toLocaleString('id-ID')}
                <span className="text-xs font-normal text-slate-500 ml-1">/ bulan</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Event Kilatan
              </span>
              <div className="text-xl font-bold text-slate-900 font-mono">
                Rp {tarif.event_kilatan.toLocaleString('id-ID')}
                <span className="text-xs font-normal text-slate-500 ml-1">/ event</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MANAJEMEN PENGGUNA */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-bold text-[#0F172A]">Daftar Pengguna Sistem</h2>
            <button
              onClick={handleAddUser}
              className="px-3.5 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
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
                              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
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
                                  : 'border-red-200 text-red-600 bg-white hover:bg-red-50 cursor-pointer'
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

      {/* TAB 4: IURAN TAMBAHAN */}
      {activeTab === 'iuran' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Pengaturan Iuran Tambahan</h2>
              <p className="text-xs text-slate-500">
                Kelola daftar iuran tambahan seperti seragam, kitab, dll.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingIuran(null);
                setIuranForm({ nama: '', tipe: 'Keduanya', nominal: 0 });
                setIsIuranModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Iuran</span>
            </button>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Nama Iuran</th>
                    <th className="px-4 py-3">Tipe Pembayaran</th>
                    <th className="px-4 py-3 text-right">Nominal Default</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {iuranList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-400">
                        Belum ada data iuran tambahan.
                      </td>
                    </tr>
                  ) : (
                    iuranList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#0F172A]">
                          {item.nama}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                            {item.tipe}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                          Rp {item.nominal.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingIuran(item);
                                setIuranForm({
                                  nama: item.nama,
                                  tipe: item.tipe,
                                  nominal: item.nominal,
                                });
                                setIsIuranModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5 text-slate-500" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteIuran(item.id)}
                              className="px-2.5 py-1 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-medium transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: KATEGORI KAS */}
      {activeTab === 'kategori_kas' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Kelola Kategori Kas</h2>
            <p className="text-xs text-slate-500">
              Pengaturan kategori untuk transaksi Pemasukan dan Pengeluaran
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kategori Pemasukan */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-emerald-800 border-b pb-2">
                Kategori Pemasukan
              </h3>
              <form onSubmit={handleAddKatPemasukan} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nama kategori baru..."
                  value={newKatPemasukan}
                  onChange={(e) => setNewKatPemasukan(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-emerald-600"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  Tambah
                </button>
              </form>

              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {kategoriKas.pemasukan.map((cat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs"
                  >
                    <span className="font-semibold text-slate-800">{cat}</span>
                    {kategoriKas.pemasukan.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteKatPemasukan(cat)}
                        className="text-slate-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Kategori Pengeluaran */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-rose-800 border-b pb-2">
                Kategori Pengeluaran
              </h3>
              <form onSubmit={handleAddKatPengeluaran} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nama kategori baru..."
                  value={newKatPengeluaran}
                  onChange={(e) => setNewKatPengeluaran(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-xl outline-none focus:border-rose-600"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  Tambah
                </button>
              </form>

              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {kategoriKas.pengeluaran.map((cat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs"
                  >
                    <span className="font-semibold text-slate-800">{cat}</span>
                    {kategoriKas.pengeluaran.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteKatPengeluaran(cat)}
                        className="text-slate-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: KOP & KWITANSI (Super Admin Only) */}
      {activeTab === 'kwitansi' && isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Form */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-1">Kustomisasi Template PDF / Kwitansi</h2>
            <p className="text-xs text-slate-500 mb-5">
              Atur kop surat, penandatangan, dan footer kwitansi. Perubahan akan langsung terlihat pada preview di sebelah kanan.
            </p>

            <form onSubmit={handleSaveKwitansiConfig} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kop Surat (Multi-baris)
                </label>
                <textarea
                  rows={3}
                  value={kwitansiConfig.kop_surat}
                  onChange={(e) =>
                    setKwitansiConfig({ ...kwitansiConfig, kop_surat: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 font-mono text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Baris pertama akan dicetak tebal sebagai nama instansi / pondok.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Logo Pondok (Opsional)
                </label>
                <div className="flex items-center gap-3">
                  {kwitansiConfig.logo_base64 && (
                    <img
                      src={kwitansiConfig.logo_base64}
                      alt="Logo"
                      className="w-10 h-10 object-contain border border-slate-200 rounded-lg p-0.5 bg-slate-50"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (uploadEvent) => {
                          const base64 = uploadEvent.target?.result as string;
                          setKwitansiConfig({ ...kwitansiConfig, logo_base64: base64 });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                  {kwitansiConfig.logo_base64 && (
                    <button
                      type="button"
                      onClick={() => setKwitansiConfig({ ...kwitansiConfig, logo_base64: undefined })}
                      className="text-xs text-red-600 hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Penandatangan (Bendahara)
                </label>
                <input
                  type="text"
                  value={kwitansiConfig.nama_penandatangan}
                  onChange={(e) =>
                    setKwitansiConfig({
                      ...kwitansiConfig,
                      nama_penandatangan: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-transparent outline-none text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Footer / Catatan Kwitansi
                </label>
                <textarea
                  rows={2}
                  value={kwitansiConfig.footer_kwitansi}
                  onChange={(e) =>
                    setKwitansiConfig({
                      ...kwitansiConfig,
                      footer_kwitansi: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-transparent outline-none text-slate-800 text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Pengaturan Cetak Thermal</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Catatan Kaki Thermal
                    </label>
                    <textarea
                      rows={2}
                      value={kwitansiConfig.catatan_kaki_thermal}
                      onChange={(e) =>
                        setKwitansiConfig({
                          ...kwitansiConfig,
                          catatan_kaki_thermal: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-transparent outline-none text-slate-800 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Ukuran Font Thermal
                      </label>
                      <select
                        value={kwitansiConfig.font_size_thermal}
                        onChange={(e) =>
                          setKwitansiConfig({
                            ...kwitansiConfig,
                            font_size_thermal: e.target.value as '10px' | '12px' | '14px',
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                      >
                        <option value="10px">Kecil - 10px</option>
                        <option value="12px">Sedang - 12px</option>
                        <option value="14px">Besar - 14px</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Lebar Kertas Thermal
                      </label>
                      <select
                        value={kwitansiConfig.paper_width_thermal}
                        onChange={(e) =>
                          setKwitansiConfig({
                            ...kwitansiConfig,
                            paper_width_thermal: e.target.value as '58mm' | '80mm',
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                      >
                        <option value="58mm">58mm</option>
                        <option value="80mm">80mm</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-start">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Pengaturan Kwitansi</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Real-Time A4 Preview Box */}
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col items-center">
            <div className="w-full mb-5">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Preview Thermal
              </div>
              <div
                className="mx-auto bg-white border border-slate-300 shadow-md p-3 text-center overflow-hidden"
                style={{
                  width: kwitansiConfig.paper_width_thermal === '80mm' ? '320px' : '232px',
                  fontSize: kwitansiConfig.font_size_thermal,
                }}
              >
                {kwitansiConfig.logo_base64 && (
                  <img src={kwitansiConfig.logo_base64} alt="Logo" className="w-10 h-10 object-contain mx-auto mb-1" />
                )}
                <div className="font-bold border-b border-dashed border-slate-400 pb-2">
                  {kwitansiConfig.kop_surat.split('\n')[0]}
                </div>
                <div className="py-2 text-[0.85em] text-left">KWITANSI PEMBAYARAN</div>
                <div className="text-[0.85em] border-t border-dashed border-slate-400 pt-2">
                  {kwitansiConfig.catatan_kaki_thermal || 'Simpan struk ini sebagai bukti sah.'}
                </div>
              </div>
            </div>
            <div className="w-full flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                Preview Real-Time Kwitansi / PDF
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md">
                A4 / Kwitansi Format
              </span>
            </div>

            {/* Paper Container (A4 proportion styling) */}
            <div className="w-full bg-white border border-slate-300 rounded-lg shadow-md p-6 text-xs text-slate-900 space-y-4 font-sans relative">
              {/* Kop Surat Preview */}
              <div className="border-b-2 border-emerald-600 pb-3 flex items-center gap-3">
                {kwitansiConfig.logo_base64 && (
                  <img
                    src={kwitansiConfig.logo_base64}
                    alt="Logo"
                    className="w-10 h-10 object-contain shrink-0"
                  />
                )}
                <div className="space-y-1 flex-1">
                  {kwitansiConfig.kop_surat.split('\n').map((line, idx) =>
                    idx === 0 ? (
                      <h3 key={idx} className="font-bold text-emerald-700 text-sm uppercase tracking-wide">
                        {line || 'NAMA PONDOK'}
                      </h3>
                    ) : (
                      <p key={idx} className="text-[11px] text-slate-600">
                        {line}
                      </p>
                    )
                  )}
                  <p className="text-[10px] text-slate-500 pt-0.5">Pengasuh: {profil.pengasuh || '-'}</p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-0.5">
                <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider">KWITANSI PEMBAYARAN</h4>
                <p className="text-[10px] text-slate-500 font-mono">No: KWT-20261030-001</p>
              </div>

              {/* Info Santri */}
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <p className="text-slate-500">Telah Terima Dari:</p>
                  <p className="font-bold text-slate-800">Ahmad Fauzi (Santri)</p>
                  <p className="text-slate-500 mt-1">NIS / Kategori:</p>
                  <p className="font-mono text-slate-700">1024 / Mukim</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500">Tanggal Bayar:</p>
                  <p className="font-semibold text-slate-800">30 Oktober 2026</p>
                  <p className="text-slate-500 mt-1">Metode:</p>
                  <p className="font-semibold text-slate-800">Tunai</p>
                </div>
              </div>

              {/* Dummy Table */}
              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <thead>
                  <tr className="bg-emerald-600 text-white font-semibold">
                    <th className="border border-slate-300 p-1.5 text-center w-8">No</th>
                    <th className="border border-slate-300 p-1.5 text-left">Rincian Pembayaran</th>
                    <th className="border border-slate-300 p-1.5 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-1.5 text-center font-mono">1</td>
                    <td className="border border-slate-300 p-1.5">Syahriyah Bulan Oktober 2026 (Penuh)</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono font-semibold">Rp 150.000</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={2} className="border border-slate-300 p-1.5 text-right">TOTAL PEMBAYARAN</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono text-emerald-700">Rp 150.000</td>
                  </tr>
                </tfoot>
              </table>

              {/* Terbilang */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-md p-2 text-[11px] italic text-emerald-900">
                <strong>Terbilang:</strong> # Seratus Lima Puluh Ribu Rupiah #
              </div>

              {/* Footer Note */}
              {kwitansiConfig.footer_kwitansi && (
                <p className="text-[10px] text-slate-500 italic">
                  Catatan: {kwitansiConfig.footer_kwitansi}
                </p>
              )}

              {/* Signature */}
              <div className="flex justify-between items-end pt-4 text-[11px]">
                <div>
                  <p className="text-slate-600">Penyetor,</p>
                  <div className="h-10"></div>
                  <p className="text-slate-800">( ............................. )</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-600">Pare, 30 Oktober 2026</p>
                  <p className="font-semibold text-slate-800">Bendahara Pondok,</p>
                  <div className="h-10"></div>
                  <p className="font-bold text-slate-900 underline">
                    ( {kwitansiConfig.nama_penandatangan || 'Shofil Mubarok'} )
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-xs max-w-2xl space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Backup & Restore Data Sistem</h2>
            <p className="text-xs text-slate-500 mt-1">
              Unduh salinan data seluruh aplikasi atau pulihkan data dari file JSON cadangan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Backup Button */}
            <div className="border border-slate-200 rounded-2xl p-5 flex flex-col items-center text-center space-y-3 bg-slate-50/60">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Backup Data</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Simpan seluruh data ke file JSON.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Backup (JSON)</span>
              </button>
            </div>

            {/* Restore Button */}
            <div className="border border-slate-200 rounded-2xl p-5 flex flex-col items-center text-center space-y-3 bg-slate-50/60">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Restore Data</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Muat data dari file JSON cadangan.
                </p>
              </div>
              <label className="w-full px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-colors shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Restore Data (JSON)</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleRestoreUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <strong className="block font-semibold">Peringatan Penting:</strong>
              <p>
                Gunakan fitur ini secara berkala untuk menghindari kehilangan data. Melakukan restore akan menimpa seluruh data yang ada saat ini.
              </p>
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

      {/* Modal Add / Edit Iuran Tambahan */}
      {isIuranModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsIuranModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-10 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingIuran ? 'Edit Iuran Tambahan' : 'Tambah Iuran Tambahan'}
            </h3>

            <form onSubmit={handleSaveIuran} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Iuran <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={iuranForm.nama}
                  onChange={(e) =>
                    setIuranForm({ ...iuranForm, nama: e.target.value })
                  }
                  placeholder="Contoh: Seragam, Buku Kitab, Pembangunan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tipe Pembayaran <span className="text-red-500">*</span>
                </label>
                <select
                  value={iuranForm.tipe}
                  onChange={(e) =>
                    setIuranForm({
                      ...iuranForm,
                      tipe: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-slate-800 bg-white"
                >
                  <option value="Syahriyah">Syahriyah</option>
                  <option value="Kilatan">Kilatan</option>
                  <option value="Keduanya">Keduanya</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nominal Default (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={iuranForm.nominal}
                  onChange={(e) =>
                    setIuranForm({
                      ...iuranForm,
                      nominal: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl outline-none focus:border-emerald-600 text-slate-800 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsIuranModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Tarif Baru */}
      {isTarifModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsTarifModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 z-10 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Pengaturan Tarif Baru</h3>
                  <p className="text-sm text-slate-500">Atur tarif efektif untuk periode pembayaran</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTarifModalOpen(false)}
                aria-label="Tutup modal"
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTarif} className="space-y-5 text-xs">
              {/* Bagian Periode Efektif (Month Picker) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Bulan & Tahun Efektif Tarif
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pilih bulan dan tahun kapan tarif ini akan mulai berlaku.
                    </p>
                  </div>
                  {/* Year Navigation */}
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setSelectedYear(selectedYear - 1)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                      title="Tahun Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold font-mono text-slate-900 w-10 text-center">
                      {selectedYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedYear(selectedYear + 1)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                      title="Tahun Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 12 Months Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                  {BULAN_NAMES.map((namaBulan, idx) => {
                    const bulanNum = idx + 1;
                    const isPaid = paidMonths.includes(bulanNum);
                    const isSelected =
                      bulanEfektif === bulanNum && tahunEfektif === selectedYear;

                    let btnClass = '';
                    if (isPaid) {
                      btnClass =
                        'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-75';
                    } else if (isSelected) {
                      btnClass =
                        'bg-emerald-600 text-white border-emerald-600 shadow-sm';
                    } else {
                      btnClass =
                        'bg-white text-slate-700 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 cursor-pointer';
                    }

                    return (
                      <button
                        key={bulanNum}
                        type="button"
                        disabled={isPaid}
                        onClick={() => {
                          if (!isPaid) {
                            setBulanEfektif(bulanNum);
                            setTahunEfektif(selectedYear);
                          }
                        }}
                        className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5 ${btnClass}`}
                        title={
                          isPaid
                            ? 'Tidak dapat dipilih. Sudah ada pembayaran di bulan ini.'
                            : `Pilih efektif ${namaBulan} ${selectedYear}`
                        }
                      >
                        <span>{namaBulan}</span>
                        {isPaid && (
                          <span className="text-[9px] text-slate-400 font-normal">
                            Sudah Bayar
                          </span>
                        )}
                        {isSelected && !isPaid && (
                          <span className="text-[9px] text-emerald-100 font-normal">
                            Terpilih
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bagian Nominal Tarif Baru */}
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tarif Syahriyah - Santri Mukim (Rp / bulan) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={tarif.syahriyah_mukim}
                    onChange={(e) =>
                      setTarif({
                        ...tarif,
                        syahriyah_mukim: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tarif Syahriyah - Santri Nduduk (Rp / bulan) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={tarif.syahriyah_nduduk}
                    onChange={(e) =>
                      setTarif({
                        ...tarif,
                        syahriyah_nduduk: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tarif Syahriyah - Santri Kilatan (Rp / bulan) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={tarif.syahriyah_kilatan}
                    onChange={(e) =>
                      setTarif({
                        ...tarif,
                        syahriyah_kilatan: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tarif Event Kilatan (Rp / event) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={tarif.event_kilatan}
                    onChange={(e) =>
                      setTarif({
                        ...tarif,
                        event_kilatan: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-transparent outline-none text-slate-800 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Footer Modal */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 bg-slate-50 -mx-6 -mb-6 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setIsTarifModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Simpan Tarif Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PengaturanPage;
