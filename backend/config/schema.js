async function createTables(db) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS app_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value JSON NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      nama_lengkap VARCHAR(150) NOT NULL,
      role VARCHAR(50) NOT NULL,
      status ENUM('Aktif', 'Nonaktif') NOT NULL DEFAULT 'Aktif'
    )`,
    `CREATE TABLE IF NOT EXISTS santri (
      id VARCHAR(36) PRIMARY KEY,
      nis VARCHAR(50) NOT NULL UNIQUE,
      nama VARCHAR(150) NOT NULL,
      nama_wali VARCHAR(150),
      no_hp_santri VARCHAR(20),
      no_hp_wali VARCHAR(20),
      kategori VARCHAR(50),
      status VARCHAR(50),
      status_syahriyah ENUM('Normal', 'Keringanan', 'Bebas') NOT NULL DEFAULT 'Normal',
      status_kilatan ENUM('Normal', 'Keringanan', 'Bebas') NOT NULL DEFAULT 'Normal',
      tanggal_masuk DATE,
      catatan TEXT,
      version INT NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS pendaftaran (
      id VARCHAR(36) PRIMARY KEY,
      nama_calon VARCHAR(150) NOT NULL,
      nama_wali VARCHAR(150),
      no_hp_santri VARCHAR(20),
      no_hp_wali VARCHAR(20),
      kategori VARCHAR(50),
      tanggal_pendaftaran DATE,
      status VARCHAR(50),
      catatan TEXT,
      nis_generated VARCHAR(50),
      santri_id VARCHAR(36)
    )`,
    `CREATE TABLE IF NOT EXISTS kas (
      id VARCHAR(36) PRIMARY KEY,
      tanggal DATE NOT NULL,
      jenis ENUM('Pemasukan', 'Pengeluaran') NOT NULL,
      kategori_nama VARCHAR(100),
      nominal DECIMAL(15, 2) NOT NULL,
      keterangan TEXT,
      status ENUM('Aktif', 'Void', 'Disetujui', 'Menunggu', 'Ditolak') NOT NULL DEFAULT 'Disetujui',
      created_by VARCHAR(36) NULL,
      referensi_id VARCHAR(36)
    )`,
    `CREATE TABLE IF NOT EXISTS transaksi (
      id VARCHAR(36) PRIMARY KEY,
      kas_id VARCHAR(36) NULL,
      no_kwitansi VARCHAR(20) NULL,
      santri_id VARCHAR(36) NULL,
      modul ENUM('Syahriyah', 'Kilatan', 'Kas') NOT NULL,
      referensi_id VARCHAR(36) NULL,
      nominal DECIMAL(15, 2) NOT NULL DEFAULT 0,
      user_id VARCHAR(36) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      cancel_request_status ENUM('none', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'none',
      cancel_requested_by VARCHAR(36) NULL,
      cancel_requested_at DATETIME NULL,
      cancel_reason TEXT NULL,
      FOREIGN KEY (kas_id) REFERENCES kas(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS kwitansi_sequence (
      tanggal DATE PRIMARY KEY,
      sequence INT NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS kas_keluar_approvals (
      id VARCHAR(36) PRIMARY KEY,
      kas_id VARCHAR(36) NOT NULL,
      nominal DECIMAL(15, 2) NOT NULL,
      requested_by VARCHAR(36) NULL,
      status ENUM('Menunggu', 'Disetujui', 'Ditolak') NOT NULL DEFAULT 'Menunggu',
      reason TEXT NULL,
      processed_by VARCHAR(36) NULL,
      processed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kas_id) REFERENCES kas(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS tarif_history (
      id VARCHAR(36) PRIMARY KEY,
      bulan_efektif INT NOT NULL,
      tahun_efektif INT NOT NULL,
      config JSON NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      version INT NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS syahriyah (
      id VARCHAR(36) PRIMARY KEY,
      santri_id VARCHAR(36) NOT NULL,
      tahun INT NOT NULL,
      bulan VARCHAR(20) NOT NULL,
      nominal_tagihan DECIMAL(15, 2) NOT NULL DEFAULT 0,
      total_dibayar DECIMAL(15, 2) NOT NULL DEFAULT 0,
      status VARCHAR(50),
      FOREIGN KEY (santri_id) REFERENCES santri(id)
    )`,
    `CREATE TABLE IF NOT EXISTS kilatan (
      id VARCHAR(36) PRIMARY KEY,
      santri_id VARCHAR(36) NOT NULL,
      tahun INT NOT NULL,
      event VARCHAR(150) NOT NULL,
      nominal_tagihan DECIMAL(15, 2) NOT NULL DEFAULT 0,
      total_dibayar DECIMAL(15, 2) NOT NULL DEFAULT 0,
      status VARCHAR(50),
      FOREIGN KEY (santri_id) REFERENCES santri(id),
      version INT NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS syahriyah_keringanan (
      id VARCHAR(36) PRIMARY KEY,
      santri_id VARCHAR(36) NOT NULL,
      tahun INT NOT NULL,
      bulan_mulai INT NOT NULL,
      bulan_selesai INT NOT NULL,
      jenis ENUM('Bebas', 'Keringanan') NOT NULL,
      keterangan TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (santri_id) REFERENCES santri(id) ON DELETE CASCADE,
      tipe ENUM('Syahriyah', 'Kilatan') NOT NULL DEFAULT 'Syahriyah',
      version INT NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS tarif (
      id VARCHAR(36) PRIMARY KEY,
      nama VARCHAR(100),
      nominal DECIMAL(15, 2) NOT NULL DEFAULT 0,
      version INT NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS keringanan_santri (
      id VARCHAR(36) PRIMARY KEY,
      santri_id VARCHAR(36) NOT NULL,
      tipe ENUM('Syahriyah', 'Kilatan') NOT NULL DEFAULT 'Syahriyah',
      version INT NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS master_kilatan (
      id VARCHAR(36) PRIMARY KEY,
      nama VARCHAR(150) NOT NULL,
      nominal DECIMAL(15, 2) NOT NULL DEFAULT 0,
      version INT NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS activity_log (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(36),
      aksi VARCHAR(50) NOT NULL,
      modul VARCHAR(50) NOT NULL,
      referensi_id VARCHAR(36) NULL,
      detail JSON NULL,
      ip_address VARCHAR(45) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS idempotency_keys (
      id INT AUTO_INCREMENT PRIMARY KEY,
      idempotency_key VARCHAR(64) NOT NULL UNIQUE,
      user_id VARCHAR(36),
      endpoint VARCHAR(100) NOT NULL,
      payload_hash CHAR(64) NOT NULL,
      response_snapshot JSON NOT NULL,
      status_code INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    )`,
  ];

  for (const query of tables) {
    await db.execute(query);
  }

  const uniqueIndexes = [
    ["ALTER TABLE syahriyah ADD UNIQUE INDEX unique_syahriyah (santri_id, tahun, bulan)", 'ER_DUP_KEYNAME', 'syahriyah'],
    ["ALTER TABLE kilatan ADD UNIQUE INDEX unique_kilatan (santri_id, tahun, event)", 'ER_DUP_KEYNAME', 'kilatan'],
    ["ALTER TABLE transaksi ADD UNIQUE INDEX unique_no_kwitansi (no_kwitansi)", 'ER_DUP_KEYNAME', 'transaksi'],
  ];
  for (const [query, duplicateCode] of uniqueIndexes) {
    try {
      await db.execute(query);
    } catch (error) {
      if (error.code !== duplicateCode && error.code !== 'ER_DUP_ENTRY') {
        throw error;
      }
    }
  }

  const optionalColumns = [
    "ALTER TABLE pendaftaran ADD COLUMN catatan TEXT",
    "ALTER TABLE pendaftaran ADD COLUMN nis_generated VARCHAR(50)",
    "ALTER TABLE pendaftaran ADD COLUMN santri_id VARCHAR(36)",
    "ALTER TABLE kas ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Aktif'",
    "ALTER TABLE kas ADD COLUMN created_by VARCHAR(36) NULL",
    "ALTER TABLE kas MODIFY COLUMN status ENUM('Aktif', 'Void', 'Disetujui', 'Menunggu', 'Ditolak') NOT NULL DEFAULT 'Disetujui'",
    "ALTER TABLE transaksi ADD COLUMN cancel_request_status ENUM('none', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'none'",
    "ALTER TABLE transaksi ADD COLUMN cancel_requested_by VARCHAR(36) NULL",
    "ALTER TABLE transaksi ADD COLUMN cancel_requested_at DATETIME NULL",
    "ALTER TABLE transaksi ADD COLUMN no_kwitansi VARCHAR(20) NULL",
    "ALTER TABLE kas ADD COLUMN referensi_id VARCHAR(36)",
    "ALTER TABLE santri ADD COLUMN version INT NOT NULL DEFAULT 1",
    "ALTER TABLE santri ADD COLUMN status_kilatan ENUM('Normal', 'Keringanan', 'Bebas') NOT NULL DEFAULT 'Normal'",
    "ALTER TABLE santri MODIFY COLUMN status_syahriyah ENUM('Normal', 'Keringanan', 'Bebas') NOT NULL DEFAULT 'Normal'",
    "ALTER TABLE tarif_history ADD COLUMN version INT NOT NULL DEFAULT 1",
    "ALTER TABLE syahriyah_keringanan ADD COLUMN version INT NOT NULL DEFAULT 1",
    "ALTER TABLE kilatan ADD COLUMN version INT NOT NULL DEFAULT 1",
    "ALTER TABLE tarif ADD COLUMN version INT NOT NULL DEFAULT 1",
    "ALTER TABLE keringanan_santri ADD COLUMN version INT NOT NULL DEFAULT 1",
    "ALTER TABLE keringanan_santri ADD COLUMN tipe ENUM('Syahriyah', 'Kilatan') NOT NULL DEFAULT 'Syahriyah'",
    "ALTER TABLE syahriyah_keringanan ADD COLUMN tipe ENUM('Syahriyah', 'Kilatan') NOT NULL DEFAULT 'Syahriyah'",
    "ALTER TABLE master_kilatan ADD COLUMN version INT NOT NULL DEFAULT 1",
  ];

  for (const query of optionalColumns) {
    try {
      await db.execute(query);
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

  }
}

module.exports = { createTables };
