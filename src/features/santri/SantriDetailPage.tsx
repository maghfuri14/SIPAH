import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Santri } from '../../types/santri';
import { santriService } from '../../lib/santriService';
import { SantriFormModal } from './SantriFormModal';
import { authStore } from '../../store/authStore';

type ActiveTab = 'profil' | 'syahriyah' | 'kilatan' | 'timeline';

export const SantriDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = authStore.getUser();
  const isPemilik = user?.role === 'pemilik';

  const [santri, setSantri] = useState<Santri | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('profil');
  const [editModalOpen, setEditModalOpen] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await santriService.getSantriById(id);
      setSantri(data);
    } catch {
      setSantri(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

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
      <div className="p-8 space-y-4 max-w-4xl mx-auto">
        <div className="animate-pulse h-6 bg-slate-200 rounded w-1/4" />
        <div className="animate-pulse h-40 bg-slate-200 rounded-xl" />
        <div className="animate-pulse h-60 bg-slate-200 rounded-xl" />
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">{santri.nama}</h1>
          <p className="text-sm font-mono text-slate-500 mt-0.5">NIS: {santri.nis}</p>
        </div>

        {!isPemilik && (
          <button
            onClick={() => setEditModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold transition-colors shadow-xs"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Data</span>
          </button>
        )}
      </div>

      {/* Profile Card Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 font-bold text-2xl flex items-center justify-center shrink-0 border-2 border-emerald-400">
          {santri.nama.trim().substring(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-medium block mb-1">Kategori Santri</span>
            {santri.kategori === 'Mukim' && (
              <span className="px-2.5 py-0.5 rounded-md font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Mukim
              </span>
            )}
            {santri.kategori === 'Nduduk' && (
              <span className="px-2.5 py-0.5 rounded-md font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                Nduduk
              </span>
            )}
            {santri.kategori === 'Kilatan' && (
              <span className="px-2.5 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Kilatan
              </span>
            )}
          </div>

          <div>
            <span className="text-slate-400 font-medium block mb-1">Status Keaktifan</span>
            {santri.status === 'Aktif' ? (
              <span className="px-2.5 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Aktif
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-md font-semibold bg-red-50 text-red-700 border border-red-200">
                Tidak Aktif
              </span>
            )}
          </div>

          <div>
            <span className="text-slate-400 font-medium block mb-1">Tanggal Masuk</span>
            <span className="font-semibold text-[#0F172A]">{formatDate(santri.tanggal_masuk)}</span>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="border-b border-slate-200 flex gap-6 overflow-x-auto text-sm font-medium">
        {[
          { key: 'profil', label: 'Profil Lengkap', icon: User },
          { key: 'syahriyah', label: 'Riwayat Syahriyah', icon: CreditCard },
          { key: 'kilatan', label: 'Riwayat Kilatan', icon: History },
          { key: 'timeline', label: 'Timeline', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as ActiveTab)}
              className={`pb-3 inline-flex items-center gap-2 transition-colors border-b-2 font-semibold whitespace-nowrap ${
                isActive
                  ? 'border-[#059669] text-[#059669]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'profil' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-6">
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
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center shadow-xs">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">Belum Ada Riwayat Syahriyah</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Belum ada riwayat pembayaran syahriyah untuk santri ini. Modul syahriyah akan tersedia di langkah berikutnya.
            </p>
          </div>
        )}

        {activeTab === 'kilatan' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center shadow-xs">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">Belum Ada Riwayat Kilatan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Belum ada pendaftaran program kilatan untuk santri ini. Modul kilatan akan tersedia di langkah berikutnya.
            </p>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center shadow-xs">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">Belum Ada Aktivitas</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Aktivitas santri akan dicatat secara otomatis saat melakukan transaksi atau pembaruan data.
            </p>
          </div>
        )}
      </div>

      {/* Modal Edit */}
      <SantriFormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        santriId={santri.id}
        onSuccess={loadData}
      />
    </div>
  );
};

export default SantriDetailPage;
