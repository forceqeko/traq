import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePeriodFilter } from '@/contexts/PeriodFilterContext';
import { loadIkiTrafficData } from '@/lib/data/dashboardDataLoader';
import { exportIkiToExcel } from '@/lib/excel/exportIki';
import styles from './instalasiIki.module.css';
import {
  Warehouse,
  FileCheck,
  TrendingUp,
  FileText,
  Fish,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';

export default function InstalasiIki() {
  const periodFilter = usePeriodFilter();
  const { formatPeriodLabel } = periodFilter;

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    totalIki: 0,
    totalVolumeEkspor: 0,
    totalVolumeDokel: 0,
    totalFrekuensiEkspor: 0,
    totalFrekuensiDokel: 0,
    totalFrekuensi: 0,
    totalKapasitas: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('Kg');
  const [sortField, setSortField] = useState('tanggal');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    loadIkiTrafficData(periodFilter)
      .then((res) => {
        if (!isMounted) return;
        setRecords(res.records || []);
        setSummary(res.summary || {});
        setCurrentPage(1);
      })
      .catch((err) => {
        console.error('Error loading IKI traffic data:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
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

  // Search and Sort
  const filteredAndSortedRecords = useMemo(() => {
    let result = [...records];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          (r.namaIki && r.namaIki.toLowerCase().includes(q)) ||
          (r.alamatIki && r.alamatIki.toLowerCase().includes(q)) ||
          (r.komoditas && r.komoditas.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'tanggal') {
        if (valA === '-' && valB === '-') return 0;
        if (valA === '-') return 1;
        if (valB === '-') return -1;
        return sortAsc ? valA.localeCompare(valB, 'id-ID') : valB.localeCompare(valA, 'id-ID');
      }

      if (sortField === 'volumeEkspor') {
        const numA = selectedUnit === 'Kg' ? (a.volumeEksporKg || 0) : (a.volumeEksporEkor || 0);
        const numB = selectedUnit === 'Kg' ? (b.volumeEksporKg || 0) : (b.volumeEksporEkor || 0);
        return sortAsc ? numA - numB : numB - numA;
      }

      if (sortField === 'volumeDokel') {
        const numA = selectedUnit === 'Kg' ? (a.volumeDokelKg || 0) : (a.volumeDokelEkor || 0);
        const numB = selectedUnit === 'Kg' ? (b.volumeDokelKg || 0) : (b.volumeDokelEkor || 0);
        return sortAsc ? numA - numB : numB - numA;
      }

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
        return sortAsc ? valA.localeCompare(valB, 'id-ID') : valB.localeCompare(valA, 'id-ID');
      }

      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [records, searchQuery, sortField, sortAsc, selectedUnit]);

  // Pagination calculation
  const totalItems = filteredAndSortedRecords.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedRecords.slice(start, start + pageSize);
  }, [filteredAndSortedRecords, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={13} style={{ opacity: 0.4 }} />;
    return sortAsc ? <ArrowUp size={13} /> : <ArrowDown size={13} />;
  };

  const handleExport = () => {
    exportIkiToExcel({
      periodLabel: formatPeriodLabel(),
      data: filteredAndSortedRecords,
      unit: selectedUnit,
    });
  };

  return (
    <div className={styles.container}>
      {/* Banner Card */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
          Instalasi Karantina Ikan (IKI)
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Monitoring performa lalu lintas (Ekspor & Domestik Keluar) dari perusahaan pemegang sertifikat IKI • Periode: <strong style={{ color: 'var(--primary)' }}>{formatPeriodLabel()}</strong>
        </p>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'var(--primary-subtle)', color: 'var(--primary)' }}>
            <Warehouse size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Total IKI Terdaftar</span>
            <span className={styles.kpiValue}>{Number(summary.totalIki || 0).toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
            <FileCheck size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Frekuensi Ekspor</span>
            <span className={styles.kpiValue}>{Number(summary.totalFrekuensiEkspor || 0).toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
            <TrendingUp size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Volume Ekspor ({selectedUnit})</span>
            <span className={styles.kpiValue}>
              {selectedUnit === 'Kg'
                ? Number(summary.totalVolumeEksporKg || 0).toLocaleString('id-ID')
                : Number(summary.totalVolumeEksporEkor || 0).toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
            <FileText size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Frekuensi Dokel</span>
            <span className={styles.kpiValue}>{Number(summary.totalFrekuensiDokel || 0).toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}>
            <Fish size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Volume Dokel ({selectedUnit})</span>
            <span className={styles.kpiValue}>
              {selectedUnit === 'Kg'
                ? Number(summary.totalVolumeDokelKg || 0).toLocaleString('id-ID')
                : Number(summary.totalVolumeDokelEkor || 0).toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* Tabel Utama */}
      <div className="card">
        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Cari nama IKI, alamat, atau komoditas..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className={styles.toolbarActions}>
            <div className={styles.unitSelector}>
              <span className={styles.unitSelectorLabel}>Satuan:</span>
              <select
                className={styles.unitSelect}
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                aria-label="Pilih Satuan Volume"
              >
                <option value="Kg">Kg</option>
                <option value="Ekor">Ekor</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={filteredAndSortedRecords.length === 0}
              title="Unduh data tabel IKI ke file Excel (.xlsx)"
            >
              <Download size={15} />
              <span>Ekspor Excel</span>
            </button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '48px', textAlign: 'center' }}>No.</th>
                <th className={styles.sortable} onClick={() => handleSort('tanggal')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>Tanggal</span>
                    {getSortIcon('tanggal')}
                  </div>
                </th>
                <th className={styles.sortable} onClick={() => handleSort('namaIki')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>Nama IKI</span>
                    {getSortIcon('namaIki')}
                  </div>
                </th>
                <th>Alamat IKI</th>
                <th className={styles.sortable} onClick={() => handleSort('komoditas')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>Komoditas</span>
                    {getSortIcon('komoditas')}
                  </div>
                </th>
                <th className={styles.sortable} style={{ textAlign: 'center' }} onClick={() => handleSort('frekuensiEkspor')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                    <span>Frekuensi Ekspor</span>
                    {getSortIcon('frekuensiEkspor')}
                  </div>
                </th>
                <th className={styles.sortable} style={{ textAlign: 'right' }} onClick={() => handleSort('volumeEkspor')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                    <span>Volume Ekspor</span>
                    {getSortIcon('volumeEkspor')}
                  </div>
                </th>
                <th className={styles.sortable} style={{ textAlign: 'center' }} onClick={() => handleSort('frekuensiDokel')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                    <span>Frekuensi Dokel</span>
                    {getSortIcon('frekuensiDokel')}
                  </div>
                </th>
                <th className={styles.sortable} style={{ textAlign: 'right' }} onClick={() => handleSort('volumeDokel')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                    <span>Volume Dokel</span>
                    {getSortIcon('volumeDokel')}
                  </div>
                </th>
                <th className={styles.sortable} style={{ textAlign: 'right' }} onClick={() => handleSort('kapasitasIki')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                    <span>Kapasitas IKI</span>
                    {getSortIcon('kapasitasIki')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                    <RefreshCw size={18} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                    <span>Memuat data Instalasi Karantina Ikan...</span>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                      <Warehouse size={40} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                        {searchQuery ? 'Tidak ada data IKI yang cocok dengan filter pencarian.' : 'Belum Ada Perusahaan IKI yang Didaftarkan'}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '440px', lineHeight: 1.5 }}>
                        {searchQuery
                          ? 'Silakan coba kata kunci pencarian yang lain.'
                          : 'Daftar perusahaan IKI dikelola melalui menu Pengaturan. Tambahkan data perusahaan IKI terlebih dahulu untuk memantau performa lalu lintasnya di sini.'}
                      </p>
                      {!searchQuery && (
                        <Link to="/pengaturan/iki" className="btn btn-primary" style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}>
                          Buka Pengaturan IKI
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item, index) => {
                  const rowNumber = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{rowNumber}</td>
                      <td style={{ whiteSpace: 'nowrap', color: item.tanggal === '-' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {item.tanggal}
                      </td>
                      <td className={styles.companyName}>{item.namaIki}</td>
                      <td className={styles.companyAddress}>{item.alamatIki}</td>
                      <td style={{ color: item.komoditas === '-' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {item.komoditas || '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={styles.freqBadge} style={{ color: item.frekuensiEkspor > 0 ? '#3B82F6' : 'var(--text-muted)' }}>
                          {item.frekuensiEkspor.toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} className={styles.volValue}>
                        {(() => {
                          const val = selectedUnit === 'Kg' ? item.volumeEksporKg : item.volumeEksporEkor;
                          return val > 0 ? val.toLocaleString('id-ID') : '-';
                        })()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={styles.freqBadge} style={{ color: item.frekuensiDokel > 0 ? '#F59E0B' : 'var(--text-muted)' }}>
                          {item.frekuensiDokel.toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} className={styles.volValue}>
                        {(() => {
                          const val = selectedUnit === 'Kg' ? item.volumeDokelKg : item.volumeDokelEkor;
                          return val > 0 ? val.toLocaleString('id-ID') : '-';
                        })()}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {item.kapasitasIki > 0 ? item.kapasitasIki.toLocaleString('id-ID') : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginasi */}
        {!loading && totalItems > 0 && (
          <div className={styles.pagination}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span>
                Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)} dari {totalItems} data
              </span>
              <select
                className={styles.pageBtn}
                style={{ width: 'auto', padding: '0 0.5rem', cursor: 'pointer' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10 baris</option>
                <option value={25}>25 baris</option>
                <option value={50}>50 baris</option>
              </select>
            </div>

            <div className={styles.paginationControls}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;
                  return (
                    <span key={p} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {showEllipsis && <span style={{ padding: '0 0.35rem', color: 'var(--text-muted)' }}>...</span>}
                      <button
                        type="button"
                        className={`${styles.pageBtn} ${currentPage === p ? styles.active : ''}`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    </span>
                  );
                })}

              <button
                type="button"
                className={styles.pageBtn}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Halaman Berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
