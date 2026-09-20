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
        <div className={styles.tooltipTitle}>{label}</div>
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

// Horizontal Multi-Line Tick Renderer (Up to 3 lines, 100% horizontal, precisely centered under each bar)
const renderHorizontal3LineTick = ({ x, y, payload }) => {
  const text = String(payload?.value || '').trim();
  if (!text) return null;

  const words = text.split(/\s+/);
  const lines = [];

  if (words.length === 1) {
    if (text.length > 16) {
      lines.push(text.slice(0, 8));
      lines.push(text.slice(8, 16));
      lines.push(`${text.slice(16, 23)}..`);
    } else if (text.length > 8) {
      lines.push(text.slice(0, 8));
      lines.push(text.slice(8));
    } else {
      lines.push(text);
    }
  } else if (words.length === 2) {
    lines.push(words[0].length > 9 ? `${words[0].slice(0, 8)}..` : words[0]);
    lines.push(words[1].length > 9 ? `${words[1].slice(0, 8)}..` : words[1]);
  } else if (words.length === 3) {
    lines.push(words[0].length > 9 ? `${words[0].slice(0, 8)}..` : words[0]);
    lines.push(words[1].length > 9 ? `${words[1].slice(0, 8)}..` : words[1]);
    lines.push(words[2].length > 9 ? `${words[2].slice(0, 8)}..` : words[2]);
  } else {
    // 4 words or more (e.g. "Produk Olahan Susu Lainnya")
    lines.push(words[0].length > 9 ? `${words[0].slice(0, 8)}..` : words[0]);
    lines.push(words[1].length > 9 ? `${words[1].slice(0, 8)}..` : words[1]);
    const rest = words.slice(2).join(' ');
    lines.push(rest.length > 9 ? `${rest.slice(0, 8)}..` : rest);
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={6}
        textAnchor="middle"
        fill="var(--text-muted)"
        fontSize={10.5}
        fontWeight={500}
      >
        {lines.map((line, idx) => (
          <tspan key={idx} x={0} dy={idx === 0 ? '0.65em' : '1.15em'}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

// Compact number formatting for Y-Axis (e.g. 300 Jt, 250 Rb, 1.2 M)
const formatYAxisNumber = (val) => {
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

// Smart Vertical Bar Label Renderer
const renderSmartVerticalBarLabel = (props, valueUnit, yAxisKey) => {
  const { x, y, width, height, value } = props;
  if (value === undefined || value === null) return null;

  const formattedText = formatFullNumberWithUnit(value, valueUnit, yAxisKey);
  const textX = x + width / 2;
  const isInside = (height || 0) >= 38;

  if (isInside) {
    return (
      <text
        key={`vlbl-${x}-${y}`}
        x={textX}
        y={y + 14}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={10}
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
      key={`vlbl-${x}-${y}`}
      x={textX}
      y={y - 6}
      textAnchor="middle"
      fill="var(--text-secondary)"
      fontSize={10}
      fontWeight={600}
      style={{ pointerEvents: 'none' }}
    >
      {formattedText}
    </text>
  );
};

export default function BarChartComponent({
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
        data={data}
        margin={{
          top: 18,
          right: 15,
          left: 10,
          bottom: 25,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis
          dataKey={xAxisKey}
          stroke="var(--text-muted)"
          tickLine={false}
          interval={0}
          height={48}
          tick={renderHorizontal3LineTick}
        />
        <YAxis
          stroke="var(--text-muted)"
          fontSize={11}
          tickLine={false}
          tickFormatter={formatYAxisNumber}
          width={58}
        />
        <Tooltip content={<CustomTooltip valueUnit={valueUnit} yAxisKey={yAxisKey} />} />
        {isMultiSeries && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />}
        {isMultiSeries ? (
          activeSeries.map((key, idx) => (
            <Bar
              key={key}
              name={key}
              dataKey={key}
              fill={chartColors[idx % chartColors.length]}
              radius={[4, 4, 0, 0]}
            >
              {showDataLabels && (
                <LabelList
                  dataKey={key}
                  content={(props) => renderSmartVerticalBarLabel(props, valueUnit, key)}
                />
              )}
            </Bar>
          ))
        ) : (
          <Bar
            dataKey={yAxisKey}
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={chartColors[index % chartColors.length]}
              />
            ))}
            {showDataLabels && (
              <LabelList
                dataKey={yAxisKey}
                content={(props) => renderSmartVerticalBarLabel(props, valueUnit, yAxisKey)}
              />
            )}
          </Bar>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
