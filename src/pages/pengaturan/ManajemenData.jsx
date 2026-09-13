import { useState, useEffect } from 'react';
import UploadHistoryGrid from '@/components/upload/UploadHistoryGrid';
import { useDialog } from '@/contexts/DialogContext';
import { useUser } from '@/contexts/UserContext';
import { getAllDatasets } from '@/lib/services/datasetService';
import { getColumnRegistry } from '@/lib/services/columnService';
import {
  getUploadHistory,
  deleteUploadBatch,
} from '@/lib/services/dataService';
import { Layers } from 'lucide-react';

export default function ManajemenData() {
  const { showLoading, hideLoading, showAlert } = useDialog();
  const { user } = useUser();
  const [datasets, setDatasets] = useState([]);
  const [columnRegistry, setColumnRegistry] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoadingHistory(true);
    try {
      const [ds, cols, hist] = await Promise.all([
        getAllDatasets(),
        getColumnRegistry(),
        getUploadHistory(),
      ]);
      setDatasets(ds);
      setColumnRegistry(cols);
      setHistoryList(hist);
    } catch (err) {
      console.warn('Load initial data error:', err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDeleteBatch = async (uploadId, item = null) => {
    showLoading('Menghapus data batch...');
    try {
      await deleteUploadBatch(uploadId, {
        datasetId: item?.dataset_id || item?.datasets?.id || null,
        periodMonth: item?.period_month || null,
        periodYear: item?.period_year || null,
        userId: user?.id || null,
        filename: item?.original_filename || '',
        rowCount: item?.row_count || 0,
      });
      const updatedHist = await getUploadHistory();
      setHistoryList(updatedHist);
      hideLoading();
      showAlert({
        title: 'Batch Berhasil Dihapus',
        message: 'Data batch dan seluruh rekaman transaksi berhasil dihapus dari database.',
        type: 'success',
      });
    } catch (err) {
      hideLoading();
      showAlert({
        title: 'Gagal Menghapus',
        message: `Gagal menghapus batch data: ${err.message}`,
        type: 'error',
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Title Banner */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', backgroundColor: 'var(--surface-0)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Riwayat &amp; Manajemen Data Excel
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.2rem 0 0 0' }}>
              Pusat pengelolaan 12 kategori data master karantina per bulan, pembukaan periode baru, input transaksi, re-upload/update file, serta pelacakan pengunggah data.
            </p>
          </div>
        </div>
      </div>

      {/* Main Unified Grid Component */}
      <UploadHistoryGrid
        historyList={historyList}
        datasets={datasets}
        columnRegistry={columnRegistry}
        onDeleteBatch={handleDeleteBatch}
        onRefresh={loadInitialData}
        isLoading={isLoadingHistory}
      />
    </div>
  );
}
