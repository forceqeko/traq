import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link2, Check, X } from 'lucide-react';

export default function ColumnMapper({
  newColumns = [],
  registeredColumns = [],
  onConfirmMapping,
  onClose,
}) {
  const [mappings, setMappings] = useState(() => {
    const initial = {};
    newColumns.forEach((col) => {
      initial[col] = 'NEW_COLUMN';
    });
    return initial;
  });

  const handleSelectChange = (newColName, value) => {
    setMappings((prev) => ({
      ...prev,
      [newColName]: value,
    }));
  };

  const handleSave = () => {
    onConfirmMapping(mappings);
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.5rem',
        margin: 0,
        boxSizing: 'border-box',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--surface-1)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div className="card-header" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link2 size={20} style={{ color: 'var(--accent-amber)' }} />
            <h3 className="card-title">Pemetaan Kolom Baru (Column Mapper)</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
          Sistem mendeteksi kolom yang belum pernah terdaftar. Anda dapat me-mapping kolom ini ke kolom yang sudah ada atau mendaftarkannya sebagai kolom baru.
        </p>

        {/* List of New Columns to Map */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
          {newColumns.map((newCol, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'var(--surface-0)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.875rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent-amber)' }}>
                Kolom Excel: "{newCol}"
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dipetakan Ke:</span>
                <select
                  className="select"
                  style={{ flex: 1, fontSize: '0.8125rem', padding: '0.375rem 0.625rem' }}
                  value={mappings[newCol] || 'NEW_COLUMN'}
                  onChange={(e) => handleSelectChange(newCol, e.target.value)}
                >
                  <option value="NEW_COLUMN">+ Daftarkan sebagai Kolom Baru ("{newCol}")</option>
                  <optgroup label="Sama dengan Kolom Terdaftar:">
                    {registeredColumns.map((reg) => (
                      <option key={reg.column_name} value={reg.column_name}>
                        {reg.display_name} ({reg.column_name})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Batal
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={16} />
            <span>Simpan Pemetaan</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
