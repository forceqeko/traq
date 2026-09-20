import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { exportMultiPageCanvas } from '@/lib/export/exportPage';
import { useDialog } from '@/contexts/DialogContext';
import { useTheme } from '@/contexts/ThemeContext';
import ChartRenderer from '@/components/charts/ChartRenderer';
import {
  X,
  FileText,
  FileImage,
  Download,
  Plus,
  Trash2,
  Copy,
  Layers,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Grid,
  Magnet,
  Type,
  Square,
  BarChart3,
  Sliders,
  RotateCcw,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  ZoomIn,
  ZoomOut,
  Tag,
  Check,
} from 'lucide-react';

/**
 * Format number cleanly for Indonesian locale
 */
function formatNumber(num) {
  if (num == null || isNaN(num)) return '0';
  return Number(num).toLocaleString('id-ID');
}

/**
 * Generate clean unique ID for canvas items
 */
function uid(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

/**
 * Calculate natural default & base dimensions for different chart visual types
 */
function getChartDefaultDimensions(cfg, orientation, canvasWidth, canvasHeight) {
  if (!cfg) {
    const defaultW = orientation === 'landscape' ? 460 : 640;
    return { width: defaultW, height: 290, baseWidth: defaultW, baseHeight: 290 };
  }

  const chartType = cfg.chart_type;

  if (chartType === 'kpi_group') {
    const kpiItems = cfg.config?.kpi_items || cfg.config?.kpiItems || [];
    const count = Math.max(1, kpiItems.length);
    const hasTitle =
      cfg.config?.show_group_title !== false &&
      cfg.title &&
      !['kpi group', 'visualisasi data', 'untitled', 'tanpa judul', 'pratinjau visualisasi data'].includes(
        String(cfg.title).toLowerCase().trim()
      );
    const titleH = hasTitle ? 36 : 0;
    // Each KPI card has 40px padding + header & value metrics + 12px gap = ~110px
    const naturalH = count * 110 + Math.max(0, count - 1) * 12 + titleH;
    const defaultW = orientation === 'landscape' ? 280 : 320;
    const defaultH = Math.min(naturalH, canvasHeight - 60);

    return {
      width: defaultW,
      height: defaultH,
      baseWidth: defaultW,
      baseHeight: naturalH,
    };
  }

  if (chartType === 'kpi_card') {
    const defaultW = 240;
    const defaultH = 108;
    return {
      width: defaultW,
      height: defaultH,
      baseWidth: defaultW,
      baseHeight: defaultH,
    };
  }

  const defaultW = orientation === 'landscape' ? 460 : 640;
  const defaultH = 290;
  return {
    width: defaultW,
    height: defaultH,
    baseWidth: defaultW,
    baseHeight: defaultH,
  };
}

export default function ExportModal({
  isOpen,
  onClose,
  pageTitle = 'Dashboard TRAQ',
  periodLabel = 'Tahun 2026',
  satpelLabel = 'Semua Satpel',
  pospelLabel = '',
  kpis = {},
  chartConfigs = [],
  chartDataMap = {},
  defaultFilename = 'TRAQ_Laporan',
}) {
  const { showConfirm, showAlert } = useDialog();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Reference canvas element & offscreen export container
  const canvasRef = useRef(null);
  const offscreenContainerRef = useRef(null);

  // Settings State
  const [orientation, setOrientation] = useState('landscape'); // 'landscape' | 'portrait'
  const [format, setFormat] = useState('pdf'); // 'pdf' | 'png'
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(10);
  const [zoom, setZoom] = useState(0.85);
  const [activeTab, setActiveTab] = useState('visuals'); // 'visuals' | 'elements' | 'settings'

  // Export Progress State
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatusText, setExportStatusText] = useState('');

  // Dimensions of A4 in logical px (Landscape: 1000 x 707, Portrait: 707 x 1000)
  const canvasWidth = orientation === 'landscape' ? 1000 : 707;
  const canvasHeight = orientation === 'landscape' ? 707 : 1000;

  // Selected items on the active page (supports multi-selection / tagging)
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  const selectedItemId = selectedItemIds[0] || null;

  const setSelectedItemId = useCallback((idOrFn) => {
    if (typeof idOrFn === 'function') {
      setSelectedItemIds((prev) => {
        const cur = prev[0] || null;
        const res = idOrFn(cur);
        return res ? [res] : [];
      });
    } else {
      setSelectedItemIds(idOrFn ? [idOrFn] : []);
    }
  }, []);

  const toggleItemSelection = useCallback((id) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((itId) => itId !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItemIds([]);
  }, []);

  // Smart Guide Lines Coordinates (null if none active)
  const [guideLineX, setGuideLineX] = useState(null);
  const [guideLineY, setGuideLineY] = useState(null);

  // Formatted current date
  const printDate = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  /**
   * Helper to build initial layout for Page 1 using global CSS variables
   */
  const buildInitialPageItems = useCallback(() => {
    const items = [];

    // 1. Header / Kop TRAQ
    items.push({
      id: uid('header'),
      type: 'header',
      title: 'Kop Resmi TRAQ',
      x: 20,
      y: 18,
      width: canvasWidth - 40,
      height: 64,
      baseWidth: canvasWidth - 40,
      baseHeight: 64,
      zIndex: 2,
    });

    // 2. Default KPI row if KPIs are provided using global theme variables
    const kpiEntries = [
      { label: 'Total Sertifikat', val: kpis.totalSertifikat, sub: 'Dokumen Operasional', color: 'var(--primary)' },
      { label: 'Karantina Hewan', val: kpis.hewanCount, sub: `${kpis.hewanPercent || 0}% total`, color: 'var(--accent-amber)' },
      { label: 'Karantina Ikan', val: kpis.ikanCount, sub: `${kpis.ikanPercent || 0}% total`, color: 'var(--accent-teal)' },
      { label: 'Karantina Tumbuhan', val: kpis.tumbuhanCount, sub: `${kpis.tumbuhanPercent || 0}% total`, color: 'var(--accent-green)' },
    ];

    const hasKpiData = kpiEntries.some((k) => k.val != null && k.val !== 0);
    let chartStartY = 96;

    if (hasKpiData) {
      const kpiCardWidth = Math.floor((canvasWidth - 40 - 3 * 12) / 4);
      kpiEntries.forEach((kpi, idx) => {
        items.push({
          id: uid('kpi'),
          type: 'kpi',
          label: kpi.label,
          value: formatNumber(kpi.val || 0),
          sub: kpi.sub,
          accentColor: kpi.color,
          x: 20 + idx * (kpiCardWidth + 12),
          y: 92,
          width: kpiCardWidth,
          height: 76,
          baseWidth: kpiCardWidth,
          baseHeight: 76,
          zIndex: 5,
        });
      });
      chartStartY = 180;
    }

    // 3. Pre-place first 1 or 2 charts from chartConfigs
    if (chartConfigs && chartConfigs.length > 0) {
      const firstChart = chartConfigs[0];
      const secondChart = chartConfigs[1];

      if (firstChart && secondChart && orientation === 'landscape') {
        const halfWidth = Math.floor((canvasWidth - 52) / 2);
        const chartHeight = canvasHeight - chartStartY - 24;

        const firstDims = getChartDefaultDimensions(firstChart, orientation, canvasWidth, canvasHeight);
        const secondDims = getChartDefaultDimensions(secondChart, orientation, canvasWidth, canvasHeight);

        items.push({
          id: uid('chart'),
          type: 'chart',
          chartId: firstChart.id,
          chartConfig: firstChart,
          title: firstChart.title || 'Visualisasi 1',
          x: 20,
          y: chartStartY,
          width: firstChart.chart_type === 'kpi_group' ? firstDims.width : halfWidth,
          height: firstChart.chart_type === 'kpi_group' ? firstDims.height : chartHeight,
          baseWidth: firstDims.baseWidth || halfWidth,
          baseHeight: firstDims.baseHeight || chartHeight,
          zIndex: 5,
        });

        items.push({
          id: uid('chart'),
          type: 'chart',
          chartId: secondChart.id,
          chartConfig: secondChart,
          title: secondChart.title || 'Visualisasi 2',
          x: 20 + halfWidth + 12,
          y: chartStartY,
          width: secondChart.chart_type === 'kpi_group' ? secondDims.width : halfWidth,
          height: secondChart.chart_type === 'kpi_group' ? secondDims.height : chartHeight,
          baseWidth: secondDims.baseWidth || halfWidth,
          baseHeight: secondDims.baseHeight || chartHeight,
          zIndex: 5,
        });
      } else if (firstChart) {
        const firstDims = getChartDefaultDimensions(firstChart, orientation, canvasWidth, canvasHeight);
        const fullWidth = canvasWidth - 40;
        const chartHeight = canvasHeight - chartStartY - 24;

        items.push({
          id: uid('chart'),
          type: 'chart',
          chartId: firstChart.id,
          chartConfig: firstChart,
          title: firstChart.title || 'Visualisasi',
          x: 20,
          y: chartStartY,
          width: firstChart.chart_type === 'kpi_group' ? firstDims.width : fullWidth,
          height: firstChart.chart_type === 'kpi_group' ? firstDims.height : chartHeight,
          baseWidth: firstDims.baseWidth || fullWidth,
          baseHeight: firstDims.baseHeight || chartHeight,
          zIndex: 5,
        });
      }
    }

    return items;
  }, [canvasWidth, canvasHeight, orientation, kpis, chartConfigs]);

  // Multi-Page State
  const [pages, setPages] = useState(() => [
    {
      id: 'page_1',
      title: 'Halaman 1',
      items: buildInitialPageItems(),
    },
  ]);
  const [activePageIndex, setActivePageIndex] = useState(0);

  // Active page object
  const activePage = pages[activePageIndex] || pages[0];

  const selectAllItems = useCallback(() => {
    if (!activePage) return;
    setSelectedItemIds(activePage.items.map((it) => it.id));
  }, [activePage]);

  // Helper to update active page items
  const setActivePageItems = useCallback(
    (updater) => {
      setPages((prevPages) => {
        const nextPages = [...prevPages];
        const currentPage = nextPages[activePageIndex];
        if (!currentPage) return prevPages;

        const updatedItems = typeof updater === 'function' ? updater(currentPage.items) : updater;
        nextPages[activePageIndex] = {
          ...currentPage,
          items: updatedItems,
        };
        return nextPages;
      });
    },
    [activePageIndex]
  );

  // Re-adjust bounds if orientation changes
  useEffect(() => {
    setActivePageItems((items) =>
      items.map((item) => {
        const maxW = Math.min(item.width, canvasWidth);
        const maxH = Math.min(item.height, canvasHeight);
        const clampedX = Math.max(0, Math.min(item.x, canvasWidth - maxW));
        const clampedY = Math.max(0, Math.min(item.y, canvasHeight - maxH));
        return {
          ...item,
          width: maxW,
          height: maxH,
          x: clampedX,
          y: clampedY,
        };
      })
    );
  }, [orientation, canvasWidth, canvasHeight, setActivePageItems]);

  // -------------------------------------------------------------
  // MULTI-PAGE ACTIONS
  // -------------------------------------------------------------
  const handleAddPage = () => {
    const newPageNum = pages.length + 1;
    const newPage = {
      id: uid('page'),
      title: `Halaman ${newPageNum}`,
      items: [
        {
          id: uid('header'),
          type: 'header',
          title: 'Kop Resmi TRAQ',
          x: 20,
          y: 18,
          width: canvasWidth - 40,
          height: 64,
          baseWidth: canvasWidth - 40,
          baseHeight: 64,
          zIndex: 2,
        },
      ],
    };
    setPages([...pages, newPage]);
    setActivePageIndex(pages.length);
    setSelectedItemId(null);
  };

  const handleRemovePage = async (pageIdxToRemove) => {
    if (pages.length <= 1) {
      await showAlert('Peringatan', 'Minimal harus ada 1 halaman laporan.');
      return;
    }

    const confirmed = await showConfirm(
      'Hapus Halaman',
      `Apakah Anda yakin ingin menghapus ${pages[pageIdxToRemove].title}? Seluruh visual di halaman ini akan dihapus.`
    );
    if (!confirmed) return;

    setPages((prev) => prev.filter((_, idx) => idx !== pageIdxToRemove));
    if (activePageIndex >= pageIdxToRemove) {
      setActivePageIndex(Math.max(0, activePageIndex - 1));
    }
    setSelectedItemId(null);
  };

  // -------------------------------------------------------------
  // ADD ITEMS TO ACTIVE CANVAS
  // -------------------------------------------------------------
  const handleAddChart = (cfg) => {
    const dims = getChartDefaultDimensions(cfg, orientation, canvasWidth, canvasHeight);
    const offset = (activePage.items.length % 5) * 20;

    const newItem = {
      id: uid('chart'),
      type: 'chart',
      chartId: cfg.id,
      chartConfig: cfg,
      title: cfg.title || 'Visualisasi',
      x: Math.min(40 + offset, canvasWidth - dims.width),
      y: Math.min(100 + offset, canvasHeight - dims.height),
      width: dims.width,
      height: dims.height,
      baseWidth: dims.baseWidth,
      baseHeight: dims.baseHeight,
      zIndex: 10,
    };

    setActivePageItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
  };

  const handleAddKpi = (label, val, sub, color) => {
    const offset = (activePage.items.length % 5) * 16;
    const defaultW = 220;
    const defaultH = 80;

    const newItem = {
      id: uid('kpi'),
      type: 'kpi',
      label: label,
      value: val,
      sub: sub,
      accentColor: color || 'var(--primary)',
      x: Math.min(40 + offset, canvasWidth - defaultW),
      y: Math.min(100 + offset, canvasHeight - defaultH),
      width: defaultW,
      height: defaultH,
      baseWidth: defaultW,
      baseHeight: defaultH,
      zIndex: 10,
    };

    setActivePageItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
  };

  const handleAddText = (kind) => {
    const offset = (activePage.items.length % 5) * 16;
    let initialText = 'Teks Judul Laporan';
    let fontSize = 24;
    let fontWeight = '700';
    let color = 'var(--text-primary)';
    let defaultW = 380;
    let defaultH = 46;

    if (kind === 'subtitle') {
      initialText = 'Sub-judul atau Keterangan Section';
      fontSize = 16;
      fontWeight = '600';
      color = 'var(--text-secondary)';
      defaultW = 320;
      defaultH = 36;
    } else if (kind === 'paragraph') {
      initialText = 'Tambahkan catatan atau ringkasan analisis operasional di sini...';
      fontSize = 13;
      fontWeight = '400';
      color = 'var(--text-muted)';
      defaultW = 300;
      defaultH = 64;
    }

    const newItem = {
      id: uid('text'),
      type: 'text',
      text: initialText,
      fontSize,
      fontWeight,
      textAlign: 'left',
      color,
      backgroundColor: 'transparent',
      x: Math.min(40 + offset, canvasWidth - defaultW),
      y: Math.min(100 + offset, canvasHeight - defaultH),
      width: defaultW,
      height: defaultH,
      zIndex: 20,
    };

    setActivePageItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
  };

  const handleAddBox = (kind) => {
    const offset = (activePage.items.length % 5) * 16;
    let defaultW = 400;
    let defaultH = 260;
    let backgroundColor = 'var(--surface-1)';
    let borderColor = 'var(--border-color)';
    let borderRadius = 8;
    let borderWidth = 1;

    if (kind === 'banner') {
      defaultW = canvasWidth - 40;
      defaultH = 50;
      backgroundColor = 'var(--surface-2)';
      borderColor = 'var(--primary)';
      borderRadius = 4;
    } else if (kind === 'divider') {
      defaultW = 350;
      defaultH = 4;
      backgroundColor = 'var(--primary)';
      borderColor = 'transparent';
      borderRadius = 2;
    }

    const newItem = {
      id: uid('box'),
      type: 'box',
      backgroundColor,
      borderColor,
      borderWidth,
      borderRadius,
      x: Math.min(40 + offset, canvasWidth - defaultW),
      y: Math.min(100 + offset, canvasHeight - defaultH),
      width: defaultW,
      height: defaultH,
      zIndex: 1,
    };

    setActivePageItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
  };

  const handleAddHeader = () => {
    const newItem = {
      id: uid('header'),
      type: 'header',
      title: 'Kop Resmi TRAQ',
      x: 20,
      y: 18,
      width: canvasWidth - 40,
      height: 64,
      baseWidth: canvasWidth - 40,
      baseHeight: 64,
      zIndex: 2,
    };

    setActivePageItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
  };

  // -------------------------------------------------------------
  // ITEM SELECTION & PROPERTY MODIFICATIONS (SINGLE & MULTI-TAG)
  // -------------------------------------------------------------
  const selectedItems = useMemo(() => {
    if (!activePage || selectedItemIds.length === 0) return [];
    return activePage.items.filter((it) => selectedItemIds.includes(it.id));
  }, [selectedItemIds, activePage]);

  const selectedItem = selectedItems[0] || null;

  // Combined Bounding Box for Multi-Selection
  const groupBoundingBox = useMemo(() => {
    if (selectedItemIds.length <= 1 || !activePage) return null;
    const items = activePage.items.filter((it) => selectedItemIds.includes(it.id));
    if (items.length <= 1) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    items.forEach((it) => {
      minX = Math.min(minX, it.x);
      minY = Math.min(minY, it.y);
      maxX = Math.max(maxX, it.x + it.width);
      maxY = Math.max(maxY, it.y + it.height);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      items,
    };
  }, [selectedItemIds, activePage]);

  const updateSelectedItem = useCallback(
    (patch) => {
      if (selectedItemIds.length === 0) return;
      setActivePageItems((items) =>
        items.map((it) => (selectedItemIds.includes(it.id) ? { ...it, ...patch } : it))
      );
    },
    [selectedItemIds, setActivePageItems]
  );

  const handleDeleteSelectedItem = useCallback(() => {
    if (selectedItemIds.length === 0) return;
    setActivePageItems((items) => items.filter((it) => !selectedItemIds.includes(it.id)));
    setSelectedItemIds([]);
  }, [selectedItemIds, setActivePageItems]);

  const handleDuplicateSelectedItem = useCallback(() => {
    if (selectedItemIds.length === 0 || !activePage) return;
    const itemsToDupe = activePage.items.filter((it) => selectedItemIds.includes(it.id));
    const duped = itemsToDupe.map((it) => ({
      ...it,
      id: uid(it.type),
      x: Math.min(it.x + 20, canvasWidth - it.width),
      y: Math.min(it.y + 20, canvasHeight - it.height),
    }));
    setActivePageItems((items) => [...items, ...duped]);
    setSelectedItemIds(duped.map((it) => it.id));
  }, [selectedItemIds, activePage, canvasWidth, canvasHeight, setActivePageItems]);

  const handleBringForward = useCallback(() => {
    if (selectedItemIds.length === 0) return;
    setActivePageItems((items) =>
      items.map((it) =>
        selectedItemIds.includes(it.id) ? { ...it, zIndex: (it.zIndex || 1) + 1 } : it
      )
    );
  }, [selectedItemIds, setActivePageItems]);

  const handleSendBackward = useCallback(() => {
    if (selectedItemIds.length === 0) return;
    setActivePageItems((items) =>
      items.map((it) =>
        selectedItemIds.includes(it.id)
          ? { ...it, zIndex: Math.max(1, (it.zIndex || 1) - 1) }
          : it
      )
    );
  }, [selectedItemIds, setActivePageItems]);

  // Spatial alignment and uniform sizing for tagged visuals
  const handleAlignSelected = useCallback(
    (type) => {
      if (selectedItemIds.length <= 1 || !activePage) return;
      const items = activePage.items.filter((it) => selectedItemIds.includes(it.id));
      if (items.length <= 1) return;

      const minX = Math.min(...items.map((it) => it.x));
      const maxX = Math.max(...items.map((it) => it.x + it.width));
      const minY = Math.min(...items.map((it) => it.y));
      const maxY = Math.max(...items.map((it) => it.y + it.height));

      const patchMap = new Map();

      if (type === 'left') {
        items.forEach((it) => patchMap.set(it.id, { x: minX }));
      } else if (type === 'right') {
        items.forEach((it) => patchMap.set(it.id, { x: maxX - it.width }));
      } else if (type === 'center-h') {
        const center = (minX + maxX) / 2;
        items.forEach((it) => patchMap.set(it.id, { x: Math.round(center - it.width / 2) }));
      } else if (type === 'top') {
        items.forEach((it) => patchMap.set(it.id, { y: minY }));
      } else if (type === 'bottom') {
        items.forEach((it) => patchMap.set(it.id, { y: maxY - it.height }));
      } else if (type === 'center-v') {
        const center = (minY + maxY) / 2;
        items.forEach((it) => patchMap.set(it.id, { y: Math.round(center - it.height / 2) }));
      } else if (type === 'equal-width') {
        const targetW = items[0].width;
        items.forEach((it) => patchMap.set(it.id, { width: targetW }));
      } else if (type === 'equal-height') {
        const targetH = items[0].height;
        items.forEach((it) => patchMap.set(it.id, { height: targetH }));
      } else if (type === 'equal-size') {
        const targetW = items[0].width;
        const targetH = items[0].height;
        items.forEach((it) => patchMap.set(it.id, { width: targetW, height: targetH }));
      }

      setActivePageItems((pItems) =>
        pItems.map((it) => {
          const patch = patchMap.get(it.id);
          return patch ? { ...it, ...patch } : it;
        })
      );
    },
    [selectedItemIds, activePage, setActivePageItems]
  );

  // Keyboard Shortcuts (Delete, Backspace, Esc, Ctrl+A)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAllItems();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItemIds.length > 0) {
          e.preventDefault();
          handleDeleteSelectedItem();
        }
      } else if (e.key === 'Escape') {
        setSelectedItemIds([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemIds, handleDeleteSelectedItem, selectAllItems]);

  // -------------------------------------------------------------
  // PROPORTIONAL CORNER & SIDE RESIZE ENGINE (SINGLE & GROUP)
  // -------------------------------------------------------------
  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  const handleItemPointerDown = (e, item) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;

    let nextSelectedIds;
    if (isMulti) {
      if (selectedItemIds.includes(item.id)) {
        nextSelectedIds = selectedItemIds.filter((id) => id !== item.id);
      } else {
        nextSelectedIds = [...selectedItemIds, item.id];
      }
      setSelectedItemIds(nextSelectedIds);
      if (!nextSelectedIds.includes(item.id)) return;
    } else {
      if (selectedItemIds.includes(item.id) && selectedItemIds.length > 1) {
        nextSelectedIds = selectedItemIds;
      } else {
        nextSelectedIds = [item.id];
        setSelectedItemIds(nextSelectedIds);
      }
    }

    const itemsToDrag = activePage.items.filter((it) => nextSelectedIds.includes(it.id));
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      items: itemsToDrag.map((it) => ({
        id: it.id,
        origX: it.x,
        origY: it.y,
        width: it.width,
        height: it.height,
      })),
    };
  };

  const handleHandlePointerDown = (e, handleType, item) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    setSelectedItemId(item.id);

    resizeRef.current = {
      isGroup: false,
      itemId: item.id,
      handle: handleType,
      startX: e.clientX,
      startY: e.clientY,
      origX: item.x,
      origY: item.y,
      origW: item.width,
      origH: item.height,
      type: item.type,
    };
  };

  const handleGroupHandlePointerDown = (e, handleType, boundingBox) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const itemsData = boundingBox.items.map((it) => ({
      id: it.id,
      origX: it.x,
      origY: it.y,
      origW: it.width,
      origH: it.height,
      relX: (it.x - boundingBox.x) / boundingBox.width,
      relY: (it.y - boundingBox.y) / boundingBox.height,
      relW: it.width / boundingBox.width,
      relH: it.height / boundingBox.height,
    }));

    resizeRef.current = {
      isGroup: true,
      handle: handleType,
      startX: e.clientX,
      startY: e.clientY,
      origBoxX: boundingBox.x,
      origBoxY: boundingBox.y,
      origBoxW: boundingBox.width,
      origBoxH: boundingBox.height,
      items: itemsData,
    };
  };

  const snap = useCallback(
    (val) => {
      if (!snapToGrid) return val;
      return Math.round(val / gridSize) * gridSize;
    },
    [snapToGrid, gridSize]
  );

  useEffect(() => {
    const onPointerMove = (e) => {
      // 1. Dragging item or multiple tagged items
      if (dragRef.current) {
        const { startX, startY, items } = dragRef.current;
        const dx = (e.clientX - startX) / zoom;
        const dy = (e.clientY - startY) / zoom;

        const minAllowedDx = -Math.min(...items.map((it) => it.origX));
        const maxAllowedDx = Math.min(...items.map((it) => canvasWidth - (it.origX + it.width)));
        const minAllowedDy = -Math.min(...items.map((it) => it.origY));
        const maxAllowedDy = Math.min(...items.map((it) => canvasHeight - (it.origY + it.height)));

        const clampedDx = snap(Math.max(minAllowedDx, Math.min(dx, maxAllowedDx)));
        const clampedDy = snap(Math.max(minAllowedDy, Math.min(dy, maxAllowedDy)));

        if (items.length === 1) {
          const it = items[0];
          const centerX = it.origX + clampedDx + it.width / 2;
          const canvasCenterX = canvasWidth / 2;
          if (Math.abs(centerX - canvasCenterX) < 6) {
            setGuideLineX(canvasCenterX);
          } else if (it.origX + clampedDx < 6) {
            setGuideLineX(0);
          } else if (Math.abs(it.origX + clampedDx + it.width - canvasWidth) < 6) {
            setGuideLineX(canvasWidth);
          } else {
            setGuideLineX(null);
          }

          const centerY = it.origY + clampedDy + it.height / 2;
          const canvasCenterY = canvasHeight / 2;
          if (Math.abs(centerY - canvasCenterY) < 6) {
            setGuideLineY(canvasCenterY);
          } else {
            setGuideLineY(null);
          }
        } else {
          setGuideLineX(null);
          setGuideLineY(null);
        }

        const idMap = new Map();
        items.forEach((it) => {
          idMap.set(it.id, { x: it.origX + clampedDx, y: it.origY + clampedDy });
        });

        setActivePageItems((pageItems) =>
          pageItems.map((it) => {
            const pos = idMap.get(it.id);
            return pos ? { ...it, x: pos.x, y: pos.y } : it;
          })
        );
        return;
      }

      // 2. Resizing items via handles
      if (resizeRef.current) {
        // CASE A: GROUP RESIZING (Multiple Tagged Visuals simultaneously)
        if (resizeRef.current.isGroup) {
          const { handle, startX, startY, origBoxX, origBoxY, origBoxW, origBoxH, items } =
            resizeRef.current;
          const dx = (e.clientX - startX) / zoom;
          const dy = (e.clientY - startY) / zoom;

          let newBoxX = origBoxX;
          let newBoxY = origBoxY;
          let newBoxW = origBoxW;
          let newBoxH = origBoxH;

          const minBoxW = 80;
          const minBoxH = 40;
          const isCorner = ['se', 'sw', 'ne', 'nw'].includes(handle);
          const ratio = origBoxW / Math.max(1, origBoxH);

          if (isCorner) {
            if (handle === 'se') {
              const delta = Math.abs(dx) >= Math.abs(dy * ratio) ? dx : dy * ratio;
              newBoxW = snap(Math.max(minBoxW, origBoxW + delta));
              newBoxH = snap(Math.max(minBoxH, Math.round(newBoxW / ratio)));
              if (newBoxX + newBoxW > canvasWidth) {
                newBoxW = canvasWidth - newBoxX;
                newBoxH = snap(Math.max(minBoxH, Math.round(newBoxW / ratio)));
              }
              if (newBoxY + newBoxH > canvasHeight) {
                newBoxH = canvasHeight - newBoxY;
                newBoxW = snap(Math.max(minBoxW, Math.round(newBoxH * ratio)));
              }
            } else if (handle === 'sw') {
              const delta = Math.abs(dx) >= Math.abs(dy * ratio) ? -dx : dy * ratio;
              newBoxW = snap(Math.max(minBoxW, origBoxW + delta));
              newBoxH = snap(Math.max(minBoxH, Math.round(newBoxW / ratio)));
              newBoxX = origBoxX - (newBoxW - origBoxW);
              if (newBoxX < 0) {
                newBoxX = 0;
                newBoxW = origBoxX + origBoxW;
                newBoxH = snap(Math.max(minBoxH, Math.round(newBoxW / ratio)));
              }
              if (newBoxY + newBoxH > canvasHeight) {
                newBoxH = canvasHeight - newBoxY;
                newBoxW = snap(Math.max(minBoxW, Math.round(newBoxH * ratio)));
                newBoxX = origBoxX - (newBoxW - origBoxW);
              }
            } else if (handle === 'ne') {
              const delta = Math.abs(dx) >= Math.abs(dy * ratio) ? dx : -dy * ratio;
              newBoxW = snap(Math.max(minBoxW, origBoxW + delta));
              newBoxH = snap(Math.max(minBoxH, Math.round(newBoxW / ratio)));
              newBoxY = origBoxY - (newBoxH - origBoxH);
              if (newBoxX + newBoxW > canvasWidth) {
                newBoxW = canvasWidth - newBoxX;
                newBoxH = snap(Math.max(minBoxH, Math.round(newBoxW / ratio)));
                newBoxY = origBoxY - (newBoxH - origBoxH);
              }
              if (newBoxY < 0) {
                newBoxY = 0;
                newBoxH = origBoxY + origBoxH;
                newBoxW = snap(Math.round(newBoxH * ratio));
              }
            } else if (handle === 'nw') {
              const delta = Math.abs(dx) >= Math.abs(dy * ratio) ? -dx : -dy * ratio;
              newBoxW = snap(Math.max(minBoxW, origBoxW + delta));
              newBoxH = snap(Math.max(minBoxH, Math.round(newBoxW / ratio)));
              newBoxX = origBoxX - (newBoxW - origBoxW);
              newBoxY = origBoxY - (newBoxH - origBoxH);
              if (newBoxX < 0) {
                newBoxX = 0;
                newBoxW = origBoxX + origBoxW;
                newBoxH = snap(Math.max(minBoxH, Math.round(newBoxW / ratio)));
              }
              if (newBoxY < 0) {
                newBoxY = 0;
                newBoxH = origBoxY + origBoxH;
                newBoxW = snap(Math.round(newBoxH * ratio));
                newBoxX = origBoxX - (newBoxW - origBoxW);
              }
            }
          } else {
            if (handle.includes('e')) {
              newBoxW = snap(Math.max(minBoxW, origBoxW + dx));
              newBoxW = Math.min(newBoxW, canvasWidth - newBoxX);
            }
            if (handle.includes('s')) {
              newBoxH = snap(Math.max(minBoxH, origBoxH + dy));
              newBoxH = Math.min(newBoxH, canvasHeight - newBoxY);
            }
            if (handle.includes('w')) {
              const rawW = origBoxW - dx;
              if (rawW >= minBoxW) {
                newBoxX = snap(origBoxX + dx);
                newBoxX = Math.max(0, newBoxX);
                newBoxW = origBoxW - (newBoxX - origBoxX);
              }
            }
            if (handle.includes('n')) {
              const rawH = origBoxH - dy;
              if (rawH >= minBoxH) {
                newBoxY = snap(origBoxY + dy);
                newBoxY = Math.max(0, newBoxY);
                newBoxH = origBoxH - (newBoxY - origBoxY);
              }
            }
          }

          const updatedMap = new Map();
          items.forEach((it) => {
            const nextX = Math.round(newBoxX + it.relX * newBoxW);
            const nextY = Math.round(newBoxY + it.relY * newBoxH);
            const nextW = Math.max(30, Math.round(it.relW * newBoxW));
            const nextH = Math.max(20, Math.round(it.relH * newBoxH));
            updatedMap.set(it.id, { x: nextX, y: nextY, width: nextW, height: nextH });
          });

          setActivePageItems((pageItems) =>
            pageItems.map((it) => {
              const u = updatedMap.get(it.id);
              return u ? { ...it, ...u } : it;
            })
          );
          return;
        }

        // CASE B: SINGLE ITEM RESIZING (Proportional corner resize like Canva/Photoshop)
        const { itemId, handle, startX, startY, origX, origY, origW, origH } = resizeRef.current;
        const dx = (e.clientX - startX) / zoom;
        const dy = (e.clientY - startY) / zoom;

        let newX = origX;
        let newY = origY;
        let newW = origW;
        let newH = origH;

        const minW = 60;
        const minH = 30;
        const isCorner = ['se', 'sw', 'ne', 'nw'].includes(handle);
        const ratio = origW / Math.max(1, origH);

        if (isCorner) {
          if (handle === 'se') {
            const delta = Math.abs(dx) >= Math.abs(dy * ratio) ? dx : dy * ratio;
            newW = snap(Math.max(minW, origW + delta));
            newH = snap(Math.max(minH, Math.round(newW / ratio)));

            if (newX + newW > canvasWidth) {
              newW = canvasWidth - newX;
              newH = snap(Math.max(minH, Math.round(newW / ratio)));
            }
            if (newY + newH > canvasHeight) {
              newH = canvasHeight - newY;
              newW = snap(Math.max(minW, Math.round(newH * ratio)));
            }
          } else if (handle === 'sw') {
            const delta = Math.abs(dx) >= Math.abs(dy * ratio) ? -dx : dy * ratio;
            newW = snap(Math.max(minW, origW + delta));
            newH = snap(Math.max(minH, Math.round(newW / ratio)));
            newX = origX - (newW - origW);

            if (newX < 0) {
              newX = 0;
              newW = origX + origW;
              newH = snap(Math.max(minH, Math.round(newW / ratio)));
            }
            if (newY + newH > canvasHeight) {
              newH = canvasHeight - newY;
              newW = snap(Math.max(minW, Math.round(newH * ratio)));
              newX = origX - (newW - origW);
            }
          } else if (handle === 'ne') {
            const delta = Math.abs(dx) >= Math.abs(dy * ratio) ? dx : -dy * ratio;
            newW = snap(Math.max(minW, origW + delta));
            newH = snap(Math.max(minH, Math.round(newW / ratio)));
            newY = origY - (newH - origH);

            if (newX + newW > canvasWidth) {
              newW = canvasWidth - newX;
              newH = snap(Math.max(minH, Math.round(newW / ratio)));
              newY = origY - (newH - origH);
            }
            if (newY < 0) {
              newY = 0;
              newH = origY + origH;
              newW = snap(Math.round(newH * ratio));
            }
          } else if (handle === 'nw') {
            const delta = Math.abs(dx) >= Math.abs(dy * ratio) ? -dx : -dy * ratio;
            newW = snap(Math.max(minW, origW + delta));
            newH = snap(Math.max(minH, Math.round(newW / ratio)));
            newX = origX - (newW - origW);
            newY = origY - (newH - origH);

            if (newX < 0) {
              newX = 0;
              newW = origX + origW;
              newH = snap(Math.max(minH, Math.round(newW / ratio)));
              newY = origY - (newH - origH);
            }
            if (newY < 0) {
              newY = 0;
              newH = origY + origH;
              newW = snap(Math.round(newH * ratio));
              newX = origX - (newW - origW);
            }
          }
        } else {
          // SIDE HANDLES: Free stretch
          if (handle.includes('e')) {
            newW = snap(Math.max(minW, origW + dx));
            newW = Math.min(newW, canvasWidth - newX);
          }
          if (handle.includes('s')) {
            newH = snap(Math.max(minH, origH + dy));
            newH = Math.min(newH, canvasHeight - newY);
          }
          if (handle.includes('w')) {
            const rawW = origW - dx;
            if (rawW >= minW) {
              newX = snap(origX + dx);
              newX = Math.max(0, newX);
              newW = origW - (newX - origX);
            }
          }
          if (handle.includes('n')) {
            const rawH = origH - dy;
            if (rawH >= minH) {
              newY = snap(origY + dy);
              newY = Math.max(0, newY);
              newH = origH - (newY - origY);
            }
          }
        }

        setActivePageItems((items) =>
          items.map((it) =>
            it.id === itemId
              ? { ...it, x: newX, y: newY, width: newW, height: newH }
              : it
          )
        );
      }
    };

    const onPointerUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
      setGuideLineX(null);
      setGuideLineY(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [zoom, canvasWidth, canvasHeight, snap, setActivePageItems]);

  // -------------------------------------------------------------
  // EXPORT PROCESS
  // -------------------------------------------------------------
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportStatusText('Mempersiapkan render kanvas...');
      setSelectedItemId(null);

      await new Promise((r) => setTimeout(r, 150));

      const offscreenContainer = offscreenContainerRef.current;
      if (!offscreenContainer) {
        throw new Error('Container render tidak ditemukan.');
      }

      const pageDoms = offscreenContainer.querySelectorAll('[data-export-page]');
      if (!pageDoms || pageDoms.length === 0) {
        throw new Error('Tidak ada halaman yang siap diekspor.');
      }

      const safeFilename = (defaultFilename || 'TRAQ_Laporan')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_');

      // Theme-adaptive background for exported PDF/PNG derived from computed CSS variables
      const computedSurface = getComputedStyle(document.documentElement)
        .getPropertyValue('--surface-0')
        .trim();
      const exportBgColor = computedSurface || (isDark ? '#121621' : '#FFFFFF');

      await exportMultiPageCanvas(Array.from(pageDoms), {
        filename: safeFilename,
        format: format,
        orientation: orientation,
        backgroundColor: exportBgColor,
        onProgress: (curr, total, msg) => {
          setExportStatusText(msg);
        },
      });

      setExportStatusText('Ekspor selesai!');
      await new Promise((r) => setTimeout(r, 500));
      setIsExporting(false);
      onClose();
    } catch (err) {
      console.error('Export error:', err);
      setIsExporting(false);
      await showAlert('Gagal Mengekspor', `Terjadi kesalahan saat memproses ekspor: ${err.message}`);
    }
  };

  const handleResetLayout = async () => {
    const confirmed = await showConfirm(
      'Reset Tata Letak',
      'Kembalikan seluruh halaman dan visual ke susunan awal default?'
    );
    if (!confirmed) return;

    setPages([
      {
        id: uid('page'),
        title: 'Halaman 1',
        items: buildInitialPageItems(),
      },
    ]);
    setActivePageIndex(0);
    setSelectedItemId(null);
  };

  const totalItemsCount = useMemo(() => {
    return pages.reduce((acc, p) => acc + p.items.length, 0);
  }, [pages]);

  if (!isOpen) return null;

  return createPortal(
    <div className="export-modal-overlay" onClick={() => setSelectedItemId(null)}>
      <div
        className="export-modal-container"
        data-theme={theme}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================
            1. MODAL HEADER BAR
            ============================================================ */}
        <div className="export-modal-header">
          <div className="export-header-left">
            <div className="export-modal-title">
              <Maximize2 size={20} color="var(--primary)" />
              <span>Studio Tata Letak Ekspor</span>
              <span className="export-modal-badge">Kanvas Bebas</span>
            </div>
            <div className="export-header-meta">
              <span>{pageTitle}</span>
              <span>•</span>
              <span>{periodLabel}</span>
              {satpelLabel && (
                <>
                  <span>•</span>
                  <span>{satpelLabel}</span>
                </>
              )}
            </div>
          </div>

          <div className="export-header-actions">
            <button
              type="button"
              className="export-icon-btn"
              onClick={handleResetLayout}
              title="Reset ke Tata Letak Bawaan"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              className="export-icon-btn"
              onClick={onClose}
              title="Tutup Studio Ekspor"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ============================================================
            2. MODAL BODY (SPLIT VIEW)
            ============================================================ */}
        <div className="export-modal-body">
          {/* ---------------- LEFT PANEL: PALETTE & TABS ---------------- */}
          <div className="export-sidebar">
            <div className="export-sidebar-nav">
              <button
                type="button"
                className={`export-sidebar-tab-btn ${activeTab === 'visuals' ? 'activeTab' : ''}`}
                onClick={() => setActiveTab('visuals')}
              >
                <BarChart3 size={15} />
                <span>Grafik & KPI</span>
              </button>
              <button
                type="button"
                className={`export-sidebar-tab-btn ${activeTab === 'elements' ? 'activeTab' : ''}`}
                onClick={() => setActiveTab('elements')}
              >
                <Type size={15} />
                <span>Teks & Kotak</span>
              </button>
              <button
                type="button"
                className={`export-sidebar-tab-btn ${activeTab === 'settings' ? 'activeTab' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <Sliders size={15} />
                <span>Pengaturan</span>
              </button>
            </div>

            <div className="export-sidebar-content">
              {/* TAB 1: VISUALS & KPIS */}
              {activeTab === 'visuals' && (
                <>
                  <div>
                    <div className="export-section-title">
                      <span>Metrik Ringkasan KPI</span>
                    </div>
                    <div className="export-elements-grid">
                      <button
                        type="button"
                        className="export-element-btn"
                        onClick={() =>
                          handleAddKpi(
                            'Total Sertifikat',
                            formatNumber(kpis.totalSertifikat || 0),
                            'Dokumen Operasional',
                            'var(--primary)'
                          )
                        }
                      >
                        <Sparkles size={18} />
                        <span>+ Total Sertifikat</span>
                      </button>
                      <button
                        type="button"
                        className="export-element-btn"
                        onClick={() =>
                          handleAddKpi(
                            'Karantina Hewan',
                            formatNumber(kpis.hewanCount || 0),
                            `${kpis.hewanPercent || 0}% Total`,
                            'var(--accent-amber)'
                          )
                        }
                      >
                        <Sparkles size={18} />
                        <span>+ Karantina Hewan</span>
                      </button>
                      <button
                        type="button"
                        className="export-element-btn"
                        onClick={() =>
                          handleAddKpi(
                            'Karantina Ikan',
                            formatNumber(kpis.ikanCount || 0),
                            `${kpis.ikanPercent || 0}% Total`,
                            'var(--accent-teal)'
                          )
                        }
                      >
                        <Sparkles size={18} />
                        <span>+ Karantina Ikan</span>
                      </button>
                      <button
                        type="button"
                        className="export-element-btn"
                        onClick={() =>
                          handleAddKpi(
                            'Karantina Tumbuhan',
                            formatNumber(kpis.tumbuhanCount || 0),
                            `${kpis.tumbuhanPercent || 0}% Total`,
                            'var(--accent-green)'
                          )
                        }
                      >
                        <Sparkles size={18} />
                        <span>+ Tumbuhan</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="export-section-title">
                      <span>Grafik Dashboard ({chartConfigs.length})</span>
                    </div>

                    <div className="export-visuals-list">
                      {chartConfigs.map((cfg) => {
                        const matchingPageItems = activePage.items.filter(
                          (it) => it.type === 'chart' && it.chartId === cfg.id
                        );
                        const isAlreadyOnPage = matchingPageItems.length > 0;
                        const isTagged =
                          isAlreadyOnPage &&
                          matchingPageItems.some((it) => selectedItemIds.includes(it.id));

                        return (
                          <div key={cfg.id} className="export-visual-card">
                            <div className="export-visual-card-info">
                              <div className="export-visual-card-title" title={cfg.title}>
                                {cfg.title || 'Grafik Tanpa Judul'}
                              </div>
                              <div className="export-visual-card-type">
                                Tipe: {cfg.chart_type || 'Bar Chart'}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              {isAlreadyOnPage && (
                                <button
                                  type="button"
                                  className={`export-tag-indicator-btn ${isTagged ? 'tagged' : ''}`}
                                  onClick={() => {
                                    matchingPageItems.forEach((it) => toggleItemSelection(it.id));
                                  }}
                                  title={isTagged ? 'Lepas Tag Visual' : 'Tag / Tandai Visual Ini (Multi-select)'}
                                >
                                  <Tag size={12} />
                                  <span>{isTagged ? 'Ditandai' : 'Tag'}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                className="export-add-visual-btn"
                                onClick={() => handleAddChart(cfg)}
                                title="Tambahkan grafik ke halaman aktif"
                              >
                                <Plus size={14} />
                                <span>{isAlreadyOnPage ? 'Tambah Lagi' : 'Tambah'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {chartConfigs.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          Tidak ada grafik yang dikonfigurasi pada dashboard ini.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: TEXT & SHAPE ELEMENTS */}
              {activeTab === 'elements' && (
                <>
                  <div>
                    <div className="export-section-title">
                      <span>Elemen Teks Bebas</span>
                    </div>
                    <div className="export-elements-grid">
                      <button
                        type="button"
                        className="export-element-btn"
                        onClick={() => handleAddText('title')}
                      >
                        <Type size={20} />
                        <span>+ Judul Laporan</span>
                      </button>
                      <button
                        type="button"
                        className="export-element-btn"
                        onClick={() => handleAddText('subtitle')}
                      >
                        <Type size={16} />
                        <span>+ Sub-Judul</span>
                      </button>
                      <button
                        type="button"
                        className="export-element-btn"
                        onClick={() => handleAddText('paragraph')}
                      >
                        <FileText size={18} />
                        <span>+ Catatan / Teks</span>
                      </button>
                      <button
                        type="button"
                        className="export-element-btn"
                        onClick={handleAddHeader}
                        title="Tambahkan Kop Surat Balai TRAQ"
                      >
                        <Layers size={18} />
                        <span>+ Kop TRAQ</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="export-section-title">
                      <span>Kotak & Kontainer Shape</span>
                    </div>
                    <div className="export-elements-grid">
                      <button
                        type="button"
                        className="export-element-btn"
                        onClick={() => handleAddBox('card')}
                      >
                        <Square size={20} />
                        <span>+ Kotak Card</span>
                      </button>
                      <button
                        type="button"
                        className="export-element-btn"
                        onClick={() => handleAddBox('banner')}
                      >
                        <Square size={16} style={{ transform: 'scaleX(1.4)' }} />
                        <span>+ Banner Section</span>
                      </button>
                      <button
                        type="button"
                        className="export-element-btn"
                        onClick={() => handleAddBox('divider')}
                      >
                        <div style={{ width: 24, height: 3, background: 'var(--primary)', borderRadius: 2 }} />
                        <span>+ Garis Pembatas</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 3: SETTINGS & GUIDES */}
              {activeTab === 'settings' && (
                <>
                  <div className="export-control-group">
                    <label className="export-control-label">Orientasi Kertas A4</label>
                    <div className="export-segmented-control">
                      <button
                        type="button"
                        className={`export-segment-btn ${orientation === 'landscape' ? 'activeSegment' : ''}`}
                        onClick={() => setOrientation('landscape')}
                      >
                        <span>Landscape (297×210)</span>
                      </button>
                      <button
                        type="button"
                        className={`export-segment-btn ${orientation === 'portrait' ? 'activeSegment' : ''}`}
                        onClick={() => setOrientation('portrait')}
                      >
                        <span>Portrait (210×297)</span>
                      </button>
                    </div>
                  </div>

                  <div className="export-control-group">
                    <label className="export-control-label">Format Berkas Ekspor</label>
                    <div className="export-segmented-control">
                      <button
                        type="button"
                        className={`export-segment-btn ${format === 'pdf' ? 'activeSegment' : ''}`}
                        onClick={() => setFormat('pdf')}
                      >
                        <FileText size={15} />
                        <span>Dokumen PDF</span>
                      </button>
                      <button
                        type="button"
                        className={`export-segment-btn ${format === 'png' ? 'activeSegment' : ''}`}
                        onClick={() => setFormat('png')}
                      >
                        <FileImage size={15} />
                        <span>Gambar PNG</span>
                      </button>
                    </div>
                  </div>

                  <div className="export-control-group">
                    <label className="export-control-label">Garis Bantu & Kerapian</label>
                    <label className="export-checkbox-row">
                      <span>Tampilkan Garis Bantu (Grid)</span>
                      <input
                        type="checkbox"
                        checked={showGrid}
                        onChange={(e) => setShowGrid(e.target.checked)}
                      />
                    </label>
                    <label className="export-checkbox-row">
                      <span>Snap to Grid (Otomatis Rapi)</span>
                      <input
                        type="checkbox"
                        checked={snapToGrid}
                        onChange={(e) => setSnapToGrid(e.target.checked)}
                      />
                    </label>
                  </div>

                  <div className="export-control-group">
                    <label className="export-control-label">Jarak Grid Magnet ({gridSize}px)</label>
                    <div className="export-segmented-control">
                      <button
                        type="button"
                        className={`export-segment-btn ${gridSize === 10 ? 'activeSegment' : ''}`}
                        onClick={() => setGridSize(10)}
                      >
                        <span>10px (Halus)</span>
                      </button>
                      <button
                        type="button"
                        className={`export-segment-btn ${gridSize === 20 ? 'activeSegment' : ''}`}
                        onClick={() => setGridSize(20)}
                      >
                        <span>20px (Tegas)</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ---------------- RIGHT PANEL: MULTI-PAGE CANVAS WORKSPACE ---------------- */}
          <div className="export-canvas-workspace" onClick={() => setSelectedItemId(null)}>
            <div className="export-workspace-topbar" onClick={(e) => e.stopPropagation()}>
              {/* Multi-Page Tabs */}
              <div className="export-page-tabs-list">
                {pages.map((page, idx) => (
                  <div
                    key={page.id}
                    className={`export-page-tab ${idx === activePageIndex ? 'activePageTab' : ''}`}
                    onClick={() => {
                      setActivePageIndex(idx);
                      setSelectedItemId(null);
                    }}
                  >
                    <span>{page.title}</span>
                    {pages.length > 1 && (
                      <button
                        type="button"
                        className="export-icon-btn"
                        style={{ padding: '0.15rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePage(idx);
                        }}
                        title="Hapus Halaman Ini"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  className="export-add-page-btn"
                  onClick={handleAddPage}
                  title="Tambah Halaman Baru"
                >
                  <Plus size={13} />
                  <span>Halaman Baru</span>
                </button>
              </div>

              {/* View Tools & Zoom */}
              <div className="export-canvas-view-tools">
                {activePage.items.length > 0 && (
                  <>
                    <button
                      type="button"
                      className={`export-icon-btn ${selectedItemIds.length === activePage.items.length ? 'active' : ''}`}
                      onClick={() => {
                        if (selectedItemIds.length === activePage.items.length) {
                          clearSelection();
                        } else {
                          selectAllItems();
                        }
                      }}
                      title={
                        selectedItemIds.length === activePage.items.length
                          ? 'Batal Tag Semua (Esc)'
                          : 'Tag Semua Visual di Halaman (Ctrl+A)'
                      }
                    >
                      <Tag size={15} />
                    </button>
                    <div className="export-tool-divider" />
                  </>
                )}

                <button
                  type="button"
                  className={`export-icon-btn ${showGrid ? 'active' : ''}`}
                  onClick={() => setShowGrid(!showGrid)}
                  title={showGrid ? 'Sembunyikan Garis Bantu' : 'Tampilkan Garis Bantu'}
                >
                  <Grid size={15} />
                </button>

                <button
                  type="button"
                  className={`export-icon-btn ${snapToGrid ? 'active' : ''}`}
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  title={snapToGrid ? 'Snap to Grid Aktif' : 'Snap to Grid Nonaktif'}
                >
                  <Magnet size={15} />
                </button>

                <div className="export-tool-divider" />

                <button
                  type="button"
                  className="export-icon-btn"
                  onClick={() => setZoom(Math.max(0.4, Number((zoom - 0.1).toFixed(2))))}
                  title="Perkecil Kanvas"
                >
                  <ZoomOut size={15} />
                </button>
                <span className="export-tool-badge">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  className="export-icon-btn"
                  onClick={() => setZoom(Math.min(1.4, Number((zoom + 0.1).toFixed(2))))}
                  title="Perbesar Kanvas"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  type="button"
                  className="export-icon-btn"
                  onClick={() => setZoom(0.85)}
                  title="Reset Ukuran Kanvas"
                >
                  Fit
                </button>
              </div>
            </div>

            {/* Canvas Scroll Area */}
            <div className="export-canvas-scroll-area">
              <div
                className="export-zoom-wrapper"
                style={{ transform: `scale(${zoom})` }}
              >
                {/* Active A4 Sheet (Theme-Adaptive Paper using Global CSS) */}
                <div
                  ref={canvasRef}
                  className={`export-canvas-sheet ${orientation === 'landscape' ? 'export-canvas-landscape' : 'export-canvas-portrait'}`}
                  data-theme={theme}
                  onClick={(e) => {
                    if (
                      e.target === canvasRef.current ||
                      e.target.classList.contains('export-canvas-sheet') ||
                      e.target.classList.contains('export-grid-overlay')
                    ) {
                      setSelectedItemIds([]);
                    }
                  }}
                >
                  {showGrid && <div className="export-grid-overlay" />}

                  {guideLineX !== null && (
                    <div className="export-guideline-x" style={{ left: `${guideLineX}px` }} />
                  )}
                  {guideLineY !== null && (
                    <div className="export-guideline-y" style={{ top: `${guideLineY}px` }} />
                  )}

                  {/* Render All Canvas Items with Transform Scaling */}
                  {activePage.items.map((item) => {
                    const isSelected = selectedItemIds.includes(item.id);
                    const isSingleSelected = isSelected && selectedItemIds.length === 1;
                    const isMultiSelected = isSelected && selectedItemIds.length > 1;
                    const tagIndex = selectedItemIds.indexOf(item.id);

                    let baseW = item.baseWidth || item.width || 460;
                    let baseH = item.baseHeight || item.height || 280;

                    const isKpiGroup = item.chartConfig?.chart_type === 'kpi_group';
                    const isKpiCard = item.chartConfig?.chart_type === 'kpi_card';

                    if (isKpiGroup) {
                      const kpiItems =
                        item.chartConfig?.config?.kpi_items ||
                        item.chartConfig?.config?.kpiItems ||
                        [];
                      const count = Math.max(1, kpiItems.length);
                      const hasTitle =
                        item.chartConfig?.config?.show_group_title !== false &&
                        item.title &&
                        ![
                          'kpi group',
                          'visualisasi data',
                          'untitled',
                          'tanpa judul',
                          'pratinjau visualisasi data',
                        ].includes(String(item.title).toLowerCase().trim());
                      const titleH = hasTitle ? 36 : 0;
                      const naturalH = count * 110 + Math.max(0, count - 1) * 12 + titleH;

                      if (baseH < naturalH) {
                        baseH = naturalH;
                      }
                    }

                    const scaleX = item.width / baseW;
                    const scaleY = item.height / baseH;

                    return (
                      <div
                        key={item.id}
                        className={`export-canvas-item ${isSelected ? 'export-item-selected' : ''}`}
                        style={{
                          left: `${item.x}px`,
                          top: `${item.y}px`,
                          width: `${item.width}px`,
                          height: `${item.height}px`,
                          zIndex: isSelected ? 99 : item.zIndex || 1,
                        }}
                        onPointerDown={(e) => handleItemPointerDown(e, item)}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        {/* Visual Tag Badge for Multi-Selection */}
                        {isMultiSelected && (
                          <div className="export-tag-item-badge">
                            <Check size={10} strokeWidth={3} />
                            <span>Tag #{tagIndex + 1}</span>
                          </div>
                        )}

                        {/* FLOATING TOOLBAR (Single Item Selected Only) */}
                        {isSingleSelected && (
                          <div
                            className="export-floating-toolbar"
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="export-floating-tool-btn"
                              onClick={handleBringForward}
                              title="Bawa ke Depan"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              className="export-floating-tool-btn"
                              onClick={handleSendBackward}
                              title="Kirim ke Belakang"
                            >
                              <ArrowDown size={13} />
                            </button>
                            <button
                              type="button"
                              className="export-floating-tool-btn"
                              onClick={handleDuplicateSelectedItem}
                              title="Duplikat Elemen"
                            >
                              <Copy size={13} />
                            </button>

                            {item.type === 'text' && (
                              <>
                                <div className="export-tool-divider" />
                                <button
                                  type="button"
                                  className="export-floating-tool-btn"
                                  onClick={() =>
                                    updateSelectedItem({
                                      fontSize:
                                        item.fontSize === 14 ? 20 : item.fontSize === 20 ? 26 : 14,
                                    })
                                  }
                                  title="Ganti Ukuran Font"
                                >
                                  {item.fontSize}px
                                </button>
                                <button
                                  type="button"
                                  className={`export-floating-tool-btn ${item.fontWeight === '700' ? 'active' : ''}`}
                                  onClick={() =>
                                    updateSelectedItem({
                                      fontWeight: item.fontWeight === '700' ? '400' : '700',
                                    })
                                  }
                                  title="Tebal / Normal"
                                >
                                  <Bold size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="export-floating-tool-btn"
                                  onClick={() =>
                                    updateSelectedItem({
                                      textAlign:
                                        item.textAlign === 'left'
                                          ? 'center'
                                          : item.textAlign === 'center'
                                          ? 'right'
                                          : 'left',
                                    })
                                  }
                                  title="Rata Teks"
                                >
                                  {item.textAlign === 'left' && <AlignLeft size={13} />}
                                  {item.textAlign === 'center' && <AlignCenter size={13} />}
                                  {item.textAlign === 'right' && <AlignRight size={13} />}
                                </button>
                              </>
                            )}

                            {item.type === 'box' && (
                              <>
                                <div className="export-tool-divider" />
                                <button
                                  type="button"
                                  className="export-floating-tool-btn"
                                  onClick={() =>
                                    updateSelectedItem({
                                      backgroundColor:
                                        item.backgroundColor === 'var(--surface-1)'
                                          ? 'var(--surface-2)'
                                          : 'var(--surface-1)',
                                    })
                                  }
                                  title="Ganti Warna Latar Kotak"
                                >
                                  Warna Latar
                                </button>
                                <button
                                  type="button"
                                  className="export-floating-tool-btn"
                                  onClick={() =>
                                    updateSelectedItem({
                                      borderRadius: item.borderRadius === 0 ? 8 : item.borderRadius === 8 ? 16 : 0,
                                    })
                                  }
                                  title="Ganti Lengkung Sudut"
                                >
                                  R:{item.borderRadius}px
                                </button>
                              </>
                            )}

                            <div className="export-tool-divider" />
                            <button
                              type="button"
                              className="export-floating-tool-btn dangerBtn"
                              onClick={handleDeleteSelectedItem}
                              title="Hapus Elemen (Del)"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}

                        {/* 8 RESIZE HANDLES (Single Item Selected Only) */}
                        {isSingleSelected && (
                          <>
                            <div
                              className="export-resize-handle export-handle-nw"
                              onPointerDown={(e) => handleHandlePointerDown(e, 'nw', item)}
                            />
                            <div
                              className="export-resize-handle export-handle-n"
                              onPointerDown={(e) => handleHandlePointerDown(e, 'n', item)}
                            />
                            <div
                              className="export-resize-handle export-handle-ne"
                              onPointerDown={(e) => handleHandlePointerDown(e, 'ne', item)}
                            />
                            <div
                              className="export-resize-handle export-handle-e"
                              onPointerDown={(e) => handleHandlePointerDown(e, 'e', item)}
                            />
                            <div
                              className="export-resize-handle export-handle-se"
                              onPointerDown={(e) => handleHandlePointerDown(e, 'se', item)}
                            />
                            <div
                              className="export-resize-handle export-handle-s"
                              onPointerDown={(e) => handleHandlePointerDown(e, 's', item)}
                            />
                            <div
                              className="export-resize-handle export-handle-sw"
                              onPointerDown={(e) => handleHandlePointerDown(e, 'sw', item)}
                            />
                            <div
                              className="export-resize-handle export-handle-w"
                              onPointerDown={(e) => handleHandlePointerDown(e, 'w', item)}
                            />
                          </>
                        )}

                        {/* ================= TRANSFORM-SCALED CONTENT ================= */}
                        {/* 1. Header / Kop TRAQ */}
                        {item.type === 'header' && (
                          <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                            <div
                              style={{
                                width: `${baseW}px`,
                                height: `${baseH}px`,
                                transform: `scale(${scaleX}, ${scaleY})`,
                                transformOrigin: '0 0',
                                pointerEvents: 'none',
                              }}
                            >
                              <div className="export-header-block" style={{ width: `${baseW}px`, height: `${baseH}px` }}>
                                <div className="export-header-brand">
                                  <img src="/logo-traq.png" alt="TRAQ" className="export-header-logo" onError={(e) => { e.target.style.display = 'none'; }} />
                                  <div>
                                    <div className="export-header-org-title">TRAQ SULUT</div>
                                    <div className="export-header-org-sub">
                                      Balai Karantina Hewan, Ikan, dan Tumbuhan Sulawesi Utara
                                    </div>
                                  </div>
                                </div>
                                <div className="export-header-meta-block">
                                  <div>Laporan: <strong>{pageTitle}</strong></div>
                                  <div>Periode: <strong>{periodLabel}</strong></div>
                                  {satpelLabel && <div>Satpel: <strong>{satpelLabel}</strong></div>}
                                  <div>Dicetak: {printDate}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 2. Chart Visual with True Proportional Transform Scaling */}
                        {item.type === 'chart' && (
                          <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                            <div
                              style={{
                                width: `${baseW}px`,
                                height: `${baseH}px`,
                                transform: `scale(${scaleX}, ${scaleY})`,
                                transformOrigin: '0 0',
                                pointerEvents: 'none',
                              }}
                            >
                              {isKpiGroup ? (
                                <div
                                  className="export-kpi-group-card"
                                  style={{
                                    width: `${baseW}px`,
                                    height: `${baseH}px`,
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  <ChartRenderer
                                    chartConfig={item.chartConfig}
                                    rawData={chartDataMap[item.chartId] || []}
                                    hideCard={true}
                                  />
                                </div>
                              ) : isKpiCard ? (
                                <div
                                  className="export-kpi-card-standalone"
                                  style={{
                                    width: `${baseW}px`,
                                    height: `${baseH}px`,
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  <ChartRenderer
                                    chartConfig={item.chartConfig}
                                    rawData={chartDataMap[item.chartId] || []}
                                    hideCard={true}
                                  />
                                </div>
                              ) : (
                                <div
                                  className="export-chart-card"
                                  style={{
                                    width: `${baseW}px`,
                                    height: `${baseH}px`,
                                  }}
                                >
                                  <div className="export-chart-card-header">{item.title}</div>
                                  <div className="export-chart-card-body">
                                    <ChartRenderer
                                      chartConfig={item.chartConfig}
                                      rawData={chartDataMap[item.chartId] || []}
                                      height={Math.max(80, baseH - 38)}
                                      hideCard={true}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 3. KPI Metric Card with Transform Scaling */}
                        {item.type === 'kpi' && (
                          <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                            <div
                              style={{
                                width: `${baseW}px`,
                                height: `${baseH}px`,
                                transform: `scale(${scaleX}, ${scaleY})`,
                                transformOrigin: '0 0',
                                pointerEvents: 'none',
                              }}
                            >
                              <div
                                className="export-kpi-card"
                                style={{
                                  width: `${baseW}px`,
                                  height: `${baseH}px`,
                                }}
                              >
                                <div className="export-kpi-label">{item.label}</div>
                                <div
                                  className="export-kpi-value"
                                  style={{ color: item.accentColor || 'var(--primary)' }}
                                >
                                  {item.value}
                                </div>
                                <div className="export-kpi-sub">{item.sub}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 4. Editable Text Block */}
                        {item.type === 'text' && (
                          <div
                            className="export-text-block"
                            style={{
                              fontSize: `${item.fontSize}px`,
                              fontWeight: item.fontWeight,
                              textAlign: item.textAlign,
                              color: item.color,
                              backgroundColor: item.backgroundColor,
                            }}
                          >
                            <textarea
                              className="export-text-input-inline"
                              value={item.text}
                              onChange={(e) => updateSelectedItem({ text: e.target.value })}
                              placeholder="Ketik teks di sini..."
                            />
                          </div>
                        )}

                        {/* 5. Box / Container Shape */}
                        {item.type === 'box' && (
                          <div
                            className="export-box-shape"
                            style={{
                              backgroundColor: item.backgroundColor,
                              border: `${item.borderWidth}px solid ${item.borderColor}`,
                              borderRadius: `${item.borderRadius}px`,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Unified Group Bounding Box & Handles for Multi-Selected (Tagged) Visuals */}
                  {groupBoundingBox && (
                    <div
                      className="export-group-bounding-box"
                      style={{
                        left: `${groupBoundingBox.x}px`,
                        top: `${groupBoundingBox.y}px`,
                        width: `${groupBoundingBox.width}px`,
                        height: `${groupBoundingBox.height}px`,
                      }}
                    >
                      {/* Floating Group Toolbar */}
                      <div
                        className="export-group-toolbar"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <div className="export-group-title-label">
                          <Tag size={13} />
                          <span>{selectedItemIds.length} Visual Ditandai</span>
                        </div>

                        <div className="export-tool-divider" />

                        {/* Alignment Actions */}
                        <button
                          type="button"
                          className="export-floating-tool-btn"
                          onClick={() => handleAlignSelected('left')}
                          title="Ratakan Kiri"
                        >
                          <AlignLeft size={13} />
                        </button>
                        <button
                          type="button"
                          className="export-floating-tool-btn"
                          onClick={() => handleAlignSelected('center-h')}
                          title="Ratakan Tengah Horizontal"
                        >
                          <AlignCenter size={13} />
                        </button>
                        <button
                          type="button"
                          className="export-floating-tool-btn"
                          onClick={() => handleAlignSelected('right')}
                          title="Ratakan Kanan"
                        >
                          <AlignRight size={13} />
                        </button>

                        <div className="export-tool-divider" />

                        <button
                          type="button"
                          className="export-floating-tool-btn"
                          onClick={() => handleAlignSelected('top')}
                          title="Ratakan Atas"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          className="export-floating-tool-btn"
                          onClick={() => handleAlignSelected('bottom')}
                          title="Ratakan Bawah"
                        >
                          <ArrowDown size={13} />
                        </button>

                        <div className="export-tool-divider" />

                        {/* Equal size actions */}
                        <button
                          type="button"
                          className="export-floating-tool-btn"
                          onClick={() => handleAlignSelected('equal-width')}
                          title="Samakan Lebar (Sesuai visual pertama)"
                        >
                          Lebar =
                        </button>
                        <button
                          type="button"
                          className="export-floating-tool-btn"
                          onClick={() => handleAlignSelected('equal-size')}
                          title="Samakan Ukuran Total (Lebar & Tinggi)"
                        >
                          Ukuran =
                        </button>

                        <div className="export-tool-divider" />

                        <button
                          type="button"
                          className="export-floating-tool-btn"
                          onClick={handleDuplicateSelectedItem}
                          title="Duplikat Semua Visual yang Ditandai"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          type="button"
                          className="export-floating-tool-btn dangerBtn"
                          onClick={handleDeleteSelectedItem}
                          title="Hapus Semua yang Ditandai (Del)"
                        >
                          <Trash2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="export-floating-tool-btn"
                          onClick={() => setSelectedItemIds([])}
                          title="Batal Tag / Lepas Pilihan (Esc)"
                        >
                          <X size={13} />
                        </button>
                      </div>

                      {/* 8 Group Resize Handles */}
                      <div
                        className="export-resize-handle export-handle-nw"
                        onPointerDown={(e) => handleGroupHandlePointerDown(e, 'nw', groupBoundingBox)}
                      />
                      <div
                        className="export-resize-handle export-handle-n"
                        onPointerDown={(e) => handleGroupHandlePointerDown(e, 'n', groupBoundingBox)}
                      />
                      <div
                        className="export-resize-handle export-handle-ne"
                        onPointerDown={(e) => handleGroupHandlePointerDown(e, 'ne', groupBoundingBox)}
                      />
                      <div
                        className="export-resize-handle export-handle-e"
                        onPointerDown={(e) => handleGroupHandlePointerDown(e, 'e', groupBoundingBox)}
                      />
                      <div
                        className="export-resize-handle export-handle-se"
                        onPointerDown={(e) => handleGroupHandlePointerDown(e, 'se', groupBoundingBox)}
                      />
                      <div
                        className="export-resize-handle export-handle-s"
                        onPointerDown={(e) => handleGroupHandlePointerDown(e, 's', groupBoundingBox)}
                      />
                      <div
                        className="export-resize-handle export-handle-sw"
                        onPointerDown={(e) => handleGroupHandlePointerDown(e, 'sw', groupBoundingBox)}
                      />
                      <div
                        className="export-resize-handle export-handle-w"
                        onPointerDown={(e) => handleGroupHandlePointerDown(e, 'w', groupBoundingBox)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            3. MODAL FOOTER ACTIONS
            ============================================================ */}
        <div className="export-modal-footer">
          <div className="export-footer-status">
            <div className="export-status-item">
              <span>Halaman Aktif:</span>
              <strong style={{ color: 'var(--text-primary)' }}>
                {activePageIndex + 1} dari {pages.length}
              </strong>
            </div>
            <span>•</span>
            <div className="export-status-item">
              <span>Total Elemen:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{totalItemsCount}</strong>
            </div>
            {selectedItemIds.length > 0 && (
              <>
                <span>•</span>
                <div
                  className="export-status-item"
                  style={{ color: 'var(--primary)', fontWeight: 600 }}
                >
                  <Tag size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                  <span>{selectedItemIds.length} Visual Ditandai</span>
                </div>
              </>
            )}
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              (Tahan <strong>Ctrl</strong> untuk tag visual)
            </span>
            {isExporting && (
              <>
                <span>•</span>
                <span style={{ color: 'var(--primary)' }}>{exportStatusText}</span>
              </>
            )}
          </div>

          <div className="export-footer-actions">
            <button
              type="button"
              className="export-cancel-btn"
              onClick={onClose}
              disabled={isExporting}
            >
              Batal
            </button>

            <button
              type="button"
              className="export-submit-btn"
              onClick={handleExport}
              disabled={isExporting || totalItemsCount === 0}
            >
              {isExporting ? (
                <>
                  <div className="spinner">
                    <RotateCcw size={16} />
                  </div>
                  <span>Sedang Mengekspor...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>
                    Unduh {format.toUpperCase()} ({pages.length} Hal)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ============================================================
            OFFSCREEN RENDER CONTAINER FOR MULTI-PAGE PDF/PNG CAPTURE
            ============================================================ */}
        <div
          ref={offscreenContainerRef}
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          {pages.map((page) => (
            <div
              key={page.id}
              data-export-page
              data-theme={theme}
              className={`export-canvas-sheet ${orientation === 'landscape' ? 'export-canvas-landscape' : 'export-canvas-portrait'}`}
              style={{
                marginBottom: '20px',
                position: 'relative',
                backgroundColor: 'var(--surface-0)',
              }}
            >
              {page.items.map((item) => {
                let baseW = item.baseWidth || item.width || 460;
                let baseH = item.baseHeight || item.height || 280;

                const isKpiGroup = item.chartConfig?.chart_type === 'kpi_group';
                const isKpiCard = item.chartConfig?.chart_type === 'kpi_card';

                if (isKpiGroup) {
                  const kpiItems =
                    item.chartConfig?.config?.kpi_items ||
                    item.chartConfig?.config?.kpiItems ||
                    [];
                  const count = Math.max(1, kpiItems.length);
                  const hasTitle =
                    item.chartConfig?.config?.show_group_title !== false &&
                    item.title &&
                    ![
                      'kpi group',
                      'visualisasi data',
                      'untitled',
                      'tanpa judul',
                      'pratinjau visualisasi data',
                    ].includes(String(item.title).toLowerCase().trim());
                  const titleH = hasTitle ? 36 : 0;
                  const naturalH = count * 110 + Math.max(0, count - 1) * 12 + titleH;

                  if (baseH < naturalH) {
                    baseH = naturalH;
                  }
                }

                const scaleX = item.width / baseW;
                const scaleY = item.height / baseH;

                return (
                  <div
                    key={item.id}
                    style={{
                      position: 'absolute',
                      left: `${item.x}px`,
                      top: `${item.y}px`,
                      width: `${item.width}px`,
                      height: `${item.height}px`,
                      zIndex: item.zIndex || 1,
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                    }}
                  >
                    {/* 1. Header */}
                    {item.type === 'header' && (
                      <div
                        style={{
                          width: `${baseW}px`,
                          height: `${baseH}px`,
                          transform: `scale(${scaleX}, ${scaleY})`,
                          transformOrigin: '0 0',
                        }}
                      >
                        <div className="export-header-block" style={{ width: `${baseW}px`, height: `${baseH}px` }}>
                          <div className="export-header-brand">
                            <img src="/logo-traq.png" alt="TRAQ" className="export-header-logo" onError={(e) => { e.target.style.display = 'none'; }} />
                            <div>
                              <div className="export-header-org-title">TRAQ SULUT</div>
                              <div className="export-header-org-sub">
                                Balai Karantina Hewan, Ikan, dan Tumbuhan Sulawesi Utara
                              </div>
                            </div>
                          </div>
                          <div className="export-header-meta-block">
                            <div>Laporan: <strong>{pageTitle}</strong></div>
                            <div>Periode: <strong>{periodLabel}</strong></div>
                            {satpelLabel && <div>Satpel: <strong>{satpelLabel}</strong></div>}
                            <div>Dicetak: {printDate}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. Chart with Transform Scale */}
                    {item.type === 'chart' && (
                      <div
                        style={{
                          width: `${baseW}px`,
                          height: `${baseH}px`,
                          transform: `scale(${scaleX}, ${scaleY})`,
                          transformOrigin: '0 0',
                        }}
                      >
                        {isKpiGroup ? (
                          <div
                            className="export-kpi-group-card"
                            style={{
                              width: `${baseW}px`,
                              height: `${baseH}px`,
                              boxSizing: 'border-box',
                            }}
                          >
                            <ChartRenderer
                              chartConfig={item.chartConfig}
                              rawData={chartDataMap[item.chartId] || []}
                              hideCard={true}
                            />
                          </div>
                        ) : isKpiCard ? (
                          <div
                            className="export-kpi-card-standalone"
                            style={{
                              width: `${baseW}px`,
                              height: `${baseH}px`,
                              boxSizing: 'border-box',
                            }}
                          >
                            <ChartRenderer
                              chartConfig={item.chartConfig}
                              rawData={chartDataMap[item.chartId] || []}
                              hideCard={true}
                            />
                          </div>
                        ) : (
                          <div className="export-chart-card" style={{ width: `${baseW}px`, height: `${baseH}px` }}>
                            <div className="export-chart-card-header">{item.title}</div>
                            <div className="export-chart-card-body">
                              <ChartRenderer
                                chartConfig={item.chartConfig}
                                rawData={chartDataMap[item.chartId] || []}
                                height={Math.max(80, baseH - 38)}
                                hideCard={true}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. KPI with Transform Scale */}
                    {item.type === 'kpi' && (
                      <div
                        style={{
                          width: `${baseW}px`,
                          height: `${baseH}px`,
                          transform: `scale(${scaleX}, ${scaleY})`,
                          transformOrigin: '0 0',
                        }}
                      >
                        <div className="export-kpi-card" style={{ width: `${baseW}px`, height: `${baseH}px` }}>
                          <div className="export-kpi-label">{item.label}</div>
                          <div
                            className="export-kpi-value"
                            style={{ color: item.accentColor || 'var(--primary)' }}
                          >
                            {item.value}
                          </div>
                          <div className="export-kpi-sub">{item.sub}</div>
                        </div>
                      </div>
                    )}

                    {/* 4. Text */}
                    {item.type === 'text' && (
                      <div
                        className="export-text-block"
                        style={{
                          fontSize: `${item.fontSize}px`,
                          fontWeight: item.fontWeight,
                          textAlign: item.textAlign,
                          color: item.color,
                          backgroundColor: item.backgroundColor,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {item.text}
                      </div>
                    )}

                    {/* 5. Box */}
                    {item.type === 'box' && (
                      <div
                        className="export-box-shape"
                        style={{
                          backgroundColor: item.backgroundColor,
                          border: `${item.borderWidth}px solid ${item.borderColor}`,
                          borderRadius: `${item.borderRadius}px`,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
