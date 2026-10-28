import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  TrendingUp,
  Wallet,
  ArrowRight,
  Calendar as CalendarIcon,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { dashboardService, DashboardStats } from '../../lib/dashboardService';
import { formatRupiah } from '../../lib/formatter';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dashboardService.getDashboardStats().then((data) => {
      setStats(data);
      setIsLoading(false);
    });
  }, []);

  const formatDateIndonesian = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const todayFormatted = formatDateIndonesian(new Date());

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg text-xs space-y-1 z-30">
          <p className="font-bold text-[#0F172A] border-b border-slate-100 pb-1 mb-1">
            Bulan {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="font-medium" style={{ color: entry.color }}>
                {entry.name}:
              </span>
              <span className="font-bold font-mono">
                {formatRupiah(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ringkasan informasi pondok pesantren hari ini
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-xs self-start sm:self-auto">
          <CalendarIcon className="w-4 h-4 text-[#059669]" />
          <span>{todayFormatted}</span>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading || !stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-white p-5 rounded-2xl border border-slate-200 h-32" />
          ))}
        </div>
      ) : (
        <>
          {/* Kartu Ringkasan (4 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Santri */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Santri
                </span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-[#0F172A] tracking-tight">
                  {stats.totalSantri} <span className="text-sm font-normal text-slate-500">Santri</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {stats.santriAktif} Aktif | {stats.santriTidakAktif} Tidak Aktif
                </p>
              </div>
            </div>

            {/* Card 2: Pendaftar Baru */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pendaftar Baru
                </span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <UserPlus className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-[#0F172A] tracking-tight">
                  {stats.pendaftarBaru} <span className="text-sm font-normal text-slate-500">Orang</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Menunggu verifikasi
                </p>
              </div>
            </div>

            {/* Card 3: Pemasukan Bulan Ini */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pemasukan Bulan Ini
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-emerald-700 tracking-tight">
                  {formatRupiah(stats.pendapatanBulanIni)}
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Dari Kas & Syahriyah
                </p>
              </div>
            </div>

            {/* Card 4: Saldo Kas (Highlighted) */}
            <div className="bg-emerald-50/80 border border-emerald-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Saldo Kas
                </span>
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-emerald-800 tracking-tight">
                  {formatRupiah(stats.saldoKas)}
                </div>
                <p className="text-xs text-emerald-700 mt-1 font-medium">
                  Total saldo saat ini
                </p>
              </div>
            </div>
          </div>

          {/* Grid Grafik & Tabel Transaksi */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart: Tren Kas 6 Bulan Terakhir (2 Columns) */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#059669]" />
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Tren Kas 6 Bulan Terakhir
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  Pemasukan vs Pengeluaran
                </span>
              </div>

              <div className="h-72 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.trenKas}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="bulan"
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tick={{ fill: '#64748B', fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      tickFormatter={(val) => `${val / 1000}k`}
                    />
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                    />
                    <Bar
                      name="Pemasukan"
                      dataKey="pemasukan"
                      fill="#059669"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      name="Pengeluaran"
                      dataKey="pengeluaran"
                      fill="#EF4444"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table: Transaksi Kas Terakhir (1 Column) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Transaksi Terakhir
                  </h3>
                  <button
                    onClick={() => navigate('/kas')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#059669] hover:underline"
                  >
                    <span>Lihat Semua</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {stats.transaksiTerakhir.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    Belum ada transaksi kas
                  </p>
                ) : (
                  <div className="space-y-3">
                    {stats.transaksiTerakhir.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs transition-colors hover:bg-slate-100/70"
                      >
                        <div className="space-y-0.5 max-w-[160px]">
                          <span className="font-bold text-[#0F172A] block truncate">
                            {item.kategori_nama}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {item.keterangan || item.tanggal}
                          </span>
                        </div>

                        <div className="text-right font-mono">
                          {item.jenis === 'Pemasukan' ? (
                            <span className="font-bold text-emerald-600 block">
                              + {formatRupiah(item.nominal)}
                            </span>
                          ) : (
                            <span className="font-bold text-red-600 block">
                              - {formatRupiah(item.nominal)}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 block font-sans">
                            {item.tanggal}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 text-center">
                <button
                  onClick={() => navigate('/kas')}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Buka Buku Kas Pondok
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
