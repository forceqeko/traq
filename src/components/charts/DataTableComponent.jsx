import { useState, useMemo, useEffect } from 'react';
import styles from './charts.module.css';
import { Search, ChevronLeft, ChevronRight, BarChart3, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { getColumnMappingMap } from '@/lib/services/columnService';
import { getCertificateId, getDocumentId, getK11Id, getAjuId, isIkanHidup } from '@/lib/data/aggregation';
import { formatMonthToShort, isMonthName, getMonthSortOrder } from '@/lib/data/monthUtils';

export default function DataTableComponent({
  data = [],
  columns = [],
  tableMode = 'raw',
  groupBy = 'Satpel',
  metrics = ['certs', 'rows', 'volume', 'value'],
  sortBy = 'certs_desc',
  topN = 'all',
  pageSize: initialPageSize = 10,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [columnMap, setColumnMap] = useState({});
  const [userSortKey, setUserSortKey] = useState(null);
  const [userSortDir, setUserSortDir] = useState('desc'); // 'asc' | 'desc'
  const pageSize = initialPageSize || 10;

  useEffect(() => {
    loadMapping();
  }, []);

  const loadMapping = async () => {
    const map = await getColumnMappingMap();
    setColumnMap(map || {});
  };

  const getDisplayName = (key) => {
    if (!key) return '';
    return columnMap[key] || key;
  };

  const isAggregate = tableMode === 'aggregate' || (groupBy && !columns?.length);
  const activeMetrics = metrics && metrics.length > 0 ? metrics : ['certs', 'rows', 'volume', 'value'];

  // Smart Effective Sort Determination (Aligns with user click or active visible metrics)
  const activeSort = useMemo(() => {
    if (userSortKey) {
      return { key: userSortKey, dir: userSortDir };
    }

    if (sortBy) {
      if (sortBy === 'certs_desc') {
        // If certs is not in visible metrics, fallback to the first active metric
        if (!activeMetrics.includes('certs')) {
          if (activeMetrics.includes('k11')) return { key: 'k11', dir: 'desc' };
          if (activeMetrics.includes('no_aju')) return { key: 'no_aju', dir: 'desc' };
          if (activeMetrics.includes('ikan_hidup')) return { key: 'ikan_hidup', dir: 'desc' };
          if (activeMetrics.includes('percentage')) return { key: 'percentage', dir: 'desc' };
          if (activeMetrics.includes('percentage_aju')) return { key: 'percentage_aju', dir: 'desc' };
          if (activeMetrics.includes('volume')) return { key: 'volume', dir: 'desc' };
          if (activeMetrics.includes('value')) return { key: 'value', dir: 'desc' };
          if (activeMetrics.includes('rows')) return { key: 'rows', dir: 'desc' };
        }
        return { key: 'certs', dir: 'desc' };
      }
      if (sortBy === 'certs_asc') return { key: 'certs', dir: 'asc' };
      if (sortBy === 'k11_desc') return { key: 'k11', dir: 'desc' };
      if (sortBy === 'k11_asc') return { key: 'k11', dir: 'asc' };
      if (sortBy === 'no_aju_desc') return { key: 'no_aju', dir: 'desc' };
      if (sortBy === 'no_aju_asc') return { key: 'no_aju', dir: 'asc' };
      if (sortBy === 'ikan_hidup_desc') return { key: 'ikan_hidup', dir: 'desc' };
      if (sortBy === 'ikan_hidup_asc') return { key: 'ikan_hidup', dir: 'asc' };
      if (sortBy === 'percentage_desc') return { key: 'percentage', dir: 'desc' };
      if (sortBy === 'percentage_asc') return { key: 'percentage', dir: 'asc' };
      if (sortBy === 'percentage_aju_desc') return { key: 'percentage_aju', dir: 'desc' };
      if (sortBy === 'percentage_aju_asc') return { key: 'percentage_aju', dir: 'asc' };
      if (sortBy === 'diff_desc') return { key: 'diff', dir: 'desc' };
      if (sortBy === 'diff_asc') return { key: 'diff', dir: 'asc' };
      if (sortBy === 'diff_aju_desc') return { key: 'diff_aju', dir: 'desc' };
      if (sortBy === 'diff_aju_asc') return { key: 'diff_aju', dir: 'asc' };
      if (sortBy === 'vol_desc') return { key: 'volume', dir: 'desc' };
      if (sortBy === 'vol_asc') return { key: 'volume', dir: 'asc' };
      if (sortBy === 'val_desc') return { key: 'value', dir: 'desc' };
      if (sortBy === 'val_asc') return { key: 'value', dir: 'asc' };
      if (sortBy === 'rows_desc') return { key: 'rows', dir: 'desc' };
      if (sortBy === 'rows_asc') return { key: 'rows', dir: 'asc' };
      if (sortBy === 'name_asc') return { key: 'groupName', dir: 'asc' };
      if (sortBy === 'name_desc') return { key: 'groupName', dir: 'desc' };
    }

    // Default fallback
    if (activeMetrics.includes('k11')) return { key: 'k11', dir: 'desc' };
    if (activeMetrics.includes('no_aju')) return { key: 'no_aju', dir: 'desc' };
    if (activeMetrics.includes('ikan_hidup')) return { key: 'ikan_hidup', dir: 'desc' };
    if (activeMetrics.includes('volume')) return { key: 'volume', dir: 'desc' };
    return { key: 'certs', dir: 'desc' };
  }, [userSortKey, userSortDir, sortBy, activeMetrics]);

  const handleHeaderSort = (key) => {
    if (activeSort.key === key) {
      setUserSortKey(key);
      setUserSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setUserSortKey(key);
      setUserSortDir(key === 'groupName' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  // 1. Process Aggregated Summary Data (Distinct Count & Sums per Group)
  const aggregateResult = useMemo(() => {
    if (!isAggregate || !data || data.length === 0) {
      return {
        rows: [],
        totals: {
          groupName: 'TOTAL KESELURUHAN',
          certs: 0,
          k11: 0,
          percentage: 0,
          diff: 0,
          no_aju: 0,
          percentage_aju: 0,
          diff_aju: 0,
          ikan_hidup: 0,
          rows: 0,
          volume: 0,
          value: 0,
          avg_volume: 0,
          avg_value: 0,
        },
      };
    }

    const groupMap = new Map();
    let totalCertsSet = new Set();
    let totalK11Set = new Set();
    let totalAjuSet = new Set();
    let grandIkanHidup = 0;
    let grandRows = 0;
    let grandVol = 0;
    let grandVal = 0;

    const isMonthGroup = String(groupBy || '').toLowerCase().includes('bulan') || String(groupBy || '').toLowerCase().includes('month');

    // Pre-check if dataset contains actual document, K.1.1, or Aju fields
    const hasAnyDoc = data.some((r) => getDocumentId(r.row_data || r));
    const hasAnyK11 = data.some((r) => getK11Id(r.row_data || r));
    const hasAnyAju = data.some((r) => getAjuId(r.row_data || r));

    data.forEach((r, idx) => {
      const row = r.row_data || r || {};
      const rawGroup = row[groupBy] || row.Satpel || row.Komoditas || row.Bulan || 'Lainnya';
      let groupKey = String(rawGroup).trim() || 'Lainnya';
      if (isMonthGroup || isMonthName(groupKey)) {
        groupKey = formatMonthToShort(groupKey, isMonthGroup);
      }

      const docId = getDocumentId(row);
      const k11Id = getK11Id(row);
      const ajuId = getAjuId(row);
      const isHidup = isIkanHidup(row);
      // Determine certId: if real docId exists, use it; if no doc columns exist at all, fallback
      const certId = hasAnyDoc ? docId : (hasAnyK11 || hasAnyAju ? null : getCertificateId(row, idx));

      const vol = parseNum(row['Netto P8'] ?? row['Netto P1'] ?? row.Netto ?? row['Vol P1'] ?? row.Volume ?? row['Vol Lain'] ?? 0);
      const val = parseNum(row['Harga Barang (Rp)'] ?? row.Nilai_Rupiah ?? row.Harga ?? 0);

      if (certId) totalCertsSet.add(certId);
      if (k11Id) totalK11Set.add(k11Id);
      if (ajuId) totalAjuSet.add(ajuId);
      if (isHidup) grandIkanHidup += 1;
      grandRows += 1;
      grandVol += vol;
      grandVal += val;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          groupName: groupKey,
          certs: new Set(),
          k11: new Set(),
          aju: new Set(),
          ikanHidupCount: 0,
          rowCount: 0,
          totalVol: 0,
          totalVal: 0,
        });
      }

      const item = groupMap.get(groupKey);
      if (certId) item.certs.add(certId);
      if (k11Id) item.k11.add(k11Id);
      if (ajuId) item.aju.add(ajuId);
      if (isHidup) item.ikanHidupCount += 1;
      item.rowCount += 1;
      item.totalVol += vol;
      item.totalVal += val;
    });

    let list = Array.from(groupMap.values()).map((item) => {
      const certCount = item.certs.size;
      const k11Count = item.k11.size;
      const ajuCount = item.aju.size;

      const diffK11 = k11Count - certCount;
      const percentageK11 = k11Count > 0
        ? (certCount / k11Count) * 100
        : (certCount > 0 ? 100 : 0);

      const diffAju = ajuCount - certCount;
      const percentageAju = ajuCount > 0
        ? (certCount / ajuCount) * 100
        : (certCount > 0 ? 100 : 0);

      return {
        groupName: item.groupName,
        certs: certCount,
        k11: k11Count,
        percentage: percentageK11,
        diff: diffK11,
        no_aju: ajuCount,
        percentage_aju: percentageAju,
        diff_aju: diffAju,
        ikan_hidup: item.ikanHidupCount,
        rows: item.rowCount,
        volume: Math.round(item.totalVol),
        value: Math.round(item.totalVal),
        avg_volume: certCount > 0 ? Math.round(item.totalVol / certCount) : 0,
        avg_value: certCount > 0 ? Math.round(item.totalVal / certCount) : 0,
      };
    });

    // Dynamic Multi-field Sorting
    list.sort((a, b) => {
      if (activeSort.key === 'groupName') {
        if (isMonthGroup) {
          const mOrderA = getMonthSortOrder(a.groupName);
          const mOrderB = getMonthSortOrder(b.groupName);
          return activeSort.dir === 'asc' ? mOrderA - mOrderB : mOrderB - mOrderA;
        }
        const cmp = a.groupName.localeCompare(b.groupName);
        return activeSort.dir === 'asc' ? cmp : -cmp;
      }
      const valA = Number(a[activeSort.key] || 0);
      const valB = Number(b[activeSort.key] || 0);
      return activeSort.dir === 'asc' ? valA - valB : valB - valA;
    });

    // Apply Top-N ranking limit if specified
    if (topN && topN !== 'all' && !isNaN(parseInt(topN, 10))) {
      list = list.slice(0, parseInt(topN, 10));
    }

    const grandCerts = totalCertsSet.size;
    const grandK11 = totalK11Set.size;
    const grandAju = totalAjuSet.size;

    const grandDiffK11 = grandK11 - grandCerts;
    const grandPercentageK11 = grandK11 > 0
      ? (grandCerts / grandK11) * 100
      : (grandCerts > 0 ? 100 : 0);

    const grandDiffAju = grandAju - grandCerts;
    const grandPercentageAju = grandAju > 0
      ? (grandCerts / grandAju) * 100
      : (grandCerts > 0 ? 100 : 0);

    const totals = {
      groupName: 'TOTAL KESELURUHAN',
      certs: grandCerts,
      k11: grandK11,
      percentage: grandPercentageK11,
      diff: grandDiffK11,
      no_aju: grandAju,
      percentage_aju: grandPercentageAju,
      diff_aju: grandDiffAju,
      ikan_hidup: grandIkanHidup,
      rows: grandRows,
      volume: Math.round(grandVol),
      value: Math.round(grandVal),
      avg_volume: grandCerts > 0 ? Math.round(grandVol / grandCerts) : 0,
      avg_value: grandCerts > 0 ? Math.round(grandVal / grandCerts) : 0,
    };

    return { rows: list, totals };
  }, [data, isAggregate, groupBy, activeSort, topN]);

  // 2. Metric Columns configuration for Aggregate Mode with Display Names from Registry
  const volDisplay = getDisplayName('Netto P8') || getDisplayName('Netto P1') || getDisplayName('Vol P1') || getDisplayName('Volume') || 'Berat (Kg)';
  const valDisplay = getDisplayName('Harga Barang (Rp)') || getDisplayName('Nilai_Rupiah') || 'Harga Barang';
  const certDisplay = getDisplayName('Nomor Dokumen') || 'Nomor Dokumen';
  const k11Display = getDisplayName('No. K.1.1') || 'No. K.1.1';
  const ajuDisplay = getDisplayName('No. Aju') || getDisplayName('No Aju') || 'No. Aju';
  const klasifikasiDisplay = getDisplayName('Klasifikasi') || 'Klasifikasi';

  const metricDefs = {
    certs: {
      label: `Jumlah (${certDisplay})`,
      sortKey: 'certs',
      format: (v) => Math.round(Number(v || 0)).toLocaleString('id-ID'),
      align: 'right',
    },
    k11: {
      label: `Jumlah (${k11Display})`,
      sortKey: 'k11',
      format: (v) => Math.round(Number(v || 0)).toLocaleString('id-ID'),
      align: 'right',
    },
    no_aju: {
      label: `Jumlah (${ajuDisplay})`,
      sortKey: 'no_aju',
      format: (v) => Math.round(Number(v || 0)).toLocaleString('id-ID'),
      align: 'right',
    },
    ikan_hidup: {
      label: 'Klasifikasi Ikan Hidup',
      sortKey: 'ikan_hidup',
      format: (v) => {
        const num = Number(v || 0);
        return (
          <span style={{ fontWeight: num > 0 ? 600 : 400, color: num > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
            {Math.round(num).toLocaleString('id-ID')}
          </span>
        );
      },
      align: 'right',
    },
    percentage_aju: {
      label: `Persentase (${certDisplay} vs ${ajuDisplay})`,
      sortKey: 'percentage_aju',
      format: (v, row) => {
        const aCount = Number(row?.no_aju ?? 0);
        const dCount = Number(row?.certs ?? 0);
        const diff = row?.diff_aju !== undefined ? Number(row.diff_aju) : (aCount - dCount);

        if (aCount === 0 && dCount === 0) {
          return <span style={{ color: 'var(--text-muted)' }}>-</span>;
        }
        if (aCount === 0 && dCount > 0) {
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#10B981', fontWeight: 600 }}>
              <span>100.0%</span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#059669',
                  fontWeight: 600,
                }}
              >
                Dokumen Saja
              </span>
            </span>
          );
        }

        const pctVal = Number(v || 0);
        const pctStr = `${pctVal.toFixed(1)}%`;

        if (diff === 0) {
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#10B981', fontWeight: 600 }}>
              <span>{pctStr}</span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#059669',
                  fontWeight: 600,
                }}
              >
                Sesuai
              </span>
            </span>
          );
        } else if (diff > 0) {
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#D97706', fontWeight: 600 }}>
              <span>{pctStr}</span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#B45309',
                  fontWeight: 600,
                }}
                title={`Selisih ${diff} permohonan No. Aju belum/tidak menjadi sertifikat`}
              >
                Selisih: {diff}
              </span>
            </span>
          );
        } else {
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#2563EB', fontWeight: 600 }}>
              <span>{pctStr}</span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: '#1D4ED8',
                  fontWeight: 600,
                }}
              >
                +{Math.abs(diff)}
              </span>
            </span>
          );
        }
      },
      align: 'right',
    },
    diff_aju: {
      label: `Selisih (${ajuDisplay} - Dokumen)`,
      sortKey: 'diff_aju',
      format: (v) => {
        const val = Number(v || 0);
        if (val === 0) {
          return <span style={{ color: '#10B981', fontWeight: 600 }}>0 (Sesuai)</span>;
        } else if (val > 0) {
          return <span style={{ color: '#D97706', fontWeight: 600 }}>+{val}</span>;
        } else {
          return <span style={{ color: '#2563EB', fontWeight: 600 }}>{val}</span>;
        }
      },
      align: 'right',
    },
    percentage: {
      label: 'Persentase Sertifikasi (%)',
      sortKey: 'percentage',
      format: (v, row) => {
        const kCount = Number(row?.k11 ?? 0);
        const dCount = Number(row?.certs ?? 0);
        const diff = row?.diff !== undefined ? Number(row.diff) : (kCount - dCount);

        if (kCount === 0 && dCount === 0) {
          return <span style={{ color: 'var(--text-muted)' }}>-</span>;
        }
        if (kCount === 0 && dCount > 0) {
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#10B981', fontWeight: 600 }}>
              <span>100.0%</span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#059669',
                  fontWeight: 600,
                }}
              >
                Dokumen Saja
              </span>
            </span>
          );
        }

        const pctVal = Number(v || 0);
        const pctStr = `${pctVal.toFixed(1)}%`;

        if (diff === 0) {
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#10B981', fontWeight: 600 }}>
              <span>{pctStr}</span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#059669',
                  fontWeight: 600,
                }}
              >
                Sesuai
              </span>
            </span>
          );
        } else if (diff > 0) {
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#D97706', fontWeight: 600 }}>
              <span>{pctStr}</span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#B45309',
                  fontWeight: 600,
                }}
                title={`Selisih ${diff} pengajuan belum/tidak menjadi sertifikat`}
              >
                Selisih: {diff}
              </span>
            </span>
          );
        } else {
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#2563EB', fontWeight: 600 }}>
              <span>{pctStr}</span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  color: '#1D4ED8',
                  fontWeight: 600,
                }}
              >
                +{Math.abs(diff)}
              </span>
            </span>
          );
        }
      },
      align: 'right',
    },
    diff: {
      label: 'Selisih (K.1.1 - Dokumen)',
      sortKey: 'diff',
      format: (v) => {
        const val = Number(v || 0);
        if (val === 0) {
          return <span style={{ color: '#10B981', fontWeight: 600 }}>0 (Sesuai)</span>;
        } else if (val > 0) {
          return <span style={{ color: '#D97706', fontWeight: 600 }}>+{val}</span>;
        } else {
          return <span style={{ color: '#2563EB', fontWeight: 600 }}>{val}</span>;
        }
      },
      align: 'right',
    },
    rows: {
      label: 'Jumlah Rincian (Baris)',
      sortKey: 'rows',
      format: (v) => Math.round(Number(v || 0)).toLocaleString('id-ID'),
      align: 'right',
    },
    volume: {
      label: `Total ${volDisplay} (Kg)`,
      sortKey: 'volume',
      format: (v) => Math.round(Number(v || 0)).toLocaleString('id-ID'),
      align: 'right',
    },
    value: {
      label: `Total ${valDisplay} (Rp)`,
      sortKey: 'value',
      format: (v) => `Rp ${Math.round(Number(v || 0)).toLocaleString('id-ID')}`,
      align: 'right',
    },
    avg_volume: {
      label: `Rata-rata ${volDisplay}/Sertifikat (Kg)`,
      sortKey: 'avg_volume',
      format: (v) => Math.round(Number(v || 0)).toLocaleString('id-ID'),
      align: 'right',
    },
    avg_value: {
      label: `Rata-rata ${valDisplay}/Sertifikat (Rp)`,
      sortKey: 'avg_value',
      format: (v) => `Rp ${Math.round(Number(v || 0)).toLocaleString('id-ID')}`,
      align: 'right',
    },
  };

  // Raw data keys extraction
  const sampleRow = data?.[0]?.row_data || data?.[0] || {};
  const rawKeys = columns && columns.length > 0 ? columns : Object.keys(sampleRow).slice(0, 8);

  const getRawVal = (row, key) => {
    if (!row) return '';
    const src = row.row_data || row;
    const val = src[key];
    if (val === null || val === undefined || val === '') return '-';
    const keyLower = String(key || '').toLowerCase();
    if (keyLower.includes('netto') || keyLower.includes('vol') || keyLower.includes('berat')) {
      const num = parseNum(val);
      return Math.round(num).toLocaleString('id-ID');
    }
    if (keyLower.includes('harga') || keyLower.includes('nilai') || keyLower.includes('rupiah')) {
      const num = parseNum(val);
      return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
    }
    return String(val);
  };

  // Filtered rows for search and Top-N
  const filteredRows = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (isAggregate) {
      if (!searchTerm.trim()) return aggregateResult.rows || [];
      const q = searchTerm.toLowerCase();
      return (aggregateResult.rows || []).filter((r) => r.groupName.toLowerCase().includes(q));
    } else {
      let rows = data || [];
      if (topN && topN !== 'all' && !isNaN(parseInt(topN, 10))) {
        rows = rows.slice(0, parseInt(topN, 10));
      }
      if (!searchTerm.trim()) return rows;
      const q = searchTerm.toLowerCase();
      return rows.filter((row) =>
        rawKeys.some((key) => getRawVal(row, key).toLowerCase().includes(q))
      );
    }
  }, [isAggregate, aggregateResult.rows, data, searchTerm, rawKeys, topN]);

  const totalPages = Math.ceil((filteredRows?.length || 0) / pageSize) || 1;
  const paginatedRows = (filteredRows || []).slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const renderSortIndicator = (key) => {
    if (activeSort.key === key) {
      return activeSort.dir === 'desc' ? (
        <ArrowDown size={13} color="var(--primary)" style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
      ) : (
        <ArrowUp size={13} color="var(--primary)" style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
      );
    }
    return <ArrowUpDown size={11} style={{ marginLeft: '4px', opacity: 0.35, verticalAlign: 'middle' }} />;
  };

  if (!data || data.length === 0) {
    return <div className={styles.emptyBox}>Tidak ada data tabel</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', height: '100%', flex: 1, justifyContent: 'space-between' }}>
      {/* Top Controls: Search & Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
          <input
            type="text"
            className="input"
            style={{ paddingLeft: '2.25rem', fontSize: '0.8125rem', width: '100%' }}
            placeholder={isAggregate ? `Cari ${getDisplayName(groupBy)}...` : 'Cari rincian dalam tabel...'}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--primary)', fontSize: '0.75rem' }}>
            {isAggregate
              ? `Rekapitulasi per ${getDisplayName(groupBy)}${topN && topN !== 'all' ? ` (Top ${topN})` : ''}`
              : `${rawKeys.length} Kolom Rincian${topN && topN !== 'all' ? ` (Top ${topN})` : ''}`}
          </span>
          <span>{filteredRows.length.toLocaleString('id-ID')} Data</span>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', flex: 1, minHeight: '230px', maxHeight: '460px' }}>
        <table className="previewTable" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          {isAggregate ? (
            /* ================= AGGREGATE SUMMARY TABLE ================= */
            <>
              <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                <tr style={{ backgroundColor: 'var(--surface-2)', textAlign: 'left' }}>
                  <th style={{ padding: '0.625rem 0.875rem', width: '45px', color: 'var(--text-muted)' }}>No</th>
                  <th
                    onClick={() => handleHeaderSort('groupName')}
                    style={{
                      padding: '0.625rem 0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      userSelect: 'none',
                      color: activeSort.key === 'groupName' ? 'var(--primary)' : 'inherit',
                    }}
                    title="Klik untuk mengurutkan nama"
                  >
                    <span>{getDisplayName(groupBy)}</span>
                    {renderSortIndicator('groupName')}
                  </th>
                  {activeMetrics.map((mKey) => {
                    const sortKey = metricDefs[mKey]?.sortKey || mKey;
                    const isActive = activeSort.key === sortKey;
                    return (
                      <th
                        key={mKey}
                        onClick={() => handleHeaderSort(sortKey)}
                        style={{
                          padding: '0.625rem 0.875rem',
                          textAlign: metricDefs[mKey]?.align || 'right',
                          whiteSpace: 'nowrap',
                          fontWeight: 600,
                          cursor: 'pointer',
                          userSelect: 'none',
                          color: isActive ? 'var(--primary)' : 'inherit',
                        }}
                        title={`Klik untuk mengurutkan berdasarkan ${metricDefs[mKey]?.label || mKey}`}
                      >
                        <span>{metricDefs[mKey]?.label || mKey}</span>
                        {renderSortIndicator(sortKey)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, rIdx) => {
                  const rowNum = (currentPage - 1) * pageSize + rIdx + 1;
                  return (
                    <tr key={row.groupName || rIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.55rem 0.875rem', color: 'var(--text-muted)' }}>{rowNum}</td>
                      <td style={{ padding: '0.55rem 0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {row.groupName}
                      </td>
                      {activeMetrics.map((mKey) => {
                        const sortKey = metricDefs[mKey]?.sortKey || mKey;
                        const isSortedCol = activeSort.key === sortKey;
                        return (
                          <td
                            key={mKey}
                            style={{
                              padding: '0.55rem 0.875rem',
                              textAlign: metricDefs[mKey]?.align || 'right',
                              color: isSortedCol ? 'var(--primary)' : 'var(--text-secondary)',
                              fontWeight: isSortedCol ? 700 : 400,
                              fontFamily: 'Outfit, sans-serif',
                            }}
                          >
                            {metricDefs[mKey]?.format ? metricDefs[mKey].format(row[mKey] ?? 0, row) : (row[mKey] ?? 0)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              {/* Grand Total Footer Row */}
              <tfoot>
                <tr
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    borderTop: '2px solid var(--primary)',
                    fontWeight: 700,
                  }}
                >
                  <td style={{ padding: '0.625rem 0.875rem' }}>Σ</td>
                  <td style={{ padding: '0.625rem 0.875rem', color: 'var(--primary)' }}>
                    {aggregateResult.totals.groupName}
                  </td>
                  {activeMetrics.map((mKey) => (
                    <td
                      key={mKey}
                      style={{
                        padding: '0.625rem 0.875rem',
                        textAlign: metricDefs[mKey]?.align || 'right',
                        color: 'var(--primary)',
                        fontFamily: 'Outfit, sans-serif',
                      }}
                    >
                      {metricDefs[mKey]?.format ? metricDefs[mKey].format(aggregateResult.totals[mKey] ?? 0, aggregateResult.totals) : (aggregateResult.totals[mKey] ?? 0)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </>
          ) : (
            /* ================= RAW DETAIL TABLE ================= */
            <>
              <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                <tr style={{ backgroundColor: 'var(--surface-2)', textAlign: 'left' }}>
                  <th style={{ padding: '0.625rem 0.875rem', width: '40px', color: 'var(--text-muted)' }}>No</th>
                  {rawKeys.map((key) => (
                    <th key={key} style={{ padding: '0.625rem 0.875rem', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {getDisplayName(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, rIdx) => {
                  const rowNum = (currentPage - 1) * pageSize + rIdx + 1;
                  return (
                    <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.5rem 0.875rem', color: 'var(--text-muted)' }}>{rowNum}</td>
                      {rawKeys.map((key) => {
                        const cellVal = getRawVal(row, key);
                        return (
                          <td key={key} style={{ padding: '0.5rem 0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {cellVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </>
          )}
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.25rem' }}>
        <span>
          Menampilkan {filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
          {Math.min(currentPage * pageSize, filteredRows.length)} dari {filteredRows.length.toLocaleString('id-ID')} baris
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.25rem 0.5rem' }}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          >
            <ChevronLeft size={14} />
          </button>
          <span>
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.25rem 0.5rem' }}
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/[Rp\s]/g, '').replace(/,/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}
