import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import styles from './charts.module.css';

const DEFAULT_COLORS = [
  '#3B82F6',
  '#0D9488',
  '#F59E0B',
  '#8B5CF6',
  '#F43F5E',
  '#10B981',
  '#EC4899',
  '#6366F1',
  '#84CC16',
  '#06B6D4',
];

const RADIAN = Math.PI / 180;

export default function PieChartComponent({
  data = [],
  nameKey = 'name',
  dataKey = 'value',
  isDonut = false,
  colors = DEFAULT_COLORS,
  legendDisplay = 'name_value',
}) {
  if (!data || data.length === 0) {
    return <div className={styles.emptyBox}>Tidak ada data untuk ditampilkan</div>;
  }

  const chartData = data
    .map((item) => ({
      name: String(item[nameKey] || item.name || 'Lainnya').trim(),
      value: Number(item[dataKey] || item.value || 0),
    }))
    .filter((item) => item.value > 0);

  if (chartData.length === 0) {
    return <div className={styles.emptyBox}>Tidak ada data bernilai &gt; 0</div>;
  }

  const totalValue = chartData.reduce((acc, curr) => acc + curr.value, 0);

  const isCurrency =
    dataKey.toLowerCase().includes('nilai') ||
    dataKey.toLowerCase().includes('harga') ||
    dataKey.toLowerCase().includes('rupiah') ||
    dataKey.toLowerCase().includes('rp');

  const isVolume =
    dataKey.toLowerCase().includes('vol') ||
    dataKey.toLowerCase().includes('netto') ||
    dataKey.toLowerCase().includes('berat');

  const formatPercentage = (val) => {
    if (!totalValue || totalValue === 0) return '0%';
    const pct = (val / totalValue) * 100;
    if (pct < 0.1) return '<0.1%';
    if (pct < 1) return `${pct.toFixed(1)}%`;
    if (pct >= 99 && pct < 100) return `${pct.toFixed(1)}%`;
    return `${pct.toFixed(0)}%`;
  };

  const formatLegendValue = (val) => {
    const num = Number(val) || 0;
    const formatted = num.toLocaleString('id-ID');
    if (isCurrency) return `Rp ${formatted}`;
    if (isVolume) return `${formatted} Kg`;
    return formatted;
  };

  // Render ALL percentage labels OUTSIDE the pie with elegant matching leader callout lines
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    outerRadius,
    percent,
    index,
  }) => {
    const pct = percent * 100;
    const pctStr =
      pct < 0.1
        ? '<0.1%'
        : pct < 1 || (pct >= 99 && pct < 100)
        ? `${pct.toFixed(1)}%`
        : `${pct.toFixed(0)}%`;

    const sin = Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);
    const sx = cx + (outerRadius + 2) * cos;
    const sy = cy + (outerRadius + 2) * sin;
    const mx = cx + (outerRadius + 15) * cos;
    const my = cy + (outerRadius + 15) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 14;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
    const color = colors[index % colors.length] || '#e2e8f0';

    return (
      <g key={`leader-${index}`}>
        <path
          d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
          stroke={color}
          fill="none"
          strokeWidth={1.5}
        />
        <circle cx={ex} cy={ey} r={2.5} fill={color} />
        <text
          x={ex + (cos >= 0 ? 1 : -1) * 4}
          y={ey}
          textAnchor={textAnchor}
          fill={color}
          dominantBaseline="central"
          fontSize={11.5}
          fontWeight={700}
        >
          {pctStr}
        </text>
      </g>
    );
  };

  const renderLegendContent = (value, entry) => {
    const rawVal = entry?.payload?.value ?? 0;
    const valStr = formatLegendValue(rawVal);
    const pctStr = formatPercentage(rawVal);

    switch (legendDisplay) {
      case 'name_only':
        return <span style={{ color: 'var(--text-primary)', marginRight: '8px' }}>{value}</span>;
      case 'name_percent':
        return (
          <span style={{ color: 'var(--text-primary)', marginRight: '8px' }}>
            {value} <strong style={{ color: 'var(--primary)', fontWeight: 600 }}>({pctStr})</strong>
          </span>
        );
      case 'name_value_percent':
        return (
          <span style={{ color: 'var(--text-primary)', marginRight: '8px' }}>
            {value}: <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{valStr}</strong>{' '}
            <strong style={{ color: 'var(--primary)', fontWeight: 600 }}>({pctStr})</strong>
          </span>
        );
      case 'name_value':
      default:
        return (
          <span style={{ color: 'var(--text-primary)', marginRight: '8px' }}>
            {value}: <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{valStr}</strong>
          </span>
        );
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={320}>
      <PieChart margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
        <Pie
          data={chartData}
          cx="50%"
          cy="42%"
          innerRadius={isDonut ? 48 : 0}
          outerRadius={75}
          paddingAngle={chartData.length > 10 ? 1 : 2}
          dataKey="value"
          nameKey="name"
          label={renderCustomizedLabel}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(val, name) => {
            const num = Number(val) || 0;
            const pctStr = formatPercentage(num);
            const valStr = formatLegendValue(num);
            return [`${valStr} (${pctStr})`, name];
          }}
          contentStyle={{
            backgroundColor: 'var(--surface-2)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            boxShadow: 'var(--shadow-md)',
          }}
        />
        {legendDisplay !== 'none' && (
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{
              fontSize: 11,
              paddingTop: 12,
              lineHeight: '1.7',
              color: 'var(--text-secondary)',
            }}
            formatter={renderLegendContent}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}
