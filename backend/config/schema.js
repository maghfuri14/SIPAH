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
      status_syahriyah ENUM('Normal', 'Bebas', 'Keringanan') NOT NULL DEFAULT 'Normal',
      tanggal_masuk DATE,
      catatan TEXT
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
      status VARCHAR(20) NOT NULL DEFAULT 'Aktif',
      referensi_id VARCHAR(36)
    )`,
    `CREATE TABLE IF NOT EXISTS tarif_history (
      id VARCHAR(36) PRIMARY KEY,
      bulan_efektif INT NOT NULL,
      tahun_efektif INT NOT NULL,
      config JSON NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
      FOREIGN KEY (santri_id) REFERENCES santri(id)
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
      FOREIGN KEY (santri_id) REFERENCES santri(id) ON DELETE CASCADE
    )`,
  ];

  for (const query of tables) {
    await db.execute(query);
  }

  const uniqueIndexes = [
    ["ALTER TABLE syahriyah ADD UNIQUE INDEX unique_syahriyah (santri_id, tahun, bulan)", 'ER_DUP_KEYNAME', 'syahriyah'],
    ["ALTER TABLE kilatan ADD UNIQUE INDEX unique_kilatan (santri_id, tahun, event)", 'ER_DUP_KEYNAME', 'kilatan'],
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
    "ALTER TABLE kas ADD COLUMN referensi_id VARCHAR(36)",
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
