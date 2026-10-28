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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-emerald-50/50 shrink-0">
          <div className="flex items-center gap-2 text-emerald-800">
            <UserCheck className="w-5 h-5 text-[#059669]" />
            <h2 className="text-lg font-bold">Konversi ke Santri Aktif</h2>
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
            <label className="block text-xs font-semibold text-slate-700 mb-2">
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
                      : 'border-slate-300 focus:border-[#059669] focus:ring-1 focus:ring-[#059669]'
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
            <label htmlFor="tanggalMasukKonversi" className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Masuk / Aktif <span className="text-red-500">*</span>
            </label>
            <input
              id="tanggalMasukKonversi"
              type="date"
              value={tanggalMasuk}
              onChange={(e) => setTanggalMasuk(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-colors shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? 'Memproses...' : 'Konversi Sekarang'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KonversiModal;
