import { House, Send, Camera, Compass, Clapperboard } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function BottomNav() {
  const [location] = useLocation();

  const tabs = [
    { path: "/", icon: House, label: "Home" },
    { path: "/shots", icon: Clapperboard, label: "Shots" },
    { path: "/moments", icon: Camera, label: "Moments" },
    { path: "/chat", icon: Send, label: "Chat" },
    { path: "/discover", icon: Compass, label: "Discover" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/50 z-50 safe-area-bottom">
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2 pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location === tab.path;
          return (
            <Link key={tab.path} href={tab.path}>
              <button
                data-testid={`nav-${tab.label.toLowerCase()}`}
                className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px]"
              >
                <Icon
                  className={`w-6 h-6 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                  fill={isActive ? "currentColor" : "none"}
                />
                <span
                  className={`text-xs font-semibold ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
