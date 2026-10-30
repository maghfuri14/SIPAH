import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';
import { Pendaftaran } from '../../types/pendaftaran';
import { pendaftaranService } from '../../lib/pendaftaranService';
import { santriService } from '../../lib/santriService';
import { showToast } from '../../components/ui/Toast';

interface KonversiModalProps {
  isOpen: boolean;
  pendaftaran: Pendaftaran | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const KonversiModal: React.FC<KonversiModalProps> = ({
  isOpen,
  pendaftaran,
  onClose,
  onSuccess,
}) => {
  const [nisMode, setNisMode] = useState<'auto' | 'manual'>('auto');
  const [autoNis, setAutoNis] = useState('');
  const [manualNis, setManualNis] = useState('');
  const [tanggalMasuk, setTanggalMasuk] = useState(
    new Date().toISOString().substring(0, 10)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nisError, setNisError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && pendaftaran) {
      setNisMode('auto');
      setManualNis('');
      setNisError(null);
      setTanggalMasuk(new Date().toISOString().substring(0, 10));

      // Generate auto NIS
      pendaftaranService.generateAutoNis().then((generated) => {
        setAutoNis(generated);
      });
    }
  }, [isOpen, pendaftaran]);

  const handleManualNisBlur = async () => {
    if (!manualNis.trim()) {
      setNisError('NIS wajib diisi');
      return;
    }
    const isUnik = await santriService.checkNisUnik(manualNis.trim());
    if (!isUnik) {
      setNisError('NIS sudah digunakan');
    } else {
      setNisError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendaftaran) return;

    const targetNis = nisMode === 'auto' ? autoNis : manualNis.trim();

    if (!targetNis) {
      setNisError('NIS wajib diisi');
      return;
    }

    if (nisMode === 'manual') {
      const isUnik = await santriService.checkNisUnik(targetNis);
      if (!isUnik) {
        setNisError('NIS sudah digunakan');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await pendaftaranService.konversiKeSantri(
        pendaftaran.id,
        targetNis,
        tanggalMasuk
      );

      showToast(`Santri "${pendaftaran.nama_calon}" berhasil diaktifkan dengan NIS ${targetNis}!`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengonversi pendaftar menjadi santri', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !pendaftaran) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Konversi ke Santri Aktif</h2>
              <p className="text-sm text-slate-500">Tetapkan NIS dan status calon santri</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Info Calon Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Calon Santri:</span>
              <span className="font-bold text-[#0F172A]">{pendaftaran.nama_calon}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Nama Wali:</span>
              <span className="font-semibold text-slate-700">{pendaftaran.nama_wali}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Kategori Program:</span>
              <span className="font-semibold text-[#059669]">{pendaftaran.kategori}</span>
            </div>
          </div>

          {/* NIS Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              Pengaturan Nomor Induk Santri (NIS) <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => {
                  setNisMode('auto');
                  setNisError(null);
                }}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  nisMode === 'auto'
                    ? 'bg-emerald-50 border-2 border-[#059669] text-[#059669]'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>NIS Otomatis</span>
              </button>

              <button
                type="button"
                onClick={() => setNisMode('manual')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  nisMode === 'manual'
                    ? 'bg-emerald-50 border-2 border-[#059669] text-[#059669]'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span>NIS Manual</span>
              </button>
            </div>

            {nisMode === 'auto' ? (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 flex items-center justify-between">
                <span className="font-medium">NIS yang akan digenerate:</span>
                <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-emerald-300 text-[#059669]">
                  {autoNis || 'Generating...'}
                </span>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={manualNis}
                  onChange={(e) => {
                    setManualNis(e.target.value);
                    setNisError(null);
                  }}
                  onBlur={handleManualNisBlur}
                  placeholder="Masukkan nomor NIS manual"
                  className={`w-full px-3 py-2 text-sm border rounded-lg outline-none font-mono ${
                    nisError
                      ? 'border-red-500 ring-1 ring-red-500'
                      : 'border-slate-200 focus:ring-2 focus:ring-emerald-500'
                  }`}
                />
                {nisError && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {nisError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tanggal Masuk */}
          <div>
            <label htmlFor="tanggalMasukKonversi" className="mb-1 block text-sm font-medium text-slate-900">
              Tanggal Masuk / Aktif <span className="text-red-500">*</span>
            </label>
            <input
              id="tanggalMasukKonversi"
              type="date"
              value={tanggalMasuk}
              onChange={(e) => setTanggalMasuk(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="-mx-6 mt-2 flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? 'Memproses...' : 'Konversi Sekarang'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KonversiModal;
