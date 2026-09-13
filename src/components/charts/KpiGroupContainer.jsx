import React, { useMemo } from 'react';
import KpiCardComponent from './KpiCardComponent';

/**
 * Filter data array specifically for an individual KPI item
 */
function filterDataForKpi(rawData = [], commodityFilter = 'all', trafficFilter = 'all') {
  if (!rawData || rawData.length === 0) return [];
  const commFilter = (commodityFilter || 'all').toLowerCase().trim();
  const trafFilter = (trafficFilter || 'all').toLowerCase().trim();

  if (commFilter === 'all' && trafFilter === 'all') {
    return rawData;
  }

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
      } else if (
        (trafFilter === 'domestik_masuk' && (dsCode.startsWith('dm_') || dsCode.includes('dm') || dsName.includes('masuk'))) ||
        (trafFilter === 'domestik_keluar' && (dsCode.startsWith('dk_') || dsCode.includes('dk') || dsName.includes('keluar'))) ||
        (trafFilter === 'ekspor' && (dsCode.startsWith('ekspor_') || dsCode.includes('ekspor') || dsName.includes('ekspor'))) ||
        (trafFilter === 'impor' && (dsCode.startsWith('impor_') || dsCode.includes('impor') || dsName.includes('impor')))
      ) {
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
}

export default function KpiGroupContainer({
  title = '',
  config = {},
  rawData = [],
}) {
  const kpiItems = useMemo(() => {
    if (Array.isArray(config.kpi_items) && config.kpi_items.length > 0) {
      return config.kpi_items;
    }
    if (Array.isArray(config.kpiItems) && config.kpiItems.length > 0) {
      return config.kpiItems;
    }
    // Fallback: If single KPI configured in root config
    return [
      {
        title: title || 'Total Metrik',
        y_axis: config.y_axis || 'Frekuensi',
        aggregation: config.aggregation || 'count',
        commodity_filter: config.commodity_filter || 'all',
        traffic_filter: config.traffic_filter || 'all',
        unit: config.custom_unit || config.value_unit || '',
      },
    ];
  }, [config, title]);

  // Clean group title (don't show if hidden by config, disabled, or if placeholder/dash)
  const displayGroupTitle = useMemo(() => {
    if (config.show_group_title === false || config.show_title === false || config.hide_title === true) {
      return null;
    }
    if (!title) return null;
    const trimmed = title.trim();
    if (!trimmed || trimmed === '-' || trimmed === '•' || trimmed === '_') {
      return null;
    }
    const lower = trimmed.toLowerCase();
    if (
      lower === 'visualisasi data' ||
      lower === 'kpi group' ||
      lower === 'pratinjau visualisasi data' ||
      lower === 'untitled' ||
      lower === 'tanpa judul'
    ) {
      return null;
    }
    return trimmed;
  }, [title, config.show_group_title, config.show_title, config.hide_title]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        width: '100%',
        height: '100%',
        justifyContent: 'flex-start',
      }}
    >
      {displayGroupTitle && (
        <div
          style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            padding: '0.25rem 0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              display: 'inline-block',
            }}
          />
          {displayGroupTitle}
        </div>
      )}

      {kpiItems.map((item, index) => {
        const itemCommFilter = item.commodity_filter || config.commodity_filter || 'all';
        const itemTrafFilter = item.traffic_filter || config.traffic_filter || 'all';
        const itemFilteredData = filterDataForKpi(rawData, itemCommFilter, itemTrafFilter);

        return (
          <div key={item.id || `kpi-item-${index}`} style={{ width: '100%', flex: '1 1 auto' }}>
            <KpiCardComponent
              title={item.title || `KPI #${index + 1}`}
              data={itemFilteredData}
              yAxis={item.y_axis || item.yAxis || 'Frekuensi'}
              aggregation={item.aggregation || 'count'}
              unit={item.unit || item.custom_unit || ''}
              color={item.color}
              icon={item.icon}
            />
          </div>
        );
      })}
    </div>
  );
}
