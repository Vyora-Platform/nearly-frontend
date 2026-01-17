import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Calendar, Users, IndianRupee, Heart, MessageCircle, Send, Bookmark, BadgeCheck, Reply, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { authFetch } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const currentUserId = localStorage.getItem('nearly_user_id') || '';
  const currentUsername = localStorage.getItem('nearly_username') || 'user';
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      toast({ title: "Activity saved!" });
    } else {
      const index = savedPosts.indexOf(activityId);
      if (index > -1) savedPosts.splice(index, 1);
      toast({ title: "Removed from saved" });
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

  // Fetch comments from API
  const { data: rawComments = [], refetch: refetchComments } = useQuery<ActivityComment[]>({
    queryKey: ["activity-comments", activityId],
    queryFn: () => api.getActivityComments(activityId || ''),
    enabled: !!activityId,
  });

  // Organize comments into threads
  const organizedComments = (() => {
    const parentComments: ActivityComment[] = [];
    const repliesMap: Record<string, ActivityComment[]> = {};

    rawComments.forEach((c: any) => {
      const comment: ActivityComment = { ...c, replies: [] };

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
    });

    return parentComments;
  })();

  const joinMutation = useMutation({
    mutationFn: () => api.joinActivity(activityId || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      queryClient.invalidateQueries({ queryKey: ["activity-attendees", activityId] });
      toast({ title: "Joined!", description: "You've joined this activity" });
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

  // Comment mutation with reply support
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentCommentId }: { content: string; parentCommentId?: string }) => {
      const res = await authFetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, userId: currentUserId, parentCommentId }),
      });
      return res.json();
    },
    onSuccess: () => {
      setComment("");
      setReplyingTo(null);
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast({ title: replyingTo ? "Reply posted!" : "Comment posted!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to post comment", variant: "destructive" });
    },
  });

  const handleReply = (commentId: string, userName: string) => {
    setReplyingTo({ id: commentId, userName });
    setComment(`@${userName} `);
    setTimeout(() => commentInputRef.current?.focus(), 100);
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
    const shareUrl = window.location.href;
    const shareData = {
      title: activity?.title || 'Check out this activity',
      text: activity?.description || 'Join this activity on Nearly!',
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "Link copied!", description: "Share link copied to clipboard" });
      }
    } catch (error) {
      // User cancelled or error
      console.log('Share cancelled');
    }
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
                {hostUser?.isVerified && <BadgeCheck className="w-4 h-4 text-primary" />}
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

                  {/* Replies */}
                  {c.replies && c.replies.length > 0 && (
                    <div className="ml-8 space-y-3">
                      {c.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3 p-3 bg-muted/30 rounded-xl">
                          <Avatar className="w-7 h-7 flex-shrink-0">
                            <AvatarImage src={reply.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.userId}`} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {reply.userName?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-semibold text-foreground">
                                {reply.userId === currentUserId ? 'You' : (reply.userName || 'User')}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {reply.createdAt ? format(new Date(reply.createdAt), "MMM d") : 'Just now'}
                              </span>
                            </div>
                            <p className="text-xs text-foreground/90">{reply.content}</p>
                            <div className="flex items-center gap-4 mt-1">
                              {(reply.likesCount || 0) > 0 && (
                                <span className="text-xs text-muted-foreground">{reply.likesCount} likes</span>
                              )}
                              <button 
                                onClick={() => handleReply(c.id, reply.userName || 'User')}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
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
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending || isOwnActivity}
            data-testid="button-send-request"
          >
            {isOwnActivity ? "Your Activity" : joinMutation.isPending ? "Joining..." : "Join Activity"}
          </Button>
        </div>
      </div>
    </div>
  );
}
