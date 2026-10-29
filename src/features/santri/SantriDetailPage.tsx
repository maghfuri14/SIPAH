import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  User,
  Phone,
  Calendar,
  CreditCard,
  History,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  ShieldAlert,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Santri } from '../../types/santri';
import { santriService } from '../../lib/santriService';
import { waiverService, SyahriyahWaiver } from '../../lib/waiverService';
import { SantriFormModal } from './SantriFormModal';
import { authStore } from '../../store/authStore';

type ActiveTab = 'profil' | 'syahriyah' | 'kilatan' | 'timeline';

const BULAN_NAMES = [
  '',
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

export const SantriDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = authStore.getUser();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const isPemilik = user?.role === 'pemilik';

  const [santri, setSantri] = useState<Santri | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('profil');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const tabContainerRef = useRef<HTMLDivElement>(null);

  // Waiver states
  const [waivers, setWaivers] = useState<SyahriyahWaiver[]>([]);
  const [waiverModalOpen, setWaiverModalOpen] = useState(false);
  const [waiverTahun, setWaiverTahun] = useState<number>(new Date().getFullYear());
  const [waiverBulanMulai, setWaiverBulanMulai] = useState<number>(1);
  const [waiverBulanSelesai, setWaiverBulanSelesai] = useState<number>(12);
  const [waiverJenis, setWaiverJenis] = useState<'Bebas' | 'Keringanan'>('Bebas');
  const [waiverKeterangan, setWaiverKeterangan] = useState('');

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabContainerRef.current) {
      const scrollAmount = direction === 'left' ? -150 : 150;
      tabContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await santriService.getSantriById(id);
      setSantri(data);
      setWaivers(waiverService.getWaiversForSantri(id));
    } catch {
      setSantri(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAddWaiver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya Admin yang dapat mengatur keringanan biaya.');
      return;
    }
    if (!id) return;

    if (waiverBulanMulai > waiverBulanSelesai) {
      showToast('Bulan mulai tidak boleh lebih besar dari bulan selesai.');
      return;
    }

    waiverService.addWaiver({
      santri_id: id,
      tahun: Number(waiverTahun),
      bulan_mulai: Number(waiverBulanMulai),
      bulan_selesai: Number(waiverBulanSelesai),
      jenis: waiverJenis,
      keterangan: waiverKeterangan.trim() || undefined,
    });

    setWaivers(waiverService.getWaiversForSantri(id));
    setWaiverModalOpen(false);
    setWaiverKeterangan('');
    showToast('Pembebasan/keringanan periode berhasil ditambahkan.');
  };

  const handleDeleteWaiver = (waiverId: string) => {
    if (!isAdmin) {
      showToast('Akses ditolak: Hanya Admin yang dapat menghapus keringanan biaya.');
      return;
    }
    if (window.confirm('Yakin ingin menghapus periode keringanan ini?')) {
      waiverService.deleteWaiver(waiverId);
      if (id) setWaivers(waiverService.getWaiversForSantri(id));
      showToast('Periode keringanan berhasil dihapus.');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-8 space-y-4 max-w-4xl mx-auto">
        <div className="animate-pulse h-6 bg-slate-200 rounded w-1/4" />
        <div className="animate-pulse h-28 bg-slate-200 rounded-2xl" />
        <div className="animate-pulse h-60 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (!santri) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs max-w-lg mx-auto my-8">
        <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
        <h2 className="text-xl font-bold text-[#0F172A] mb-1">Santri Tidak Ditemukan</h2>
        <p className="text-sm text-slate-500 mb-6">
          Data santri yang Anda cari tidak ada atau telah dihapus.
        </p>
        <button
          onClick={() => navigate('/santri')}
          className="px-4 py-2 bg-[#059669] text-white text-sm font-semibold rounded-lg hover:bg-[#047857] transition-colors"
        >
          Kembali ke Data Santri
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg border border-emerald-500 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header Row with Kembali and Compact Edit */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-xs"
          >
            <Edit className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit Santri</span>
          </button>
        )}
      </div>

      {/* Profile Card Header (Horizontal Mobile Layout) */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 shadow-xs flex items-center gap-4 sm:gap-6">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 text-emerald-700 font-bold text-lg sm:text-xl flex items-center justify-center shrink-0 border-2 border-emerald-400">
          {santri.nama.trim().substring(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-lg sm:text-2xl font-bold text-[#0F172A] tracking-tight truncate">
              {santri.nama}
            </h1>
            <span className="text-xs font-mono text-slate-400">NIS: {santri.nis}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {santri.kategori === 'Mukim' && (
              <span className="px-2 py-0.5 rounded-md font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Mukim
              </span>
            )}
            {santri.kategori === 'Nduduk' && (
              <span className="px-2 py-0.5 rounded-md font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                Nduduk
              </span>
            )}
            {santri.kategori === 'Kilatan' && (
              <span className="px-2 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Kilatan
              </span>
            )}

            {santri.status_syahriyah === 'Bebas' ? (
              <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-800 text-slate-100 border border-slate-700">
                Bebas Syahriyah
              </span>
            ) : santri.status_syahriyah === 'Keringanan' ? (
              <span className="px-2 py-0.5 rounded-md font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                Keringanan 50%
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Syahriyah Normal
              </span>
            )}

            {santri.status === 'Aktif' ? (
              <span className="px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Aktif
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md font-semibold bg-red-50 text-red-700 border border-red-200">
                Tidak Aktif
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Inline Symmetrical Tab Header Navigation */}
      <div className="flex items-center justify-between gap-1 sm:gap-2 w-full border-b border-slate-200 group">
        <button
          type="button"
          onClick={() => scrollTabs('left')}
          aria-label="Scroll Tabs Left"
          className="p-1 sm:p-1.5 rounded-full border border-slate-200 bg-white shadow-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all opacity-40 group-hover:opacity-100 shrink-0 mb-1"
          title="Scroll Kiri"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={tabContainerRef}
          className="flex items-center gap-4 sm:gap-6 overflow-x-auto text-sm font-medium whitespace-nowrap no-scrollbar [&::-webkit-scrollbar]:hidden [scrollbar-width:none] flex-1 px-2 scroll-smooth"
        >
          {[
            { key: 'profil', label: 'Profil Lengkap', icon: User },
            { key: 'syahriyah', label: 'Riwayat & Keringanan Syahriyah', icon: CreditCard },
            { key: 'kilatan', label: 'Riwayat Kilatan', icon: History },
            { key: 'timeline', label: 'Timeline', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as ActiveTab)}
                className={`pb-3 inline-flex items-center gap-2 transition-colors border-b-2 font-semibold whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#059669] text-[#059669]'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
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
          aria-label="Scroll Tabs Right"
          className="p-1 sm:p-1.5 rounded-full border border-slate-200 bg-white shadow-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all opacity-40 group-hover:opacity-100 shrink-0 mb-1"
          title="Scroll Kanan"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-1">
        {activeTab === 'profil' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <h3 className="font-bold text-[#0F172A] text-base border-b border-slate-100 pb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#059669]" />
                  Informasi Santri
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Nama Lengkap</span>
                    <span className="text-[#0F172A] font-semibold text-sm">{santri.nama}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Nomor Induk Santri (NIS)</span>
                    <span className="text-[#0F172A] font-mono font-semibold">{santri.nis}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">No. HP Santri</span>
                    <span className="text-[#0F172A] font-medium flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {santri.no_hp_santri}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-[#0F172A] text-base border-b border-slate-100 pb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#059669]" />
                  Informasi Wali & Pendaftaran
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Nama Wali</span>
                    <span className="text-[#0F172A] font-semibold text-sm">{santri.nama_wali}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">No. HP Wali</span>
                    <span className="text-[#0F172A] font-medium flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {santri.no_hp_wali}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Tanggal Terdaftar</span>
                    <span className="text-[#0F172A] font-medium flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(santri.tanggal_masuk)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {santri.catatan && (
              <div className="border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-400 font-medium block mb-1">Catatan Khusus</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {santri.catatan}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'syahriyah' && (
          <div className="space-y-6">
            {/* Role Notice */}
            {!isAdmin && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-800 text-xs">
                <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Mode Lihat (Read-Only)</span>
                  Anda masuk sebagai Pengasuh / Pemilik. Sesuai aturan sistem, hanya Admin yang dapat mengatur atau mengubah pembebasan biaya dan keringanan syahriyah.
                </div>
              </div>
            )}

            {/* Pembebasan / Keringanan Periode Card */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    Pengaturan Periode Pembebasan & Keringanan Syahriyah
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atur status bebas atau diskon 50% untuk rentang bulan tertentu di tahun tertentu.
                  </p>
                </div>

                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setWaiverModalOpen(true)}
                    className="px-3.5 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Periode Keringanan</span>
                  </button>
                ) : (
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-not-allowed">
                    <Info className="w-3.5 h-3.5" />
                    Hanya Admin yang dapat menambah
                  </span>
                )}
              </div>

              {/* List of Waivers */}
              <div className="space-y-3">
                {waivers.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Belum ada aturan periode keringanan khusus untuk santri ini. Mengikuti status global santri.
                  </div>
                ) : (
                  waivers.map((w) => (
                    <div
                      key={w.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0F172A]">
                            Tahun {w.tahun} ({BULAN_NAMES[w.bulan_mulai]} - {BULAN_NAMES[w.bulan_selesai]})
                          </span>
                          {w.jenis === 'Bebas' ? (
                            <span className="px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-100 text-[10px]">
                              Bebas Syahriyah (Gratis)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded font-bold bg-purple-100 text-purple-800 text-[10px]">
                              Keringanan 50%
                            </span>
                          )}
                        </div>
                        {w.keterangan && (
                          <p className="text-slate-600 text-[11px] italic">Keterangan: {w.keterangan}</p>
                        )}
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteWaiver(w.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 font-semibold inline-flex items-center gap-1 self-start sm:self-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 text-center shadow-xs">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-[#0F172A] mb-1">Modul Rekap Transaksi</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Untuk melihat matriks lengkap dan mencatat pembayaran bulanan, silakan kunjungi menu <span className="font-semibold text-slate-700">Syahriyah</span> di sidebar.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'kilatan' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 sm:p-12 text-center shadow-xs">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">Riwayat Kilatan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Kelola dan catat transaksi pendaftaran program kilatan santri di modul Kilatan.
            </p>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 sm:p-12 text-center shadow-xs">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">Timeline Aktivitas</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Aktivitas santri dicatat secara otomatis saat transaksi atau pembaruan data dilakukan.
            </p>
          </div>
        )}
      </div>

      {/* Modal Add Waiver (Admin Only) */}
      {waiverModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setWaiverModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-[#0F172A]">Tambah Periode Keringanan Syahriyah</h3>
              <button
                onClick={() => setWaiverModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWaiver} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tahun</label>
                <input
                  type="number"
                  value={waiverTahun}
                  onChange={(e) => setWaiverTahun(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl outline-none focus:border-[#059669] font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bulan Mulai</label>
                  <select
                    value={waiverBulanMulai}
                    onChange={(e) => setWaiverBulanMulai(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-[#059669]"
                  >
                    {BULAN_NAMES.slice(1).map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {idx + 1}. {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bulan Selesai</label>
                  <select
                    value={waiverBulanSelesai}
                    onChange={(e) => setWaiverBulanSelesai(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-[#059669]"
                  >
                    {BULAN_NAMES.slice(1).map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {idx + 1}. {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Keringanan</label>
                <select
                  value={waiverJenis}
                  onChange={(e) => setWaiverJenis(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-xl outline-none focus:border-[#059669]"
                >
                  <option value="Bebas">Bebas Syahriyah (Gratis 100% / Rp 0)</option>
                  <option value="Keringanan">Keringanan Sebagian (Diskon 50%)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan / Alasan (Opsional)</label>
                <textarea
                  rows={2}
                  value={waiverKeterangan}
                  onChange={(e) => setWaiverKeterangan(e.target.value)}
                  placeholder="Contoh: Beasiswa santri berprestasi / tidak mampu"
                  className="w-full px-3 py-2 border rounded-xl outline-none focus:border-[#059669]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setWaiverModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-semibold shadow-xs"
                >
                  Simpan Periode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {isAdmin && santri && (
        <SantriFormModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          santriId={santri.id}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};

export default SantriDetailPage;
