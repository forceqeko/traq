import { createContext, useContext, useState } from 'react';

/**
 * Helper to get date range for the current active month
 */
export function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStr = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  const lastDayStr = String(lastDay).padStart(2, '0');
  return {
    startDate: `${year}-${monthStr}-01`,
    endDate: `${year}-${monthStr}-${lastDayStr}`,
  };
}

const defaultNow = new Date();
const defaultCurrentYear = defaultNow.getFullYear();
const defaultCurrentMonth = defaultNow.getMonth() + 1;
const defaultCurrentQuarter = Math.ceil(defaultCurrentMonth / 3);
const defaultCurrentSemester = defaultCurrentMonth <= 6 ? 1 : 2;
const defaultCustomRange = getCurrentMonthRange();

/**
 * Format human-readable period label from period filter state
 */
export function formatPeriodLabel(filter = {}) {
  const {
    periodType = 'year',
    selectedYear = defaultCurrentYear,
    selectedMonth = defaultCurrentMonth,
    selectedQuarter = defaultCurrentQuarter,
    selectedSemester = defaultCurrentSemester,
    customRange = defaultCustomRange,
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
  selectedYear: defaultCurrentYear,
  selectedMonth: defaultCurrentMonth,
  selectedQuarter: defaultCurrentQuarter,
  selectedSemester: defaultCurrentSemester,
  customRange: defaultCustomRange,
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
  formatPeriodLabel: () => `Tahunan (${defaultCurrentYear})`,
  formatSatpelLabel: () => 'Semua Satpel',
  formatPospelLabel: () => 'Semua',
});

export function PeriodFilterProvider({ children }) {
  const [periodType, setPeriodType] = useState('year');
  const [selectedYear, setSelectedYear] = useState(defaultCurrentYear);
  const [selectedMonth, setSelectedMonth] = useState(defaultCurrentMonth);
  const [selectedQuarter, setSelectedQuarter] = useState(defaultCurrentQuarter);
  const [selectedSemester, setSelectedSemester] = useState(defaultCurrentSemester);
  const [customRange, setCustomRange] = useState(defaultCustomRange);
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

