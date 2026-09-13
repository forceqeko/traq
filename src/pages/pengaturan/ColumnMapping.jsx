import { useState, useEffect } from 'react';
import { getColumnRegistry, registerColumns } from '@/lib/services/columnService';
import { useDialog } from '@/contexts/DialogContext';
import { Plus, Save, Check, RefreshCw, Search, Database } from 'lucide-react';

export default function ColumnMapping() {
  const { showLoading, hideLoading, showAlert } = useDialog();
  const [columns, setColumns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadColumns();
  }, []);

  const loadColumns = async () => {
    setIsLoading(true);
    const data = await getColumnRegistry();
    setColumns(data || []);
    setIsLoading(false);
  };

  const handleFieldChange = (originalIndex, field, value) => {
    const updated = [...columns];
    updated[originalIndex][field] = value;
    setColumns(updated);
  };

  const handleAddNewColumn = () => {
    const newColName = `Kolom_Baru_${columns.length + 1}`;
    setColumns((prev) => [
      {
        column_name: newColName,
        display_name: newColName,
        data_type: 'text',
        is_primary: false,
      },
      ...prev,
    ]);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    showLoading('Menyimpan konfigurasi pemetaan kolom...');
    try {
      await registerColumns(columns);
      hideLoading();
      showAlert({
        title: 'Pemetaan Kolom Tersimpan',
        message: 'Registry pemetaan kolom berhasil disimpan ke database.',
        type: 'success',
      });
    } catch (err) {
      hideLoading();
      showAlert({
        title: 'Gagal Menyimpan',
        message: `Terjadi kesalahan saat menyimpan: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredColumns = columns.map((col, idx) => ({ ...col, _originalIndex: idx })).filter((col) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      col.column_name.toLowerCase().includes(q) ||
      (col.display_name && col.display_name.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Column Mapping Registry</h2>
            <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
              {columns.length} Kolom Terdeteksi Otomatis
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Daftar seluruh kolom Excel yang otomatis tersinkronisasi saat upload. Display name default mengikuti nama asli kolom.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={handleAddNewColumn}>
            <Plus size={16} />
            <span>Tambah Kolom Manual</span>
          </button>
          <button className="btn btn-primary" onClick={handleSaveChanges} disabled={isSaving}>
            <Save size={16} />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="card" style={{ backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-success)', fontWeight: 600 }}>
            <Check size={18} />
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {/* Table of Column Registry */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '360px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: '2.25rem', fontSize: '0.8125rem' }}
                placeholder="Cari nama kolom atau display label..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <button className="btn btn-secondary" style={{ fontSize: '0.75rem' }} onClick={loadColumns}>
            <RefreshCw size={14} />
            <span>Sinkronisasi Ulang</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
          <table className="previewTable" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ backgroundColor: 'var(--surface-2)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 1rem', width: '50px' }}>No</th>
                <th style={{ padding: '0.75rem 1rem' }}>Nama Kolom Excel Asli (Key)</th>
                <th style={{ padding: '0.75rem 1rem' }}>Nama Tampilan (Display Label)</th>
                <th style={{ padding: '0.75rem 1rem', width: '160px' }}>Tipe Data</th>
                <th style={{ padding: '0.75rem 1rem', width: '180px' }}>Kategori Kolom</th>
              </tr>
            </thead>
            <tbody>
              {filteredColumns.map((col, filteredIdx) => (
                <tr key={col.id || col.column_name || filteredIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.625rem 1rem', color: 'var(--text-muted)' }}>
                    {filteredIdx + 1}
                  </td>
                  <td style={{ padding: '0.625rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {col.column_name}
                  </td>
                  <td style={{ padding: '0.625rem 1rem' }}>
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: '0.8125rem', padding: '0.375rem 0.625rem', width: '100%' }}
                      value={col.display_name || col.column_name}
                      onChange={(e) => handleFieldChange(col._originalIndex, 'display_name', e.target.value)}
                    />
                  </td>
                  <td style={{ padding: '0.625rem 1rem' }}>
                    <select
                      className="select"
                      style={{ fontSize: '0.8125rem', padding: '0.375rem 0.625rem' }}
                      value={col.data_type || 'text'}
                      onChange={(e) => handleFieldChange(col._originalIndex, 'data_type', e.target.value)}
                    >
                      <option value="text">Teks (String)</option>
                      <option value="number">Angka (Numeric)</option>
                      <option value="date">Tanggal (Date)</option>
                      <option value="currency">Mata Uang (Currency)</option>
                    </select>
                  </td>
                  <td style={{ padding: '0.625rem 1rem' }}>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: col.is_primary ? 'rgba(59, 130, 246, 0.2)' : 'var(--surface-2)',
                        color: col.is_primary ? 'var(--primary)' : 'var(--text-muted)',
                      }}
                    >
                      {col.is_primary ? 'Kolom Utama' : 'Kolom Dinamis'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
