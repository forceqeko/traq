-- Migration 008: Create instalasi_iki table
CREATE TABLE IF NOT EXISTS public.instalasi_iki (
  id TEXT PRIMARY KEY,
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

DROP POLICY IF EXISTS "Public read instalasi_iki" ON public.instalasi_iki;
DROP POLICY IF EXISTS "Authenticated users can manage instalasi_iki" ON public.instalasi_iki;
DROP POLICY IF EXISTS "Allow select instalasi_iki" ON public.instalasi_iki;
DROP POLICY IF EXISTS "Allow insert instalasi_iki" ON public.instalasi_iki;
DROP POLICY IF EXISTS "Allow update instalasi_iki" ON public.instalasi_iki;
DROP POLICY IF EXISTS "Allow delete instalasi_iki" ON public.instalasi_iki;

CREATE POLICY "Allow select instalasi_iki"
  ON public.instalasi_iki FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow insert instalasi_iki"
  ON public.instalasi_iki FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow update instalasi_iki"
  ON public.instalasi_iki FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete instalasi_iki"
  ON public.instalasi_iki FOR DELETE
  TO public
  USING (true);
