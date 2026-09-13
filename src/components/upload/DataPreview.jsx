import styles from './upload.module.css';
import {
  FileSpreadsheet,
  Rows3,
  Columns3,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

export default function DataPreview({
  parsedData,
  validationResult,
  selectedDatasetName,
  periodMonthName,
  selectedYear,
  existingDataBatch,
}) {
  if (!parsedData) return null;

  const { headers, rows, rowCount, columnCount } = parsedData;
  const { warnings, errors, columnMeta } = validationResult;
  const sampleRows = rows.slice(0, 8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Alert Replace Warning */}
      {existingDataBatch && (
        <div className={`${styles.alertBox} ${styles.alertWarning}`}>
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>PERHATIAN (REPLACE STRATEGY):</strong> Data untuk <strong>{selectedDatasetName}</strong> periode <strong>{periodMonthName} {selectedYear}</strong> sudah pernah diunggah sebelumnya (file: <em>{existingDataBatch.original_filename}</em>, {existingDataBatch.row_count} baris).
            <br />
            Menyimpan data ini akan <u>menimpa (replace)</u> seluruh data periode tersebut secara bersih.
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className={`${styles.alertBox} ${styles.alertWarning}`}>
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Peringatan Validasi:</strong>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
              {warnings.map((w, index) => (
                <li key={index}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Stat summary cards */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <FileSpreadsheet size={24} style={{ color: 'var(--primary)' }} />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Kategori</div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{selectedDatasetName}</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <Rows3 size={24} style={{ color: 'var(--accent-teal)' }} />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Jumlah Baris</div>
            <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{rowCount.toLocaleString('id-ID')} Baris</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <Columns3 size={24} style={{ color: 'var(--accent-amber)' }} />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Jumlah Kolom</div>
            <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{columnCount} Kolom</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <CheckCircle2 size={24} style={{ color: 'var(--status-success)' }} />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status Validasi</div>
            <div style={{ fontWeight: 600, color: 'var(--status-success)', fontSize: '0.875rem' }}>
              Siap Disimpan
            </div>
          </div>
        </div>
      </div>

      {/* Detected Column Badges */}
      <div>
        <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
          Kolom yang Terdeteksi dalam Excel:
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {columnMeta.map((col, idx) => (
            <span
              key={idx}
              className="badge"
              style={{
                backgroundColor: col.is_new ? 'rgba(245, 158, 11, 0.15)' : 'var(--surface-2)',
                color: col.is_new ? 'var(--accent-amber)' : 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {col.column_name} ({col.data_type})
              {col.is_new && ' [Baru]'}
            </span>
          ))}
        </div>
      </div>

      {/* Data Preview Table */}
      <div>
        <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
          Pratinjau Data (8 Baris Pertama):
        </h4>
        <div className={styles.tableWrapper}>
          <table className={styles.previewTable}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                {headers.map((h, idx) => (
                  <th key={idx}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td style={{ color: 'var(--text-muted)' }}>{rowIdx + 1}</td>
                  {headers.map((h, colIdx) => (
                    <td key={colIdx}>{String(row[h] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
