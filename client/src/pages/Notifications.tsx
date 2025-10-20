import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Settings, Calendar, Users, TrendingUp, Megaphone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  type: string;
  title: string;
  description: string;
  actionUrl?: string | null;
  relatedUserIds?: string[] | null;
  isRead: boolean;
  createdAt: Date;
}

export default function Notifications() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  const currentUserId = "current-user-id";

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", currentUserId],
  });

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === "all") return true;
    if (activeTab === "activities") return notif.type === "activity";
    if (activeTab === "events") return notif.type === "event";
    if (activeTab === "groups") return notif.type === "group";
    return true;
  });

  const todayNotifications = filteredNotifications.filter((notif) => {
    const createdDate = new Date(notif.createdAt);
    const today = new Date();
    return createdDate.toDateString() === today.toDateString();
  });

  const yesterdayNotifications = filteredNotifications.filter((notif) => {
    const createdDate = new Date(notif.createdAt);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return createdDate.toDateString() === yesterday.toDateString();
  });

  const tabs = [
    { id: "all", label: "All" },
    { id: "activities", label: "Activities" },
    { id: "events", label: "Events" },
    { id: "groups", label: "Groups" },
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "event":
        return <Calendar className="w-6 h-6" />;
      case "group":
        return <Users className="w-6 h-6" />;
      case "activity":
        return <TrendingUp className="w-6 h-6" />;
      case "news":
        return <Megaphone className="w-6 h-6" />;
      default:
        return <TrendingUp className="w-6 h-6" />;
    }
  };

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const isEventOrFeatured = notification.type === "event" || notification.title.includes("New event");

    if (isEventOrFeatured) {
      return (
        <div
          className="relative rounded-2xl p-4 bg-gradient-primary overflow-hidden"
          data-testid={`notification-${notification.id}`}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white flex-shrink-0">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white mb-1">
                {notification.title}
              </p>
              <p className="text-xs text-white/90">
                {notification.description}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/70">10 min ago</p>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white text-foreground hover:bg-white/90 h-8"
              data-testid={`button-action-${notification.id}`}
            >
              View Event
            </Button>
          </div>
        </div>
      );
    }

    if (notification.type === "group") {
      return (
        <div className="flex items-start gap-3 p-4" data-testid={`notification-${notification.id}`}>
          <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center text-white flex-shrink-0">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground mb-1">
              You have been invited to join{" "}
              <span className="font-semibold">'{notification.title}'</span> group
            </p>
            <p className="text-xs text-muted-foreground mb-3">25 min ago</p>
            <Button
              className="bg-gradient-primary text-white border-none h-8 px-6"
              data-testid={`button-join-${notification.id}`}
            >
              Join
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-start gap-3 p-4" data-testid={`notification-${notification.id}`}>
        <div className="flex -space-x-2 flex-shrink-0">
          {notification.relatedUserIds?.slice(0, 3).map((userId, index) => (
            <Avatar key={userId} className="w-10 h-10 border-2 border-background">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`} />
              <AvatarFallback>{userId.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{notification.title}</span> and{" "}
            {notification.relatedUserIds?.length || 5} others liked your activity
          </p>
          <p className="text-xs text-muted-foreground">1h ago</p>
        </div>
        <button className="flex-shrink-0">
          <span className="text-muted-foreground">›</span>
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Notifications</h1>
          <button data-testid="button-settings">
            <Settings className="w-6 h-6 text-foreground" />
          </button>
        </div>

        <div className="flex gap-2 px-4 pb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-gradient-primary text-white"
                  : "bg-muted text-muted-foreground"
              }`}
              data-testid={`tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pb-20">
        {todayNotifications.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground px-4 py-3 uppercase">
              New Today
            </p>
            <div className="space-y-1">
              {todayNotifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </div>
          </div>
        )}

        {yesterdayNotifications.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground px-4 py-3 uppercase">
              Yesterday
            </p>
            <div className="space-y-1">
              {yesterdayNotifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </div>
          </div>
        )}

        {filteredNotifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
