import { useState, useEffect, useMemo } from 'react';
import { usePeriodFilter } from '@/contexts/PeriodFilterContext';
import { loadPenggunaJasaProfile } from '@/lib/data/dashboardDataLoader';
import { exportProfilingToExcel } from '@/lib/excel/exportProfiling';
import styles from './profiling.module.css';
import {
  Users,
  Send,
  Globe,
  PackageCheck,
  ShieldCheck,
  Search,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  X,
  CheckCircle2,
  XCircle,
  Dog,
  Fish,
  Sprout,
} from 'lucide-react';

const COMMODITY_CONFIG = {
  hewan: {
    label: 'Hewan',
    title: 'Profiling Pengguna Jasa Hewan',
    desc: 'Daftar perusahaan dan rekapitulasi frekuensi lalu lintas komoditas Hewan (Domestik Keluar & Ekspor)',
    Icon: Dog,
    color: '#F59E0B',
  },
  ikan: {
    label: 'Ikan',
    title: 'Profiling Pengguna Jasa Ikan',
    desc: 'Daftar perusahaan dan rekapitulasi frekuensi lalu lintas komoditas Ikan (Domestik Keluar & Ekspor)',
    Icon: Fish,
    color: '#06B6D4',
  },
  tumbuhan: {
    label: 'Tumbuhan',
    title: 'Profiling Pengguna Jasa Tumbuhan',
    desc: 'Daftar perusahaan dan rekapitulasi frekuensi lalu lintas komoditas Tumbuhan (Domestik Keluar & Ekspor)',
    Icon: Sprout,
    color: '#10B981',
  },
};

export default function ProfilingPenggunaJasa({ commodity = 'ikan' }) {
  const targetCommodity = String(commodity).toLowerCase();
  const config = COMMODITY_CONFIG[targetCommodity] || COMMODITY_CONFIG.ikan;
  const isIkan = targetCommodity === 'ikan';

  const periodFilter = usePeriodFilter();
  const formatPeriodLabel = () =>
    typeof periodFilter?.formatPeriodLabel === 'function'
      ? periodFilter.formatPeriodLabel()
      : 'Tahun 2026';

  const [profileData, setProfileData] = useState({ records: [], summary: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [syncProgress, setSyncProgress] = useState(null);

  // Search & Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [haccpFilter, setHaccpFilter] = useState('all'); // 'all' | 'ya' | 'tidak'
  const [sortField, setSortField] = useState('totalFrekuensi');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Commodity popover modal state
  const [activeModalCompany, setActiveModalCompany] = useState(null);

  // Listen to background sync progress
  useEffect(() => {
    const handleProgress = (e) => {
      if (e?.detail) setSyncProgress(e.detail);
    };
    window.addEventListener('traq:sync-progress', handleProgress);
    return () => window.removeEventListener('traq:sync-progress', handleProgress);
  }, []);

  // Fetch live profiling data whenever global filters or commodity change
  useEffect(() => {
    fetchProfileData();
  }, [
    targetCommodity,
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

  const fetchProfileData = async () => {
    setIsLoading(true);
    setSyncProgress(null);
    try {
      const data = await loadPenggunaJasaProfile(targetCommodity, periodFilter);
      setProfileData(data || { records: [], summary: {} });
    } finally {
      setIsLoading(false);
      setSyncProgress(null);
    }
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveModalCompany(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered & Sorted Records
  const filteredRecords = useMemo(() => {
    let result = profileData.records || [];

    // 1. Search Query (Nama Perusahaan or Komoditas)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.namaPerusahaan.toLowerCase().includes(q) ||
          c.komoditasList.some((k) => k.toLowerCase().includes(q))
      );
    }

    // 2. HACCP Filter (Ikan only)
    if (isIkan && haccpFilter !== 'all') {
      const wantHaccp = haccpFilter === 'ya';
      result = result.filter((c) => c.hasHaccp === wantHaccp);
    }

    // 3. Sorting
    result = [...result].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'namaPerusahaan') {
        comparison = a.namaPerusahaan.localeCompare(b.namaPerusahaan, 'id-ID');
      } else {
        const valA = a[sortField] || 0;
        const valB = b[sortField] || 0;
        comparison = valA - valB;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [profileData.records, searchQuery, haccpFilter, isIkan, sortField, sortDirection]);

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, haccpFilter, targetCommodity]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'namaPerusahaan' ? 'asc' : 'desc');
    }
  };

  const handleExport = () => {
    exportProfilingToExcel({
      commodity: targetCommodity,
      periodLabel: formatPeriodLabel(),
      data: filteredRecords,
    });
  };

  const summary = profileData.summary || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Header Banner */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{config.title}</h2>
            {isLoading && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.8125rem',
                  color: 'var(--primary)',
                  fontWeight: 500,
                }}
              >
                <Loader2 size={15} className="spin" />
                <span>
                  {syncProgress?.percent ? `Sinkronisasi (${syncProgress.percent}%)` : 'Sinkronisasi data...'}
                </span>
              </div>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {config.desc} ({formatPeriodLabel()})
          </p>
        </div>

        <button
          onClick={handleExport}
          className="btn btn-primary"
          style={{ fontSize: '0.8125rem' }}
          disabled={isLoading || filteredRecords.length === 0}
          title="Ekspor seluruh data hasil filter ke Excel"
        >
          <FileSpreadsheet size={16} />
          <span>Ekspor Excel</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
          gap: '1.25rem',
        }}
      >
        {/* KPI 1: Total Pengguna Jasa */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              TOTAL PENGGUNA JASA
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
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
            {summary.totalPenggunaJasa ? summary.totalPenggunaJasa.toLocaleString('id-ID') : '0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Perusahaan Pengirim Aktif
          </div>
        </div>

        {/* KPI 2: Frekuensi Domestik Keluar */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              SERTIFIKAT DOKEL
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
              <Send size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
            {summary.totalDokel ? summary.totalDokel.toLocaleString('id-ID') : '0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Frekuensi Domestik Keluar
          </div>
        </div>

        {/* KPI 3: Frekuensi Ekspor */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              SERTIFIKAT EKSPOR
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
              <Globe size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
            {summary.totalEkspor ? summary.totalEkspor.toLocaleString('id-ID') : '0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Frekuensi Ekspor Luar Negeri
          </div>
        </div>

        {/* KPI 4: Total Frekuensi */}
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
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                color: 'var(--accent-purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PackageCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
            {summary.totalSertifikat ? summary.totalSertifikat.toLocaleString('id-ID') : '0'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Total Akumulasi Sertifikat
          </div>
        </div>

        {/* KPI 5: Khusus Ikan: Pengguna Jasa Ber-HACCP */}
        {isIkan && (
          <div className="card">
            <div className="card-header" style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                MEMILIKI HACCP
              </span>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(13, 148, 136, 0.15)',
                  color: '#0D9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
              {summary.totalHaccp ? summary.totalHaccp.toLocaleString('id-ID') : '0'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Perusahaan Berdokumen HACCP
            </div>
          </div>
        )}
      </div>

      {/* 3. Table Card with Toolbar */}
      <div className="card">
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Cari nama perusahaan atau komoditas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.filterControls}>
            {isIkan && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Status HACCP:</span>
                <select
                  className={styles.filterSelect}
                  value={haccpFilter}
                  onChange={(e) => setHaccpFilter(e.target.value)}
                >
                  <option value="all">Semua Status</option>
                  <option value="ya">Hanya Ber-HACCP (Ya)</option>
                  <option value="tidak">Tanpa HACCP (Tidak)</option>
                </select>
              </div>
            )}
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Total: {filteredRecords.length.toLocaleString('id-ID')} perusahaan
            </span>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={32} className="spin" style={{ marginBottom: '0.75rem', color: 'var(--primary)' }} />
            <p>Memuat dan mengagregasi data profiling pengguna jasa...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Users size={44} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
            <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {searchQuery ? 'Perusahaan Tidak Ditemukan' : 'Belum Ada Data Pengirim'}
            </h4>
            <p style={{ fontSize: '0.8125rem' }}>
              {searchQuery
                ? `Tidak ada perusahaan atau komoditas yang cocok dengan kata kunci "${searchQuery}".`
                : `Tidak ditemukan data lalu lintas Domestik Keluar atau Ekspor komoditas ${config.label} pada periode ini.`}
            </p>
            {searchQuery && (
              <button
                className="btn btn-secondary"
                style={{ marginTop: '0.75rem', fontSize: '0.8125rem' }}
                onClick={() => setSearchQuery('')}
              >
                Reset Pencarian
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '48px', textAlign: 'center' }}>No.</th>
                    <th
                      className={styles.sortable}
                      onClick={() => handleSort('namaPerusahaan')}
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('namaPerusahaan')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>Nama Perusahaan</span>
                        {sortField === 'namaPerusahaan' ? (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
                        )}
                      </div>
                    </th>
                    <th>Komoditas</th>
                    <th
                      className={styles.sortable}
                      style={{ textAlign: 'right' }}
                      onClick={() => handleSort('frekuensiDokel')}
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('frekuensiDokel')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <span>Domestik Keluar</span>
                        {sortField === 'frekuensiDokel' ? (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
                        )}
                      </div>
                    </th>
                    <th
                      className={styles.sortable}
                      style={{ textAlign: 'right' }}
                      onClick={() => handleSort('frekuensiEkspor')}
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('frekuensiEkspor')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <span>Ekspor</span>
                        {sortField === 'frekuensiEkspor' ? (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
                        )}
                      </div>
                    </th>
                    <th
                      className={styles.sortable}
                      style={{ textAlign: 'right' }}
                      onClick={() => handleSort('totalFrekuensi')}
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSort('totalFrekuensi')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <span>Total</span>
                        {sortField === 'totalFrekuensi' ? (
                          sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} style={{ opacity: 0.4 }} />
                        )}
                      </div>
                    </th>
                    {isIkan && (
                      <th style={{ textAlign: 'center', width: '100px' }}>HACCP</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((item, idx) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                    const maxDisplayKomoditas = 3;
                    const displayedKomoditas = item.komoditasList.slice(0, maxDisplayKomoditas);
                    const remainingCount = item.komoditasList.length - maxDisplayKomoditas;

                    return (
                      <tr key={item.id}>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{rowNumber}</td>
                        <td>
                          <div className={styles.companyName}>{item.namaPerusahaan}</div>
                        </td>
                        <td>
                          <div className={styles.tagList}>
                            {displayedKomoditas.length === 0 ? (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                            ) : (
                              displayedKomoditas.map((k, kIdx) => (
                                <span key={kIdx} className={styles.tag} title={k}>
                                  {k}
                                </span>
                              ))
                            )}
                            {remainingCount > 0 && (
                              <button
                                className={styles.moreBtn}
                                onClick={() =>
                                  setActiveModalCompany({
                                    namaPerusahaan: item.namaPerusahaan,
                                    komoditasList: item.komoditasList,
                                  })
                                }
                                title="Klik untuk melihat seluruh komoditas"
                              >
                                +{remainingCount} lainnya
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {item.frekuensiDokel > 0 ? (
                            <span style={{ color: 'var(--accent-cyan)' }}>
                              {item.frekuensiDokel.toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>0</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>
                          {item.frekuensiEkspor > 0 ? (
                            <span style={{ color: 'var(--status-success)' }}>
                              {item.frekuensiEkspor.toLocaleString('id-ID')}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>0</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          <span style={{ color: 'var(--text-primary)' }}>
                            {item.totalFrekuensi.toLocaleString('id-ID')}
                          </span>
                        </td>
                        {isIkan && (
                          <td style={{ textAlign: 'center' }}>
                            {item.hasHaccp ? (
                              <span className={styles.haccpBadgeYes}>
                                <CheckCircle2 size={12} />
                                <span>Ya</span>
                              </span>
                            ) : (
                              <span className={styles.haccpBadgeNo}>
                                <XCircle size={12} />
                                <span>Tidak</span>
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className={styles.pagination}>
              <div>
                Menampilkan{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {((currentPage - 1) * itemsPerPage + 1).toLocaleString('id-ID')}
                </strong>{' '}
                sampai{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {Math.min(currentPage * itemsPerPage, filteredRecords.length).toLocaleString('id-ID')}
                </strong>{' '}
                dari{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {filteredRecords.length.toLocaleString('id-ID')}
                </strong>{' '}
                perusahaan
              </div>

              {totalPages > 1 && (
                <div className={styles.paginationControls}>
                  <button
                    className={styles.pageBtn}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Sebelumnya
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        className={`${styles.pageBtn} ${currentPage === pageNum ? styles.active : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    className={styles.pageBtn}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Selanjutnya
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal: All Commodities for a Company */}
      {activeModalCompany && (
        <div className={styles.modalOverlay} onClick={() => setActiveModalCompany(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '0.75rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Daftar Komoditas</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {activeModalCompany.namaPerusahaan}
                </p>
              </div>
              <button
                className="btn-icon"
                onClick={() => setActiveModalCompany(null)}
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '55vh', overflowY: 'auto' }}>
              {activeModalCompany.komoditasList.map((k, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface-2)',
                    fontSize: '0.8125rem',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
