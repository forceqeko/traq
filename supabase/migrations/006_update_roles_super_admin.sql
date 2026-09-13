-- ==============================================================================
-- MONDAT Migration 006: Update User Roles to super_admin, admin, and user
-- ==============================================================================

-- 1. Drop batasan CHECK lama pada kolom role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Tambahkan batasan CHECK baru yang mendukung super_admin, admin, dan user
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('super_admin', 'admin', 'user', 'petugas'));

-- 3. Migrasikan role lama 'petugas' menjadi 'user'
UPDATE public.profiles SET role = 'user' WHERE role = 'petugas';

-- 4. Update akun admin utama menjadi super_admin
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE email = 'admin@podqes.web.id' OR email = 'admin@karantina.go.id';

-- 5. Perbarui fungsi is_admin agar mencakup super_admin dan admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Fungsi pembantu is_super_admin untuk proteksi khusus manajemen pengguna
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
