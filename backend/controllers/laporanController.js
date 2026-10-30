const { pool } = require('../config/db');

async function getRekapKeuangan(req, res) {
  try {
    const { tahun, bulan = 'Semua', jenis = 'Semua' } = req.query;
    const conditions = [];
    const values = [];
    if (tahun) {
      conditions.push('YEAR(tanggal) = ?');
      values.push(tahun);
    }
    if (bulan !== 'Semua') {
      conditions.push('MONTH(tanggal) = ?');
      values.push(bulan);
    }
    if (jenis !== 'Semua') {
      conditions.push('jenis = ?');
      values.push(jenis);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.execute(`SELECT * FROM kas ${where} ORDER BY tanggal DESC`, values);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getRekapSyahriyah(req, res) {
  try {
    const { tahun, kategori = 'Semua' } = req.query;
    const values = [tahun];
    const [rows] = await pool.execute(
      `SELECT santri.id AS santriId, santri.nis, santri.nama, santri.kategori,
              COALESCE(SUM(syahriyah.nominal_tagihan), 0) AS totalTagihan,
              COALESCE(SUM(syahriyah.total_dibayar), 0) AS totalDibayar
       FROM santri
       LEFT JOIN syahriyah ON syahriyah.santri_id = santri.id AND syahriyah.tahun = ?
       WHERE (? = 'Semua' OR santri.kategori = ?)
       GROUP BY santri.id, santri.nis, santri.nama, santri.kategori
       ORDER BY santri.nis ASC`,
      [tahun, kategori, kategori],
    );

    const normalized = rows.map((row) => {
      const totalTagihan = Number(row.totalTagihan);
      const totalDibayar = Number(row.totalDibayar);
      const sisaTunggakan = Math.max(0, totalTagihan - totalDibayar);
      return {
        ...row,
        totalTagihan,
        totalDibayar,
        sisaTunggakan,
        statusTahunan: sisaTunggakan === 0 && totalDibayar > 0
          ? 'Lunas'
          : totalDibayar > 0 ? 'Sebagian' : 'Belum',
      };
    });
    res.json({ success: true, data: normalized });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getRekapSantri(req, res) {
  const { kategori = 'Semua', status = 'Semua' } = req.query;
  const conditions = [];
  const values = [];
  if (kategori !== 'Semua') { conditions.push('kategori = ?'); values.push(kategori); }
  if (status !== 'Semua') { conditions.push('status = ?'); values.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.execute(`SELECT * FROM santri ${where} ORDER BY nis ASC`, values);
  res.json({ success: true, data: rows });
}

async function getRekapPendaftaran(req, res) {
  const { tahun, bulan = 'Semua', status = 'Semua' } = req.query;
  const conditions = [];
  const values = [];
  if (tahun) { conditions.push('YEAR(tanggal_pendaftaran) = ?'); values.push(tahun); }
  if (bulan !== 'Semua') { conditions.push('MONTH(tanggal_pendaftaran) = ?'); values.push(bulan); }
  if (status !== 'Semua') { conditions.push('status = ?'); values.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.execute(`SELECT * FROM pendaftaran ${where} ORDER BY tanggal_pendaftaran DESC`, values);
  res.json({ success: true, data: rows });
}

module.exports = { getRekapKeuangan, getRekapSyahriyah, getRekapSantri, getRekapPendaftaran };
