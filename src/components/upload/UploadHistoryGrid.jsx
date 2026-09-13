import { useState, useMemo } from 'react';
import { useDialog } from '@/contexts/DialogContext';
import UpdateUploadModal from '@/components/upload/UpdateUploadModal';
import AuditLogModal from '@/components/upload/AuditLogModal';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  History,
  Layers,
  Search,
  Filter,
  CheckSquare,
  Rows3,
  Loader2,
  Sparkles,
  X,
  UploadCloud,
} from 'lucide-react';

const MONTH_NAMES = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const SECTOR_CONFIGS = [
  {
    key: 'hewan',
    title: 'Karantina Hewan',
    color: '#0284c7',
    bgColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: 'rgba(2, 132, 199, 0.25)',
  },
  {
    key: 'ikan',
    title: 'Karantina Ikan',
    color: '#0d9488',
    bgColor: 'rgba(13, 148, 136, 0.08)',
    borderColor: 'rgba(13, 148, 136, 0.25)',
  },
  {
    key: 'tumbuhan',
    title: 'Karantina Tumbuhan',
    color: '#16a34a',
    bgColor: 'rgba(22, 163, 74, 0.08)',
    borderColor: 'rgba(22, 163, 74, 0.25)',
  },
];

const TRAFFIC_ORDER = [
  { key: 'domestik_masuk', label: 'Domestik Masuk', shortLabel: 'Domestik Masuk' },
  { key: 'domestik_keluar', label: 'Domestik Keluar', shortLabel: 'Domestik Keluar' },
  { key: 'ekspor', label: 'Ekspor', shortLabel: 'Ekspor' },
  { key: 'impor', label: 'Impor', shortLabel: 'Impor' },
];

export default function UploadHistoryGrid({
  historyList = [],
  datasets = [],
  columnRegistry = [],
  onDeleteBatch,
  onRefresh,
  isLoading = false,
}) {
  const { showConfirm } = useDialog();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // State
  const [selectedYear, setSelectedYear] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, complete, incomplete
  const [expandedMonths, setExpandedMonths] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [openedMonthKeys, setOpenedMonthKeys] = useState(new Set());

  // Add Month Dialog State
  const [showAddMonthModal, setShowAddMonthModal] = useState(false);
  const [newMonthVal, setNewMonthVal] = useState(currentMonth);
  const [newYearVal, setNewYearVal] = useState(currentYear);

  // Modal Update / Upload State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    targetDataset: null,
    targetMonth: null,
    targetYear: null,
    existingBatch: null,
  });

  // Modal Audit Log State
  const [auditModalConfig, setAuditModalConfig] = useState({
    isOpen: false,
    targetDataset: null,
    targetMonth: null,
    targetYear: null,
    activeItem: null,
  });

  // Extract all available years from history & current year
  const availableYears = useMemo(() => {
    const yearSet = new Set([currentYear]);
    historyList.forEach((item) => {
      if (item.period_year) yearSet.add(item.period_year);
    });
    openedMonthKeys.forEach((key) => {
      const yr = parseInt(key.split('-')[0], 10);
      if (yr) yearSet.add(yr);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [historyList, openedMonthKeys, currentYear]);

  // Group history items by `YYYY-MM` key
  const monthlyGroups = useMemo(() => {
    // Collect all month-years that exist in history or explicitly opened
    const map = new Map();

    // 1. Pre-seed manually opened months
    openedMonthKeys.forEach((key) => {
      const [yrStr, moStr] = key.split('-');
      const yr = parseInt(yrStr, 10);
      const mo = parseInt(moStr, 10);
      if (!map.has(key)) {
        map.set(key, {
          key,
          year: yr,
          month: mo,
          recordsByDatasetCode: {},
          recordsByDatasetId: {},
          totalRows: 0,
          uploadedCount: 0,
        });
      }
    });

    // 2. Map existing history records
    historyList.forEach((item) => {
      const yr = item.period_year;
      const mo = item.period_month;
      if (!yr || !mo) return;
      const groupKey = `${yr}-${String(mo).padStart(2, '0')}`;
      if (!map.has(groupKey)) {
        map.set(groupKey, {
          key: groupKey,
          year: yr,
          month: mo,
          recordsByDatasetCode: {},
          recordsByDatasetId: {},
          totalRows: 0,
          uploadedCount: 0,
        });
      }
      const grp = map.get(groupKey);
      const dsCode = item.datasets?.code;
      const dsId = item.dataset_id;
      if (dsCode) grp.recordsByDatasetCode[dsCode] = item;
      if (dsId) grp.recordsByDatasetId[dsId] = item;
      grp.totalRows += item.row_count || 0;
      grp.uploadedCount += 1;
    });

    // Convert map to sorted array (latest first)
    const groups = Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return groups;
  }, [historyList, openedMonthKeys]);

  // Filter monthly groups based on Year & Status filters
  const filteredGroups = useMemo(() => {
    return monthlyGroups.filter((grp) => {
      if (selectedYear !== 'all' && grp.year !== Number(selectedYear)) return false;
      const isComplete = grp.uploadedCount >= 12;
      if (statusFilter === 'complete' && !isComplete) return false;
      if (statusFilter === 'incomplete' && isComplete) return false;
      return true;
    });
  }, [monthlyGroups, selectedYear, statusFilter]);

  // All months start collapsed by default so user can see all periods at a glance
  const toggleMonthExpand = (groupKey) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const expandAll = () => {
    const next = {};
    monthlyGroups.forEach((g) => {
      next[g.key] = true;
    });
    setExpandedMonths(next);
  };

  const collapseAll = () => {
    setExpandedMonths({});
  };

  const handleDelete = async (item) => {
    const confirmed = await showConfirm({
      title: 'Hapus Batch Data?',
      message: `Apakah Anda yakin ingin menghapus data batch "${item.datasets?.name || 'Dataset'}" periode ${MONTH_NAMES[item.period_month]} ${item.period_year} (${item.row_count?.toLocaleString('id-ID')} baris)? Data transaksi akan terhapus secara permanen dari database.`,
      type: 'confirm_delete',
      confirmText: 'Ya, Hapus Data',
      cancelText: 'Batal',
    });

    if (confirmed) {
      setDeletingId(item.id);
      await onDeleteBatch(item.id, item);
      setDeletingId(null);
    }
  };

  const openUpdateModal = (dataset, month, year, existingBatch = null) => {
    setModalConfig({
      isOpen: true,
      targetDataset: dataset,
      targetMonth: month,
      targetYear: year,
      existingBatch,
    });
  };

  const openAuditModal = (dataset, month, year, activeItem = null) => {
    setAuditModalConfig({
      isOpen: true,
      targetDataset: dataset,
      targetMonth: month,
      targetYear: year,
      activeItem,
    });
  };

  const handleModalSuccess = () => {
    if (onRefresh) onRefresh();
  };

  if (isLoading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={36} className="spin" style={{ marginBottom: '0.75rem', color: 'var(--primary)' }} />
        <p style={{ fontWeight: 500 }}>Memuat riwayat pengunggahan batch data...</p>
      </div>
    );
  }

  // Summary Metrics
  const totalUploadedBatches = historyList.length;
  const grandTotalRows = historyList.reduce((acc, curr) => acc + (curr.row_count || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ---------------- Top Control Bar & Stats ---------------- */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          backgroundColor: 'var(--surface-0)',
          padding: '1rem 1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Batch Terunggah</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {totalUploadedBatches.toLocaleString('id-ID')} File Excel
            </div>
          </div>

          <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--border-color)' }} />

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Rekaman Transaksi</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--primary)' }}>
              {grandTotalRows.toLocaleString('id-ID')} Baris
            </div>
          </div>

          <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--border-color)' }} />

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bulan Aktif</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--accent-teal, #14b8a6)' }}>
              {monthlyGroups.length} Periode
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Tahun:</span>
            <select
              className="select"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8125rem', minWidth: '100px' }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="all">Semua Tahun</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Status:</span>
            <select
              className="select"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8125rem', minWidth: '130px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Semua Status</option>
              <option value="complete">Lengkap (12/12)</option>
              <option value="incomplete">Belum Lengkap (&lt;12)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                fontSize: '0.8125rem',
                padding: '0.45rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
              }}
              onClick={() => setShowAddMonthModal(true)}
              title="Buka slot rekapitulasi untuk bulan/tahun baru"
            >
              <Plus size={16} />
              <span>Buka Periode Baru</span>
            </button>

            <div style={{ width: '1px', height: '22px', backgroundColor: 'var(--border-color)', margin: '0 0.25rem' }} />

            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
              onClick={expandAll}
              title="Buka semua rincian bulan"
            >
              Buka Semua
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
              onClick={collapseAll}
              title="Tutup semua rincian bulan"
            >
              Tutup Semua
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={onRefresh}
              title="Muat ulang daftar riwayat"
            >
              <RefreshCw size={13} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- No Data Placeholder ---------------- */}
      {filteredGroups.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
          <FileSpreadsheet size={48} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Tidak Ada Data Riwayat Sesuai Filter
          </h3>
          <p style={{ fontSize: '0.8125rem' }}>
            Silakan sesuaikan filter tahun atau status di atas untuk melihat riwayat data lainnya.
          </p>
        </div>
      )}

      {/* ---------------- Accordion List per Bulan ---------------- */}
      {filteredGroups.map((grp) => {
        const isExpanded = !!expandedMonths[grp.key];
        const isComplete = grp.uploadedCount >= 12;
        const monthLabel = MONTH_NAMES[grp.month];

        return (
          <div
            key={grp.key}
            className="card"
            style={{
              padding: 0,
              overflow: 'hidden',
              border: isComplete ? '1px solid var(--border-color)' : '1px solid rgba(234, 179, 8, 0.35)',
              backgroundColor: 'var(--surface-0)',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Accordion Header */}
            <div
              onClick={() => toggleMonthExpand(grp.key)}
              style={{
                padding: '1rem 1.25rem',
                backgroundColor: isExpanded ? 'var(--surface-1)' : 'var(--surface-0)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                userSelect: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isComplete ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.15)',
                    color: isComplete ? 'var(--status-success)' : '#ca8a04',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Calendar size={20} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      {monthLabel} {grp.year}
                    </h3>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        backgroundColor: isComplete ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.15)',
                        color: isComplete ? '#16a34a' : '#ca8a04',
                        border: `1px solid ${isComplete ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                      }}
                    >
                      {grp.uploadedCount} / 12 Kategori {isComplete ? '• Lengkap' : '• Belum Lengkap'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Total Rekapitulasi: <strong>{grp.totalRows.toLocaleString('id-ID')} Baris Data</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMonthExpand(grp.key);
                  }}
                >
                  <span>{isExpanded ? 'Sembunyikan' : 'Tampilkan Rincian'}</span>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {/* Accordion Body: 3 Distinct Sections (Option B Layout) */}
            {isExpanded && (
              <div
                style={{
                  padding: '1.25rem 1.5rem',
                  backgroundColor: 'var(--surface-1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem',
                }}
              >
                {SECTOR_CONFIGS.map((sector) => {
                  return (
                    <div
                      key={sector.key}
                      style={{
                        backgroundColor: 'var(--surface-0)',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${sector.borderColor}`,
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      {/* Sector Header */}
                      <div
                        style={{
                          padding: '0.75rem 1.25rem',
                          backgroundColor: sector.bgColor,
                          borderBottom: `1px solid ${sector.borderColor}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: sector.color,
                              display: 'inline-block',
                            }}
                          />
                          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                            {sector.title}
                          </h4>
                        </div>

                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          4 Arus Lalu Lintas (Masuk, Keluar, Ekspor, Impor)
                        </span>
                      </div>

                      {/* 4 Traffic Cards Grid */}
                      <div
                        style={{
                          padding: '1rem',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                          gap: '1rem',
                        }}
                      >
                        {TRAFFIC_ORDER.map((traffic) => {
                          // Find dataset for this sector & traffic
                          const targetDs = datasets.find(
                            (d) => d.commodity_type === sector.key && d.traffic_type === traffic.key
                          ) || {
                            id: `${sector.key}_${traffic.key}`,
                            name: `${traffic.label} ${sector.title.replace('Karantina ', '')}`,
                            commodity_type: sector.key,
                            traffic_type: traffic.key,
                          };

                          // Find if record exists in this month group
                          const record =
                            grp.recordsByDatasetCode[targetDs.code] ||
                            grp.recordsByDatasetId[targetDs.id] ||
                            null;

                          const hasData = !!record;

                          return (
                            <div
                              key={traffic.key}
                              style={{
                                borderRadius: 'var(--radius-sm)',
                                border: hasData
                                  ? '1px solid var(--border-color)'
                                  : '1px dashed var(--border-color)',
                                backgroundColor: hasData ? 'var(--surface-0)' : 'var(--surface-1)',
                                padding: '0.875rem 1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minHeight: '190px',
                                transition: 'all 0.15s ease',
                                position: 'relative',
                              }}
                            >
                              {/* Card Top: Traffic Label & Status Badge */}
                              <div>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: '0.5rem',
                                    marginBottom: '0.625rem',
                                  }}
                                >
                                  <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                      {traffic.shortLabel}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                      {targetDs.name}
                                    </div>
                                  </div>

                                  {hasData ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontSize: '0.6875rem',
                                        fontWeight: 700,
                                        padding: '0.15rem 0.45rem',
                                        borderRadius: '9999px',
                                        backgroundColor: 'rgba(34, 197, 94, 0.12)',
                                        color: '#16a34a',
                                        border: '1px solid rgba(34, 197, 94, 0.25)',
                                        flexShrink: 0,
                                      }}
                                    >
                                      <CheckCircle2 size={11} />
                                      <span>Terisi</span>
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontSize: '0.6875rem',
                                        fontWeight: 600,
                                        padding: '0.15rem 0.45rem',
                                        borderRadius: '9999px',
                                        backgroundColor: 'var(--surface-2)',
                                        color: 'var(--text-muted)',
                                        flexShrink: 0,
                                      }}
                                    >
                                      <span>Kosong</span>
                                    </span>
                                  )}
                                </div>

                                {/* Card Body: File & User Metadata */}
                                {hasData ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem' }}>
                                    {/* File Name */}
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        color: 'var(--text-primary)',
                                        fontWeight: 600,
                                        wordBreak: 'break-word',
                                      }}
                                    >
                                      <FileSpreadsheet size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                      <span title={record.original_filename} style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                        {record.original_filename}
                                      </span>
                                    </div>

                                    {/* Row Count */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                                      <Rows3 size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                      <span><strong>{record.row_count?.toLocaleString('id-ID')}</strong> baris data</span>
                                    </div>

                                    {/* Uploader Tracking */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                      <User size={12} style={{ flexShrink: 0 }} />
                                      <span title={`Diupload oleh: ${record.uploader_name}`}>
                                        Input: <strong>{record.uploader_name}</strong>
                                      </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                                      <Clock size={12} style={{ flexShrink: 0 }} />
                                      <span>
                                        {new Date(record.uploaded_at).toLocaleString('id-ID', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>

                                    {/* Updater Tracking (If updated) */}
                                    {record.updater_name && (
                                      <div
                                        style={{
                                          marginTop: '0.25rem',
                                          paddingTop: '0.25rem',
                                          borderTop: '1px dashed var(--border-subtle)',
                                          fontSize: '0.7rem',
                                          color: 'var(--accent-teal, #0d9488)',
                                        }}
                                      >
                                        Update: <strong>{record.updater_name}</strong> ({new Date(record.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })})
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ padding: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                    Belum ada file Excel diunggah untuk periode ini.
                                  </div>
                                )}
                              </div>

                              {/* Card Actions (Footer) */}
                              <div
                                style={{
                                  marginTop: '0.875rem',
                                  paddingTop: '0.625rem',
                                  borderTop: '1px solid var(--border-subtle)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                }}
                              >
                                {hasData ? (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      style={{
                                        flex: 1,
                                        padding: '0.35rem 0.5rem',
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.3rem',
                                        color: 'var(--primary)',
                                        borderColor: 'var(--primary-subtle)',
                                      }}
                                      onClick={() => openUpdateModal(targetDs, grp.month, grp.year, record)}
                                      title="Update / Re-upload file Excel pengganti"
                                    >
                                      <RefreshCw size={12} />
                                      <span>Update</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      style={{
                                        padding: '0.35rem 0.6rem',
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.25rem',
                                        color: 'var(--text-secondary)',
                                      }}
                                      onClick={() => openAuditModal(targetDs, grp.month, grp.year, record)}
                                      title="Lihat riwayat perubahan & audit log"
                                    >
                                      <History size={12} />
                                    </button>

                                    <button
                                      type="button"
                                      className="btn btn-danger"
                                      style={{
                                        padding: '0.35rem 0.6rem',
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.25rem',
                                      }}
                                      onClick={() => handleDelete(record)}
                                      disabled={deletingId === record.id}
                                      title="Hapus / Rollback batch data ini"
                                    >
                                      {deletingId === record.id ? (
                                        <Loader2 size={12} className="spin" />
                                      ) : (
                                        <Trash2 size={12} />
                                      )}
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{
                                      width: '100%',
                                      padding: '0.4rem 0.65rem',
                                      fontSize: '0.75rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '0.35rem',
                                      color: 'var(--primary)',
                                      fontWeight: 600,
                                      borderColor: 'rgba(59, 130, 246, 0.3)',
                                      backgroundColor: 'rgba(59, 130, 246, 0.05)',
                                    }}
                                    onClick={() => openUpdateModal(targetDs, grp.month, grp.year, null)}
                                    title="Input data file Excel untuk kategori ini"
                                  >
                                    <Plus size={13} />
                                    <span>Input Data</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Update / Upload Modal */}
      {modalConfig.isOpen && (
        <UpdateUploadModal
          isOpen={modalConfig.isOpen}
          targetDataset={modalConfig.targetDataset}
          targetMonth={modalConfig.targetMonth}
          targetYear={modalConfig.targetYear}
          existingBatch={modalConfig.existingBatch}
          datasets={datasets}
          columnRegistry={columnRegistry}
          onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Audit Log Modal */}
      {auditModalConfig.isOpen && (
        <AuditLogModal
          isOpen={auditModalConfig.isOpen}
          targetDataset={auditModalConfig.targetDataset}
          targetMonth={auditModalConfig.targetMonth}
          targetYear={auditModalConfig.targetYear}
          activeItem={auditModalConfig.activeItem}
          onClose={() => setAuditModalConfig((prev) => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* Dialog Modal: Buka Periode Bulan Baru */}
      {showAddMonthModal && (() => {
        const getMonthStatusInfo = (monthNum, yearNum) => {
          const key = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
          const group = monthlyGroups.find((g) => g.key === key);
          if (!group) return null;
          return {
            exists: true,
            uploadedCount: group.uploadedCount || 0,
            totalRows: group.totalRows || 0,
            isComplete: (group.uploadedCount || 0) >= 12,
          };
        };

        const currentSelectedStatus = getMonthStatusInfo(newMonthVal, newYearVal);

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAddMonthModal(false);
            }}
          >
            <div
              className="card"
              style={{
                width: '100%',
                maxWidth: '480px',
                padding: '1.5rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--border-color)',
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <Calendar size={20} color="var(--primary)" />
                  <span>Buka Periode Rekapitulasi Data</span>
                </h3>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem', borderRadius: '50%', minWidth: 'auto' }}
                  onClick={() => setShowAddMonthModal(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                Pilih periode bulan dan tahun yang ingin Anda kelola atau buka di halaman riwayat.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Pilih Bulan</label>
                  <select
                    className="select"
                    value={newMonthVal}
                    onChange={(e) => setNewMonthVal(Number(e.target.value))}
                  >
                    {MONTH_NAMES.slice(1).map((m, idx) => {
                      const mNum = idx + 1;
                      const status = getMonthStatusInfo(mNum, newYearVal);
                      let statusBadge = '';
                      if (status) {
                        statusBadge = ` (Sudah Ada • ${status.uploadedCount}/12)`;
                      }
                      return (
                        <option key={mNum} value={mNum}>
                          {m}{statusBadge}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Pilih Tahun</label>
                  <select
                    className="select"
                    value={newYearVal}
                    onChange={(e) => setNewYearVal(Number(e.target.value))}
                  >
                    {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Notice Banner */}
              {currentSelectedStatus ? (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.625rem',
                  }}
                >
                  <CheckCircle2 size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.8125rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      Periode {MONTH_NAMES[newMonthVal]} {newYearVal} Sudah Ada di Riwayat
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Saat ini sudah terisi <strong>{currentSelectedStatus.uploadedCount} dari 12 kategori</strong> ({currentSelectedStatus.totalRows.toLocaleString('id-ID')} baris). Mengklik tombol di bawah akan langsung menampilkan rincian data periode ini tanpa membuat data ganda.
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.625rem',
                  }}
                >
                  <Sparkles size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.8125rem' }}>
                    <div style={{ fontWeight: 700, color: '#16a34a' }}>
                      Periode Baru (Belum Ada Data)
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Slot untuk <strong>{MONTH_NAMES[newMonthVal]} {newYearVal}</strong> akan dibuat di riwayat sehingga Anda dapat langsung mengunggah file untuk 12 kategori.
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddMonthModal(false)}>
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => {
                    const key = `${newYearVal}-${String(newMonthVal).padStart(2, '0')}`;
                    setOpenedMonthKeys((prev) => new Set([...prev, key]));
                    setExpandedMonths((prev) => ({ ...prev, [key]: true }));
                    setShowAddMonthModal(false);
                  }}
                >
                  {currentSelectedStatus ? (
                    <>
                      <ChevronDown size={16} />
                      <span>Lihat Rincian {MONTH_NAMES[newMonthVal]} {newYearVal}</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Buat &amp; Buka Periode Baru</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
