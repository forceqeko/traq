import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { resolveProvince, resolveCountry, PROVINCE_COORDINATES } from '@/lib/data/geoData';
import indonesiaGeoJson from '@/lib/data/indonesia-38-provinces.json';
import worldGeoJson from '@/lib/data/world-countries.json';
import { MapPin } from 'lucide-react';
import { getCertificateId } from '@/lib/data/aggregation';

/**
 * Auto-resizes Leaflet map when rendered inside tabs, modals, or animated containers.
 */
function MapResizeHandler({ center, zoom, maxBounds, dataVersionKey }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      if (maxBounds) {
        map.setMaxBounds(maxBounds);
      }
      setTimeout(() => {
        map.invalidateSize();
        if (center) {
          map.setView(center, zoom, { animate: false });
        }
      }, 150);
    }
  }, [map, center, zoom, maxBounds, dataVersionKey]);
  return null;
}

/**
 * Format numbers cleanly (e.g. 1.250 Sertifikat, 1.250.000 Kg, Rp 5,2 Miliar)
 */
function formatMetricValue(val, metricType = 'volume') {
  if (val == null || isNaN(val)) return '0';
  const num = Number(val);

  if (metricType === 'count') {
    return `${num.toLocaleString('id-ID')} Sertifikat`;
  }

  if (metricType === 'currency' || metricType === 'value') {
    if (num >= 1_000_000_000) {
      return `Rp ${(num / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
    }
    if (num >= 1_000_000) {
      return `Rp ${(num / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Jt`;
    }
    return `Rp ${num.toLocaleString('id-ID')}`;
  }

  if (metricType === 'volume') {
    if (num >= 1_000_000) {
      return `${(num / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Ton`;
    }
    return `${num.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Kg`;
  }

  return num.toLocaleString('id-ID');
}

const MAP_TILE_PROVIDERS = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
};

export default function MapChartComponent({ data = [], config = {}, height = 450 }) {
  const {
    map_mode,
    map_style = 'choropleth', // 'choropleth' (warna wilayah) | 'bubble' (titik dot)
    map_tile = 'light', // 'light' | 'osm' | 'voyager' | 'dark'
    map_column,
    y_axis = 'Volume',
    aggregation = 'sum',
    traffic_filter = 'all',
    colors = ['#3B82F6', '#0D9488', '#F59E0B', '#8B5CF6', '#10B981'],
  } = config;

  const activeMapStyle = map_style || 'choropleth';
  const tileConfig = MAP_TILE_PROVIDERS[map_tile] || MAP_TILE_PROVIDERS.light;

  // Determine active metric type: 'count' | 'currency' | 'volume'
  const activeMetricType = useMemo(() => {
    const yLower = String(y_axis || '').toLowerCase();
    if (
      yLower.includes('frekuensi') ||
      yLower.includes('sertifikat') ||
      yLower.includes('count') ||
      aggregation === 'count'
    ) {
      return 'count';
    }
    if (yLower.includes('harga') || yLower.includes('nilai') || yLower.includes('rupiah')) {
      return 'currency';
    }
    return 'volume';
  }, [y_axis, aggregation]);

  const metricLabel = useMemo(() => {
    if (activeMetricType === 'count') return 'Frekuensi Sertifikat';
    if (activeMetricType === 'currency') return 'Nilai Komoditas';
    return 'Total Volume';
  }, [activeMetricType]);

  // Determine active mode: Indonesia vs World
  const activeMode = useMemo(() => {
    if (map_mode === 'world' || map_mode === 'indonesia') return map_mode;

    const traf = String(traffic_filter || '').toLowerCase();
    const col = String(map_column || '').toLowerCase();

    if (traf.includes('ekspor') || traf.includes('impor') || col.includes('negara')) {
      return 'world';
    }
    return 'indonesia';
  }, [map_mode, traffic_filter, map_column]);

  // Determine target column in raw data
  const targetColumn = useMemo(() => {
    if (map_column) return map_column;
    if (activeMode === 'world') {
      const traf = String(traffic_filter || '').toLowerCase();
      return traf.includes('impor') ? 'Negara Asal' : 'Negara Tujuan';
    }
    const traf = String(traffic_filter || '').toLowerCase();
    return traf.includes('keluar') ? 'Daerah Tujuan' : 'Daerah Asal';
  }, [map_column, activeMode, traffic_filter]);

  // Center & Initial Zoom & Bounded Limits
  const mapCenter = activeMode === 'indonesia' ? [-2.2, 118.0] : [20.0, 10.0];
  const mapZoom = activeMode === 'indonesia' ? 5 : 2;
  const minZoom = activeMode === 'indonesia' ? 4 : 2;

  // Restrict bounds so map cannot be dragged outside single bounded area
  const maxBounds = useMemo(() => {
    if (activeMode === 'indonesia') {
      return [
        [-15.0, 92.0], // South-West coordinate
        [10.0, 144.0], // North-East coordinate
      ];
    }
    // World bounds: single page frame (-85 to 85 lat, -180 to 180 lng)
    return [
      [-85.0, -180.0],
      [85.0, 180.0],
    ];
  }, [activeMode]);

  // Process & Aggregate Geospatial Data
  const { aggregatedLocations, locationLookupMap, minVal, maxVal } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        aggregatedLocations: [],
        locationLookupMap: new Map(),
        minVal: 0,
        maxVal: 1,
      };
    }

    const groupMap = new Map();

    data.forEach((item) => {
      const row = item.row_data || item || {};

      const rawLoc =
        row[targetColumn] ||
        row['Daerah Asal'] ||
        row['Daerah Tujuan'] ||
        row['Negara Asal'] ||
        row['Negara Tujuan'] ||
        row['Pelabuhan Asal'] ||
        row['Pelabuhan Tujuan'] ||
        '';

      if (!rawLoc || typeof rawLoc !== 'string' || !rawLoc.trim()) return;

      let geoInfo = null;
      let locationKey = '';

      if (activeMode === 'indonesia') {
        geoInfo = resolveProvince(rawLoc);
        if (geoInfo) locationKey = geoInfo.provinceName;
      } else {
        geoInfo = resolveCountry(rawLoc);
        if (geoInfo) locationKey = geoInfo.name;
      }

      if (!geoInfo || !locationKey) return;

      if (!groupMap.has(locationKey)) {
        groupMap.set(locationKey, {
          name: locationKey,
          lat: geoInfo.lat,
          lng: geoInfo.lng,
          totalValue: 0,
          uniqueCerts: new Set(),
          rowCount: 0,
          totalVolume: 0,
          totalPrice: 0,
          commodities: new Map(),
        });
      }

      const entry = groupMap.get(locationKey);
      entry.rowCount += 1;

      // Extract unique certificate number
      const certNo = getCertificateId(row, row.id);
      if (certNo) entry.uniqueCerts.add(certNo);

      // Extract volume & price
      const vol = Number(row.Volume ?? row['Netto P8'] ?? row['Netto P1'] ?? row.Netto ?? 0) || 0;
      const price = Number(row.Nilai_Rupiah ?? row['Harga Barang (Rp)'] ?? row.Harga ?? 0) || 0;

      entry.totalVolume += vol;
      entry.totalPrice += price;

      // Top commodities tracking
      const commName = String(row.Komoditas || row.Klasifikasi || 'Lainnya').trim();
      entry.commodities.set(commName, (entry.commodities.get(commName) || 0) + (vol || 1));
    });

    let min = Infinity;
    let max = -Infinity;
    const lookup = new Map();

    const list = Array.from(groupMap.values()).map((entry) => {
      let finalVal = 0;
      if (activeMetricType === 'count') {
        finalVal = entry.uniqueCerts.size;
      } else if (activeMetricType === 'currency') {
        finalVal = entry.totalPrice;
      } else {
        finalVal = entry.totalVolume;
      }

      if (aggregation === 'avg') {
        const divisor = entry.uniqueCerts.size || entry.rowCount || 1;
        finalVal = finalVal / divisor;
      }

      const sortedComm = Array.from(entry.commodities.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cName]) => cName);

      const obj = {
        ...entry,
        certCount: entry.uniqueCerts.size,
        metricValue: finalVal,
        topCommodities: sortedComm,
      };

      if (finalVal < min) min = finalVal;
      if (finalVal > max) max = finalVal;

      lookup.set(entry.name.toUpperCase(), obj);
      return obj;
    });

    return {
      aggregatedLocations: list.sort((a, b) => b.metricValue - a.metricValue),
      locationLookupMap: lookup,
      minVal: min === Infinity ? 0 : min,
      maxVal: max === -Infinity ? 1 : max,
    };
  }, [data, targetColumn, activeMode, activeMetricType, aggregation]);

  // Generate a reactive version key based on the aggregated data content.
  // This is vital for react-leaflet: <GeoJSON> and <CircleMarker> in react-leaflet
  // are non-reactive by default and will not update styles or layers when filters change
  // (such as Satpel, Commodity, Traffic, or Date Range) unless their key changes.
  const dataVersionKey = useMemo(() => {
    if (!aggregatedLocations || aggregatedLocations.length === 0) {
      return `empty-${data?.length || 0}`;
    }
    const sample = aggregatedLocations
      .slice(0, 10)
      .map((l) => `${l.name}:${Math.round(l.metricValue)}`)
      .join('|');
    return `${activeMode}-${activeMetricType}-${activeMapStyle}-${aggregatedLocations.length}-${minVal}-${maxVal}-${sample}`;
  }, [activeMode, activeMetricType, activeMapStyle, aggregatedLocations, minVal, maxVal, data]);

  // Color generator based on intensity
  const primaryColor = colors[0] || '#3B82F6';
  const getColorByIntensity = (val) => {
    if (val == null || val === 0) return '#94A3B8';
    if (maxVal === minVal || maxVal === 0) return primaryColor;
    const ratio = (val - minVal) / (maxVal - minVal);
    if (ratio > 0.75) return '#EF4444'; // Top tier red
    if (ratio > 0.5) return '#F59E0B'; // High tier amber
    if (ratio > 0.25) return primaryColor; // Mid tier blue
    return '#10B981'; // Standard green
  };

  // Radius calculator for bubble mode (between 7px and 32px)
  const getMarkerRadius = (val) => {
    if (maxVal === minVal || maxVal === 0) return 12;
    const normalized = (val - minVal) / (maxVal - minVal);
    return Math.max(7, Math.min(32, Math.round(7 + normalized * 25)));
  };

  // Helper to find location data for a GeoJSON feature
  const getFeatureData = (feature) => {
    if (!feature || !feature.properties) return null;
    const rawName = feature.properties.PROVINSI || feature.properties.name || feature.properties.NAME || '';
    if (!rawName) return null;

    // 1. Direct lookup
    if (locationLookupMap.has(rawName.toUpperCase())) {
      return locationLookupMap.get(rawName.toUpperCase());
    }

    // 2. Resolve via geoData
    if (activeMode === 'indonesia') {
      const resolved = resolveProvince(rawName);
      if (resolved && locationLookupMap.has(resolved.provinceName.toUpperCase())) {
        return locationLookupMap.get(resolved.provinceName.toUpperCase());
      }
    } else {
      const resolved = resolveCountry(rawName);
      if (resolved && locationLookupMap.has(resolved.name.toUpperCase())) {
        return locationLookupMap.get(resolved.name.toUpperCase());
      }
    }

    return null;
  };

  // Choropleth Polygon Style
  const getFeatureStyle = (feature) => {
    const locData = getFeatureData(feature);
    if (locData && locData.metricValue > 0) {
      const color = getColorByIntensity(locData.metricValue);
      return {
        fillColor: color,
        weight: 1.5,
        opacity: 1,
        color: '#FFFFFF',
        fillOpacity: 0.75,
      };
    }
    return {
      fillColor: '#E2E8F0',
      weight: 1,
      opacity: 0.8,
      color: '#CBD5E1',
      fillOpacity: 0.25,
    };
  };

  // Choropleth Interaction handler
  const onEachFeature = (feature, layer) => {
    const rawName = feature.properties.PROVINSI || feature.properties.name || 'Wilayah';
    const locData = getFeatureData(feature);

    if (locData && locData.metricValue > 0) {
      const formattedVal = formatMetricValue(locData.metricValue, activeMetricType);

      // Tooltip on Hover
      layer.bindTooltip(
        `<div style="font-weight:700;font-size:0.8125rem;">${locData.name}</div>
         <div style="font-size:0.75rem;margin-top:2px;">${metricLabel}: <strong>${formattedVal}</strong></div>`,
        { sticky: true, opacity: 0.95 }
      );

      // Interactive Popup on Click
      const commoditiesHtml = locData.topCommodities?.length > 0
        ? `<div style="margin-top:0.35rem;padding-top:0.35rem;border-top:1px dashed #CBD5E1;">
             <span style="font-size:0.75rem;color:#64748B;font-weight:600;">Komoditas Utama:</span>
             <div style="display:flex;flex-wrap:wrap;gap:0.25rem;margin-top:0.2rem;">
               ${locData.topCommodities.map((c) => `<span style="font-size:0.6875rem;background-color:#F1F5F9;color:#334155;padding:0.1rem 0.35rem;border-radius:3px;font-weight:500;">${c}</span>`).join('')}
             </div>
           </div>`
        : '';

      layer.bindPopup(
        `<div style="min-width:200px;padding:0.25rem;font-family:inherit;">
           <div style="font-size:0.9375rem;font-weight:700;color:#1E293B;border-bottom:1.5px solid #E2E8F0;padding-bottom:0.35rem;margin-bottom:0.5rem;display:flex;align-items:center;gap:0.35rem;">
             <span>${locData.name}</span>
           </div>
           <div style="display:flex;flex-direction:column;gap:0.35rem;font-size:0.8125rem;">
             <div style="display:flex;justify-content:space-between;color:#475569;">
               <span>Frekuensi Sertifikat:</span>
               <strong style="color:#0F172A;">${locData.certCount.toLocaleString('id-ID')} Dokumen</strong>
             </div>
             <div style="display:flex;justify-content:space-between;color:#475569;">
               <span>Total Volume/Berat:</span>
               <strong style="color:#0F172A;">${formatMetricValue(locData.totalVolume, 'volume')}</strong>
             </div>
             <div style="display:flex;justify-content:space-between;color:#475569;">
               <span>Total Nilai:</span>
               <strong style="color:#0F172A;">${formatMetricValue(locData.totalPrice, 'currency')}</strong>
             </div>
             ${commoditiesHtml}
           </div>
         </div>`
      );

      layer.on({
        mouseover: (e) => {
          const l = e.target;
          l.setStyle({ weight: 3, color: '#0F172A', fillOpacity: 0.92 });
          l.bringToFront();
        },
        mouseout: (e) => {
          const l = e.target;
          l.setStyle(getFeatureStyle(feature));
        },
      });
    } else {
      layer.bindTooltip(
        `<div style="font-weight:600;font-size:0.75rem;color:#64748B;">${rawName} (Belum Ada Data)</div>`,
        { sticky: true, opacity: 0.85 }
      );
    }
  };

  const currentGeoJsonData = activeMode === 'indonesia' ? indonesiaGeoJson : worldGeoJson;

  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        position: 'relative',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        backgroundColor: '#E5E7EB',
      }}
    >
      {aggregatedLocations.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            backgroundColor: 'var(--surface-0)',
            color: 'var(--text-muted)',
            padding: '2rem',
            textAlign: 'center',
            gap: '0.5rem',
          }}
        >
          <MapPin size={36} style={{ opacity: 0.4, color: 'var(--primary)' }} />
          <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0, fontSize: '0.9375rem' }}>
            Tidak Ada Data Lokasi yang Cocok
          </h4>
          <p style={{ fontSize: '0.8125rem', maxWidth: '380px', margin: 0 }}>
            Kolom <strong>"{targetColumn}"</strong> pada filter data saat ini belum memiliki rekaman geospasial yang cocok dengan referensi koordinat {activeMode === 'indonesia' ? 'Provinsi Indonesia' : 'Negara'}.
          </p>
        </div>
      ) : (
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          minZoom={minZoom}
          maxZoom={12}
          maxBounds={maxBounds}
          maxBoundsViscosity={1.0}
          worldCopyJump={false}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
        >
          <MapResizeHandler center={mapCenter} zoom={mapZoom} maxBounds={maxBounds} dataVersionKey={dataVersionKey} />
          <TileLayer
            key={`tile-${map_tile || 'light'}-${activeMode}`}
            url={tileConfig.url}
            attribution={tileConfig.attribution}
            noWrap={true}
            bounds={maxBounds}
          />

          {/* 1. CHOROPLETH POLYGON LAYER (WARNA ARSIRAN WILAYAH SOLID) */}
          {activeMapStyle === 'choropleth' && currentGeoJsonData && (
            <GeoJSON
              key={`geojson-${dataVersionKey}`}
              data={currentGeoJsonData}
              style={getFeatureStyle}
              onEachFeature={onEachFeature}
            />
          )}

          {/* 2. BUBBLE DOTS LAYER (TITIK LINGKARAN PROPORSIONAL) */}
          {activeMapStyle === 'bubble' &&
            aggregatedLocations.map((loc) => {
              const radius = getMarkerRadius(loc.metricValue);
              const color = getColorByIntensity(loc.metricValue);

              return (
                <CircleMarker
                  key={`bubble-${loc.name}-${dataVersionKey}`}
                  center={[loc.lat, loc.lng]}
                  radius={radius}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.75,
                    color: '#ffffff',
                    weight: 2,
                  }}
                >
                  {/* Tooltip on Hover */}
                  <Tooltip direction="top" offset={[0, -radius]} opacity={0.95}>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{loc.name}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                      {metricLabel}: <strong>{formatMetricValue(loc.metricValue, activeMetricType)}</strong>
                    </div>
                  </Tooltip>

                  {/* Interactive Details Popup on Click */}
                  <Popup>
                    <div style={{ minWidth: '200px', padding: '0.25rem', fontFamily: 'inherit' }}>
                      <div
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: 700,
                          color: '#1E293B',
                          borderBottom: '1.5px solid #E2E8F0',
                          paddingBottom: '0.35rem',
                          marginBottom: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <MapPin size={16} color={color} />
                        <span>{loc.name}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                          <span>Frekuensi Sertifikat:</span>
                          <strong style={{ color: '#0F172A' }}>{loc.certCount.toLocaleString('id-ID')} Dokumen</strong>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                          <span>Total Volume/Berat:</span>
                          <strong style={{ color: '#0F172A' }}>{formatMetricValue(loc.totalVolume, 'volume')}</strong>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                          <span>Total Nilai:</span>
                          <strong style={{ color: '#0F172A' }}>{formatMetricValue(loc.totalPrice, 'currency')}</strong>
                        </div>

                        {loc.topCommodities && loc.topCommodities.length > 0 && (
                          <div style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px dashed #CBD5E1' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Komoditas Utama:</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.2rem' }}>
                              {loc.topCommodities.map((comm) => (
                                <span
                                  key={comm}
                                  style={{
                                    fontSize: '0.6875rem',
                                    backgroundColor: '#F1F5F9',
                                    color: '#334155',
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: '3px',
                                    fontWeight: 500,
                                  }}
                                >
                                  {comm}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
        </MapContainer>
      )}

      {/* Top Floating Badge showing active filtered regions count */}
      {aggregatedLocations.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(4px)',
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-sm, 6px)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
            fontSize: '0.75rem',
            fontWeight: 600,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            color: '#1e293b',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#10B981',
              display: 'inline-block',
            }}
          />
          <span>{aggregatedLocations.length} {activeMode === 'indonesia' ? 'Provinsi' : 'Negara'} Terhubung</span>
        </div>
      )}

      {/* Floating Map Legend (Bottom Right) */}
      {aggregatedLocations.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(4px)',
            padding: '0.45rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            fontSize: '0.75rem',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            color: '#1e293b',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', color: '#64748b' }}>
            Skala {activeMapStyle === 'choropleth' ? 'Warna Wilayah' : 'Ukuran Titik'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: activeMapStyle === 'bubble' ? '50%' : '2px', backgroundColor: '#10B981', display: 'inline-block' }} />
              <span>Rendah</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 12, height: 12, borderRadius: activeMapStyle === 'bubble' ? '50%' : '2px', backgroundColor: primaryColor, display: 'inline-block' }} />
              <span>Sedang</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: 14, height: 14, borderRadius: activeMapStyle === 'bubble' ? '50%' : '2px', backgroundColor: '#EF4444', display: 'inline-block' }} />
              <span>Tinggi</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
