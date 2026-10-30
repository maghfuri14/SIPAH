import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Download,
  Printer,
  Wallet,
} from 'lucide-react';
import { Santri } from '../../types/santri';
import {
  SyahriyahBulan,
  SyahriyahItemInput,
  IuranTambahanInput,
  SyahriyahTransaksiRecord,
} from '../../types/syahriyah';
import {
  syahriyahService,
} from '../../lib/syahriyahService';
import { santriService } from '../../lib/santriService';
import { showToast } from '../../components/ui/Toast';
import { api } from '../../lib/api';
import { formatRupiah, formatThousand, parseThousand, isBeforeTanggalMasuk } from '../../lib/formatter';
import { generateKwitansiPdf, printKwitansiHtml, printKwitansiThermal } from '../../lib/pdfHelper';

const BULAN_FULL_NAMES = [
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

interface SyahriyahPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  santri: Santri | null; // null if opened via top "+ Catat Pembayaran" button
  tahunAktif: number;
  bulanAktif?: number | null; // 1-12
  onSuccess: () => void;
}

export const SyahriyahPaymentModal: React.FC<SyahriyahPaymentModalProps> = ({
  isOpen,
  onClose,
  santri: initialSantri,
  tahunAktif,
  bulanAktif,
  onSuccess,
}) => {
  // Santri selection state (for null initialSantri)
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [santriSearch, setSantriSearch] = useState('');
  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);

  // Active year navigation in modal
  const [selectedYear, setSelectedYear] = useState<number>(tahunAktif);

  // Month status records for (selectedSantri, selectedYear)
  const [currentYearRecords, setCurrentYearRecords] = useState<SyahriyahBulan[]>([]);

  // Selected items keyed by `${tahun}-${bulan}`
  const [itemInputs, setItemInputs] = useState<Record<string, SyahriyahItemInput>>({});
  const [isLoadingTarifStatus, setIsLoadingTarifStatus] = useState(false);
  const [tarifConfig, setTarifConfig] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isOpen || !selectedSantri?.id) return;
    let cancelled = false;
    setIsLoadingTarifStatus(true);
    Promise.all([api.get('/santri'), api.get('/pengaturan/tarif')]).then(([santriResponse, tarifResponse]) => {
      const data = santriResponse.data;
      const santriApi = (data.data || []).find((item: Santri) => item.id === selectedSantri.id);
      if (!cancelled && santriApi) {
        setSelectedSantri((current) => current ? {
          ...current,
          status_syahriyah: santriApi.status_syahriyah || 'Normal',
        } : current);
      }
      if (!cancelled) setTarifConfig(tarifResponse.data.data || {});
    }).catch(() => undefined).finally(() => {
      if (!cancelled) setIsLoadingTarifStatus(false);
    });
    return () => { cancelled = true; };
  }, [isOpen, selectedSantri?.id]);

  // Additional fees state
  const [iuranTambahan, setIuranTambahan] = useState<IuranTambahanInput[]>([]);

  // Payment detail states
  const [tanggalBayar, setTanggalBayar] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [metode, setMetode] = useState<'Tunai' | 'Transfer' | 'Lainnya'>('Tunai');
  const [keterangan, setKeterangan] = useState('');
  const [isDeclared, setIsDeclared] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Post-submit success view state
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedRecord, setSavedRecord] = useState<SyahriyahTransaksiRecord | null>(null);

  // Load all santri for picker
  useEffect(() => {
    if (isOpen) {
      santriService.getSantriList().then((data) => setSantriList(data));
    }
  }, [isOpen]);

  // Set initial santri, reset year & selection state
  useEffect(() => {
    if (isOpen) {
      const activeSantri = initialSantri;
      setSelectedSantri(activeSantri);
      setSantriSearch('');
      setSelectedYear(tahunAktif);
      setIuranTambahan([]);
      setTanggalBayar(new Date().toISOString().substring(0, 10));
      setMetode('Tunai');
      setKeterangan('');
      setIsDeclared(false);
      setItemInputs({});
      setIsSuccess(false);
      setSavedRecord(null);
    }
  }, [isOpen, initialSantri, tahunAktif]);

  // Fetch month records for selectedSantri & selectedYear
  useEffect(() => {
    if (isOpen && selectedSantri) {
      syahriyahService.getSyahriyahMatrix(selectedYear).then((matrix) => {
        const row = matrix.find((m) => m.santri.id === selectedSantri.id);
        if (row) {
          setCurrentYearRecords(row.records);

          // Auto-select initial bulanAktif if this is the initial setup turn and in matching initial year
          if (
            bulanAktif &&
            selectedYear === tahunAktif &&
            Object.keys(itemInputs).length === 0 &&
            !isSuccess
          ) {
            const targetRec = row.records.find((r) => r.bulan === bulanAktif);
            if (targetRec && targetRec.status !== 'Lunas') {
              const status = selectedSantri.status_syahriyah || 'Normal';
              const tarifEfektif = status === 'Bebas'
                ? 0
                : status === 'Keringanan'
                  ? Math.floor(getTarifDasar(selectedSantri.kategori) / 2)
                  : getTarifDasar(selectedSantri.kategori);
              const sisa = tarifEfektif - targetRec.total_dibayar;
              const key = `${selectedYear}-${bulanAktif}`;
              setItemInputs({
                [key]: {
                  tahun: selectedYear,
                  bulan: bulanAktif,
                  nominal: sisa,
                  jenis: 'Penuh',
                },
              });
            }
          }
        }
      });
    }
  }, [isOpen, selectedSantri, selectedYear, bulanAktif, tahunAktif, isSuccess]);

  // Toggle month selection in selectedYear
  const handleToggleMonth = (bulan: number) => {
    const isBeforeMasuk = isBeforeTanggalMasuk(selectedSantri?.tanggal_masuk, selectedYear, bulan);
    if (!selectedSantri) return;
    if (isBeforeMasuk) return;
    const rec = currentYearRecords.find((r) => r.bulan === bulan);
    if (!rec || rec.status === 'Lunas') return;

    const key = `${selectedYear}-${bulan}`;
    if (itemInputs[key]) {
      // Remove selection
      setItemInputs((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    } else {
      // Add selection
      const baseSisa = rec.nominal_tagihan - rec.total_dibayar;
      const status = selectedSantri.status_syahriyah || 'Normal';
      const sisa = status === 'Bebas'
        ? 0
        : status === 'Keringanan'
          ? Math.floor(getTarifDasar(selectedSantri.kategori) / 2) - rec.total_dibayar
          : baseSisa;
      setItemInputs((prev) => ({
        ...prev,
        [key]: {
          tahun: selectedYear,
          bulan,
          nominal: sisa,
          jenis: 'Penuh',
        },
      }));
    }
  };

  // Item input changes
  const handleJenisChange = (key: string, jenis: 'Penuh' | 'Sebagian') => {
    const item = itemInputs[key];
    if (!item) return;

    const tarif = selectedSantri ? getTarifDasar(selectedSantri.kategori) : 0;
    const sisa = item.nominal || tarif;

    setItemInputs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        jenis,
        nominal: jenis === 'Penuh' ? sisa : Math.floor(sisa / 2),
      },
    }));
  };

  const handleNominalChange = (key: string, valStr: string) => {
    const num = parseThousand(valStr);
    setItemInputs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        nominal: num,
      },
    }));
  };

  // Additional fees helpers
  const getStoredIuranOptions = () => {
    const defaults = [
      { id: 'iur-1', nama: 'Seragam', tipe: 'Keduanya', nominal: 0 },
      { id: 'iur-2', nama: 'Kitab', tipe: 'Syahriyah', nominal: 35000 },
    ];
    try {
      const raw = localStorage.getItem('al_hidayah_iuran_tambahan');
      const list = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(list)) return defaults;
      const options = list.filter((item) =>
        item &&
        typeof item.nama === 'string' &&
        item.nama.trim() &&
        (item.tipe === 'Syahriyah' || item.tipe === 'Keduanya' || !item.tipe)
      );
      return options.length > 0 ? options : defaults;
    } catch {
      return defaults;
    }
  };

  const handleToggleIuran = (option: any, checked: boolean) => {
    const key = option.id || option.nama;
    setIuranTambahan((prev) => {
      if (!checked) return prev.filter((item) => item.id !== key);
      if (prev.some((item) => item.id === key)) return prev;
      return [...prev, {
        id: key,
        nama: option.nama.trim(),
        nominal: Number(option.nominal) || 0,
      }];
    });
  };

  const handleIuranLainChange = (
    id: string,
    value: string
  ) => {
    setIuranTambahan((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, nominal: parseThousand(value) };
        }
        return item;
      })
    );
  };

  // List of selected items across all years
  const selectedItemsList = useMemo(() => {
    return Object.values(itemInputs).sort((a, b) => {
      if (a.tahun !== b.tahun) return a.tahun - b.tahun;
      return a.bulan - b.bulan;
    });
  }, [itemInputs]);

  // Selected keys in other years than selectedYear
  const selectedKeysInOtherYearsCount = useMemo(() => {
    return Object.values(itemInputs).filter((i) => i.tahun !== selectedYear).length;
  }, [itemInputs, selectedYear]);

  // Total Calculation
  const totalItemNominal = useMemo(() => {
    return selectedItemsList.reduce((sum, item) => sum + (item.nominal || 0), 0);
  }, [selectedItemsList]);

  const totalIuranLainNominal = useMemo(() => {
    return iuranTambahan.reduce((sum, item) => sum + (item.nominal || 0), 0);
  }, [iuranTambahan]);

  const totalPembayaran = totalItemNominal + totalIuranLainNominal;

  // Filtered santri for picker
  const filteredSantriPicker = useMemo(() => {
    if (!santriSearch.trim()) return [];
    const q = santriSearch.trim().toLowerCase();
    return santriList.filter(
      (s) => s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q)
    );
  }, [santriList, santriSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) {
      showToast('Pilih santri terlebih dahulu', 'error');
      return;
    }
    if (selectedItemsList.length === 0) {
      showToast('Pilih minimal satu bulan yang akan dibayar', 'error');
      return;
    }
    if (totalPembayaran <= 0) {
      showToast('Nominal pembayaran harus lebih dari Rp 0', 'error');
      return;
    }
    if (!isDeclared) {
      showToast('Centang pernyataan kebenaran pembayaran terlebih dahulu', 'error');
      return;
    }

    for (const item of selectedItemsList) {
      if (selectedSantri && isBeforeTanggalMasuk(selectedSantri.tanggal_masuk, item.tahun, item.bulan)) {
        showToast(`Gagal! Santri belum masuk pada periode ${item.bulan}/${item.tahun}.`, 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const rec = await syahriyahService.simpanPembayaranSyahriyah(
        selectedSantri.id,
        selectedItemsList,
        {
          tanggal_bayar: tanggalBayar,
          metode,
          keterangan: keterangan.trim() || undefined,
          iuran_tambahan: iuranTambahan.filter((i) => i.nama.trim() && i.nominal > 0),
        }
      );

      setSavedRecord(rec);
      setIsSuccess(true);
      showToast(
        `Pembayaran Syahriyah ${selectedSantri.nama} berhasil dicatat & masuk ke Buku Kas!`,
        'success'
      );
      onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Gagal mencatat pembayaran syahriyah', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!savedRecord || !selectedSantri) return;
    generateKwitansiPdf(savedRecord, selectedSantri);
  };

  const handlePrint = () => {
    if (!savedRecord || !selectedSantri) return;
    printKwitansiHtml(savedRecord, selectedSantri);
  };

  const handlePrintThermal = () => {
    if (!savedRecord || !selectedSantri) return;
    printKwitansiThermal(savedRecord, selectedSantri);
  };

  if (!isOpen) return null;

  const getTarifDasar = (kategori: string) => kategori === 'Mukim'
    ? Number(tarifConfig.syahriyah_mukim || 0)
    : kategori === 'Nduduk'
      ? Number(tarifConfig.syahriyah_nduduk || 0)
      : Number(tarifConfig.syahriyah_kilatan || 0);
  const tarifDasarBulan = selectedSantri ? getTarifDasar(selectedSantri.kategori) : 0;
  const statusTarif = selectedSantri?.status_syahriyah || 'Normal';
  const tarifBulan = statusTarif === 'Bebas'
    ? 0
    : statusTarif === 'Keringanan' ? Math.floor(tarifDasarBulan / 2) : tarifDasarBulan;
  const tarifBadgeClass = statusTarif === 'Bebas'
    ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
    : statusTarif === 'Keringanan'
      ? 'border-amber-200 bg-amber-100 text-amber-800'
      : 'border-slate-200 bg-slate-100 text-slate-700';
  const tarifBadgeText = statusTarif === 'Bebas'
    ? 'Bebas Syahriyah (Gratis)'
    : statusTarif === 'Keringanan' ? 'Keringanan (50%)' : 'Tarif Normal (100%)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white h-full sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden">
        {isSuccess && savedRecord && selectedSantri ? (
          /* SUCCESS VIEW WITH 3 ACTION BUTTONS */
          <div className="flex flex-col h-full sm:h-auto p-6 sm:p-8 text-center items-center justify-center space-y-4">
            <button
              onClick={onClose}
              aria-label="Tutup modal"
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[#0F172A]">Pembayaran Berhasil Disimpan!</h3>
              <p className="text-xs text-slate-500 max-w-md">
                Transaksi pembayaran Syahriyah telah berhasil dicatat dan otomatis dibukukan ke Buku Kas Pondok.
              </p>
            </div>

            {/* Receipt Details Summary Card */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">No. Kwitansi:</span>
                <span className="font-mono font-bold text-slate-800">{savedRecord.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Nama Santri:</span>
                <span className="font-bold text-slate-900">{selectedSantri.nama} ({selectedSantri.nis})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tanggal Bayar:</span>
                <span className="font-medium text-slate-800">{tanggalBayar} ({metode})</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-700">Total Nominal:</span>
                <span className="font-bold text-emerald-600 text-sm">
                  {formatRupiah(savedRecord.total_pembayaran)}
                </span>
              </div>
            </div>

            {/* 3 Action Buttons */}
            <div className="grid grid-cols-3 gap-2 w-full mt-6">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh PDF</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak A4</span>
              </button>

              <button
                type="button"
                onClick={handlePrintThermal}
                className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs py-2.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Thermal</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full text-xs text-slate-500 hover:text-slate-800 font-semibold py-1 transition-colors"
            >
              Tutup Modal
            </button>
          </div>
        ) : (
          /* FORM VIEW */
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Catat Pembayaran Syahriyah</h2>
                  <p className="text-sm text-slate-500">
                    Mendukung pembayaran lintas tahun & pencatatan otomatis ke Buku Kas
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Tutup modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content Body */}
            <form id="syahriyahPaymentForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Section 1: Santri Selector if initialSantri is null */}
              {!selectedSantri ? (
                <div className="space-y-3 bg-amber-50/60 border border-amber-200 p-4 rounded-xl">
                  <label className="block text-xs font-bold text-amber-900">
                    Pilih Santri Terlebih Dahulu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={santriSearch}
                      onChange={(e) => setSantriSearch(e.target.value)}
                      placeholder="Ketik nama atau NIS santri..."
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-[#059669] bg-white text-[#0F172A]"
                    />
                  </div>

                  {/* Picker Results Dropdown */}
                  {santriSearch.trim() && (
                    <div className="bg-white border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 shadow-md">
                      {filteredSantriPicker.length === 0 ? (
                        <p className="p-3 text-xs text-slate-500 text-center">Santri tidak ditemukan</p>
                      ) : (
                        filteredSantriPicker.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedSantri(s);
                              setSantriSearch('');
                            }}
                            className="w-full text-left p-3 hover:bg-emerald-50 flex items-center justify-between text-xs transition-colors"
                          >
                            <div>
                              <span className="font-bold text-[#0F172A]">{s.nama}</span>
                              <span className="text-slate-400 ml-2">({s.nis})</span>
                            </div>
                            <span className="font-semibold text-[#059669] px-2 py-0.5 bg-emerald-100 rounded">
                              {s.kategori}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Selected Santri Info Banner */
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#0F172A]">{selectedSantri.nama}</span>
                      <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-slate-200 text-slate-700">
                        {selectedSantri.nis}
                      </span>
                      <span className="px-2 py-0.5 rounded font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200">
                        {selectedSantri.kategori}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${tarifBadgeClass}`}>
                        {isLoadingTarifStatus ? 'Memuat status tarif...' : tarifBadgeText}
                      </span>
                      <span className="text-slate-500">
                        Tarif Iuran: <strong className="text-slate-700">{formatRupiah(tarifBulan)}</strong> / bulan
                      </span>
                    </div>
                  </div>

                  {!initialSantri && (
                    <button
                      type="button"
                      onClick={() => setSelectedSantri(null)}
                      className="text-xs text-emerald-700 hover:underline font-semibold self-start sm:self-center"
                    >
                      Ganti Santri
                    </button>
                  )}
                </div>
              )}

              {selectedSantri && (
                <>
                  {/* Section 2: Year Nav & 12 Months Grid */}
                  <div className="space-y-3">
                    {/* Year Navigation Bar Centered */}
                    <div className="relative bg-slate-100/80 p-2.5 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-center gap-4 my-1">
                        <button
                          type="button"
                          onClick={() => setSelectedYear((y) => y - 1)}
                          className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                          title="Tahun Sebelumnya"
                          aria-label="Tahun Sebelumnya"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded-lg text-sm font-bold text-[#0F172A]">
                          <Calendar className="w-4 h-4 text-[#059669] shrink-0" />
                          <span className="w-16 text-center font-mono">{selectedYear}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedYear((y) => y + 1)}
                          className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                          title="Tahun Berikutnya"
                          aria-label="Tahun Berikutnya"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Cross-Year Badge Indicator */}
                      {selectedKeysInOtherYearsCount > 0 && (
                        <div className="flex justify-center mt-2 sm:absolute sm:right-3 sm:top-1/2 sm:-translate-y-1/2 sm:mt-0">
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            ({selectedKeysInOtherYearsCount} bulan di tahun lain)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 12 Months Grid for selectedYear */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      {BULAN_FULL_NAMES.map((mName, idx) => {
                        const bulanNum = idx + 1;
                        const rec = currentYearRecords.find((r) => r.bulan === bulanNum);
                        const isBeforeMasuk = isBeforeTanggalMasuk(selectedSantri?.tanggal_masuk, selectedYear, bulanNum);
                        const period = new Date(selectedYear, bulanNum - 1, 1);
                        const latestAllowed = new Date();
                        latestAllowed.setMonth(latestAllowed.getMonth() + 12);
                        const isBeyondLimit = period > latestAllowed;
                        const isLunas = rec?.status === 'Lunas' || isBeforeMasuk || statusTarif === 'Bebas' || isBeyondLimit;

                        const itemKey = `${selectedYear}-${bulanNum}`;
                        const isSelected = Boolean(itemInputs[itemKey]);

                        return (
                          <button
                            key={bulanNum}
                            type="button"
                            disabled={isLunas}
                            onClick={() => handleToggleMonth(bulanNum)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                              isLunas
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : isSelected
                                ? 'bg-[#059669] text-white border-[#059669] shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-[#059669]'
                            }`}
                          >
                            <span className="font-bold">{mName.substring(0, 3)}</span>
                            {isBeforeMasuk ? (
                              <span className="text-[10px] text-slate-400 font-normal">Belum Masuk</span>
                            ) : rec?.status === 'Lunas' ? (
                              <span className="text-[10px] text-slate-400 font-normal">Lunas</span>
                            ) : rec?.status === 'Sebagian' ? (
                              <span
                                className={`text-[10px] ${
                                  isSelected ? 'text-emerald-100' : 'text-amber-600'
                                } font-bold`}
                              >
                                Sebagian
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] ${
                                  isSelected ? 'text-emerald-100' : 'text-slate-400'
                                } font-normal`}
                              >
                                Belum
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 3: Item Breakdown Form for All Selected Months Across Years */}
                  {selectedItemsList.length > 0 && (
                    <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Rincian Pembayaran Bulan Terpilih ({selectedItemsList.length} bulan)
                        </h3>
                      </div>

                      <div className="space-y-2.5 divide-y divide-slate-200/80">
                        {selectedItemsList.map((item) => {
                          const itemKey = `${item.tahun}-${item.bulan}`;
                          const mName = BULAN_FULL_NAMES[item.bulan - 1];

                          return (
                            <div
                              key={itemKey}
                              className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="w-36 font-bold text-[#0F172A] flex items-center gap-1.5">
                                <span>{mName} {item.tahun}</span>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200">
                                  <label className="flex items-center gap-1 cursor-pointer font-medium text-slate-700">
                                    <input
                                      type="radio"
                                      name={`jenis_${itemKey}`}
                                      checked={item.jenis === 'Penuh'}
                                      onChange={() => handleJenisChange(itemKey, 'Penuh')}
                                      className="text-[#059669] focus:ring-[#059669]"
                                    />
                                    Penuh
                                  </label>
                                  <label className="flex items-center gap-1 cursor-pointer font-medium text-slate-700 ml-2">
                                    <input
                                      type="radio"
                                      name={`jenis_${itemKey}`}
                                      checked={item.jenis === 'Sebagian'}
                                      onChange={() => handleJenisChange(itemKey, 'Sebagian')}
                                      className="text-[#059669] focus:ring-[#059669]"
                                    />
                                    Sebagian
                                  </label>
                                </div>

                                <div className="w-32">
                                  <input
                                    type="text"
                                    disabled={item.jenis === 'Penuh'}
                                    value={formatThousand(item.nominal)}
                                    onChange={(e) => handleNominalChange(itemKey, e.target.value)}
                                    className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded font-semibold text-right outline-none focus:border-[#059669] disabled:bg-slate-100 disabled:text-slate-600"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section 4: Iuran Tambahan (Opsional) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Iuran Tambahan / Lainnya (Opsional)
                      </label>
                    </div>

                    {getStoredIuranOptions().map((option) => {
                      const key = option.id || option.nama;
                      const selected = iuranTambahan.find((item) => item.id === key);
                      return (
                        <label key={key} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg">
                          <input
                            type="checkbox"
                            checked={Boolean(selected)}
                            onChange={(e) => handleToggleIuran(option, e.target.checked)}
                            className="accent-[#059669]"
                          />
                          <span className="flex-1 text-xs font-medium text-slate-700">
                            {option.nama} - Rp {Number(option.nominal || 0).toLocaleString('id-ID')}
                          </span>
                          {selected && (
                            <input
                              type="text"
                              aria-label={`Nominal ${option.nama}`}
                              value={formatThousand(selected.nominal)}
                              onChange={(e) => handleIuranLainChange(key, e.target.value)}
                              className="w-32 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none font-semibold text-right focus:border-[#059669]"
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {/* Section 5: Detail Pembayaran */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="tanggalBayarSyahriyah" className="mb-1 block text-sm font-medium text-slate-900">
                        Tanggal Bayar <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="tanggalBayarSyahriyah"
                        type="date"
                        value={tanggalBayar}
                        onChange={(e) => setTanggalBayar(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-[#059669]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-900">
                        Metode Pembayaran <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-3 pt-1 text-xs font-medium text-slate-700">
                        {(['Tunai', 'Transfer', 'Lainnya'] as const).map((m) => (
                          <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="metodeBayar"
                              checked={metode === m}
                              onChange={() => setMetode(m)}
                              className="text-[#059669] focus:ring-[#059669]"
                            />
                            {m}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="ketSyahriyah" className="mb-1 block text-sm font-medium text-slate-900">
                      Keterangan Tambahan (opsional)
                    </label>
                    <textarea
                      id="ketSyahriyah"
                      rows={2}
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Catatan kwitansi atau referensi transfer"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-[#059669]"
                    />
                  </div>

                  {/* Section 6: Checkbox Pernyataan Bendahara */}
                  <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="pernyataanBendahara"
                      checked={isDeclared}
                      onChange={(e) => setIsDeclared(e.target.checked)}
                      className="mt-0.5 rounded border-emerald-400 text-[#059669] focus:ring-[#059669]"
                    />
                    <label htmlFor="pernyataanBendahara" className="text-xs text-emerald-900 font-medium cursor-pointer">
                      Saya (bendahara) menyatakan pembayaran ini telah diterima secara benar dan sah. Transaksi akan langsung tercatat ke Buku Kas Pondok.
                    </label>
                  </div>
                </>
              )}
            </form>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <span className="text-xs text-slate-500 block">Total Pembayaran:</span>
                <span className="text-lg font-bold text-[#059669]">
                  {formatRupiah(totalPembayaran)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="syahriyahPaymentForm"
                  disabled={
                    isSubmitting ||
                    !selectedSantri ||
                    selectedItemsList.length === 0 ||
                    totalPembayaran <= 0 ||
                    !isDeclared ||
                    statusTarif === 'Bebas'
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isSubmitting ? 'Memproses...' : 'Simpan Pembayaran'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SyahriyahPaymentModal;
