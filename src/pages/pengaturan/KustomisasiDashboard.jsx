import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ChartBuilderModal from '@/components/dashboard/ChartBuilderModal';
import ChartRenderer from '@/components/charts/ChartRenderer';
import gridStyles from '@/components/dashboard/DashboardGrid.module.css';
import { useDialog } from '@/contexts/DialogContext';
import {
  getDashboardConfigs,
  saveChartConfig,
  deleteChartConfig,
  updateChartPositions,
} from '@/lib/services/dashboardService';
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  ListOrdered,
  LayoutGrid,
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  PlaneTakeoff,
  PlaneLanding,
  PawPrint,
  Fish,
  Leaf,
  Layers,
  Sparkles,
  Sliders,
  X,
  Move,
} from 'lucide-react';

const PAGE_GROUPS = [
  {
    groupId: 'utama',
    groupLabel: 'Utama',
    items: [
      {
        key: 'home',
        label: 'Home (Dashboard Utama)',
        shortLabel: ' Dashboard Utama',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    groupId: 'lalu_lintas',
    groupLabel: 'Arus Lalu Lintas',
    items: [
      {
        key: 'domestik_masuk',
        label: 'Domestik Masuk',
        shortLabel: 'Domestik Masuk',
        icon: ArrowDownLeft,
      },
      {
        key: 'domestik_keluar',
        label: 'Domestik Keluar',
        shortLabel: 'Domestik Keluar',
        icon: ArrowUpRight,
      },
      {
        key: 'ekspor',
        label: 'Ekspor',
        shortLabel: 'Ekspor',
        icon: PlaneTakeoff,
      },
      {
        key: 'impor',
        label: 'Impor',
        shortLabel: 'Impor',
        icon: PlaneLanding,
      },
    ],
  },
  {
    groupId: 'komoditas',
    groupLabel: 'Sektor Karantina',
    items: [
      {
        key: 'hewan',
        label: 'Karantina Hewan',
        shortLabel: 'Karantina Hewan',
        icon: PawPrint,
      },
      {
        key: 'ikan',
        label: 'Karantina Ikan',
        shortLabel: 'Karantina Ikan',
        icon: Fish,
      },
      {
        key: 'tumbuhan',
        label: 'Karantina Tumbuhan',
        shortLabel: 'Karantina Tumbuhan',
        icon: Leaf,
      },
    ],
  },
];

const ALL_PAGES = PAGE_GROUPS.flatMap((g) => g.items);

export default function KustomisasiDashboard() {
  const { showLoading, hideLoading, showAlert, showConfirm } = useDialog();
  const [selectedPageKey, setSelectedPageKey] = useState('home');
  const [charts, setCharts] = useState([]);
  const [chartCounts, setChartCounts] = useState({});
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [editingChart, setEditingChart] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const pages = ALL_PAGES;

  useEffect(() => {
    loadAllChartCounts();
  }, []);

  useEffect(() => {
    loadDashboardCharts(selectedPageKey);
  }, [selectedPageKey]);

  const loadAllChartCounts = async () => {
    try {
      const results = await Promise.all(ALL_PAGES.map((p) => getDashboardConfigs(p.key)));
      const counts = {};
      ALL_PAGES.forEach((p, idx) => {
        counts[p.key] = (results[idx] || []).length;
      });
      setChartCounts(counts);
    } catch (err) {
      console.warn('Gagal memuat jumlah visualisasi halaman:', err);
    }
  };

  const loadDashboardCharts = async (pageKey) => {
    const data = await getDashboardConfigs(pageKey);
    const chartList = data || [];
    setCharts(chartList);
    setChartCounts((prev) => ({ ...prev, [pageKey]: chartList.length }));
  };

  const handleOpenAddModal = () => {
    setEditingChart(null);
    setShowBuilderModal(true);
  };

  const handleOpenEditModal = (chart) => {
    setEditingChart(chart);
    setShowBuilderModal(true);
  };

  const handleDeleteChart = async (chartId, chartTitle = '') => {
    const confirmed = await showConfirm({
      title: 'Hapus Visualisasi?',
      message: `Apakah Anda yakin ingin menghapus visualisasi "${chartTitle || 'ini'}" dari dashboard? Data konfigurasi grafik tidak dapat dipulihkan kembali.`,
      type: 'confirm_delete',
      confirmText: 'Ya, Hapus Visualisasi',
      cancelText: 'Batal',
    });

    if (confirmed) {
      showLoading('Menghapus visualisasi...');
      try {
        await deleteChartConfig(chartId);
        const remaining = charts.filter((c) => c.id !== chartId);
        setCharts(remaining);
        await updateChartPositions(remaining);
        hideLoading();
        showAlert({
          title: 'Berhasil Dihapus',
          message: 'Visualisasi telah berhasil dihapus dari dashboard.',
          type: 'success',
        });
      } catch (err) {
        hideLoading();
        showAlert({
          title: 'Gagal Menghapus',
          message: `Terjadi kesalahan saat menghapus: ${err.message}`,
          type: 'error',
        });
      }
    }
  };

  const handleSaveChart = async (chartData) => {
    setShowBuilderModal(false);
    showLoading(editingChart ? 'Menyimpan perubahan visualisasi...' : 'Menambahkan visualisasi baru...');
    try {
      const targetSortOrder = editingChart
        ? (chartData.sort_order || editingChart.sort_order || (charts.findIndex((c) => c.id === editingChart.id) + 1))
        : (charts.length + 1);

      const payloadWithOrder = {
        ...chartData,
        sort_order: targetSortOrder,
      };

      const saved = await saveChartConfig(selectedPageKey, payloadWithOrder);

      const safeSaved = saved || {
        ...payloadWithOrder,
        id: chartData.id || `chart-${Date.now()}`,
        width: chartData.width || 'half',
      };

      if (editingChart) {
        setCharts((prev) => (prev || []).filter(Boolean).map((c) => (c.id === editingChart.id ? { ...c, ...safeSaved, sort_order: targetSortOrder } : c)));
      } else {
        setCharts((prev) => [...(prev || []).filter(Boolean), safeSaved]);
      }

      hideLoading();
      showAlert({
        title: 'Visualisasi Disimpan',
        message: `Visualisasi "${chartData.title}" berhasil ${editingChart ? 'diperbarui' : 'ditambahkan ke dashboard'}.`,
        type: 'success',
      });
    } catch (err) {
      hideLoading();
      showAlert({
        title: 'Gagal Menyimpan',
        message: `Terjadi kesalahan saat menyimpan visualisasi: ${err.message}`,
        type: 'error',
      });
    }
  };

  // Reorder Functions
  const moveChart = async (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= charts.length) return;

    const newCharts = [...charts];
    const temp = newCharts[index];
    newCharts[index] = newCharts[targetIdx];
    newCharts[targetIdx] = temp;

    setCharts(newCharts);
    setIsSavingOrder(true);
    await updateChartPositions(newCharts);
    setIsSavingOrder(false);

    setSuccessMsg('Urutan posisi visualisasi berhasil diperbarui!');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const moveChartToExtreme = async (index, toTop = true) => {
    if ((toTop && index === 0) || (!toTop && index === charts.length - 1)) return;

    const newCharts = [...charts];
    const [targetItem] = newCharts.splice(index, 1);

    if (toTop) {
      newCharts.unshift(targetItem);
    } else {
      newCharts.push(targetItem);
    }

    setCharts(newCharts);
    setIsSavingOrder(true);
    await updateChartPositions(newCharts);
    setIsSavingOrder(false);

    setSuccessMsg(toTop ? 'Visualisasi dipindahkan ke posisi teratas!' : 'Visualisasi dipindahkan ke posisi terbawah!');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner with Integrated Controls */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
            Kustomisasi Dashboard &amp; Atur Posisi Visual
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Atur visualisasi grafik &amp; tabel (tambah baru, konfigurasi, ubah posisi urutan, dan hapus) per halaman target.
          </p>
        </div>

        {/* Toolbar: Page Selector Dropdown + Atur Urutan + Tambah Visualisasi */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Target Page Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label
              htmlFor="target-page-select"
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              Halaman:
            </label>
            <select
              id="target-page-select"
              className="form-select"
              value={selectedPageKey}
              onChange={(e) => setSelectedPageKey(e.target.value)}
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                padding: '0.45rem 2rem 0.45rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--surface-1)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                minWidth: '210px',
              }}
            >
              {PAGE_GROUPS.map((group) => (
                <optgroup key={group.groupId} label={`── ${group.groupLabel.toUpperCase()} ──`}>
                  {group.items.map((item) => {
                    const count = chartCounts[item.key] != null ? chartCounts[item.key] : 0;
                    return (
                      <option key={item.key} value={item.key}>
                        {item.label.replace('Home (Dashboard Utama)', 'Dashboard Utama')} ({count})
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)', margin: '0 0.15rem' }} />

          {/* Reorder Button */}
          {charts.length > 1 && (
            <button className="btn btn-secondary" onClick={() => setShowReorderModal(true)}>
              <ListOrdered size={16} />
              <span>Atur Urutan ({charts.length})</span>
            </button>
          )}

          {/* Add Chart Button */}
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <Plus size={16} />
            <span>Tambah Visualisasi Baru</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="card" style={{ backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success)', padding: '0.875rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-success)', fontWeight: 600, fontSize: '0.875rem' }}>
            <Check size={18} />
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {/* List of Active Charts in Page */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Daftar Visualisasi Aktif di Halaman {pages.find((p) => p.key === selectedPageKey)?.label} ({charts.length} Visualisasi):
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Gunakan tombol panah <strong>▲</strong> dan <strong>▼</strong> pada setiap kartu untuk mengatur posisi urutannya.
          </span>
        </div>

        {charts.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '3rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <LayoutGrid size={40} style={{ color: 'var(--text-muted)' }} />
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Belum Ada Visualisasi di Halaman Ini</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Klik tombol "Tambah Visualisasi Baru" untuk membuat grafik atau tabel baru.
              </p>
            </div>
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              <Plus size={16} />
              <span>Tambah Visualisasi Baru</span>
            </button>
          </div>
        ) : (
          <div className={gridStyles.gridContainer}>
            {(charts || []).filter(Boolean).map((chart, idx) => {
              let itemClass = gridStyles.itemHalf;
              switch (chart.width) {
                case 'full':
                  itemClass = gridStyles.itemFull;
                  break;
                case 'three_quarters':
                case 'three_quarter':
                  itemClass = gridStyles.itemThreeQuarters;
                  break;
                case 'two_thirds':
                case 'two_third':
                  itemClass = gridStyles.itemTwoThirds;
                  break;
                case 'third':
                  itemClass = gridStyles.itemThird;
                  break;
                case 'quarter':
                  itemClass = gridStyles.itemQuarter;
                  break;
                case 'fifth':
                  itemClass = gridStyles.itemFifth;
                  break;
                case 'sixth':
                case 'sixths':
                  itemClass = gridStyles.itemSixth;
                  break;
                case 'half':
                default:
                  itemClass = gridStyles.itemHalf;
                  break;
              }

              return (
                <div key={chart.id} className={itemClass} style={{ position: 'relative' }}>
                  {/* Floating Action Bar (Position Reorder, Edit, Delete) */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      backgroundColor: 'var(--surface-2)',
                      padding: '0.25rem 0.375rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {/* Position Badge */}
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      }}
                      title={`Urutan Tampilan #${idx + 1}`}
                    >
                      #{idx + 1}
                    </span>

                    {/* Move Up */}
                    <button
                      className="btn-icon"
                      style={{
                        padding: '0.25rem',
                        opacity: idx === 0 ? 0.35 : 1,
                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                      }}
                      disabled={idx === 0}
                      onClick={() => moveChart(idx, -1)}
                      title="Pindahkan ke depan / atas"
                    >
                      <ArrowUp size={14} />
                    </button>

                    {/* Move Down */}
                    <button
                      className="btn-icon"
                      style={{
                        padding: '0.25rem',
                        opacity: idx === charts.length - 1 ? 0.35 : 1,
                        cursor: idx === charts.length - 1 ? 'not-allowed' : 'pointer',
                      }}
                      disabled={idx === charts.length - 1}
                      onClick={() => moveChart(idx, 1)}
                      title="Pindahkan ke belakang / bawah"
                    >
                      <ArrowDown size={14} />
                    </button>

                    <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

                    {/* Edit */}
                    <button
                      className="btn-icon"
                      style={{ padding: '0.25rem' }}
                      onClick={() => handleOpenEditModal(chart)}
                      title="Edit visualisasi ini"
                    >
                      <Edit2 size={14} />
                    </button>

                    {/* Delete */}
                    <button
                      className="btn-icon"
                      style={{ padding: '0.25rem', color: 'var(--status-danger)' }}
                      onClick={() => handleDeleteChart(chart.id, chart.title)}
                      title="Hapus visualisasi ini"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <ChartRenderer chartConfig={chart} rawData={[]} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Reorder Ringkas (Quick Reorder Panel Modal) */}
      {showReorderModal && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
            margin: 0,
            boxSizing: 'border-box',
          }}
        >
          <div
            className="card"
            style={{
              width: '94vw',
              maxWidth: '620px',
              backgroundColor: 'var(--surface-1)',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              padding: '1.5rem',
            }}
          >
            <div className="card-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ListOrdered size={20} style={{ color: 'var(--primary)' }} />
                <h3 className="card-title" style={{ fontSize: '1.125rem' }}>
                  Atur Urutan Posisi Visualisasi ({charts.length})
                </h3>
              </div>
              <button className="btn-icon" onClick={() => setShowReorderModal(false)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Visualisasi nomor <strong>#1</strong> akan diletakkan di paling depan/atas dashboard, diikuti nomor selanjutnya.
            </p>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.625rem', paddingRight: '0.25rem' }}>
              {charts.map((chart, idx) => (
                <div
                  key={chart.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--surface-0)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {chart.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', marginTop: '2px' }}>
                        <span className="badge" style={{ backgroundColor: 'var(--surface-2)', fontSize: '0.7rem' }}>
                          {chart.chart_type?.toUpperCase()}
                        </span>
                        <span>
                          {chart.width === 'full'
                            ? 'Full Width (100%)'
                            : chart.width === 'third'
                              ? '1/3 Width (33%)'
                              : chart.width === 'quarter'
                                ? '1/4 Width (25%)'
                                : chart.width === 'fifth'
                                  ? '1/5 Width (20%)'
                                  : 'Half Width (50%)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reorder Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                      disabled={idx === 0}
                      onClick={() => moveChartToExtreme(idx, true)}
                      title="Pindahkan ke Paling Atas (#1)"
                    >
                      <ChevronsUp size={14} />
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                      disabled={idx === 0}
                      onClick={() => moveChart(idx, -1)}
                      title="Naikkan Satu Posisi"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                      disabled={idx === charts.length - 1}
                      onClick={() => moveChart(idx, 1)}
                      title="Turunkan Satu Posisi"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                      disabled={idx === charts.length - 1}
                      onClick={() => moveChartToExtreme(idx, false)}
                      title="Pindahkan ke Paling Bawah"
                    >
                      <ChevronsDown size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button className="btn btn-primary" onClick={() => setShowReorderModal(false)}>
                <Check size={16} />
                <span>Selesai Mengatur Urutan</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Chart Builder Modal */}
      {showBuilderModal && (
        <ChartBuilderModal
          chartToEdit={editingChart}
          selectedPageKey={selectedPageKey}
          onSave={handleSaveChart}
          onClose={() => setShowBuilderModal(false)}
        />
      )}
    </div>
  );
}
