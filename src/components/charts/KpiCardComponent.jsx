import { useMemo } from 'react';
import { getCertificateId } from '@/lib/data/aggregation';
import { COMMODITY_COLORS } from '@/lib/data/commodityColors';
import styles from './charts.module.css';
import {
  FileText,
  Activity,
  Fish,
  Dog,
  Sprout,
  Send,
  Inbox,
  Globe,
  PackageCheck,
  Scale,
  Banknote,
} from 'lucide-react';

export default function KpiCardComponent({
  title = 'Total Metrik',
  value,
  data = [],
  yAxis = 'Frekuensi',
  aggregation = 'count',
  unit = '',
  icon: customIcon,
  color: customColor,
}) {
  // If value is directly supplied, use it; otherwise compute from data array!
  const computed = useMemo(() => {
    if (value !== undefined && value !== null) {
      return {
        numericVal: value,
        formatted: typeof value === 'number' ? value.toLocaleString('id-ID') : value,
        detectedUnit: unit,
      };
    }

    if (!data || data.length === 0) {
      return {
        numericVal: 0,
        formatted: '0',
        detectedUnit: unit,
      };
    }

    const yLower = String(yAxis || '').toLowerCase();
    const isCount =
      aggregation === 'count' ||
      yLower.includes('frekuensi') ||
      yLower.includes('sertifikat') ||
      yLower.includes('dokumen') ||
      yLower.includes('k.1.1');

    const isPrice =
      yLower.includes('nilai') ||
      yLower.includes('harga') ||
      yLower.includes('rupiah') ||
      yLower.includes('rp');

    const isWeight =
      yLower.includes('vol') ||
      yLower.includes('netto') ||
      yLower.includes('berat');

    if (isCount) {
      const uniqueCerts = new Set();
      data.forEach((r, idx) => {
        const row = r.row_data || r || {};
        const certId = getCertificateId(row, idx);
        uniqueCerts.add(certId);
      });

      const count = uniqueCerts.size;
      return {
        numericVal: count,
        formatted: count.toLocaleString('id-ID'),
        detectedUnit: unit || 'Sertifikat',
      };
    }

    // Numerical Aggregation (SUM, AVG, MIN, MAX)
    let total = 0;
    let min = Infinity;
    let max = -Infinity;
    let count = 0;

    data.forEach((r) => {
      const row = r.row_data || r || {};
      let val = 0;
      if (isPrice) {
        val = Number(row.Nilai_Rupiah ?? row['Harga Barang (Rp)'] ?? row.Harga ?? 0);
      } else if (isWeight) {
        val = Number(row['Netto P8'] ?? row['Netto P1'] ?? row.Netto ?? row['Vol P1'] ?? row.Volume ?? row['Vol Lain'] ?? 0);
      } else {
        val = Number(row[yAxis] ?? 0);
      }

      if (!isNaN(val)) {
        total += val;
        if (val < min) min = val;
        if (val > max) max = val;
        count++;
      }
    });

    let finalVal = total;
    if (aggregation === 'avg') finalVal = count > 0 ? total / count : 0;
    if (aggregation === 'min') finalVal = min === Infinity ? 0 : min;
    if (aggregation === 'max') finalVal = max === -Infinity ? 0 : max;

    let formatted = '';
    let resUnit = unit;

    if (isPrice) {
      formatted = `Rp ${Math.round(finalVal).toLocaleString('id-ID')}`;
    } else if (isWeight) {
      formatted = (Math.round(finalVal * 100) / 100).toLocaleString('id-ID');
      resUnit = unit || 'Kg';
    } else {
      formatted = (Math.round(finalVal * 100) / 100).toLocaleString('id-ID');
    }

    return {
      numericVal: finalVal,
      formatted,
      detectedUnit: resUnit,
    };
  }, [data, yAxis, aggregation, value, unit]);

  // Determine dynamic icon & color based on context if not explicitly overridden
  const { chosenIcon: IconComponent, chosenColor } = useMemo(() => {
    if (customIcon && customColor) return { chosenIcon: customIcon, chosenColor: customColor };

    const tLower = (title + ' ' + yAxis).toLowerCase();

    if (tLower.includes('ikan')) return { chosenIcon: Fish, chosenColor: COMMODITY_COLORS.ikan };
    if (tLower.includes('hewan')) return { chosenIcon: Dog, chosenColor: COMMODITY_COLORS.hewan };
    if (tLower.includes('tumbuhan')) return { chosenIcon: Sprout, chosenColor: COMMODITY_COLORS.tumbuhan };
    if (tLower.includes('masuk') || tLower.includes('domestik masuk')) return { chosenIcon: Inbox, chosenColor: 'var(--accent-cyan)' };
    if (tLower.includes('keluar') || tLower.includes('domestik keluar')) return { chosenIcon: Send, chosenColor: 'var(--accent-indigo)' };
    if (tLower.includes('ekspor')) return { chosenIcon: Globe, chosenColor: 'var(--accent-purple)' };
    if (tLower.includes('impor')) return { chosenIcon: PackageCheck, chosenColor: 'var(--accent-rose)' };
    if (tLower.includes('nilai') || tLower.includes('rupiah') || tLower.includes('harga')) return { chosenIcon: Banknote, chosenColor: 'var(--accent-green)' };
    if (tLower.includes('berat') || tLower.includes('vol') || tLower.includes('netto')) return { chosenIcon: Scale, chosenColor: 'var(--primary)' };

    return { chosenIcon: FileText, chosenColor: 'var(--primary)' };
  }, [customIcon, customColor, title, yAxis]);

  return (
    <div
      className="card"
      style={{
        height: 'auto',
        minHeight: '100px',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
    >
      <div className="card-header" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
          {title}
        </span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
            color: chosenColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <IconComponent size={18} />
        </div>
      </div>

      <div style={{ fontSize: '1.875rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', marginTop: '0.125rem' }}>
        {computed.formatted} {computed.detectedUnit && <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>{computed.detectedUnit}</span>}
      </div>
    </div>
  );
}
