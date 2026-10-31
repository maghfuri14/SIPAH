const { pool } = require('../config/db');

async function logActivity(userId, aksi, modul, referensiId = null, detail = null, ipAddress = null) {
  try {
    await pool.execute(
      `INSERT INTO activity_log
        (user_id, aksi, modul, referensi_id, detail, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        aksi,
        modul,
        referensiId || null,
        detail === null ? null : JSON.stringify(detail),
        ipAddress || null,
      ],
    );
  } catch (error) {
    console.error('Gagal mencatat activity_log:', error.message);
  }
}

module.exports = { logActivity };
