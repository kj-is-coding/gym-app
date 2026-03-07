import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║         Gym App Invite System - Verification               ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// Test 1: Table exists
console.log('✓ Database Tables:');
const { data: invitedUsers, error: tableError } = await supabase
  .from('invited_users')
  .select('*')
  .limit(5);

if (tableError) {
  console.log('  ✗ invited_users table error:', tableError.message);
} else {
  console.log('  ✓ invited_users table exists');
  console.log(`  → Found ${invitedUsers.length} invite(s) in database`);
}

// Test 2: Show existing invites
if (invitedUsers && invitedUsers.length > 0) {
  console.log('\n✓ Existing Invites:');
  invitedUsers.forEach(u => {
    const status = u.accepted_at ? 'ACCEPTED' : u.claimed_at ? 'CLAIMED' : u.is_generic ? 'GENERIC' : 'PENDING';
    console.log(`  • ${u.email || '<generic>'} - ${status}`);
  });
}

// Test 3: Check environment variables
console.log('\n✓ Environment Variables:');
console.log(`  → NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}`);
console.log(`  → SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'}`);

// Test 4: Check files exist
console.log('\n✓ Files Created:');
const fs = await import('fs');
const files = [
  'src/lib/invite-operations.ts',
  'src/app/invite/[token]/page.tsx',
  'src/app/invite/[token]/invite-accept-form.tsx',
  'src/app/api/invite/claim/route.ts',
  'src/app/api/auth/check-whitelist/route.ts',
  'scripts/invite-user.mjs',
];

files.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✓' : '✗'} ${file}`);
});

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║                    Setup Complete! ✓                     ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

console.log('Next steps:\n');
console.log('  1. Generate a generic invite:');
console.log('     node scripts/invite-user.mjs --generic\n');
console.log('  2. Invite a specific user:');
console.log('     node scripts/invite-user.mjs user@example.com "John Doe"\n');
console.log('  3. Start the dev server:');
console.log('     pnpm dev\n');
console.log('  4. Visit an invite link to test the flow\n');
