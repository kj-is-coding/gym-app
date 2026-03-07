import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { GoalsForm } from "@/components/goals-form";
import { Button } from "@/components/ui/button";
import type { UserGoals } from "@/types";

export default async function GoalsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const { data: goalsRow } = await supabaseAdmin
    .from("user_goals")
    .select("data")
    .eq("user_id", user.id)
    .single();

  const backButton = (
    <Button asChild variant="ghost" size="sm" className="text-primary px-2 -ml-2">
      <a href="/app/more">‹ Back</a>
    </Button>
  );

  return (
    <>
      <AppHeader title="Goals" left={backButton} />
      <div className="px-4 py-4 lg:px-6 lg:py-6">
        <GoalsForm currentGoals={(goalsRow?.data as UserGoals) ?? null} />
      </div>
    </>
  );
}
