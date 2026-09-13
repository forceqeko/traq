import { createContext, useContext, useState } from 'react';

/**
 * Format human-readable period label from period filter state
 */
export function formatPeriodLabel(filter = {}) {
  const {
    periodType = 'year',
    selectedYear = 2026,
    selectedMonth = 8,
    selectedQuarter = 3,
    selectedSemester = 2,
    customRange = {},
  } = filter;

  if (periodType === 'year') return `Tahunan (${selectedYear})`;
  if (periodType === 'month') return `Bulan ${selectedMonth}/${selectedYear}`;
  if (periodType === 'quarter') return `Triwulan ${selectedQuarter}/${selectedYear}`;
  if (periodType === 'semester') return `Semester ${selectedSemester === 2 ? 'II' : 'I'}/${selectedYear}`;
  if (periodType === 'custom' && customRange?.startDate && customRange?.endDate) {
    return `${customRange.startDate} s/d ${customRange.endDate}`;
  }
  return `Tahunan (${selectedYear})`;
}

const PeriodFilterContext = createContext({
  periodType: 'year', // 'year' | 'month' | 'quarter' | 'semester' | 'custom'
  selectedYear: 2026,
  selectedMonth: 8,
  selectedQuarter: 3,
  selectedSemester: 2,
  customRange: { startDate: '2026-08-01', endDate: '2026-08-31' },
  selectedSatpel: 'all', // 'all' | specific Satpel name
  satpelOptions: [],
  selectedPospels: 'all', // 'all' | array of strings
  pospelOptions: [],
  setPeriodType: () => {},
  setSelectedYear: () => {},
  setSelectedMonth: () => {},
  setSelectedQuarter: () => {},
  setSelectedSemester: () => {},
  setCustomRange: () => {},
  setSelectedSatpel: () => {},
  setSatpelOptions: () => {},
  setSelectedPospels: () => {},
  setPospelOptions: () => {},
  formatPeriodLabel: () => 'Tahunan (2026)',
  formatSatpelLabel: () => 'Semua Satpel',
  formatPospelLabel: () => 'Semua',
});

export function PeriodFilterProvider({ children }) {
  const [periodType, setPeriodType] = useState('year');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(8);
  const [selectedQuarter, setSelectedQuarter] = useState(3);
  const [selectedSemester, setSelectedSemester] = useState(2);
  const [customRange, setCustomRange] = useState({
    startDate: '2026-08-01',
    endDate: '2026-08-31',
  });
  const [selectedSatpel, setSelectedSatpelState] = useState('all');
  const [satpelOptions, setSatpelOptions] = useState([]);
  const [selectedPospels, setSelectedPospels] = useState('all');
  const [pospelOptions, setPospelOptions] = useState([]);

  // Wrapped setter to automatically reset Pospel when Satpel changes
  const setSelectedSatpel = (newSatpel) => {
    setSelectedSatpelState((prevSatpel) => {
      if (prevSatpel !== newSatpel) {
        setSelectedPospels('all');
        setPospelOptions([]);
      }
      return newSatpel;
    });
  };

  const getFormattedLabel = () => {
    return formatPeriodLabel({
      periodType,
      selectedYear,
      selectedMonth,
      selectedQuarter,
      selectedSemester,
      customRange,
    });
  };

  const getFormattedSatpelLabel = () => {
    if (!selectedSatpel || selectedSatpel === 'all') {
      return 'Semua Satpel';
    }
    return selectedSatpel;
  };

  const getFormattedPospelLabel = () => {
    if (!selectedSatpel || selectedSatpel === 'all') {
      return '';
    }
    if (
      selectedPospels === 'all' ||
      (Array.isArray(selectedPospels) &&
        pospelOptions.length > 0 &&
        selectedPospels.length === pospelOptions.length)
    ) {
      return pospelOptions.length > 0 ? `Semua (${pospelOptions.length})` : 'Semua';
    }
    if (Array.isArray(selectedPospels)) {
      if (selectedPospels.length === 0) return '0 Terpilih';
      if (selectedPospels.length === 1) return selectedPospels[0];
      return `${selectedPospels.length} Terpilih`;
    }
    return 'Semua';
  };

  return (
    <PeriodFilterContext.Provider
      value={{
        periodType,
        selectedYear,
        selectedMonth,
        selectedQuarter,
        selectedSemester,
        customRange,
        selectedSatpel,
        satpelOptions,
        selectedPospels,
        pospelOptions,
        setPeriodType,
        setSelectedYear,
        setSelectedMonth,
        setSelectedQuarter,
        setSelectedSemester,
        setCustomRange,
        setSelectedSatpel,
        setSatpelOptions,
        setSelectedPospels,
        setPospelOptions,
        formatPeriodLabel: getFormattedLabel,
        formatSatpelLabel: getFormattedSatpelLabel,
        formatPospelLabel: getFormattedPospelLabel,
      }}
    >
      {children}
    </PeriodFilterContext.Provider>
  );
}

export function usePeriodFilter() {
  return useContext(PeriodFilterContext);
}

