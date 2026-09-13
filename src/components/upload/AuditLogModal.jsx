import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getAuditLogs } from '@/lib/services/dataService';
import {
  History,
  X,
  PlusCircle,
  RefreshCw,
  Trash2,
  FileSpreadsheet,
  Calendar,
  Layers,
  User,
  Clock,
  Rows3,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

const MONTH_NAMES = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function AuditLogModal({
  isOpen,
  onClose,
  targetDataset = null,
  targetMonth = null,
  targetYear = null,
  activeItem = null,
}) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const data = await getAuditLogs({
          uploadId: activeItem?.id || null,
          datasetId: targetDataset?.id || activeItem?.dataset_id || null,
          periodMonth: targetMonth || activeItem?.period_month || null,
          periodYear: targetYear || activeItem?.period_year || null,
          activeItem,
        });
        if (isMounted) {
          setLogs(data || []);
        }
      } catch (err) {
        console.warn('Gagal memuat log audit:', err.message);
        if (isMounted) setLogs([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchLogs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeItem, targetDataset, targetMonth, targetYear]);

  if (!isOpen) return null;

  const datasetTitle =
    targetDataset?.name ||
    activeItem?.datasets?.name ||
    'Kategori Karantina';

  const periodTitle =
    targetMonth && targetYear
      ? `${MONTH_NAMES[targetMonth]} ${targetYear}`
      : activeItem?.period_month && activeItem?.period_year
      ? `${MONTH_NAMES[activeItem.period_month]} ${activeItem.period_year}`
      : '';

  const renderActionBadge = (action) => {
    switch (action) {
      case 'create':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              color: '#16a34a',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            <PlusCircle size={12} />
            <span>Input Awal</span>
          </span>
        );
      case 'update':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(2, 132, 199, 0.12)',
              color: '#0284c7',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            <RefreshCw size={12} />
            <span>Update Data</span>
          </span>
        );
      case 'delete':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#dc2626',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            <Trash2 size={12} />
            <span>Hapus / Rollback</span>
          </span>
        );
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--surface-2)',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {action}
          </span>
        );
    }
  };

  const modalNode = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          backgroundColor: 'var(--surface-0)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--surface-1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(2, 132, 199, 0.12)',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <History size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Riwayat Perubahan &amp; Audit Log
              </h3>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                  marginTop: '0.15rem',
                }}
              >
                <span><strong>{datasetTitle}</strong></span>
                {periodTitle && (
                  <>
                    <span>•</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Periode {periodTitle}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.4rem', borderRadius: 'var(--radius-sm)' }}
            onClick={onClose}
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {isLoading ? (
            <div
              style={{
                padding: '3rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                color: 'var(--text-secondary)',
              }}
            >
              <Loader2 size={32} className="spin" style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.875rem' }}>Memuat riwayat perubahan...</span>
            </div>
          ) : logs.length === 0 ? (
            <div
              style={{
                padding: '3rem 1.5rem',
                textAlign: 'center',
                backgroundColor: 'var(--surface-1)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-color)',
                color: 'var(--text-secondary)',
              }}
            >
              <History size={40} style={{ opacity: 0.35, marginBottom: '0.75rem', marginInline: 'auto' }} />
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                Belum Ada Catatan Riwayat
              </div>
              <p style={{ fontSize: '0.8125rem', maxWidth: '420px', margin: '0.35rem auto 0 auto' }}>
                Setiap kali data diunggah, diperbarui, atau dihapus, log aktivitas petugas akan tercatat secara otomatis di sini.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.8125rem',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: 'var(--surface-2)',
                      borderBottom: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <th style={{ padding: '0.75rem 1rem', width: '50px', textAlign: 'center' }}>No</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Aksi</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Petugas / Pengguna</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Waktu Aktivitas</th>
                    <th style={{ padding: '0.75rem 1rem' }}>File Excel</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Jumlah Data</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <tr
                        key={log.id || idx}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: isLatest ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {/* No */}
                        <td
                          style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'center',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                          }}
                        >
                          {logs.length - idx}
                        </td>

                        {/* Aksi Badge */}
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {renderActionBadge(log.action)}
                            {isLatest && (
                              <span
                                style={{
                                  fontSize: '0.6875rem',
                                  fontWeight: 700,
                                  color: 'var(--primary)',
                                  backgroundColor: 'var(--primary-subtle)',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                }}
                              >
                                Terkini
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Petugas / User */}
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <User size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {log.user_name || 'Petugas'}
                              </div>
                              {log.user_role && (
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                  Role: {log.user_role}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Waktu */}
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                            <Clock size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <span>
                              {log.performed_at
                                ? new Date(log.performed_at).toLocaleString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </span>
                          </div>
                        </td>

                        {/* File Excel */}
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {log.filename ? (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                color: 'var(--text-primary)',
                                fontWeight: 500,
                                maxWidth: '200px',
                              }}
                              title={log.filename}
                            >
                              <FileSpreadsheet size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {log.filename}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>

                        {/* Baris Data */}
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {log.row_count != null ? (
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {Number(log.row_count).toLocaleString('id-ID')} baris
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>

                        {/* Catatan / Notes */}
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                          <span style={{ fontStyle: log.notes ? 'normal' : 'italic' }}>
                            {log.notes || '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--surface-1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={14} style={{ color: '#16a34a' }} />
            <span>Riwayat tercatat secara otomatis untuk transparansi &amp; akuntabilitas data.</span>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.45rem 1.25rem', fontSize: '0.8125rem' }}
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
