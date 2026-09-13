import { useState, useRef, useEffect } from 'react';
import styles from './CustomDateRangePicker.module.css';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const WEEK_DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatDateString(date) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

function parseDateString(str) {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDisplayDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-').map(Number);
  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][m - 1];
  return `${d} ${monthShort} ${y}`;
}

export default function CustomDateRangePicker({
  startDate = '2026-08-01',
  endDate = '2026-08-31',
  onChange,
  maxDays = 31,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Initial view is based on startDate or endDate
  const initialDate = parseDateString(endDate || startDate);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Range selection step
  const [isSelectingEnd, setIsSelectingEnd] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  // Sync with prop updates
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  // Close on outside click and commit if in middle of selection
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        if (isSelectingEnd && tempStart) {
          if (onChange) {
            onChange({ startDate: tempStart, endDate: tempEnd || tempStart });
          }
        }
        setIsOpen(false);
        setIsSelectingEnd(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isSelectingEnd, tempStart, tempEnd, onChange]);

  // Navigate months
  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Click on a date cell
  const handleDateClick = (clickedDateStr) => {
    if (!isSelectingEnd) {
      // Step 1: user selected a start date
      setTempStart(clickedDateStr);
      setTempEnd(clickedDateStr);
      setIsSelectingEnd(true);
    } else {
      // Step 2: user selected an end date
      const start = parseDateString(tempStart);
      const clicked = parseDateString(clickedDateStr);

      if (clicked < start) {
        // If clicked date is before start date, restart range with clicked date
        setTempStart(clickedDateStr);
        setTempEnd(clickedDateStr);
        setIsSelectingEnd(true);
      } else {
        // Range validation: max 31 days
        const diffDays = Math.round((clicked - start) / (1000 * 60 * 60 * 24)) + 1; // inclusive
        let finalEndStr = clickedDateStr;

        if (diffDays > maxDays) {
          // Cap at maxDays
          const cappedDate = new Date(start);
          cappedDate.setDate(cappedDate.getDate() + (maxDays - 1));
          finalEndStr = formatDateString(cappedDate);
        }

        setTempEnd(finalEndStr);
        setIsSelectingEnd(false);
        setIsOpen(false);

        if (onChange) {
          onChange({ startDate: tempStart, endDate: finalEndStr });
        }
      }
    }
  };

  // Quick preset ranges
  const applyPreset = (days) => {
    const referenceDate = parseDateString(endDate || '2026-08-31');
    const end = new Date(referenceDate);
    const start = new Date(referenceDate);
    start.setDate(start.getDate() - (days - 1));

    const startStr = formatDateString(start);
    const endStr = formatDateString(end);

    setTempStart(startStr);
    setTempEnd(endStr);
    setIsSelectingEnd(false);
    setIsOpen(false);

    if (onChange) {
      onChange({ startDate: startStr, endDate: endStr });
    }
  };

  // Calculate day cells for the current viewMonth
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday

  // Days from previous month to fill the first row
  const prevMonthDaysCount = new Date(viewYear, viewMonth, 0).getDate();
  const leadingDays = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    leadingDays.push({
      dayNum: prevMonthDaysCount - i,
      isOtherMonth: true,
    });
  }

  // Days in current month
  const currentDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(d)}`;
    currentDays.push({
      dayNum: d,
      dateStr,
      isOtherMonth: false,
    });
  }

  // Days from next month to fill the last row
  const totalSlots = leadingDays.length + currentDays.length;
  const trailingCount = (7 - (totalSlots % 7)) % 7;
  const trailingDays = [];
  for (let d = 1; d <= trailingCount; d++) {
    trailingDays.push({
      dayNum: d,
      isOtherMonth: true,
    });
  }

  // Duration calculation in days
  const currentDiffDays = Math.max(
    1,
    Math.round(
      (parseDateString(tempEnd) - parseDateString(tempStart)) / (1000 * 60 * 60 * 24)
    ) + 1
  );

  return (
    <div className={styles.pickerWrapper} ref={wrapperRef}>
      {/* Trigger Button */}
      <button
        type="button"
        className={`${styles.triggerBtn} ${isOpen ? styles.triggerBtnActive : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Pilih rentang tanggal dari kalender (Maksimal 31 hari)"
      >
        <CalendarIcon size={15} className={styles.triggerIcon} />
        <span className={styles.triggerText}>
          {formatDisplayDate(tempStart)} - {formatDisplayDate(tempEnd)}
        </span>
        <ChevronDown
          size={14}
          className={`${styles.triggerChevron} ${isOpen ? styles.triggerChevronOpen : ''}`}
        />
      </button>

      {/* Popover Calendar Modal */}
      {isOpen && (
        <div className={styles.popover}>
          {/* Calendar Month & Year Navigation */}
          <div className={styles.calendarHeader}>
            <button
              type="button"
              className={styles.monthNavBtn}
              onClick={handlePrevMonth}
              title="Bulan Sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>

            <span className={styles.monthLabel}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              className={styles.monthNavBtn}
              onClick={handleNextMonth}
              title="Bulan Berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Names */}
          <div className={styles.weekDaysRow}>
            {WEEK_DAYS.map((wd) => (
              <span key={wd} className={styles.weekDayName}>
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className={styles.daysGrid}>
            {/* Leading days from previous month */}
            {leadingDays.map((item, idx) => (
              <div key={`lead-${idx}`} className={`${styles.dayCell} ${styles.dayOtherMonth}`}>
                {item.dayNum}
              </div>
            ))}

            {/* Current month days */}
            {currentDays.map((item) => {
              const { dateStr, dayNum } = item;
              const isStart = dateStr === tempStart;
              const isEnd = dateStr === tempEnd;
              const isInRange = dateStr > tempStart && dateStr < tempEnd;
              const isSingleDay = isStart && isEnd;

              // Check if date exceeds max 31 days when selecting end
              let isDisabled = false;
              if (isSelectingEnd && tempStart) {
                const start = parseDateString(tempStart);
                const current = parseDateString(dateStr);
                const diff = Math.round((current - start) / (1000 * 60 * 60 * 24));
                if (diff > maxDays - 1) {
                  isDisabled = true;
                }
              }

              let cellClass = styles.dayCell;
              if (isSingleDay) {
                cellClass += ` ${styles.daySelectedSingle}`;
              } else if (isStart) {
                cellClass += ` ${styles.daySelectedStart}`;
              } else if (isEnd) {
                cellClass += ` ${styles.daySelectedEnd}`;
              } else if (isInRange) {
                cellClass += ` ${styles.dayInRange}`;
              }

              if (isDisabled) {
                cellClass += ` ${styles.dayDisabled}`;
              }

              return (
                <button
                  type="button"
                  key={dateStr}
                  className={cellClass}
                  onClick={() => !isDisabled && handleDateClick(dateStr)}
                  disabled={isDisabled}
                  title={isDisabled ? 'Melebihi batas maksimal 31 hari' : dateStr}
                >
                  {dayNum}
                </button>
              );
            })}

            {/* Trailing days from next month */}
            {trailingDays.map((item, idx) => (
              <div key={`trail-${idx}`} className={`${styles.dayCell} ${styles.dayOtherMonth}`}>
                {item.dayNum}
              </div>
            ))}
          </div>

          {/* Presets and Status Footer */}
          <div className={styles.popoverFooter}>
            <div className={styles.presetsRow}>
              <button
                type="button"
                className={styles.presetChip}
                onClick={() => applyPreset(7)}
              >
                7 Hari
              </button>
              <button
                type="button"
                className={styles.presetChip}
                onClick={() => applyPreset(14)}
              >
                14 Hari
              </button>
              <button
                type="button"
                className={styles.presetChip}
                onClick={() => applyPreset(31)}
              >
                31 Hari
              </button>
            </div>

            <div className={styles.statusBar}>
              <span className={styles.statusRangeText}>
                {isSelectingEnd ? 'Pilih tanggal selesai' : 'Rentang aktif:'}
              </span>
              <span className={styles.statusDurationBadge}>
                {currentDiffDays} Hari (Maks. {maxDays})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
