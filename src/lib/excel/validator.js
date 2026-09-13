import { detectColumnType } from './parser';

export function validateExcelData(headers, rows, registeredColumns = []) {
  const warnings = [];
  const errors = [];
  const newColumns = [];

  if (!rows || rows.length === 0) {
    errors.push('File Excel tidak memiliki baris data.');
    return { isValid: false, warnings, errors, newColumns, columnMeta: [] };
  }

  const registeredMap = new Map();
  registeredColumns.forEach((col) => {
    registeredMap.set(col.column_name.toLowerCase(), col);
  });

  headers.forEach((header) => {
    const lower = header.toLowerCase();
    if (!registeredMap.has(lower)) {
      newColumns.push(header);
    }
  });

  if (newColumns.length > 0) {
    warnings.push(
      `Ditemukan ${newColumns.length} kolom baru yang belum pernah terdaftar: ${newColumns.join(', ')}`
    );
  }

  const missingPrimary = registeredColumns
    .filter((col) => col.is_primary)
    .filter((col) => !headers.some((h) => h.toLowerCase() === col.column_name.toLowerCase()));

  if (missingPrimary.length > 0) {
    warnings.push(
      `Kolom utama tidak ditemukan: ${missingPrimary.map((c) => c.display_name || c.column_name).join(', ')}`
    );
  }

  const columnMeta = headers.map((header) => {
    const matched = registeredMap.get(header.toLowerCase());
    const detectedType = detectColumnType(rows, header);

    return {
      column_name: header,
      display_name: matched ? matched.display_name : header,
      data_type: matched ? matched.data_type : detectedType,
      is_primary: matched ? matched.is_primary : false,
      is_new: !matched,
    };
  });

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    newColumns,
    columnMeta,
  };
}
