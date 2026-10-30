import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  RotateCcw,
  Edit,
  Trash2,
  Wallet,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  SearchX,
} from 'lucide-react';
import { Kas } from '../../types/kas';
import { kasService } from '../../lib/kasService';
import { KasFormModal } from './KasFormModal';
import { ToastContainer, showToast } from '../../components/ui/Toast';
import { authStore } from '../../store/authStore';
import { formatRupiah } from '../../lib/formatter';
import { KATEGORI_PEMASUKAN, KATEGORI_PENGELUARAN } from '../../lib/constants';

export const KasListPage: React.FC = () => {
  const user = authStore.getUser();
  const isPemilik = user?.role === 'pemilik';
  const isSuperAdmin = user?.role === 'super_admin';

  const [kasList, setKasList] = useState<Kas[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState<string>('Semua');
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedKasId, setSelectedKasId] = useState<string | null>(null);
  const [deleteConfirmKas, setDeleteConfirmKas] = useState<Kas | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await kasService.getKasList();
      setKasList(data);
    } catch {
      showToast('Gagal memuat data kas', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Overall Totals (independent of table filters)
  const totalPemasukan = useMemo(() => {
    return kasList
      .filter((k) => k.jenis === 'Pemasukan')
      .reduce((sum, k) => sum + k.nominal, 0);
  }, [kasList]);

  const totalPengeluaran = useMemo(() => {
    return kasList
      .filter((k) => k.jenis === 'Pengeluaran')
      .reduce((sum, k) => sum + k.nominal, 0);
  }, [kasList]);

  const saldoKas = totalPemasukan - totalPengeluaran;

  // Filtered List for Table
  const filteredList = useMemo(() => {
    return kasList.filter((item) => {
      // Jenis Filter
      if (filterJenis !== 'Semua' && item.jenis !== filterJenis) {
        return false;
      }
      // Kategori Filter
      if (filterKategori !== 'Semua' && item.kategori_nama !== filterKategori) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchKet = (item.keterangan || '').toLowerCase().includes(q);
        const matchKat = item.kategori_nama.toLowerCase().includes(q);
        if (!matchKet && !matchKat) return false;
      }
      // Date Range Filter
      if (startDate && item.tanggal < startDate) {
        return false;
      }
      if (endDate && item.tanggal > endDate) {
        return false;
      }

      return true;
    });
  }, [kasList, filterJenis, filterKategori, searchQuery, startDate, endDate]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterJenis('Semua');
    setFilterKategori('Semua');
    setStartDate('');
    setEndDate('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmKas) return;
    try {
      await kasService.deleteKas(deleteConfirmKas.id);
      showToast('Transaksi kas berhasil dihapus', 'success');
      loadData();
    } catch {
      showToast('Gagal menghapus transaksi kas', 'error');
    } finally {
      setDeleteConfirmKas(null);
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
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Kas Pondok</h1>
          <p className="text-sm text-slate-500 mt-1">
            Catatan pemasukan dan pengeluaran keuangan pondok
          </p>
        </div>

        {!isPemilik && (
          <button
            onClick={() => {
              setSelectedKasId(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Transaksi</span>
          </button>
        )}
      </div>

      {/* Ringkasan Saldo Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Saldo Kas */}
        <div className="bg-[#059669] text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
              Saldo Kas
            </span>
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs">
              <Wallet className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight">
              {formatRupiah(saldoKas)}
            </div>
            <p className="text-[11px] text-emerald-100 mt-1">
              Selisih total pemasukan dan pengeluaran
            </p>
          </div>
        </div>

        {/* Card 2: Total Pemasukan */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Total Pemasukan
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-700 tracking-tight">
              {formatRupiah(totalPemasukan)}
            </div>
            <p className="text-[11px] text-emerald-600 mt-1">Akumulasi seluruh pemasukan</p>
          </div>
        </div>

        {/* Card 3: Total Pengeluaran */}
        <div className="bg-red-50/70 border border-red-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-red-800 uppercase tracking-wider">
              Total Pengeluaran
            </span>
            <div className="p-2 rounded-xl bg-red-100 text-red-700">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-red-700 tracking-tight">
              {formatRupiah(totalPengeluaran)}
            </div>
            <p className="text-[11px] text-red-600 mt-1">Akumulasi seluruh pengeluaran</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari keterangan atau kategori..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] bg-white text-[#0F172A]"
            />
          </div>

          {/* Jenis Dropdown */}
          <div>
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] bg-white text-slate-700"
            >
              <option value="Semua">Semua Jenis</option>
              <option value="Pemasukan">Pemasukan</option>
              <option value="Pengeluaran">Pengeluaran</option>
            </select>
          </div>

          {/* Kategori Dropdown */}
          <div>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] bg-white text-slate-700"
            >
              <option value="Semua">Semua Kategori</option>
              {filterJenis === 'Pemasukan' &&
                KATEGORI_PEMASUKAN.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              {filterJenis === 'Pengeluaran' &&
                KATEGORI_PENGELUARAN.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              {filterJenis === 'Semua' &&
                Array.from(new Set([...KATEGORI_PEMASUKAN, ...KATEGORI_PENGELUARAN])).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
            </select>
          </div>

          {/* Reset Filter Button */}
          <div className="flex justify-start sm:justify-end">
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors rounded-lg hover:bg-slate-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Date Filter Range */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <span className="font-semibold text-slate-500">Rentang Tanggal:</span>
          <div className="flex items-center gap-1.5">
            <span>Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-[#059669] bg-white text-slate-700"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span>Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-[#059669] bg-white text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 py-3 px-2 border-b border-slate-100">
                <div className="h-4 bg-slate-200 rounded w-1/6" />
                <div className="h-5 bg-slate-200 rounded-full w-20" />
                <div className="h-4 bg-slate-200 rounded w-1/5" />
                <div className="h-4 bg-slate-200 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center">
            {searchQuery || filterJenis !== 'Semua' || filterKategori !== 'Semua' || startDate || endDate ? (
              <div className="space-y-3">
                <SearchX className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-semibold text-[#0F172A]">Tidak ada transaksi cocok</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Coba sesuaikan kata kunci pencarian, kategori, atau filter rentang tanggal
                </p>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-semibold text-[#0F172A]">Belum Ada Transaksi Kas</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Mulai catat pemasukan dan pengeluaran keuangan pondok
                </p>
                {!isPemilik && (
                  <button
                    onClick={() => {
                      setSelectedKasId(null);
                      setModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Tambah Transaksi Pertama
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
                  <th scope="col" className="px-4 py-3">Tanggal</th>
                  <th scope="col" className="px-4 py-3">Jenis</th>
                  <th scope="col" className="px-4 py-3">Kategori</th>
                  <th scope="col" className="px-4 py-3">Nominal</th>
                  <th scope="col" className="px-4 py-3">Keterangan</th>
                  <th scope="col" className="min-w-[100px] px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-xs font-medium text-slate-600 whitespace-nowrap">
                      {formatDateStr(item.tanggal)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.jenis === 'Pemasukan' ? (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Pemasukan
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          Pengeluaran
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#0F172A] whitespace-nowrap">
                      {item.kategori_nama}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono">
                      {item.jenis === 'Pemasukan' ? (
                        <span className="text-emerald-600 font-semibold">
                          + {formatRupiah(item.nominal)}
                        </span>
                      ) : (
                        <span className="text-red-600 font-semibold">
                          - {formatRupiah(item.nominal)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs truncate max-w-xs">
                      {item.keterangan || '-'}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {!isPemilik && (
                          <button
                            onClick={() => {
                              setSelectedKasId(item.id);
                              setModalOpen(true);
                            }}
                            title="Edit Transaksi"
                            aria-label="Edit transaksi kas"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {isSuperAdmin && (
                          <button
                            onClick={() => setDeleteConfirmKas(item)}
                            title="Hapus Transaksi"
                            aria-label="Hapus transaksi kas"
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Modal Form Tambah/Edit */}
      <KasFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        kasId={selectedKasId}
        onSuccess={loadData}
      />

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmKas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setDeleteConfirmKas(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-10 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">Hapus Transaksi Kas</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  {deleteConfirmKas.kategori_nama} — {formatRupiah(deleteConfirmKas.nominal)}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Yakin ingin menghapus catatan transaksi ini? Saldo kas akan dihitung ulang.
            </p>

            <div className="-mx-6 mt-2 flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                onClick={() => setDeleteConfirmKas(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                Hapus Transaksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KasListPage;
