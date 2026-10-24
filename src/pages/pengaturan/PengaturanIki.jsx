import { useState, useEffect, useRef } from 'react';
import AdminGuard from '@/components/auth/AdminGuard';
import { getIkiList, createIki, updateIki, deleteIki, getAvailableSendersForIki } from '@/lib/services/ikiService';
import { useDialog } from '@/contexts/DialogContext';
import styles from './PengaturanIki.module.css';
import { Plus, Search, Edit2, Trash2, Check, AlertCircle, X, RefreshCw } from 'lucide-react';

export default function PengaturanIki() {
  const { showConfirm, showLoading, hideLoading } = useDialog();

  const [ikiList, setIkiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Senders for autocomplete
  const [availableSenders, setAvailableSenders] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formNama, setFormNama] = useState('');
  const [formAlamat, setFormAlamat] = useState('');
  const [formKapasitas, setFormKapasitas] = useState('');
  const [formTanggalSertifikasi, setFormTanggalSertifikasi] = useState('');
  const [formLamaIki, setFormLamaIki] = useState('1 Tahun');
  const [submitting, setSubmitting] = useState(false);

  const autocompleteRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showModal) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, senders] = await Promise.all([
        getIkiList(),
        getAvailableSendersForIki(),
      ]);
      setIkiList(list);
      setAvailableSenders(senders);
    } catch {
      setErrorMsg('Gagal memuat daftar IKI.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormNama('');
    setFormAlamat('');
    setFormKapasitas('');
    setFormTanggalSertifikasi(new Date().toISOString().split('T')[0]);
    setFormLamaIki('1 Tahun');
    setShowSuggestions(false);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setFormNama(item.nama_perusahaan || '');
    setFormAlamat(item.alamat_perusahaan || '');
    setFormKapasitas(item.kapasitas_iki || '');
    setFormTanggalSertifikasi(item.tanggal_sertifikasi || new Date().toISOString().split('T')[0]);
    setFormLamaIki(item.lama_iki || '1 Tahun');
    setShowSuggestions(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setShowSuggestions(false);
  };

  // Autocomplete selection
  const handleSelectSender = (sender) => {
    setFormNama(sender.namaPerusahaan);
    if (sender.alamatPerusahaan) {
      setFormAlamat(sender.alamatPerusahaan);
    }
    setShowSuggestions(false);
  };

  // Filter autocomplete recommendations
  const filteredSuggestions = availableSenders.filter((s) => {
    if (!formNama) return false;
    return s.namaPerusahaan.toLowerCase().includes(formNama.toLowerCase());
  }).slice(0, 8);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formNama.trim()) {
      setErrorMsg('Nama Perusahaan wajib diisi.');
      return;
    }

    setSubmitting(true);
    showLoading(editingId ? 'Menyimpan perubahan IKI...' : 'Mendaftarkan IKI baru...');

    const payload = {
      nama_perusahaan: formNama.trim(),
      alamat_perusahaan: formAlamat.trim(),
      kapasitas_iki: Number(formKapasitas) || 0,
      tanggal_sertifikasi: formTanggalSertifikasi || new Date().toISOString().split('T')[0],
      lama_iki: formLamaIki.trim() || '1 Tahun',
    };

    try {
      if (editingId) {
        await updateIki(editingId, payload);
        setSuccessMsg(`Data IKI "${payload.nama_perusahaan}" berhasil diperbarui.`);
      } else {
        await createIki(payload);
        setSuccessMsg(`IKI baru "${payload.nama_perusahaan}" berhasil didaftarkan.`);
      }

      hideLoading();
      handleCloseModal();
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      hideLoading();
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan data IKI.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item) => {
    showConfirm({
      title: 'Hapus Data IKI',
      message: `Apakah Anda yakin ingin menghapus "${item.nama_perusahaan}" dari daftar IKI? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Ya, Hapus',
      cancelLabel: 'Batal',
      onConfirm: async () => {
        showLoading('Menghapus data IKI...');
        try {
          await deleteIki(item.id);
          hideLoading();
          setSuccessMsg(`Data IKI "${item.nama_perusahaan}" berhasil dihapus.`);
          loadData();
          setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err) {
          hideLoading();
          setErrorMsg(err?.message || 'Gagal menghapus data IKI.');
        }
      },
    });
  };

  // Filtered rows for table search
  const filteredIkiList = ikiList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.nama_perusahaan && item.nama_perusahaan.toLowerCase().includes(q)) ||
      (item.alamat_perusahaan && item.alamat_perusahaan.toLowerCase().includes(q)) ||
      (item.lama_iki && item.lama_iki.toLowerCase().includes(q))
    );
  });

  return (
    <AdminGuard>
      <div className={styles.container}>
        {/* Header Card */}
        <div className={`card ${styles.headerCard}`}>
          <div>
            <h2 className={styles.headerTitle}>Pengaturan Instalasi Karantina Ikan (IKI)</h2>
            <p className={styles.headerSubtitle}>
              Kelola master data perusahaan berstatus IKI, kapasitas operasional (Ekor), dan masa berlaku sertifikasi
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>Tambah IKI Baru</span>
          </button>
        </div>

        {/* Notifikasi Sukses */}
        {successMsg && (
          <div className="card" style={{ backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-success)', fontWeight: 600 }}>
              <Check size={18} />
              <span>{successMsg}</span>
            </div>
          </div>
        )}

        {/* Notifikasi Error */}
        {errorMsg && (
          <div className="card" style={{ backgroundColor: 'var(--status-danger-bg)', border: '1px solid var(--status-danger)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-danger)', fontWeight: 600 }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Tabel Daftar IKI */}
        <div className="card">
          <div className={styles.toolbar}>
            <div className={styles.searchWrapper}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Cari nama perusahaan atau alamat IKI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem' }}
              onClick={loadData}
              disabled={loading}
              title="Muat ulang data IKI"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Muat Ulang</span>
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '48px', textAlign: 'center' }}>No</th>
                  <th>Nama Perusahaan</th>
                  <th>Alamat Perusahaan</th>
                  <th style={{ textAlign: 'right' }}>Kapasitas IKI (Ekor)</th>
                  <th style={{ textAlign: 'center' }}>Tanggal Sertifikasi IKI</th>
                  <th style={{ textAlign: 'center' }}>Lama IKI</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredIkiList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyState}>
                      {searchQuery ? 'Tidak ada data IKI yang cocok dengan pencarian.' : 'Belum ada data IKI terdaftar.'}
                    </td>
                  </tr>
                ) : (
                  filteredIkiList.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{item.nama_perusahaan}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{item.alamat_perusahaan || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {Number(item.kapasitas_iki || 0).toLocaleString('id-ID')}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {item.tanggal_sertifikasi || '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                          {item.lama_iki || '1 Tahun'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionCell}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Data IKI"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            onClick={() => handleDelete(item)}
                            title="Hapus IKI"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Tambah / Edit IKI */}
        {showModal && (
          <div className={styles.modalOverlay} onClick={handleCloseModal}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  {editingId ? 'Edit Data IKI' : 'Tambah IKI Baru'}
                </h3>
                <button type="button" className={styles.closeBtn} onClick={handleCloseModal}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Nama Perusahaan dengan Autocomplete */}
                <div className={styles.formGroup} ref={autocompleteRef}>
                  <label className={styles.label}>Nama Perusahaan *</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Ketik atau cari nama perusahaan..."
                    value={formNama}
                    onChange={(e) => {
                      setFormNama(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    required
                  />
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <ul className={styles.suggestionsList}>
                      {filteredSuggestions.map((sender, idx) => (
                        <li
                          key={idx}
                          className={styles.suggestionItem}
                          onClick={() => handleSelectSender(sender)}
                        >
                          <div style={{ fontWeight: 600 }}>{sender.namaPerusahaan}</div>
                          {sender.alamatPerusahaan && (
                            <div className={styles.suggestionMeta}>{sender.alamatPerusahaan}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', marginTop: '0.25rem', display: 'block' }}>
                    Pilih dari daftar pengirim master data agar alamat terisi otomatis
                  </small>
                </div>

                {/* Alamat Perusahaan */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Alamat Perusahaan</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Alamat lengkap perusahaan IKI..."
                    value={formAlamat}
                    onChange={(e) => setFormAlamat(e.target.value)}
                  />
                </div>

                {/* Kapasitas IKI (Ekor) */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Kapasitas IKI (Ekor) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={styles.input}
                    placeholder="Contoh: 50000"
                    value={formKapasitas}
                    onChange={(e) => setFormKapasitas(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {/* Tanggal Sertifikasi IKI */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Tanggal Sertifikasi IKI</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={formTanggalSertifikasi}
                      onChange={(e) => setFormTanggalSertifikasi(e.target.value)}
                    />
                  </div>

                  {/* Lama IKI */}
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Lama IKI</label>
                    <select
                      className={styles.select}
                      value={formLamaIki}
                      onChange={(e) => setFormLamaIki(e.target.value)}
                    >
                      <option value="1 Tahun">1 Tahun</option>
                      <option value="2 Tahun">2 Tahun</option>
                      <option value="3 Tahun">3 Tahun</option>
                      <option value="4 Tahun">4 Tahun</option>
                      <option value="5 Tahun">5 Tahun</option>
                    </select>
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseModal}
                    disabled={submitting}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {editingId ? 'Simpan Perubahan' : 'Simpan IKI'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
