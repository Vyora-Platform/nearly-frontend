import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Calendar, BadgeCheck, Heart, Bookmark, MessageCircle, Send, Reply, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useRef } from "react";
import { queryClient, authFetch } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { notificationApi } from "@/lib/gateway-api";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface EventGuest {
  id: string;
  eventId: string;
  userId: string;
  status: string;
  userName?: string;
  userAvatar?: string;
}

interface EventComment {
  id: string;
  eventId: string;
  userId: string;
  content: string;
  createdAt: Date;
  userName?: string;
  userAvatar?: string;
  parentCommentId?: string;
  likesCount?: number;
  replies?: EventComment[];
}

export default function EventDetails() {
  const [, params] = useRoute("/event/:id");
  const [, setLocation] = useLocation();
  const eventId = params?.id;
  const [comment, setComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';

  const { data: event, isLoading } = useQuery<any>({
    queryKey: ["event", eventId],
    queryFn: () => api.getEvent(eventId || ''),
    enabled: !!eventId,
  });

  // Fetch the event host user
  const { data: hostUser } = useQuery({
    queryKey: ["user", event?.userId],
    queryFn: () => api.getUser(event?.userId || ''),
    enabled: !!event?.userId,
  });

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user", currentUserId],
    queryFn: () => api.getCurrentUser(),
    enabled: !!currentUserId,
  });

  const { data: guests = [] } = useQuery<EventGuest[]>({
    queryKey: ["event-guests", eventId],
    queryFn: () => api.getEventGuests(eventId || ''),
    enabled: !!eventId,
  });

  const { data: rawComments = [] } = useQuery<EventComment[]>({
    queryKey: ["event-comments", eventId],
    queryFn: () => api.getEventComments(eventId || ''),
    enabled: !!eventId,
  });

  // Get all unique user IDs from comments (including replies)
  const userIds = Array.from(new Set(
    rawComments.map((c: any) => c.userId)
  )).filter(Boolean) as string[];

  // Fetch ALL users for comments upfront
  const { data: users = [] } = useQuery({
    queryKey: ['event-comment-users', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      // Fetch all users in parallel
      const promises = userIds.map(id => api.getUser(id).catch(() => null));
      const results = await Promise.all(promises);
      return results.filter(Boolean);
    },
    enabled: userIds.length > 0,
  });

  const usersMap = new Map(users.map((u: any) => [u.id, u]));

  // Organize comments into threads with user data
  const organizedComments = (() => {
    const parentComments: EventComment[] = [];
    const repliesMap: Record<string, EventComment[]> = {};

    rawComments.forEach((c: any) => {
      const user = usersMap.get(c.userId);
      // Use real username from API, priority: name > username
      const comment: EventComment = {
        ...c,
        userName: user?.name || user?.username || c.userName || 'User',
        userAvatar: user?.avatarUrl || c.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.userId}`,
        replies: [],
      };

      if (c.parentCommentId) {
        if (!repliesMap[c.parentCommentId]) {
          repliesMap[c.parentCommentId] = [];
        }
        repliesMap[c.parentCommentId].push(comment);
      } else {
        parentComments.push(comment);
      }
    });

    parentComments.forEach(parent => {
      parent.replies = repliesMap[parent.id] || [];
      // Sort replies by date
      parent.replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    return parentComments;
  })();

  const joinMutation = useMutation({
    mutationFn: () => api.joinEvent(eventId || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-guests", eventId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to join event", variant: "destructive" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ content, parentCommentId }: { content: string; parentCommentId?: string }) => {
      const result = await authFetch(`/api/events/${eventId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, userId: currentUserId, parentCommentId }),
      }).then(res => res.json());

      // Send notification to event host (if not commenting on own event)
      if (event?.userId && event.userId !== currentUserId) {
        try {
          await notificationApi.createNotification({
            userId: event.userId,
            type: parentCommentId ? 'comment_reply' : 'event_comment',
            title: parentCommentId ? 'New Reply' : 'New Comment',
            description: content.substring(0, 100),
            relatedId: currentUserId,
            entityId: eventId || '',
            actionUrl: `/event/${eventId}`,
          });
        } catch (err) {
          console.error('Failed to send notification:', err);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-comments", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      setComment("");
      setReplyingTo(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to post comment", variant: "destructive" });
    },
  });

  const handleReply = (commentId: string, userName: string) => {
    setReplyingTo({ id: commentId, userName });
    setComment(`@${userName} `);
    setTimeout(() => {
      const input = commentInputRef.current;
      if (input) {
        input.focus();
        // Set cursor at the end of the text
        const length = input.value.length;
        input.setSelectionRange(length, length);
      }
    }, 100);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setComment("");
  };

  const handleSubmitComment = () => {
    if (!comment.trim()) return;
    commentMutation.mutate({
      content: comment,
      parentCommentId: replyingTo?.id,
    });
  };

  const getTimeAgo = (date: Date | string) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Like mutation for events
  const likeMutation = useMutation({
    mutationFn: (increment: boolean) => {
      return authFetch(`/api/events/${eventId}/like`, {
        method: 'POST',
        body: JSON.stringify({ increment, userId: currentUserId }),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
  });

  const handleLike = () => {
    const newLiked = !liked;
    setLiked(newLiked);
    likeMutation.mutate(newLiked);
  };

  const handleSave = () => {
    setSaved(!saved);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: event?.title || 'Check out this event',
          text: event?.description || 'Join this event on Nearly!',
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (error) {
      console.log('Share cancelled');
    }
  };

  // Check if current user is the event host
  const isOwnEvent = currentUserId && event?.userId === currentUserId;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  const totalGuests = guests.length;
  const displayedGuests = guests.slice(0, 3);
  const remainingGuests = Math.max(0, totalGuests - 3);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Fixed Header with Back Button */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => setLocation("/events")}
            className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">
              {event.title}
            </h1>
          </div>
          <button
            className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            data-testid="button-options"
          >
            <span className="text-foreground text-lg">•••</span>
          </button>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-56 object-cover"
          />
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <span className="text-4xl">🎉</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h1 className="text-2xl font-bold text-foreground mb-3" data-testid="text-event-title">
          {event.title}
        </h1>

        <div className="flex gap-2 mb-4">
          {event.category?.map((cat: string) => (
            <Badge key={cat} variant="secondary" className="bg-primary/10 text-primary border-primary/20" data-testid={`badge-category-${cat.toLowerCase()}`}>
              {cat}
            </Badge>
          ))}
          {event.entryType === "FREE" && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20" data-testid="badge-free">
              FREE
            </Badge>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground" data-testid="text-event-date">
                {event.startDate ? format(new Date(event.startDate), "EEEE, dd MMMM yyyy") : "Date TBD"}
              </p>
              <p className="text-xs text-muted-foreground">
                {event.startDate ? format(new Date(event.startDate), "h:mm a") : ""}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground" data-testid="text-event-location">
                {event.location}
              </p>
              <button className="text-xs text-primary" data-testid="button-view-map">
                View Map
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">About this event</h2>
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-event-description">
            {event.description || "No description provided"}
          </p>
        </div>

        {/* Host Section - with real data */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Hosted by</h2>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
            <Avatar className="w-14 h-14 ring-2 ring-primary/30">
              <AvatarImage src={hostUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${event?.userId}`} />
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                {hostUser?.name?.[0] || 'H'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {isOwnEvent ? 'You' : (hostUser?.name || 'Event Host')}
                </p>
                {(hostUser as any)?.isVerified && <BadgeCheck className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground">@{hostUser?.username || 'user'}</p>
              {hostUser?.bio && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{hostUser.bio}</p>
              )}
            </div>
            {!isOwnEvent && (
              <Button
                variant="outline"
                size="sm"
                className="border-primary text-primary hover:bg-primary/10"
                onClick={() => setLocation(`/profile/${hostUser?.username}`)}
                data-testid="button-view-profile"
              >
                View Profile
              </Button>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">
              Guests ({totalGuests} attending)
            </h2>
            {totalGuests > 0 && (
              <button className="text-xs text-primary font-medium" data-testid="button-see-all-guests">
                See all
              </button>
            )}
          </div>
          {totalGuests > 0 ? (
            <div className="flex items-center gap-2">
              {displayedGuests.map((guest) => (
                <Avatar key={guest.id} className="w-10 h-10">
                  <AvatarImage src={guest.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${guest.id}`} />
                  <AvatarFallback>{guest.id.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              ))}
              {remainingGuests > 0 && (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">+{remainingGuests}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No guests yet</p>
          )}
        </div>

        {/* Comments Section */}
        <div className="mb-40">
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Comments ({rawComments.length})
          </h2>
          {organizedComments.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-xl">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No comments yet</p>
              <p className="text-xs text-muted-foreground/70">Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {organizedComments.map((c) => (
                <div key={c.id} className="space-y-3">
                  {/* Parent Comment */}
                  <div className="flex gap-3 p-3 bg-card rounded-xl">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={c.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.userId}`} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {c.userName?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground">{c.userName || "User"}</p>
                        <span className="text-xs text-muted-foreground">{getTimeAgo(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-foreground/90">{c.content}</p>
                      <div className="flex items-center gap-4 mt-2">
                        {(c.likesCount || 0) > 0 && (
                          <span className="text-xs text-muted-foreground">{c.likesCount} likes</span>
                        )}
                        <button
                          onClick={() => handleReply(c.id, c.userName || 'User')}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <Reply className="w-3 h-3" />
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Replies - Instagram/YouTube style */}
                  {c.replies && c.replies.length > 0 && (
                    <div className="ml-12 space-y-2 pl-3 border-l-2 border-border/50">
                      {c.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-2 p-2 bg-muted/20 rounded-lg">
                          <Avatar className="w-7 h-7 flex-shrink-0">
                            <AvatarImage src={reply.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.userId}`} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {reply.userName?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-xs font-semibold text-foreground truncate">{reply.userName || "User"}</p>
                              <span className="text-xs text-muted-foreground flex-shrink-0">{getTimeAgo(reply.createdAt)}</span>
                            </div>
                            <p className="text-xs text-foreground/90 leading-relaxed">{reply.content}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              {(reply.likesCount || 0) > 0 && (
                                <span className="text-xs text-muted-foreground">{reply.likesCount} likes</span>
                              )}
                              <button
                                onClick={() => handleReply(c.id, reply.userName || 'User')}
                                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                              >
                                <Reply className="w-3 h-3" />
                                Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom bar with actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border">
        {/* Comment input */}
        <div className="p-3 border-b border-border/50">
          {replyingTo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 px-2">
              <Reply className="w-4 h-4" />
              <span>Replying to <span className="font-semibold text-foreground">@{replyingTo.userName}</span></span>
              <button onClick={cancelReply} className="ml-auto hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserId}`} />
              <AvatarFallback>{currentUser?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <Input
              ref={commentInputRef}
              placeholder={replyingTo ? `Reply to @${replyingTo.userName}...` : "Add a comment..."}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="flex-1 border-0 bg-muted/50 focus-visible:ring-0 rounded-full h-9"
              onKeyDown={(e) => e.key === 'Enter' && comment && handleSubmitComment()}
            />
            <button
              onClick={handleSubmitComment}
              disabled={!comment || commentMutation.isPending}
              className="text-primary font-semibold text-sm disabled:opacity-50"
            >
              {commentMutation.isPending ? "..." : "Post"}
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-4 flex items-center gap-3">
          <div className="flex items-center gap-3">
            <button onClick={handleLike} className="p-2 hover:bg-muted rounded-full transition-colors">
              <Heart className={`w-6 h-6 ${liked ? "fill-red-500 text-red-500" : "text-foreground"}`} />
            </button>
            <button onClick={handleSave} className="p-2 hover:bg-muted rounded-full transition-colors">
              <Bookmark className={`w-6 h-6 ${saved ? "fill-foreground text-foreground" : "text-foreground"}`} />
            </button>
            <button onClick={handleShare} className="p-2 hover:bg-muted rounded-full transition-colors">
              <Send className="w-6 h-6 text-foreground" />
            </button>
          </div>
          <Button
            className="flex-1 bg-gradient-primary text-white border-none h-11 font-semibold"
            onClick={() => {
              if (!isOwnEvent && hostUser?.username) {
                // Navigate to direct chat with the host
                setLocation(`/chat/${hostUser.username}`);
              }
            }}
            disabled={!!isOwnEvent}
            data-testid="button-join-event"
          >
            {isOwnEvent ? "Your Event" : "Join Event"}
          </Button>
        </div>
      </div>
    </div>
  );
}
