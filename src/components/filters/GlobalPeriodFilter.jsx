import { usePeriodFilter } from '@/contexts/PeriodFilterContext';
import CustomDateRangePicker from './CustomDateRangePicker';
import styles from './GlobalPeriodFilter.module.css';
import { Calendar } from 'lucide-react';

export default function GlobalPeriodFilter() {
  const {
    periodType,
    selectedYear,
    selectedMonth,
    selectedQuarter,
    selectedSemester,
    customRange,
    setPeriodType,
    setSelectedYear,
    setSelectedMonth,
    setSelectedQuarter,
    setSelectedSemester,
    setCustomRange,
  } = usePeriodFilter();

  const years = Array.from({ length: 7 }, (_, i) => 2020 + i);
  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];

  return (
    <div className={styles.filterContainer}>
      <div className={styles.filterLabel}>
        <Calendar size={14} />
        <span>PERIODE DATA</span>
      </div>

      <select
        className={styles.filterSelect}
        value={periodType}
        onChange={(e) => setPeriodType(e.target.value)}
      >
        <option value="year">Tahunan</option>
        <option value="month">Bulan</option>
        <option value="quarter">Triwulan</option>
        <option value="semester">Semester</option>
        <option value="custom">Custom</option>
      </select>

      {/* Bulan Spesifik */}
      {periodType === 'month' && (
        <select
          className={styles.filterSelect}
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      )}

      {/* Triwulan (3 Bulan) */}
      {periodType === 'quarter' && (
        <select
          className={styles.filterSelect}
          value={selectedQuarter}
          onChange={(e) => setSelectedQuarter(Number(e.target.value))}
        >
          <option value={1}>Triwulan I (Jan - Mar)</option>
          <option value={2}>Triwulan II (Apr - Jun)</option>
          <option value={3}>Triwulan III (Jul - Sep)</option>
          <option value={4}>Triwulan IV (Okt - Des)</option>
        </select>
      )}

      {/* Semester (6 Bulan) */}
      {periodType === 'semester' && (
        <select
          className={styles.filterSelect}
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(Number(e.target.value))}
        >
          <option value={1}>Semester I (Jan - Jun)</option>
          <option value={2}>Semester II (Jul - Des)</option>
        </select>
      )}

      {/* Custom Tanggal Interaktif (Kalender Popover, Maks. 31 Hari) */}
      {periodType === 'custom' && (
        <CustomDateRangePicker
          startDate={customRange?.startDate}
          endDate={customRange?.endDate}
          onChange={(range) => setCustomRange(range)}
          maxDays={31}
        />
      )}

      {/* Pilihan Tahun (Ditampilkan kecuali mode Custom) */}
      {periodType !== 'custom' && (
        <select
          className={styles.filterSelect}
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
