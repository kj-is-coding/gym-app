interface AppHeaderProps {
  title: string;
  right?: React.ReactNode;
  left?: React.ReactNode;
}

export function AppHeader({ title, right, left }: AppHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-card/80 border-b border-border"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {left}
        <h1 className="font-semibold text-[17px] text-foreground truncate">
          {title}
        </h1>
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </header>
  );
}
