const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function connectDB() {
  const connection = await pool.getConnection();
  await connection.ping();
  connection.release();
  console.log('Koneksi MySQL berhasil.');
  return pool;
}

module.exports = { pool, connectDB };
