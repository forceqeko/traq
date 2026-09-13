-- ==============================================================================
-- MONDAT (Monitoring Data Karantina) — Database Initial Schema
-- Balai Karantina Hewan, Ikan dan Tumbuhan Sulawesi Utara
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABEL PROFILES (Role-Based Access)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'petugas' CHECK (role IN ('admin', 'petugas')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'petugas')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ------------------------------------------------------------------------------
-- 2. TABEL DATASETS (12 Kategori Master Data)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    traffic_type TEXT NOT NULL CHECK (traffic_type IN ('domestik_masuk', 'domestik_keluar', 'ekspor', 'impor')),
    commodity_type TEXT NOT NULL CHECK (commodity_type IN ('hewan', 'ikan', 'tumbuhan')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed 12 Datasets
INSERT INTO public.datasets (code, name, traffic_type, commodity_type, description) VALUES
('DM_HEWAN', 'Domestik Masuk Hewan', 'domestik_masuk', 'hewan', 'Rekapitulasi pengajuan karantina Domestik Masuk komoditas Hewan'),
('DM_IKAN', 'Domestik Masuk Ikan', 'domestik_masuk', 'ikan', 'Rekapitulasi pengajuan karantina Domestik Masuk komoditas Ikan'),
('DM_TUMBUHAN', 'Domestik Masuk Tumbuhan', 'domestik_masuk', 'tumbuhan', 'Rekapitulasi pengajuan karantina Domestik Masuk komoditas Tumbuhan'),
('DK_HEWAN', 'Domestik Keluar Hewan', 'domestik_keluar', 'hewan', 'Rekapitulasi pengajuan karantina Domestik Keluar komoditas Hewan'),
('DK_IKAN', 'Domestik Keluar Ikan', 'domestik_keluar', 'ikan', 'Rekapitulasi pengajuan karantina Domestik Keluar komoditas Ikan'),
('DK_TUMBUHAN', 'Domestik Keluar Tumbuhan', 'domestik_keluar', 'tumbuhan', 'Rekapitulasi pengajuan karantina Domestik Keluar komoditas Tumbuhan'),
('EKSPOR_HEWAN', 'Ekspor Hewan', 'ekspor', 'hewan', 'Rekapitulasi pengajuan karantina Ekspor komoditas Hewan'),
('EKSPOR_IKAN', 'Ekspor Ikan', 'ekspor', 'ikan', 'Rekapitulasi pengajuan karantina Ekspor komoditas Ikan'),
('EKSPOR_TUMBUHAN', 'Ekspor Tumbuhan', 'ekspor', 'tumbuhan', 'Rekapitulasi pengajuan karantina Ekspor komoditas Tumbuhan'),
('IMPOR_HEWAN', 'Impor Hewan', 'impor', 'hewan', 'Rekapitulasi pengajuan karantina Impor komoditas Hewan'),
('IMPOR_IKAN', 'Impor Ikan', 'impor', 'ikan', 'Rekapitulasi pengajuan karantina Impor komoditas Ikan'),
('IMPOR_TUMBUHAN', 'Impor Tumbuhan', 'impor', 'tumbuhan', 'Rekapitulasi pengajuan karantina Impor komoditas Tumbuhan')
ON CONFLICT (code) DO NOTHING;


-- ------------------------------------------------------------------------------
-- 3. TABEL COLUMN_REGISTRY (Registry Kolom Umum & Khusus)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.column_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    column_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    data_type TEXT NOT NULL DEFAULT 'text' CHECK (data_type IN ('text', 'number', 'date', 'currency')),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(column_name, dataset_id)
);


-- ------------------------------------------------------------------------------
-- 4. TABEL UPLOAD_HISTORY (Riwayat Batch Upload)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.upload_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year INTEGER NOT NULL CHECK (period_year >= 2000),
    original_filename TEXT NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 0,
    column_count INTEGER NOT NULL DEFAULT 0,
    columns_detected JSONB NOT NULL DEFAULT '[]'::jsonb,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------------------------
-- 5. TABEL DATA_RECORDS (Data Mentah Excel dalam JSONB)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
    upload_id UUID NOT NULL REFERENCES public.upload_history(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year INTEGER NOT NULL CHECK (period_year >= 2000),
    row_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes untuk performa tinggi
CREATE INDEX IF NOT EXISTS idx_data_records_lookup ON public.data_records(dataset_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_data_records_upload ON public.data_records(upload_id);
CREATE INDEX IF NOT EXISTS idx_data_records_gin ON public.data_records USING gin (row_data);


-- ------------------------------------------------------------------------------
-- 6. TABEL DASHBOARD_CONFIGS (Konfigurasi Halaman Dashboard)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dashboard_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_key TEXT UNIQUE NOT NULL CHECK (page_key IN (
        'home', 
        'domestik_masuk', 'domestik_keluar', 'ekspor', 'impor', 
        'hewan', 'ikan', 'tumbuhan'
    )),
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed 8 Halaman Dashboard
INSERT INTO public.dashboard_configs (page_key, title, description) VALUES
('home', 'Executive Dashboard', 'Ringkasan visualisasi terpadu dari seluruh 12 kategori data master karantina'),
('domestik_masuk', 'Domestik Masuk Dashboard', 'Visualisasi data karantina Domestik Masuk (Hewan, Ikan, Tumbuhan)'),
('domestik_keluar', 'Domestik Keluar Dashboard', 'Visualisasi data karantina Domestik Keluar (Hewan, Ikan, Tumbuhan)'),
('ekspor', 'Ekspor Dashboard', 'Visualisasi data karantina Ekspor (Hewan, Ikan, Tumbuhan)'),
('impor', 'Impor Dashboard', 'Visualisasi data karantina Impor (Hewan, Ikan, Tumbuhan)'),
('hewan', 'Karantina Hewan Dashboard', 'Visualisasi data karantina komoditas Hewan (Semua Arah Lalu Lintas)'),
('ikan', 'Karantina Ikan Dashboard', 'Visualisasi data karantina komoditas Ikan (Semua Arah Lalu Lintas)'),
('tumbuhan', 'Karantina Tumbuhan Dashboard', 'Visualisasi data karantina komoditas Tumbuhan (Semua Arah Lalu Lintas)')
ON CONFLICT (page_key) DO NOTHING;


-- ------------------------------------------------------------------------------
-- 7. TABEL CHART_CONFIGS (Konfigurasi Visualisasi Individu)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chart_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES public.dashboard_configs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    chart_type TEXT NOT NULL CHECK (chart_type IN ('bar', 'line', 'area', 'pie', 'donut', 'kpi_card', 'data_table')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    width TEXT NOT NULL DEFAULT 'half' CHECK (width IN ('full', 'half', 'third', 'quarter', 'fifth')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chart_configs_dashboard ON public.chart_configs(dashboard_id, sort_order);


-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.column_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_configs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin());

-- Datasets Policies
CREATE POLICY "Authenticated users can view datasets" ON public.datasets FOR SELECT TO authenticated USING (true);

-- Column Registry Policies
CREATE POLICY "Authenticated users can view column_registry" ON public.column_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage column_registry" ON public.column_registry FOR ALL TO authenticated USING (public.is_admin());

-- Upload History Policies
CREATE POLICY "Authenticated users can view upload_history" ON public.upload_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert upload_history" ON public.upload_history FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete upload_history" ON public.upload_history FOR DELETE TO authenticated USING (public.is_admin());

-- Data Records Policies
CREATE POLICY "Authenticated users can view data_records" ON public.data_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert data_records" ON public.data_records FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete data_records" ON public.data_records FOR DELETE TO authenticated USING (public.is_admin());

-- Dashboard Configs Policies
CREATE POLICY "Authenticated users can view dashboard_configs" ON public.dashboard_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update dashboard_configs" ON public.dashboard_configs FOR UPDATE TO authenticated USING (public.is_admin());

-- Chart Configs Policies
CREATE POLICY "Authenticated users can view chart_configs" ON public.chart_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage chart_configs" ON public.chart_configs FOR ALL TO authenticated USING (public.is_admin());
