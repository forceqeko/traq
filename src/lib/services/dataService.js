import { createClient } from '@/lib/supabase/client';
import { clearDashboardCache } from '@/lib/data/dashboardDataLoader';
import { syncColumnsFromHeaders } from '@/lib/services/columnService';

/**
 * Helper internal untuk mencatat log audit ke tabel upload_audit_log.
 * Menggunakan silent fallback agar tidak menghentikan proses utama jika tabel belum dimigrasikan.
 */
export async function insertAuditLog({
  uploadId = null,
  datasetId = null,
  periodMonth = null,
  periodYear = null,
  action = 'create', // 'create' | 'update' | 'delete'
  userId = null,
  filename = '',
  rowCount = 0,
  notes = null,
}) {
  try {
    const supabase = createClient();
    const payload = {
      upload_id: uploadId,
      dataset_id: datasetId,
      period_month: periodMonth,
      period_year: periodYear,
      action,
      performed_by: userId,
      filename,
      row_count: rowCount,
      notes,
    };

    const { error } = await supabase.from('upload_audit_log').insert(payload);
    if (error) {
      console.warn('Catat audit log gagal (opsional):', error.message);
    }
  } catch (err) {
    console.warn('Catat audit log notice:', err.message);
  }
}

export async function checkExistingData(datasetId, periodMonth, periodYear) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('upload_history')
      .select('id, original_filename, row_count, uploaded_at, uploaded_by')
      .eq('dataset_id', datasetId)
      .eq('period_month', periodMonth)
      .eq('period_year', periodYear)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (err) {
    console.warn('Check existing data check:', err.message);
    return null;
  }
}

export async function uploadDataBatch({
  datasetId,
  periodMonth,
  periodYear,
  filename,
  rows,
  headers,
  userId = null,
}) {
  const supabase = createClient();

  clearDashboardCache();

  const existing = await checkExistingData(datasetId, periodMonth, periodYear);
  if (existing) {
    return await updateDataBatch({
      uploadId: existing.id,
      datasetId,
      periodMonth,
      periodYear,
      filename,
      rows,
      headers,
      userId,
      originalUploadedBy: existing.uploaded_by,
      originalUploadedAt: existing.uploaded_at,
    });
  }

  const insertPayload = {
    dataset_id: datasetId,
    period_month: periodMonth,
    period_year: periodYear,
    original_filename: filename,
    row_count: rows.length,
    column_count: headers.length,
    columns_detected: headers,
    uploaded_by: userId,
  };

  const { data: uploadRecord, error: uploadErr } = await supabase
    .from('upload_history')
    .insert(insertPayload)
    .select()
    .single();

  if (uploadErr) {
    throw new Error(`Gagal mencatat riwayat upload: ${uploadErr.message}`);
  }

  // Otomatis sinkronisasi kolom yang terdeteksi dari file Excel ke Column Mapping Registry
  try {
    await syncColumnsFromHeaders(headers, rows);
  } catch (syncErr) {
    console.warn('Sync columns notice:', syncErr.message);
  }

  const uploadId = uploadRecord.id;
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((row) => ({
      dataset_id: datasetId,
      upload_id: uploadId,
      period_month: periodMonth,
      period_year: periodYear,
      row_data: row,
    }));

    const { error: insertErr } = await supabase.from('data_records').insert(chunk);
    if (insertErr) {
      await supabase.from('upload_history').delete().eq('id', uploadId);
      throw new Error(`Gagal menyimpan data baris: ${insertErr.message}`);
    }
  }

  // Catat Audit Log untuk aksi create/input awal
  await insertAuditLog({
    uploadId: uploadRecord.id,
    datasetId,
    periodMonth,
    periodYear,
    action: 'create',
    userId,
    filename,
    rowCount: rows.length,
    notes: 'Input data batch awal',
  });

  return uploadRecord;
}

export async function updateDataBatch({
  uploadId,
  datasetId,
  periodMonth,
  periodYear,
  filename,
  rows,
  headers,
  userId = null,
  originalUploadedBy = null,
  originalUploadedAt = null,
}) {
  const supabase = createClient();
  clearDashboardCache();

  // 1. Hapus data_records lama
  const { error: delRecordsErr } = await supabase
    .from('data_records')
    .delete()
    .eq('upload_id', uploadId);

  if (delRecordsErr) {
    console.warn('Hapus data_records lama gagal, mencoba fallback:', delRecordsErr.message);
  }

  // 2. Perbarui record di upload_history (gunakan API endpoint dengan service role untuk memastikan berhasil)
  const nowIso = new Date().toISOString();
  let uploadRecord = null;

  try {
    const apiRes = await fetch('/api/admin/update-batch-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId,
        filename,
        rowCount: rows.length,
        columnCount: headers.length,
        columnsDetected: headers,
        uploadedAt: nowIso,
        userId,
      }),
    });
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json.data) uploadRecord = json.data;
    }
  } catch (apiErr) {
    console.warn('API update-batch-history notice:', apiErr.message);
  }

  // Fallback update langsung jika API tidak tersedia
  if (!uploadRecord) {
    let updatePayload = {
      dataset_id: datasetId,
      period_month: periodMonth,
      period_year: periodYear,
      original_filename: filename,
      row_count: rows.length,
      column_count: headers.length,
      columns_detected: headers,
      uploaded_at: nowIso,
    };

    const clientRes = await supabase
      .from('upload_history')
      .update(updatePayload)
      .eq('id', uploadId)
      .select()
      .maybeSingle();

    if (clientRes.data) {
      uploadRecord = clientRes.data;
    }
  }

  // 3. Sinkronkan kolom baru
  try {
    await syncColumnsFromHeaders(headers, rows);
  } catch (syncErr) {
    console.warn('Sync columns notice:', syncErr.message);
  }

  // 4. Masukkan data transaksi baru dalam chunk
  const actualUploadId = uploadRecord?.id || uploadId;
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((row) => ({
      dataset_id: datasetId,
      upload_id: actualUploadId,
      period_month: periodMonth,
      period_year: periodYear,
      row_data: row,
    }));

    const { error: insertErr } = await supabase.from('data_records').insert(chunk);
    if (insertErr) {
      throw new Error(`Gagal menyimpan data baris transaksi baru: ${insertErr.message}`);
    }
  }

  // Catat Audit Log untuk aksi update
  await insertAuditLog({
    uploadId: actualUploadId,
    datasetId,
    periodMonth,
    periodYear,
    action: 'update',
    userId,
    filename,
    rowCount: rows.length,
    notes: 'Pembaruan data / re-upload file',
  });

  return uploadRecord;
}

export async function getUploadHistory() {
  try {
    const supabase = createClient();
    
    // Ambil data upload_history, data profil user, dan riwayat audit log secara paralel
    const [historyRes, profilesRes, auditLogsRes] = await Promise.all([
      supabase
        .from('upload_history')
        .select(`
          *,
          datasets (
            id,
            code,
            name,
            traffic_type,
            commodity_type
          )
        `)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .order('uploaded_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email, role'),
      supabase
        .from('upload_audit_log')
        .select('*')
        .order('performed_at', { ascending: false }),
    ]);

    if (historyRes.error) throw historyRes.error;
    const historyData = historyRes.data || [];
    const profiles = profilesRes.data || [];
    const auditLogs = auditLogsRes.data || [];

    // Map profiles untuk enrichment
    const profileMap = new Map();
    profiles.forEach((p) => {
      if (p && p.id) {
        profileMap.set(p.id, p);
      }
    });

    // Petakan audit log bertipe 'update' yang paling mutakhir per upload_id dan dataset_periode
    const latestUpdateByUploadId = new Map();
    const latestUpdateByDatasetPeriod = new Map();

    auditLogs.forEach((log) => {
      if (log.action === 'update') {
        if (log.upload_id && !latestUpdateByUploadId.has(log.upload_id)) {
          latestUpdateByUploadId.set(log.upload_id, log);
        }
        const periodKey = `${log.dataset_id}_${log.period_year}_${log.period_month}`;
        if (!latestUpdateByDatasetPeriod.has(periodKey)) {
          latestUpdateByDatasetPeriod.set(periodKey, log);
        }
      }
    });

    // Tempelkan data nama petugas pengunggah & data pembaruan terkini
    return historyData.map((item) => {
      const periodKey = `${item.dataset_id}_${item.period_year}_${item.period_month}`;
      const latestUpdate = latestUpdateByUploadId.get(item.id) || latestUpdateByDatasetPeriod.get(periodKey);

      const uploader = item.uploaded_by ? profileMap.get(item.uploaded_by) : null;

      const effectiveUpdatedBy = latestUpdate?.performed_by || item.updated_by;
      const updater = effectiveUpdatedBy ? profileMap.get(effectiveUpdatedBy) : null;

      const effectiveUpdatedAt = latestUpdate?.performed_at || item.updated_at || null;
      const effectiveFilename = latestUpdate?.filename || item.original_filename;
      const effectiveRowCount = (latestUpdate?.row_count !== undefined && latestUpdate?.row_count !== null)
        ? latestUpdate.row_count
        : item.row_count;

      const isUpdated = Boolean(effectiveUpdatedAt && effectiveUpdatedAt !== item.uploaded_at);
      const latestDate = effectiveUpdatedAt || item.uploaded_at;

      return {
        ...item,
        original_filename: effectiveFilename,
        row_count: effectiveRowCount,
        uploaded_at: item.uploaded_at,
        updated_at: effectiveUpdatedAt,
        updated_by: effectiveUpdatedBy,
        uploader_name: uploader?.full_name || uploader?.email || (item.uploaded_by ? 'Petugas' : 'Admin Utama'),
        uploader_role: uploader?.role || 'admin',
        updater_name: updater?.full_name || updater?.email || (effectiveUpdatedBy ? 'Petugas' : null),
        updater_role: updater?.role || null,
        latest_date: latestDate,
        is_updated: isUpdated,
      };
    });
  } catch (err) {
    console.warn('Fetch upload history fallback:', err.message);
    return [];
  }
}

export async function deleteUploadBatch(uploadId, auditInfo = {}) {
  const supabase = createClient();
  clearDashboardCache();

  // Catat Audit Log terlebih dahulu sebelum record upload_history dihapus
  if (auditInfo) {
    await insertAuditLog({
      uploadId,
      datasetId: auditInfo.datasetId || auditInfo.dataset_id || null,
      periodMonth: auditInfo.periodMonth || auditInfo.period_month || null,
      periodYear: auditInfo.periodYear || auditInfo.period_year || null,
      action: 'delete',
      userId: auditInfo.userId || auditInfo.uploaded_by || null,
      filename: auditInfo.filename || auditInfo.original_filename || '',
      rowCount: auditInfo.rowCount || auditInfo.row_count || 0,
      notes: 'Batch data dihapus / rollback',
    });
  }

  const { error } = await supabase.from('upload_history').delete().eq('id', uploadId);
  if (error) {
    throw new Error(`Gagal menghapus batch data: ${error.message}`);
  }
  return true;
}

/**
 * Mengambil seluruh riwayat perubahan (audit logs) untuk dataset & periode tertentu.
 * Di-enrich dengan nama & role pengguna dari tabel profiles.
 */
export async function getAuditLogs({
  uploadId = null,
  datasetId = null,
  periodMonth = null,
  periodYear = null,
  activeItem = null,
} = {}) {
  try {
    const supabase = createClient();

    // Query logs dari tabel upload_audit_log
    let query = supabase
      .from('upload_audit_log')
      .select('*')
      .order('performed_at', { ascending: false });

    if (uploadId) {
      query = query.eq('upload_id', uploadId);
    } else if (datasetId && periodMonth && periodYear) {
      query = query
        .eq('dataset_id', datasetId)
        .eq('period_month', periodMonth)
        .eq('period_year', periodYear);
    }

    const [logsRes, profilesRes] = await Promise.all([
      query,
      supabase.from('profiles').select('id, full_name, email, role'),
    ]);

    const profiles = profilesRes.data || [];
    const profileMap = new Map();
    profiles.forEach((p) => {
      if (p && p.id) profileMap.set(p.id, p);
    });

    let logs = logsRes.data || [];

    // Ambil info upload_history jika activeItem belum lengkap
    let uploadHistoryRecord = activeItem;
    if (!uploadHistoryRecord && (uploadId || (datasetId && periodMonth && periodYear))) {
      try {
        let hQuery = supabase.from('upload_history').select('*');
        if (uploadId) {
          hQuery = hQuery.eq('id', uploadId);
        } else {
          hQuery = hQuery
            .eq('dataset_id', datasetId)
            .eq('period_month', periodMonth)
            .eq('period_year', periodYear);
        }
        const { data: hData } = await hQuery.limit(1);
        if (hData && hData.length > 0) {
          uploadHistoryRecord = hData[0];
        }
      } catch (hErr) {
        console.warn('Fetch upload_history for audit baseline error:', hErr.message);
      }
    }

    // Pastikan log 'create' (Input Data Awal) selalu ada jika pernah di-upload di upload_history
    const hasCreateLog = logs.some((l) => l.action === 'create');
    if (!hasCreateLog && uploadHistoryRecord?.uploaded_at) {
      logs.push({
        id: `syn-cre-${uploadHistoryRecord.id}`,
        upload_id: uploadHistoryRecord.id,
        action: 'create',
        performed_by: uploadHistoryRecord.uploaded_by,
        performed_at: uploadHistoryRecord.uploaded_at,
        filename: uploadHistoryRecord.original_filename,
        row_count: uploadHistoryRecord.row_count,
        notes: 'Input data batch awal',
      });
    }

    // Urutkan selalu log dari yang paling terkini ke yang paling lama
    logs.sort((a, b) => new Date(b.performed_at || 0) - new Date(a.performed_at || 0));

    // Tempelkan data user (full_name, email, role)
    return logs.map((log) => {
      const userObj = log.performed_by ? profileMap.get(log.performed_by) : null;
      return {
        ...log,
        user_name: userObj?.full_name || userObj?.email || (log.performed_by ? 'Petugas' : 'Admin Utama'),
        user_role: userObj?.role || 'admin',
      };
    });
  } catch (err) {
    console.warn('Fetch audit logs notice:', err.message);

    // Fallback dari activeItem jika ada error
    if (activeItem) {
      return [
        ...(activeItem.updated_by || activeItem.updated_at
          ? [
              {
                id: `syn-upd-${activeItem.id}`,
                action: 'update',
                user_name: activeItem.updater_name || 'Petugas',
                user_role: activeItem.updater_role || 'petugas',
                performed_at: activeItem.updated_at,
                filename: activeItem.original_filename,
                row_count: activeItem.row_count,
                notes: 'Pembaruan data',
              },
            ]
          : []),
        {
          id: `syn-cre-${activeItem.id}`,
          action: 'create',
          user_name: activeItem.uploader_name || 'Admin',
          user_role: activeItem.uploader_role || 'admin',
          performed_at: activeItem.uploaded_at,
          filename: activeItem.original_filename,
          row_count: activeItem.row_count,
          notes: 'Input data batch awal',
        },
      ];
    }
    return [];
  }
}
