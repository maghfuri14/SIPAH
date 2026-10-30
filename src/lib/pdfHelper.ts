import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { pengaturanService } from './pengaturanService';
import { formatRupiah } from './formatter';
import { ProfilPondok } from '../types/pengaturan';
import { Santri } from '../types/santri';
import { api } from './api';

export interface KwitansiItem {
  deskripsi: string;
  nominal: number;
}

export interface KwitansiPdfInput {
  idTransaksi: string;
  tipe: 'Syahriyah' | 'Kilatan' | 'Lainnya';
  santri: Santri;
  tanggalBayar: string;
  metode: string;
  items: KwitansiItem[];
  iuranTambahan?: KwitansiItem[];
  totalPembayaran: number;
  keterangan?: string;
  profilPondok?: ProfilPondok;
}

export interface KwitansiConfig {
  kop_surat: string;
  footer_kwitansi: string;
  nama_penandatangan: string;
  logo_base64?: string;
  catatan_kaki_thermal?: string;
  font_size_thermal?: '10px' | '12px' | '14px';
  paper_width_thermal?: '58mm' | '80mm';
}

export function getKwitansiConfig(): KwitansiConfig {
  const profil = pengaturanService.getProfil();
  const defaultConfig: KwitansiConfig = {
    kop_surat: "PONDOK AL HIDAYAH TERIEK\nJln. Mayor Bismo No 71-73 Tertek Pare Kediri",
    footer_kwitansi: "Terima kasih atas pembayaran Anda",
    nama_penandatangan: profil.bendahara || "Shofil Mubarok",
    catatan_kaki_thermal: "Simpan struk ini sebagai bukti sah.",
    font_size_thermal: "12px",
    paper_width_thermal: "58mm",
  };
  try {
    const raw = localStorage.getItem('al_hidayah_kwitansi_config');
    if (!raw) return defaultConfig;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultConfig;
    return {
      kop_surat:
        typeof parsed.kop_surat === 'string' && parsed.kop_surat.trim()
          ? parsed.kop_surat
          : defaultConfig.kop_surat,
      footer_kwitansi:
        typeof parsed.footer_kwitansi === 'string' && parsed.footer_kwitansi.trim()
          ? parsed.footer_kwitansi
          : defaultConfig.footer_kwitansi,
      nama_penandatangan:
        typeof parsed.nama_penandatangan === 'string' && parsed.nama_penandatangan.trim()
          ? parsed.nama_penandatangan
          : defaultConfig.nama_penandatangan,
      logo_base64:
        typeof parsed.logo_base64 === 'string' && parsed.logo_base64.trim()
          ? parsed.logo_base64
          : undefined,
      catatan_kaki_thermal: typeof parsed.catatan_kaki_thermal === 'string'
        ? parsed.catatan_kaki_thermal
        : defaultConfig.catatan_kaki_thermal,
      font_size_thermal: ['10px', '12px', '14px'].includes(parsed.font_size_thermal)
        ? parsed.font_size_thermal
        : defaultConfig.font_size_thermal,
      paper_width_thermal: ['58mm', '80mm'].includes(parsed.paper_width_thermal)
        ? parsed.paper_width_thermal
        : defaultConfig.paper_width_thermal,
    };
  } catch {
    return defaultConfig;
  }
}

// Terbilang Rupiah Helper
export function terbilang(nominal: number): string {
  const angka = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];
  const num = Math.floor(Math.abs(nominal));
  if (num === 0) return 'Nol Rupiah';

  function bilang(n: number): string {
    if (n < 12) return angka[n];
    if (n < 20) return bilang(n - 10) + ' Belas';
    if (n < 100) return bilang(Math.floor(n / 10)) + ' Puluh ' + bilang(n % 10);
    if (n < 200) return 'Seratus ' + bilang(n - 100);
    if (n < 1000) return bilang(Math.floor(n / 100)) + ' Ratus ' + bilang(n % 100);
    if (n < 2000) return 'Seribu ' + bilang(n - 1000);
    if (n < 1000000) return bilang(Math.floor(n / 1000)) + ' Ribu ' + bilang(n % 1000);
    if (n < 1000000000)
      return bilang(Math.floor(n / 1000000)) + ' Juta ' + bilang(n % 1000000);
    return n.toString();
  }

  return (bilang(num) + ' Rupiah').replace(/\s+/g, ' ').trim();
}

const MONTH_NAMES_IND = [
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

function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day} ${MONTH_NAMES_IND[monthIndex]} ${year}`;
    }
  }
  return dateStr;
}

function parseInputData(
  inputOrTransaksi: any,
  dataSantriOrProfil?: any,
  dataProfilParam?: any
): { input: KwitansiPdfInput; profil: ProfilPondok; config: KwitansiConfig } {
  let input: KwitansiPdfInput;

  if (
    inputOrTransaksi &&
    typeof inputOrTransaksi === 'object' &&
    'santri' in inputOrTransaksi
  ) {
    input = inputOrTransaksi as KwitansiPdfInput;
  } else {
    const tx = inputOrTransaksi || {};
    const santri = dataSantriOrProfil || tx.santri || {};
    const profilParam = dataProfilParam || tx.profilPondok;

    const items: KwitansiItem[] = [];

    if (Array.isArray(tx.items)) {
      tx.items.forEach((it: any) => {
        if (it.bulan) {
          const mName = MONTH_NAMES_IND[it.bulan - 1] || `Bulan ${it.bulan}`;
          items.push({
            deskripsi: `Syahriyah ${mName} ${it.tahun} (${it.jenis || 'Penuh'})`,
            nominal: it.nominal,
          });
        } else if (it.event) {
          items.push({
            deskripsi: `Iuran Kilatan ${it.event} ${it.tahun} (${it.jenis || 'Penuh'})`,
            nominal: it.nominal,
          });
        } else {
          items.push({
            deskripsi: it.deskripsi || it.nama || 'Iuran',
            nominal: it.nominal || 0,
          });
        }
      });
    }

    const iuranTambahan: KwitansiItem[] = [];
    if (
      tx.transaksi_data?.iuran_tambahan &&
      Array.isArray(tx.transaksi_data.iuran_tambahan)
    ) {
      tx.transaksi_data.iuran_tambahan.forEach((it: any) => {
        iuranTambahan.push({
          deskripsi: it.nama || 'Iuran Tambahan',
          nominal: it.nominal || 0,
        });
      });
    }

    input = {
      idTransaksi: tx.id || `KWT-${Date.now()}`,
      tipe: tx.items?.[0]?.event ? 'Kilatan' : 'Syahriyah',
      santri: santri,
      tanggalBayar:
        tx.transaksi_data?.tanggal_bayar ||
        tx.tanggal ||
        new Date().toISOString().substring(0, 10),
      metode: tx.transaksi_data?.metode || tx.metode || 'Tunai',
      items,
      iuranTambahan,
      totalPembayaran: tx.total_pembayaran || tx.total || 0,
      keterangan: tx.transaksi_data?.keterangan || tx.keterangan || '',
      profilPondok: profilParam,
    };
  }

  const profil = input.profilPondok || pengaturanService.getProfil();
  const config = getKwitansiConfig();
  return { input, profil, config };
}

/**
 * Generates and downloads a Kwitansi PDF receipt for payments.
 */
export function generateKwitansiPdf(
  inputOrTransaksi: any,
  dataSantriOrProfil?: any,
  dataProfilParam?: any
): void {
  const { input, profil, config } = parseInputData(
    inputOrTransaksi,
    dataSantriOrProfil,
    dataProfilParam
  );

  // Create A5 Landscape PDF
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 12;

  // 1. KOP SURAT (from config)
  const kopLines = (config.kop_surat || '').split('\n');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(4, 120, 87); // Emerald 700 (#047857)
  doc.text(kopLines[0] || 'PONDOK AL HIDAYAH TERIEK', margin, 14);

  if (kopLines.length > 1) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(kopLines.slice(1).join(', '), margin, 19);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(`Pengasuh: ${profil.pengasuh || '-'}`, margin, 23);

  // Line separator below Kop
  doc.setDrawColor(5, 150, 105); // Emerald 600
  doc.setLineWidth(0.8);
  doc.line(margin, 25, pageWidth - margin, 25);

  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.2);
  doc.line(margin, 26, pageWidth - margin, 26);

  // 2. JUDUL KWITANSI & NOMOR
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('KWITANSI PEMBAYARAN', pageWidth / 2, 32, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`No: ${input.idTransaksi}`, pageWidth / 2, 36, { align: 'center' });

  // 3. INFORMASI SANTRI & TRANSAKSI
  const infoStartY = 42;
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  // Left Info
  doc.setFont('helvetica', 'bold');
  doc.text('Telah Terima Dari :', margin, infoStartY);
  doc.setFont('helvetica', 'normal');
  doc.text(input.santri.nama || '-', margin + 32, infoStartY);

  doc.setFont('helvetica', 'bold');
  doc.text('NIS / Kategori     :', margin, infoStartY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${input.santri.nis || '-'} (${input.santri.kategori || 'Santri'})`,
    margin + 32,
    infoStartY + 5
  );

  // Right Info
  const rightX = 135;
  doc.setFont('helvetica', 'bold');
  doc.text('Tanggal Bayar :', rightX, infoStartY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDateIndo(input.tanggalBayar), rightX + 25, infoStartY);

  doc.setFont('helvetica', 'bold');
  doc.text('Metode            :', rightX, infoStartY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(input.metode || 'Tunai', rightX + 25, infoStartY + 5);

  // 4. TABEL RINCIAN
  const allItems = [...input.items, ...(input.iuranTambahan || [])];
  const tableRows = allItems.map((item, index) => [
    (index + 1).toString(),
    item.deskripsi,
    formatRupiah(item.nominal),
  ]);

  autoTable(doc, {
    startY: infoStartY + 9,
    margin: { left: margin, right: margin },
    head: [['No', 'Rincian Pembayaran', 'Nominal']],
    body: tableRows,
    foot: [['', 'TOTAL PEMBAYARAN', formatRupiah(input.totalPembayaran)]],
    theme: 'grid',
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 40, halign: 'right' },
    },
  });

  // @ts-ignore
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : infoStartY + 35;

  // 5. TERBILANG
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Terbilang :', margin, finalY + 5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const terbilangStr = `# ${terbilang(input.totalPembayaran)} #`;
  doc.text(terbilangStr, margin + 17, finalY + 5);

  const catatanParts = [input.keterangan, config.footer_kwitansi].filter(Boolean);
  if (catatanParts.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Catatan: ${catatanParts.join(' | ')}`, margin, finalY + 9);
  }

  // 6. AREA TANDA TANGAN
  const sigY = Math.max(finalY + 12, 110);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Penyetor,', margin + 15, sigY, { align: 'center' });
  doc.text('( ............................. )', margin + 15, sigY + 16, { align: 'center' });

  const rightSigX = pageWidth - margin - 25;
  doc.text(`Pare, ${formatDateIndo(input.tanggalBayar)}`, rightSigX, sigY - 4, {
    align: 'center',
  });
  doc.text('Bendahara Pondok,', rightSigX, sigY, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.text(
    `( ${config.nama_penandatangan || profil.bendahara || 'Shofil Mubarok'} )`,
    rightSigX,
    sigY + 16,
    { align: 'center' }
  );

  // Download PDF
  const safeSantriName = (input.santri.nama || 'Santri').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Kwitansi_${input.tipe}_${safeSantriName}_${input.idTransaksi}.pdf`;
  doc.save(filename);
}

/**
 * Opens a print window with styled HTML kwitansi and triggers window.print() automatically.
 */
export function printKwitansiHtml(
  inputOrTransaksi: any,
  dataSantriOrProfil?: any,
  dataProfilParam?: any
): void {
  const { input, profil, config } = parseInputData(
    inputOrTransaksi,
    dataSantriOrProfil,
    dataProfilParam
  );

  const allItems = [...input.items, ...(input.iuranTambahan || [])];
  const kopHtml = (config.kop_surat || '')
    .split('\n')
    .map((line, idx) =>
      idx === 0
        ? `<h1>${line}</h1>`
        : `<p>${line}</p>`
    )
    .join('');

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Kwitansi ${input.idTransaksi}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 24px;
            color: #0f172a;
            background: #ffffff;
            font-size: 13px;
            line-height: 1.5;
          }
          .kwitansi-container {
            max-width: 680px;
            margin: 0 auto;
            border: 1px solid #cbd5e1;
            padding: 24px;
            border-radius: 8px;
          }
          .kop {
            border-bottom: 2px solid #059669;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .kop img {
            width: 48px;
            height: 48px;
            object-fit: contain;
          }
          .kop h1 {
            margin: 0 0 4px 0;
            color: #047857;
            font-size: 18px;
            font-weight: 700;
          }
          .kop p {
            margin: 2px 0;
            color: #64748b;
            font-size: 11px;
          }
          .title-section {
            text-align: center;
            margin-bottom: 16px;
          }
          .title-section h2 {
            margin: 0;
            font-size: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .title-section p {
            margin: 2px 0 0 0;
            font-size: 11px;
            color: #64748b;
          }
          .info-grid {
            display: flex;
            justify-content: space-between;
            margin-bottom: 16px;
            background: #f8fafc;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .info-col p {
            margin: 3px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background-color: #059669;
            color: #ffffff;
            font-weight: 600;
            font-size: 12px;
          }
          tfoot tr td {
            background-color: #f1f5f9;
            font-weight: 700;
          }
          .terbilang-box {
            background-color: #ecfdf5;
            border: 1px solid #a7f3d0;
            padding: 8px 12px;
            border-radius: 6px;
            font-style: italic;
            color: #065f46;
            margin-bottom: 12px;
            font-size: 12px;
          }
          .footer-sig {
            display: flex;
            justify-content: space-between;
            margin-top: 32px;
            text-align: center;
          }
          .sig-box {
            width: 200px;
          }
          .sig-space {
            height: 50px;
          }
          @media print {
            body { padding: 0; }
            .kwitansi-container { border: none; padding: 0; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="kwitansi-container">
          <div class="kop">
            ${config.logo_base64 ? `<img src="${config.logo_base64}" alt="Logo" />` : ''}
            <div>
              ${kopHtml}
              <p>Pengasuh: ${profil.pengasuh || '-'}</p>
            </div>
          </div>

          <div class="title-section">
            <h2>Kwitansi Pembayaran</h2>
            <p>No. Transaksi: <strong>${input.idTransaksi}</strong></p>
          </div>

          <div class="info-grid">
            <div class="info-col">
              <p><strong>Telah Terima Dari:</strong> ${input.santri.nama || '-'}</p>
              <p><strong>NIS / Kategori:</strong> ${input.santri.nis || '-'} (${input.santri.kategori || 'Santri'})</p>
            </div>
            <div class="info-col" style="text-align: right;">
              <p><strong>Tanggal Bayar:</strong> ${formatDateIndo(input.tanggalBayar)}</p>
              <p><strong>Metode Pembayaran:</strong> ${input.metode || 'Tunai'}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">No</th>
                <th>Rincian Pembayaran</th>
                <th style="width: 140px; text-align: right;">Nominal</th>
              </tr>
            </thead>
            <tbody>
              ${allItems
                .map(
                  (item, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td>${item.deskripsi}</td>
                  <td style="text-align: right;">${formatRupiah(item.nominal)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="text-align: right;">TOTAL PEMBAYARAN</td>
                <td style="text-align: right; color: #047857; font-size: 14px;">${formatRupiah(input.totalPembayaran)}</td>
              </tr>
            </tfoot>
          </table>

          <div class="terbilang-box">
            <strong>Terbilang:</strong> # ${terbilang(input.totalPembayaran)} #
          </div>

          <p style="font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 16px;">
            ${[input.keterangan, config.footer_kwitansi].filter(Boolean).join(' | ')}
          </p>

          <div class="footer-sig">
            <div class="sig-box">
              <p>Penyetor,</p>
              <div class="sig-space"></div>
              <p>( ............................. )</p>
            </div>
            <div class="sig-box">
              <p>Pare, ${formatDateIndo(input.tanggalBayar)}</p>
              <p><strong>Bendahara Pondok,</strong></p>
              <div class="sig-space"></div>
              <p><strong>( ${config.nama_penandatangan || profil.bendahara || 'Shofil Mubarok'} )</strong></p>
            </div>
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
}

/**
 * Opens a thermal receipt print window (58mm width).
 */
export async function printKwitansiThermal(
  inputOrTransaksi: any,
  dataSantriOrProfil?: any,
  dataProfilParam?: any
): Promise<void> {
  const { input, profil } = parseInputData(
    inputOrTransaksi,
    dataSantriOrProfil,
    dataProfilParam
  );
  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (!printWindow) return;
  let config = getKwitansiConfig();
  try {
    const { data } = await api.get('/pengaturan/kwitansi-config');
    if (data?.success && data.data) config = { ...config, ...data.data };
  } catch {
    // Fall back to the locally cached receipt configuration.
  }

  const allItems = [...input.items, ...(input.iuranTambahan || [])];
  const kopText = (config.kop_surat || '').split('\n')[0] || 'PONDOK AL HIDAYAH';
  const paperWidth = config.paper_width_thermal === '80mm' ? '80mm' : '58mm';
  const fontSize = config.font_size_thermal || '12px';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Struk Thermal ${input.idTransaksi}</title>
        <style>
          @page {
            margin: 0;
            size: ${paperWidth} auto;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: ${paperWidth};
            margin: 0 auto;
            padding: 8px;
            color: #000000;
            background: #ffffff;
            font-size: ${fontSize};
            line-height: 1.2;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .logo {
            max-width: 40px;
            max-height: 40px;
            display: block;
            margin: 0 auto 4px auto;
            filter: grayscale(100%);
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.833em;
          }
          th, td {
            padding: 2px 0;
            vertical-align: top;
          }
          .footer {
            text-align: center;
            margin-top: 10px;
            font-size: 1em;
          }
        </style>
      </head>
      <body>
        ${config.logo_base64 ? `<img src="${config.logo_base64}" class="logo" alt="Logo" />` : ''}
        <div class="text-center font-bold" style="font-size: 12px;">${kopText}</div>
        <div class="text-center" style="font-size: 9px; margin-bottom: 4px;">${(config.kop_surat || '').split('\n').slice(1).join(', ')}</div>
        
        <div class="divider"></div>
        
        <div style="font-size: 10px;">
          <div>No : ${input.idTransaksi}</div>
          <div>Tgl: ${formatDateIndo(input.tanggalBayar)}</div>
          <div>Nama: ${input.santri.nama || '-'} (${input.santri.nis || '-'})</div>
          <div>Metode: ${input.metode || 'Tunai'}</div>
        </div>

        <div class="divider"></div>

        <table>
          <tbody>
            ${allItems
              .map(
                (item) => `
              <tr>
                <td colspan="2">${item.deskripsi}</td>
              </tr>
              <tr>
                <td></td>
                <td class="text-right">${formatRupiah(item.nominal)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="divider"></div>

        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px;">
          <span>TOTAL:</span>
          <span>${formatRupiah(input.totalPembayaran)}</span>
        </div>

        <div class="divider"></div>

        <div class="footer">
          <div>Terbilang:</div>
          <div style="font-style: italic; font-size: 9px; margin-bottom: 6px;"># ${terbilang(input.totalPembayaran)} #</div>
          <div>${config.catatan_kaki_thermal || 'Simpan struk ini sebagai bukti sah.'}</div>
          <div style="margin-top: 6px; font-size: 9px;">Bendahara: ${config.nama_penandatangan || 'Shofil Mubarok'}</div>
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
}
