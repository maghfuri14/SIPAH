require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { createTables } = require('./config/schema');
const santriRoutes = require('./routes/santriRoutes');
const authRoutes = require('./routes/authRoutes');
const { seedAdmin } = require('./controllers/authController');
const kasRoutes = require('./routes/kasRoutes');
const pendaftaranRoutes = require('./routes/pendaftaranRoutes');
const syahriyahRoutes = require('./routes/syahriyahRoutes');
const kilatanRoutes = require('./routes/kilatanRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const laporanRoutes = require('./routes/laporanRoutes');
const searchRoutes = require('./routes/searchRoutes');
const notifikasiRoutes = require('./routes/notifikasiRoutes');
const pengaturanRoutes = require('./routes/pengaturanRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/santri', santriRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/kas', kasRoutes);
app.use('/api/pendaftaran', pendaftaranRoutes);
app.use('/api/syahriyah', syahriyahRoutes);
app.use('/api/kilatan', kilatanRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/laporan', laporanRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifikasi', notifikasiRoutes);
app.use('/api/pengaturan', pengaturanRoutes);

app.get('/api/health', (request, response) => {
  response.json({
    status: 'ok',
    message: 'Backend berjalan!',
  });
});

async function startServer() {
  try {
    const db = await connectDB();
    await createTables(db);
    await seedAdmin();
    app.listen(PORT, () => {
      console.log(`Server berjalan di port ${PORT}`);
    });
  } catch (error) {
    console.error('Gagal menjalankan server:', error.message);
    process.exit(1);
  }
}

startServer();
