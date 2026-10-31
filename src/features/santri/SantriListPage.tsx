import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Download,
  Upload,
  Search,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  SearchX,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { useSantriList } from './useSantriList';
import { SantriFormModal } from './SantriFormModal';
import { ToastContainer, showToast } from '../../components/ui/Toast';
import { authStore } from '../../store/authStore';
import { santriService } from '../../lib/santriService';
import { Santri, StatusSyahriyahSantri, StatusKilatanSantri } from '../../types/santri';

export const SantriListPage: React.FC = () => {
  const navigate = useNavigate();
  const user = authStore.getUser();
  const isPemilik = user?.role === 'pemilik';
  const isSuperAdmin = user?.role === 'super_admin';
  const canBulkAction = user?.role === 'super_admin' || user?.role === 'admin';
  const canEditSyahriyahStatus = canBulkAction;

  const {
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    filterKategori,
    setFilterKategori,
    filterStatus,
    setFilterStatus,
    sortBy,
    sortOrder,
    toggleSort,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalFiltered,
    totalPages,
    paginated,
    resetFilter,
    refresh,
    handleToggleStatus,
  } = useSantriList();

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSantriId, setSelectedSantriId] = useState<string | null>(null);
  const [deleteConfirmSantri, setDeleteConfirmSantri] = useState<{ id: string; nama: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmAction, setBulkConfirmAction] = useState<
    'Aktifkan' | 'Nonaktifkan' | 'Hapus' | null
  >(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [syahriyahStatusSantri, setSyahriyahStatusSantri] = useState<Santri | null>(null);
  const [syahriyahStatusValue, setSyahriyahStatusValue] =
    useState<StatusSyahriyahSantri>('Normal');
  const [kilatanStatusValue, setKilatanStatusValue] =
    useState<StatusKilatanSantri>('Normal');
  const [bulkSyahriyahModalOpen, setBulkSyahriyahModalOpen] = useState(false);
  const [bulkSyahriyahStatus, setBulkSyahriyahStatus] =
    useState<StatusSyahriyahSantri>('Normal');
  const [bulkKilatanStatus, setBulkKilatanStatus] =
    useState<StatusKilatanSantri>('Normal');
  const selectAllRef = useRef<HTMLInputElement>(null);

  const paginatedIds = paginated.map((santri) => santri.id);
  const selectedOnPageCount = paginatedIds.filter((id) => selectedIds.has(id)).length;
  const allOnPageSelected = paginatedIds.length > 0 && selectedOnPageCount === paginatedIds.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedOnPageCount > 0 && !allOnPageSelected;
    }
  }, [selectedOnPageCount, allOnPageSelected]);

  const toggleSelectedSantri = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginatedIds.forEach((id) => next.delete(id));
      } else {
        paginatedIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelectedSantri = () => setSelectedIds(new Set());

  const openSyahriyahStatusModal = (santri: Santri) => {
    setSyahriyahStatusSantri(santri);
    setSyahriyahStatusValue(santri.status_syahriyah || 'Normal');
    setKilatanStatusValue(santri.status_kilatan || 'Normal');
  };

  const handleSaveSyahriyahStatus = async () => {
    if (!syahriyahStatusSantri) return;

    try {
      await santriService.updateSantri(syahriyahStatusSantri.id, {
        status_syahriyah: syahriyahStatusValue,
        status_kilatan: kilatanStatusValue,
      });
      showToast('Status Syahriyah dan Kilatan berhasil diperbarui', 'success');
      setSyahriyahStatusSantri(null);
      await refresh();
    } catch {
      showToast('Gagal memperbarui status modul santri', 'error');
    }
  };

  const handleSaveBulkSyahriyahStatus = async () => {
    try {
      await santriService.updateStatusPermanenBulk(
        Array.from(selectedIds),
        bulkSyahriyahStatus,
        bulkKilatanStatus,
      );
      showToast(`Status permanen ${selectedIds.size} santri berhasil diperbarui`, 'success');
      setBulkSyahriyahModalOpen(false);
      clearSelectedSantri();
      await refresh();
    } catch {
      showToast('Gagal memperbarui status permanen santri terpilih', 'error');
    }
  };

  const handleBulkConfirm = async () => {
    if (!bulkConfirmAction) return;

    setIsBulkProcessing(true);
    try {
      if (bulkConfirmAction === 'Hapus') {
        await santriService.deleteSantriBulk(Array.from(selectedIds));
        showToast(`${selectedIds.size} santri berhasil dihapus`, 'success');
      } else {
        const status = bulkConfirmAction === 'Aktifkan' ? 'Aktif' : 'Tidak Aktif';
        await santriService.updateSantriStatus(Array.from(selectedIds), status);
        showToast(`${selectedIds.size} santri berhasil diperbarui`, 'success');
      }
      setBulkConfirmAction(null);
      clearSelectedSantri();
      await refresh();
    } catch {
      showToast(
        bulkConfirmAction === 'Hapus'
          ? 'Gagal menghapus santri terpilih'
          : 'Gagal memperbarui status santri terpilih',
        'error'
      );
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmSantri) return;
    try {
      await santriService.deleteSantri(deleteConfirmSantri.id);
      showToast('Data berhasil dihapus', 'success');
      refresh();
    } catch {
      showToast('Gagal menghapus data santri', 'error');
    } finally {
      setDeleteConfirmSantri(null);
    }
  };

  const openAddModal = () => {
    setSelectedSantriId(null);
    setModalOpen(true);
  };

  const openEditModal = (id: string) => {
    setSelectedSantriId(id);
    setModalOpen(true);
  };

  const handleExport = () => {
    alert('Export data santri ke Excel/CSV akan tersedia di modul berikutnya');
  };

  const handleImport = () => {
    alert('Import data santri dari Excel akan tersedia di modul berikutnya');
  };

  // Pagination calculation
  const startItem = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalFiltered);

  return (
    <div className="space-y-6 pb-12">
      <ToastContainer />

      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Data Santri</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data santri pondok — total {totalFiltered} santri
          </p>
        </div>

        {/* Action Buttons (Hidden for pemilik role) */}
        {!isPemilik && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleImport}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors shadow-xs"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Import</span>
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export</span>
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Santri</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
          {/* Search Input */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari NIS, nama, wali, atau HP..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] bg-white text-[#0F172A]"
            />
          </div>

          {/* Kategori Dropdown */}
          <div>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] bg-white text-slate-700"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Mukim">Mukim</option>
              <option value="Nduduk">Nduduk</option>
              <option value="Kilatan">Kilatan</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] bg-white text-slate-700"
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Tidak Aktif">Tidak Aktif</option>
            </select>
          </div>

          {/* Reset Button */}
          <div className="flex justify-start sm:justify-end">
            <button
              onClick={resetFilter}
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
              {selectedIds.size} Santri Terpilih
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkConfirmAction('Aktifkan')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
              >
                Aktifkan
              </button>
              <button
                type="button"
                onClick={() => setBulkConfirmAction('Nonaktifkan')}
                className="px-3 py-1.5 rounded-lg bg-slate-600 text-white text-xs font-semibold hover:bg-slate-700"
              >
                Nonaktifkan
              </button>
              <button
                type="button"
                onClick={() => {
                  setBulkSyahriyahStatus('Normal');
                  setBulkKilatanStatus('Normal');
                  setBulkSyahriyahModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Ubah Status Permanen
              </button>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setBulkConfirmAction('Hapus')}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                >
                  Hapus
                </button>
              )}
              <button
                type="button"
                onClick={clearSelectedSantri}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                Batal
              </button>
            </div>
          </div>
        )}
        {/* Error State */}
        {error ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="text-sm font-medium text-slate-700">{error}</p>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700"
            >
              Coba Lagi
            </button>
          </div>
        ) : isLoading ? (
          /* Loading Skeleton State */
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 py-3 px-2 border-b border-slate-100">
                <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                </div>
                <div className="w-20 h-6 bg-slate-200 rounded-full" />
                <div className="w-16 h-6 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : paginated.length === 0 ? (
          /* Empty / No Results State */
          <div className="p-12 text-center">
            {searchQuery || filterKategori !== 'Semua' || filterStatus !== 'Semua' ? (
              <div className="space-y-3">
                <SearchX className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-semibold text-[#0F172A]">Tidak ada santri cocok</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Coba ubah kata kunci pencarian atau sesuaikan filter
                </p>
                <button
                  onClick={resetFilter}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <UserX className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-semibold text-[#0F172A]">Belum ada data santri</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Mulai dengan menambahkan data santri pertama pondok
                </p>
                {!isPemilik && (
                  <button
                    onClick={openAddModal}
                    className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Tambah Santri Pertama
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Responsive Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0] text-xs font-semibold uppercase text-slate-500 select-none">
                  <th scope="col" className="w-10 px-4 py-3 text-center">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      disabled={!canBulkAction || paginatedIds.length === 0}
                      aria-label="Pilih semua"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAllOnPage}
                      className="rounded border-slate-300 text-[#059669] disabled:opacity-50"
                    />
                  </th>
                  <th scope="col" className="w-[60px] px-2 py-3 text-center">
                    Foto
                  </th>
                  <th scope="col" className="px-4 py-3 cursor-pointer hover:bg-slate-100/70" onClick={() => toggleSort('nis')}>
                    <div className="flex items-center gap-1.5">
                      <span>NIS</span>
                      {sortBy === 'nis' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#059669]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#059669]" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-4 py-3 cursor-pointer hover:bg-slate-100/70" onClick={() => toggleSort('nama')}>
                    <div className="flex items-center gap-1.5">
                      <span>Nama Santri</span>
                      {sortBy === 'nama' && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#059669]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#059669]" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-4 py-3">Nama Wali</th>
                  <th scope="col" className="px-4 py-3">Kategori</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="min-w-[140px] px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginated.map((santri) => (
                  <tr
                    key={santri.id}
                    onClick={() => navigate(`/santri/${santri.id}`)}
                    className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        disabled={!canBulkAction}
                        aria-label={`Pilih ${santri.nama}`}
                        checked={selectedIds.has(santri.id)}
                        onChange={() => toggleSelectedSantri(santri.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-slate-300 text-[#059669] disabled:opacity-50"
                      />
                    </td>
                    <td className="px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center mx-auto border border-emerald-300 shrink-0">
                        {santri.nama.trim().substring(0, 2).toUpperCase()}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 font-medium whitespace-nowrap">
                      {santri.nis}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#0F172A] whitespace-nowrap group-hover:text-[#059669] transition-colors">
                      <div>{santri.nama}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(santri.status_syahriyah || 'Normal') !== 'Normal' && (
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            santri.status_syahriyah === 'Bebas'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            Syahriyah: {santri.status_syahriyah === 'Bebas' ? 'Bebas' : 'Keringanan'}
                          </span>
                        )}
                        {(santri.status_kilatan || 'Normal') !== 'Normal' && (
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            santri.status_kilatan === 'Bebas'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            Kilatan: {santri.status_kilatan === 'Bebas' ? 'Bebas' : 'Keringanan'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {santri.nama_wali}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {santri.kategori === 'Mukim' && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Mukim
                        </span>
                      )}
                      {santri.kategori === 'Nduduk' && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          Nduduk
                        </span>
                      )}
                      {santri.kategori === 'Kilatan' && (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Kilatan
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {santri.status === 'Aktif' ? (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          Tidak Aktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        {/* 1. Lihat Detail */}
                        <button
                          onClick={() => navigate(`/santri/${santri.id}`)}
                          title="Lihat Detail"
                          aria-label={`Lihat detail ${santri.nama}`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {!isPemilik && (
                          <>
                            {/* 2. Edit Data */}
                            <button
                              onClick={() => openEditModal(santri.id)}
                              title="Edit Data"
                              aria-label={`Edit ${santri.nama}`}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {canEditSyahriyahStatus && (
                              <button
                                onClick={() => openSyahriyahStatusModal(santri)}
                                  title={
                                    `Syahriyah: ${(santri.status_syahriyah || 'Normal')}; Kilatan: ${(santri.status_kilatan || 'Normal')}`
                                  }
                                aria-label={`Ubah status Syahriyah dan Kilatan ${santri.nama}`}
                                className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${
                                  (santri.status_syahriyah || 'Normal') === 'Normal'
                                    ? 'text-slate-400'
                                    : (santri.status_syahriyah || 'Normal') === 'Keringanan'
                                      ? 'text-amber-500'
                                      : 'text-emerald-600'
                                }`}
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                            )}

                            {/* 3. Toggle Status */}
                            <button
                              onClick={() => handleToggleStatus(santri)}
                              title={santri.status === 'Aktif' ? 'Nonaktifkan Santri' : 'Aktifkan Santri'}
                              aria-label={santri.status === 'Aktif' ? `Nonaktifkan ${santri.nama}` : `Aktifkan ${santri.nama}`}
                              className={`p-1.5 rounded-lg transition-colors ${
                                santri.status === 'Aktif'
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {santri.status === 'Aktif' ? (
                                <UserX className="w-4 h-4" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
                            </button>

                            {/* 4. Hapus Data (Khusus Super Admin) */}
                            {isSuperAdmin && (
                              <button
                                onClick={() => setDeleteConfirmSantri({ id: santri.id, nama: santri.nama })}
                                title="Hapus Data"
                                aria-label={`Hapus ${santri.nama}`}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
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

        {/* Footer Tabel & Pagination */}
        {!isLoading && !error && paginated.length > 0 && (
          <div className="p-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 bg-slate-50/50">
            <div>
              Menampilkan <span className="font-semibold text-[#0F172A]">{startItem}-{endItem}</span> dari{' '}
              <span className="font-semibold text-[#0F172A]">{totalFiltered}</span> santri
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Page Size Dropdown */}
              <div className="flex items-center gap-2">
                <span>Per halaman:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 border border-slate-200 rounded-md bg-white text-slate-700 outline-none focus:border-[#059669]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded-md font-medium text-xs flex items-center justify-center transition-colors ${
                      currentPage === p
                        ? 'bg-[#059669] text-white font-bold'
                        : 'border border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal Add/Edit */}
      <SantriFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        santriId={selectedSantriId}
        onSuccess={refresh}
      />

      {/* Modal Konfirmasi Hapus Kustom */}
      {deleteConfirmSantri && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setDeleteConfirmSantri(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">Hapus Data Santri</h3>
                <p className="text-xs text-slate-500 font-semibold">{deleteConfirmSantri.nama}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="-mx-6 mt-2 flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                onClick={() => setDeleteConfirmSantri(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {syahriyahStatusSantri && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setSyahriyahStatusSantri(null)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 z-10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-[#0F172A]">
              Status Global (Permanen): {syahriyahStatusSantri.nama}
            </h3>
            <p className="text-xs text-slate-500">
              Status ini akan dipakai jika tidak ditimpa oleh Periode Keringanan.
            </p>

            <div className="space-y-2">
              {([
                ['Normal', 'Normal (Bayar Penuh)'],
                ['Keringanan', 'Keringanan (50%)'],
                ['Bebas', 'Bebas Syahriyah (Gratis)'],
              ] as [StatusSyahriyahSantri, string][]).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                    syahriyahStatusValue === value
                      ? 'border-[#059669] bg-emerald-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="statusSyahriyah"
                    value={value}
                    checked={syahriyahStatusValue === value}
                    onChange={() => setSyahriyahStatusValue(value)}
                    className="accent-[#059669]"
                  />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </label>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-2">
              <p className="text-xs font-bold text-slate-800">Status Kilatan (Permanen)</p>
              {([
                ['Normal', 'Normal (Bayar Penuh)'],
                ['Keringanan', 'Keringanan (50%)'],
                ['Bebas', 'Bebas Kilatan (Gratis)'],
              ] as [StatusKilatanSantri, string][]).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                    kilatanStatusValue === value ? 'border-[#059669] bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="statusKilatan"
                    value={value}
                    checked={kilatanStatusValue === value}
                    onChange={() => setKilatanStatusValue(value)}
                    className="accent-[#059669]"
                  />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </label>
              ))}
            </div>

            <div className="-mx-6 mt-2 flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setSyahriyahStatusSantri(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSyahriyahStatus}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkSyahriyahModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setBulkSyahriyahModalOpen(false)}
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex-shrink-0 border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-bold text-[#0F172A]">
              Ubah Status Permanen untuk {selectedIds.size} Santri
            </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status Syahriyah (Permanen)</p>
              {([
                ['Normal', 'Normal (Bayar)'],
                ['Keringanan', 'Keringanan (50%)'],
                ['Bebas', 'Bebas Syahriyah'],
              ] as [StatusSyahriyahSantri, string][]).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                    bulkSyahriyahStatus === value
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="bulkStatusSyahriyah"
                    checked={bulkSyahriyahStatus === value}
                    onChange={() => setBulkSyahriyahStatus(value)}
                    className="accent-amber-500"
                  />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status Kilatan (Permanen)</p>
              {([
                ['Normal', 'Normal (Bayar)'],
                ['Keringanan', 'Keringanan (50%)'],
                ['Bebas', 'Bebas Kilatan'],
              ] as [StatusKilatanSantri, string][]).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                    bulkKilatanStatus === value
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="bulkStatusKilatan"
                    checked={bulkKilatanStatus === value}
                    onChange={() => setBulkKilatanStatus(value)}
                    className="accent-amber-500"
                  />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </label>
              ))}
            </div>
            </div>

            <div className="flex flex-shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setBulkSyahriyahModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveBulkSyahriyahStatus}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Bulk Action */}
      {bulkConfirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => {
              if (!isBulkProcessing) setBulkConfirmAction(null);
            }}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-slate-700">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  bulkConfirmAction === 'Hapus' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A]">Konfirmasi Aksi Massal</h3>
            </div>

            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin {bulkConfirmAction.toLowerCase()} {selectedIds.size} santri terpilih?
            </p>

            <div className="-mx-6 mt-2 flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => setBulkConfirmAction(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={handleBulkConfirm}
                className={`px-4 py-2 rounded-lg text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 ${
                  bulkConfirmAction === 'Hapus'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[#059669] hover:bg-[#047857]'
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

export default SantriListPage;
