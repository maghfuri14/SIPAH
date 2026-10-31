import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Search,
  RotateCcw,
  Check,
  Clock,
  SearchX,
  Calendar,
} from 'lucide-react';
import { KilatanEvent, EventKilatan } from '../../types/kilatan';
import { Santri } from '../../types/santri';
import { kilatanService, KILATAN_EVENTS } from '../../lib/kilatanService';
import { formatRupiah, isKilatanBeforeTanggalMasuk } from '../../lib/formatter';
import { ToastContainer, showToast } from '../../components/ui/Toast';
import { KilatanPaymentModal } from './KilatanPaymentModal';
import { waiverService } from '../../lib/waiverService';

interface MatrixRow {
  santri: Santri;
  records: KilatanEvent[];
}

export const KilatanListPage: React.FC = () => {
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Payment Modal states
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [activeSantri, setActiveSantri] = useState<Santri | null>(null);
  const [activeEvent, setActiveEvent] = useState<EventKilatan | null>(null);

  const [matrixData, setMatrixData] = useState<MatrixRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkJenis, setBulkJenis] = useState<'Bebas' | 'Keringanan'>('Keringanan');
  const [bulkBulanMulai, setBulkBulanMulai] = useState(1);
  const [bulkBulanSelesai, setBulkBulanSelesai] = useState(12);
  const [bulkKeterangan, setBulkKeterangan] = useState('');
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const loadMatrix = async () => {
    setIsLoading(true);
    try {
      const data = await kilatanService.getKilatanMatrix(tahun);
      setMatrixData(data);
    } catch {
      showToast('Gagal memuat matriks event kilatan', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, [tahun]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterKategori, searchQuery, tahun]);

  // Filtered matrix rows
  const filteredMatrix = useMemo(() => {
    return matrixData.filter(({ santri }) => {
      if (filterKategori !== 'Semua' && santri.kategori !== filterKategori) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchNama = santri.nama.toLowerCase().includes(q);
        const matchNis = santri.nis.toLowerCase().includes(q);
        const matchWali = santri.nama_wali.toLowerCase().includes(q);
        if (!matchNama && !matchNis && !matchWali) return false;
      }
      return true;
    });
  }, [matrixData, filterKategori, searchQuery]);

  // Paginated Matrix
  const totalFiltered = filteredMatrix.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const paginatedMatrix = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMatrix.slice(start, start + pageSize);
  }, [filteredMatrix, currentPage, pageSize]);

  const startItem = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalFiltered);

  const handleCellClick = (santri: Santri, record: KilatanEvent) => {
    const isBeforeMasuk = isKilatanBeforeTanggalMasuk(santri.tanggal_masuk, tahun, record.event);
    if (isBeforeMasuk || santri.status_kilatan === 'Bebas') return;
    setActiveSantri(santri);
    setActiveEvent(record.event);
    setPaymentModalOpen(true);
  };

  const handleTambahPembayaran = () => {
    setActiveSantri(null);
    setActiveEvent(null);
    setPaymentModalOpen(true);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const saveBulkWaiver = async () => {
    if (!selectedIds.size || bulkBulanMulai > bulkBulanSelesai) return;
    setIsBulkSaving(true);
    try {
      await waiverService.addWaiverBulk(Array.from(selectedIds), {
        tahun,
        bulan_mulai: bulkBulanMulai,
        bulan_selesai: bulkBulanSelesai,
        jenis: bulkJenis,
        tipe: 'Kilatan',
        keterangan: bulkKeterangan.trim() || undefined,
      });
      showToast(`Keringanan massal berhasil dibuat untuk ${selectedIds.size} santri`, 'success');
      setBulkModalOpen(false);
      setSelectedIds(new Set());
      await loadMatrix();
    } catch (error: any) {
      showToast(error?.message || 'Gagal membuat keringanan massal', 'error');
    } finally {
      setIsBulkSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <ToastContainer />

      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Kilatan
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Rekap matriks iuran event berkala pondok
          </p>
        </div>

        <button
          onClick={handleTambahPembayaran}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold transition-colors shadow-xs"
        >
          <CreditCard className="w-4 h-4" />
          <span>+ Catat Pembayaran</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-center">
          {/* Search Bar */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama santri, NIS, atau wali..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] bg-white text-[#0F172A]"
            />
          </div>

          {/* Tahun Dropdown */}
          <div>
            <select
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669] bg-white text-slate-700 font-semibold"
            >
              <option value={2024}>Tahun 2024</option>
              <option value={2025}>Tahun 2025</option>
              <option value={2026}>Tahun 2026</option>
              <option value={2027}>Tahun 2027</option>
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
              <option value="Mukim">Mukim</option>
              <option value="Nduduk">Nduduk</option>
              <option value="Kilatan">Kilatan</option>
            </select>
          </div>
        </div>

        {/* Reset Filter Action */}
        {(searchQuery || filterKategori !== 'Semua' || tahun !== new Date().getFullYear()) && (
          <div className="flex justify-end pt-3 border-t border-slate-100 mt-3">
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterKategori('Semua');
                setTahun(new Date().getFullYear());
              }}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors py-1 px-2.5 rounded-md hover:bg-slate-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-30 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg">
          <span className="text-sm font-semibold text-emerald-900">{selectedIds.size} santri terpilih</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-xs font-semibold text-slate-600">Batal</button>
            <button type="button" onClick={() => setBulkModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
              <Calendar className="h-3.5 w-3.5" />
              Beri Keringanan Massal
            </button>
          </div>
        </div>
      )}

      {/* Matriks Table Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex gap-3 items-center">
                <div className="w-44 h-8 bg-slate-200 rounded-md shrink-0" />
                <div className="flex-1 grid grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-8 bg-slate-200 rounded-md" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredMatrix.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <SearchX className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-[#0F172A]">Tidak Ada Santri Cocok</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              Coba sesuaikan kata kunci pencarian atau filter kategori
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterKategori('Semua');
                setTahun(2025);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="overflow-auto max-h-[600px] relative">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="sticky top-0 z-20 bg-slate-100 border-b border-[#E2E8F0] text-xs font-semibold text-slate-700 select-none">
                  {/* Top-Left Sticky Corner Header */}
                  <th
                    scope="col"
                    className="sticky top-0 left-0 z-30 bg-slate-100 px-3 py-3 border-r border-b border-[#E2E8F0] min-w-[210px] shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <input type="checkbox" aria-label="Pilih semua santri pada halaman"
                        checked={paginatedMatrix.length > 0 && paginatedMatrix.every(({ santri }) => selectedIds.has(santri.id))}
                        onChange={(event) => setSelectedIds((current) => {
                          const next = new Set(current);
                          paginatedMatrix.forEach(({ santri }) => event.target.checked ? next.add(santri.id) : next.delete(santri.id));
                          return next;
                        })}
                        className="h-4 w-4 accent-emerald-600" />
                      <span>Santri / Event</span>
                    </div>
                  </th>
                  {KILATAN_EVENTS.map((eventName) => (
                    <th
                      key={eventName}
                      scope="col"
                      className="sticky top-0 z-20 bg-slate-100 px-2 py-3 text-center border-r border-b border-[#E2E8F0] min-w-[120px] font-bold text-xs text-slate-700"
                    >
                      {eventName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedMatrix.map(({ santri, records }) => (
                  <tr key={santri.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Sticky left column for santri name */}
                    <td
                      className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/90 px-3 py-2.5 border-r border-slate-200 min-w-[210px] shadow-xs transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2 font-bold text-[#0F172A]">
                        <input type="checkbox" checked={selectedIds.has(santri.id)} onChange={() => toggleSelected(santri.id)} aria-label={`Pilih ${santri.nama}`} className="h-4 w-4 shrink-0 accent-emerald-600" />
                        <span className="truncate max-w-[160px]">{santri.nama}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-mono text-slate-600">{santri.nis}</span>
                        <span>•</span>
                        <span className="font-medium text-[#059669]">{santri.kategori}</span>
                      </div>
                    </td>

                    {/* 4 Event Cells */}
                    {records.map((rec) => {
                      const sisaTagihan = rec.nominal_tagihan - rec.total_dibayar;
                      const isBeforeMasuk = isKilatanBeforeTanggalMasuk(santri.tanggal_masuk, tahun, rec.event);
                      const isBebas = santri.status_kilatan === 'Bebas';
                      return (
                        <td
                          key={rec.event}
                          onClick={() => handleCellClick(santri, rec)}
                          className={`p-1.5 text-center border-r border-slate-100 select-none relative group/cell ${
                            isBeforeMasuk || isBebas ? 'cursor-not-allowed bg-slate-50/60' : 'cursor-pointer'
                          }`}
                        >
                          {/* Custom Floating Hover Tooltip */}
                          <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 opacity-0 group-hover/cell:opacity-100 transition-opacity duration-150 pointer-events-none z-30 whitespace-nowrap shadow-lg">
                            {isBeforeMasuk ? (
                              <div className="bg-slate-800 text-white font-medium text-[11px] px-2.5 py-1 rounded-md shadow-md border border-slate-700">
                                Santri belum masuk pada bulan ini.
                              </div>
                            ) : isBebas ? (
                              <div className="w-full py-1.5 px-2 rounded-md bg-emerald-50 text-emerald-700 font-medium text-[11px] border border-emerald-100 flex items-center justify-center">
                                Bebas
                              </div>
                            ) : rec.status === 'Lunas' && (
                              <div className="bg-emerald-800 text-white font-medium text-[11px] px-2.5 py-1 rounded-md shadow-md border border-emerald-700">
                                Lunas: {formatRupiah(rec.nominal_tagihan)}
                              </div>
                            )}

                            {rec.status === 'Sebagian' && (
                              <div className="bg-amber-800 text-white font-medium text-[11px] px-2.5 py-1 rounded-md shadow-md border border-amber-700">
                                Kurang: {formatRupiah(sisaTagihan)}
                              </div>
                            )}

                            {rec.status === 'Belum' && (
                              <div className="bg-slate-800 text-white font-medium text-[11px] px-2.5 py-1 rounded-md shadow-md border border-slate-700">
                                Belum Bayar
                              </div>
                            )}
                          </div>

                          {/* Cell Badge */}
                          {isBeforeMasuk ? (
                            <div className="w-full py-1.5 px-2 rounded-md bg-slate-100 text-slate-400 font-medium text-[11px] border border-slate-200 flex items-center justify-center">
                              <span>—</span>
                            </div>
                          ) : rec.status === 'Lunas' && (
                            <div className="w-full py-1.5 px-2 rounded-md bg-emerald-100/80 hover:bg-emerald-200/90 text-emerald-800 font-bold text-[11px] border border-emerald-200 flex items-center justify-center gap-1 transition-colors shadow-2xs">
                              <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span>Lunas</span>
                            </div>
                          )}

                          {rec.status === 'Sebagian' && (
                            <div className="w-full py-1.5 px-2 rounded-md bg-amber-100/80 hover:bg-amber-200/90 text-amber-800 font-bold text-[11px] border border-amber-200 flex items-center justify-center gap-1 transition-colors shadow-2xs">
                              <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span>Sebagian</span>
                            </div>
                          )}

                          {rec.status === 'Belum' && (
                            <div className="w-full py-1.5 px-2 rounded-md bg-slate-100 hover:bg-slate-200/70 text-slate-400 font-medium text-[11px] border border-slate-200 flex items-center justify-center transition-colors">
                              <span>—</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Tabel & Pagination Controls */}
        {!isLoading && filteredMatrix.length > 0 && (
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
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-slate-200 rounded-md bg-white text-slate-700 outline-none focus:border-[#059669]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {/* Legend Warna */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-5 flex-wrap">
          <span className="font-bold text-slate-700">Keterangan Status:</span>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300 inline-block shrink-0" />
            <span className="text-slate-600 font-medium">Lunas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300 inline-block shrink-0" />
            <span className="text-slate-600 font-medium">Bayar Sebagian</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300 inline-block shrink-0" />
            <span className="text-slate-600 font-medium">Belum Bayar</span>
          </div>
        </div>

        <div className="text-slate-400 italic">
          * Klik sel event untuk mencatat pembayaran iuran Kilatan santri
        </div>
      </div>

      {/* Modal Pembayaran Kilatan */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/50" onClick={() => !isBulkSaving && setBulkModalOpen(false)} />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
            <div className="flex-shrink-0 border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">Periode Keringanan Massal</h2>
              <p className="mt-1 text-sm text-slate-500">{selectedIds.size} santri terpilih</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Tahun
                <input type="number" value={tahun} readOnly className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-slate-700">Jenis Keringanan
                <select value={bulkJenis} onChange={(e) => setBulkJenis(e.target.value as 'Bebas' | 'Keringanan')} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
                  <option value="Keringanan">Keringanan 50%</option>
                  <option value="Bebas">Bebas</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">Bulan Mulai
                <select value={bulkBulanMulai} onChange={(e) => setBulkBulanMulai(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">Bulan Selesai
                <select value={bulkBulanSelesai} onChange={(e) => setBulkBulanSelesai(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
                  {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                </select>
              </label>
              <label className="col-span-2 text-sm font-medium text-slate-700">Keterangan
                <textarea value={bulkKeterangan} onChange={(e) => setBulkKeterangan(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>
              </div>
            </div>
            <div className="flex flex-shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4 rounded-b-2xl">
              <button type="button" onClick={() => setBulkModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Batal</button>
              <button type="button" disabled={isBulkSaving || bulkBulanMulai > bulkBulanSelesai} onClick={saveBulkWaiver} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Simpan</button>
            </div>
          </div>
        </div>
      )}
      <KilatanPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        santri={activeSantri}
        tahunAktif={tahun}
        eventAktif={activeEvent}
        onSuccess={loadMatrix}
      />
    </div>
  );
};

export default KilatanListPage;
