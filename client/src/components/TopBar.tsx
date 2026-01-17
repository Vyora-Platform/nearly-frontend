import { Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface TopBarProps {
  title?: string;
  showActions?: boolean;
  showProfile?: boolean;
}

export default function TopBar({ title = "Nearly", showActions = true, showProfile = true }: TopBarProps) {
  const userId = localStorage.getItem('nearly_user_id');
  const { data: currentUser } = useQuery({
    queryKey: ["current-user", userId],
    queryFn: () => api.getCurrentUser(),
    enabled: !!userId,
  });

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="max-w-md mx-auto flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          {showProfile && (
            <Link href="/profile">
              <button className="hover-elevate active-elevate-2 rounded-full" data-testid="button-profile">
                <Avatar className="w-8 h-8 ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                  <AvatarImage 
                    src={currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username || 'user'}`} 
                  />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {currentUser?.name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </Link>
          )}
          <h1 className="text-xl font-bold text-gradient-primary">{title}</h1>
        </div>
        {showActions && (
          <div className="flex items-center gap-3">
            <Link href="/notifications">
              <button
                className="hover-elevate active-elevate-2 p-2 -m-2"
                data-testid="button-notifications"
              >
                <Heart className="w-6 h-6 text-foreground" />
              </button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
