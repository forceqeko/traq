import ChartRenderer from '@/components/charts/ChartRenderer';
import styles from './DashboardGrid.module.css';

export default function DashboardGrid({ chartConfigs = [], chartDataMap = {} }) {
  if (!chartConfigs || chartConfigs.length === 0) {
    return null;
  }

  const getWidthClass = (w) => {
    switch (w) {
      case 'full':
        return styles.itemFull;
      case 'three_quarters':
      case 'three_quarter':
        return styles.itemThreeQuarters;
      case 'two_thirds':
      case 'two_third':
        return styles.itemTwoThirds;
      case 'third':
        return styles.itemThird;
      case 'quarter':
        return styles.itemQuarter;
      case 'fifth':
        return styles.itemFifth;
      case 'sixth':
      case 'sixths':
        return styles.itemSixth;
      case 'half':
      default:
        return styles.itemHalf;
    }
  };

  return (
    <div className={styles.gridContainer}>
      {chartConfigs.map((chart) => {
        const data = chartDataMap[chart.id] || [];
        return (
          <div key={chart.id} className={getWidthClass(chart.width)}>
            <ChartRenderer chartConfig={chart} rawData={data} />
          </div>
        );
      })}
    </div>
  );
}
