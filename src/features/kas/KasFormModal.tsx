import React, { useState, useEffect } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, Wallet, CheckCircle2 } from 'lucide-react';
import { JenisKas } from '../../types/kas';
import { kasService } from '../../lib/kasService';
import { showToast } from '../../components/ui/Toast';
import { formatThousand, parseThousand } from '../../lib/formatter';
import { KATEGORI_PEMASUKAN, KATEGORI_PENGELUARAN } from '../../lib/constants';

interface KasFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  kasId?: string | null;
  onSuccess: () => void;
}

interface KategoriKasConfig {
  pemasukan: string[];
  pengeluaran: string[];
}

const STORAGE_KEY_KATEGORI_KAS = 'al_hidayah_kategori_kas';

const toKategoriList = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return fallback;

  const categories = value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0
  );

  return categories.length > 0 ? categories : fallback;
};

const getKategoriKas = (): KategoriKasConfig => {
  try {
    const rawKategori = localStorage.getItem(STORAGE_KEY_KATEGORI_KAS);
    const savedKategori = rawKategori ? JSON.parse(rawKategori) : null;

    return {
      pemasukan: toKategoriList(savedKategori?.pemasukan, KATEGORI_PEMASUKAN),
      pengeluaran: toKategoriList(savedKategori?.pengeluaran, KATEGORI_PENGELUARAN),
    };
  } catch {
    return {
      pemasukan: KATEGORI_PEMASUKAN,
      pengeluaran: KATEGORI_PENGELUARAN,
    };
  }
};

export const KasFormModal: React.FC<KasFormModalProps> = ({
  isOpen,
  onClose,
  kasId,
  onSuccess,
}) => {
  const isEdit = Boolean(kasId);

  const [jenis, setJenis] = useState<JenisKas>('Pemasukan');
  const [tanggal, setTanggal] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [kategoriNama, setKategoriNama] = useState('');
  const [displayNominal, setDisplayNominal] = useState('');
  const [rawNominal, setRawNominal] = useState<number>(0);
  const [keterangan, setKeterangan] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [kategoriKas, setKategoriKas] = useState<KategoriKasConfig>({
    pemasukan: KATEGORI_PEMASUKAN,
    pengeluaran: KATEGORI_PENGELUARAN,
  });

  const kategoriOptions = jenis === 'Pemasukan'
    ? kategoriKas.pemasukan
    : kategoriKas.pengeluaran;

  useEffect(() => {
    if (isOpen) {
      setKategoriKas(getKategoriKas());

      setErrors({});
      if (kasId) {
        kasService.getKasById(kasId).then((data) => {
          if (data) {
            setJenis(data.jenis);
            setTanggal(data.tanggal);
            setKategoriNama(data.kategori_nama);
            setRawNominal(data.nominal);
            setDisplayNominal(formatThousand(data.nominal));
            setKeterangan(data.keterangan || '');
          }
        });
      } else {
        setJenis('Pemasukan');
        setTanggal(new Date().toISOString().substring(0, 10));
        setKategoriNama('');
        setRawNominal(0);
        setDisplayNominal('');
        setKeterangan('');
      }
    }
  }, [isOpen, kasId]);

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    const num = parseThousand(inputVal);
    setRawNominal(num);
    setDisplayNominal(formatThousand(num));
    if (errors.nominal) {
      setErrors((prev) => ({ ...prev, nominal: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!tanggal) newErrors.tanggal = 'Tanggal transaksi wajib diisi';
    if (!kategoriNama) newErrors.kategoriNama = 'Kategori wajib dipilih';
    if (!rawNominal || rawNominal <= 0) {
      newErrors.nominal = 'Nominal harus lebih dari Rp 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (isEdit && kasId) {
        await kasService.updateKas(kasId, {
          jenis,
          tanggal,
          kategori_nama: kategoriNama,
          nominal: rawNominal,
          keterangan: keterangan.trim() || undefined,
        });
        showToast('Transaksi kas berhasil diperbarui', 'success');
      } else {
        await kasService.createKas({
          jenis,
          tanggal,
          kategori_nama: kategoriNama,
          nominal: rawNominal,
          keterangan: keterangan.trim() || undefined,
        });
        showToast('Transaksi kas baru berhasil ditambahkan', 'success');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan transaksi kas', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isEdit ? 'Edit Transaksi Kas' : 'Tambah Transaksi Kas'}
              </h2>
              <p className="text-sm text-slate-500">Catat pemasukan atau pengeluaran pondok</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form id="kasForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Jenis Custom Radio Cards */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              Jenis Transaksi <span className="text-red-500">*</span>
            </label>
            <div role="radiogroup" className="grid grid-cols-2 gap-3">
              <button
                type="button"
                role="radio"
                aria-checked={jenis === 'Pemasukan'}
                onClick={() => {
                  if (jenis !== 'Pemasukan') {
                    setJenis('Pemasukan');
                    setKategoriNama('');
                  }
                }}
                className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  jenis === 'Pemasukan'
                    ? 'bg-emerald-50 border-2 border-[#059669] text-[#059669] font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <ArrowDownCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs">Pemasukan (+)</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={jenis === 'Pengeluaran'}
                onClick={() => {
                  if (jenis !== 'Pengeluaran') {
                    setJenis('Pengeluaran');
                    setKategoriNama('');
                  }
                }}
                className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  jenis === 'Pengeluaran'
                    ? 'bg-red-50 border-2 border-red-600 text-red-600 font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <ArrowUpCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span className="text-xs">Pengeluaran (-)</span>
              </button>
            </div>
          </div>

          {/* Row: Tanggal & Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tanggalKas" className="mb-1 block text-sm font-medium text-slate-900">
                Tanggal <span className="text-red-500">*</span>
              </label>
              <input
                id="tanggalKas"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors ${
                  errors.tanggal
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-slate-200 focus:ring-2 focus:ring-emerald-500'
                }`}
              />
              {errors.tanggal && <p className="text-xs text-red-500 mt-1">{errors.tanggal}</p>}
            </div>

            <div>
              <label htmlFor="kategoriKas" className="mb-1 block text-sm font-medium text-slate-900">
                Kategori <span className="text-red-500">*</span>
              </label>
              <select
                id="kategoriKas"
                value={kategoriNama}
                onChange={(e) => {
                  setKategoriNama(e.target.value);
                  if (errors.kategoriNama) {
                    setErrors((prev) => ({ ...prev, kategoriNama: '' }));
                  }
                }}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors bg-white text-slate-700 ${
                  errors.kategoriNama
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-slate-200 focus:ring-2 focus:ring-emerald-500'
                }`}
              >
                <option value="">-- Pilih Kategori --</option>
                {kategoriOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.kategoriNama && <p className="text-xs text-red-500 mt-1">{errors.kategoriNama}</p>}
            </div>
          </div>

          {/* Nominal Input */}
          <div>
            <label htmlFor="nominalKas" className="mb-1 block text-sm font-medium text-slate-900">
              Nominal (Rp) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                Rp
              </span>
              <input
                id="nominalKas"
                type="text"
                value={displayNominal}
                onChange={handleNominalChange}
                placeholder="0"
                className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg outline-none font-semibold transition-colors ${
                  errors.nominal
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-slate-200 focus:ring-2 focus:ring-emerald-500'
                }`}
              />
            </div>
            {errors.nominal && <p className="text-xs text-red-500 mt-1">{errors.nominal}</p>}
          </div>

          {/* Keterangan Textarea */}
          <div>
            <label htmlFor="keteranganKas" className="mb-1 block text-sm font-medium text-slate-900">
              Keterangan (opsional, maks 200 karakter)
            </label>
            <textarea
              id="keteranganKas"
              rows={3}
              maxLength={200}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Rincian atau catatan transaksi kas"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
            />
            <p className="text-[11px] text-slate-400 text-right mt-1">
              {keterangan.length}/200
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <span className="text-xs text-slate-500">* Wajib diisi</span>
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
              form="kasForm"
              disabled={isSubmitting}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-colors disabled:opacity-50 ${
                jenis === 'Pengeluaran'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KasFormModal;
