import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
} from 'recharts';
import { formatMonthToShort } from '@/lib/data/monthUtils';
import { getCommodityColor } from '@/lib/data/commodityColors';
import styles from './charts.module.css';

const DEFAULT_COLORS = [
  '#3B82F6', // var(--chart-color-1) - Biru
  '#0D9488', // var(--chart-color-2) - Teal
  '#F59E0B', // var(--chart-color-3) - Amber
  '#8B5CF6', // var(--chart-color-4) - Ungu
  '#F43F5E', // var(--chart-color-5) - Rose
  '#10B981', // var(--chart-color-6) - Emerald
  '#EC4899', // var(--chart-color-7) - Pink
  '#6366F1', // var(--chart-color-8) - Indigo
  '#06B6D4', // var(--chart-color-9) - Cyan
  '#F97316', // var(--chart-color-10) - Orange
];

const CustomTooltip = ({ active, payload, label, valueUnit = 'auto', yAxisKey = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <div className={styles.tooltipTitle}>{formatMonthToShort(label)}</div>
        {payload.map((entry, index) => {
          const itemColor = entry.color || entry.fill || entry.payload?.fill || 'var(--primary)';
          const formattedVal = formatFullNumberWithUnit(entry.value, valueUnit, yAxisKey || entry.name);
          return (
            <div key={index} style={{ color: itemColor, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: itemColor, display: 'inline-block' }} />
              <span>{entry.name}: <strong>{formattedVal}</strong></span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

// Compact number formatting for X-Axis axis scale (e.g. 300 Jt, 250 Rb, 1.2 M)
const formatNumberCompact = (val) => {
  const num = Number(val);
  if (isNaN(num) || num === 0) return '0';
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(abs % 1_000_000_000 === 0 ? 0 : 1)} M`;
  }
  if (abs >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)} Jt`;
  }
  if (abs >= 1_000) {
    return `${(num / 1_000).toFixed(abs % 1_000 === 0 ? 0 : 1)} Rb`;
  }
  return num.toLocaleString('id-ID');
};

// Full un-abbreviated number formatting with unit for Data Labels (e.g. "Rp 283.500.000", "1.540 Kg", "1.200 Sertifikat")
export const formatFullNumberWithUnit = (val, unit = 'auto', yAxis = '') => {
  const num = Number(val);
  if (isNaN(num)) return val;
  const formattedNum = num.toLocaleString('id-ID');

  let effectiveUnit = unit || 'auto';
  if (effectiveUnit === 'auto') {
    const yLower = String(yAxis).toLowerCase();
    if (yLower.includes('rupiah') || yLower.includes('harga') || yLower.includes('nilai')) {
      return `Rp ${formattedNum}`;
    } else if (yLower.includes('netto') || yLower.includes('berat')) {
      return `${formattedNum} Kg`;
    } else if (yLower.includes('frekuensi') || yLower.includes('sertifikat')) {
      return `${formattedNum} Sertifikat`;
    } else if (yLower.includes('vol')) {
      return `${formattedNum} Vol`;
    }
    return formattedNum;
  }

  if (effectiveUnit === 'none' || !effectiveUnit) {
    return formattedNum;
  }

  if (effectiveUnit === 'Rp') {
    return `Rp ${formattedNum}`;
  }

  return `${formattedNum} ${effectiveUnit}`;
};

// Multi-line Y-Axis Tick Renderer (Up to 3 lines, compact width so bars have maximum breathing room)
const renderHorizontalYAxis3LineTick = ({ x, y, payload }) => {
  const rawText = String(payload?.value || '').trim();
  if (!rawText) return null;
  const text = formatMonthToShort(rawText);

  const words = text.split(/\s+/);
  const lines = [];

  if (words.length === 1) {
    if (text.length > 18) {
      lines.push(text.slice(0, 9));
      lines.push(text.slice(9, 18));
      lines.push(`${text.slice(18, 25)}..`);
    } else if (text.length > 9) {
      lines.push(text.slice(0, 9));
      lines.push(text.slice(9));
    } else {
      lines.push(text);
    }
  } else if (words.length === 2) {
    lines.push(words[0].length > 10 ? `${words[0].slice(0, 9)}..` : words[0]);
    lines.push(words[1].length > 10 ? `${words[1].slice(0, 9)}..` : words[1]);
  } else if (words.length === 3) {
    lines.push(words[0].length > 10 ? `${words[0].slice(0, 9)}..` : words[0]);
    lines.push(words[1].length > 10 ? `${words[1].slice(0, 9)}..` : words[1]);
    lines.push(words[2].length > 10 ? `${words[2].slice(0, 9)}..` : words[2]);
  } else {
    // 4 words or more
    lines.push(words[0].length > 10 ? `${words[0].slice(0, 9)}..` : words[0]);
    lines.push(words[1].length > 10 ? `${words[1].slice(0, 9)}..` : words[1]);
    const rest = words.slice(2).join(' ');
    lines.push(rest.length > 10 ? `${rest.slice(0, 9)}..` : rest);
  }

  const totalLines = lines.length;
  const startDy = totalLines === 1 ? '0.35em' : totalLines === 2 ? '-0.25em' : '-0.85em';

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-6}
        y={0}
        textAnchor="end"
        fill="var(--text-muted)"
        fontSize={10}
        fontWeight={500}
      >
        {lines.map((line, idx) => (
          <tspan key={idx} x={-6} dy={idx === 0 ? startDy : '1.15em'}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

// Smart Label Renderer: Places label inside bar if bar is wide enough, otherwise outside
const renderSmartHorizontalBarLabel = (props, valueUnit, yAxisKey) => {
  const { x, y, width, height, value } = props;
  if (value === undefined || value === null) return null;

  const formattedText = formatFullNumberWithUnit(value, valueUnit, yAxisKey);
  const approxTextWidth = formattedText.length * 6.5;
  const isInside = (width || 0) >= approxTextWidth + 24;
  const textY = y + height / 2;

  if (isInside) {
    return (
      <text
        key={`lbl-${x}-${y}`}
        x={x + width - 10}
        y={textY}
        dy="0.35em"
        textAnchor="end"
        fill="#ffffff"
        fontSize={10.5}
        fontWeight={700}
        style={{
          filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.45))',
          pointerEvents: 'none',
        }}
      >
        {formattedText}
      </text>
    );
  }

  return (
    <text
      key={`lbl-${x}-${y}`}
      x={x + width + 6}
      y={textY}
      dy="0.35em"
      textAnchor="start"
      fill="var(--text-secondary)"
      fontSize={10}
      fontWeight={600}
      style={{ pointerEvents: 'none' }}
    >
      {formattedText}
    </text>
  );
};

export default function HorizontalBarChartComponent({
  data = [],
  xAxisKey = 'name',
  yAxisKey = 'value',
  seriesKeys = [],
  colors = DEFAULT_COLORS,
  showDataLabels = false,
  valueUnit = 'auto',
}) {
  if (!data || data.length === 0) {
    return <div className={styles.emptyBox}>Tidak ada data untuk ditampilkan</div>;
  }

  const chartColors = colors && colors.length > 0 ? colors : DEFAULT_COLORS;
  const activeSeries = seriesKeys.length > 0 ? seriesKeys : [yAxisKey];
  const isMultiSeries = activeSeries.length > 1;

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={0}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{
          top: 15,
          right: 30,
          left: 10,
          bottom: 15,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
        <XAxis
          type="number"
          stroke="var(--text-muted)"
          fontSize={11}
          tickLine={false}
          tickFormatter={formatNumberCompact}
        />
        <YAxis
          type="category"
          dataKey={xAxisKey}
          stroke="var(--text-muted)"
          fontSize={10}
          tickLine={false}
          width={76}
          interval={0}
          tick={renderHorizontalYAxis3LineTick}
        />
        <Tooltip content={<CustomTooltip valueUnit={valueUnit} yAxisKey={yAxisKey} />} />
        {isMultiSeries && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />}
        {isMultiSeries ? (
          activeSeries.map((key, idx) => {
            const barColor = getCommodityColor(key) || chartColors[idx % chartColors.length];
            return (
              <Bar
                key={key}
                name={key}
                dataKey={key}
                fill={barColor}
                radius={[0, 4, 4, 0]}
              >
                {showDataLabels && (
                  <LabelList
                    dataKey={key}
                    content={(props) => renderSmartHorizontalBarLabel(props, valueUnit, key)}
                  />
                )}
              </Bar>
            );
          })
        ) : (
          <Bar
            dataKey={yAxisKey}
            radius={[0, 4, 4, 0]}
          >
            {data.map((entry, index) => {
              const catName = entry[xAxisKey] || entry.name || '';
              const cellColor = getCommodityColor(catName) || chartColors[index % chartColors.length];
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={cellColor}
                />
              );
            })}
            {showDataLabels && (
              <LabelList
                dataKey={yAxisKey}
                content={(props) => renderSmartHorizontalBarLabel(props, valueUnit, yAxisKey)}
              />
            )}
          </Bar>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
