const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

async function login(req, res) {
  try {
    const { username, password } = req.body;
    const [users] = await pool.execute(
      'SELECT id, username, password, nama_lengkap, role, status FROM users WHERE username = ? LIMIT 1',
      [username],
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah',
      });
    }

    const user = users[0];
    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches || user.status !== 'Aktif') {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah',
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' },
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nama_lengkap: user.nama_lengkap,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function seedAdmin() {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM users');

  if (rows[0].total > 0) {
    return;
  }

  const defaultPassword = await bcrypt.hash('admin123', 10);
  const users = [
    ['superadmin', 'Muhammad Maghfuri', 'super_admin'],
    ['admin1', 'Shofil Mubarok', 'admin'],
    ['pengasuh', 'KH. Mujtaba Thoifur', 'pemilik'],
  ];

  for (const [username, namaLengkap, role] of users) {
    await pool.execute(
      `INSERT INTO users (
        id, username, password, nama_lengkap, role, status
      ) VALUES (?, ?, ?, ?, ?, 'Aktif')`,
      [crypto.randomUUID(), username, defaultPassword, namaLengkap, role],
    );
  }

  console.log('User admin default berhasil dibuat.');
}

module.exports = { login, seedAdmin };
