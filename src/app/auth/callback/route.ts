import { createClient } from "@/lib/auth";
import { markInviteAccepted } from "@/lib/invite-operations";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token = searchParams.get("token");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/app/today";

  const supabase = await createClient();
  let error = null;

  if (code) {
    // OAuth flow
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (token && type === "magiclink") {
    // Magic link flow - verify the token and create session
    const result = await supabase.auth.verifyOtp({
      token_hash: token,
      type: "magiclink",
    });
    error = result.error;
  }

  if (!error) {
    // Mark invite as accepted if this user was invited
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      await markInviteAccepted(user.email);
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  console.error('[AUTH CALLBACK] Error:', error?.message);
  // Return user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
