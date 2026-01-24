import { useLocation } from "wouter";
import { ArrowLeft, Smartphone, Monitor, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LoginSession {
  id: string;
  device: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
  createdAt: string;
}

export default function LoginActivity() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';

  // Fetch login sessions from API
  const { data: loginSessions = [], isLoading, error } = useQuery<LoginSession[]>({
    queryKey: ["login-sessions", currentUserId],
    queryFn: async () => {
      try {
        const response = await authFetch(`/api/auth/sessions`);
        if (!response.ok) {
          // If endpoint doesn't exist yet, return empty array
          return [];
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: !!currentUserId,
  });

  // Logout session mutation
  const logoutSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await authFetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to logout session');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["login-sessions"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to log out device", variant: "destructive" });
    },
  });

  const getDeviceIcon = (deviceType: string) => {
    if (deviceType === 'mobile' || deviceType === 'tablet') {
      return Smartphone;
    }
    return Monitor;
  };

  const formatLastActive = (lastActive: string): string => {
    if (!lastActive) return 'Unknown';

    const date = new Date(lastActive);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 5) return 'Active now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => setLocation("/profile-settings")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Login Activity</h1>
        </div>
      </div>

      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-6">
          See all the devices and locations where your account is currently logged in.
          You can log out of devices you don't recognize.
        </p>

        {loginSessions.length === 0 ? (
          <div className="text-center py-12">
            <Monitor className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active sessions found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Your login activity will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {loginSessions.map((session) => {
              const IconComponent = getDeviceIcon(session.deviceType);
              return (
                <div
                  key={session.id}
                  className="bg-card rounded-lg p-4 border border-border"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-5 h-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {session.device}
                        </p>
                        {session.isCurrent && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Current
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <MapPin className="w-3 h-3" />
                        <span>{session.location || 'Unknown location'}</span>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        IP: {session.ip || 'Unknown'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-2">
                        {formatLastActive(session.lastActive)}
                      </p>
                      {!session.isCurrent && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          disabled={logoutSessionMutation.isPending}
                          onClick={() => logoutSessionMutation.mutate(session.id)}
                        >
                          Log Out
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="text-sm font-medium text-foreground mb-2">
            Security Recommendations
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Regularly review your login activity</li>
            <li>• Log out of devices you don't recognize</li>
            <li>• Use a strong, unique password</li>
            <li>• Enable two-factor authentication when available</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
