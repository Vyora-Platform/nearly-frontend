import { Bell, Send } from "lucide-react";

interface TopBarProps {
  title?: string;
  showActions?: boolean;
}

export default function TopBar({ title = "Nearly", showActions = true }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="max-w-md mx-auto flex items-center justify-between h-14 px-4">
        <h1 className="text-xl font-bold text-gradient-primary">{title}</h1>
        {showActions && (
          <div className="flex items-center gap-3">
            <button
              className="hover-elevate active-elevate-2 p-2 -m-2"
              data-testid="button-notifications"
            >
              <Bell className="w-6 h-6 text-foreground" />
            </button>
            <button
              className="hover-elevate active-elevate-2 p-2 -m-2"
              data-testid="button-messages"
            >
              <Send className="w-6 h-6 text-foreground" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
