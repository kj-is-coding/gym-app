import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { FinishDayButton } from "@/components/finish-day-button";
import { AppHeader } from "@/components/app-header";
import { TodayViewDesktop } from "@/components/today-view-desktop";

function getTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

interface ChatPageProps {
  searchParams: Promise<{ message?: string }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const { message } = await searchParams;

  return (
    <>
      <AppHeader
        title={getTodayLabel()}
        right={<FinishDayButton />}
      />
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6 lg:px-6 lg:py-4 lg:h-[calc(100dvh-56px)] lg:overflow-hidden">
        {/* Chat on left */}
        <div className="lg:min-w-0">
          <Chat initialMessage={message} variant="desktop" />
        </div>
        {/* Today summary on right */}
        <div className="lg:min-w-0 lg:overflow-y-auto lg:pr-1">
          <TodayViewDesktop />
        </div>
      </div>
      {/* Mobile: full-width chat */}
      <div className="lg:hidden">
        <Chat initialMessage={message} variant="mobile" />
      </div>
    </>
  );
}
