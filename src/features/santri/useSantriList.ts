import { useState, useEffect, useMemo, useCallback } from 'react';
import { Santri, KategoriSantri, StatusSantri } from '../../types/santri';
import { santriService } from '../../lib/santriService';
import { showToast } from '../../components/ui/Toast';

export function useSantriList() {
  const [rawSantri, setRawSantri] = useState<Santri[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');

  // Sort states
  const [sortBy, setSortBy] = useState<'nis' | 'nama'>('nis');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Debounce search query 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on search change
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load data from service
  const loadSantri = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await santriService.getSantriList();
      setRawSantri(data);
    } catch {
      setError('Gagal memuat data santri. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSantri();
  }, [loadSantri]);

  // Filtered santri
  const filtered = useMemo(() => {
    return rawSantri.filter((s) => {
      // Category filter
      if (filterKategori !== 'Semua' && s.kategori !== filterKategori) {
        return false;
      }
      // Status filter
      if (filterStatus !== 'Semua' && s.status !== filterStatus) {
        return false;
      }
      // Search query filter (matches NIS, nama, nama_wali, no_hp_santri, no_hp_wali)
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.trim().toLowerCase();
        const matchesNis = s.nis.toLowerCase().includes(q);
        const matchesNama = s.nama.toLowerCase().includes(q);
        const matchesWali = s.nama_wali.toLowerCase().includes(q);
        const matchesHpSantri = s.no_hp_santri.includes(q);
        const matchesHpWali = s.no_hp_wali.includes(q);

        return matchesNis || matchesNama || matchesWali || matchesHpSantri || matchesHpWali;
      }

      return true;
    });
  }, [rawSantri, filterKategori, filterStatus, debouncedSearch]);

  // Sorted santri
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA = a[sortBy].toLowerCase();
      let valB = b[sortBy].toLowerCase();

      if (sortBy === 'nis') {
        valA = a.nis;
        valB = b.nis;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortBy, sortOrder]);

  // Paginated santri
  const totalFiltered = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  const paginated = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sorted.slice(startIndex, startIndex + pageSize);
  }, [sorted, currentPage, pageSize]);

  // Actions
  const resetFilter = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setFilterKategori('Semua');
    setFilterStatus('Semua');
    setCurrentPage(1);
  };

  const toggleSort = (col: 'nis' | 'nama') => {
    if (sortBy === col) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus santri "${nama}"?`)) {
      try {
        await santriService.deleteSantri(id);
        showToast(`Santri "${nama}" berhasil dihapus`, 'success');
        loadSantri();
      } catch {
        showToast('Gagal menghapus santri', 'error');
      }
    }
  };

  const handleToggleStatus = async (s: Santri) => {
    const newStatus: StatusSantri = s.status === 'Aktif' ? 'Tidak Aktif' : 'Aktif';
    try {
      await santriService.updateSantri(s.id, { status: newStatus });
      showToast(`Status santri "${s.nama}" diubah menjadi ${newStatus}`, 'success');
      loadSantri();
    } catch {
      showToast('Gagal mengubah status santri', 'error');
    }
  };

  return {
    rawSantri,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    filterKategori,
    setFilterKategori: (cat: string) => {
      setFilterKategori(cat);
      setCurrentPage(1);
    },
    filterStatus,
    setFilterStatus: (stat: string) => {
      setFilterStatus(stat);
      setCurrentPage(1);
    },
    sortBy,
    sortOrder,
    toggleSort,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size);
      setCurrentPage(1);
    },
    totalFiltered,
    totalPages,
    paginated,
    resetFilter,
    refresh: loadSantri,
    handleDelete,
    handleToggleStatus,
  };
}

export default useSantriList;
