import { createClient } from "@/lib/auth";
import { claimGenericInvite } from "@/lib/invite-operations";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { token, email, name } = await request.json();

  if (!token || !email || !name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Claim the invite (whitelists email, creates user)
  const claimResult = await claimGenericInvite(token, email, name);

  if (!claimResult.success) {
    return NextResponse.json({ error: claimResult.error }, { status: 400 });
  }

  // Try to auto-authenticate the user
  if (claimResult.sessionToken) {
    // Create a Supabase client with cookie handling
    const supabase = await createClient();

    // Verify the OTP to create a session (this sets cookies automatically)
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: claimResult.sessionToken,
      type: "magiclink",
    });

    if (!verifyError && data.session) {
      // Session created successfully - redirect to app
      return NextResponse.json(
        { success: true, redirect: "/app/today" },
        { status: 200 }
      );
    }

    console.error("Failed to verify session token:", verifyError);
  }

  // Fallback: redirect to login with email pre-filled
  return NextResponse.json(
    {
      success: true,
      redirect: `/login?email=${encodeURIComponent(email.toLowerCase())}`,
    },
    { status: 200 }
  );
}
