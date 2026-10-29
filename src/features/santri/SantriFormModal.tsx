import React, { useState, useEffect } from 'react';
import { X, Upload, Check, Home, Building2, Calendar, UserCheck, UserX, Wand2 } from 'lucide-react';
import { Santri, KategoriSantri, StatusSantri, StatusSyahriyahSantri } from '../../types/santri';
import { santriService } from '../../lib/santriService';
import { pendaftaranService } from '../../lib/pendaftaranService';
import { showToast } from '../../components/ui/Toast';

interface SantriFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  santriId?: string | null;
  onSuccess: () => void;
}

export const SantriFormModal: React.FC<SantriFormModalProps> = ({
  isOpen,
  onClose,
  santriId,
  onSuccess,
}) => {
  const isEdit = Boolean(santriId);

  // Form states
  const [nis, setNis] = useState('');
  const [nama, setNama] = useState('');
  const [namaWali, setNamaWali] = useState('');
  const [noHpSantri, setNoHpSantri] = useState('');
  const [noHpWali, setNoHpWali] = useState('');
  const [kategori, setKategori] = useState<KategoriSantri>('Mukim');
  const [status, setStatus] = useState<StatusSantri>('Aktif');
  const [statusSyahriyah, setStatusSyahriyah] = useState<StatusSyahriyahSantri>('Normal');
  const [tanggalMasuk, setTanggalMasuk] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [catatan, setCatatan] = useState('');

  // Validation & Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nisError, setNisError] = useState<string | null>(null);
  const [isNisValid, setIsNisValid] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset or load existing data
  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setNisError(null);
      setIsNisValid(false);

      if (santriId) {
        santriService.getSantriById(santriId).then((data) => {
          if (data) {
            setNis(data.nis);
            setNama(data.nama);
            setNamaWali(data.nama_wali);
            setNoHpSantri(data.no_hp_santri);
            setNoHpWali(data.no_hp_wali);
            setKategori(data.kategori);
            setStatus(data.status);
            setStatusSyahriyah(data.status_syahriyah || 'Normal');
            setTanggalMasuk(data.tanggal_masuk);
            setCatatan(data.catatan || '');
            setIsNisValid(true);
          }
        });
      } else {
        // Reset to default for new record
        setNis('');
        setNama('');
        setNamaWali('');
        setNoHpSantri('');
        setNoHpWali('');
        setKategori('Mukim');
        setStatus('Aktif');
        setStatusSyahriyah('Normal');
        setTanggalMasuk(new Date().toISOString().substring(0, 10));
        setCatatan('');
      }
    }
  }, [isOpen, santriId]);

  // Handle NIS Blur for uniqueness validation
  const handleNisBlur = async () => {
    if (!nis.trim()) {
      setNisError('NIS wajib diisi');
      setIsNisValid(false);
      return;
    }
    if (nis.trim().length < 3) {
      setNisError('NIS minimal 3 karakter');
      setIsNisValid(false);
      return;
    }

    const isUnik = await santriService.checkNisUnik(nis.trim(), santriId || undefined);
    if (!isUnik) {
      setNisError('NIS sudah digunakan');
      setIsNisValid(false);
    } else {
      setNisError(null);
      setIsNisValid(true);
    }
  };

  const generateNisBaru = async () => {
    try {
      const generated = await pendaftaranService.generateAutoNis();
      setNis(generated);
      setNisError(null);
      setIsNisValid(true);
    } catch {
      const fallback = `${new Date().getFullYear()}031`;
      setNis(fallback);
      setNisError(null);
      setIsNisValid(true);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!nis.trim()) newErrors.nis = 'NIS wajib diisi';
    if (!nama.trim()) newErrors.nama = 'Nama santri wajib diisi';
    if (!namaWali.trim()) newErrors.namaWali = 'Nama wali wajib diisi';

    // Phone validation (format 08xxxxxxxxxx, 10-15 digits)
    const phoneRegex = /^08[0-9]{8,13}$/;
    if (!noHpSantri.trim()) {
      newErrors.noHpSantri = 'No HP santri wajib diisi';
    } else if (!phoneRegex.test(noHpSantri.trim())) {
      newErrors.noHpSantri = 'Format No HP tidak valid (contoh: 081234567890)';
    }

    if (!noHpWali.trim()) {
      newErrors.noHpWali = 'No HP wali wajib diisi';
    } else if (!phoneRegex.test(noHpWali.trim())) {
      newErrors.noHpWali = 'Format No HP tidak valid (contoh: 081234567890)';
    }

    if (!tanggalMasuk) newErrors.tanggalMasuk = 'Tanggal masuk wajib diisi';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && !nisError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (isEdit && santriId) {
        await santriService.updateSantri(santriId, {
          nis: nis.trim(),
          nama: nama.trim(),
          nama_wali: namaWali.trim(),
          no_hp_santri: noHpSantri.trim(),
          no_hp_wali: noHpWali.trim(),
          kategori,
          status,
          status_syahriyah: statusSyahriyah,
          tanggal_masuk: tanggalMasuk,
          catatan: catatan.trim() || undefined,
        });
        showToast('Data santri berhasil diperbarui', 'success');
      } else {
        await santriService.createSantri({
          nis: nis.trim(),
          nama: nama.trim(),
          nama_wali: namaWali.trim(),
          no_hp_santri: noHpSantri.trim(),
          no_hp_wali: noHpWali.trim(),
          kategori,
          status,
          status_syahriyah: statusSyahriyah,
          tanggal_masuk: tanggalMasuk,
          catatan: catatan.trim() || undefined,
        });
        showToast('Santri baru berhasil ditambahkan', 'success');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan data santri', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-white h-full sm:h-auto sm:max-h-[92vh] rounded-none sm:rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-slate-50 shrink-0">
          <h2 className="text-lg font-semibold text-[#0F172A]">
            {isEdit ? 'Edit Data Santri' : 'Tambah Santri Baru'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form id="santriForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Foto Upload UI */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-[#059669] font-bold text-xl flex items-center justify-center shrink-0">
              {nama.trim() ? nama.trim().substring(0, 2).toUpperCase() : 'ST'}
            </div>
            <div>
              <button
                type="button"
                onClick={() => alert('Upload foto akan diaktifkan di modul berikutnya')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                Pilih Foto
              </button>
              <p className="text-[11px] text-slate-500 mt-1">Opsional, maks 2MB (JPG/PNG)</p>
            </div>
          </div>

          {/* Row 2: NIS & Nama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nis" className="block text-xs font-semibold text-slate-700 mb-1">
                NIS <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    id="nis"
                    type="text"
                    value={nis}
                    onChange={(e) => {
                      setNis(e.target.value);
                      setNisError(null);
                    }}
                    onBlur={handleNisBlur}
                    placeholder="Contoh: 2024001"
                    className={`w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors ${
                      nisError
                        ? 'border-red-500 ring-1 ring-red-500'
                        : isNisValid
                        ? 'border-emerald-500 ring-1 ring-emerald-500'
                        : 'border-slate-300 focus:border-[#059669] focus:ring-1 focus:ring-[#059669]'
                    }`}
                  />
                  {isNisValid && !nisError && (
                    <Check className="w-4 h-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={generateNisBaru}
                  title="Generate NIS Otomatis"
                  aria-label="Generate NIS Otomatis"
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200 shrink-0 transition-colors"
                >
                  <Wand2 className="w-4 h-4" />
                </button>
              </div>
              {nisError ? (
                <p className="text-xs text-red-500 mt-1">{nisError}</p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1">Klik ikon 🪄 untuk generate otomatis.</p>
              )}
            </div>

            <div>
              <label htmlFor="nama" className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Santri <span className="text-red-500">*</span>
              </label>
              <input
                id="nama"
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Nama lengkap santri"
                className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors ${
                  errors.nama
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-slate-300 focus:border-[#059669] focus:ring-1 focus:ring-[#059669]'
                }`}
              />
              {errors.nama && <p className="text-xs text-red-500 mt-1">{errors.nama}</p>}
            </div>
          </div>

          {/* Row 3: Nama Wali & Tanggal Masuk */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="namaWali" className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Wali <span className="text-red-500">*</span>
              </label>
              <input
                id="namaWali"
                type="text"
                value={namaWali}
                onChange={(e) => setNamaWali(e.target.value)}
                placeholder="Nama bapak/wali santri"
                className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors ${
                  errors.namaWali
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-slate-300 focus:border-[#059669] focus:ring-1 focus:ring-[#059669]'
                }`}
              />
              {errors.namaWali && <p className="text-xs text-red-500 mt-1">{errors.namaWali}</p>}
            </div>

            <div>
              <label htmlFor="tanggalMasuk" className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Masuk <span className="text-red-500">*</span>
              </label>
              <input
                id="tanggalMasuk"
                type="date"
                value={tanggalMasuk}
                onChange={(e) => setTanggalMasuk(e.target.value)}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors ${
                  errors.tanggalMasuk
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-slate-300 focus:border-[#059669] focus:ring-1 focus:ring-[#059669]'
                }`}
              />
              {errors.tanggalMasuk && <p className="text-xs text-red-500 mt-1">{errors.tanggalMasuk}</p>}
            </div>
          </div>

          {/* Row 4: No HP Santri & No HP Wali */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="noHpSantri" className="block text-xs font-semibold text-slate-700 mb-1">
                No HP Santri <span className="text-red-500">*</span>
              </label>
              <input
                id="noHpSantri"
                type="tel"
                value={noHpSantri}
                onChange={(e) => setNoHpSantri(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors ${
                  errors.noHpSantri
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-slate-300 focus:border-[#059669] focus:ring-1 focus:ring-[#059669]'
                }`}
              />
              {errors.noHpSantri && <p className="text-xs text-red-500 mt-1">{errors.noHpSantri}</p>}
            </div>

            <div>
              <label htmlFor="noHpWali" className="block text-xs font-semibold text-slate-700 mb-1">
                No HP Wali <span className="text-red-500">*</span>
              </label>
              <input
                id="noHpWali"
                type="tel"
                value={noHpWali}
                onChange={(e) => setNoHpWali(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors ${
                  errors.noHpWali
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-slate-300 focus:border-[#059669] focus:ring-1 focus:ring-[#059669]'
                }`}
              />
              {errors.noHpWali && <p className="text-xs text-red-500 mt-1">{errors.noHpWali}</p>}
            </div>
          </div>

          {/* Row 5: Kategori Custom Radio Group */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Kategori Santri <span className="text-red-500">*</span>
            </label>
            <div role="radiogroup" aria-label="Kategori Santri" className="grid grid-cols-3 gap-2.5">
              {[
                { value: 'Mukim', icon: Home, desc: 'Tinggal di pondok' },
                { value: 'Nduduk', icon: Building2, desc: 'Laju/Pulang pergi' },
                { value: 'Kilatan', icon: Calendar, desc: 'Program khusus' },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = kategori === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setKategori(opt.value as KategoriSantri)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-emerald-50 border-2 border-[#059669] text-[#059669] font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold">{opt.value}</span>
                    <span className="text-[10px] text-slate-500 font-normal hidden sm:block">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Syahriyah Radio Group (Below Kategori) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Status Syahriyah <span className="text-red-500">*</span>
            </label>
            <div role="radiogroup" aria-label="Status Syahriyah" className="grid grid-cols-3 gap-2.5">
              {[
                { value: 'Normal', label: 'Normal (Bayar)' },
                { value: 'Bebas', label: 'Bebas Syahriyah' },
                { value: 'Keringanan', label: 'Keringanan (50%)' },
              ].map((opt) => {
                const isSelected = statusSyahriyah === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setStatusSyahriyah(opt.value as any)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-2 border-[#059669] text-[#059669] font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <span className="text-xs font-bold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 6: Status Custom Radio Group */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Status Santri <span className="text-red-500">*</span>
            </label>
            <div role="radiogroup" aria-label="Status Santri" className="grid grid-cols-2 gap-2.5">
              {[
                { value: 'Aktif', icon: UserCheck, color: 'emerald' },
                { value: 'Tidak Aktif', icon: UserX, color: 'red' },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setStatus(opt.value as StatusSantri)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                      isSelected
                        ? opt.value === 'Aktif'
                          ? 'bg-emerald-50 border-2 border-emerald-600 text-emerald-700 font-semibold'
                          : 'bg-red-50 border-2 border-red-600 text-red-700 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold">{opt.value}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 7: Catatan */}
          <div>
            <label htmlFor="catatan" className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Tambahan (opsional)
            </label>
            <textarea
              id="catatan"
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan khusus, kamar, atau keterangan lainnya"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0] bg-slate-50 shrink-0">
          <span className="text-xs text-slate-500">* Wajib diisi</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              form="santriForm"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold transition-colors shadow-xs inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SantriFormModal;
