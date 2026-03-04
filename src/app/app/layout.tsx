import { BottomTabBar } from "@/components/bottom-tab-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="max-w-lg mx-auto mb-bottom-nav">
        {children}
      </div>
      <BottomTabBar />
    </div>
  );
}
