import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePeriodFilter } from '@/contexts/PeriodFilterContext';
import { loadPageDashboardData } from '@/lib/data/dashboardDataLoader';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import ExportButton from '@/components/export/ExportButton';
import {
  FileText,
  Dog,
  Fish,
  Sprout,
  ArrowUpRight,
  UploadCloud,
  Layers,
  Loader2,
} from 'lucide-react';

export default function DomestikKeluar() {
  const periodFilter = usePeriodFilter();
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const formatPeriodLabel = () =>
    typeof periodFilter?.formatPeriodLabel === 'function'
      ? periodFilter.formatPeriodLabel()
      : 'Tahun 2026';

  useEffect(() => {
    fetchLiveData();
  }, [
    periodFilter.periodType,
    periodFilter.selectedYear,
    periodFilter.selectedMonth,
    periodFilter.selectedQuarter,
    periodFilter.selectedSemester,
    periodFilter.customRange?.startDate,
    periodFilter.customRange?.endDate,
    periodFilter.selectedSatpel,
    periodFilter.selectedPospels,
  ]);


  const fetchLiveData = async () => {
    setIsLoading(true);
    const data = await loadPageDashboardData('domestik_keluar', periodFilter);
    setDashboardData(data);
    setIsLoading(false);
  };

  const hasRealData = dashboardData?.hasRealData || false;
  const recordCount = dashboardData?.recordCount || 0;
  const rawRecords = dashboardData?.rawRecords || [];
  const chartConfigs = dashboardData?.chartConfigs || [];
  const kpis = dashboardData?.kpis || {
    totalSertifikat: 0,
    hewanCount: 0,
    ikanCount: 0,
    tumbuhanCount: 0,
    hewanPercent: 0,
    ikanPercent: 0,
    tumbuhanPercent: 0,
  };

  const chartDataMap = {};
  chartConfigs.forEach((cfg) => {
    chartDataMap[cfg.id] = rawRecords;
  });

  return (
    <div id="domestik-keluar-export-area" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Dashboard Domestik Keluar</h2>
            {isLoading && <Loader2 size={16} className="spin" style={{ color: 'var(--primary)' }} />}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Visualisasi pengajuan karantina Domestik Keluar dari Sulawesi Utara (Hewan, Ikan, Tumbuhan)
          </p>
        </div>

        <ExportButton
          pageTitle="Dashboard Domestik Keluar"
          periodLabel={formatPeriodLabel()}
          kpis={kpis}
          chartConfigs={chartConfigs}
          chartDataMap={chartDataMap}
          title="Domestik_Keluar_Dashboard"
        />
      </div>

      {/* 4 KPI Cards Scoped to Domestik Keluar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* KPI 1: Total Sertifikat Domestik Keluar */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              TOTAL SERTIFIKAT
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
            {kpis.totalSertifikat ? kpis.totalSertifikat.toLocaleString('id-ID') : '0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Sertifikat
          </div>
        </div>

        {/* KPI 2: Sertifikat Komoditas Hewan */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              SERTIFIKAT KOMODITAS HEWAN
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--accent-amber)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Dog size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
            {kpis.hewanCount ? kpis.hewanCount.toLocaleString('id-ID') : '0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {kpis.totalSertifikat > 0
              ? `${kpis.hewanPercent || 0}% dari total sertifikat`
              : '0% dari total sertifikat'}
          </div>
        </div>

        {/* KPI 3: Sertifikat Komoditas Ikan */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              SERTIFIKAT KOMODITAS IKAN
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(13, 148, 136, 0.15)',
                color: 'var(--accent-teal)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Fish size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
            {kpis.ikanCount ? kpis.ikanCount.toLocaleString('id-ID') : '0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {kpis.totalSertifikat > 0
              ? `${kpis.ikanPercent || 0}% dari total sertifikat`
              : '0% dari total sertifikat'}
          </div>
        </div>

        {/* KPI 4: Sertifikat Komoditas Tumbuhan */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              SERTIFIKAT KOMODITAS TUMBUHAN
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--status-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sprout size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
            {kpis.tumbuhanCount ? kpis.tumbuhanCount.toLocaleString('id-ID') : '0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {kpis.totalSertifikat > 0
              ? `${kpis.tumbuhanPercent || 0}% dari total sertifikat`
              : '0% dari total sertifikat'}
          </div>
        </div>
      </div>

      {/* Live Charts or Empty State */}
      {hasRealData ? (
        <DashboardGrid chartConfigs={chartConfigs} chartDataMap={chartDataMap} />
      ) : (
        <div
          className="card"
          style={{
            minHeight: '260px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '0.75rem',
            textAlign: 'center',
            backgroundColor: 'var(--surface-0)',
            border: '1px dashed var(--border-color)',
            padding: '2rem 1.5rem',
          }}
        >
          <Layers size={40} style={{ color: 'var(--accent-amber)', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.0625rem', color: 'var(--text-primary)', margin: 0 }}>
            Tidak Ada Data Domestik Keluar pada Periode Ini
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '460px', fontSize: '0.8125rem', margin: 0, lineHeight: 1.5 }}>
            Tidak ditemukan catatan operasional karantina untuk filter <strong>{formatPeriodLabel()}</strong>. Silakan pilih rentang tanggal lain atau gunakan filter <em>Tahunan</em> untuk melihat seluruh data.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (periodFilter.setPeriodType) periodFilter.setPeriodType('year');
                if (periodFilter.setSelectedSatpel) periodFilter.setSelectedSatpel('all');
              }}
              style={{ fontSize: '0.8125rem' }}
            >
              Reset ke Tahunan
            </button>
            <Link to="/pengaturan/manajemen-data" className="btn btn-primary" style={{ fontSize: '0.8125rem' }}>
              <UploadCloud size={16} />
              <span>Manajemen Data</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

