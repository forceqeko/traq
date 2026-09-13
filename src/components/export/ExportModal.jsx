import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { exportCustomCanvas } from '@/lib/export/exportPage';
import { useDialog } from '@/contexts/DialogContext';
import ChartRenderer from '@/components/charts/ChartRenderer';
import styles from './ExportModal.module.css';
import {
  X,
  FileText,
  FileImage,
  LayoutTemplate,
  GripVertical,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  Download,
  Eye,
  Sliders,
  RotateCcw,
} from 'lucide-react';

/**
 * Format numbers cleanly for KPI cards
 */
function formatNumber(num) {
  if (num == null || isNaN(num)) return '0';
  return Number(num).toLocaleString('id-ID');
}

/**
 * Map original dashboard chart.width to export grid width
 */
function mapOriginalWidth(origWidth) {
  if (!origWidth) return 'half';
  switch (origWidth) {
    case 'full':
      return 'full';
    case 'three_quarters':
    case 'three_quarter':
      return 'three_quarters';
    case 'two_thirds':
    case 'two_third':
      return 'two_thirds';
    case 'third':
      return 'third';
    case 'quarter':
      return 'quarter';
    case 'half':
    default:
      return 'half';
  }
}

export default function ExportModal({
  isOpen,
  onClose,
  pageTitle = 'Dashboard TRAQ',
  periodLabel = 'Tahun 2026',
  satpelLabel = 'Semua Satpel',
  kpis = {},
  chartConfigs = [],
  chartDataMap = {},
  defaultFilename = 'TRAQ_Laporan',
}) {
  const { showLoading, hideLoading, showAlert } = useDialog();
  const previewCanvasRef = useRef(null);

  // Settings State
  const [format, setFormat] = useState('pdf'); // 'pdf' | 'png'
  const [orientation, setOrientation] = useState('landscape'); // 'landscape' | 'portrait'
  const [includeHeader, setIncludeHeader] = useState(true);
  const [includeKpis, setIncludeKpis] = useState(true);
  const [includeFooter, setIncludeFooter] = useState(true);

  // Draggable & Resizable Visual Items State
  const [items, setItems] = useState([]);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Initialize visual items from chartConfigs with their EXACT ORIGINAL SIZES
  useEffect(() => {
    if (chartConfigs && chartConfigs.length > 0) {
      const initialItems = chartConfigs.map((chart) => ({
        id: chart.id,
        title: chart.title || 'Visualisasi Data',
        type: chart.type || 'chart',
        chartConfig: chart,
        enabled: true,
        // Default: persis sesuai ukuran aslinya di dashboard!
        width: mapOriginalWidth(chart.width),
        heightPreset: chart.type === 'map' || chart.type === 'data_table' ? 'tall' : 'standard',
      }));
      setItems(initialItems);
    } else {
      setItems([]);
    }
  }, [chartConfigs]);

  if (!isOpen) return null;

  // Toggle single item enabled/disabled
  const toggleItem = (id) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  // Change individual item width
  const setItemWidth = (id, width) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, width } : item))
    );
  };

  // Change individual item height
  const setItemHeight = (id, heightPreset) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, heightPreset } : item))
    );
  };

  // Apply layout preset to all items
  const applyPreset = (presetType) => {
    setItems((prev) =>
      prev.map((item) => {
        if (presetType === 'original') {
          return {
            ...item,
            width: mapOriginalWidth(item.chartConfig?.width),
          };
        }
        if (presetType === 'all_full') return { ...item, width: 'full' };
        if (presetType === 'all_half') return { ...item, width: 'half' };
        if (presetType === 'all_third') return { ...item, width: 'third' };
        if (presetType === 'all_quarter') return { ...item, width: 'quarter' };
        if (presetType === 'smart') {
          return {
            ...item,
            width: item.type === 'map' || item.type === 'data_table' ? 'full' : orientation === 'landscape' ? 'half' : 'full',
          };
        }
        return item;
      })
    );
  };

  // Select all items
  const selectAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, enabled: true })));
    setIncludeKpis(true);
    setIncludeHeader(true);
  };

  // Deselect all items
  const deselectAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, enabled: false })));
  };

  // Drag and Drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    setDragOverIdx(index);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) return;

    setItems((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(draggedIdx, 1);
      updated.splice(targetIndex, 0, movedItem);
      return updated;
    });

    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // Manual move up/down
  const moveItem = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    setItems((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(index, 1);
      updated.splice(targetIndex, 0, movedItem);
      return updated;
    });
  };

  // Map width key to CSS column class
  const getColClass = (w) => {
    switch (w) {
      case 'full':
        return styles.colFull;
      case 'three_quarters':
        return styles.colThreeQuarters;
      case 'two_thirds':
        return styles.colTwoThirds;
      case 'third':
        return styles.colThird;
      case 'quarter':
        return styles.colQuarter;
      case 'half':
      default:
        return styles.colHalf;
    }
  };

  // Width label helper
  const getWidthLabel = (w) => {
    switch (w) {
      case 'full':
        return '100%';
      case 'three_quarters':
        return '75%';
      case 'two_thirds':
        return '67%';
      case 'half':
        return '50%';
      case 'third':
        return '33%';
      case 'quarter':
        return '25%';
      default:
        return '50%';
    }
  };

  // Rotate width on click
  const rotateWidth = (currentWidth) => {
    const sequence = ['full', 'three_quarters', 'two_thirds', 'half', 'third', 'quarter'];
    const idx = sequence.indexOf(currentWidth);
    const nextIdx = (idx + 1) % sequence.length;
    return sequence[nextIdx];
  };

  // Map height preset to pixel height
  const getHeightPx = (h) => {
    switch (h) {
      case 'compact':
        return 280;
      case 'medium':
        return 480;
      case 'tall':
        return 580;
      case 'standard':
      default:
        return 380;
    }
  };

  // Map height preset to CSS class
  const getHeightClass = (h) => {
    switch (h) {
      case 'compact':
        return styles.heightCompact;
      case 'medium':
        return styles.heightMedium;
      case 'tall':
        return styles.heightTall;
      case 'standard':
      default:
        return styles.heightStandard;
    }
  };

  // Export action
  const handleExport = async () => {
    if (!previewCanvasRef.current) return;

    setIsExporting(true);
    const loadingMsg =
      format === 'pdf'
        ? 'Menyusun dokumen PDF resolusi tinggi...'
        : 'Merender gambar kanvas PNG resolusi tinggi...';
    showLoading(loadingMsg);

    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${defaultFilename}_${orientation}_${timestamp}`;

      await exportCustomCanvas(previewCanvasRef.current, {
        filename,
        format,
        orientation,
        backgroundColor: '#0B0E14',
      });

      hideLoading();
      showAlert({
        title: 'Ekspor Berhasil',
        message: `Halaman berhasil diekspor sebagai file ${filename}.${format}`,
        type: 'success',
      });
      onClose();
    } catch (err) {
      hideLoading();
      showAlert({
        title: 'Gagal Mengekspor',
        message: err.message || 'Terjadi kesalahan saat memproses ekspor kanvas.',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const activeVisualsCount = items.filter((i) => i.enabled).length + (includeKpis ? 1 : 0);
  const printDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        {/* Header Modal */}
        <div className={styles.modalHeader}>
          <div className={styles.headerInfo}>
            <h2 className={styles.modalTitle}>
              <Sliders size={20} style={{ color: 'var(--primary)' }} />
              <span>Pengaturan &amp; Kustomisasi Ekspor Halaman</span>
            </h2>
            <p className={styles.modalSubtitle}>
              Default ukuran visualisasi otomatis disesuaikan dengan ukuran aslinya di dashboard. Anda bebas menyesuaikan orientasi dan tata letak.
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Tutup Modal">
            <X size={20} />
          </button>
        </div>

        {/* Body Split Screen */}
        <div className={styles.modalBody}>
          {/* ================= PANEL KIRI: PENGATURAN & SELEKSI ================= */}
          <div className={styles.settingsPanel}>
            {/* 1. Format File */}
            <div>
              <div className={styles.sectionTitle}>1. Format Output Dokumen</div>
              <div className={styles.optionsGrid}>
                <div
                  className={`${styles.optionCard} ${format === 'pdf' ? styles.optionCardActive : ''}`}
                  onClick={() => setFormat('pdf')}
                >
                  <div className={styles.optionIcon}>
                    <FileText size={20} />
                  </div>
                  <div className={styles.optionText}>
                    <span className={styles.optionLabel}>Dokumen PDF</span>
                    <span className={styles.optionDesc}>Standar Laporan A4</span>
                  </div>
                </div>

                <div
                  className={`${styles.optionCard} ${format === 'png' ? styles.optionCardActive : ''}`}
                  onClick={() => setFormat('png')}
                >
                  <div className={styles.optionIcon}>
                    <FileImage size={20} />
                  </div>
                  <div className={styles.optionText}>
                    <span className={styles.optionLabel}>Gambar PNG</span>
                    <span className={styles.optionDesc}>Resolusi Tinggi (HD)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Orientasi Kanvas */}
            <div>
              <div className={styles.sectionTitle}>2. Orientasi Kanvas Cetak</div>
              <div className={styles.optionsGrid}>
                <div
                  className={`${styles.optionCard} ${orientation === 'landscape' ? styles.optionCardActive : ''}`}
                  onClick={() => setOrientation('landscape')}
                >
                  <div className={styles.optionIcon}>
                    <LayoutTemplate size={20} />
                  </div>
                  <div className={styles.optionText}>
                    <span className={styles.optionLabel}>Landscape</span>
                    <span className={styles.optionDesc}>Lebar (Horizontal)</span>
                  </div>
                </div>

                <div
                  className={`${styles.optionCard} ${orientation === 'portrait' ? styles.optionCardActive : ''}`}
                  onClick={() => setOrientation('portrait')}
                >
                  <div className={styles.optionIcon}>
                    <LayoutTemplate size={20} style={{ transform: 'rotate(90deg)' }} />
                  </div>
                  <div className={styles.optionText}>
                    <span className={styles.optionLabel}>Portrait</span>
                    <span className={styles.optionDesc}>Tinggi (Vertikal)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Elemen Tambahan */}
            <div>
              <div className={styles.sectionTitle}>3. Elemen Tambahan</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div
                  className={styles.toggleRow}
                  onClick={() => setIncludeHeader(!includeHeader)}
                >
                  <span className={styles.toggleLabel}>Sertakan Kop Surat &amp; Identitas TRAQ</span>
                  {includeHeader ? (
                    <CheckSquare size={18} style={{ color: 'var(--primary)' }} />
                  ) : (
                    <Square size={18} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>

                <div
                  className={styles.toggleRow}
                  onClick={() => setIncludeKpis(!includeKpis)}
                >
                  <span className={styles.toggleLabel}>Sertakan Kartu Ringkasan Metrik KPI</span>
                  {includeKpis ? (
                    <CheckSquare size={18} style={{ color: 'var(--primary)' }} />
                  ) : (
                    <Square size={18} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
              </div>
            </div>

            {/* 4. Pemilihan, Pengurutan & Ukuran Visual */}
            <div>
              <div className={styles.itemsHeader}>
                <div className={styles.sectionTitle} style={{ margin: 0 }}>
                  4. Kustomisasi Ukuran &amp; Urutan Visual
                </div>
                <div className={styles.actionLinks}>
                  <button type="button" className={styles.actionLink} onClick={selectAll}>
                    Pilih Semua
                  </button>
                  <button type="button" className={styles.actionLink} onClick={deselectAll}>
                    Hapus
                  </button>
                </div>
              </div>

              {/* Quick Preset Bar */}
              <div className={styles.presetBar}>
                <button
                  type="button"
                  className={styles.presetBtn}
                  onClick={() => applyPreset('original')}
                  title="Kembalikan semua visual ke ukuran aslinya di dashboard"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}
                >
                  <RotateCcw size={11} />
                  <span>Ukuran Asli</span>
                </button>
                <button
                  type="button"
                  className={styles.presetBtn}
                  onClick={() => applyPreset('all_half')}
                  title="Ubah semua grafik jadi 2 kolom (50%)"
                >
                  2 Kolom (50%)
                </button>
                <button
                  type="button"
                  className={styles.presetBtn}
                  onClick={() => applyPreset('all_third')}
                  title="Ubah semua grafik jadi 3 kolom (33%)"
                >
                  3 Kolom (33%)
                </button>
                <button
                  type="button"
                  className={styles.presetBtn}
                  onClick={() => applyPreset('all_full')}
                  title="Ubah semua grafik jadi 1 kolom penuh (100%)"
                >
                  1 Kolom (100%)
                </button>
              </div>

              <div className={styles.draggableList}>
                {items.map((item, index) => {
                  const isDragging = draggedIdx === index;
                  const isDragOver = dragOverIdx === index;

                  return (
                    <div
                      key={item.id}
                      className={`${styles.draggableCard} ${isDragging ? styles.draggableCardDragging : ''} ${isDragOver ? styles.draggableCardDragOver : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      {/* Top Row: Handle, Checkbox, Title, Reorder buttons */}
                      <div className={styles.cardTopRow}>
                        <div className={styles.dragHandle} title="Tarik untuk memindahkan urutan">
                          <GripVertical size={16} />
                        </div>

                        <div
                          className={styles.cardTitleArea}
                          onClick={() => toggleItem(item.id)}
                        >
                          {item.enabled ? (
                            <CheckSquare size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          ) : (
                            <Square size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          )}
                          <span className={styles.cardTitle} title={item.title}>
                            {item.title}
                          </span>
                          <span className={styles.cardBadge}>
                            {item.type.replace('_', ' ')}
                          </span>
                        </div>

                        <div className={styles.cardReorderBtns}>
                          <button
                            type="button"
                            className={styles.reorderBtn}
                            disabled={index === 0}
                            onClick={() => moveItem(index, -1)}
                            title="Pindah ke atas"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            className={styles.reorderBtn}
                            disabled={index === items.length - 1}
                            onClick={() => moveItem(index, 1)}
                            title="Pindah ke bawah"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Row: Sizing Controls (Width & Height) */}
                      {item.enabled && (
                        <div className={styles.cardSizeRow}>
                          <div className={styles.sizeControlGroup}>
                            <span>Lebar Kolom:</span>
                            <div className={styles.sizeButtonGroup}>
                              <button
                                type="button"
                                className={`${styles.sizeBtn} ${item.width === 'full' ? styles.sizeBtnActive : ''}`}
                                onClick={() => setItemWidth(item.id, 'full')}
                                title="Lebar 100% (1 Baris Penuh)"
                              >
                                100%
                              </button>
                              <button
                                type="button"
                                className={`${styles.sizeBtn} ${item.width === 'three_quarters' ? styles.sizeBtnActive : ''}`}
                                onClick={() => setItemWidth(item.id, 'three_quarters')}
                                title="Lebar 75% (Tiga Perempat)"
                              >
                                75%
                              </button>
                              <button
                                type="button"
                                className={`${styles.sizeBtn} ${item.width === 'two_thirds' ? styles.sizeBtnActive : ''}`}
                                onClick={() => setItemWidth(item.id, 'two_thirds')}
                                title="Lebar 67% (Dua Pertiga)"
                              >
                                67%
                              </button>
                              <button
                                type="button"
                                className={`${styles.sizeBtn} ${item.width === 'half' ? styles.sizeBtnActive : ''}`}
                                onClick={() => setItemWidth(item.id, 'half')}
                                title="Lebar 50% (Setengah / 2 Kolom)"
                              >
                                50%
                              </button>
                              <button
                                type="button"
                                className={`${styles.sizeBtn} ${item.width === 'third' ? styles.sizeBtnActive : ''}`}
                                onClick={() => setItemWidth(item.id, 'third')}
                                title="Lebar 33% (Sepertiga / 3 Kolom)"
                              >
                                33%
                              </button>
                              <button
                                type="button"
                                className={`${styles.sizeBtn} ${item.width === 'quarter' ? styles.sizeBtnActive : ''}`}
                                onClick={() => setItemWidth(item.id, 'quarter')}
                                title="Lebar 25% (Seperempat / 4 Kolom)"
                              >
                                25%
                              </button>
                            </div>
                          </div>

                          <div className={styles.sizeControlGroup}>
                            <span>Tinggi:</span>
                            <div className={styles.sizeButtonGroup}>
                              <button
                                type="button"
                                className={`${styles.sizeBtn} ${item.heightPreset === 'compact' ? styles.sizeBtnActive : ''}`}
                                onClick={() => setItemHeight(item.id, 'compact')}
                                title="Tinggi Ringkas (260px)"
                              >
                                S (Ringkas)
                              </button>
                              <button
                                type="button"
                                className={`${styles.sizeBtn} ${item.heightPreset === 'standard' ? styles.sizeBtnActive : ''}`}
                                onClick={() => setItemHeight(item.id, 'standard')}
                                title="Tinggi Standar (360px)"
                              >
                                M (Standar)
                              </button>
                              <button
                                type="button"
                                className={`${styles.sizeBtn} ${item.heightPreset === 'medium' ? styles.sizeBtnActive : ''}`}
                                onClick={() => setItemHeight(item.id, 'medium')}
                                title="Tinggi Menengah (420px)"
                              >
                                L (Menengah)
                              </button>
                              <button
                                type="button"
                                className={`${styles.sizeBtn} ${item.heightPreset === 'tall' ? styles.sizeBtnActive : ''}`}
                                onClick={() => setItemHeight(item.id, 'tall')}
                                title="Tinggi Lega (520px)"
                              >
                                XL (Lega)
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {items.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    Tidak ada grafik kustom pada halaman ini.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================= PANEL KANAN: LIVE PRINT PREVIEW ================= */}
          <div className={styles.previewPanel}>
            <div className={styles.previewHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={14} />
                <span>Pratinjau Lembar Cetak ({orientation === 'landscape' ? 'A4 Landscape (Lebar)' : 'A4 Portrait (Tinggi)'})</span>
              </div>
              <span>{activeVisualsCount} Komponen Aktif</span>
            </div>

            {/* Canvas Container */}
            <div className={styles.canvasWrapper}>
              <div
                ref={previewCanvasRef}
                className={`${styles.printableCanvas} ${orientation === 'landscape' ? styles.canvasLandscape : styles.canvasPortrait}`}
              >
                {/* 1. Kop Surat & Identitas Resmi */}
                {includeHeader && (
                  <div className={styles.docHeader}>
                    <div className={styles.docBrand}>
                      <div className={styles.docLogo}>T</div>
                      <div>
                        <div className={styles.docTitle}>TRAQ SULUT</div>
                        <div className={styles.docSub}>
                          Balai Karantina Hewan, Ikan, dan Tumbuhan Sulawesi Utara
                        </div>
                      </div>
                    </div>
                    <div className={styles.docMeta}>
                      <div>Laporan: <strong>{pageTitle}</strong></div>
                      <div>Periode: <strong>{periodLabel}</strong></div>
                      {satpelLabel && (
                        <div>Satpel: <strong>{satpelLabel}</strong></div>
                      )}
                      <div>Dicetak: {printDate}</div>
                    </div>
                  </div>
                )}

                {/* 2. Kartu Metrik KPI (Jika Dicentang) */}
                {includeKpis && (
                  <div className={styles.previewKpiGrid}>
                    <div className={styles.previewKpiCard}>
                      <div className={styles.previewKpiLabel}>Total Sertifikat</div>
                      <div className={styles.previewKpiValue} style={{ color: 'var(--primary)' }}>
                        {formatNumber(kpis.totalSertifikat || 0)}
                      </div>
                      <div className={styles.previewKpiSub}>Dokumen Operasional</div>
                    </div>

                    <div className={styles.previewKpiCard}>
                      <div className={styles.previewKpiLabel}>Karantina Hewan</div>
                      <div className={styles.previewKpiValue} style={{ color: 'var(--accent-amber, #D97706)' }}>
                        {formatNumber(kpis.hewanCount || 0)}
                      </div>
                      <div className={styles.previewKpiSub}>{kpis.hewanPercent || '0'}% dari total</div>
                    </div>

                    <div className={styles.previewKpiCard}>
                      <div className={styles.previewKpiLabel}>Karantina Ikan</div>
                      <div className={styles.previewKpiValue} style={{ color: 'var(--accent-teal, #0D9488)' }}>
                        {formatNumber(kpis.ikanCount || 0)}
                      </div>
                      <div className={styles.previewKpiSub}>{kpis.ikanPercent || '0'}% dari total</div>
                    </div>

                    <div className={styles.previewKpiCard}>
                      <div className={styles.previewKpiLabel}>Karantina Tumbuhan</div>
                      <div className={styles.previewKpiValue} style={{ color: 'var(--accent-green, #10B981)' }}>
                        {formatNumber(kpis.tumbuhanCount || 0)}
                      </div>
                      <div className={styles.previewKpiSub}>{kpis.tumbuhanPercent || '0'}% dari total</div>
                    </div>
                  </div>
                )}

                {/* 3. 12-Column Flexible Print Grid */}
                <div className={styles.previewGrid}>
                  {items
                    .filter((item) => item.enabled)
                    .map((item) => {
                      const data = chartDataMap[item.id] || [];
                      const colClass = getColClass(item.width);
                      const heightPx = getHeightPx(item.heightPreset);

                      return (
                        <div key={item.id} className={`${styles.previewVisualItem} ${colClass}`}>
                          <ChartRenderer
                            chartConfig={item.chartConfig}
                            rawData={data}
                            height={heightPx}
                          />
                        </div>
                      );
                    })}
                </div>

                {/* Empty State jika semua visual dimatikan */}
                {items.filter((i) => i.enabled).length === 0 && !includeKpis && (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Tidak ada visual yang dipilih untuk diekspor. Silakan centang visual di panel kiri.
                  </div>
                )}

                {/* 4. Footer Dokumen */}
                {includeFooter && (
                  <div className={styles.docFooter}>
                    <span>Sistem Informasi Traffic &amp; Quarantine Analytics (TRAQ)</span>
                    <span>Badan Karantina Indonesia &copy; {new Date().getFullYear()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className={styles.modalFooter}>
          <div className={styles.footerStatus}>
            Total <strong>{activeVisualsCount}</strong> komponen siap diekspor ke format <strong>{format.toUpperCase()}</strong> ({orientation})
          </div>

          <div className={styles.footerActions}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isExporting}
            >
              Batal
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExport}
              disabled={isExporting || activeVisualsCount === 0}
            >
              <Download size={16} />
              <span>
                Unduh {format === 'pdf' ? 'Dokumen PDF' : 'Gambar PNG'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
