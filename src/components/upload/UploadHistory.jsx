import { useState } from 'react';
import styles from './upload.module.css';
import { useDialog } from '@/contexts/DialogContext';
import { Trash2, FileSpreadsheet, Calendar, Rows3, Loader2 } from 'lucide-react';

export default function UploadHistory({ historyList = [], onDeleteBatch, isLoading = false }) {
  const { showConfirm } = useDialog();
  const [deletingId, setDeletingId] = useState(null);

  const months = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const handleDelete = async (item) => {
    const confirmed = await showConfirm({
      title: 'Hapus Batch Data?',
      message: `Apakah Anda yakin ingin menghapus data batch "${item.datasets?.name || 'Dataset'}" periode ${months[item.period_month]} ${item.period_year} (${item.row_count.toLocaleString('id-ID')} baris)? Data akan terhapus secara permanen dari database.`,
      type: 'confirm_delete',
      confirmText: 'Ya, Hapus Data',
      cancelText: 'Batal',
    });

    if (confirmed) {
      setDeletingId(item.id);
      await onDeleteBatch(item.id);
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={32} className="spin" style={{ marginBottom: '0.5rem' }} />
        <p>Memuat riwayat pengunggah data Excel...</p>
      </div>
    );
  }

  if (!historyList || historyList.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
        <FileSpreadsheet size={48} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          Belum Ada Riwayat Upload Data
        </h3>
        <p style={{ fontSize: '0.8125rem' }}>
          Data Excel yang telah Anda unggah per periode akan tercatat di sini beserta fitur rollback hapus batch.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.previewTable}>
        <thead>
          <tr>
            <th>Kategori Data</th>
            <th>Periode Bulanan</th>
            <th>Nama File Asli</th>
            <th>Jumlah Baris</th>
            <th>Tanggal Upload</th>
            <th style={{ textAlign: 'right' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {historyList.map((item) => (
            <tr key={item.id}>
              <td>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item.datasets?.name || 'Dataset'}
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--accent-teal)', fontWeight: 500 }}>
                  <Calendar size={14} />
                  <span>{months[item.period_month]} {item.period_year}</span>
                </div>
              </td>
              <td style={{ color: 'var(--text-secondary)' }}>
                {item.original_filename}
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600 }}>
                  <Rows3 size={14} style={{ color: 'var(--primary)' }} />
                  <span>{item.row_count?.toLocaleString('id-ID')} baris</span>
                </div>
              </td>
              <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {new Date(item.uploaded_at).toLocaleString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td style={{ textAlign: 'right' }}>
                <button
                  className="btn btn-danger"
                  style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  title="Hapus / Rollback batch data ini"
                >
                  {deletingId === item.id ? (
                    <Loader2 size={14} className="spin" />
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Rollback</span>
                    </>
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
