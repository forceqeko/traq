import { useState } from 'react';
import { createPortal } from 'react-dom';
import FileUploader from '@/components/upload/FileUploader';
import DataPreview from '@/components/upload/DataPreview';
import ColumnMapper from '@/components/upload/ColumnMapper';
import { useDialog } from '@/contexts/DialogContext';
import { useUser } from '@/contexts/UserContext';
import { parseExcelFile } from '@/lib/excel/parser';
import { validateExcelData } from '@/lib/excel/validator';
import { uploadDataBatch, updateDataBatch } from '@/lib/services/dataService';
import {
  X,
  RefreshCw,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  Layers,
  User,
  History,
} from 'lucide-react';

export default function UpdateUploadModal({
  isOpen,
  onClose,
  targetDataset = null,
  targetMonth = null,
  targetYear = null,
  existingBatch = null,
  datasets = [],
  columnRegistry = [],
  onSuccess,
}) {
  const { showLoading, hideLoading, showAlert } = useDialog();
  const { user, profile } = useUser();

  const currentYear = new Date().getFullYear();
  const [selectedDatasetId, setSelectedDatasetId] = useState(
    targetDataset?.id || (datasets.length > 0 ? datasets[0].id : '')
  );
  const [selectedMonth, setSelectedMonth] = useState(
    targetMonth || new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState(
    targetYear || currentYear
  );

  const [activeExistingBatch, setActiveExistingBatch] = useState(existingBatch);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showMapperModal, setShowMapperModal] = useState(false);

  const isLocked = Boolean(targetDataset);

  const months = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const monthOptions = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];

  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  const currentDataset = isLocked
    ? targetDataset
    : datasets.find((d) => d.id === selectedDatasetId) || datasets[0];

  if (!isOpen) return null;

  const handleDatasetOrPeriodChange = async (newDsId, newMo, newYr) => {
    setSelectedDatasetId(newDsId);
    setSelectedMonth(newMo);
    setSelectedYear(newYr);
    setParsedData(null);
    setSelectedFile(null);
    try {
      const existing = await checkExistingData(newDsId, newMo, newYr);
      setActiveExistingBatch(existing);
    } catch {
      setActiveExistingBatch(null);
    }
  };

  const handleFileSelected = async (file) => {
    setSelectedFile(file);
    setIsParsing(true);
    setErrorMessage('');

    try {
      const parsed = await parseExcelFile(file);
      setParsedData(parsed);

      const validation = validateExcelData(parsed.headers, parsed.rows, columnRegistry);
      setValidationResult(validation);

      if (validation.newColumns.length > 0) {
        setShowMapperModal(true);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Gagal memproses file Excel.');
      setParsedData(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!parsedData || !currentDataset) return;

    setIsUploading(true);
    setErrorMessage('');
    const effectiveBatch = isLocked ? existingBatch : activeExistingBatch;
    showLoading(effectiveBatch ? 'Memperbarui data transaksi...' : 'Menyimpan data transaksi...');

    try {
      const activeUserId = user?.id || null;
      let result;

      if (effectiveBatch?.id) {
        result = await updateDataBatch({
          uploadId: effectiveBatch.id,
          datasetId: currentDataset.id,
          periodMonth: isLocked ? targetMonth : selectedMonth,
          periodYear: isLocked ? targetYear : selectedYear,
          filename: selectedFile.name,
          rows: parsedData.rows,
          headers: parsedData.headers,
          userId: activeUserId,
          originalUploadedBy: effectiveBatch.uploaded_by,
          originalUploadedAt: effectiveBatch.uploaded_at,
        });
      } else {
        result = await uploadDataBatch({
          datasetId: currentDataset.id,
          periodMonth: isLocked ? targetMonth : selectedMonth,
          periodYear: isLocked ? targetYear : selectedYear,
          filename: selectedFile.name,
          rows: parsedData.rows,
          headers: parsedData.headers,
          userId: activeUserId,
        });
      }

      hideLoading();
      const targetMoName = months[isLocked ? targetMonth : selectedMonth];
      const targetYrVal = isLocked ? targetYear : selectedYear;
      showAlert({
        title: effectiveBatch ? 'Data Berhasil Diperbarui' : 'Data Berhasil Disimpan',
        message: `Berhasil memproses ${parsedData.rowCount.toLocaleString('id-ID')} baris data untuk ${currentDataset.name} (Periode ${targetMoName} ${targetYrVal}).`,
        type: 'success',
      });

      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      hideLoading();
      setErrorMessage(`Gagal menyimpan data: ${err.message}`);
      showAlert({
        title: 'Gagal Menyimpan',
        message: `Terjadi kesalahan saat menyimpan data: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return createPortal(
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
        if (e.target === e.currentTarget && !isUploading) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-color)',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--surface-0)',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileSpreadsheet size={20} color="var(--primary)" />
              <span>{existingBatch ? 'Update File Excel Transaksi' : 'Input Data Excel Baru'}</span>
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              {existingBatch
                ? 'Unggah file Excel pengganti untuk memperbarui data rekapitulasi periode ini.'
                : 'Unggah file Excel untuk mengisi data rekapitulasi kategori yang belum ada.'}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.4rem', borderRadius: '50%', minWidth: 'auto' }}
            onClick={onClose}
            disabled={isUploading}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            backgroundColor: 'var(--surface-1)',
          }}
        >
          {/* Target Metadata Banner / Selectors */}
          {isLocked ? (
            <div
              style={{
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-0)',
                border: '1px solid var(--border-color)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--primary-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                  }}
                >
                  <Layers size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Kategori</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {targetDataset.name}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent-teal-subtle, rgba(20, 184, 166, 0.1))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-teal, #14b8a6)',
                  }}
                >
                  <Calendar size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Periode Rekapitulasi</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {months[targetMonth]} {targetYear}
                  </div>
                </div>
              </div>

              {existingBatch && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(234, 179, 8, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ca8a04',
                    }}
                  >
                    <History size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>File Lama Saat Ini</div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {existingBatch.original_filename} ({existingBatch.row_count?.toLocaleString('id-ID')} baris)
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface-0)',
                border: '1px solid var(--border-color)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Pilih Kategori Data</label>
                <select
                  className="select"
                  value={selectedDatasetId}
                  onChange={(e) => handleDatasetOrPeriodChange(e.target.value, selectedMonth, selectedYear)}
                >
                  {datasets.map((ds) => (
                    <option key={ds.id} value={ds.id}>{ds.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Pilih Bulan</label>
                <select
                  className="select"
                  value={selectedMonth}
                  onChange={(e) => handleDatasetOrPeriodChange(selectedDatasetId, Number(e.target.value), selectedYear)}
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Pilih Tahun</label>
                <select
                  className="select"
                  value={selectedYear}
                  onChange={(e) => handleDatasetOrPeriodChange(selectedDatasetId, selectedMonth, Number(e.target.value))}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="card" style={{ border: '1px solid var(--status-danger)', backgroundColor: 'var(--status-danger-bg)', padding: '0.75rem 1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-danger)', fontWeight: 600, fontSize: '0.875rem' }}>
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Step: File Upload */}
          {!parsedData ? (
            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--surface-0)' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                {existingBatch ? 'Pilih File Excel Baru Pengganti' : 'Pilih File Excel untuk Diunggah'}
              </h3>
              <FileUploader onFileSelected={handleFileSelected} isLoading={isParsing} />
            </div>
          ) : (
            <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--surface-0)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  Pratinjau Data File Baru
                </h3>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  onClick={() => {
                    setParsedData(null);
                    setSelectedFile(null);
                  }}
                >
                  <RefreshCw size={13} />
                  <span>Ganti File</span>
                </button>
              </div>

              {validationResult && (
                <DataPreview
                  parsedData={parsedData}
                  validationResult={validationResult}
                  selectedDatasetName={targetDataset.name}
                  periodMonthName={months[targetMonth]}
                  selectedYear={targetYear}
                  existingDataBatch={existingBatch}
                />
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--surface-0)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <User size={14} />
            <span>Petugas Aktif: <strong>{profile?.full_name || user?.email || 'Admin Utama'}</strong></span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isUploading}
              style={{ fontSize: '0.875rem' }}
            >
              Batal
            </button>

            {parsedData && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isUploading}
                style={{
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1.25rem',
                }}
              >
                {isUploading ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <Check size={16} />
                    <span>{existingBatch ? 'Konfirmasi Update Data' : 'Simpan Data Baru'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {showMapperModal && validationResult?.newColumns?.length > 0 && (
        <ColumnMapper
          newColumns={validationResult.newColumns}
          registeredColumns={columnRegistry}
          onConfirmMapping={() => setShowMapperModal(false)}
          onClose={() => setShowMapperModal(false)}
        />
      )}
    </div>,
    document.body
  );
}
