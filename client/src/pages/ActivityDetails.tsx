import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Calendar, Users, IndianRupee, Heart, MessageCircle, Send, Bookmark, BadgeCheck, Reply, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { notificationApi, messagingApi } from "@/lib/gateway-api";
import { authFetch } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// WhatsApp Icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

// Telegram Icon
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

// Instagram Icon
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
  </svg>
);

// Facebook Icon
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

interface Attendee {
  id: string;
  activityId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
}

interface ActivityComment {
  id: string;
  activityId: string;
  userId: string;
  content: string;
  createdAt: Date;
  userName?: string;
  userAvatar?: string;
  parentCommentId?: string;
  likesCount?: number;
  replies?: ActivityComment[];
}

export default function ActivityDetails() {
  const [, params] = useRoute("/activity/:id");
  const [, setLocation] = useLocation();
  const activityId = params?.id;
  const [comment, setComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareMode, setShareMode] = useState<"main" | "friends" | "groups">("main");
  const [selectedShareTargets, setSelectedShareTargets] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const currentUserId = localStorage.getItem('nearly_user_id') || '';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch friends (users that the current user is following)
  const { data: friends = [] } = useQuery({
    queryKey: ["following", currentUserId],
    queryFn: () => api.getFollowing(currentUserId || ''),
    enabled: !!currentUserId && showShareDialog && shareMode === "friends",
  });

  // Fetch groups
  const { data: groups = [] } = useQuery({
    queryKey: ["user-groups", currentUserId],
    queryFn: () => api.getUserGroups(currentUserId || ''),
    enabled: !!currentUserId && showShareDialog && shareMode === "groups",
  });

  // Initialize saved state from localStorage
  const [saved, setSaved] = useState(() => {
    const savedPosts = JSON.parse(localStorage.getItem('nearly_saved_posts') || '[]');
    return savedPosts.includes(activityId);
  });

  // Handle save functionality
  const handleSave = () => {
    const savedPosts = JSON.parse(localStorage.getItem('nearly_saved_posts') || '[]');
    if (!saved) {
      savedPosts.push(activityId);
    } else {
      const index = savedPosts.indexOf(activityId);
      if (index > -1) savedPosts.splice(index, 1);
    }
    localStorage.setItem('nearly_saved_posts', JSON.stringify(savedPosts));
    setSaved(!saved);
  };

  const { data: activity, isLoading } = useQuery<any>({
    queryKey: ["activity", activityId],
    queryFn: () => api.getActivity(activityId || ''),
    enabled: !!activityId,
  });

  // Fetch the activity host user
  const { data: hostUser } = useQuery({
    queryKey: ["user", activity?.userId],
    queryFn: () => api.getUser(activity?.userId || ''),
    enabled: !!activity?.userId,
  });

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user", currentUserId],
    queryFn: () => api.getCurrentUser(),
    enabled: !!currentUserId,
  });

  // Check if current user is the activity host
  const isOwnActivity = currentUserId && activity?.userId === currentUserId;

  const { data: attendees = [] } = useQuery<Attendee[]>({
    queryKey: ["activity-attendees", activityId],
    queryFn: () => api.getActivityAttendees(activityId || ''),
    enabled: !!activityId,
  });

  // Fetch comments using gateway API
  const { data: rawComments = [], refetch: refetchComments } = useQuery({
    queryKey: ["activity-comments", activityId],
    queryFn: async () => {
      try {
        const fetchedComments = await api.getActivityComments(activityId || '');
        // Enrich comments with user data if not provided (similar to Shots.tsx)
        const enrichedComments = await Promise.all(
          fetchedComments.map(async (c: any) => {
            let userName = c.userName || 'User';
            console.log("#######", c);
            console.log("#######", c.userName);
            let userAvatar = c.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.userId}`;

            // Fetch user data if not provided
            if (!c.userName) {
              try {
                const userData = await api.getUser(c.userId);
                userName = userData.name || userData.username || 'User';
                userAvatar = userData.avatarUrl || userAvatar;
              } catch { }
            }

            return {
              ...c,
              userName,
              userAvatar,
            };
          })
        );
        return enrichedComments;
      } catch {
        return [];
      }
    },
    enabled: !!activityId,
  });

  // Organize comments into threads (parent comments with their replies)
  const organizedComments = (() => {
    const parentComments: ActivityComment[] = [];
    const repliesMap: Record<string, ActivityComment[]> = {};

    rawComments.forEach((c: any) => {
      const comment: ActivityComment = {
        id: c.id,
        activityId: c.activityId,
        userId: c.userId,
        userName: c.userName || 'User',
        userAvatar: c.userAvatar,
        content: c.content,
        parentCommentId: c.parentCommentId,
        likesCount: c.likesCount || 0,
        createdAt: c.createdAt,
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

    // Attach replies to parent comments
    parentComments.forEach(parent => {
      parent.replies = repliesMap[parent.id] || [];
    });

    return parentComments;
  })();

  const joinMutation = useMutation({
    mutationFn: () => api.joinActivity(activityId || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      queryClient.invalidateQueries({ queryKey: ["activity-attendees", activityId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to join activity", variant: "destructive" });
    },
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: (increment: boolean) => api.likeActivity(activityId || '', increment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
    },
  });

  // Comment mutation with reply support and notifications
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentCommentId }: { content: string; parentCommentId?: string }) => {
      const res = await authFetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, userId: currentUserId, parentCommentId }),
      });
      const result = await res.json();

      // Send notification to activity host (if not commenting on own activity)
      if (activity?.userId && activity.userId !== currentUserId) {
        try {
          await notificationApi.createNotification({
            userId: activity.userId,
            type: parentCommentId ? 'comment_reply' : 'activity_comment',
            title: parentCommentId ? 'New Reply' : 'New Comment',
            description: content.substring(0, 100),
            relatedId: currentUserId,
            entityId: activityId || '',
            actionUrl: `/activity/${activityId}`,
          });
        } catch (err) {
          console.error('Failed to send notification:', err);
        }
      }

      return result;
    },
    onSuccess: () => {
      setComment("");
      setReplyingTo(null);
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to post comment", variant: "destructive" });
    },
  });

  const handleReply = (commentId: string, userName: string) => {
    setReplyingTo({ id: commentId, userName });
    const text = `@${userName} `;
    setComment(text);
    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
        commentInputRef.current.setSelectionRange(text.length, text.length);
      }
    }, 100);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setComment("");
  };

  const handleLike = () => {
    const newLiked = !liked;
    setLiked(newLiked);
    likeMutation.mutate(newLiked);
  };

  const handleShare = async () => {
    setShowShareDialog(true);
  };

  const copyLink = async () => {
    const shareUrl = `${window.location.origin}/activity/${activityId}`;
    await navigator.clipboard.writeText(shareUrl);
    setShowShareDialog(false);
  };


  const handlePostComment = () => {
    if (!comment.trim()) return;
    commentMutation.mutate({
      content: comment,
      parentCommentId: replyingTo?.id,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Activity not found</p>
      </div>
    );
  }

  const totalAttendees = attendees.length;
  const displayedAttendees = attendees.slice(0, 3);
  const remainingAttendees = Math.max(0, totalAttendees - 3);
  const maxParticipants = activity.maxParticipants || 0;
  const spotsLeft = maxParticipants > 0 ? Math.max(0, maxParticipants - totalAttendees) : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Fixed Header with Back Button */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => setLocation("/")}
            className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">
              {activity.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative">
        {activity.imageUrl && (
          <img
            src={activity.imageUrl}
            alt={activity.title}
            className="w-full h-56 object-cover"
          />
        )}
        {!activity.imageUrl && (
          <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <span className="text-4xl">🎯</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-activity-title">
            {activity.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Posted {activity.createdAt ? format(new Date(activity.createdAt), "MMMM dd, yyyy") : "Recently"}
          </p>
        </div>

        <div className="mb-6">
          <p className="text-sm text-foreground leading-relaxed" data-testid="text-activity-description">
            {activity.description || "No description provided"}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date & Time</p>
              <p className="text-sm font-medium text-foreground" data-testid="text-activity-date">
                {activity.startDate ? format(new Date(activity.startDate), "MMMM dd, yyyy, h:mm a") : "Date TBD"}
                {activity.endDate && ` - ${format(new Date(activity.endDate), "h:mm a")}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <MapPin className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-sm font-medium text-foreground" data-testid="text-activity-location">
                {activity.location || "Location TBD"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entry</p>
              <p className="text-sm font-medium text-foreground" data-testid="text-activity-entry">
                {activity.cost === "FREE" || activity.cost === "0" ? "Free Entry" : `₹${activity.cost || "350"} per person`}
              </p>
            </div>
          </div>
        </div>

        {/* Host Section with real data */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Posted by</h2>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
            <Avatar className="w-14 h-14 ring-2 ring-primary/30">
              <AvatarImage src={hostUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.userId}`} />
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                {hostUser?.name?.[0] || 'H'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground" data-testid="text-host-name">
                  {isOwnActivity ? 'You' : (hostUser?.name || 'Host')}
                </p>
                {(hostUser as any)?.isVerified && <BadgeCheck className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground">@{hostUser?.username || 'user'}</p>
              {hostUser?.bio && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{hostUser.bio}</p>
              )}
            </div>
            {!isOwnActivity && (
              <Button
                variant="outline"
                size="sm"
                className="border-primary text-primary hover:bg-primary/10"
                onClick={() => setLocation(`/profile/${hostUser?.username}`)}
                data-testid="button-follow"
              >
                View Profile
              </Button>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">
              Attendees ({totalAttendees}/{maxParticipants || "unlimited"})
            </h2>
            {spotsLeft !== null && spotsLeft > 0 && (
              <p className="text-xs text-muted-foreground">
                {spotsLeft} spots left
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Guests are allowed
          </p>
          {totalAttendees > 0 ? (
            <div className="flex items-center gap-2">
              {displayedAttendees.map((attendee) => (
                <Avatar key={attendee.id} className="w-10 h-10">
                  <AvatarImage src={attendee.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${attendee.id}`} />
                  <AvatarFallback>{attendee.id.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              ))}
              {remainingAttendees > 0 && (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">+{remainingAttendees}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No attendees yet. Be the first to join!</p>
          )}
        </div>

        {/* Instagram-style action bar */}
        <div className="flex items-center justify-between py-3 border-t border-b border-border mb-4">
          <div className="flex items-center gap-4">
            <button onClick={handleLike} className="hover:opacity-70 transition-opacity">
              <Heart className={`w-6 h-6 ${liked ? "fill-red-500 text-red-500" : "text-foreground"}`} />
            </button>
            <button className="hover:opacity-70 transition-opacity">
              <MessageCircle className="w-6 h-6 text-foreground" />
            </button>
            <button onClick={handleShare} className="hover:opacity-70 transition-opacity">
              <Send className="w-6 h-6 text-foreground" />
            </button>
          </div>
          <button onClick={handleSave} className="hover:opacity-70 transition-opacity">
            <Bookmark className={`w-6 h-6 ${saved ? "fill-foreground text-foreground" : "text-foreground"}`} />
          </button>
        </div>

        {/* Likes count */}
        <p className="text-sm font-semibold text-foreground mb-2">
          {activity.likesCount || 0} likes
        </p>

        {/* Comments section */}
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
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarImage src={c.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.userId}`} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {c.userName?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground">
                          {c.userId === currentUserId ? 'You' : (c.userName || 'User')}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {c.createdAt ? format(new Date(c.createdAt), "MMM d") : 'Just now'}
                        </span>
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
                              <p className="text-xs font-semibold text-foreground truncate">
                                {reply.userId === currentUserId ? 'You' : (reply.userName || 'User')}
                              </p>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {reply.createdAt ? format(new Date(reply.createdAt), "MMM d") : 'Just now'}
                              </span>
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
              onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
            />
            <button
              onClick={handlePostComment}
              disabled={!comment.trim() || commentMutation.isPending}
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
              if (!isOwnActivity && hostUser?.username) {
                // Call join mutation to update attendee count
                joinMutation.mutate();
                // Navigate to direct chat with the host, including activity context for default message
                const activityUrl = `${window.location.origin}/activity/${activityId}`;
                const defaultMessage = `Hey! I want to join this activity:\n\n📌 ${activity.title}\n🔗 ${activityUrl}`;
                const activityContext = encodeURIComponent(JSON.stringify({
                  activityId: activityId,
                  activityTitle: activity.title,
                  activityUrl: activityUrl,
                  defaultMessage: defaultMessage
                }));
                setLocation(`/chat/${hostUser.username}?context=${activityContext}`);
              }
            }}
            disabled={!!isOwnActivity}
            data-testid="button-send-request"
          >
            {isOwnActivity ? "Your Activity" : "Join Activity"}
          </Button>
        </div>
      </div>

      {/* Share Dialog - Instagram Style */}
      <Dialog open={showShareDialog} onOpenChange={(open) => {
        setShowShareDialog(open);
        if (!open) {
          setShareMode("main");
          setSelectedShareTargets([]);
        }
      }}>
        <DialogContent className="max-w-sm max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              {shareMode !== "main" && (
                <button
                  onClick={() => {
                    setShareMode("main");
                    setSelectedShareTargets([]);
                  }}
                  className="p-1 -ml-1 hover:bg-muted rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <DialogTitle className="text-center flex-1">
                {shareMode === "main" ? "Share Activity" : shareMode === "friends" ? "Share with Friends" : "Share to Groups"}
              </DialogTitle>
              {shareMode !== "main" && selectedShareTargets.length > 0 && (
                <button
                  onClick={async () => {
                    const shareText = `Check out this activity: ${activity?.title}\n\n🔗 ${window.location.origin}/activity/${activityId}`;
                    for (const targetId of selectedShareTargets) {
                      try {
                        if (shareMode === "friends") {
                          await messagingApi.sendMessage({
                            senderId: currentUserId,
                            recipientId: targetId,
                            content: shareText,
                            messageType: "text",
                          });
                        }
                      } catch (e) {
                        console.error("Failed to send share message:", e);
                      }
                    }
                    setShowShareDialog(false);
                    setShareMode("main");
                    setSelectedShareTargets([]);
                  }}
                  className="text-primary font-semibold text-sm"
                >
                  Send
                </button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {shareMode === "main" && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShareMode("friends")}
                    className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium text-sm">Friends</span>
                  </button>
                  <button
                    onClick={() => setShareMode("groups")}
                    className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className="font-medium text-sm">Groups</span>
                  </button>
                </div>

                <div className="border-t border-border/50 my-3" />

                <div className="grid grid-cols-4 gap-2">
                  <button
                    className="flex flex-col items-center gap-1 p-2 hover:bg-muted/50 rounded-lg transition-colors"
                    onClick={() => {
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${activity?.title} - ${window.location.origin}/activity/${activityId}`)}`, '_blank');
                      setShowShareDialog(false);
                    }}
                  >
                    <WhatsAppIcon className="w-10 h-10 text-[#25D366]" />
                    <span className="text-xs text-muted-foreground">WhatsApp</span>
                  </button>
                  <button
                    className="flex flex-col items-center gap-1 p-2 hover:bg-muted/50 rounded-lg transition-colors"
                    onClick={() => {
                      window.open(`https://telegram.me/share/url?url=${encodeURIComponent(`${window.location.origin}/activity/${activityId}`)}&text=${encodeURIComponent(activity?.title || '')}`, '_blank');
                      setShowShareDialog(false);
                    }}
                  >
                    <TelegramIcon className="w-10 h-10 text-[#0088cc]" />
                    <span className="text-xs text-muted-foreground">Telegram</span>
                  </button>
                  <button
                    className="flex flex-col items-center gap-1 p-2 hover:bg-muted/50 rounded-lg transition-colors"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: activity?.title, url: `${window.location.origin}/activity/${activityId}` });
                      } else {
                        // Instagram sharing not available on this browser
                      }
                      setShowShareDialog(false);
                    }}
                  >
                    <InstagramIcon className="w-10 h-10 text-[#E1306C]" />
                    <span className="text-xs text-muted-foreground">Instagram</span>
                  </button>
                  <button
                    className="flex flex-col items-center gap-1 p-2 hover:bg-muted/50 rounded-lg transition-colors"
                    onClick={() => {
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/activity/${activityId}`)}`, '_blank');
                      setShowShareDialog(false);
                    }}
                  >
                    <FacebookIcon className="w-10 h-10 text-[#1877F2]" />
                    <span className="text-xs text-muted-foreground">Facebook</span>
                  </button>
                </div>

                <Button
                  variant="ghost"
                  className="w-full justify-center gap-2 mt-2"
                  onClick={copyLink}
                >
                  <Send className="w-4 h-4" />
                  Copy Link
                </Button>
              </div>
            )}

            {shareMode === "friends" && (
              <div className="divide-y divide-border/50">
                {friends.length === 0 ? (
                  <div className="p-8 text-center">
                    <Heart className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No friends to share with</p>
                  </div>
                ) : (
                  friends.map((friend: any) => (
                    <button
                      key={friend.id}
                      onClick={() => {
                        setSelectedShareTargets(prev =>
                          prev.includes(friend.id)
                            ? prev.filter(id => id !== friend.id)
                            : [...prev, friend.id]
                        );
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={friend.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`} />
                        <AvatarFallback>{friend.name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{friend.name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">@{friend.username || 'user'}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedShareTargets.includes(friend.id)
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                        }`}>
                        {selectedShareTargets.includes(friend.id) && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {shareMode === "groups" && (
              <div className="divide-y divide-border/50">
                {groups.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No groups to share with</p>
                  </div>
                ) : (
                  groups.map((group: any) => (
                    <button
                      key={group.id}
                      onClick={() => {
                        setSelectedShareTargets(prev =>
                          prev.includes(group.id)
                            ? prev.filter(id => id !== group.id)
                            : [...prev, group.id]
                        );
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={group.imageUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${group.id}`} />
                        <AvatarFallback>{group.name?.[0] || 'G'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{group.name || 'Group'}</p>
                        <p className="text-xs text-muted-foreground">{group.membersCount || 0} members</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedShareTargets.includes(group.id)
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                        }`}>
                        {selectedShareTargets.includes(group.id) && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
