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

async function getUsers(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, nama_lengkap AS nama, role, status FROM users ORDER BY nama_lengkap',
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function createUser(req, res) {
  try {
    const { username, password, nama, role, status = 'Aktif' } = req.body;
    if (!username || !password || !nama || !role) {
      return res.status(400).json({ success: false, message: 'Data pengguna tidak lengkap.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    await pool.execute(
      `INSERT INTO users (id, username, password, nama_lengkap, role, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, username, hashedPassword, nama, role, status],
    );
    return res.status(201).json({
      success: true,
      data: { id, username, nama, role, status },
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Username sudah digunakan.' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateUser(req, res) {
  try {
    const { username, password, nama, role, status } = req.body;
    const fields = [];
    const values = [];
    if (username !== undefined) { fields.push('username = ?'); values.push(username); }
    if (nama !== undefined) { fields.push('nama_lengkap = ?'); values.push(nama); }
    if (role !== undefined) { fields.push('role = ?'); values.push(role); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (password) { fields.push('password = ?'); values.push(await bcrypt.hash(password, 10)); }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'Tidak ada perubahan.' });
    values.push(req.params.id);
    const [result] = await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteUser(req, res) {
  try {
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { login, seedAdmin, getUsers, createUser, updateUser, deleteUser };
