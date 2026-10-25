/**
 * Standar Warna Terkunci untuk Sektor Karantina
 * - Hewan: Orange (#F97316)
 * - Ikan: Biru (#3B82F6)
 * - Tumbuhan: Hijau (#10B981)
 */

export const COMMODITY_COLORS = {
  hewan: '#F97316',     // Orange
  ikan: '#3B82F6',      // Biru
  tumbuhan: '#10B981',  // Hijau
};

/**
 * Mengembalikan warna terkunci jika label/nama mengacu pada sektor Karantina (Hewan, Ikan, Tumbuhan).
 * Mengembalikan null jika label adalah kategori umum lainnya atau spesies spesifik.
 *
 * @param {string} label
 * @returns {string|null} Hex color atau null
 */
export function getCommodityColor(label) {
  if (!label || typeof label !== 'string') return null;
  const clean = label.trim().toLowerCase();

  // 1. Pencocokan langsung Hewan
  if (
    clean === 'hewan' ||
    clean === 'karantina hewan' ||
    clean === 'sektor hewan' ||
    clean === 'komoditas hewan' ||
    clean === 'animal' ||
    clean.startsWith('hewan (')
  ) {
    return COMMODITY_COLORS.hewan;
  }

  // 2. Pencocokan langsung Ikan
  if (
    clean === 'ikan' ||
    clean === 'karantina ikan' ||
    clean === 'sektor ikan' ||
    clean === 'komoditas ikan' ||
    clean === 'fish' ||
    clean.startsWith('ikan (')
  ) {
    return COMMODITY_COLORS.ikan;
  }

  // 3. Pencocokan langsung Tumbuhan
  if (
    clean === 'tumbuhan' ||
    clean === 'karantina tumbuhan' ||
    clean === 'sektor tumbuhan' ||
    clean === 'komoditas tumbuhan' ||
    clean === 'plant' ||
    clean.startsWith('tumbuhan (')
  ) {
    return COMMODITY_COLORS.tumbuhan;
  }

  // 4. Tokenized matching (contoh: "Karantina-Hewan", "Sektor_Ikan")
  const tokens = clean.split(/[\s_/-]+/);
  if (tokens.length <= 3) {
    const hasHewan = tokens.includes('hewan');
    const hasIkan = tokens.includes('ikan');
    const hasTumbuhan = tokens.includes('tumbuhan');

    if (hasHewan && !hasIkan && !hasTumbuhan) {
      if (tokens.length === 1 || tokens.includes('karantina') || tokens.includes('sektor') || tokens.includes('komoditas')) {
        return COMMODITY_COLORS.hewan;
      }
    }
    if (hasIkan && !hasHewan && !hasTumbuhan) {
      if (tokens.length === 1 || tokens.includes('karantina') || tokens.includes('sektor') || tokens.includes('komoditas')) {
        return COMMODITY_COLORS.ikan;
      }
    }
    if (hasTumbuhan && !hasHewan && !hasIkan) {
      if (tokens.length === 1 || tokens.includes('karantina') || tokens.includes('sektor') || tokens.includes('komoditas')) {
        return COMMODITY_COLORS.tumbuhan;
      }
    }
  }

  return null;
}
