import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { HistoryView } from "@/components/history-view";
import { Button } from "@/components/ui/button";

export default async function HistoryPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const backButton = (
    <Button asChild variant="ghost" size="sm" className="text-primary px-2 -ml-2">
      <a href="/app/more">‹ Back</a>
    </Button>
  );

  return (
    <>
      <AppHeader title="History" left={backButton} />
      <div className="px-4 py-4 lg:px-6 lg:py-6">
        <HistoryView />
      </div>
    </>
  );
}
