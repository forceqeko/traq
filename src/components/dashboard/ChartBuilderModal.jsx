import React, { useState, useEffect, useMemo, Component } from 'react';
import { createPortal } from 'react-dom';
import { getColumnRegistry } from '@/lib/services/columnService';
import { loadPageDashboardData } from '@/lib/data/dashboardDataLoader';
import { useDialog } from '@/contexts/DialogContext';
import ChartRenderer from '@/components/charts/ChartRenderer';
import {
  BarChart2,
  TrendingUp,
  PieChart as PieIcon,
  Activity,
  Table as TableIcon,
  AlignLeft,
  X,
  Check,
  Filter,
  Layers,
  Search,
  CheckSquare,
  Square,
  ArrowLeft,
  ArrowRight,
  ListFilter,
  FileSpreadsheet,
  Calculator,
  Grid,
  Sparkles,
  Sliders,
  Eye,
  EyeOff,
  Database,
  SlidersHorizontal,
  MapPin,
  Globe,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

const DEFAULT_RECOMMENDED_TABLE_COLS = [
  'Nomor Dokumen',
  'No. K.1.1',
  'Satpel',
  'Komoditas',
  'Vol P1',
  'Harga Barang (Rp)',
  'Pemohon',
  'Pelabuhan Asal',
  'Pelabuhan Tujuan',
];

/**
 * ErrorBoundary to isolate any potential chart rendering errors in the live preview
 * so the modal and the rest of the application never crash to a blank screen.
 */
class PreviewErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('PreviewErrorBoundary caught error:', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.chartConfig !== this.props.chartConfig && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '1.5rem',
          }}
        >
          <Activity size={32} style={{ opacity: 0.5, marginBottom: '0.5rem', color: 'var(--primary)' }} />
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
            Pratinjau Sedang Disesuaikan
          </div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', maxWidth: '280px' }}>
            Lengkapi opsi kolom atau metrik untuk merender pratinjau grafik.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ChartBuilderModal({
  chartToEdit = null,
  selectedPageKey = 'home',
  onSave,
  onClose,
}) {
  const { showAlert } = useDialog();

  // Normalize safeConfig from chartToEdit (handle JSON string or null config safely)
  const safeConfig = useMemo(() => {
    if (!chartToEdit?.config) return {};
    if (typeof chartToEdit.config === 'string') {
      try {
        return JSON.parse(chartToEdit.config);
      } catch (e) {
        return {};
      }
    }
    return chartToEdit.config || {};
  }, [chartToEdit]);

  const initialChartType = useMemo(() => {
    const rawType = chartToEdit?.chart_type || 'bar';
    if (rawType === 'bar_horizontal') return 'horizontal_bar';
    return rawType;
  }, [chartToEdit]);

  // Active step / tab in configuration panel
  const [activeTab, setActiveTab] = useState('type_data'); // 'type_data' | 'filter_series' | 'style_layout'

  // General Form States with null-safe initializations
  const [title, setTitle] = useState(chartToEdit?.title || 'Visualisasi Data Baru');
  const [chartType, setChartType] = useState(initialChartType);
  const [width, setWidth] = useState(chartToEdit?.width || (initialChartType === 'data_table' ? 'full' : 'half'));
  const [xAxis, setXAxis] = useState(safeConfig.x_axis || 'Komoditas');
  const [yAxis, setYAxis] = useState(safeConfig.y_axis || 'Volume');
  const [aggregation, setAggregation] = useState(safeConfig.aggregation || 'sum');
  const [topN, setTopN] = useState(String(safeConfig.top_n ?? '10'));
  const [groupOthers, setGroupOthers] = useState(safeConfig.group_others ?? true);
  const [commodityFilter, setCommodityFilter] = useState(safeConfig.commodity_filter || 'all');
  const [trafficFilter, setTrafficFilter] = useState(safeConfig.traffic_filter || 'all');
  const [legendDisplay, setLegendDisplay] = useState(safeConfig.legend_display || 'name_value');
  
  // Note: For tables, group_by is row group, NOT multi-series breakdown!
  const [seriesBreakdown, setSeriesBreakdown] = useState(
    initialChartType === 'data_table'
      ? 'none'
      : (typeof safeConfig.group_by === 'string' && ['commodity_type', 'traffic_type', 'Satpel'].includes(safeConfig.group_by)
          ? safeConfig.group_by
          : 'none')
  );
  
  const [showDataLabels, setShowDataLabels] = useState(safeConfig.show_data_labels ?? false);
  const [valueUnit, setValueUnit] = useState(
    safeConfig.custom_unit ? 'custom' : safeConfig.value_unit || 'auto'
  );
  const [customUnit, setCustomUnit] = useState(safeConfig.custom_unit || '');
  const [mapMode, setMapMode] = useState(safeConfig.map_mode || 'auto');
  const [mapStyle, setMapStyle] = useState(safeConfig.map_style || 'choropleth');
  const [mapTile, setMapTile] = useState(safeConfig.map_tile || 'light');
  const [mapColumn, setMapColumn] = useState(
    safeConfig.map_column || (safeConfig.traffic_filter === 'ekspor' ? 'Negara Tujuan' : 'Daerah Asal')
  );
  const [columns, setColumns] = useState([]);
  const [previewRecords, setPreviewRecords] = useState([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);

  // Data Table Specific Config with robust array safeguards
  const [tableMode, setTableMode] = useState(
    safeConfig.table_mode || (safeConfig.group_by ? 'aggregate' : 'aggregate')
  );
  const [groupByCol, setGroupByCol] = useState(
    (typeof safeConfig.group_by === 'string' ? safeConfig.group_by : 'Satpel') || 'Satpel'
  );
  const [aggregateMetrics, setAggregateMetrics] = useState(
    Array.isArray(safeConfig.metrics) && safeConfig.metrics.length > 0
      ? safeConfig.metrics
      : ['certs', 'rows', 'volume', 'value']
  );

  const initialSortBy = useMemo(() => {
    if (safeConfig.sort_by) return safeConfig.sort_by;
    const yLower = String(safeConfig.y_axis || '').toLowerCase();
    if (yLower.includes('aju')) return 'no_aju_desc';
    if (yLower.includes('k.1.1') || yLower.includes('k11')) return 'k11_desc';
    if (yLower.includes('persen') || yLower.includes('ratio')) return 'percentage_desc';
    if (yLower.includes('vol') || yLower.includes('netto') || yLower.includes('berat')) return 'vol_desc';
    if (yLower.includes('nilai') || yLower.includes('harga') || yLower.includes('rupiah')) return 'val_desc';
    if (yLower.includes('frekuensi') || yLower.includes('sertifikat')) return 'certs_desc';
    return 'vol_desc';
  }, [safeConfig]);

  const [sortByMetric, setSortByMetric] = useState(initialSortBy);
  const [tableColumns, setTableColumns] = useState(
    Array.isArray(safeConfig.columns) && safeConfig.columns.length > 0
      ? safeConfig.columns
      : DEFAULT_RECOMMENDED_TABLE_COLS
  );
  const [pageSize, setPageSize] = useState(safeConfig.page_size || 10);
  const [colSearchQuery, setColSearchQuery] = useState('');

  // KPI Group specific states
  const defaultKpiItems = useMemo(
    () => [
      {
        id: 'kpi-1',
        title: 'Total Pengajuan (K.1.1)',
        y_axis: 'Frekuensi',
        aggregation: 'count',
        commodity_filter: 'all',
        traffic_filter: 'all',
        unit: 'Sertifikat',
      },
      {
        id: 'kpi-2',
        title: 'Total Volume',
        y_axis: 'Volume',
        aggregation: 'sum',
        commodity_filter: 'all',
        traffic_filter: 'all',
        unit: 'Kg',
      },
      {
        id: 'kpi-3',
        title: 'Total Nilai Barang',
        y_axis: 'Nilai_Rupiah',
        aggregation: 'sum',
        commodity_filter: 'all',
        traffic_filter: 'all',
        unit: '',
      },
    ],
    []
  );

  const [kpiItems, setKpiItems] = useState(() => {
    if (Array.isArray(safeConfig.kpi_items) && safeConfig.kpi_items.length > 0) {
      return safeConfig.kpi_items;
    }
    if (Array.isArray(safeConfig.kpiItems) && safeConfig.kpiItems.length > 0) {
      return safeConfig.kpiItems;
    }
    return defaultKpiItems;
  });

  const [showGroupTitle, setShowGroupTitle] = useState(safeConfig.show_group_title ?? false);

  const addKpiItem = () => {
    setKpiItems((prev) => [
      ...prev,
      {
        id: `kpi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: `Metrik Baru #${prev.length + 1}`,
        y_axis: 'Volume',
        aggregation: 'sum',
        commodity_filter: 'all',
        traffic_filter: 'all',
        unit: '',
      },
    ]);
  };

  const removeKpiItem = (index) => {
    if (kpiItems.length <= 1) {
      showAlert({
        title: 'Minimal 1 KPI',
        message: 'KPI Group harus memiliki setidaknya 1 KPI Card di dalamnya.',
        type: 'warning',
      });
      return;
    }
    setKpiItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateKpiItem = (index, field, value) => {
    setKpiItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const moveKpiItem = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= kpiItems.length) return;
    setKpiItems((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoadingPreview(true);
    try {
      const regCols = await getColumnRegistry();
      setColumns(regCols || []);
      const dashboardData = await loadPageDashboardData(selectedPageKey || 'home', { periodType: 'all' });
      if (dashboardData?.rawRecords) {
        setPreviewRecords(dashboardData.rawRecords);
      }
    } catch (err) {
      console.warn('Error loading preview data:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const chartTypes = [
    { id: 'bar', label: 'Bar Vertikal', icon: BarChart2, desc: 'Perbandingan antar kategori vertikal' },
    { id: 'horizontal_bar', label: 'Bar Horisontal', icon: AlignLeft, desc: 'Grafik batang mendatar / ranking' },
    { id: 'line', label: 'Line Chart', icon: TrendingUp, desc: 'Tren data dari waktu ke waktu' },
    { id: 'area', label: 'Area Chart', icon: TrendingUp, desc: 'Tren area terisi bertingkat' },
    { id: 'pie', label: 'Pie Chart', icon: PieIcon, desc: 'Proporsi komposisi lingkaran penuh' },
    { id: 'donut', label: 'Donut Chart', icon: PieIcon, desc: 'Ring donat komposisi data' },
    { id: 'map', label: 'Peta Interaktif', icon: MapPin, desc: 'Pemetaan daerah & negara asal/tujuan' },
    { id: 'kpi_card', label: 'KPI Card', icon: Activity, desc: 'Angka ringkasan total tunggal' },
    { id: 'kpi_group', label: 'KPI Group', icon: Layers, desc: 'Grup KPI bertumpuk vertikal fleksibel' },
    { id: 'data_table', label: 'Data Table', icon: TableIcon, desc: 'Tabel data interaktif & rekapitulasi' },
  ];

  // Derive dynamic options for Chart types with null checks
  const standardXColumns = [
    { key: 'Komoditas', label: 'Komoditas' },
    { key: 'Bulan', label: 'Bulan' },
    { key: 'Arah_Lalu_Lintas', label: 'Arah Lalu Lintas' },
    { key: 'Satpel', label: 'Satuan Pelayanan (Satpel)' },
    { key: 'Pemohon', label: 'Pemohon / Pengguna Jasa' },
    { key: 'Pengirim', label: 'Pengirim' },
    { key: 'Penerima', label: 'Penerima' },
    { key: 'Daerah Asal', label: 'Daerah Asal (Kabupaten/Kota)' },
    { key: 'Daerah Tujuan', label: 'Daerah Tujuan (Kabupaten/Kota)' },
    { key: 'Negara Asal', label: 'Negara Asal' },
    { key: 'Negara Tujuan', label: 'Negara Tujuan' },
    { key: 'Pelabuhan Asal', label: 'Pelabuhan Asal' },
    { key: 'Pelabuhan Tujuan', label: 'Pelabuhan Tujuan' },
    { key: 'Klasifikasi', label: 'Klasifikasi Komoditas' },
    { key: 'Jenis Kemasan', label: 'Jenis Kemasan' },
    { key: 'Moda Alat Angkut', label: 'Moda Alat Angkut' },
    { key: 'Nama Alat Angkut', label: 'Nama Alat Angkut / Kapal' },
  ];

  const standardXKeys = new Set(standardXColumns.map((c) => (c.key || '').toLowerCase()));
  const dynamicXColumns = (columns || [])
    .filter(
      (c) =>
        c &&
        c.column_name &&
        c.data_type !== 'number' &&
        c.data_type !== 'currency' &&
        !standardXKeys.has((c.column_name || '').toLowerCase())
    )
    .map((c) => ({ key: c.column_name, label: c.display_name || c.column_name }));

  const allXOptions = [...standardXColumns, ...dynamicXColumns];

  const standardYColumns = [
    { key: 'Frekuensi', label: 'Frekuensi Sertifikat (Nomor Dokumen - Unique)', type: 'count' },
    { key: 'Volume', label: 'Berat Akhir Terkonversi Kg (Netto P8)', type: 'number' },
    { key: 'Netto P8', label: 'Netto P8 (Berat Standar Kg)', type: 'number' },
    { key: 'Vol P1', label: 'Vol P1 (Volume Fisik Dokumen)', type: 'number' },
    { key: 'Netto P1', label: 'Netto P1 (Berat Bersih Dokumen)', type: 'number' },
    { key: 'Nilai_Rupiah', label: 'Nilai Komoditas (Harga Barang Rp)', type: 'currency' },
  ];

  const standardYKeys = new Set(['frekuensi', 'volume', 'netto p8', 'vol p1', 'netto p1', 'nilai_rupiah', 'harga barang (rp)']);
  const dynamicYColumns = (columns || [])
    .filter(
      (c) =>
        c &&
        c.column_name &&
        (c.data_type === 'number' || c.data_type === 'currency') &&
        !standardYKeys.has((c.column_name || '').toLowerCase())
    )
    .map((c) => ({
      key: c.column_name,
      label: `${c.display_name || c.column_name} (${c.data_type === 'currency' ? 'Rp' : 'Numerik'})`,
      type: c.data_type,
    }));

  const allYOptions = [...standardYColumns, ...dynamicYColumns];

  const availableAggregateMetrics = [
    { id: 'certs', label: 'Frekuensi Sertifikat (Nomor Dokumen - Unique)', desc: 'Total dokumen sertifikat resmi unik (Nomor Dokumen pembebasan)' },
    { id: 'k11', label: 'Frekuensi No. K.1.1 (Verifikasi Pengajuan - Unique)', desc: 'Total formulir verifikasi pengajuan unik (No. K.1.1)' },
    { id: 'percentage', label: 'Persentase Sertifikasi (No. Dokumen vs No. K.1.1)', desc: 'Persentase penyelesaian No. Dokumen terhadap No. K.1.1 serta status selisih' },
    { id: 'diff', label: 'Selisih Sertifikasi (K.1.1 - Nomor Dokumen)', desc: 'Selisih dokumen pengajuan K.1.1 dengan sertifikat resmi terbit' },
    { id: 'no_aju', label: 'Frekuensi No. Aju (Permohonan - Unique)', desc: 'Total nomor permohonan pengajuan unik (No. Aju)' },
    { id: 'percentage_aju', label: 'Persentase Realisasi (No. Dokumen vs No. Aju)', desc: 'Persentase penyelesaian No. Dokumen terhadap No. Aju serta status selisih' },
    { id: 'diff_aju', label: 'Selisih Permohonan (No. Aju - Nomor Dokumen)', desc: 'Selisih permohonan No. Aju dengan sertifikat resmi terbit' },
    { id: 'rows', label: 'Jumlah Rincian Komoditas (Baris)', desc: 'Total baris data item komoditas' },
    { id: 'volume', label: 'Total Berat/Netto (Kg)', desc: 'Penjumlahan berat terkonversi Kilogram (Netto P8)' },
    { id: 'value', label: 'Total Nilai Komoditas (Rp)', desc: 'Penjumlahan nilai rupiah barang' },
    { id: 'avg_volume', label: 'Rata-rata Berat per Sertifikat (Kg)', desc: 'Berat rata-rata per dokumen' },
    { id: 'avg_value', label: 'Rata-rata Nilai per Sertifikat (Rp)', desc: 'Nilai rupiah rata-rata per dokumen' },
  ];

  const handleYAxisChange = (val) => {
    const safeVal = String(val || '');
    setYAxis(safeVal);
    if (safeVal.toLowerCase().includes('frekuensi') || safeVal.toLowerCase().includes('sertifikat')) {
      setAggregation('count');
    } else {
      setAggregation('sum');
    }
  };

  const toggleAggregateMetric = (metricId) => {
    let next;
    if (aggregateMetrics.includes(metricId)) {
      next = aggregateMetrics.filter((m) => m !== metricId);
    } else {
      next = [...aggregateMetrics, metricId];
    }
    setAggregateMetrics(next);

    // Auto-adjust sortByMetric if the current sort metric was deselected
    if (!next.includes('certs') && sortByMetric.startsWith('certs')) {
      if (next.includes('k11')) setSortByMetric('k11_desc');
      else if (next.includes('no_aju')) setSortByMetric('no_aju_desc');
      else if (next.includes('percentage')) setSortByMetric('percentage_desc');
      else if (next.includes('percentage_aju')) setSortByMetric('percentage_aju_desc');
      else if (next.includes('volume')) setSortByMetric('vol_desc');
      else if (next.includes('value')) setSortByMetric('val_desc');
      else if (next.includes('rows')) setSortByMetric('rows_desc');
    } else if (!next.includes('k11') && sortByMetric.startsWith('k11')) {
      if (next.includes('certs')) setSortByMetric('certs_desc');
      else if (next.includes('no_aju')) setSortByMetric('no_aju_desc');
      else if (next.includes('percentage')) setSortByMetric('percentage_desc');
      else if (next.includes('volume')) setSortByMetric('vol_desc');
    } else if (!next.includes('no_aju') && sortByMetric.startsWith('no_aju')) {
      if (next.includes('certs')) setSortByMetric('certs_desc');
      else if (next.includes('k11')) setSortByMetric('k11_desc');
      else if (next.includes('percentage_aju')) setSortByMetric('percentage_aju_desc');
      else if (next.includes('volume')) setSortByMetric('vol_desc');
    } else if (!next.includes('percentage') && sortByMetric.startsWith('percentage') && !sortByMetric.includes('aju')) {
      if (next.includes('certs')) setSortByMetric('certs_desc');
      else if (next.includes('k11')) setSortByMetric('k11_desc');
      else if (next.includes('volume')) setSortByMetric('vol_desc');
    } else if (!next.includes('percentage_aju') && sortByMetric.startsWith('percentage_aju')) {
      if (next.includes('certs')) setSortByMetric('certs_desc');
      else if (next.includes('no_aju')) setSortByMetric('no_aju_desc');
      else if (next.includes('volume')) setSortByMetric('vol_desc');
    } else if (!next.includes('diff') && sortByMetric.startsWith('diff') && !sortByMetric.includes('aju')) {
      if (next.includes('percentage')) setSortByMetric('percentage_desc');
      else if (next.includes('certs')) setSortByMetric('certs_desc');
    } else if (!next.includes('diff_aju') && sortByMetric.startsWith('diff_aju')) {
      if (next.includes('percentage_aju')) setSortByMetric('percentage_aju_desc');
      else if (next.includes('certs')) setSortByMetric('certs_desc');
    } else if (!next.includes('volume') && sortByMetric.startsWith('vol')) {
      if (next.includes('value')) setSortByMetric('val_desc');
      else if (next.includes('certs')) setSortByMetric('certs_desc');
    }
  };

  const toggleTableColumn = (colName) => {
    if (tableColumns.includes(colName)) {
      setTableColumns(tableColumns.filter((c) => c !== colName));
    } else {
      setTableColumns([...tableColumns, colName]);
    }
  };

  const moveColumn = (index, direction) => {
    const newCols = [...tableColumns];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newCols.length) return;
    const temp = newCols[index];
    newCols[index] = newCols[targetIdx];
    newCols[targetIdx] = temp;
    setTableColumns(newCols);
  };

  // Assembled Live Draft Config for real-time preview
  const currentDraftConfig = useMemo(() => {
    let cfg = {};
    if (chartType === 'data_table') {
      if (tableMode === 'aggregate') {
        cfg = {
          table_mode: 'aggregate',
          group_by: groupByCol,
          metrics: aggregateMetrics,
          sort_by: sortByMetric,
          top_n: topN,
          commodity_filter: commodityFilter,
          traffic_filter: trafficFilter,
          page_size: parseInt(pageSize, 10) || 10,
        };
      } else {
        cfg = {
          table_mode: 'raw',
          columns: tableColumns,
          top_n: topN,
          commodity_filter: commodityFilter,
          traffic_filter: trafficFilter,
          page_size: parseInt(pageSize, 10) || 10,
        };
      }
    } else if (chartType === 'map') {
      cfg = {
        map_mode: mapMode,
        map_style: mapStyle,
        map_tile: mapTile,
        map_column: mapColumn,
        y_axis: yAxis,
        aggregation: aggregation || 'sum',
        commodity_filter: commodityFilter,
        traffic_filter: trafficFilter,
        colors: ['#3B82F6', '#0D9488', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981'],
      };
    } else if (chartType === 'kpi_group') {
      cfg = {
        kpi_items: kpiItems,
        show_group_title: showGroupTitle,
      };
    } else {
      cfg = {
        x_axis: xAxis,
        y_axis: yAxis,
        aggregation: aggregation || 'sum',
        top_n: topN,
        group_others: groupOthers,
        group_by: seriesBreakdown === 'none' ? null : seriesBreakdown,
        commodity_filter: commodityFilter,
        traffic_filter: trafficFilter,
        legend_display: legendDisplay,
        show_data_labels: showDataLabels,
        value_unit: valueUnit === 'custom' ? (customUnit.trim() || 'none') : valueUnit,
        custom_unit: valueUnit === 'custom' ? customUnit : '',
        colors: ['#3B82F6', '#0D9488', '#F59E0B', '#8B5CF6', '#F43F5E', '#10B981', '#EC4899', '#6366F1'],
      };
    }

    return {
      id: chartToEdit?.id || 'preview-draft',
      title: title || 'Pratinjau Visualisasi Data',
      chart_type: chartType,
      width: width || (chartType === 'data_table' || chartType === 'map' ? 'full' : 'half'),
      sort_order: chartToEdit?.sort_order,
      config: cfg,
    };
  }, [
    chartToEdit,
    title,
    chartType,
    width,
    xAxis,
    yAxis,
    aggregation,
    topN,
    groupOthers,
    seriesBreakdown,
    commodityFilter,
    trafficFilter,
    legendDisplay,
    showDataLabels,
    valueUnit,
    customUnit,
    mapMode,
    mapStyle,
    mapTile,
    mapColumn,
    tableMode,
    groupByCol,
    aggregateMetrics,
    sortByMetric,
    tableColumns,
    pageSize,
    kpiItems,
    showGroupTitle,
  ]);

  const handleSave = () => {
    if (!title.trim()) {
      showAlert({
        title: 'Judul Wajib Diisi',
        message: 'Harap masukkan judul visualisasi sebelum menyimpan.',
        type: 'warning',
      });
      return;
    }

    if (chartType === 'kpi_group') {
      if (!kpiItems || kpiItems.length === 0) {
        showAlert({
          title: 'Minimal 1 KPI Card',
          message: 'Tambahkan setidaknya 1 KPI Card di dalam grup visualisasi ini.',
          type: 'warning',
        });
        return;
      }
    }

    if (chartType === 'data_table') {
      if (tableMode === 'aggregate' && (!aggregateMetrics || aggregateMetrics.length === 0)) {
        showAlert({
          title: 'Pilih Metrik Tabel',
          message: 'Pilih setidaknya 1 metrik rekapitulasi untuk ditampilkan pada tabel.',
          type: 'warning',
        });
        return;
      }
      if (tableMode === 'raw' && (!tableColumns || tableColumns.length === 0)) {
        showAlert({
          title: 'Pilih Kolom Data',
          message: 'Pilih setidaknya 1 kolom untuk ditampilkan pada tabel rincian transaksi.',
          type: 'warning',
        });
        return;
      }
    }

    onSave({
      id: chartToEdit?.id,
      title,
      chart_type: chartType,
      width: width || (chartType === 'data_table' ? 'full' : 'half'),
      sort_order: chartToEdit?.sort_order,
      config: currentDraftConfig.config,
    });
  };

  const filteredAvailableCols = (columns || []).filter((col) => {
    if (!colSearchQuery.trim()) return true;
    const q = colSearchQuery.toLowerCase();
    return (
      (col.column_name || '').toLowerCase().includes(q) ||
      (col.display_name && col.display_name.toLowerCase().includes(q))
    );
  });

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
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1.25rem',
        margin: 0,
        boxSizing: 'border-box',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '1240px',
          height: '90vh',
          maxHeight: '900px',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          backgroundColor: 'var(--surface-1)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 15px 25px -5px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          animation: 'dialogPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ================= MODAL HEADER ================= */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--surface-0)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-subtle)',
                color: 'var(--primary)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Sliders size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{chartToEdit ? 'Edit Visualisasi Data' : 'Tambah Visualisasi Baru'}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--surface-2)',
                    color: 'var(--text-secondary)',
                    fontWeight: 500,
                  }}
                >
                  {chartTypes.find((t) => t.id === chartType)?.label || chartType || 'Visualisasi'}
                </span>
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, marginTop: '2px' }}>
                Rancang dan sesuaikan grafik dengan live preview real-time.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            title="Tutup Modal"
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ================= MODAL BODY: SPLIT-SCREEN 2-KOLOM ================= */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.95fr)',
            overflow: 'hidden',
            backgroundColor: 'var(--surface-0)',
          }}
        >
          {/* ----------------- KOLOM KIRI: PANEL FORM PENGATURAN ----------------- */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid var(--border-color)',
              backgroundColor: 'var(--surface-1)',
              overflow: 'hidden',
            }}
          >
            {/* Tab Navigation Header */}
            <div
              style={{
                display: 'flex',
                padding: '0.75rem 1.25rem 0 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-0)',
                gap: '0.5rem',
                flexShrink: 0,
              }}
            >
              {[
                { id: 'type_data', label: '1. Tipe & Sumber Data', icon: Database },
                { id: 'filter_series', label: '2. Filter & Pembagian', icon: Filter },
                { id: 'style_layout', label: '3. Tampilan & Satuan', icon: SlidersHorizontal },
              ].map((tab) => {
                const isCurrent = activeTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.625rem 1rem',
                      border: 'none',
                      borderBottom: `2.5px solid ${isCurrent ? 'var(--primary)' : 'transparent'}`,
                      backgroundColor: 'transparent',
                      color: isCurrent ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: isCurrent ? 700 : 500,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      borderTopLeftRadius: 'var(--radius-sm)',
                      borderTopRightRadius: 'var(--radius-sm)',
                    }}
                  >
                    <TabIcon size={15} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Form Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              {/* ================= TAB 1: TIPE & SUMBER DATA ================= */}
              {activeTab === 'type_data' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Input Judul */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Judul Visualisasi <span style={{ color: 'var(--status-danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Contoh: Top 10 Komoditas Ekspor Berdasarkan Nilai Barang"
                    />
                  </div>

                  {/* Selector Tipe Visualisasi */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Pilih Tipe Visualisasi
                    </label>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                        gap: '0.625rem',
                      }}
                    >
                      {chartTypes.map((t) => {
                        const Icon = t.icon;
                        const isSelected = chartType === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              const prevType = chartType;
                              setChartType(t.id);
                              if (t.id === 'data_table' && width !== 'full') {
                                setWidth('full');
                              }
                              // Cleanly reset seriesBreakdown when switching away from data_table
                              if (prevType === 'data_table' && t.id !== 'data_table') {
                                setSeriesBreakdown('none');
                              }
                            }}
                            style={{
                              padding: '0.75rem',
                              borderRadius: 'var(--radius-md)',
                              border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                              backgroundColor: isSelected ? 'var(--primary-subtle)' : 'var(--surface-0)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.35rem',
                              transition: 'all 0.15s ease',
                              position: 'relative',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Icon size={18} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                              {isSelected && <Check size={14} color="var(--primary)" strokeWidth={3} />}
                            </div>
                            <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: '0.8125rem', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                              {t.label}
                            </div>
                            <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', lineHeight: 1.25 }}>
                              {t.desc}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Form Konfigurasi Khusus Sumbu Data Berdasarkan Tipe */}
                  {chartType === 'data_table' ? (
                    <div
                      className="card"
                      style={{
                        backgroundColor: 'var(--surface-0)',
                        border: '1px solid var(--border-color)',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--surface-1)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        <button
                          type="button"
                          onClick={() => setTableMode('aggregate')}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            backgroundColor: tableMode === 'aggregate' ? 'var(--primary)' : 'transparent',
                            color: tableMode === 'aggregate' ? '#ffffff' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <Calculator size={14} />
                          <span>Tabel Rekapitulasi (Agregasi)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTableMode('raw')}
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            backgroundColor: tableMode === 'raw' ? 'var(--primary)' : 'transparent',
                            color: tableMode === 'raw' ? '#ffffff' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <FileSpreadsheet size={14} />
                          <span>Tabel Rincian Data Mentah</span>
                        </button>
                      </div>

                      {tableMode === 'aggregate' ? (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem' }}>
                            <div className="form-group">
                              <label className="form-label" style={{ fontWeight: 600 }}>Kelompokkan Baris Berdasarkan</label>
                              <select className="select" value={groupByCol} onChange={(e) => setGroupByCol(e.target.value)}>
                                {allXOptions.map((opt) => (
                                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                                ))}
                              </select>
                            </div>

                            <div className="form-group">
                              <label className="form-label" style={{ fontWeight: 600 }}>Urutan Peringkat</label>
                              <select className="select" value={sortByMetric} onChange={(e) => setSortByMetric(e.target.value)}>
                                <option value="certs_desc">Sertifikat Terbanyak (Nomor Dokumen)</option>
                                <option value="certs_asc">Sertifikat Terendah (Nomor Dokumen)</option>
                                <option value="k11_desc">No. K.1.1 Terbanyak (Verifikasi)</option>
                                <option value="k11_asc">No. K.1.1 Terendah (Verifikasi)</option>
                                <option value="no_aju_desc">No. Aju Terbanyak (Permohonan)</option>
                                <option value="no_aju_asc">No. Aju Terendah (Permohonan)</option>
                                <option value="percentage_desc">Persentase Tertinggi vs K.1.1 (%)</option>
                                <option value="percentage_asc">Persentase Terendah vs K.1.1 (%)</option>
                                <option value="percentage_aju_desc">Persentase Tertinggi vs No. Aju (%)</option>
                                <option value="percentage_aju_asc">Persentase Terendah vs No. Aju (%)</option>
                                <option value="diff_desc">Selisih Terbesar (K.1.1 - Dokumen)</option>
                                <option value="diff_aju_desc">Selisih Terbesar (No. Aju - Dokumen)</option>
                                <option value="vol_desc">Volume / Berat Terbesar</option>
                                <option value="val_desc">Nilai Rupiah Terbesar</option>
                                <option value="name_asc">Nama (A - Z)</option>
                              </select>
                            </div>

                            <div className="form-group">
                              <label className="form-label" style={{ fontWeight: 600 }}>Batas Baris (Top-N)</label>
                              <select className="select" value={topN} onChange={(e) => setTopN(e.target.value)}>
                                <option value="5">Top 5 Teratas</option>
                                <option value="10">Top 10 Teratas</option>
                                <option value="15">Top 15 Teratas</option>
                                <option value="20">Top 20 Teratas</option>
                                <option value="50">Top 50 Teratas</option>
                                <option value="all">Semua Data (Tanpa Batas)</option>
                              </select>
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600 }}>Metrik Rekapitulasi yang Ditampilkan</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                              {availableAggregateMetrics.map((met) => {
                                const isChecked = aggregateMetrics.includes(met.id);
                                return (
                                  <div
                                    key={met.id}
                                    onClick={() => toggleAggregateMetric(met.id)}
                                    style={{
                                      padding: '0.5rem 0.65rem',
                                      borderRadius: 'var(--radius-sm)',
                                      backgroundColor: isChecked ? 'var(--primary-subtle)' : 'var(--surface-1)',
                                      border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-subtle)'}`,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                    }}
                                  >
                                    {isChecked ? <CheckSquare size={14} color="var(--primary)" /> : <Square size={14} color="var(--text-muted)" />}
                                    <span style={{ fontSize: '0.75rem', fontWeight: isChecked ? 600 : 400 }}>{met.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="form-group" style={{ maxWidth: '200px' }}>
                            <label className="form-label" style={{ fontWeight: 600 }}>Batas Baris (Top-N)</label>
                            <select className="select" value={topN} onChange={(e) => setTopN(e.target.value)}>
                              <option value="10">10 Baris Pertama</option>
                              <option value="20">20 Baris Pertama</option>
                              <option value="50">50 Baris Pertama</option>
                              <option value="100">100 Baris Pertama</option>
                              <option value="all">Semua Baris Data</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600 }}>Pilih Kolom Data Rincian</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.35rem', maxHeight: '180px', overflowY: 'auto' }}>
                              {allXOptions.map((col) => {
                                const isChecked = tableColumns.includes(col.key);
                                return (
                                  <div
                                    key={col.key}
                                    onClick={() => toggleTableColumn(col.key)}
                                    style={{
                                      padding: '0.35rem 0.5rem',
                                      borderRadius: 'var(--radius-sm)',
                                      backgroundColor: isChecked ? 'var(--primary-subtle)' : 'var(--surface-1)',
                                      border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-subtle)'}`,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                    }}
                                  >
                                    {isChecked ? <CheckSquare size={13} color="var(--primary)" /> : <Square size={13} color="var(--text-muted)" />}
                                    <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{col.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : chartType === 'kpi_card' ? (
                    <div
                      className="card"
                      style={{
                        backgroundColor: 'var(--surface-0)',
                        border: '1px solid var(--border-color)',
                        padding: '1rem',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                      }}
                    >
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Metrik Angka Ringkasan</label>
                        <select className="select" value={yAxis} onChange={(e) => handleYAxisChange(e.target.value)}>
                          {allYOptions.map((opt) => (
                            <option key={opt.key} value={opt.key}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Jenis Perhitungan</label>
                        <select className="select" value={aggregation} onChange={(e) => setAggregation(e.target.value)}>
                          <option value="sum">SUM (Total Jumlah)</option>
                          <option value="count">COUNT (Jumlah Dokumen)</option>
                          <option value="avg">AVERAGE (Rata-rata)</option>
                          <option value="max">MAX (Nilai Tertinggi)</option>
                          <option value="min">MIN (Nilai Terendah)</option>
                        </select>
                      </div>
                    </div>
                  ) : chartType === 'kpi_group' ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: 'var(--surface-0)',
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          flexWrap: 'wrap',
                          gap: '0.75rem',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Daftar KPI Card dalam Grup ({kpiItems.length} Card)
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Setiap KPI Card akan otomatis bertumpuk vertikal ke bawah di dashboard.
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => setShowGroupTitle(!showGroupTitle)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.4rem 0.65rem',
                              borderRadius: 'var(--radius-sm)',
                              border: `1px solid ${showGroupTitle ? 'var(--primary)' : 'var(--border-color)'}`,
                              backgroundColor: showGroupTitle ? 'var(--primary-subtle)' : 'var(--surface-1)',
                              color: showGroupTitle ? 'var(--primary)' : 'var(--text-secondary)',
                              fontSize: '0.75rem',
                              fontWeight: showGroupTitle ? 700 : 500,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            title="Klik untuk mengubah visibilitas judul grup di visualisasi dashboard"
                          >
                            {showGroupTitle ? <Check size={13} color="var(--primary)" strokeWidth={3} /> : <EyeOff size={13} />}
                            <span>{showGroupTitle ? 'Judul Grup Aktif' : 'Sembunyikan Judul Grup'}</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={addKpiItem}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.4rem 0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <Plus size={14} />
                            <span>Tambah KPI Card</span>
                          </button>
                        </div>
                      </div>

                      {/* KPI Item List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {kpiItems.map((item, idx) => (
                          <div
                            key={item.id || `kpi-${idx}`}
                            className="card"
                            style={{
                              backgroundColor: 'var(--surface-0)',
                              border: '1px solid var(--border-color)',
                              padding: '1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.75rem',
                              boxShadow: 'var(--shadow-xs)',
                            }}
                          >
                            {/* Item Header */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid var(--border-subtle)',
                                paddingBottom: '0.5rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, marginRight: '0.75rem' }}>
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: 'var(--primary)',
                                    backgroundColor: 'var(--primary-subtle)',
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: 'var(--radius-sm)',
                                  }}
                                >
                                  #{idx + 1}
                                </span>
                                <input
                                  type="text"
                                  className="input"
                                  value={item.title || ''}
                                  onChange={(e) => updateKpiItem(idx, 'title', e.target.value)}
                                  placeholder="Nama / Label KPI Card (Contoh: Total Sertifikat)"
                                  style={{
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    padding: '0.35rem 0.6rem',
                                  }}
                                />
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <button
                                  type="button"
                                  className="btn-icon"
                                  onClick={() => moveKpiItem(idx, -1)}
                                  disabled={idx === 0}
                                  title="Geser ke atas"
                                  style={{
                                    padding: '0.3rem',
                                    opacity: idx === 0 ? 0.35 : 1,
                                    cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon"
                                  onClick={() => moveKpiItem(idx, 1)}
                                  disabled={idx === kpiItems.length - 1}
                                  title="Geser ke bawah"
                                  style={{
                                    padding: '0.3rem',
                                    opacity: idx === kpiItems.length - 1 ? 0.35 : 1,
                                    cursor: idx === kpiItems.length - 1 ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="btn-icon"
                                  onClick={() => removeKpiItem(idx)}
                                  title="Hapus KPI ini dari grup"
                                  style={{
                                    padding: '0.3rem',
                                    color: 'var(--status-danger)',
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Item Form Grid */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                                gap: '0.625rem',
                              }}
                            >
                              <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Metrik Angka</label>
                                <select
                                  className="select"
                                  value={item.y_axis || 'Volume'}
                                  onChange={(e) => updateKpiItem(idx, 'y_axis', e.target.value)}
                                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                                >
                                  {allYOptions.map((opt) => (
                                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Perhitungan</label>
                                <select
                                  className="select"
                                  value={item.aggregation || 'sum'}
                                  onChange={(e) => updateKpiItem(idx, 'aggregation', e.target.value)}
                                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                                >
                                  <option value="sum">SUM (Total Jumlah)</option>
                                  <option value="count">COUNT (Jumlah Dokumen)</option>
                                  <option value="avg">AVERAGE (Rata-rata)</option>
                                  <option value="max">MAX (Nilai Tertinggi)</option>
                                  <option value="min">MIN (Nilai Terendah)</option>
                                </select>
                              </div>

                              <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Filter Sektor</label>
                                <select
                                  className="select"
                                  value={item.commodity_filter || 'all'}
                                  onChange={(e) => updateKpiItem(idx, 'commodity_filter', e.target.value)}
                                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                                >
                                  <option value="all">Semua Sektor</option>
                                  <option value="hewan">Karantina Hewan</option>
                                  <option value="ikan">Karantina Ikan</option>
                                  <option value="tumbuhan">Karantina Tumbuhan</option>
                                </select>
                              </div>

                              <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Filter Lalu Lintas</label>
                                <select
                                  className="select"
                                  value={item.traffic_filter || 'all'}
                                  onChange={(e) => updateKpiItem(idx, 'traffic_filter', e.target.value)}
                                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                                >
                                  <option value="all">Semua Arus</option>
                                  <option value="domestik_masuk">Domestik Masuk</option>
                                  <option value="domestik_keluar">Domestik Keluar</option>
                                  <option value="ekspor">Ekspor</option>
                                  <option value="impor">Impor</option>
                                </select>
                              </div>

                              <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Satuan Kustom (Opsional)</label>
                                <input
                                  type="text"
                                  className="input"
                                  value={item.unit || item.custom_unit || ''}
                                  onChange={(e) => updateKpiItem(idx, 'unit', e.target.value)}
                                  placeholder="Contoh: Kg, Dokumen, Rp"
                                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={addKpiItem}
                        style={{
                          padding: '0.75rem',
                          border: '2px dashed var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'transparent',
                          color: 'var(--primary)',
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Plus size={16} />
                        <span>+ Tambah KPI Card Baru ke Grup</span>
                      </button>
                    </div>
                  ) : chartType === 'map' ? (
                    <div
                      className="card"
                      style={{
                        backgroundColor: 'var(--surface-0)',
                        border: '1px solid var(--border-color)',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {/* Pilihan Kolom Geospasial */}
                        <div className="form-group">
                          <label className="form-label" style={{ fontWeight: 600 }}>
                            Kolom Lokasi Geospasial <span style={{ color: 'var(--status-danger)' }}>*</span>
                          </label>
                          <select
                            className="select"
                            value={mapColumn}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMapColumn(val);
                              if (val.toLowerCase().includes('negara')) {
                                setMapMode('world');
                              } else {
                                setMapMode('indonesia');
                              }
                            }}
                          >
                            <optgroup label="── ARUS DOMESTIK (INDONESIA) ──">
                              <option value="Daerah Asal">Daerah Asal (Kabupaten/Kota)</option>
                              <option value="Daerah Tujuan">Daerah Tujuan (Kabupaten/Kota)</option>
                              <option value="Pelabuhan Asal">Pelabuhan Asal</option>
                              <option value="Pelabuhan Tujuan">Pelabuhan Tujuan</option>
                            </optgroup>
                            <optgroup label="── ARUS LUAR NEGERI (DUNIA) ──">
                              <option value="Negara Asal">Negara Asal (Impor)</option>
                              <option value="Negara Tujuan">Negara Tujuan (Ekspor)</option>
                            </optgroup>
                            {dynamicXColumns.length > 0 && (
                              <optgroup label="── KOLOM LAINNYA ──">
                                {dynamicXColumns.map((c) => (
                                  <option key={c.key} value={c.key}>
                                    {c.label}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Nama daerah otomatis diagregasi ke 38 Provinsi (Indonesia) atau Negara (Dunia).
                          </span>
                        </div>

                        {/* Pilihan Cakupan Peta */}
                        <div className="form-group">
                          <label className="form-label" style={{ fontWeight: 600 }}>Cakupan Peta</label>
                          <select className="select" value={mapMode} onChange={(e) => setMapMode(e.target.value)}>
                            <option value="auto">Otomatis (Sesuai Filter Lalu Lintas & Kolom)</option>
                            <option value="indonesia">Peta Indonesia (38 Provinsi)</option>
                            <option value="world">Peta Dunia (Negara-negara Global)</option>
                          </select>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Pilih mode tampilan wilayah peta.
                          </span>
                        </div>
                      </div>

                      {/* Pilihan Gaya Tampilan Peta: Warna Wilayah vs Titik Dot */}
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Gaya Visualisasi Peta</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div
                            onClick={() => setMapStyle('choropleth')}
                            style={{
                              padding: '0.625rem 0.875rem',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: mapStyle === 'choropleth' ? 'var(--primary-subtle)' : 'var(--surface-1)',
                              border: `1.5px solid ${mapStyle === 'choropleth' ? 'var(--primary)' : 'var(--border-color)'}`,
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span style={{ fontSize: '0.8125rem', fontWeight: mapStyle === 'choropleth' ? 700 : 500, color: mapStyle === 'choropleth' ? 'var(--primary)' : 'var(--text-primary)' }}>
                              Warna / Arsiran Wilayah (Choropleth)
                            </span>
                            {mapStyle === 'choropleth' && <Check size={14} color="var(--primary)" strokeWidth={3} />}
                          </div>

                          <div
                            onClick={() => setMapStyle('bubble')}
                            style={{
                              padding: '0.625rem 0.875rem',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: mapStyle === 'bubble' ? 'var(--primary-subtle)' : 'var(--surface-1)',
                              border: `1.5px solid ${mapStyle === 'bubble' ? 'var(--primary)' : 'var(--border-color)'}`,
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span style={{ fontSize: '0.8125rem', fontWeight: mapStyle === 'bubble' ? 700 : 500, color: mapStyle === 'bubble' ? 'var(--primary)' : 'var(--text-primary)' }}>
                              Titik Lingkaran Proporsional (Bubble)
                            </span>
                            {mapStyle === 'bubble' && <Check size={14} color="var(--primary)" strokeWidth={3} />}
                          </div>
                        </div>
                      </div>

                      {/* Pilihan Tema Dasar / Lapisan Peta (Basemap Tile Layer) */}
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>
                          Tipe / Tema Dasar Peta (Basemap Tile Layer)
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                          {[
                            { id: 'light', label: 'Terang (Light)' },
                            { id: 'osm', label: 'OpenStreetMap' },
                            { id: 'voyager', label: 'Voyager' },
                            { id: 'dark', label: 'Gelap (Dark)' },
                          ].map((tile) => {
                            const isSelected = (mapTile || 'light') === tile.id;
                            return (
                              <div
                                key={tile.id}
                                onClick={() => setMapTile(tile.id)}
                                style={{
                                  padding: '0.625rem 0.875rem',
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: isSelected ? 'var(--primary-subtle)' : 'var(--surface-1)',
                                  border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '0.8125rem',
                                    fontWeight: isSelected ? 700 : 500,
                                    color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                                  }}
                                >
                                  {tile.label}
                                </span>
                                {isSelected && <Check size={14} color="var(--primary)" strokeWidth={3} />}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {/* Metrik Nilai / Ukuran */}
                        <div className="form-group">
                          <label className="form-label" style={{ fontWeight: 600 }}>
                            Metrik Nilai (Sumbu Y)
                          </label>
                          <select className="select" value={yAxis} onChange={(e) => handleYAxisChange(e.target.value)}>
                            {allYOptions.map((opt) => (
                              <option key={opt.key} value={opt.key}>{opt.label}</option>
                            ))}
                          </select>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Menentukan intensitas warna atau diameter bubble pada peta.
                          </span>
                        </div>

                        {/* Jenis Agregasi */}
                        <div className="form-group">
                          <label className="form-label" style={{ fontWeight: 600 }}>Jenis Agregasi</label>
                          <select className="select" value={aggregation} onChange={(e) => setAggregation(e.target.value)}>
                            <option value="sum">SUM (Total Jumlah Nilai/Volume)</option>
                            <option value="count">COUNT (Jumlah Frekuensi Sertifikat)</option>
                            <option value="avg">AVERAGE (Rata-rata per Dokumen)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="card"
                      style={{
                        backgroundColor: 'var(--surface-0)',
                        border: '1px solid var(--border-color)',
                        padding: '1rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '1rem',
                      }}
                    >
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>
                          {['pie', 'donut'].includes(chartType) ? 'Sumbu Irisan Kategori' : 'Sumbu Kategori (Sumbu X)'}
                        </label>
                        <select className="select" value={xAxis} onChange={(e) => setXAxis(e.target.value)}>
                          {allXOptions.map((opt) => (
                            <option key={opt.key} value={opt.key}>{opt.label}</option>
                          ))}
                        </select>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Pengelompokan data (misal: Komoditas, Satpel, Bulan).
                        </span>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>
                          {['pie', 'donut'].includes(chartType) ? 'Metrik Ukuran Irisan' : 'Metrik Nilai (Sumbu Y)'}
                        </label>
                        <select className="select" value={yAxis} onChange={(e) => handleYAxisChange(e.target.value)}>
                          {allYOptions.map((opt) => (
                            <option key={opt.key} value={opt.key}>{opt.label}</option>
                          ))}
                        </select>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Ukuran kuantitas/rupiah grafik.
                        </span>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Jenis Agregasi</label>
                        <select className="select" value={aggregation} onChange={(e) => setAggregation(e.target.value)}>
                          <option value="sum">SUM (Total Jumlah Nilai/Volume)</option>
                          <option value="count">COUNT (Jumlah Sertifikat / Frekuensi)</option>
                          <option value="avg">AVERAGE (Rata-rata)</option>
                          <option value="max">MAX (Nilai Tertinggi)</option>
                          <option value="min">MIN (Nilai Terendah)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Filter Sektor & Lalu Lintas (Untuk semua tipe kecuali KPI Group yang sudah memiliki filter per-item) */}
                  {chartType !== 'kpi_group' && (
                    <div
                      className="card"
                      style={{
                        backgroundColor: 'var(--surface-0)',
                        border: '1px solid var(--border-color)',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                      }}
                    >
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>
                          Filter Sektor Karantina
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                          {[
                            { id: 'all', label: 'Semua Sektor' },
                            { id: 'hewan', label: 'Karantina Hewan' },
                            { id: 'ikan', label: 'Karantina Ikan' },
                            { id: 'tumbuhan', label: 'Karantina Tumbuhan' },
                          ].map((sec) => {
                            const isSelected = commodityFilter === sec.id;
                            return (
                              <div
                                key={sec.id}
                                onClick={() => setCommodityFilter(sec.id)}
                                style={{
                                  padding: '0.625rem 0.75rem',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: isSelected ? 'var(--primary-subtle)' : 'var(--surface-1)',
                                  border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <input type="radio" checked={isSelected} readOnly style={{ accentColor: 'var(--primary)' }} />
                                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                                  {sec.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>
                          Filter Arus Lalu Lintas
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                          {[
                            { id: 'all', label: 'Semua Arus' },
                            { id: 'domestik_masuk', label: 'Domestik Masuk' },
                            { id: 'domestik_keluar', label: 'Domestik Keluar' },
                            { id: 'ekspor', label: 'Ekspor' },
                            { id: 'impor', label: 'Impor' },
                          ].map((trf) => {
                            const isSelected = trafficFilter === trf.id;
                            return (
                              <div
                                key={trf.id}
                                onClick={() => setTrafficFilter(trf.id)}
                                style={{
                                  padding: '0.625rem 0.75rem',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: isSelected ? 'var(--primary-subtle)' : 'var(--surface-1)',
                                  border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <input type="radio" checked={isSelected} readOnly style={{ accentColor: 'var(--primary)' }} />
                                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                                  {trf.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigasi Cepat ke Tab Berikutnya */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={() => setActiveTab('filter_series')}
                    >
                      <span>Lanjut ke Filter &amp; Pembagian</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* ================= TAB 2: FILTER & PEMBAGIAN SERI ================= */}
              {activeTab === 'filter_series' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {['data_table', 'kpi_card', 'kpi_group', 'map'].includes(chartType) ? (
                    <div
                      className="card"
                      style={{
                        backgroundColor: 'var(--surface-0)',
                        border: '1px solid var(--border-color)',
                        padding: '2.5rem 1.5rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--surface-2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <SlidersHorizontal size={20} />
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        Tidak Ada Pengaturan Pembagian Seri
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.5 }}>
                        {chartType === 'kpi_group'
                          ? 'Setiap KPI Card dalam grup telah memiliki konfigurasi filter dan metrik masing-masing pada tab 1 (Tipe & Sumber Data).'
                          : chartType === 'data_table'
                          ? 'Pengelompokan baris, metrik rekapitulasi, batasan baris, dan filter untuk Tabel Data sudah lengkap diatur pada tab 1 (Tipe & Sumber Data).'
                          : `Konfigurasi data, metrik, dan filter untuk visualisasi ${chartTypes.find((t) => t.id === chartType)?.label || chartType} sudah lengkap diatur pada tab 1 (Tipe & Sumber Data).`}
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setActiveTab('style_layout')}
                        style={{ fontSize: '0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <span>Lanjut ke Tab 3: Tampilan &amp; Satuan</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  ) : (
                    <div
                      className="card"
                      style={{
                        backgroundColor: 'var(--surface-0)',
                        border: '1px solid var(--border-color)',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                          <label className="form-label" style={{ fontWeight: 600 }}>
                            Batas Jumlah Data (Limit Top-N)
                          </label>
                          <select className="select" value={topN} onChange={(e) => setTopN(e.target.value)}>
                            <option value="5">Top 5 Teratas</option>
                            <option value="10">Top 10 Teratas</option>
                            <option value="15">Top 15 Teratas</option>
                            <option value="20">Top 20 Teratas</option>
                            <option value="50">Top 50 Teratas</option>
                            <option value="all">Tampilkan Semua Data (Tanpa Batas)</option>
                          </select>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Membatasi jumlah kategori teratas yang ditampilkan pada grafik.
                          </span>
                        </div>

                        <div className="form-group">
                          <label className="form-label" style={{ fontWeight: 600 }}>Gabungkan Sisa ke "Lainnya"?</label>
                          <select className="select" value={groupOthers ? 'true' : 'false'} onChange={(e) => setGroupOthers(e.target.value === 'true')}>
                            <option value="true">Ya, gabungkan sisa ke "Lainnya"</option>
                            <option value="false">Tidak, sembunyikan sisa</option>
                          </select>
                        </div>
                      </div>

                      {/* Multi-Series Grouping - ONLY for bar, horizontal_bar, line, area */}
                      {!['pie', 'donut'].includes(chartType) && (
                        <div className="form-group" style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                          <label className="form-label" style={{ fontWeight: 600 }}>Bagi Menjadi Beberapa Seri / Garis (Multi-Series)</label>
                          <select className="select" value={seriesBreakdown} onChange={(e) => setSeriesBreakdown(e.target.value)}>
                            <option value="none">Tanpa Pembagian (Seri Tunggal)</option>
                            <option value="commodity_type">Bagi Per Sektor (Hewan, Ikan, Tumbuhan)</option>
                            <option value="traffic_type">Bagi Per Arus Lalu Lintas (Masuk, Keluar, Ekspor, Impor)</option>
                            <option value="Satpel">Bagi Per Satuan Pelayanan (Satpel / Wilker)</option>
                          </select>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Membuat grafik memiliki beberapa batang berdampingan atau multi-line series.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Navigasi Tab */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={() => setActiveTab('type_data')}
                    >
                      <ArrowLeft size={14} />
                      <span>Kembali</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={() => setActiveTab('style_layout')}
                    >
                      <span>Lanjut ke Tampilan</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* ================= TAB 3: TAMPILAN, SATUAN & LAYOUT ================= */}
              {activeTab === 'style_layout' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Selector Lebar Layout */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Lebar Kartu di Dashboard</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem' }}>
                      {[
                        { id: 'sixth', label: '16.7% (1/6)', desc: '6 Kolom sangat kecil' },
                        { id: 'fifth', label: '20% (1/5)', desc: '5 Kolom ringkas' },
                        { id: 'quarter', label: '25% (1/4)', desc: 'Pas untuk KPI Card / Group' },
                        { id: 'third', label: '33% (1/3)', desc: '3 Kolom sejajar' },
                        { id: 'half', label: '50% (1/2)', desc: '2 Kolom standar' },
                        { id: 'two_thirds', label: '66% (2/3)', desc: 'Besar / damping KPI' },
                        { id: 'three_quarters', label: '75% (3/4)', desc: '3/4 Layar' },
                        { id: 'full', label: '100% (Penuh)', desc: '1 Baris penuh' },
                      ].map((w) => {
                        const isSelected = width === w.id;
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => setWidth(w.id)}
                            style={{
                              padding: '0.625rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                              backgroundColor: isSelected ? 'var(--primary-subtle)' : 'var(--surface-0)',
                              color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div>{w.label}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{w.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pengaturan Khusus Bar Chart (Data Labels & Satuan) */}
                  {['bar', 'horizontal_bar'].includes(chartType) && (
                    <div
                      className="card"
                      style={{
                        backgroundColor: 'var(--surface-0)',
                        border: '1px solid var(--border-color)',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                      }}
                    >
                      <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 600 }}>Tampilkan Label Angka pada Batang (Data Labels)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxWidth: '340px' }}>
                          <button
                            type="button"
                            onClick={() => setShowDataLabels(false)}
                            style={{
                              padding: '0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: !showDataLabels ? 'var(--primary-subtle)' : 'var(--surface-1)',
                              border: `1px solid ${!showDataLabels ? 'var(--primary)' : 'var(--border-color)'}`,
                              color: !showDataLabels ? 'var(--primary)' : 'var(--text-secondary)',
                              fontWeight: !showDataLabels ? 700 : 500,
                              fontSize: '0.8125rem',
                              cursor: 'pointer',
                            }}
                          >
                            Sembunyikan Angka
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDataLabels(true)}
                            style={{
                              padding: '0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: showDataLabels ? 'var(--primary-subtle)' : 'var(--surface-1)',
                              border: `1px solid ${showDataLabels ? 'var(--primary)' : 'var(--border-color)'}`,
                              color: showDataLabels ? 'var(--primary)' : 'var(--text-secondary)',
                              fontWeight: showDataLabels ? 700 : 500,
                              fontSize: '0.8125rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <Check size={14} style={{ display: showDataLabels ? 'inline' : 'none' }} />
                            <span>Tampilkan Angka</span>
                          </button>
                        </div>
                      </div>

                      {showDataLabels && (
                        <div className="form-group" style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                          <label className="form-label" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                            Pilih Format Satuan / Unit Nilai
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '0.35rem' }}>
                            {[
                              { id: 'auto', label: 'Otomatis (Kolom)' },
                              { id: 'Rp', label: 'Rupiah (Rp)' },
                              { id: 'Kg', label: 'Kilogram (Kg)' },
                              { id: 'Ton', label: 'Ton' },
                              { id: 'Sertifikat', label: 'Sertifikat' },
                              { id: 'Ekor', label: 'Ekor' },
                              { id: 'Batang', label: 'Batang' },
                              { id: 'none', label: 'Tanpa Satuan' },
                              { id: 'custom', label: 'Kustom...' },
                            ].map((u) => {
                              const isSel = valueUnit === u.id;
                              return (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => setValueUnit(u.id)}
                                  style={{
                                    padding: '0.4rem 0.5rem',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: isSel ? 'var(--primary)' : 'var(--surface-1)',
                                    color: isSel ? '#ffffff' : 'var(--text-secondary)',
                                    border: `1px solid ${isSel ? 'var(--primary)' : 'var(--border-color)'}`,
                                    fontSize: '0.75rem',
                                    fontWeight: isSel ? 600 : 400,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  {u.label}
                                </button>
                              );
                            })}
                          </div>

                          {valueUnit === 'custom' && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <input
                                type="text"
                                className="input"
                                style={{ fontSize: '0.8125rem', padding: '0.4rem 0.625rem' }}
                                placeholder="Ketik satuan kustom (misal: Liter, Dus, Pcs, Kontainer)"
                                value={customUnit}
                                onChange={(e) => setCustomUnit(e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pengaturan Format Legenda Pie/Donut */}
                  {['pie', 'donut'].includes(chartType) && (
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 600 }}>Format Tampilan Keterangan / Legenda</label>
                      <select className="select" value={legendDisplay} onChange={(e) => setLegendDisplay(e.target.value)}>
                        <option value="name_value">Nama Komoditas + Nilai Total</option>
                        <option value="name_percent">Nama Komoditas + Persentase (%)</option>
                        <option value="full">Lengkap (Nama + Nilai + % Persentase)</option>
                        <option value="name_only">Hanya Nama Komoditas</option>
                      </select>
                    </div>
                  )}

                  {/* Navigasi Tab */}
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      onClick={() => setActiveTab('filter_series')}
                    >
                      <ArrowLeft size={14} />
                      <span>Kembali ke Filter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ----------------- KOLOM KANAN: LIVE INTERACTIVE PREVIEW ----------------- */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--surface-0)',
              overflow: 'hidden',
              padding: '1.25rem 1.5rem',
              gap: '1rem',
            }}
          >
            {/* Live Preview Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--status-success)',
                    display: 'inline-block',
                    boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
                  }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Pratinjau Langsung (Live Preview)
                </span>
              </div>

              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Simulasi Lebar: <strong>{(width || 'half').toUpperCase()}</strong>
              </span>
            </div>

            {/* Live Render Area with ErrorBoundary Protection */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                backgroundColor: 'var(--surface-1)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                padding: '1rem',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              <PreviewErrorBoundary chartConfig={currentDraftConfig}>
                <ChartRenderer
                  chartConfig={currentDraftConfig}
                  rawData={previewRecords}
                />
              </PreviewErrorBoundary>
            </div>

            {/* Quick Param Chips Summary */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.35rem',
                backgroundColor: 'var(--surface-1)',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                flexShrink: 0,
              }}
            >
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Parameter Aktif:</span>
              <span className="badge badge-subtle">{chartTypes.find((t) => t.id === chartType)?.label || chartType || 'Visual'}</span>
              {chartType === 'kpi_group' ? (
                <>
                  <span className="badge badge-subtle">Total: {kpiItems.length} KPI Card</span>
                  <span className="badge badge-subtle">Judul: {showGroupTitle ? 'Tampil' : 'Sembunyi'}</span>
                  <span className="badge badge-subtle">Layout: Vertikal</span>
                </>
              ) : chartType === 'data_table' ? (
                <>
                  <span className="badge badge-subtle">Mode: {tableMode === 'aggregate' ? 'Rekapitulasi' : 'Rincian'}</span>
                  {tableMode === 'aggregate' && <span className="badge badge-subtle">Grup: {groupByCol}</span>}
                </>
              ) : chartType === 'map' ? (
                <>
                  <span className="badge badge-subtle">Lokasi: {mapColumn}</span>
                  <span className="badge badge-subtle">Mode: {mapMode === 'auto' ? 'Otomatis' : mapMode === 'indonesia' ? 'Indonesia' : 'Dunia'}</span>
                  <span className="badge badge-subtle">Gaya: {mapStyle === 'choropleth' ? 'Choropleth' : 'Bubble'}</span>
                  <span className="badge badge-subtle">Tile: {(mapTile || 'light').toUpperCase()}</span>
                  <span className="badge badge-subtle">Metrik: {yAxis} ({(aggregation || 'sum').toUpperCase()})</span>
                </>
              ) : (
                <>
                  <span className="badge badge-subtle">X: {xAxis}</span>
                  <span className="badge badge-subtle">Y: {yAxis} ({(aggregation || 'sum').toUpperCase()})</span>
                </>
              )}
              {chartType !== 'map' && chartType !== 'kpi_card' && chartType !== 'kpi_group' && (
                <span className="badge badge-subtle">Top-N: {topN === 'all' ? 'Semua Data' : `Top ${topN}`}</span>
              )}
              {chartType !== 'kpi_group' && <span className="badge badge-subtle">Sektor: {commodityFilter}</span>}
              {chartType !== 'kpi_group' && <span className="badge badge-subtle">Lalu Lintas: {trafficFilter}</span>}
              {showDataLabels && chartType !== 'map' && chartType !== 'kpi_card' && chartType !== 'kpi_group' && (
                <span className="badge badge-subtle">Satuan: {valueUnit === 'custom' ? customUnit : valueUnit}</span>
              )}
            </div>
          </div>
        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div
          style={{
            padding: '1rem 1.75rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--surface-0)',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Perubahan dapat diedit kembali kapan saja dari menu Kustomisasi Dashboard.
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem' }}
            >
              Batal
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              style={{
                padding: '0.6rem 1.5rem',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
              }}
            >
              <Check size={16} />
              <span>Simpan Visualisasi</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
