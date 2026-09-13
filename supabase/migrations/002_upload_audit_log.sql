-- ==============================================================================
-- MONDAT (Monitoring Data Karantina) — Audit Log Schema
-- Mencatat seluruh riwayat aksi (create, update, delete) pada upload data
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.upload_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID,
    dataset_id UUID REFERENCES public.datasets(id) ON DELETE SET NULL,
    period_month INTEGER CHECK (period_month BETWEEN 1 AND 12),
    period_year INTEGER CHECK (period_year >= 2000),
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    filename TEXT,
    row_count INTEGER DEFAULT 0,
    notes TEXT
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_upload_id ON public.upload_audit_log(upload_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_dataset_period ON public.upload_audit_log(dataset_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_at ON public.upload_audit_log(performed_at DESC);

-- Enable RLS
ALTER TABLE public.upload_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for authenticated users on upload_audit_log"
    ON public.upload_audit_log FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for authenticated users on upload_audit_log"
    ON public.upload_audit_log FOR INSERT
    TO authenticated
    WITH CHECK (true);
