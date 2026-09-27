import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';
import { createClient } from '@supabase/supabase-js';

function adminApiPlugin(env) {
  return {
    name: 'admin-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // 1. Handler Pembuatan Akun Baru
        if (req.url === '/api/admin/create-user' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { username, fullName, role, password } = JSON.parse(body || '{}');
              const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
              const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

              if (!supabaseUrl || !serviceRoleKey) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Kredensial server Supabase belum dikonfigurasi' }));
              }

              const cleanUsername = String(username || '').trim().toLowerCase().replace(/@.*$/, '');
              if (!/^[a-z0-9_.-]{3,30}$/.test(cleanUsername)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(
                  JSON.stringify({
                    error: 'Format username tidak valid. Gunakan 3-30 karakter (huruf kecil, angka, titik, strip, atau underscore).',
                  })
                );
              }

              const email = `${cleanUsername}@podqes.web.id`;
              let userRole = 'user';
              if (role === 'super_admin') userRole = 'super_admin';
              else if (role === 'admin') userRole = 'admin';

              const adminClient = createClient(supabaseUrl, serviceRoleKey, {
                auth: { autoRefreshToken: false, persistSession: false },
              });

              const { data, error } = await adminClient.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: {
                  full_name: fullName,
                  role: userRole,
                  username: cleanUsername,
                },
              });

              if (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: error.message }));
              }

              try {
                await adminClient.from('profiles').upsert({
                  id: data.user.id,
                  email,
                  full_name: fullName,
                  role: userRole,
                });
              } catch {
                try {
                  const fallbackRole = userRole === 'user' ? 'petugas' : 'admin';
                  await adminClient.from('profiles').upsert({
                    id: data.user.id,
                    email,
                    full_name: fullName,
                    role: fallbackRole,
                  });
                } catch {
                  // Diabaikan jika ditangani trigger
                }
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: true,
                  user: {
                    id: data.user.id,
                    email,
                    username: cleanUsername,
                    full_name: fullName,
                    role: userRole,
                    created_at: data.user.created_at,
                  },
                })
              );
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message || 'Gagal memproses pembuatan user' }));
            }
          });
          return;
        }

        // 2. Handler Pembaruan Peran (Role) Pengguna
        if (req.url === '/api/admin/update-role' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { userId, role } = JSON.parse(body || '{}');
              const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
              const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
              const adminClient = createClient(supabaseUrl, serviceRoleKey, {
                auth: { autoRefreshToken: false, persistSession: false },
              });

              let normalizedRole = 'user';
              if (role === 'super_admin') normalizedRole = 'super_admin';
              else if (role === 'admin') normalizedRole = 'admin';

              // Update auth metadata
              await adminClient.auth.admin.updateUserById(userId, {
                user_metadata: { role: normalizedRole },
              });

              // Coba update profiles table
              try {
                await adminClient.from('profiles').update({ role: normalizedRole }).eq('id', userId);
              } catch {
                try {
                  const fallbackRole = normalizedRole === 'user' ? 'petugas' : 'admin';
                  await adminClient.from('profiles').update({ role: fallbackRole }).eq('id', userId);
                } catch {
                  // Diabaikan
                }
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, role: normalizedRole }));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // 3. Handler Penghapusan Akun Pengguna
        if (req.url === '/api/admin/delete-user' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { userId } = JSON.parse(body || '{}');
              const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
              const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
              const adminClient = createClient(supabaseUrl, serviceRoleKey, {
                auth: { autoRefreshToken: false, persistSession: false },
              });
              await adminClient.auth.admin.deleteUser(userId);
              await adminClient.from('profiles').delete().eq('id', userId);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // 4. Handler Pembaruan Riwayat Upload Batch
        if (req.url === '/api/admin/update-batch-history' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { uploadId, filename, rowCount, columnCount, columnsDetected, uploadedAt } = JSON.parse(body || '{}');
              const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
              const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

              if (!uploadId) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Upload ID wajib disertakan.' }));
              }

              const adminClient = createClient(supabaseUrl, serviceRoleKey, {
                auth: { autoRefreshToken: false, persistSession: false },
              });

              const nowIso = uploadedAt || new Date().toISOString();
              const { data, error } = await adminClient
                .from('upload_history')
                .update({
                  original_filename: filename,
                  row_count: rowCount,
                  column_count: columnCount,
                  columns_detected: columnsDetected,
                  uploaded_at: nowIso,
                })
                .eq('id', uploadId)
                .select()
                .single();

              if (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: error.message }));
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, data }));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), adminApiPlugin(env)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 3000,
      open: false,
    },
  };
});
