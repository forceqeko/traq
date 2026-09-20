import { useMemo } from 'react';
import { aggregateData } from '@/lib/data/aggregation';
import BarChartComponent from './BarChartComponent';
import HorizontalBarChartComponent from './HorizontalBarChartComponent';
import LineChartComponent from './LineChartComponent';
import AreaChartComponent from './AreaChartComponent';
import PieChartComponent from './PieChartComponent';
import KpiCardComponent from './KpiCardComponent';
import DataTableComponent from './DataTableComponent';
import MapChartComponent from './MapChartComponent';
import KpiGroupContainer from './KpiGroupContainer';
import styles from './charts.module.css';

export default function ChartRenderer({ chartConfig = {}, rawData = [], height, hideCard = false }) {
  const {
    title = 'Visualisasi Data',
    chart_type = 'bar',
    config = {},
  } = chartConfig;

  const {
    commodity_filter = 'all',
    traffic_filter = 'all',
    x_axis = 'Komoditas',
    y_axis = 'Volume',
    aggregation = 'sum',
    top_n = '10',
    group_others = true,
    group_by,
    colors,
  } = config;

  // Filter rawData according to user-selected commodity sector & traffic type
  const filteredRawData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];
    const commFilter = (commodity_filter || 'all').toLowerCase().trim();
    const trafFilter = (traffic_filter || 'all').toLowerCase().trim();

    return rawData.filter((r) => {
      const row = r.row_data || r || {};

      // 1. Commodity Sector Filter
      if (commFilter && commFilter !== 'all') {
        const commType = String(row._commodity_type || row.commodity_type || '').toLowerCase().trim();
        const dsCode = String(row._dataset_code || '').toLowerCase().trim();
        const dsName = String(row._dataset_name || '').toLowerCase().trim();
        if (commType) {
          if (commType !== commFilter) return false;
        } else if (dsCode.includes(commFilter) || dsName.includes(commFilter)) {
          // matched from dataset metadata
        } else {
          const klasifikasi = String(row.Klasifikasi || row.Komoditas || row.Jenis_Komoditas || '').toLowerCase();
          if (!klasifikasi.includes(commFilter)) return false;
        }
      }

      // 2. Traffic Type Filter
      if (trafFilter && trafFilter !== 'all') {
        const trafType = String(row._traffic_type || row.traffic_type || '').toLowerCase().trim();
        const dsCode = String(row._dataset_code || '').toLowerCase().trim();
        const dsName = String(row._dataset_name || '').toLowerCase().trim();
        if (trafType) {
          if (trafType !== trafFilter) return false;
        } else if (dsCode.includes(trafFilter) || dsName.includes(trafFilter)) {
          // matched from dataset metadata
        } else {
          const trafficStr = String(row.Arah_Lalu_Lintas || row.TRAFFIC || row.Arah || '').toLowerCase();
          if (trafFilter === 'domestik_masuk') {
            if (!(trafficStr.includes('masuk') || trafficStr.includes('dm'))) return false;
          } else if (trafFilter === 'domestik_keluar') {
            if (!(trafficStr.includes('keluar') || trafficStr.includes('dk'))) return false;
          } else if (trafFilter === 'ekspor') {
            if (!trafficStr.includes('ekspor')) return false;
          } else if (trafFilter === 'impor') {
            if (!trafficStr.includes('impor')) return false;
          }
        }
      }

      return true;
    });
  }, [rawData, commodity_filter, traffic_filter]);

  // Process and aggregate data cleanly according to user's Top-N and grouping settings
  const processedData = useMemo(() => {
    if (!filteredRawData || filteredRawData.length === 0) return [];
    return aggregateData(filteredRawData, {
      xAxis: x_axis,
      yAxis: y_axis,
      aggregation,
      topN: top_n,
      groupOthers: group_others,
      groupBy: group_by,
    });
  }, [filteredRawData, x_axis, y_axis, aggregation, top_n, group_others, group_by]);

  // Extract dynamic series keys for multi-series charts (e.g. ['Hewan', 'Ikan', 'Tumbuhan'])
  const seriesKeys = useMemo(() => {
    if (!processedData || processedData.length === 0 || !group_by || group_by === 'none') return [];
    const keys = new Set();
    const excludeKeys = new Set(['name', 'value', x_axis, y_axis]);
    processedData.forEach((item) => {
      Object.keys(item).forEach((k) => {
        if (!excludeKeys.has(k) && !k.startsWith('_')) {
          keys.add(k);
        }
      });
    });
    return Array.from(keys);
  }, [processedData, group_by, x_axis, y_axis]);

  const renderChartBody = () => {
    switch (chart_type.toLowerCase()) {
      case 'kpi_card':
        return (
          <KpiCardComponent
            data={filteredRawData}
            yAxis={y_axis}
            aggregation={aggregation}
            title={title}
          />
        );

      case 'kpi_group':
        return (
          <KpiGroupContainer
            title={title}
            config={config}
            rawData={rawData}
          />
        );

      case 'line':
        return (
          <LineChartComponent
            data={processedData}
            xAxisKey={x_axis}
            yAxisKey={y_axis}
            seriesKeys={seriesKeys}
            colors={colors}
          />
        );

      case 'horizontal_bar':
      case 'bar_horizontal':
        return (
          <HorizontalBarChartComponent
            data={processedData}
            xAxisKey={x_axis}
            yAxisKey={y_axis}
            seriesKeys={seriesKeys}
            colors={colors}
            showDataLabels={config.show_data_labels ?? false}
            valueUnit={config.value_unit || 'auto'}
          />
        );

      case 'area':
        return (
          <AreaChartComponent
            data={processedData}
            xAxisKey={x_axis}
            yAxisKey={y_axis}
            seriesKeys={seriesKeys}
            colors={colors}
          />
        );

      case 'pie':
        return (
          <PieChartComponent
            data={processedData}
            nameKey={x_axis}
            dataKey={y_axis}
            isDonut={false}
            colors={colors}
            legendDisplay={config.legend_display || 'name_value'}
          />
        );

      case 'donut':
        return (
          <PieChartComponent
            data={processedData}
            nameKey={x_axis}
            dataKey={y_axis}
            isDonut={true}
            colors={colors}
            legendDisplay={config.legend_display || 'name_value'}
          />
        );

      case 'data_table':
        return (
          <DataTableComponent
            data={filteredRawData}
            tableMode={config.table_mode || (config.group_by ? 'aggregate' : 'raw')}
            groupBy={config.group_by || 'Satpel'}
            metrics={config.metrics || ['certs', 'rows', 'volume', 'value']}
            sortBy={config.sort_by || 'certs_desc'}
            columns={config.columns || []}
            topN={config.top_n || 'all'}
            pageSize={config.page_size || 10}
          />
        );

      case 'map':
        return (
          <MapChartComponent
            data={filteredRawData}
            config={{
              ...config,
              commodity_filter,
              traffic_filter,
            }}
          />
        );

      default:
        return (
          <BarChartComponent
            data={processedData}
            xAxisKey={x_axis}
            yAxisKey={y_axis}
            seriesKeys={seriesKeys}
            colors={colors}
            showDataLabels={config.show_data_labels ?? false}
            valueUnit={config.value_unit || 'auto'}
          />
        );
    }
  };

  if (chart_type === 'kpi_card' || chart_type === 'kpi_group') {
    return renderChartBody();
  }

  if (hideCard) {
    return (
      <div style={{ width: '100%', height: '100%', minHeight: 0, position: 'relative' }}>
        {renderChartBody()}
      </div>
    );
  }

  const cardStyle = height
    ? { minHeight: `${height}px`, height: `${height}px` }
    : undefined;

  const bodyStyle = height
    ? { minHeight: `${Math.max(160, height - 70)}px`, height: `${Math.max(160, height - 70)}px` }
    : undefined;

  return (
    <div className={styles.chartCard} style={cardStyle}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>{title}</h3>
      </div>
      <div className={styles.chartBody} style={bodyStyle}>{renderChartBody()}</div>
    </div>
  );
}
