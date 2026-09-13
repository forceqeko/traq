import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePeriodFilter } from '@/contexts/PeriodFilterContext';
import { loadPageDashboardData } from '@/lib/data/dashboardDataLoader';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import ExportButton from '@/components/export/ExportButton';
import {
  Inbox,
  Send,
  Globe,
  PackageCheck,
  ArrowUpRight,
  UploadCloud,
  Layers,
  Loader2,
} from 'lucide-react';

export default function KarantinaIkan() {
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
    const data = await loadPageDashboardData('ikan', periodFilter);
    setDashboardData(data);
    setIsLoading(false);
  };

  const hasRealData = dashboardData?.hasRealData || false;
  const recordCount = dashboardData?.recordCount || 0;
  const rawRecords = dashboardData?.rawRecords || [];
  const chartConfigs = dashboardData?.chartConfigs || [];
  const kpis = dashboardData?.kpis || {
    totalSertifikat: 0,
    domestikMasukCount: 0,
    domestikKeluarCount: 0,
    eksporCount: 0,
    imporCount: 0,
    domestikMasukPercent: 0,
    domestikKeluarPercent: 0,
    eksporPercent: 0,
    imporPercent: 0,
  };

  const chartDataMap = {};
  chartConfigs.forEach((cfg) => {
    chartDataMap[cfg.id] = rawRecords;
  });

  return (
    <div id="ikan-export-area" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
            <h2 style={{ fontSize: '1.25rem' }}>Dashboard Karantina Ikan</h2>
            {isLoading && <Loader2 size={16} className="spin" style={{ color: 'var(--primary)' }} />}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Monitoring seluruh arus lalu lintas komoditas Ikan dan produk perikanan
          </p>
        </div>

        <ExportButton
          pageTitle="Dashboard Karantina Ikan"
          periodLabel={formatPeriodLabel()}
          kpis={kpis}
          chartConfigs={chartConfigs}
          chartDataMap={chartDataMap}
          title="Karantina_Ikan_Dashboard"
        />
      </div>

      {/* 4 KPI Cards Scoped to Karantina Ikan Traffic */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* KPI 1: Domestik Masuk Ikan */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              DOMESTIK MASUK
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Inbox size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
            {kpis.domestikMasukCount ? kpis.domestikMasukCount.toLocaleString('id-ID') : '0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {kpis.totalSertifikat > 0
              ? `${kpis.domestikMasukPercent || 0}% dari total sertifikat ikan`
              : '0% dari total sertifikat ikan'}
          </div>
        </div>

        {/* KPI 2: Domestik Keluar Ikan */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              DOMESTIK KELUAR
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--accent-indigo)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
            {kpis.domestikKeluarCount ? kpis.domestikKeluarCount.toLocaleString('id-ID') : '0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {kpis.totalSertifikat > 0
              ? `${kpis.domestikKeluarPercent || 0}% dari total sertifikat ikan`
              : '0% dari total sertifikat ikan'}
          </div>
        </div>

        {/* KPI 3: Ekspor Ikan */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              EKSPOR
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                color: 'var(--accent-purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Globe size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
            {kpis.eksporCount ? kpis.eksporCount.toLocaleString('id-ID') : '0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {kpis.totalSertifikat > 0
              ? `${kpis.eksporPercent || 0}% dari total sertifikat ikan`
              : '0% dari total sertifikat ikan'}
          </div>
        </div>

        {/* KPI 4: Impor Ikan */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              IMPOR
            </span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(225, 29, 72, 0.15)',
                color: 'var(--accent-rose)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PackageCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
            {kpis.imporCount ? kpis.imporCount.toLocaleString('id-ID') : '0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {kpis.totalSertifikat > 0
              ? `${kpis.imporPercent || 0}% dari total sertifikat ikan`
              : '0% dari total sertifikat ikan'}
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
          <Layers size={40} style={{ color: 'var(--accent-teal)', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.0625rem', color: 'var(--text-primary)', margin: 0 }}>
            Tidak Ada Data Karantina Ikan pada Periode Ini
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
