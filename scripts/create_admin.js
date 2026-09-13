const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('your-project-id')) {
  console.error('❌ Credentials Supabase di .env.local belum diisi!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdminUser() {
  const email = 'admin@podqes.web.id';
  const password = 'Password123!';

  console.log(`⏳ Membuat akun Admin awal (${email})...`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: 'Admin Utama Karantina',
      role: 'admin',
      username: 'admin',
    },
  });

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('already been registered')) {
      console.log('⚠️ Akun admin@podqes.web.id sudah pernah dibuat sebelumnya.');

      const { data: usersData } = await supabase.auth.admin.listUsers();
      const existingUser = usersData?.users?.find((u) => u.email === email);

      if (existingUser) {
        await supabase
          .from('profiles')
          .upsert({
            id: existingUser.id,
            email,
            full_name: 'Admin Utama Karantina',
            role: 'admin',
          });
        console.log('✅ Role admin pada profil berhasil dipastikan!');
      }
    } else {
      console.error('❌ Gagal membuat user:', error.message);
    }
  } else {
    console.log('✅ Akun Admin berhasil dibuat!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);

    await supabase.from('profiles').upsert({
      id: data.user.id,
      email,
      full_name: 'Admin Utama Karantina',
      role: 'admin',
    });
  }
}

createAdminUser();
