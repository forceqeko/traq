-- ------------------------------------------------------------------------------
-- MIGRATION 003: Allow horizontal_bar and bar_horizontal in chart_configs table
-- ------------------------------------------------------------------------------

ALTER TABLE public.chart_configs 
DROP CONSTRAINT IF EXISTS chart_configs_chart_type_check;

ALTER TABLE public.chart_configs 
ADD CONSTRAINT chart_configs_chart_type_check 
CHECK (chart_type IN ('bar', 'horizontal_bar', 'bar_horizontal', 'line', 'area', 'pie', 'donut', 'kpi_card', 'data_table'));
