-- ==============================================================================
-- 004: Tambah Kolom Pelacakan Update pada Tabel Upload History
-- ==============================================================================

ALTER TABLE public.upload_history
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Beri komentar pada kolom baru
COMMENT ON COLUMN public.upload_history.updated_by IS 'ID pengguna/petugas yang terakhir kali memperbarui data batch ini';
COMMENT ON COLUMN public.upload_history.updated_at IS 'Waktu terakhir kali data batch ini diperbarui/di-replace';
