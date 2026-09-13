import { useState, useEffect, useRef } from 'react';
import { usePeriodFilter } from '@/contexts/PeriodFilterContext';
import { getDistinctPospels } from '@/lib/data/dashboardDataLoader';
import styles from './GlobalPospelFilter.module.css';
import { MapPin, ChevronDown, Check, Minus } from 'lucide-react';

export default function GlobalPospelFilter() {
  const {
    selectedSatpel,
    selectedPospels,
    setSelectedPospels,
    pospelOptions,
    setPospelOptions,
    formatPospelLabel,
  } = usePeriodFilter();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Load distinct Pospel names whenever selectedSatpel changes
  useEffect(() => {
    let isMounted = true;
    async function loadPospels() {
      if (selectedSatpel && selectedSatpel !== 'all') {
        const list = await getDistinctPospels(selectedSatpel);
        if (isMounted) {
          setPospelOptions(list || []);
        }
      } else {
        if (isMounted) {
          setPospelOptions([]);
        }
      }
    }

    loadPospels();
    return () => {
      isMounted = false;
    };
  }, [selectedSatpel, setPospelOptions]);

  // Handle outside click and Escape key to close popover
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // If no Satpel is selected or "Semua Satpel" is active, do not render Pospel filter
  if (!selectedSatpel || selectedSatpel === 'all') {
    return null;
  }

  // Determine selection state
  const isAllSelected =
    selectedPospels === 'all' ||
    (Array.isArray(selectedPospels) &&
      pospelOptions.length > 0 &&
      selectedPospels.length === pospelOptions.length);

  const isIndeterminate =
    Array.isArray(selectedPospels) &&
    selectedPospels.length > 0 &&
    selectedPospels.length < pospelOptions.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Uncheck all
      setSelectedPospels([]);
    } else {
      // Select all
      setSelectedPospels('all');
    }
  };

  const handleTogglePospel = (pospel) => {
    let currentSelected;
    if (selectedPospels === 'all') {
      currentSelected = [...pospelOptions];
    } else if (Array.isArray(selectedPospels)) {
      currentSelected = [...selectedPospels];
    } else {
      currentSelected = [];
    }

    const index = currentSelected.indexOf(pospel);
    if (index > -1) {
      currentSelected.splice(index, 1);
    } else {
      currentSelected.push(pospel);
    }

    if (currentSelected.length === pospelOptions.length) {
      setSelectedPospels('all');
    } else {
      setSelectedPospels(currentSelected);
    }
  };

  const isPospelChecked = (pospel) => {
    if (selectedPospels === 'all') return true;
    if (Array.isArray(selectedPospels)) {
      return selectedPospels.includes(pospel);
    }
    return false;
  };

  const selectedCount = isAllSelected
    ? pospelOptions.length
    : Array.isArray(selectedPospels)
    ? selectedPospels.length
    : 0;

  return (
    <div className={styles.pospelWrapper} ref={containerRef}>
      <div className={styles.filterContainer}>
        <div className={styles.filterLabel}>
          <MapPin size={14} />
          <span>POSPEL</span>
        </div>

        <button
          type="button"
          className={styles.triggerButton}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          title="Filter Pospel / Tempat Pelayanan"
        >
          <span className={styles.triggerText}>
            {formatPospelLabel ? formatPospelLabel() : 'Semua Pospel'}
          </span>
          <ChevronDown
            size={14}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          />
        </button>
      </div>

      {isOpen && (
        <div className={styles.popover} role="dialog" aria-label="Pilih Pospel">
          <div className={styles.popoverHeader}>
            <span className={styles.popoverTitle}>Tempat Pelayanan</span>
            <span className={styles.badgeCount}>
              {selectedCount} / {pospelOptions.length}
            </span>
          </div>

          <div className={styles.checkboxList}>
            {pospelOptions.length > 0 ? (
              <>
                {/* Select All Checkbox */}
                <div
                  className={`${styles.checkboxItem} ${styles.selectAllItem}`}
                  onClick={handleToggleSelectAll}
                >
                  <div
                    className={`${styles.customCheckbox} ${
                      isAllSelected
                        ? styles.checked
                        : isIndeterminate
                        ? styles.indeterminate
                        : ''
                    }`}
                  >
                    {isAllSelected && <Check size={12} strokeWidth={3} />}
                    {isIndeterminate && <Minus size={12} strokeWidth={3} />}
                  </div>
                  <span className={styles.checkboxLabel}>Pilih Semua (Semua Pospel)</span>
                </div>

                {/* Individual Pospel Checkboxes */}
                {pospelOptions.map((pospel) => {
                  const checked = isPospelChecked(pospel);
                  return (
                    <div
                      key={pospel}
                      className={styles.checkboxItem}
                      onClick={() => handleTogglePospel(pospel)}
                    >
                      <div
                        className={`${styles.customCheckbox} ${
                          checked ? styles.checked : ''
                        }`}
                      >
                        {checked && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span className={styles.checkboxLabel}>{pospel}</span>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className={styles.emptyState}>
                Tidak ada data pospel untuk Satpel ini
              </div>
            )}
          </div>

          <div className={styles.popoverFooter}>
            <button
              type="button"
              className={styles.resetBtn}
              onClick={() => setSelectedPospels('all')}
            >
              Reset
            </button>
            <button
              type="button"
              className={styles.doneBtn}
              onClick={() => setIsOpen(false)}
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
