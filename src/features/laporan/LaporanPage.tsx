import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  RotateCcw,
  SearchX,
  Wallet,
  Users,
  UserPlus,
  CreditCard,
  FileText,
} from 'lucide-react';
import {
  laporanService,
  LaporanKeuanganData,
  LaporanSyahriyahRow,
} from '../../lib/laporanService';
import { Santri } from '../../types/santri';
import { Pendaftaran } from '../../types/pendaftaran';
import { formatRupiah } from '../../lib/formatter';
import { exportToCsv, exportToExcel } from '../../lib/exportHelper';
import { getKwitansiConfig } from '../../lib/pdfHelper';
import { pengaturanService } from '../../lib/pengaturanService';
import { ToastContainer } from '../../components/ui/Toast';

type TabType = 'keuangan' | 'santri' | 'pendaftaran' | 'syahriyah';

const BULAN_OPTIONS = [
  { value: 'Semua', label: 'Semua Bulan' },
  { value: '1', label: 'Januari' },
  { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },
  { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },
  { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

export const LaporanPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('keuangan');

  // Filter States
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [bulan, setBulan] = useState<string>('Semua');
  const [jenisKeuangan, setJenisKeuangan] = useState<string>('Semua');
  const [kategoriSantri, setKategoriSantri] = useState<string>('Semua');
  const [statusSantri, setStatusSantri] = useState<string>('Semua');
  const [statusPendaftaran, setStatusPendaftaran] = useState<string>('Semua');

  // Data States
  const [isLoading, setIsLoading] = useState(true);
  const [keuanganData, setKeuanganData] = useState<LaporanKeuanganData | null>(null);
  const [santriData, setSantriData] = useState<Santri[]>([]);
  const [pendaftaranData, setPendaftaranData] = useState<Pendaftaran[]>([]);
  const [syahriyahData, setSyahriyahData] = useState<LaporanSyahriyahRow[]>([]);

  const loadActiveTabData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'keuangan') {
        const res = await laporanService.getLaporanKeuangan(tahun, bulan, jenisKeuangan);
        setKeuanganData(res);
      } else if (activeTab === 'santri') {
        const res = await laporanService.getLaporanSantri(kategoriSantri, statusSantri);
        setSantriData(res);
      } else if (activeTab === 'pendaftaran') {
        const res = await laporanService.getLaporanPendaftaran(tahun, bulan, statusPendaftaran);
        setPendaftaranData(res);
      } else if (activeTab === 'syahriyah') {
        const res = await laporanService.getLaporanSyahriyah(tahun, kategoriSantri);
        setSyahriyahData(res);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActiveTabData();
  }, [activeTab, tahun, bulan, jenisKeuangan, kategoriSantri, statusSantri, statusPendaftaran]);

  const handleResetFilter = () => {
    setTahun(new Date().getFullYear());
    setBulan('Semua');
    setJenisKeuangan('Semua');
    setKategoriSantri('Semua');
    setStatusSantri('Semua');
    setStatusPendaftaran('Semua');
  };

  // Helper to generate payload (including TOTAL summary row) for exports
  const getCurrentExportPayload = () => {
    const bulanLabel = BULAN_OPTIONS.find((b) => b.value === bulan)?.label || bulan;

    if (activeTab === 'keuangan') {
      const filenameBase = `Laporan-Keuangan-${bulanLabel}-${tahun}`;
      if (!keuanganData || keuanganData.list.length === 0) {
        return { filenameBase, data: [], sheetName: 'Keuangan' };
      }

      const data: Record<string, any>[] = keuanganData.list.map((k) => ({
        Tanggal: k.tanggal,
        Kategori: k.kategori_nama,
        Keterangan: k.keterangan || '-',
        Jenis: k.jenis,
        'Nominal (Rp)': k.nominal,
      }));

      // Append TOTAL row
      data.push({
        Tanggal: 'TOTAL KESELURUHAN',
        Kategori: `${keuanganData.list.length} Transaksi`,
        Keterangan: `Pemasukan: ${formatRupiah(keuanganData.totalPemasukan)} | Pengeluaran: ${formatRupiah(keuanganData.totalPengeluaran)}`,
        Jenis: 'Saldo Bersih',
        'Nominal (Rp)': keuanganData.saldoBersih,
      });

      return { filenameBase, data, sheetName: 'Keuangan' };
    }

    if (activeTab === 'santri') {
      const filenameBase = `Data-Santri-${tahun}`;
      if (santriData.length === 0) {
        return { filenameBase, data: [], sheetName: 'Data Santri' };
      }

      const data: Record<string, any>[] = santriData.map((s) => ({
        NIS: s.nis,
        'Nama Santri': s.nama,
        Kategori: s.kategori,
        Status: s.status,
        'Nama Wali': s.nama_wali,
        'No HP Santri': s.no_hp_santri,
        'No HP Wali': s.no_hp_wali,
        'Tanggal Masuk': s.tanggal_masuk || '-',
      }));

      // Append TOTAL row
      data.push({
        NIS: 'TOTAL SANTRI',
        'Nama Santri': `${santriData.length} Santri`,
        Kategori: '',
        Status: `${santriData.filter((s) => s.status === 'Aktif').length} Aktif`,
        'Nama Wali': '',
        'No HP Santri': '',
        'No HP Wali': '',
        'Tanggal Masuk': '',
      });

      return { filenameBase, data, sheetName: 'Data Santri' };
    }

    if (activeTab === 'pendaftaran') {
      const filenameBase = `Laporan-Pendaftaran-${bulanLabel}-${tahun}`;
      if (pendaftaranData.length === 0) {
        return { filenameBase, data: [], sheetName: 'Pendaftaran' };
      }

      const data: Record<string, any>[] = pendaftaranData.map((p) => ({
        'Tanggal Daftar': p.tanggal_pendaftaran,
        'Nama Calon': p.nama_calon,
        'Nama Wali': p.nama_wali,
        'No HP Santri': p.no_hp_santri,
        'No HP Wali': p.no_hp_wali,
        Kategori: p.kategori,
        Status: p.status,
      }));

      // Append TOTAL row
      data.push({
        'Tanggal Daftar': 'TOTAL PENDAFTAR',
        'Nama Calon': `${pendaftaranData.length} Pendaftar`,
        'Nama Wali': '',
        'No HP Santri': '',
        'No HP Wali': '',
        Kategori: '',
        Status: '',
      });

      return { filenameBase, data, sheetName: 'Pendaftaran' };
    }

    // activeTab === 'syahriyah'
    const filenameBase = `Rekap-Syahriyah-${tahun}`;
    if (syahriyahData.length === 0) {
      return { filenameBase, data: [], sheetName: 'Syahriyah' };
    }

    const data: Record<string, any>[] = syahriyahData.map((r) => ({
      NIS: r.nis,
      'Nama Santri': r.nama,
      Kategori: r.kategori,
      'Total Tagihan (1 Thn)': r.totalTagihan,
      'Total Dibayar': r.totalDibayar,
      'Sisa Tunggakan': r.sisaTunggakan,
      Status: r.statusTahunan,
    }));

    const sumTagihan = syahriyahData.reduce((sum, r) => sum + r.totalTagihan, 0);
    const sumDibayar = syahriyahData.reduce((sum, r) => sum + r.totalDibayar, 0);
    const sumTunggakan = syahriyahData.reduce((sum, r) => sum + r.sisaTunggakan, 0);

    // Append TOTAL row
    data.push({
      NIS: 'TOTAL',
      'Nama Santri': `${syahriyahData.length} Santri`,
      Kategori: '',
      'Total Tagihan (1 Thn)': sumTagihan,
      'Total Dibayar': sumDibayar,
      'Sisa Tunggakan': sumTunggakan,
      Status: '',
    });

    return { filenameBase, data, sheetName: 'Syahriyah' };
  };

  const handleExportCsv = () => {
    const { filenameBase, data } = getCurrentExportPayload();
    exportToCsv(`${filenameBase}.csv`, data);
  };

  const handleExportExcel = () => {
    const { filenameBase, data, sheetName } = getCurrentExportPayload();
    exportToExcel(`${filenameBase}.xlsx`, data, sheetName);
  };

  const handleExportPdf = () => {
    const bulanLabel = BULAN_OPTIONS.find((b) => b.value === bulan)?.label || bulan;
    const kwitansiConfig = getKwitansiConfig();
    const profil = pengaturanService.getProfil();
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    let titleText = '';
    let tableHeaders: string[] = [];
    let tableRowsHtml = '';
    let tfootHtml = '';

    if (activeTab === 'keuangan') {
      titleText = `Laporan Rekapitulasi Keuangan ${bulan !== 'Semua' ? `- ${bulanLabel}` : ''} Tahun ${tahun}`;
      if (jenisKeuangan !== 'Semua') titleText += ` (${jenisKeuangan})`;
      tableHeaders = ['Tanggal', 'Kategori', 'Keterangan', 'Jenis', 'Nominal'];

      const list = keuanganData?.list || [];
      tableRowsHtml = list.map((item) => `
        <tr>
          <td>${item.tanggal}</td>
          <td><b>${item.kategori_nama}</b></td>
          <td>${item.keterangan || '-'}</td>
          <td><span style="padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${item.jenis === 'Pemasukan' ? '#ecfdf5' : '#fef2f2'}; color: ${item.jenis === 'Pemasukan' ? '#047857' : '#b91c1c'};">${item.jenis}</span></td>
          <td style="text-align: right; font-family: monospace; font-weight: 600; color: ${item.jenis === 'Pemasukan' ? '#047857' : '#b91c1c'};">
            ${item.jenis === 'Pemasukan' ? '+' : '-'} ${formatRupiah(item.nominal)}
          </td>
        </tr>
      `).join('');

      tfootHtml = `
        <tr style="background: #f1f5f9; font-weight: bold;">
          <td colspan="3" style="text-align: left;">TOTAL KESELURUHAN (${list.length} Transaksi) | Pemasukan: ${formatRupiah(keuanganData?.totalPemasukan || 0)} | Pengeluaran: ${formatRupiah(keuanganData?.totalPengeluaran || 0)}</td>
          <td>Saldo Bersih</td>
          <td style="text-align: right; font-family: monospace; color: #047857; font-size: 13px;">${formatRupiah(keuanganData?.saldoBersih || 0)}</td>
        </tr>
      `;
    } else if (activeTab === 'santri') {
      titleText = `Laporan Master Data Santri (Tahun ${tahun})`;
      if (kategoriSantri !== 'Semua') titleText += ` - Kategori: ${kategoriSantri}`;
      if (statusSantri !== 'Semua') titleText += ` - Status: ${statusSantri}`;
      tableHeaders = ['NIS', 'Nama Santri', 'Kategori', 'Status', 'Nama Wali', 'No HP Wali'];

      tableRowsHtml = santriData.map((s) => `
        <tr>
          <td style="font-family: monospace; font-weight: 600;">${s.nis}</td>
          <td style="font-weight: bold;">${s.nama}</td>
          <td>${s.kategori}</td>
          <td><span style="padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${s.status === 'Aktif' ? '#ecfdf5' : '#fef2f2'}; color: ${s.status === 'Aktif' ? '#047857' : '#b91c1c'};">${s.status}</span></td>
          <td>${s.nama_wali || '-'}</td>
          <td style="font-family: monospace;">${s.no_hp_wali || '-'}</td>
        </tr>
      `).join('');

      const aktifCount = santriData.filter((s) => s.status === 'Aktif').length;
      tfootHtml = `
        <tr style="background: #f1f5f9; font-weight: bold;">
          <td colspan="2">TOTAL SANTRI: ${santriData.length} Santri</td>
          <td>${aktifCount} Aktif</td>
          <td colspan="3"></td>
        </tr>
      `;
    } else if (activeTab === 'pendaftaran') {
      titleText = `Laporan Pendaftaran Santri Baru ${bulan !== 'Semua' ? `- ${bulanLabel}` : ''} Tahun ${tahun}`;
      if (statusPendaftaran !== 'Semua') titleText += ` (${statusPendaftaran})`;
      tableHeaders = ['Tgl Daftar', 'Nama Calon', 'Nama Wali', 'No HP', 'Kategori', 'Status'];

      tableRowsHtml = pendaftaranData.map((p) => `
        <tr>
          <td style="font-family: monospace;">${p.tanggal_pendaftaran}</td>
          <td style="font-weight: bold;">${p.nama_calon}</td>
          <td>${p.nama_wali || '-'}</td>
          <td style="font-family: monospace;">${p.no_hp_santri || '-'}</td>
          <td>${p.kategori}</td>
          <td><span style="padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #334155;">${p.status}</span></td>
        </tr>
      `).join('');

      tfootHtml = `
        <tr style="background: #f1f5f9; font-weight: bold;">
          <td colspan="2">TOTAL PENDAFTAR: ${pendaftaranData.length} Pendaftar</td>
          <td colspan="4"></td>
        </tr>
      `;
    } else {
      titleText = `Laporan Tahunan Rekap Syahriyah Santri (Tahun ${tahun})`;
      if (kategoriSantri !== 'Semua') titleText += ` - Kategori: ${kategoriSantri}`;
      tableHeaders = ['NIS', 'Nama Santri', 'Kategori', 'Tagihan 1 Thn', 'Total Dibayar', 'Sisa Tunggakan', 'Status'];

      tableRowsHtml = syahriyahData.map((r) => `
        <tr>
          <td style="font-family: monospace; font-weight: 600;">${r.nis}</td>
          <td style="font-weight: bold;">${r.nama}</td>
          <td>${r.kategori}</td>
          <td style="text-align: right; font-family: monospace;">${formatRupiah(r.totalTagihan)}</td>
          <td style="text-align: right; font-family: monospace; color: #047857; font-weight: 600;">${formatRupiah(r.totalDibayar)}</td>
          <td style="text-align: right; font-family: monospace; color: #dc2626; font-weight: 600;">${formatRupiah(r.sisaTunggakan)}</td>
          <td style="text-align: center;">
            <span style="padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${r.statusTahunan === 'Lunas' ? '#ecfdf5' : r.statusTahunan === 'Sebagian' ? '#fef3c7' : '#f1f5f9'}; color: ${r.statusTahunan === 'Lunas' ? '#047857' : r.statusTahunan === 'Sebagian' ? '#d97706' : '#64748b'};">
              ${r.statusTahunan === 'Lunas' ? 'Lunas' : r.statusTahunan === 'Sebagian' ? 'Sebagian' : 'Belum Bayar'}
            </span>
          </td>
        </tr>
      `).join('');

      const sumTagihan = syahriyahData.reduce((sum, r) => sum + r.totalTagihan, 0);
      const sumDibayar = syahriyahData.reduce((sum, r) => sum + r.totalDibayar, 0);
      const sumTunggakan = syahriyahData.reduce((sum, r) => sum + r.sisaTunggakan, 0);

      tfootHtml = `
        <tr style="background: #f1f5f9; font-weight: bold;">
          <td colspan="3">TOTAL (${syahriyahData.length} Santri)</td>
          <td style="text-align: right; font-family: monospace;">${formatRupiah(sumTagihan)}</td>
          <td style="text-align: right; font-family: monospace; color: #047857;">${formatRupiah(sumDibayar)}</td>
          <td style="text-align: right; font-family: monospace; color: #dc2626;">${formatRupiah(sumTunggakan)}</td>
          <td></td>
        </tr>
      `;
    }

    const kopLines = (kwitansiConfig.kop_surat || '').split('\n');
    const kopHtml = kopLines
      .map((line, idx) => (idx === 0 ? `<h1>${line}</h1>` : `<p>${line}</p>`))
      .join('');

    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8" />
          <title>${titleText}</title>
          <style>
            @page { size: A4 landscape; margin: 15mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 0;
              color: #0f172a;
              background: #ffffff;
              font-size: 12px;
              line-height: 1.4;
            }
            .header-kop {
              border-bottom: 2px solid #059669;
              padding-bottom: 10px;
              margin-bottom: 16px;
            }
            .header-kop h1 {
              margin: 0 0 2px 0;
              color: #047857;
              font-size: 18px;
              font-weight: 700;
              text-transform: uppercase;
            }
            .header-kop p {
              margin: 1px 0;
              color: #64748b;
              font-size: 11px;
            }
            .report-title {
              text-align: center;
              margin-bottom: 20px;
            }
            .report-title h2 {
              margin: 0 0 4px 0;
              font-size: 16px;
              color: #0f172a;
              text-transform: uppercase;
            }
            .report-title p {
              margin: 0;
              font-size: 11px;
              color: #64748b;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 6px 10px;
              text-align: left;
              font-size: 11.5px;
            }
            th {
              background-color: #059669;
              color: #ffffff;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 11px;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .footer-sign {
              display: flex;
              justify-content: flex-end;
              margin-top: 30px;
              text-align: center;
            }
            .sign-box {
              width: 220px;
            }
            .sign-space {
              height: 55px;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header-kop">
            ${kopHtml}
            <p>Pengasuh: ${profil.pengasuh || '-'}</p>
          </div>

          <div class="report-title">
            <h2>${titleText}</h2>
            <p>Dicetak pada: ${todayStr}</p>
          </div>

          <table>
            <thead>
              <tr>
                ${tableHeaders.map((th) => `<th>${th}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
            <tfoot>
              ${tfootHtml}
            </tfoot>
          </table>

          <div class="footer-sign">
            <div class="sign-box">
              <p>Pare, ${todayStr}</p>
              <p><strong>Bendahara Pondok,</strong></p>
              <div class="sign-space"></div>
              <p><strong>( ${kwitansiConfig.nama_penandatangan || profil.bendahara || 'Shofil Mubarok'} )</strong></p>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 pb-12">
      <ToastContainer />

      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Laporan & Rekapitulasi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analisis rekapitulasi data pondok dan unduh laporan CSV / Excel
          </p>
        </div>
      </div>

      {/* Navigation Tabs (Garis Bawah Style) */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('keuangan')}
            className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'keuangan'
                ? 'border-[#059669] text-[#059669]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Rekap Keuangan</span>
          </button>

          <button
            onClick={() => setActiveTab('santri')}
            className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'santri'
                ? 'border-[#059669] text-[#059669]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Data Santri</span>
          </button>

          <button
            onClick={() => setActiveTab('pendaftaran')}
            className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'pendaftaran'
                ? 'border-[#059669] text-[#059669]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Pendaftaran</span>
          </button>

          <button
            onClick={() => setActiveTab('syahriyah')}
            className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'syahriyah'
                ? 'border-[#059669] text-[#059669]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Rekap Syahriyah</span>
          </button>
        </nav>
      </div>

      {/* Area Filter Responsive (Card Putih) */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Filter className="w-4 h-4 text-[#059669]" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Filter Laporan
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
          {/* Tahun Filter (All Tabs) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tahun</label>
            <select
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#059669] bg-white text-slate-700"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          {/* Bulan Filter (Keuangan & Pendaftaran) */}
          {(activeTab === 'keuangan' || activeTab === 'pendaftaran') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Bulan</label>
              <select
                value={bulan}
                onChange={(e) => setBulan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#059669] bg-white text-slate-700"
              >
                {BULAN_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tab Keuangan: Jenis */}
          {activeTab === 'keuangan' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Jenis Transaksi</label>
              <select
                value={jenisKeuangan}
                onChange={(e) => setJenisKeuangan(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#059669] bg-white text-slate-700"
              >
                <option value="Semua">Semua Jenis</option>
                <option value="Pemasukan">Pemasukan</option>
                <option value="Pengeluaran">Pengeluaran</option>
              </select>
            </div>
          )}

          {/* Tab Santri / Syahriyah: Kategori */}
          {(activeTab === 'santri' || activeTab === 'syahriyah') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Kategori Santri</label>
              <select
                value={kategoriSantri}
                onChange={(e) => setKategoriSantri(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#059669] bg-white text-slate-700"
              >
                <option value="Semua">Semua Kategori</option>
                <option value="Mukim">Mukim</option>
                <option value="Nduduk">Nduduk</option>
                <option value="Kilatan">Kilatan</option>
              </select>
            </div>
          )}

          {/* Tab Santri: Status */}
          {activeTab === 'santri' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status Santri</label>
              <select
                value={statusSantri}
                onChange={(e) => setStatusSantri(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#059669] bg-white text-slate-700"
              >
                <option value="Semua">Semua Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Tidak Aktif">Tidak Aktif</option>
              </select>
            </div>
          )}

          {/* Tab Pendaftaran: Status */}
          {activeTab === 'pendaftaran' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status Pendaftaran</label>
              <select
                value={statusPendaftaran}
                onChange={(e) => setStatusPendaftaran(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#059669] bg-white text-slate-700"
              >
                <option value="Semua">Semua Status</option>
                <option value="Baru">Baru</option>
                <option value="Diterima">Diterima</option>
                <option value="Ditolak">Ditolak</option>
                <option value="Menjadi Santri">Menjadi Santri</option>
              </select>
            </div>
          )}

          {/* Action Filter Controls */}
          <div className="flex items-center gap-2 pt-4 sm:pt-0">
            <button
              onClick={handleResetFilter}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Report Table Section */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {/* Table Top Header Bar with Side-by-Side Export Buttons */}
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
              {activeTab === 'keuangan' && 'Laporan Rekapitulasi Keuangan'}
              {activeTab === 'santri' && 'Laporan Master Data Santri'}
              {activeTab === 'pendaftaran' && 'Laporan Pendaftaran Santri Baru'}
              {activeTab === 'syahriyah' && 'Laporan Tahunan Syahriyah Santri'}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Button 1: Export CSV */}
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>📄 Export CSV</span>
            </button>

            {/* Button 2: Export Excel (.xlsx) */}
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>📊 Export Excel</span>
            </button>

            {/* Button 3: Export PDF */}
            <button
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📄 Export PDF</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Rekap Keuangan Special Summary Cards */}
        {activeTab === 'keuangan' && keuanganData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border-b border-[#E2E8F0] bg-slate-50/30">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
              <span className="text-slate-500 font-medium block">Total Pemasukan</span>
              <span className="text-lg font-bold text-emerald-700 block mt-0.5">
                {formatRupiah(keuanganData.totalPemasukan)}
              </span>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs">
              <span className="text-slate-500 font-medium block">Total Pengeluaran</span>
              <span className="text-lg font-bold text-red-700 block mt-0.5">
                {formatRupiah(keuanganData.totalPengeluaran)}
              </span>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs">
              <span className="text-slate-500 font-medium block">Saldo Bersih</span>
              <span className="text-lg font-bold text-blue-800 block mt-0.5">
                {formatRupiah(keuanganData.saldoBersih)}
              </span>
            </div>
          </div>
        )}

        {/* Content Render per Tab */}
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse h-10 bg-slate-100 rounded-md" />
            ))}
          </div>
        ) : (
          <div>
            {/* TAB 1: KEUANGAN */}
            {activeTab === 'keuangan' && (
              <div>
                {!keuanganData || keuanganData.list.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <SearchX className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-500 font-medium">Tidak ada data transaksi kas cocok</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-[#E2E8F0] font-semibold text-slate-700 uppercase">
                          <th className="px-4 py-3">Tanggal</th>
                          <th className="px-4 py-3">Kategori</th>
                          <th className="px-4 py-3">Keterangan</th>
                          <th className="px-4 py-3">Jenis</th>
                          <th className="px-4 py-3 text-right">Nominal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {keuanganData.list.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono text-slate-600">{item.tanggal}</td>
                            <td className="px-4 py-3 font-semibold text-[#0F172A]">{item.kategori_nama}</td>
                            <td className="px-4 py-3 text-slate-600 truncate max-w-xs">{item.keterangan || '-'}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                                  item.jenis === 'Pemasukan'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                {item.jenis}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold">
                              {item.jenis === 'Pemasukan' ? (
                                <span className="text-emerald-600">+ {formatRupiah(item.nominal)}</span>
                              ) : (
                                <span className="text-red-600">- {formatRupiah(item.nominal)}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* TFOOT TOTAL KEUANGAN */}
                      <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-left uppercase">
                            TOTAL KESELURUHAN ({keuanganData.list.length} Transaksi)
                          </td>
                          <td className="px-4 py-3">Saldo Bersih</td>
                          <td className="px-4 py-3 text-right font-mono font-extrabold text-[#059669]">
                            {formatRupiah(keuanganData.saldoBersih)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DATA SANTRI */}
            {activeTab === 'santri' && (
              <div>
                {santriData.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <SearchX className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-500 font-medium">Tidak ada data santri cocok</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-[#E2E8F0] font-semibold text-slate-700 uppercase">
                          <th className="px-4 py-3">NIS</th>
                          <th className="px-4 py-3">Nama Santri</th>
                          <th className="px-4 py-3">Kategori</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Nama Wali</th>
                          <th className="px-4 py-3">No HP Wali</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {santriData.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono font-semibold text-slate-700">{s.nis}</td>
                            <td className="px-4 py-3 font-bold text-[#0F172A]">{s.nama}</td>
                            <td className="px-4 py-3 font-medium text-slate-600">{s.kategori}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                                  s.status === 'Aktif'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                {s.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{s.nama_wali}</td>
                            <td className="px-4 py-3 font-mono text-slate-600">{s.no_hp_wali}</td>
                          </tr>
                        ))}
                      </tbody>
                      {/* TFOOT TOTAL SANTRI */}
                      <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={2} className="px-4 py-3 text-left uppercase">
                            TOTAL SANTRI: {santriData.length} Santri
                          </td>
                          <td className="px-4 py-3">
                            {santriData.filter((s) => s.status === 'Aktif').length} Aktif
                          </td>
                          <td className="px-4 py-3">
                            {santriData.filter((s) => s.status === 'Tidak Aktif').length} Tidak Aktif
                          </td>
                          <td colSpan={2} className="px-4 py-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PENDAFTARAN */}
            {activeTab === 'pendaftaran' && (
              <div>
                {pendaftaranData.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <SearchX className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-500 font-medium">Tidak ada data pendaftaran cocok</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-[#E2E8F0] font-semibold text-slate-700 uppercase">
                          <th className="px-4 py-3">Tgl Daftar</th>
                          <th className="px-4 py-3">Nama Calon</th>
                          <th className="px-4 py-3">Nama Wali</th>
                          <th className="px-4 py-3">No HP</th>
                          <th className="px-4 py-3">Kategori</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pendaftaranData.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono text-slate-600">{p.tanggal_pendaftaran}</td>
                            <td className="px-4 py-3 font-bold text-[#0F172A]">{p.nama_calon}</td>
                            <td className="px-4 py-3 text-slate-600">{p.nama_wali}</td>
                            <td className="px-4 py-3 font-mono text-slate-600">{p.no_hp_santri}</td>
                            <td className="px-4 py-3 font-medium text-slate-600">{p.kategori}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* TFOOT TOTAL PENDAFTARAN */}
                      <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={2} className="px-4 py-3 text-left uppercase">
                            TOTAL PENDAFTAR: {pendaftaranData.length} Pendaftar
                          </td>
                          <td colSpan={4} className="px-4 py-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: REKAP SYAHRIYAH */}
            {activeTab === 'syahriyah' && (
              <div>
                {syahriyahData.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <SearchX className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-500 font-medium">Tidak ada data syahriyah cocok</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-[#E2E8F0] font-semibold text-slate-700 uppercase">
                          <th className="px-4 py-3">NIS</th>
                          <th className="px-4 py-3">Nama Santri</th>
                          <th className="px-4 py-3">Kategori</th>
                          <th className="px-4 py-3 text-right">Tagihan 1 Tahun</th>
                          <th className="px-4 py-3 text-right">Total Dibayar</th>
                          <th className="px-4 py-3 text-right">Sisa Tunggakan</th>
                          <th className="px-4 py-3 text-center">Status Tahunan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {syahriyahData.map((r) => (
                          <tr key={r.santriId} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono font-semibold text-slate-700">{r.nis}</td>
                            <td className="px-4 py-3 font-bold text-[#0F172A]">{r.nama}</td>
                            <td className="px-4 py-3 text-slate-600 font-medium">{r.kategori}</td>
                            <td className="px-4 py-3 text-right font-mono">{formatRupiah(r.totalTagihan)}</td>
                            <td className="px-4 py-3 text-right font-mono text-emerald-700 font-semibold">
                              {formatRupiah(r.totalDibayar)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-red-600 font-semibold">
                              {formatRupiah(r.sisaTunggakan)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {r.statusTahunan === 'Lunas' && (
                                <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Lunas
                                </span>
                              )}
                              {r.statusTahunan === 'Sebagian' && (
                                <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-amber-50 text-amber-700 border border-amber-200">
                                  Sebagian
                                </span>
                              )}
                              {r.statusTahunan === 'Belum' && (
                                <span className="px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-100 text-slate-500 border border-slate-200">
                                  Belum Bayar
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* TFOOT TOTAL SYAHRIYAH */}
                      <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-left uppercase">
                            TOTAL ({syahriyahData.length} Santri)
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {formatRupiah(
                              syahriyahData.reduce((sum, r) => sum + r.totalTagihan, 0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-700">
                            {formatRupiah(
                              syahriyahData.reduce((sum, r) => sum + r.totalDibayar, 0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-red-600">
                            {formatRupiah(
                              syahriyahData.reduce((sum, r) => sum + r.sisaTunggakan, 0)
                            )}
                          </td>
                          <td className="px-4 py-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LaporanPage;
