import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SignOutForm } from "@/components/sign-out-form";

export default async function MorePage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <AppHeader title="More" />
      <div className="px-4 py-4 space-y-3">
        {/* Goals + History in one card */}
        <Card className="overflow-hidden p-0 gap-0">
          <a
            href="/app/goals"
            className="flex items-center justify-between px-4 py-4 no-underline hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <div>
                <div className="text-[15px] font-semibold text-foreground">Goals</div>
                <div className="text-[13px] text-muted-foreground">Calorie &amp; macro targets</div>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted-foreground">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </a>

          <Separator />

          <a
            href="/app/history"
            className="flex items-center justify-between px-4 py-4 no-underline hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cal)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <div>
                <div className="text-[15px] font-semibold text-foreground">History</div>
                <div className="text-[13px] text-muted-foreground">View past day logs</div>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted-foreground">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </a>
        </Card>

        {/* Sign out */}
        <Card className="overflow-hidden p-0 gap-0">
          <SignOutForm />
        </Card>

        {/* Footer */}
        <p className="text-center pt-2 text-xs text-muted-foreground">{user.email}</p>
      </div>
    </>
  );
}
