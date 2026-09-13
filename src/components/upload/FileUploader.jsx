import { useState, useRef } from 'react';
import styles from './upload.module.css';
import { useDialog } from '@/contexts/DialogContext';
import { UploadCloud, FileSpreadsheet, Loader2 } from 'lucide-react';

export default function FileUploader({ onFileSelected, isLoading = false }) {
  const { showAlert } = useDialog();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcess(e.target.files[0]);
    }
  };

  const validateAndProcess = (file) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      showAlert({
        title: 'Format Tidak Didukung',
        message: 'Format file tidak didukung! Harap unggah file Excel (.xlsx, .xls) atau CSV.',
        type: 'warning',
      });
      return;
    }
    onFileSelected(file);
  };

  return (
    <div
      className={`${styles.dropZone} ${isDragOver ? styles.active : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        style={{ display: 'none' }}
      />

      <div className={styles.dropIcon}>
        {isLoading ? (
          <Loader2 size={28} className="spin" />
        ) : (
          <UploadCloud size={28} />
        )}
      </div>

      <div>
        <h3 className={styles.dropTitle}>
          {isLoading ? 'Membaca & Menganalisis Data Excel...' : 'Tarik & Lepas File Excel di Sini'}
        </h3>
        <p className={styles.dropSub}>
          Atau klik untuk memilih file dari komputer Anda (Format .xlsx, .xls, .csv)
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        <FileSpreadsheet size={14} />
        <span>Dukungan file berukuran ribuan baris dengan pengolahan in-memory instan</span>
      </div>
    </div>
  );
}
