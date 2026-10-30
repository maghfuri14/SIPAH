const { pool } = require('../config/db');

async function globalSearch(req, res) {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ success: true, data: [] });
    const keyword = `%${q}%`;
    const [santri] = await pool.execute(
      `SELECT id, nis, nama FROM santri
       WHERE nama LIKE ? OR nis LIKE ? ORDER BY nama ASC LIMIT 8`,
      [keyword, keyword],
    );
    const [kas] = await pool.execute(
      `SELECT id, tanggal, jenis, kategori_nama, keterangan FROM kas
       WHERE keterangan LIKE ? OR kategori_nama LIKE ? ORDER BY tanggal DESC LIMIT 8`,
      [keyword, keyword],
    );

    res.json({
      success: true,
      data: [
        ...santri.map((item) => ({
          type: 'santri',
          id: item.id,
          title: item.nama,
          subtitle: `NIS ${item.nis}`,
          path: `/santri/${item.id}`,
        })),
        ...kas.map((item) => ({
          type: 'kas',
          id: item.id,
          title: item.keterangan || item.kategori_nama,
          subtitle: `${item.jenis} - ${item.tanggal}`,
          path: '/kas',
        })),
      ],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { globalSearch };
