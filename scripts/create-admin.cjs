/**
 * Admin Account Provisioning Script for Woliso Hotel Management System (HMS)
 *
 * Creates or updates an administrator account in Supabase Auth,
 * public.profiles, and public.staff_members.
 *
 * Usage:
 *   node scripts/create-admin.cjs [email] [password] [fullName]
 *
 * Example:
 *   node scripts/create-admin.cjs naolnigatu2025@gmail.com AdminPassword123! "Naol Nigatu"
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env / .env.local manually if dotenv is not loaded
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }
}

loadEnv();

const targetEmail = process.argv[2] || process.env.ADMIN_EMAIL || 'naolnigatu2025@gmail.com';
const targetPassword = process.argv[3] || process.env.ADMIN_PASSWORD || 'AdminPassword123!';
const targetName = process.argv[4] || process.env.ADMIN_NAME || (targetEmail === 'admin@wolisohotel.com' ? 'System Admin' : 'Naol Nigatu');

// Pick Supabase instance: remote first if secret key is available, else local
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54331';
const secretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

console.log(`\n======================================================`);
console.log(`Woliso HMS Admin Provisioning`);
console.log(`======================================================`);
console.log(`Target Supabase URL: ${supabaseUrl}`);
console.log(`Admin Email:         ${targetEmail}`);
console.log(`Admin Name:          ${targetName}`);
console.log(`======================================================\n`);

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function provisionAdmin() {
  try {
    // 1. Check if user already exists
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing existing users:', listError.message);
      process.exit(1);
    }

    let existingUser = usersData.users.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());
    let userId = '';

    if (existingUser) {
      userId = existingUser.id;
      console.log(`User already exists (ID: ${userId}). Updating password and admin claims...`);
      const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: targetPassword,
        email_confirm: true,
        user_metadata: {
          name: targetName,
          role: 'admin',
        },
        app_metadata: {
          role: 'admin',
        },
      });

      if (updateError) {
        console.error('Error updating user:', updateError.message);
        process.exit(1);
      }
      console.log('Successfully updated Supabase Auth credentials.');
    } else {
      console.log('Creating new administrator in Supabase Auth...');
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: targetEmail,
        password: targetPassword,
        email_confirm: true,
        user_metadata: {
          name: targetName,
          role: 'admin',
        },
        app_metadata: {
          role: 'admin',
        },
      });

      if (createError) {
        console.error('Error creating user:', createError.message);
        process.exit(1);
      }
      userId = created.user.id;
      console.log(`Successfully created Auth user (ID: ${userId}) with email confirmation.`);
    }

    // 2. Ensure public.profiles entry has admin role
    try {
      const now = Date.now();
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: targetEmail,
        name: targetName,
        role: 'admin',
        updated_at: now,
      });

      if (profileError) {
        console.warn(`[Notice] Profile table upsert: ${profileError.message}`);
      } else {
        console.log(`Synchronized public.profiles record with role = 'admin'.`);
      }
    } catch (e) {
      console.warn(`[Notice] Skipping profile upsert:`, e.message);
    }

    // 3. Ensure public.staff_members entry has admin role
    try {
      const now = Date.now();
      const { error: staffError } = await supabase.from('staff_members').upsert({
        id: userId,
        uid: userId,
        email: targetEmail,
        name: targetName,
        role: 'admin',
        is_active: true,
        department: 'Management',
        updated_at: now,
      });

      if (staffError) {
        console.warn(`[Notice] Staff table upsert: ${staffError.message}`);
      } else {
        console.log(`Synchronized public.staff_members record.`);
      }
    } catch (e) {
      console.warn(`[Notice] Skipping staff upsert:`, e.message);
    }

    console.log(`\n------------------------------------------------------`);
    console.log(`ADMIN ACCOUNT READY TO USE:`);
    console.log(`  Email:    ${targetEmail}`);
    console.log(`  Password: ${targetPassword}`);
    console.log(`  Role:     admin`);
    console.log(`  Login at: http://localhost:3000/login`);
    console.log(`------------------------------------------------------\n`);
  } catch (err) {
    console.error('Unexpected error during admin provisioning:', err);
    process.exit(1);
  }
}

provisionAdmin();
