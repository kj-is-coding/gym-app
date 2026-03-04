import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat";
import { FinishDayButton } from "@/components/finish-day-button";
import { AppHeader } from "@/components/app-header";

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
      <Chat initialMessage={message} />
    </>
  );
}
