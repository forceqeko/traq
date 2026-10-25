import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePeriodFilter } from '@/contexts/PeriodFilterContext';
import { loadPageDashboardData } from '@/lib/data/dashboardDataLoader';
import { getCertificateId, isIkanHidup, getKlasifikasi } from '@/lib/data/aggregation';
import { exportIkanHidupToExcel } from '@/lib/excel/exportIkanHidup';
import styles from './IkanHidup.module.css';
import {
  Fish,
  Layers,
  Scale,
  FileCheck,
  MapPin,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  AlertCircle,
  Hash,
  Globe,
} from 'lucide-react';

/**
 * Resolusi Daerah Tujuan (untuk Domestik Keluar)
 */
function resolveDaerahTujuan(row) {
  if (!row) return '-';
  const val =
    row['Daerah Tujuan'] ||
    row['Daerah_Tujuan'] ||
    row['Daerah_tujuan'] ||
    row['Kota/Kab Tujuan'] ||
    row['Kota Tujuan'] ||
    row['Kab Tujuan'] ||
    row['Provinsi Tujuan'] ||
    row['Tujuan'] ||
    row['Pelabuhan Tujuan'] ||
    '-';
  const cleaned = String(val).trim();
  return cleaned && cleaned !== 'null' && cleaned !== 'undefined' ? cleaned : '-';
}

/**
 * Resolusi Daerah Asal (untuk Domestik Masuk)
 */
function resolveDaerahAsal(row) {
  if (!row) return '-';
  const val =
    row['Daerah Asal'] ||
    row['Daerah_Asal'] ||
    row['Daerah_asal'] ||
    row['Kota/Kab Asal'] ||
    row['Kota Asal'] ||
    row['Kab Asal'] ||
    row['Provinsi Asal'] ||
    row['Asal'] ||
    row['Pelabuhan Asal'] ||
    '-';
  const cleaned = String(val).trim();
  return cleaned && cleaned !== 'null' && cleaned !== 'undefined' ? cleaned : '-';
}

/**
 * Resolusi Negara Tujuan (untuk Ekspor)
 */
function resolveNegaraTujuan(row) {
  if (!row) return '-';
  const val =
    row['Negara Tujuan'] ||
    row['Negara_Tujuan'] ||
    row['Negara_tujuan'] ||
    row['Daerah Tujuan'] ||
    row['Daerah_Tujuan'] ||
    row['Pelabuhan Tujuan'] ||
    row['Tujuan'] ||
    '-';
  const cleaned = String(val).trim();
  return cleaned && cleaned !== 'null' && cleaned !== 'undefined' ? cleaned : '-';
}

/**
 * Resolusi Nama Komoditas
 */
function resolveNamaKomoditas(row) {
  if (!row) return '-';
  const val =
    row.Komoditas ||
    row['Nama Komoditas'] ||
    row['Nama_Komoditas'] ||
    row['Jenis Komoditas'] ||
    row['Jenis_Komoditas'] ||
    row['Komoditi'] ||
    '-';
  const cleaned = String(val).trim();
  return cleaned && cleaned !== 'null' && cleaned !== 'undefined' ? cleaned : '-';
}

/**
 * Resolusi Nama Tercetak (Nama Latin atau nama yang tercetak pada sertifikat)
 */
function resolveNamaTercetak(row) {
  if (!row) return '-';
  const val =
    row['Nama Tercetak'] ||
    row['Nama_Tercetak'] ||
    row['nama_tercetak'] ||
    row['Nama Latin'] ||
    row['Nama_Latin'] ||
    row['Tercetak'] ||
    '-';
  const cleaned = String(val).trim();
  return cleaned && cleaned !== 'null' && cleaned !== 'undefined' ? cleaned : '-';
}

/**
 * Parse numeric value cleanly
 */
function parseNumericValue(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).replace(/[Rp\s]/g, '').replace(/,/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Ekstraksi angka volume dalam Kg (Netto P8 / Netto P1 / Netto / Volume)
 */
function resolveVolumeKg(row) {
  if (!row) return 0;
  const val =
    row['Netto P8'] ??
    row['Netto_P8'] ??
    row['Netto P1'] ??
    row['Netto'] ??
    row['Vol P1'] ??
    row.Volume ??
    row.Jumlah ??
    row.Kuantitas ??
    0;
  return parseNumericValue(val);
}

/**
 * Ekstraksi angka volume dalam Ekor (diambil dari header Satuan Lain / Vol Lain)
 */
function resolveVolumeEkor(row) {
  if (!row) return 0;

  // 1. Cek langsung header Satuan Lain jika berisi nilai numerik
  const rawSatuanLain = row['Satuan Lain'] ?? row['Satuan_Lain'] ?? row['satuan_lain'];
  if (rawSatuanLain !== undefined && rawSatuanLain !== null && rawSatuanLain !== '') {
    const numDirect = parseNumericValue(rawSatuanLain);
    if (numDirect > 0 && (typeof rawSatuanLain === 'number' || /^\d+/.test(String(rawSatuanLain).trim()))) {
      return numDirect;
    }
  }

  // 2. Cek header Vol Lain / Volume Lain (kolom jumlah untuk Satuan Lain pada standar karantina)
  const rawVolLain =
    row['Vol Lain'] ??
    row['Vol_Lain'] ??
    row['Volume Lain'] ??
    row['Volume_Lain'] ??
    row['Vol. Lain'] ??
    row['Jumlah Satuan Lain'] ??
    row['Jml Satuan Lain'];

  if (rawVolLain !== undefined && rawVolLain !== null && rawVolLain !== '') {
    const numVol = parseNumericValue(rawVolLain);
    if (numVol > 0) {
      return numVol;
    }
  }

  // 3. Cek variasi kolom ekor
  const rawEkor = row['Ekor'] ?? row['Jumlah Ekor'] ?? row['Volume (Ekor)'] ?? row['Vol Ekor'] ?? row['Jml Ekor'];
  if (rawEkor !== undefined && rawEkor !== null) {
    const numEkor = parseNumericValue(rawEkor);
    if (numEkor > 0) return numEkor;
  }

  return 0;
}

/**
 * Evaluasi apakah baris termasuk kategori Ikan Hidup
 */
function checkIsIkanHidup(row) {
  if (!row) return false;
  if (isIkanHidup(row)) return true;

  const klas = getKlasifikasi(row).toLowerCase();
  if (klas.includes('hidup')) return true;

  const kom = String(row.Komoditas || row['Nama Komoditas'] || row['Jenis Komoditas'] || '').toLowerCase();
  if (kom.includes('hidup') || kom.includes('benih') || kom.includes('bibit') || kom.includes('hias')) {
    return true;
  }

  const bentuk = String(row['Bentuk'] || row['Kondisi'] || '').toLowerCase();
  if (bentuk.includes('hidup')) return true;

  return false;
}

export default function IkanHidup() {
  const [searchParams, setSearchParams] = useSearchParams();
  const periodFilter = usePeriodFilter();
  const { formatPeriodLabel } = periodFilter;

  // Dropdown status: 'domestik_keluar' (Dokel), 'domestik_masuk' (Domas), atau 'ekspor' (Ekspor)
  const initialParam = searchParams.get('traffic') || 'domestik_keluar';
  const initialTraffic = ['domestik_keluar', 'domestik_masuk', 'ekspor'].includes(initialParam)
    ? initialParam
    : 'domestik_keluar';

  const [trafficType, setTrafficType] = useState(initialTraffic);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [rawRecords, setRawRecords] = useState([]);
  const [onlyIkanHidupFilter, setOnlyIkanHidupFilter] = useState(true);

  // Table controls
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('volumeKg');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sinkronkan trafficType jika query param URL berubah (misal klik dari sidebar)
  useEffect(() => {
    const param = searchParams.get('traffic');
    if (param && ['domestik_keluar', 'domestik_masuk', 'ekspor'].includes(param)) {
      setTrafficType(param);
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Sinkronkan trafficType dengan URL query parameter saat dropdown berubah
  const handleTrafficChange = (newTraffic) => {
    setTrafficType(newTraffic);
    setSearchParams({ traffic: newTraffic });
    setCurrentPage(1);
  };

  // Muat data master data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    loadPageDashboardData('ikan', periodFilter)
      .then((res) => {
        if (!isMounted) return;
        setRawRecords(res?.rawRecords || []);
        setCurrentPage(1);
      })
      .catch((err) => {
        console.error('Error loading master data for Ikan Hidup:', err);
        if (isMounted) setErrorMsg(err.message || 'Gagal memuat data master.');
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

  const isDokel = trafficType === 'domestik_keluar';
  const isDomas = trafficType === 'domestik_masuk';
  const isEkspor = trafficType === 'ekspor';

  let daerahHeaderLabel = 'Daerah Tujuan';
  let kpiLocationLabel = 'DAERAH TUJUAN';
  let kpiLocationSub = 'Kota/Kabupaten tujuan';
  let trafficName = 'Domestik Keluar';

  if (isDomas) {
    daerahHeaderLabel = 'Daerah Asal';
    kpiLocationLabel = 'DAERAH ASAL';
    kpiLocationSub = 'Kota/Kabupaten asal';
    trafficName = 'Domestik Masuk';
  } else if (isEkspor) {
    daerahHeaderLabel = 'Negara Tujuan';
    kpiLocationLabel = 'NEGARA TUJUAN';
    kpiLocationSub = 'Negara tujuan ekspor';
    trafficName = 'Ekspor';
  }

  // Filter baris sesuai lalu lintas (Dokel vs Domas vs Ekspor) & klasifikasi Ikan Hidup
  const relevantRows = useMemo(() => {
    if (!rawRecords || rawRecords.length === 0) return [];

    return rawRecords.filter((row) => {
      const traffic = String(row._traffic_type || row.Arah_Lalu_Lintas || '').toLowerCase();

      // Filter lalu lintas
      if (isDokel) {
        const matchesDokel = traffic === 'domestik_keluar' || traffic.includes('keluar');
        if (!matchesDokel) return false;
      } else if (isDomas) {
        const matchesDomas = traffic === 'domestik_masuk' || traffic.includes('masuk');
        if (!matchesDomas) return false;
      } else if (isEkspor) {
        const matchesEkspor = traffic === 'ekspor' || traffic.includes('ekspor');
        if (!matchesEkspor) return false;
      }

      // Filter Ikan Hidup (jika opsi aktif)
      if (onlyIkanHidupFilter && !checkIsIkanHidup(row)) {
        return false;
      }

      return true;
    });
  }, [rawRecords, isDokel, isDomas, isEkspor, onlyIkanHidupFilter]);

  // Agregasi grup berdasarkan (Daerah/Negara, Komoditas, Nama Tercetak)
  const aggregatedData = useMemo(() => {
    const groupMap = new Map();

    relevantRows.forEach((row, idx) => {
      let daerah = '-';
      if (isDokel) {
        daerah = resolveDaerahTujuan(row);
      } else if (isDomas) {
        daerah = resolveDaerahAsal(row);
      } else if (isEkspor) {
        daerah = resolveNegaraTujuan(row);
      }

      const komoditas = resolveNamaKomoditas(row);
      const namaTercetak = resolveNamaTercetak(row);
      const key = `${daerah}___${komoditas}___${namaTercetak}`;

      const volKg = resolveVolumeKg(row);
      const volEkor = resolveVolumeEkor(row);
      const certId = getCertificateId(row, idx);

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          id: key,
          daerah,
          komoditas,
          namaTercetak,
          volumeKg: 0,
          volumeEkor: 0,
          certs: new Set(),
        });
      }

      const item = groupMap.get(key);
      item.volumeKg += volKg;
      item.volumeEkor += volEkor;
      if (certId) {
        item.certs.add(certId);
      }
    });

    return Array.from(groupMap.values()).map((item) => ({
      id: item.id,
      daerah: item.daerah,
      komoditas: item.komoditas,
      namaTercetak: item.namaTercetak,
      volumeKg: Math.round(item.volumeKg * 100) / 100,
      volumeEkor: Math.round(item.volumeEkor * 100) / 100,
      frekuensi: item.certs.size || 1,
    }));
  }, [relevantRows, isDokel, isDomas, isEkspor]);

  // Hitung ringkasan KPI
  const kpis = useMemo(() => {
    const totalVolKg = aggregatedData.reduce((acc, curr) => acc + curr.volumeKg, 0);
    const totalVolEkor = aggregatedData.reduce((acc, curr) => acc + curr.volumeEkor, 0);
    const allCerts = new Set();
    const uniqueDaerah = new Set();
    const uniqueKomoditas = new Set();

    relevantRows.forEach((row, idx) => {
      const certId = getCertificateId(row, idx);
      if (certId) allCerts.add(certId);
    });

    aggregatedData.forEach((item) => {
      if (item.daerah && item.daerah !== '-') uniqueDaerah.add(item.daerah);
      if (item.komoditas && item.komoditas !== '-') uniqueKomoditas.add(item.komoditas);
    });

    return {
      totalVolumeKg: Math.round(totalVolKg * 100) / 100,
      totalVolumeEkor: Math.round(totalVolEkor * 100) / 100,
      totalFrekuensi: allCerts.size || aggregatedData.reduce((acc, curr) => acc + curr.frekuensi, 0),
      totalKomoditas: uniqueKomoditas.size,
      totalDaerah: uniqueDaerah.size,
    };
  }, [aggregatedData, relevantRows]);

  // Filter pencarian dan pengurutan (Sorting)
  const filteredAndSortedData = useMemo(() => {
    let result = [...aggregatedData];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.daerah.toLowerCase().includes(q) ||
          item.komoditas.toLowerCase().includes(q) ||
          item.namaTercetak.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }

      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();
      return sortAsc ? strA.localeCompare(strB, 'id-ID') : strB.localeCompare(strA, 'id-ID');
    });

    return result;
  }, [aggregatedData, searchQuery, sortField, sortAsc]);

  // Pagination
  const totalItems = filteredAndSortedData.length;
  const actualPageSize = pageSize === 'all' ? totalItems : Number(pageSize);
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalItems / actualPageSize) || 1;
  const paginatedData = useMemo(() => {
    if (pageSize === 'all') return filteredAndSortedData;
    const startIndex = (currentPage - 1) * actualPageSize;
    return filteredAndSortedData.slice(startIndex, startIndex + actualPageSize);
  }, [filteredAndSortedData, currentPage, actualPageSize, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Default descending untuk angka / volume
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} style={{ opacity: 0.4 }} />;
    }
    return sortAsc ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const handleExport = () => {
    exportIkanHidupToExcel({
      trafficType,
      periodLabel: formatPeriodLabel ? formatPeriodLabel() : 'Periode',
      data: filteredAndSortedData,
    });
  };

  return (
    <div className={styles.container}>
      {/* 1. Header Banner */}
      <div className={styles.headerCard}>
        <div className={styles.headerTitleArea}>
          <div className={styles.headerTitleRow}>
            <h2 className={styles.headerTitle}>Pengujian Komoditas Ikan Hidup</h2>
            <span className={styles.testBadge}>
              <Fish size={13} />
              Testing Mode
            </span>
            {loading && <RefreshCw size={15} className="spin" style={{ color: 'var(--primary)' }} />}
          </div>
          <p className={styles.headerSubtitle}>
            Tabel rekapitulasi data lalu lintas Ikan Hidup ({trafficName}) berdasarkan master data.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExport}
            disabled={filteredAndSortedData.length === 0}
            title="Unduh data tabel ke format Excel (.xlsx)"
          >
            <Download size={15} />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className={styles.kpiGrid}>
        {/* KPI 1: Total Volume (Kg) */}
        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIconWrapper}
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)' }}
          >
            <Scale size={20} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>TOTAL VOLUME (KG)</span>
            <span className={styles.kpiValue}>
              {kpis.totalVolumeKg.toLocaleString('id-ID')} <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Kg</span>
            </span>
            <span className={styles.kpiSub}>Volume berat komoditas</span>
          </div>
        </div>

        {/* KPI 2: Total Volume (Ekor) */}
        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIconWrapper}
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}
          >
            <Hash size={20} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>TOTAL VOLUME (EKOR)</span>
            <span className={styles.kpiValue}>
              {kpis.totalVolumeEkor.toLocaleString('id-ID')} <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Ekor</span>
            </span>
            <span className={styles.kpiSub}>Jumlah dari Satuan Lain</span>
          </div>
        </div>

        {/* KPI 3: Frekuensi Sertifikat */}
        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIconWrapper}
            style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#6366F1' }}
          >
            <FileCheck size={20} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>FREKUENSI SERTIFIKAT</span>
            <span className={styles.kpiValue}>{kpis.totalFrekuensi.toLocaleString('id-ID')}</span>
            <span className={styles.kpiSub}>Jumlah sertifikat terbit</span>
          </div>
        </div>

        {/* KPI 4: Total Komoditas */}
        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIconWrapper}
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}
          >
            <Fish size={20} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>KOMODITAS UNIK</span>
            <span className={styles.kpiValue}>{kpis.totalKomoditas.toLocaleString('id-ID')}</span>
            <span className={styles.kpiSub}>Jenis ikan hidup tercatat</span>
          </div>
        </div>

        {/* KPI 5: Total Daerah / Negara */}
        <div className={styles.kpiCard}>
          <div
            className={styles.kpiIconWrapper}
            style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}
          >
            {isEkspor ? <Globe size={20} /> : <MapPin size={20} />}
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>{kpiLocationLabel}</span>
            <span className={styles.kpiValue}>{kpis.totalDaerah.toLocaleString('id-ID')}</span>
            <span className={styles.kpiSub}>{kpiLocationSub}</span>
          </div>
        </div>
      </div>

      {/* 3. Toolbar & Dropdown Selector */}
      <div className={styles.toolbarCard}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            {/* List Dropdown Domestik Masuk, Domestik Keluar, dan Ekspor */}
            <div className={styles.dropdownControl}>
              <span className={styles.dropdownLabel}>Arah Lalu Lintas:</span>
              <select
                className={styles.trafficSelect}
                value={trafficType}
                onChange={(e) => handleTrafficChange(e.target.value)}
                aria-label="Pilih Arus Lalu Lintas"
              >
                <option value="domestik_keluar">Domestik Keluar (Dokel)</option>
                <option value="domestik_masuk">Domestik Masuk (Domas)</option>
                <option value="ekspor">Ekspor</option>
              </select>
            </div>

            {/* Toggle Filter Klasifikasi Ikan Hidup */}
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={onlyIkanHidupFilter}
                onChange={(e) => {
                  setOnlyIkanHidupFilter(e.target.checked);
                  setCurrentPage(1);
                }}
                style={{ cursor: 'pointer' }}
              />
              <span>Filter: Hanya Klasifikasi Ikan Hidup</span>
            </label>
          </div>

          <div className={styles.toolbarRight}>
            {/* Search Input */}
            <div className={styles.searchWrapper}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder={`Cari ${daerahHeaderLabel.toLowerCase()}, komoditas, atau nama tercetak...`}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Page Size Selector */}
            <select
              className={styles.pageSizeSelect}
              value={pageSize}
              onChange={(e) => {
                setPageSize(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Jumlah baris per halaman"
            >
              <option value="10">10 baris</option>
              <option value="25">25 baris</option>
              <option value="50">50 baris</option>
              <option value="100">100 baris</option>
              <option value="all">Semua baris</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Table Area */}
      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '48px', textAlign: 'center' }}>No.</th>
                <th className={styles.sortable} onClick={() => handleSort('daerah')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>{daerahHeaderLabel}</span>
                    {getSortIcon('daerah')}
                  </div>
                </th>
                <th className={styles.sortable} onClick={() => handleSort('komoditas')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>Komoditas</span>
                    {getSortIcon('komoditas')}
                  </div>
                </th>
                <th className={styles.sortable} onClick={() => handleSort('namaTercetak')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>Nama Tercetak</span>
                    {getSortIcon('namaTercetak')}
                  </div>
                </th>
                <th
                  className={styles.sortable}
                  style={{ textAlign: 'right' }}
                  onClick={() => handleSort('volumeKg')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                    <span>Volume (Kg)</span>
                    {getSortIcon('volumeKg')}
                  </div>
                </th>
                <th
                  className={styles.sortable}
                  style={{ textAlign: 'right' }}
                  onClick={() => handleSort('volumeEkor')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                    <span>Volume (ekor)</span>
                    {getSortIcon('volumeEkor')}
                  </div>
                </th>
                <th
                  className={styles.sortable}
                  style={{ textAlign: 'center' }}
                  onClick={() => handleSort('frekuensi')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <span>Frekuensi Sertifikat</span>
                    {getSortIcon('frekuensi')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <RefreshCw size={20} className="spin" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                    <span>Memuat data tabel Ikan Hidup...</span>
                  </td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#EF4444' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={32} />
                      <span style={{ fontWeight: 600 }}>Terjadi kesalahan saat memuat data:</span>
                      <span style={{ fontSize: '0.8125rem' }}>{errorMsg}</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <Fish size={40} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                        {searchQuery
                          ? 'Tidak ada baris yang cocok dengan kata kunci pencarian.'
                          : 'Tidak ada data Ikan Hidup pada periode yang dipilih.'}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '460px', lineHeight: 1.5 }}>
                        {onlyIkanHidupFilter
                          ? 'Belum ada data komoditas ikan dengan klasifikasi "Ikan Hidup" pada filter saat ini. Anda dapat menonaktifkan filter "Hanya Klasifikasi Ikan Hidup" untuk melihat seluruh komoditas ikan.'
                          : 'Silakan sesuaikan filter periode, Satpel, atau unggah data Excel baru pada menu Manajemen Data.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, idx) => {
                  const rowNumber = pageSize === 'all' ? idx + 1 : (currentPage - 1) * actualPageSize + idx + 1;
                  return (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{rowNumber}</td>
                      <td className={styles.locationCol}>{item.daerah}</td>
                      <td className={styles.commodityCol}>{item.komoditas}</td>
                      <td className={styles.latinCol}>{item.namaTercetak}</td>
                      <td className={styles.numCol}>
                        {item.volumeKg > 0 ? item.volumeKg.toLocaleString('id-ID') : '-'}
                      </td>
                      <td className={styles.numCol}>
                        {item.volumeEkor > 0 ? item.volumeEkor.toLocaleString('id-ID') : '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={styles.freqBadge}>
                          {item.frekuensi.toLocaleString('id-ID')}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Summary Footer */}
            {paginatedData.length > 0 && (
              <tfoot className={styles.tableFooter}>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>
                    TOTAL:
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {kpis.totalVolumeKg.toLocaleString('id-ID')} Kg
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {kpis.totalVolumeEkor.toLocaleString('id-ID')} Ekor
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    {kpis.totalFrekuensi.toLocaleString('id-ID')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* 5. Pagination Controls */}
        {!loading && totalItems > 0 && (
          <div className={styles.pagination}>
            <div>
              Menampilkan{' '}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {pageSize === 'all' ? 1 : (currentPage - 1) * actualPageSize + 1}
              </span>{' '}
              sampai{' '}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {pageSize === 'all' ? totalItems : Math.min(currentPage * actualPageSize, totalItems)}
              </span>{' '}
              dari{' '}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {totalItems}
              </span>{' '}
              entri teragregasi
            </div>

            {pageSize !== 'all' && totalPages > 1 && (
              <div className={styles.paginationControls}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="Halaman sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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
                      type="button"
                      className={`${styles.pageBtn} ${currentPage === pageNum ? styles.active : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="Halaman berikutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
