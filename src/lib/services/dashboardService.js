import { createClient } from '@/lib/supabase/client';

export const DEFAULT_CHART_CONFIGS = {
  home: [
    {
      id: 'mock-1',
      title: 'Tren Pengajuan Sertifikat Karantina per Bulan',
      chart_type: 'bar',
      width: 'full',
      sort_order: 1,
      config: { x_axis: 'Bulan', y_axis: 'Volume', aggregation: 'sum', top_n: '10', group_others: true, colors: ['#3B82F6', '#0D9488'] },
    },
    {
      id: 'mock-2',
      title: 'Komposisi Lalulintas Domestik vs Ekspor/Impor',
      chart_type: 'donut',
      width: 'half',
      sort_order: 2,
      config: { x_axis: 'Arah_Lalu_Lintas', y_axis: 'Volume', aggregation: 'sum', top_n: '10', group_others: true, colors: ['#3B82F6', '#0D9488', '#F59E0B', '#8B5CF6'] },
    },
    {
      id: 'mock-3',
      title: 'Proporsi Per Sektor Komoditas',
      chart_type: 'pie',
      width: 'half',
      sort_order: 3,
      config: { x_axis: 'Komoditas', y_axis: 'Volume', aggregation: 'sum', top_n: '10', group_others: true, colors: ['#10B981', '#3B82F6', '#F59E0B'] },
    },
  ],
};

export async function getDashboardConfigs(pageKey = 'home') {
  try {
    const supabase = createClient();
    const { data: dbConfig } = await supabase
      .from('dashboard_configs')
      .select('id')
      .eq('page_key', pageKey)
      .maybeSingle();

    if (dbConfig) {
      const { data: charts } = await supabase
        .from('chart_configs')
        .select('*')
        .eq('dashboard_id', dbConfig.id)
        .order('sort_order', { ascending: true });

      if (charts && charts.length > 0) {
        return charts
          .filter(Boolean)
          .filter((c) => !c.title?.startsWith('__SYSTEM_'))
          .map((c) => ({
            ...c,
            // Ensure chart_type is read from config.chart_type if saved in config fallback
            chart_type: c.config?.chart_type || c.chart_type || 'bar',
            // Ensure width is read from config.width if saved in config fallback
            width: c.config?.width || c.width || 'half',
          }));
      }

      // Jika konfigurasi dashboard ada di database tetapi grafiknya kosong (0 chart), kembalikan array kosong []
      return [];
    }

    // Jika belum ada konfigurasi di DB, hanya gunakan fallback untuk halaman yang terdaftar (misal: 'home')
    const fallbackList = DEFAULT_CHART_CONFIGS[pageKey] || [];
    return fallbackList.map((c) => ({
      ...c,
      chart_type: c.config?.chart_type || c.chart_type || 'bar',
      width: c.config?.width || c.width || 'half',
    }));
  } catch (err) {
    console.warn(`Fetch dashboard config notice for ${pageKey}:`, err.message);
    const fallbackList = DEFAULT_CHART_CONFIGS[pageKey] || [];
    return fallbackList.map((c) => ({
      ...c,
      chart_type: c.config?.chart_type || c.chart_type || 'bar',
      width: c.config?.width || c.width || 'half',
    }));
  }
}

export async function saveChartConfig(pageKey, chartData) {
  const chosenWidth = chartData.width || 'half';
  const chosenChartType = chartData.chart_type || 'bar';
  try {
    const supabase = createClient();
    let { data: dbConfig } = await supabase
      .from('dashboard_configs')
      .select('id')
      .eq('page_key', pageKey)
      .maybeSingle();

    if (!dbConfig) {
      const { data: newDb } = await supabase
        .from('dashboard_configs')
        .insert({ page_key: pageKey, title: `${pageKey} Dashboard` })
        .select()
        .single();
      dbConfig = newDb;
    }

    const payload = {
      dashboard_id: dbConfig.id,
      title: chartData.title,
      chart_type: chosenChartType,
      width: chosenWidth,
      ...(typeof chartData.sort_order === 'number' ? { sort_order: chartData.sort_order } : {}),
      config: {
        ...(chartData.config || {}),
        chart_type: chosenChartType, // Preserve in config JSONB as backup
        width: chosenWidth, // Preserve in config JSONB as backup
      },
    };

    let resultData = null;

    if (chartData.id && !chartData.id.startsWith('mock-')) {
      const { data, error } = await supabase
        .from('chart_configs')
        .update(payload)
        .eq('id', chartData.id)
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Direct update failed, retrying with fallback payload:', error.message);
        // Fallback for database with old CHECK constraint: save in config, use 'bar' in column
        const fallbackPayload = {
          ...payload,
          chart_type: ['bar', 'line', 'area', 'pie', 'donut', 'kpi_card', 'data_table'].includes(chosenChartType)
            ? chosenChartType
            : 'bar',
          width: ['full', 'half', 'third'].includes(chosenWidth) ? chosenWidth : 'half',
        };
        const retry = await supabase
          .from('chart_configs')
          .update(fallbackPayload)
          .eq('id', chartData.id)
          .select()
          .maybeSingle();

        resultData = retry.data ? { ...retry.data, chart_type: chosenChartType, width: chosenWidth } : null;
      } else {
        resultData = data ? { ...data, chart_type: chosenChartType, width: chosenWidth } : null;
      }
    } else {
      // Determine max sort_order so new charts are appended at the bottom
      let insertOrder = chartData.sort_order;
      if (typeof insertOrder !== 'number') {
        const { data: existingCharts } = await supabase
          .from('chart_configs')
          .select('sort_order')
          .eq('dashboard_id', dbConfig.id)
          .order('sort_order', { ascending: false })
          .limit(1);
        const maxOrder = existingCharts && existingCharts.length > 0 ? (existingCharts[0].sort_order || 0) : 0;
        insertOrder = maxOrder + 1;
      }

      const insertPayload = {
        ...payload,
        sort_order: insertOrder,
      };

      const { data, error } = await supabase
        .from('chart_configs')
        .insert(insertPayload)
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Direct insert failed, retrying with fallback payload:', error.message);
        // Fallback for database with old CHECK constraint: save in config, use 'bar' in column
        const fallbackPayload = {
          ...insertPayload,
          chart_type: ['bar', 'line', 'area', 'pie', 'donut', 'kpi_card', 'data_table'].includes(chosenChartType)
            ? chosenChartType
            : 'bar',
          width: ['full', 'half', 'third'].includes(chosenWidth) ? chosenWidth : 'half',
        };
        const retry = await supabase
          .from('chart_configs')
          .insert(fallbackPayload)
          .select()
          .maybeSingle();

        resultData = retry.data ? { ...retry.data, chart_type: chosenChartType, width: chosenWidth } : null;
      } else {
        resultData = data ? { ...data, chart_type: chosenChartType, width: chosenWidth } : null;
      }
    }

    if (!resultData) {
      // Safe fallback object so caller never receives null
      return {
        ...chartData,
        id: chartData.id || `custom-${Date.now()}`,
        chart_type: chosenChartType,
        width: chosenWidth,
        config: payload.config,
      };
    }

    return {
      ...resultData,
      chart_type: resultData.config?.chart_type || resultData.chart_type || chosenChartType,
      width: resultData.config?.width || resultData.width || chosenWidth,
    };
  } catch (err) {
    console.warn('Save chart config fallback:', err.message);
    return {
      ...chartData,
      id: chartData.id || `custom-${Date.now()}`,
      chart_type: chosenChartType,
      width: chosenWidth,
    };
  }
}

export async function deleteChartConfig(chartId) {
  try {
    if (chartId.startsWith('mock-')) return true;
    const supabase = createClient();
    await supabase.from('chart_configs').delete().eq('id', chartId);
    return true;
  } catch {
    return true;
  }
}

export async function updateChartPositions(charts = []) {
  try {
    const supabase = createClient();
    const updates = (charts || []).filter(Boolean).map((c, index) => ({
      id: c.id,
      sort_order: index + 1,
    }));

    for (const item of updates) {
      if (item.id && !item.id.startsWith('mock-') && !item.id.startsWith('custom-')) {
        await supabase
          .from('chart_configs')
          .update({ sort_order: item.sort_order })
          .eq('id', item.id);
      }
    }
    return true;
  } catch (err) {
    console.warn('Update chart positions error:', err.message);
    return false;
  }
}
