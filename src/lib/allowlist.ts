// DEPRECATED: This file is kept for reference only.
// Email whitelisting is now handled by the invite system in invite-operations.ts
// The invited_users table in Supabase is the source of truth.
//
// To invite users:
//   - Generic invite (shareable link):
//     node scripts/invite-user.mjs --generic
//
//   - Specific user:
//     node scripts/invite-user.mjs user@example.com "John Doe"
//
// Migration:
//   Run the SQL in .agent/workspace/invite-migration.sql to set up the database.

// Allowed emails for beta/invite-only access
// Add your friends' emails here
export const ALLOWED_EMAILS = new Set([
  "karlasgerjuhl@gmail.com",
]);

export function isEmailAllowed(email: string): boolean {
  return ALLOWED_EMAILS.has(email.toLowerCase());
}
