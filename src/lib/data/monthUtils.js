/**
 * Utility functions and mappings for month name formatting and abbreviation.
 * Formats Indonesian & English month names into standard 3-letter Indonesian abbreviations:
 * Jan, Feb, Mar, Apr, Mei, Jun, Jul, Agu, Sep, Okt, Nov, Des.
 */

export const INDONESIAN_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export const MONTH_3_LETTER_MAP = {
  // Indonesian full
  'januari': 'Jan',
  'februari': 'Feb',
  'maret': 'Mar',
  'april': 'Apr',
  'mei': 'Mei',
  'juni': 'Jun',
  'juli': 'Jul',
  'agustus': 'Agu',
  'september': 'Sep',
  'oktober': 'Okt',
  'november': 'Nov',
  'desember': 'Des',

  // English full
  'january': 'Jan',
  'february': 'Feb',
  'march': 'Mar',
  'may': 'Mei',
  'june': 'Jun',
  'july': 'Jul',
  'august': 'Agu',
  'october': 'Okt',
  'december': 'Des',

  // 3-letter & variations
  'jan': 'Jan',
  'feb': 'Feb',
  'mar': 'Mar',
  'apr': 'Apr',
  'jun': 'Jun',
  'jul': 'Jul',
  'agu': 'Agu',
  'ags': 'Agu',
  'aug': 'Agu',
  'sep': 'Sep',
  'okt': 'Okt',
  'oct': 'Okt',
  'nov': 'Nov',
  'des': 'Des',
  'dec': 'Des',

  // Numeric strings (1 - 12)
  '1': 'Jan', '01': 'Jan',
  '2': 'Feb', '02': 'Feb',
  '3': 'Mar', '03': 'Mar',
  '4': 'Apr', '04': 'Apr',
  '5': 'Mei', '05': 'Mei',
  '6': 'Jun', '06': 'Jun',
  '7': 'Jul', '07': 'Jul',
  '8': 'Agu', '08': 'Agu',
  '9': 'Sep', '09': 'Sep',
  '10': 'Okt',
  '11': 'Nov',
  '12': 'Des',
};

export const MONTH_NAMES_LOWER = new Set([
  'januari', 'january', 'jan',
  'februari', 'february', 'feb',
  'maret', 'march', 'mar',
  'april', 'apr',
  'mei', 'may',
  'juni', 'june', 'jun',
  'juli', 'july', 'jul',
  'agustus', 'august', 'agu', 'ags', 'aug',
  'september', 'sep',
  'oktober', 'october', 'okt', 'oct',
  'november', 'nov',
  'desember', 'december', 'des', 'dec',
]);

export const MONTH_ORDER_MAP = {
  'jan': 1, 'januari': 1, 'january': 1, '01': 1, '1': 1,
  'feb': 2, 'februari': 2, 'february': 2, '02': 2, '2': 2,
  'mar': 3, 'maret': 3, 'march': 3, '03': 3, '3': 3,
  'apr': 4, 'april': 4, '04': 4, '4': 4,
  'mei': 5, 'may': 5, '05': 5, '5': 5,
  'jun': 6, 'juni': 6, 'june': 6, '06': 6, '6': 6,
  'jul': 7, 'juli': 7, 'july': 7, '07': 7, '7': 7,
  'agu': 8, 'agust': 8, 'agustus': 8, 'ags': 8, 'aug': 8, 'august': 8, '08': 8, '8': 8,
  'sep': 9, 'september': 9, '09': 9, '9': 9,
  'okt': 10, 'oktober': 10, 'oct': 10, 'october': 10, '10': 10,
  'nov': 11, 'november': 11, '11': 11,
  'des': 12, 'desember': 12, 'dec': 12, 'december': 12, '12': 12,
};

/**
 * Checks if a string or value is a recognized month name.
 * @param {any} val
 * @returns {boolean}
 */
export function isMonthName(val) {
  if (val === null || val === undefined) return false;
  const s = String(val).toLowerCase().trim();
  return MONTH_NAMES_LOWER.has(s);
}

/**
 * Converts a month value (full name, 3 letters, or numeric string if on month axis) to 3 letters.
 * If the value is not a month, returns the original trimmed string.
 * @param {any} val - The input string, number, or object
 * @param {boolean} [isMonthAxis=false] - Whether the value is known to be on a month axis
 * @returns {string} - The 3-letter abbreviated month or original value
 */
export function formatMonthToShort(val, isMonthAxis = false) {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';

  const lower = str.toLowerCase();

  // If pure number: only convert if on month axis and 1 <= num <= 12
  if (/^\d+$/.test(lower)) {
    if (isMonthAxis && MONTH_3_LETTER_MAP[lower]) {
      return MONTH_3_LETTER_MAP[lower];
    }
    return str;
  }

  // Exact match with month names
  if (MONTH_3_LETTER_MAP[lower]) {
    return MONTH_3_LETTER_MAP[lower];
  }

  // Month + Year: e.g. "Januari 2024", "September 2024", "Sep-2024"
  const myMatch = lower.match(/^([a-z]+)[\s\-_/]+(\d{2,4})$/i);
  if (myMatch) {
    const mPart = myMatch[1].toLowerCase();
    const yPart = myMatch[2];
    if (MONTH_3_LETTER_MAP[mPart] && MONTH_NAMES_LOWER.has(mPart)) {
      return `${MONTH_3_LETTER_MAP[mPart]} ${yPart}`;
    }
  }

  // Year + Month: e.g. "2024-09", "2024 Januari", "2024-Sep"
  const ymMatch = lower.match(/^(\d{4})[\s\-_/]+(\d{1,2}|[a-z]+)$/i);
  if (ymMatch) {
    const yPart = ymMatch[1];
    const mPart = ymMatch[2].toLowerCase();
    if (MONTH_3_LETTER_MAP[mPart]) {
      return `${MONTH_3_LETTER_MAP[mPart]} ${yPart}`;
    }
  }

  return str;
}

/**
 * Returns chronological sort value for sorting month items (1 - 12 or year*100 + month).
 * @param {any} val
 * @returns {number}
 */
export function getMonthSortOrder(val) {
  const s = String(val || '').toLowerCase().trim();
  if (!s) return 999999;

  // Direct match in order map
  if (MONTH_ORDER_MAP[s] !== undefined) {
    return MONTH_ORDER_MAP[s];
  }

  // Month + Year: e.g. "jan 2024"
  const my = s.match(/^([a-z]+)[\s\-_/]+(\d{2,4})$/);
  if (my) {
    const m = MONTH_ORDER_MAP[my[1]] || 99;
    const y = parseInt(my[2], 10);
    const fullYear = y < 100 ? (y < 50 ? 2000 + y : 1900 + y) : y;
    return fullYear * 100 + m;
  }

  // Year + Month: e.g. "2024-01" or "2024 jan"
  const ym = s.match(/^(\d{4})[\s\-_/]+(\d{1,2}|[a-z]+)$/);
  if (ym) {
    const y = parseInt(ym[1], 10);
    const m = MONTH_ORDER_MAP[ym[2]] || (parseInt(ym[2], 10) || 99);
    return y * 100 + m;
  }

  return 99;
}

/**
 * Returns 3-letter month abbreviation for a month number (1-12).
 * @param {number|string} monthNum
 * @returns {string}
 */
export function getMonthName(monthNum) {
  const num = parseInt(monthNum, 10);
  if (num >= 1 && num <= 12) {
    return INDONESIAN_MONTHS_SHORT[num - 1];
  }
  return `Bln ${monthNum}`;
}
