-- ==============================================================================
-- MONDAT Migration 005: Add Username & Migration to Model Tertutup (@podqes.web.id)
-- ==============================================================================

-- 1. Tambahkan kolom username ke tabel profiles (opsional/nullable dahulu, lalu unique)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. Populate username yang masih kosong dari email (ambil bagian sebelum @)
UPDATE public.profiles 
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL;

-- 3. Beri batasan UNIQUE pada username
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
    END IF;
END $$;

-- 4. Update trigger handle_new_user agar menyertakan username dari raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, username)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'petugas'),
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        username = COALESCE(EXCLUDED.username, public.profiles.username),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
