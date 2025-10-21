import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Settings, Calendar, Users, TrendingUp, Megaphone, BarChart3, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

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

  // Mock notifications for demo
  const mockNotifications: Notification[] = [
    {
      id: "1",
      type: "event_featured",
      title: "New event near you: Startup Meetup @ IIT Kanpur",
      description: "",
      isRead: false,
      createdAt: new Date(Date.now() - 600000), // 10 min ago
    },
    {
      id: "2",
      type: "group_invite",
      title: "Kanpur Gamers",
      description: "You have been invited to join 'Kanpur Gamers' group",
      isRead: false,
      createdAt: new Date(Date.now() - 1500000), // 25 min ago
    },
    {
      id: "3",
      type: "like",
      title: "@rahul_kanpur",
      description: "and 5 others liked your activity",
      relatedUserIds: ["user1", "user2", "user3"],
      isRead: false,
      createdAt: new Date(Date.now() - 3600000), // 1h ago
    },
    {
      id: "4",
      type: "comment_poll",
      title: "New comment on your poll: 'Which café is best?'",
      description: "",
      isRead: true,
      createdAt: new Date(Date.now() - 7200000), // 2h ago
    },
    {
      id: "5",
      type: "news_alert",
      title: "Local News Alert: Road closed near Moti Jheel",
      description: "",
      isRead: true,
      createdAt: new Date(Date.now() - 18000000), // 5h ago
    },
  ];

  const allNotifications = [...mockNotifications, ...notifications];

  const filteredNotifications = allNotifications.filter((notif) => {
    if (activeTab === "all") return true;
    if (activeTab === "activities") return notif.type === "activity" || notif.type === "like";
    if (activeTab === "events") return notif.type === "event" || notif.type === "event_featured";
    if (activeTab === "groups") return notif.type === "group" || notif.type === "group_invite";
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
      case "event_featured":
        return <Calendar className="w-6 h-6" />;
      case "group":
      case "group_invite":
        return <UserPlus className="w-6 h-6" />;
      case "activity":
        return <TrendingUp className="w-6 h-6" />;
      case "news_alert":
        return <Megaphone className="w-6 h-6" />;
      case "comment_poll":
        return <BarChart3 className="w-6 h-6" />;
      case "like":
        return null;
      default:
        return <TrendingUp className="w-6 h-6" />;
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    // Featured event notification with gradient background
    if (notification.type === "event_featured") {
      return (
        <div className="px-4 mb-4">
          <div
            className="relative rounded-2xl p-5 bg-gradient-primary overflow-hidden"
            data-testid={`notification-${notification.id}`}
          >
            <div className="flex items-start gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white flex-shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-white leading-snug">
                  {notification.title}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/70">{getTimeAgo(notification.createdAt)}</p>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white text-foreground hover:bg-white/90 h-9 px-5 rounded-full"
                data-testid={`button-view-event-${notification.id}`}
              >
                View Event
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Group invite notification
    if (notification.type === "group_invite") {
      return (
        <div className="flex items-start gap-4 px-4 py-3" data-testid={`notification-${notification.id}`}>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
            <UserPlus className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-snug">
              You have been invited to join{" "}
              <span className="font-semibold">'{notification.title}'</span> group
            </p>
            <p className="text-xs text-muted-foreground mt-1">{getTimeAgo(notification.createdAt)}</p>
          </div>
          <Button
            className="bg-gradient-primary text-white border-none h-9 px-6 flex-shrink-0 rounded-full"
            data-testid={`button-join-${notification.id}`}
          >
            Join
          </Button>
        </div>
      );
    }

    // Likes notification with avatars
    if (notification.type === "like") {
      return (
        <div className="flex items-start gap-4 px-4 py-3" data-testid={`notification-${notification.id}`}>
          <div className="flex -space-x-2 flex-shrink-0">
            {[1, 2, 3].map((i) => (
              <Avatar key={i} className="w-10 h-10 border-2 border-background">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`} />
                <AvatarFallback>U{i}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-snug">
              <span className="font-semibold">{notification.title}</span> {notification.description}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{getTimeAgo(notification.createdAt)}</p>
          </div>
          <button className="flex-shrink-0 text-muted-foreground">
            <span className="text-xl">›</span>
          </button>
        </div>
      );
    }

    // Comment/Poll notification
    if (notification.type === "comment_poll") {
      return (
        <div className="flex items-start gap-4 px-4 py-3" data-testid={`notification-${notification.id}`}>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-snug">
              {notification.title}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{getTimeAgo(notification.createdAt)}</p>
          </div>
        </div>
      );
    }

    // News alert notification
    if (notification.type === "news_alert") {
      return (
        <div className="flex items-start gap-4 px-4 py-3" data-testid={`notification-${notification.id}`}>
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 flex-shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground leading-snug">
              {notification.title}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{getTimeAgo(notification.createdAt)}</p>
          </div>
        </div>
      );
    }

    // Default notification
    return (
      <div className="flex items-start gap-4 px-4 py-3" data-testid={`notification-${notification.id}`}>
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-foreground flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-snug">
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{getTimeAgo(notification.createdAt)}</p>
        </div>
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
          <button onClick={() => setLocation("/settings")} data-testid="button-settings">
            <Settings className="w-6 h-6 text-foreground" />
          </button>
        </div>

        <div className="flex gap-2 px-4 pb-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
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
            <p className="text-xs font-bold text-muted-foreground px-4 py-3 uppercase tracking-wide">
              NEW TODAY
            </p>
            <div className="space-y-0">
              {todayNotifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </div>
          </div>
        )}

        {yesterdayNotifications.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground px-4 py-3 uppercase tracking-wide">
              YESTERDAY
            </p>
            <div className="space-y-0">
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
