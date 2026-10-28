import React, { useState, useEffect } from 'react';
import { X, Home, Building2, Calendar } from 'lucide-react';
import { pendaftaranService } from '../../lib/pendaftaranService';
import { showToast } from '../../components/ui/Toast';

interface PendaftaranFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PendaftaranFormModal: React.FC<PendaftaranFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [namaCalon, setNamaCalon] = useState('');
  const [namaWali, setNamaWali] = useState('');
  const [noHpSantri, setNoHpSantri] = useState('');
  const [noHpWali, setNoHpWali] = useState('');
  const [kategori, setKategori] = useState<'Mukim' | 'Nduduk' | 'Kilatan'>('Mukim');
  const [tanggalPendaftaran, setTanggalPendaftaran] = useState(
    new Date().toISOString().substring(0, 10)
  );
  const [catatan, setCatatan] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setNamaCalon('');
      setNamaWali('');
      setNoHpSantri('');
      setNoHpWali('');
      setKategori('Mukim');
      setTanggalPendaftaran(new Date().toISOString().substring(0, 10));
      setCatatan('');
      setErrors({});
    }
  }, [isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!namaCalon.trim()) newErrors.namaCalon = 'Nama calon santri wajib diisi';
    if (!namaWali.trim()) newErrors.namaWali = 'Nama wali wajib diisi';

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

    if (!tanggalPendaftaran) newErrors.tanggalPendaftaran = 'Tanggal pendaftaran wajib diisi';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await pendaftaranService.createPendaftaran({
        nama_calon: namaCalon.trim(),
        nama_wali: namaWali.trim(),
        no_hp_santri: noHpSantri.trim(),
        no_hp_wali: noHpWali.trim(),
        kategori,
        tanggal_pendaftaran: tanggalPendaftaran,
        catatan: catatan.trim() || undefined,
      });

      showToast('Calon santri baru berhasil didaftarkan', 'success');
      onSuccess();
      onClose();
    } catch {
      showToast('Gagal memproses pendaftaran', 'error');
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
      <div className="relative w-full max-w-xl bg-white h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-slate-50 shrink-0">
          <h2 className="text-lg font-semibold text-[#0F172A]">Tambah Pendaftar Santri Baru</h2>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form id="pendaftaranForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label htmlFor="namaCalon" className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Calon Santri <span className="text-red-500">*</span>
            </label>
            <input
              id="namaCalon"
              type="text"
              value={namaCalon}
              onChange={(e) => setNamaCalon(e.target.value)}
              placeholder="Nama lengkap calon santri"
              className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors ${
                errors.namaCalon
                  ? 'border-red-500 ring-1 ring-red-500'
                  : 'border-slate-300 focus:border-[#059669] focus:ring-1 focus:ring-[#059669]'
              }`}
            />
            {errors.namaCalon && <p className="text-xs text-red-500 mt-1">{errors.namaCalon}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="namaWaliCalon" className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Wali <span className="text-red-500">*</span>
              </label>
              <input
                id="namaWaliCalon"
                type="text"
                value={namaWali}
                onChange={(e) => setNamaWali(e.target.value)}
                placeholder="Nama bapak/wali"
                className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors ${
                  errors.namaWali
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-slate-300 focus:border-[#059669] focus:ring-1 focus:ring-[#059669]'
                }`}
              />
              {errors.namaWali && <p className="text-xs text-red-500 mt-1">{errors.namaWali}</p>}
            </div>

            <div>
              <label htmlFor="tanggalPendaftaran" className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Pendaftaran <span className="text-red-500">*</span>
              </label>
              <input
                id="tanggalPendaftaran"
                type="date"
                value={tanggalPendaftaran}
                onChange={(e) => setTanggalPendaftaran(e.target.value)}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors ${
                  errors.tanggalPendaftaran
                    ? 'border-red-500 ring-1 ring-red-500'
                    : 'border-slate-300 focus:border-[#059669] focus:ring-1 focus:ring-[#059669]'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="noHpSantriCalon" className="block text-xs font-semibold text-slate-700 mb-1">
                No HP Santri <span className="text-red-500">*</span>
              </label>
              <input
                id="noHpSantriCalon"
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
              <label htmlFor="noHpWaliCalon" className="block text-xs font-semibold text-slate-700 mb-1">
                No HP Wali <span className="text-red-500">*</span>
              </label>
              <input
                id="noHpWaliCalon"
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Kategori Programs <span className="text-red-500">*</span>
            </label>
            <div role="radiogroup" className="grid grid-cols-3 gap-2.5">
              {[
                { value: 'Mukim', icon: Home },
                { value: 'Nduduk', icon: Building2 },
                { value: 'Kilatan', icon: Calendar },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = kategori === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setKategori(opt.value as 'Mukim' | 'Nduduk' | 'Kilatan')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-emerald-50 border-2 border-[#059669] text-[#059669] font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold">{opt.value}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="catatanCalon" className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan / Keterangan (opsional)
            </label>
            <textarea
              id="catatanCalon"
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Informasi latar belakang, referral, dll."
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
              form="pendaftaranForm"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold transition-colors shadow-xs inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Pendaftaran'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendaftaranFormModal;
