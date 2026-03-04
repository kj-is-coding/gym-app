// Allowed emails for beta/invite-only access
// Add your friends' emails here
export const ALLOWED_EMAILS = new Set([
  "karlasgerjuhl@gmail.com",
]);

export function isEmailAllowed(email: string): boolean {
  return ALLOWED_EMAILS.has(email.toLowerCase());
}
