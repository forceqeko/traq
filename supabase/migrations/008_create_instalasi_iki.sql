-- Migration 008: Create instalasi_iki table
CREATE TABLE IF NOT EXISTS public.instalasi_iki (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_perusahaan TEXT NOT NULL,
  alamat_perusahaan TEXT,
  kapasitas_iki NUMERIC DEFAULT 0,
  tanggal_sertifikasi DATE,
  lama_iki TEXT DEFAULT '1 Tahun',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.instalasi_iki ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read instalasi_iki"
  ON public.instalasi_iki FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage instalasi_iki"
  ON public.instalasi_iki FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
