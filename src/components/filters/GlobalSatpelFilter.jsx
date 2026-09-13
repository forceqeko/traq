import { useEffect } from 'react';
import { usePeriodFilter } from '@/contexts/PeriodFilterContext';
import { getDistinctSatpels } from '@/lib/data/dashboardDataLoader';
import styles from './GlobalSatpelFilter.module.css';
import { Building2 } from 'lucide-react';

export default function GlobalSatpelFilter() {
  const {
    selectedSatpel,
    setSelectedSatpel,
    satpelOptions,
    setSatpelOptions,
  } = usePeriodFilter();

  useEffect(() => {
    let isMounted = true;
    async function loadSatpelOptions() {
      if (!satpelOptions || satpelOptions.length === 0) {
        const list = await getDistinctSatpels();
        if (isMounted && Array.isArray(list) && list.length > 0) {
          setSatpelOptions(list);
        }
      }
    }
    loadSatpelOptions();
    return () => {
      isMounted = false;
    };
  }, [satpelOptions, setSatpelOptions]);

  return (
    <div className={styles.filterContainer}>
      <div className={styles.filterLabel}>
        <Building2 size={14} />
        <span>SATPEL</span>
      </div>

      <select
        className={styles.filterSelect}
        value={selectedSatpel || 'all'}
        onChange={(e) => setSelectedSatpel(e.target.value)}
        aria-label="Filter Satuan Pelayanan"
      >
        <option value="all">Semua Satpel</option>
        {(satpelOptions || []).map((satpel) => (
          <option key={satpel} value={satpel}>
            {satpel}
          </option>
        ))}
      </select>
    </div>
  );
}
