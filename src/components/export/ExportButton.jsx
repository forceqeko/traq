import { useState } from 'react';
import ExportModal from './ExportModal';
import { usePeriodFilter } from '@/contexts/PeriodFilterContext';
import { Download } from 'lucide-react';

export default function ExportButton({
  pageTitle = 'Dashboard TRAQ',
  periodLabel,
  kpis = {},
  chartConfigs = [],
  chartDataMap = {},
  title = 'TRAQ_Laporan',
  targetId = 'dashboard-export-area',
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const periodFilter = usePeriodFilter();
  const effectivePeriodLabel =
    periodLabel ||
    (periodFilter && typeof periodFilter.formatPeriodLabel === 'function'
      ? periodFilter.formatPeriodLabel()
      : 'Tahun 2026');

  const effectiveSatpelLabel =
    periodFilter && typeof periodFilter.formatSatpelLabel === 'function'
      ? periodFilter.formatSatpelLabel()
      : 'Semua Satpel';

  const effectivePospelLabel =
    periodFilter && typeof periodFilter.formatPospelLabel === 'function'
      ? periodFilter.formatPospelLabel()
      : '';

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setModalOpen(true)}
        title="Kustomisasi dan Ekspor Halaman Dashboard"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}
      >
        <Download size={16} />
        <span>Ekspor Halaman</span>
      </button>

      {/* Flexible Canvas Export Modal */}
      {modalOpen && (
        <ExportModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          pageTitle={pageTitle}
          periodLabel={effectivePeriodLabel}
          satpelLabel={effectiveSatpelLabel}
          pospelLabel={effectivePospelLabel}
          kpis={kpis}
          chartConfigs={chartConfigs}
          chartDataMap={chartDataMap}
          defaultFilename={title}
        />
      )}
    </>
  );
}

