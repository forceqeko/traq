-- ==============================================================================
-- Migration: Allow 'quarter' (25%) and 'fifth' (20%) in chart_configs table
-- ==============================================================================

ALTER TABLE public.chart_configs DROP CONSTRAINT IF EXISTS chart_configs_width_check;
ALTER TABLE public.chart_configs ADD CONSTRAINT chart_configs_width_check 
  CHECK (width IN ('full', 'half', 'third', 'quarter', 'fifth'));
