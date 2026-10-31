const { pool } = require('../config/db');

const DEFAULT_KWITANSI_CONFIG = {
  kop_surat: 'PONDOK AL HIDAYAH TERIEK\nJln. Mayor Bismo No 71-73 Tertek Pare Kediri',
  footer_kwitansi: 'Terima kasih atas pembayaran Anda',
  nama_penandatangan: 'Shofil Mubarok',
  logo_base64: '',
  catatan_kaki_thermal: 'Simpan struk ini sebagai bukti sah.',
  font_size_thermal: '12px',
  paper_width_thermal: '58mm',
};

const DEFAULT_TARIF_CONFIG = {
  syahriyah_mukim: 0,
  syahriyah_nduduk: 0,
  syahriyah_kilatan: 0,
  event_kilatan: 0,
};

const DEFAULT_PROFIL = {
  nama_pondok: 'Pondok Al Hidayah Tertek',
  alamat: 'Jln. Mayor Bismo No 71-73 Tertek Pare Kediri',
  pengasuh: 'KH. Mujtaba Thoifur',
  ketua: 'Muhammad Maghfuri',
  bendahara: 'Shofil Mubarok',
};

async function getAppSetting(key, fallback, res) {
  const [rows] = await pool.execute(
    'SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1',
    [key],
  );
  let value = fallback;
  if (rows.length > 0) {
    try {
      value = typeof rows[0].setting_value === 'string'
        ? JSON.parse(rows[0].setting_value)
        : rows[0].setting_value;
    } catch {
      value = fallback;
    }
  }
  return res.json({ success: true, data: value });
}

async function saveAppSetting(key, value) {
  await pool.execute(
    `INSERT INTO app_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [key, JSON.stringify(value)],
  );
}

async function getProfilPondok(req, res) {
  return getAppSetting('profil_pondok', DEFAULT_PROFIL, res);
}

async function saveProfilPondok(req, res) {
  await saveAppSetting('profil_pondok', req.body);
  return res.json({ success: true, data: req.body });
}

async function getIuranTambahan(req, res) {
  return getAppSetting('iuran_tambahan', [], res);
}

async function saveIuranTambahan(req, res) {
  await saveAppSetting('iuran_tambahan', req.body);
  return res.json({ success: true, data: req.body });
}

async function getKategoriKas(req, res) {
  return getAppSetting('kategori_kas', { pemasukan: [], pengeluaran: [] }, res);
}

async function saveKategoriKas(req, res) {
  await saveAppSetting('kategori_kas', req.body);
  return res.json({ success: true, data: req.body });
}

function normalizeTarif(body) {
  return Object.fromEntries(
    Object.keys(DEFAULT_TARIF_CONFIG).map((key) => [
      key,
      Math.max(0, Number(body[key] ?? DEFAULT_TARIF_CONFIG[key]) || 0),
    ]),
  );
}

async function getTarifConfig(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1',
      ['tarif_config'],
    );
    const saved = rows[0]?.setting_value;
    const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
    return res.json({ success: true, data: { ...DEFAULT_TARIF_CONFIG, ...(parsed || {}) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function saveTarifConfig(req, res) {
  try {
    const normalized = normalizeTarif(req.body);
    const bulanEfektif = Number(req.body.bulan_efektif || 1);
    const tahunEfektif = Number(req.body.tahun_efektif || new Date().getFullYear());
    if (bulanEfektif < 1 || bulanEfektif > 12 || !Number.isInteger(tahunEfektif)) {
      return res.status(400).json({ success: false, message: 'Periode tarif efektif tidak valid.' });
    }
    const [paidRows] = await pool.execute(
      `SELECT id FROM syahriyah WHERE tahun = ? AND bulan = ? AND total_dibayar > 0 LIMIT 1`,
      [tahunEfektif, String(bulanEfektif)],
    );
    const [paidKilatanRows] = await pool.execute(
      `SELECT id FROM kilatan WHERE tahun = ? AND total_dibayar > 0 LIMIT 1`,
      [tahunEfektif],
    );
    if (paidRows.length > 0 || (bulanEfektif === 1 && paidKilatanRows.length > 0)) {
      return res.status(400).json({ success: false, message: 'Tarif tidak dapat diubah karena bulan efektif sudah memiliki pembayaran.' });
    }
    const crypto = require('crypto');
    await pool.execute(
      `INSERT INTO app_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      ['tarif_config', JSON.stringify(normalized)],
    );
    await pool.execute(
      `INSERT INTO tarif_history (id, bulan_efektif, tahun_efektif, config)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE config = VALUES(config)`,
      [crypto.randomUUID(), bulanEfektif, tahunEfektif, JSON.stringify(normalized)],
    );
    return res.json({ success: true, data: normalized });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getKwitansiConfig(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1',
      ['kwitansi_config'],
    );
    const saved = rows[0]?.setting_value;
    const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
    return res.json({
      success: true,
      data: { ...DEFAULT_KWITANSI_CONFIG, ...(parsed || {}) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function saveKwitansiConfig(req, res) {
  try {
    const allowedFontSizes = ['10px', '12px', '14px'];
    const allowedPaperWidths = ['58mm', '80mm'];
    const config = req.body;

    if (!allowedFontSizes.includes(config.font_size_thermal)) {
      return res.status(400).json({ success: false, message: 'Ukuran font thermal tidak valid.' });
    }
    if (!allowedPaperWidths.includes(config.paper_width_thermal)) {
      return res.status(400).json({ success: false, message: 'Lebar kertas thermal tidak valid.' });
    }

    const normalized = {
      kop_surat: String(config.kop_surat || DEFAULT_KWITANSI_CONFIG.kop_surat),
      footer_kwitansi: String(config.footer_kwitansi || DEFAULT_KWITANSI_CONFIG.footer_kwitansi),
      nama_penandatangan: String(config.nama_penandatangan || DEFAULT_KWITANSI_CONFIG.nama_penandatangan),
      logo_base64: typeof config.logo_base64 === 'string' ? config.logo_base64 : '',
      catatan_kaki_thermal: String(config.catatan_kaki_thermal || DEFAULT_KWITANSI_CONFIG.catatan_kaki_thermal),
      font_size_thermal: config.font_size_thermal,
      paper_width_thermal: config.paper_width_thermal,
    };

    await pool.execute(
      `INSERT INTO app_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      ['kwitansi_config', JSON.stringify(normalized)],
    );

    return res.json({ success: true, data: normalized });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getKwitansiConfig,
  saveKwitansiConfig,
  getTarifConfig,
  saveTarifConfig,
  getProfilPondok,
  saveProfilPondok,
  getIuranTambahan,
  saveIuranTambahan,
  getKategoriKas,
  saveKategoriKas,
};
