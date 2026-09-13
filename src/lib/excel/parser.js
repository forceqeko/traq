import * as XLSX from 'xlsx';

export async function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawJson || rawJson.length < 2) {
          reject(new Error('File Excel kosong atau tidak memiliki baris data.'));
          return;
        }

        const rawHeaders = rawJson[0];
        const headers = rawHeaders.map((h, i) =>
          h ? String(h).trim() : `Kolom_${i + 1}`
        );

        const rows = [];
        for (let i = 1; i < rawJson.length; i++) {
          const rowArray = rawJson[i];
          if (rowArray.every((val) => val === '' || val === null || val === undefined)) {
            continue;
          }

          const rowObj = {};
          headers.forEach((header, index) => {
            let val = rowArray[index];
            if (val instanceof Date) {
              val = val.toISOString().split('T')[0];
            }
            rowObj[header] = val !== undefined && val !== null ? val : '';
          });
          rows.push(rowObj);
        }

        resolve({
          headers,
          rows,
          rowCount: rows.length,
          columnCount: headers.length,
        });
      } catch (err) {
        reject(new Error(`Gagal membaca file Excel: ${err.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca file dari disk.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

export function detectColumnType(rows, columnName) {
  const sample = rows.slice(0, 50);
  let numberCount = 0;
  let dateCount = 0;
  let validCount = 0;

  for (const row of sample) {
    const val = row[columnName];
    if (val === '' || val === null || val === undefined) continue;
    validCount++;

    const strVal = String(val).trim();

    const cleanNum = strVal.replace(/[Rp.,\s]/g, '');
    if (!isNaN(cleanNum) && cleanNum !== '') {
      numberCount++;
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(strVal) || /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/.test(strVal)) {
      dateCount++;
    }
  }

  if (validCount === 0) return 'text';
  if (dateCount / validCount > 0.6) return 'date';
  if (numberCount / validCount > 0.6) return 'number';
  return 'text';
}
