import React, { useState, useEffect, useRef } from 'react';
import {
  UserPlus,
  Search,
  RotateCcw,
  CheckCircle,
  XCircle,
  Eye,
  ArrowRight,
  SearchX,
  UserX,
} from 'lucide-react';
import { Pendaftaran, StatusPendaftaran } from '../../types/pendaftaran';
import { pendaftaranService } from '../../lib/pendaftaranService';
import { PendaftaranFormModal } from './PendaftaranFormModal';
import { KonversiModal } from './KonversiModal';
import { ToastContainer, showToast } from '../../components/ui/Toast';
import { authStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export const PendaftaranListPage: React.FC = () => {
  const navigate = useNavigate();
  const user = authStore.getUser();
  const isPemilik = user?.role === 'pemilik';
  const canBulkAction = user?.role === 'super_admin' || user?.role === 'admin';

  const [pendaftaranList, setPendaftaranList] = useState<Pendaftaran[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [konversiModalOpen, setKonversiModalOpen] = useState(false);
  const [selectedPendaftaran, setSelectedPendaftaran] = useState<Pendaftaran | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusAction, setBulkStatusAction] = useState<'Diterima' | 'Ditolak' | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await pendaftaranService.getPendaftaranList();
      setPendaftaranList(data);
    } catch {
      showToast('Gagal memuat data pendaftaran', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: StatusPendaftaran) => {
    try {
      await pendaftaranService.updateStatusPendaftaran(id, newStatus);
      showToast(`Status pendaftaran diubah menjadi "${newStatus}"`, 'success');
      loadData();
    } catch {
      showToast('Gagal memperbarui status', 'error');
    }
  };

  const openKonversiModal = (p: Pendaftaran) => {
    setSelectedPendaftaran(p);
    setKonversiModalOpen(true);
  };

  // Filter calculation
  const filteredList = pendaftaranList.filter((item) => {
    if (filterStatus !== 'Semua' && item.status !== filterStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchCalon = item.nama_calon.toLowerCase().includes(q);
      const matchWali = item.nama_wali.toLowerCase().includes(q);
      const matchHpSantri = item.no_hp_santri.includes(q);
      const matchHpWali = item.no_hp_wali.includes(q);
      return matchCalon || matchWali || matchHpSantri || matchHpWali;
    }
    return true;
  });

  const filteredIds = filteredList.map((item) => item.id);
  const selectedOnListCount = filteredIds.filter((id) => selectedIds.has(id)).length;
  const allFilteredSelected =
    filteredIds.length > 0 && selectedOnListCount === filteredIds.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedOnListCount > 0 && !allFilteredSelected;
    }
  }, [selectedOnListCount, allFilteredSelected]);

  const toggleSelectedPendaftaran = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredIds.forEach((id) => {
        if (allFilteredSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  const clearSelectedPendaftaran = () => setSelectedIds(new Set());

  const handleBulkStatus = async () => {
    if (!bulkStatusAction) return;

    setIsBulkProcessing(true);
    try {
      await pendaftaranService.updateStatusPendaftaranBulk(
        Array.from(selectedIds),
        bulkStatusAction
      );
      showToast(
        `${selectedIds.size} pendaftar berhasil ${
          bulkStatusAction === 'Diterima' ? 'diterima' : 'ditolak'
        }`,
        'success'
      );
      setBulkStatusAction(null);
      clearSelectedPendaftaran();
      await loadData();
    } catch {
      showToast('Gagal memperbarui status pendaftar terpilih', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <ToastContainer />

      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Pendaftaran Santri</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data pendaftaran calon santri baru
          </p>
        </div>

        {!isPemilik && (
          <button
            onClick={() => setFormModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pendaftar</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-center">
          {/* Search Input */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama calon, wali, atau no. HP..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] bg-white text-[#0F172A]"
            />
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] bg-white text-slate-700"
            >
              <option value="Semua">Semua Status</option>
              <option value="Baru">Baru</option>
              <option value="Diterima">Diterima</option>
              <option value="Ditolak">Ditolak</option>
              <option value="Menjadi Santri">Menjadi Santri</option>
            </select>
          </div>

          {/* Reset Button */}
          <div className="flex justify-start sm:justify-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('Semua');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors rounded-lg hover:bg-slate-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {canBulkAction && selectedIds.size > 0 && (
          <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-3">
            <span className="text-sm font-semibold text-emerald-900">
              {selectedIds.size} Pendaftar Terpilih
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkStatusAction('Diterima')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Terima
              </button>
              <button
                type="button"
                onClick={() => setBulkStatusAction('Ditolak')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
              >
                <XCircle className="w-3.5 h-3.5" />
                Tolak
              </button>
              <button
                type="button"
                onClick={clearSelectedPendaftaran}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                Batal
              </button>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 py-3 px-2 border-b border-slate-100">
                <div className="h-4 bg-slate-200 rounded w-1/5" />
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-4 bg-slate-200 rounded w-1/5" />
                <div className="h-6 bg-slate-200 rounded-full w-20" />
              </div>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center">
            {searchQuery || filterStatus !== 'Semua' ? (
              <div className="space-y-3">
                <SearchX className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-semibold text-[#0F172A]">Tidak ada pendaftar cocok</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Coba ubah kata kunci pencarian atau sesuaikan filter status
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('Semua');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <UserX className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-semibold text-[#0F172A]">Belum Ada Pendaftar Santri</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Tambahkan calon pendaftar santri baru untuk memulai proses seleksi
                </p>
                {!isPemilik && (
                  <button
                    onClick={() => setFormModalOpen(true)}
                    className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Tambah Pendaftar Pertama
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0] text-xs font-semibold uppercase text-slate-500 select-none">
                  <th scope="col" className="w-10 px-4 py-3 text-center">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      disabled={!canBulkAction || filteredIds.length === 0}
                      aria-label="Pilih semua pendaftar"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-[#059669] disabled:opacity-50"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3">Tgl Daftar</th>
                  <th scope="col" className="px-4 py-3">Nama Calon</th>
                  <th scope="col" className="px-4 py-3">Nama Wali</th>
                  <th scope="col" className="px-4 py-3">Kategori</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="min-w-[140px] px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td
                      className="px-4 py-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        disabled={!canBulkAction}
                        aria-label={`Pilih ${item.nama_calon}`}
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelectedPendaftaran(item.id)}
                        className="rounded border-slate-300 text-[#059669] disabled:opacity-50"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600 whitespace-nowrap">
                      {formatDateStr(item.tanggal_pendaftaran)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#0F172A] whitespace-nowrap">
                      {item.nama_calon}
                      <span className="block text-xs font-normal text-slate-400">
                        {item.no_hp_santri}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {item.nama_wali}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.kategori === 'Mukim' && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Mukim
                        </span>
                      )}
                      {item.kategori === 'Nduduk' && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          Nduduk
                        </span>
                      )}
                      {item.kategori === 'Kilatan' && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Kilatan
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.status === 'Baru' && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Baru
                        </span>
                      )}
                      {item.status === 'Diterima' && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Diterima
                        </span>
                      )}
                      {item.status === 'Ditolak' && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          Ditolak
                        </span>
                      )}
                      {item.status === 'Menjadi Santri' && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-[#059669]" />
                          Menjadi Santri
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {/* 1. Lihat Detail / Ke Profil Santri */}
                        {item.status === 'Menjadi Santri' && item.santri_id ? (
                          <button
                            onClick={() => navigate(`/santri/${item.santri_id}`)}
                            title="Lihat Profil Santri"
                            aria-label={`Lihat profil santri ${item.nama_calon}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => openKonversiModal(item)}
                            title="Lihat Detail / Konversi"
                            aria-label={`Lihat detail ${item.nama_calon}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}

                        {!isPemilik && item.status !== 'Menjadi Santri' && (
                          <>
                            {/* 2. Terima Pendaftaran */}
                            <button
                              onClick={() => handleUpdateStatus(item.id, 'Diterima')}
                              title="Terima Pendaftaran"
                              aria-label={`Terima pendaftaran ${item.nama_calon}`}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>

                            {/* 3. Tolak Pendaftaran */}
                            <button
                              onClick={() => handleUpdateStatus(item.id, 'Ditolak')}
                              title="Tolak Pendaftaran"
                              aria-label={`Tolak pendaftaran ${item.nama_calon}`}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>

                            {/* 4. Konversi ke Santri */}
                            {(item.status === 'Baru' || item.status === 'Diterima') && (
                              <button
                                onClick={() => openKonversiModal(item)}
                                title="Konversi ke Santri"
                                aria-label={`Konversi ${item.nama_calon} ke santri`}
                                className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100/70 transition-colors"
                              >
                                <UserPlus className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <PendaftaranFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={loadData}
      />

      <KonversiModal
        isOpen={konversiModalOpen}
        pendaftaran={selectedPendaftaran}
        onClose={() => setKonversiModalOpen(false)}
        onSuccess={loadData}
      />

      {bulkStatusAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => {
              if (!isBulkProcessing) setBulkStatusAction(null);
            }}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  bulkStatusAction === 'Ditolak'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {bulkStatusAction === 'Ditolak' ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
              </div>
              <h3 className="text-lg font-bold text-[#0F172A]">Konfirmasi Aksi Massal</h3>
            </div>

            <p className="text-sm text-slate-600">
              Yakin ingin {bulkStatusAction === 'Diterima' ? 'Menerima' : 'Menolak'} {selectedIds.size} pendaftar terpilih?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => setBulkStatusAction(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={handleBulkStatus}
                className={`px-4 py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-50 ${
                  bulkStatusAction === 'Ditolak'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isBulkProcessing ? 'Memproses...' : 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendaftaranListPage;
