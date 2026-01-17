import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Calendar, Users, TrendingUp, Megaphone, BarChart3, UserPlus, Check, X, Heart, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Notification } from "@shared/schema";
import { api } from "@/lib/api";

// Component to fetch and display user data for a notification
function NotificationWithUser({ 
  notification, 
  onAccept, 
  onReject,
  acceptPending,
  rejectPending,
}: { 
  notification: Notification;
  onAccept?: (userId: string) => void;
  onReject?: (userId: string) => void;
  acceptPending?: boolean;
  rejectPending?: boolean;
}) {
  const [, setLocation] = useLocation();
  
  // Get the related user ID from the notification
  const relatedUserId = notification.relatedId || notification.relatedUserIds?.[0];
  
  // Fetch the actual user data from the API
  const { data: relatedUser } = useQuery({
    queryKey: ["user", relatedUserId],
    queryFn: () => api.getUser(relatedUserId || ""),
    enabled: !!relatedUserId,
  });

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
  };

  // Follow notification - show user who followed
  if (notification.type === "follow" || notification.type === "follow_accepted") {
    return (
      <button 
        className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-muted/50 transition-colors"
        onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        data-testid={`notification-${notification.id}`}
      >
        <Avatar className="w-12 h-12 flex-shrink-0">
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
            {relatedUser?.name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-snug">
            <span className="font-semibold">{relatedUser?.name || notification.title}</span>
            {" "}started following you.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            @{relatedUser?.username || 'user'} • {getTimeAgo(notification.createdAt)}
          </p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="flex-shrink-0 bg-gradient-primary text-white h-8 px-4"
          onClick={(e) => {
            e.stopPropagation();
            relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
          }}
        >
          View
        </Button>
      </button>
    );
  }

  // Follow request notification - show accept/reject buttons
  if (notification.type === "follow_request") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
            {relatedUser?.name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <p className="text-sm text-foreground leading-snug">
            <span className="font-semibold hover:underline">{relatedUser?.name || notification.title}</span>
            {" "}requested to follow you.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            @{relatedUser?.username || 'user'} • {getTimeAgo(notification.createdAt)}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            size="sm"
            className="bg-gradient-primary text-white h-8 px-4"
            onClick={(e) => {
              e.stopPropagation();
              relatedUserId && onAccept?.(relatedUserId);
            }}
            disabled={acceptPending}
          >
            Confirm
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-4"
            onClick={(e) => {
              e.stopPropagation();
              relatedUserId && onReject?.(relatedUserId);
            }}
            disabled={rejectPending}
          >
            Delete
          </Button>
        </div>
      </div>
    );
  }

  // Like notification - clickable user profile and post
  if (notification.type === "like") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-red-500/10 text-red-500">
            <Heart className="w-5 h-5 fill-red-500" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-snug">
            <span
              className="font-semibold cursor-pointer hover:underline"
              onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
            >
              {relatedUser?.name || notification.title}
            </span>
            {" "}{notification.description}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="flex-shrink-0 bg-gradient-primary text-white h-8 px-4"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          View
        </Button>
      </div>
    );
  }

  // Comment notification - clickable user profile and post
  if (notification.type === "comment") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-blue-500/10 text-blue-500">
            <MessageCircle className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => notification.actionUrl && setLocation(notification.actionUrl)}
        >
          <p className="text-sm text-foreground leading-snug">
            <span
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
              }}
            >
              {relatedUser?.name || notification.title}
            </span>
            {" "}{notification.description}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="flex-shrink-0 bg-gradient-primary text-white h-8 px-4"
          onClick={(e) => {
            e.stopPropagation();
            relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
          }}
        >
          View
        </Button>
      </div>
    );
  }

  // Event notification (join, etc.)
  if (notification.type === "event" || notification.type === "event_featured") {
    return (
      <button 
        className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-muted/50 transition-colors"
        onClick={() => notification.actionUrl && setLocation(notification.actionUrl)}
        data-testid={`notification-${notification.id}`}
      >
        <Avatar className="w-12 h-12 flex-shrink-0">
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-purple-500/10 text-purple-500">
            <Calendar className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-snug">
            <span className="font-semibold">{relatedUser?.name || notification.title}</span>
            {" "}{notification.description}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
      </button>
    );
  }

  // Activity notification - clickable
  if (notification.type === "activity") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-green-500/10 text-green-500">
            <TrendingUp className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => notification.actionUrl && setLocation(notification.actionUrl)}
        >
          <p className="text-sm text-foreground leading-snug">
            <span 
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
              }}
            >
              {relatedUser?.name || notification.title}
            </span>
            {" "}{notification.description}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        {notification.actionUrl && (
          <button
            onClick={() => setLocation(notification.actionUrl!)}
            className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            View
          </button>
        )}
      </div>
    );
  }

  // News like notification - "Username liked your news"
  if (notification.type === "news_like") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-red-500/10 text-red-500">
            <Heart className="w-5 h-5 fill-red-500" />
          </AvatarFallback>
        </Avatar>
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => notification.entityId && setLocation(`/news/${notification.entityId}`)}
        >
          <p className="text-sm text-foreground leading-snug">
            <span 
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
              }}
            >
              {relatedUser?.name || 'Someone'}
            </span>
            {" "}liked your news
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="flex-shrink-0 bg-gradient-primary text-white h-8 px-4"
          onClick={() => notification.entityId && setLocation(`/news/${notification.entityId}`)}
        >
          View
        </Button>
      </div>
    );
  }

  // News comment notification - "Username commented on your news"
  if (notification.type === "news_comment") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-blue-500/10 text-blue-500">
            <MessageCircle className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => notification.entityId && setLocation(`/news/${notification.entityId}`)}
        >
          <p className="text-sm text-foreground leading-snug">
            <span 
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
              }}
            >
              {relatedUser?.name || 'Someone'}
            </span>
            {" "}commented on your news{notification.description ? `: "${notification.description.substring(0, 40)}${notification.description.length > 40 ? '...' : ''}"` : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="flex-shrink-0 bg-gradient-primary text-white h-8 px-4"
          onClick={() => notification.entityId && setLocation(`/news/${notification.entityId}`)}
        >
          View
        </Button>
      </div>
    );
  }

  // Moment like notification - "Username liked your moment"
  if (notification.type === "moment_like") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-red-500/10 text-red-500">
            <Heart className="w-5 h-5 fill-red-500" />
          </AvatarFallback>
        </Avatar>
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setLocation('/moments')}
        >
          <p className="text-sm text-foreground leading-snug">
            <span 
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
              }}
            >
              {relatedUser?.name || 'Someone'}
            </span>
            {" "}liked your moment
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        <button
          onClick={() => setLocation('/moments')}
          className="w-11 h-11 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <Heart className="w-5 h-5 text-red-500" />
        </button>
      </div>
    );
  }

  // Moment comment notification - "Username commented on your moment"
  if (notification.type === "moment_comment") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-blue-500/10 text-blue-500">
            <MessageCircle className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setLocation('/moments')}
        >
          <p className="text-sm text-foreground leading-snug">
            <span 
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
              }}
            >
              {relatedUser?.name || 'Someone'}
            </span>
            {" "}commented on your moment{notification.description ? `: "${notification.description.substring(0, 40)}${notification.description.length > 40 ? '...' : ''}"` : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        <button
          onClick={() => setLocation('/moments')}
          className="w-11 h-11 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <MessageCircle className="w-5 h-5 text-blue-500" />
        </button>
      </div>
    );
  }

  // Moment notification (generic - for backwards compatibility)
  if (notification.type === "moment") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-gradient-to-br from-pink-500 to-orange-500 text-white">
            {relatedUser?.name?.[0] || '📸'}
          </AvatarFallback>
        </Avatar>
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => notification.actionUrl && setLocation(notification.actionUrl)}
        >
          <p className="text-sm text-foreground leading-snug">
            <span 
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
              }}
            >
              {relatedUser?.name || notification.title}
            </span>
            {" "}{notification.description}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        <button
          onClick={() => setLocation('/moments')}
          className="w-11 h-11 rounded-lg bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <span className="text-lg">📸</span>
        </button>
      </div>
    );
  }

  // Group notification
  if (notification.type === "group" || notification.type === "group_invite") {
    return (
      <button 
        className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-muted/50 transition-colors"
        onClick={() => notification.actionUrl && setLocation(notification.actionUrl)}
        data-testid={`notification-${notification.id}`}
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-snug">
            {notification.title}
          </p>
          {notification.description && (
            <p className="text-sm text-muted-foreground">{notification.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        {notification.type === "group_invite" && (
          <Button size="sm" className="flex-shrink-0 bg-gradient-primary text-white h-8">
            Join
          </Button>
        )}
      </button>
    );
  }

  // Comment reply notification - "Username replied to your comment"
  if (notification.type === "comment_reply") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-cyan-500/10 text-cyan-500">
            <MessageCircle className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => notification.actionUrl && setLocation(notification.actionUrl)}
        >
          <p className="text-sm text-foreground leading-snug">
            <span
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
              }}
            >
              {relatedUser?.name || 'Someone'}
            </span>
            {" "}replied to your comment{notification.description ? `: "${notification.description.substring(0, 50)}${notification.description.length > 50 ? '...' : ''}"` : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="flex-shrink-0 bg-gradient-primary text-white h-8 px-4"
          onClick={(e) => {
            e.stopPropagation();
            notification.actionUrl && setLocation(notification.actionUrl);
          }}
        >
          View
        </Button>
      </div>
    );
  }

  // Poll comment notification
  if (notification.type === "poll_comment") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-blue-500/10 text-blue-500">
            <MessageCircle className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => notification.actionUrl && setLocation(notification.actionUrl)}
        >
          <p className="text-sm text-foreground leading-snug">
            <span
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
              }}
            >
              {relatedUser?.name || 'Someone'}
            </span>
            {" "}commented on your poll{notification.description ? `: "${notification.description.substring(0, 40)}..."` : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="flex-shrink-0 bg-gradient-primary text-white h-8 px-4"
          onClick={(e) => {
            e.stopPropagation();
            notification.actionUrl && setLocation(notification.actionUrl);
          }}
        >
          View
        </Button>
      </div>
    );
  }

  // Event comment notification
  if (notification.type === "event_comment") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-blue-500/10 text-blue-500">
            <MessageCircle className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => notification.actionUrl && setLocation(notification.actionUrl)}
        >
          <p className="text-sm text-foreground leading-snug">
            <span
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
              }}
            >
              {relatedUser?.name || 'Someone'}
            </span>
            {" "}commented on your event{notification.description ? `: "${notification.description.substring(0, 40)}..."` : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="flex-shrink-0 bg-gradient-primary text-white h-8 px-4"
          onClick={(e) => {
            e.stopPropagation();
            notification.actionUrl && setLocation(notification.actionUrl);
          }}
        >
          View
        </Button>
      </div>
    );
  }

  // Activity comment notification
  if (notification.type === "activity_comment") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-blue-500/10 text-blue-500">
            <MessageCircle className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => notification.actionUrl && setLocation(notification.actionUrl)}
        >
          <p className="text-sm text-foreground leading-snug">
            <span
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
              }}
            >
              {relatedUser?.name || 'Someone'}
            </span>
            {" "}commented on your activity{notification.description ? `: "${notification.description.substring(0, 40)}..."` : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="flex-shrink-0 bg-gradient-primary text-white h-8 px-4"
          onClick={(e) => {
            e.stopPropagation();
            notification.actionUrl && setLocation(notification.actionUrl);
          }}
        >
          View
        </Button>
      </div>
    );
  }

  // Post comment notification
  if (notification.type === "post_comment") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-blue-500/10 text-blue-500">
            <MessageCircle className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => notification.actionUrl && setLocation(notification.actionUrl)}
        >
          <p className="text-sm text-foreground leading-snug">
            <span
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
              }}
            >
              {relatedUser?.name || 'Someone'}
            </span>
            {" "}commented on your post{notification.description ? `: "${notification.description.substring(0, 40)}..."` : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="flex-shrink-0 bg-gradient-primary text-white h-8 px-4"
          onClick={(e) => {
            e.stopPropagation();
            notification.actionUrl && setLocation(notification.actionUrl);
          }}
        >
          View
        </Button>
      </div>
    );
  }

  // Discussion comment notification
  if (notification.type === "discussion_comment") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-blue-500/10 text-blue-500">
            <MessageCircle className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => notification.actionUrl && setLocation(notification.actionUrl)}
        >
          <p className="text-sm text-foreground leading-snug">
            <span
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
              }}
            >
              {relatedUser?.name || 'Someone'}
            </span>
            {" "}commented on your discussion{notification.description ? `: "${notification.description.substring(0, 40)}..."` : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="flex-shrink-0 bg-gradient-primary text-white h-8 px-4"
          onClick={(e) => {
            e.stopPropagation();
            notification.actionUrl && setLocation(notification.actionUrl);
          }}
        >
          View
        </Button>
      </div>
    );
  }

  // Shot like notification
  if (notification.type === "shot_like") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-red-500/10 text-red-500">
            <Heart className="w-5 h-5 fill-red-500" />
          </AvatarFallback>
        </Avatar>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setLocation('/shots')}
        >
          <p className="text-sm text-foreground leading-snug">
            <span
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
              }}
            >
              {relatedUser?.name || 'Someone'}
            </span>
            {" "}liked your shot
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="flex-shrink-0 bg-gradient-primary text-white h-8 px-4"
          onClick={(e) => {
            e.stopPropagation();
            setLocation('/shots');
          }}
        >
          View
        </Button>
      </div>
    );
  }

  // Shot comment notification
  if (notification.type === "shot_comment") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-blue-500/10 text-blue-500">
            <MessageCircle className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setLocation('/shots')}
        >
          <p className="text-sm text-foreground leading-snug">
            <span
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
              }}
            >
              {relatedUser?.name || 'Someone'}
            </span>
            {" "}commented on your shot{notification.description ? `: "${notification.description.substring(0, 40)}..."` : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="flex-shrink-0 bg-gradient-primary text-white h-8 px-4"
          onClick={(e) => {
            e.stopPropagation();
            setLocation('/shots');
          }}
        >
          View
        </Button>
      </div>
    );
  }

  // Shot share notification
  if (notification.type === "shot_share") {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        data-testid={`notification-${notification.id}`}
      >
        <Avatar 
          className="w-12 h-12 flex-shrink-0 cursor-pointer"
          onClick={() => relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`)}
        >
          <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId}`} />
          <AvatarFallback className="bg-green-500/10 text-green-500">
            <Users className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setLocation('/shots')}
        >
          <p className="text-sm text-foreground leading-snug">
            <span
              className="font-semibold hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                relatedUserId && setLocation(`/profile/${relatedUser?.username || relatedUserId}`);
              }}
            >
              {relatedUser?.name || 'Someone'}
            </span>
            {" "}shared your shot
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="flex-shrink-0 bg-gradient-primary text-white h-8 px-4"
          onClick={(e) => {
            e.stopPropagation();
            setLocation('/shots');
          }}
        >
          View
        </Button>
      </div>
    );
  }

  // Default notification
  return (
    <button 
      className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-muted/50 transition-colors"
      onClick={() => notification.actionUrl && setLocation(notification.actionUrl)}
      data-testid={`notification-${notification.id}`}
    >
      <Avatar className="w-12 h-12 flex-shrink-0">
        <AvatarImage src={relatedUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${relatedUserId || notification.id}`} />
        <AvatarFallback className="bg-muted">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">
          <span className="font-semibold">{relatedUser?.name || notification.title}</span>
          {notification.description && ` ${notification.description}`}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{getTimeAgo(notification.createdAt)}</p>
      </div>
    </button>
  );
}

export default function Notifications() {
  const [, setLocation] = useLocation();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notifications = [], isLoading, refetch } = useQuery<Notification[]>({
    queryKey: ["notifications", currentUserId],
    queryFn: () => api.getNotifications(currentUserId),
    enabled: !!currentUserId,
    staleTime: 0, // Always consider data stale for fresh data
    refetchInterval: 10000, // Refresh every 10 seconds for more realtime updates
    refetchOnWindowFocus: true, // Refetch when user comes back to tab
  });

  // Auto-refresh notifications when page is visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUserId) {
        refetch();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentUserId, refetch]);

  // Accept follow request mutation
  const acceptMutation = useMutation({
    mutationFn: (requesterId: string) => api.acceptFollowRequest(currentUserId, requesterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", currentUserId] });
      queryClient.invalidateQueries({ queryKey: ["followers", currentUserId] });
      toast({ title: "Follow request accepted" });
    },
    onError: () => {
      toast({ title: "Failed to accept request", variant: "destructive" });
    },
  });

  // Reject follow request mutation
  const rejectMutation = useMutation({
    mutationFn: (requesterId: string) => api.rejectFollowRequest(currentUserId, requesterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", currentUserId] });
      toast({ title: "Follow request declined" });
    },
    onError: () => {
      toast({ title: "Failed to decline request", variant: "destructive" });
    },
  });


  // Group notifications by time
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const todayNotifications = notifications.filter((notif) => {
    return new Date(notif.createdAt) >= today;
  });

  const yesterdayNotifications = notifications.filter((notif) => {
    const date = new Date(notif.createdAt);
    return date >= yesterday && date < today;
  });

  const thisWeekNotifications = notifications.filter((notif) => {
    const date = new Date(notif.createdAt);
    return date >= thisWeek && date < yesterday;
  });

  const olderNotifications = notifications.filter((notif) => {
    return new Date(notif.createdAt) < thisWeek;
  });


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Notifications</h1>
          <div className="w-6" /> {/* Spacer for alignment */}
        </div>

      </div>

      <div className="pb-20">
        {todayNotifications.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide bg-muted/30">
              Today
            </p>
            <div className="divide-y divide-border/50">
              {todayNotifications.map((notification) => (
                <NotificationWithUser 
                  key={notification.id} 
                  notification={notification}
                  onAccept={(userId) => acceptMutation.mutate(userId)}
                  onReject={(userId) => rejectMutation.mutate(userId)}
                  acceptPending={acceptMutation.isPending}
                  rejectPending={rejectMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {yesterdayNotifications.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide bg-muted/30">
              Yesterday
            </p>
            <div className="divide-y divide-border/50">
              {yesterdayNotifications.map((notification) => (
                <NotificationWithUser 
                  key={notification.id} 
                  notification={notification}
                  onAccept={(userId) => acceptMutation.mutate(userId)}
                  onReject={(userId) => rejectMutation.mutate(userId)}
                  acceptPending={acceptMutation.isPending}
                  rejectPending={rejectMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {thisWeekNotifications.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide bg-muted/30">
              This Week
            </p>
            <div className="divide-y divide-border/50">
              {thisWeekNotifications.map((notification) => (
                <NotificationWithUser 
                  key={notification.id} 
                  notification={notification}
                  onAccept={(userId) => acceptMutation.mutate(userId)}
                  onReject={(userId) => rejectMutation.mutate(userId)}
                  acceptPending={acceptMutation.isPending}
                  rejectPending={rejectMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {olderNotifications.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide bg-muted/30">
              Earlier
            </p>
            <div className="divide-y divide-border/50">
              {olderNotifications.map((notification) => (
                <NotificationWithUser 
                  key={notification.id} 
                  notification={notification}
                  onAccept={(userId) => acceptMutation.mutate(userId)}
                  onReject={(userId) => rejectMutation.mutate(userId)}
                  acceptPending={acceptMutation.isPending}
                  rejectPending={rejectMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-1">No notifications yet</p>
            <p className="text-sm text-muted-foreground">When you get notifications, they'll show up here</p>
          </div>
        )}
      </div>
    </div>
  );
}
