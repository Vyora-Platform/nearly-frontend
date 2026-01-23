import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MoreVertical, MapPin, Calendar, Users, Bookmark, IndianRupee, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { queryClient, authFetch } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Instagram-style comment icon SVG
const CommentIcon = ({ className }: { className?: string }) => (
  <svg
    aria-label="Comment"
    className={className}
    fill="none"
    height="28"
    role="img"
    viewBox="0 0 24 24"
    width="28"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" strokeLinejoin="round"></path>
  </svg>
);

// Instagram-style share icon SVG (Paper plane)
const ShareIcon = ({ className }: { className?: string }) => (
  <svg
    aria-label="Share"
    className={className}
    fill="none"
    height="28"
    role="img"
    viewBox="0 0 24 24"
    width="28"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <line x1="22" x2="9.218" y1="3" y2="10.083"></line>
    <polygon points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334"></polygon>
  </svg>
);

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
  replies?: Comment[];
}

interface ActivityCardProps {
  id: string;
  author: {
    id?: string;
    name: string;
    username: string;
    avatar?: string;
  };
  title: string;
  description?: string;
  imageUrl?: string;
  location?: string;
  startDate?: string;
  cost?: string;
  category?: string;
  likesCount: number;
  commentsCount: number;
  participantsCount?: number;
  maxParticipants?: number;
  timeAgo: string;
  isFollowing?: boolean;
  isOwnPost?: boolean;
  isPending?: boolean;
}

export default function ActivityCard({
  id,
  author,
  title,
  description,
  imageUrl,
  location,
  startDate,
  cost,
  category,
  likesCount,
  commentsCount,
  participantsCount,
  maxParticipants,
  timeAgo,
  isFollowing = false,
  isOwnPost = false,
  isPending = false,
}: ActivityCardProps) {
  const [, setLocation] = useLocation();
  const currentUserId = localStorage.getItem('nearly_user_id');

  // Initialize liked state from localStorage
  const [liked, setLiked] = useState(() => {
    const likedActivities = JSON.parse(localStorage.getItem('nearly_liked_activities') || '[]');
    return likedActivities.includes(id);
  });
  const [likes, setLikes] = useState(likesCount);

  // Initialize following state from localStorage
  const [following, setFollowing] = useState(() => {
    if (isFollowing) return true;
    const followingList = JSON.parse(localStorage.getItem('nearly_following') || '[]');
    return author.id ? followingList.includes(author.id) : false;
  });

  // Initialize pending state from localStorage
  const [pending, setPending] = useState(() => {
    if (isPending) return true;
    const pendingList = JSON.parse(localStorage.getItem('nearly_pending_follows') || '[]');
    return author.id ? pendingList.includes(author.id) : false;
  });

  // Initialize saved state from localStorage
  const [saved, setSaved] = useState(() => {
    const savedPosts = JSON.parse(localStorage.getItem('nearly_saved_posts') || '[]');
    return savedPosts.includes(id);
  });
  const [showComments, setShowComments] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [localCommentsCount, setLocalCommentsCount] = useState(commentsCount);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Check if this is the current user's post
  const isCurrentUserPost = isOwnPost || (author.id && author.id === currentUserId);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user", currentUserId],
    queryFn: () => api.getCurrentUser(),
    enabled: !!currentUserId,
  });

  // Fetch comments and enrich with user data - Direct enrichment pattern
  const { data: rawComments = [], refetch: refetchComments } = useQuery({
    queryKey: ['activity-comments', id],
    queryFn: async () => {
      try {
        const fetchedComments = await api.getActivityComments(id);
        // Enrich comments with user data if not provided
        const enrichedComments = await Promise.all(
          fetchedComments.map(async (c: any) => {
            let userName = c.userName || 'User';
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
    enabled: showComments,
  });

  // Organize comments into threads
  const organizedComments = (() => {
    const parentComments: Comment[] = [];
    const repliesMap: Record<string, Comment[]> = {};

    rawComments.forEach((c: any) => {
      const comment: Comment = {
        id: c.id,
        userId: c.userId,
        userName: c.userName || 'User',
        userAvatar: c.userAvatar,
        content: c.content,
        createdAt: c.createdAt,
        likesCount: c.likesCount || 0,
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
      if (parent.replies) {
        parent.replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    });

    // Sort parent comments by date desc (newest first)
    return parentComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  })();

  // Sync organized comments to legacy state if needed, or better, we replace usage of 'comments' with 'organizedComments'
  // But for now, let's keep the useEffect to minimizing refactoring of the whole file,
  // although NewsDetail uses organizedComments directly.
  useEffect(() => {
    if (organizedComments) {
      setComments(organizedComments);
    }
  }, [rawComments]); // Trigger when rawComments changes (which implies organizedComments re-calc)

  // Handle save functionality
  const handleSave = () => {
    setSaved(!saved);
    const savedPosts = JSON.parse(localStorage.getItem('nearly_saved_posts') || '[]');
    if (!saved) {
      savedPosts.push(id);
      toast({ title: "Activity saved!" });
    } else {
      const index = savedPosts.indexOf(id);
      if (index > -1) savedPosts.splice(index, 1);
      toast({ title: "Removed from saved" });
    }
    localStorage.setItem('nearly_saved_posts', JSON.stringify(savedPosts));
  };

  const handleLike = async () => {
    // Check if already liked - only allow one like per user
    if (liked) {
      toast({ title: "Already liked", description: "You can only like once" });
      return;
    }

    // Update UI optimistically
    setLiked(true);
    setLikes(likes + 1);

    // Persist to localStorage
    const likedActivities = JSON.parse(localStorage.getItem('nearly_liked_activities') || '[]');
    likedActivities.push(id);
    localStorage.setItem('nearly_liked_activities', JSON.stringify(likedActivities));

    try {
      await api.likeActivity(id, true);
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    } catch (error) {
      // Revert on error
      setLiked(false);
      setLikes(likes);
      const revertedLikes = JSON.parse(localStorage.getItem('nearly_liked_activities') || '[]');
      const filtered = revertedLikes.filter((actId: string) => actId !== id);
      localStorage.setItem('nearly_liked_activities', JSON.stringify(filtered));
      console.error("Failed to like activity:", error);
    }
  };

  const handleFollow = async () => {
    if (following) {
      setFollowing(false);
      setPending(false);

      // Remove from localStorage
      if (author.id) {
        const followingList = JSON.parse(localStorage.getItem('nearly_following') || '[]');
        const filtered = followingList.filter((id: string) => id !== author.id);
        localStorage.setItem('nearly_following', JSON.stringify(filtered));

        const pendingList = JSON.parse(localStorage.getItem('nearly_pending_follows') || '[]');
        const filteredPending = pendingList.filter((id: string) => id !== author.id);
        localStorage.setItem('nearly_pending_follows', JSON.stringify(filteredPending));
      }

      if (author.id && currentUserId) {
        try {
          await api.unfollowUser(currentUserId, author.id);
        } catch (e) {
          console.error("Failed to unfollow:", e);
        }
      }
    } else {
      if (author.id && currentUserId) {
        try {
          const result = await api.followUser(currentUserId, author.id);
          if (result.status === "requested") {
            setPending(true);
            // Add to pending localStorage
            const pendingList = JSON.parse(localStorage.getItem('nearly_pending_follows') || '[]');
            if (!pendingList.includes(author.id)) {
              pendingList.push(author.id);
              localStorage.setItem('nearly_pending_follows', JSON.stringify(pendingList));
            }
          } else {
            setFollowing(true);
            // Add to following localStorage
            const followingList = JSON.parse(localStorage.getItem('nearly_following') || '[]');
            if (!followingList.includes(author.id)) {
              followingList.push(author.id);
              localStorage.setItem('nearly_following', JSON.stringify(followingList));
            }
          }
        } catch (e) {
          console.error("Failed to follow:", e);
        }
      }
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/activity/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: description || 'Check out this activity!',
          url: shareUrl,
        });
      } else {
        setShowShareDialog(true);
      }
    } catch (e) {
      setShowShareDialog(true);
    }
  };

  const copyLink = async () => {
    const shareUrl = `${window.location.origin}/activity/${id}`;
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link copied!" });
    setShowShareDialog(false);
  };

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const res = await authFetch(`/api/activities/${id}/comments`, {
        method: 'POST',
        // Make sure to include userId if backend expects it in body, consistent with ActivityDetails
        body: JSON.stringify({ content, userId: currentUserId, parentCommentId: parentId }),
      });
      return res.json();
    },
    onSuccess: () => {
      setNewComment("");
      setReplyingTo(null);
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] }); // Invalidate list to update counts if needed
      toast({ title: "Comment posted!" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
    },
  });

  const handlePostComment = () => {
    if (!newComment.trim()) return;
    commentMutation.mutate({
      content: newComment,
      parentId: replyingTo?.commentId
    });
  };

  const handleReply = (commentId: string, userName: string) => {
    setReplyingTo({ commentId, userName });
    setNewComment(`@${userName} `);
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(days / 7);

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return `${weeks}w`;
  };

  return (
    <>
      <div className="bg-background border-b border-border pb-4">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            className="flex items-center gap-3"
            onClick={() => !isCurrentUserPost && author.username && setLocation(`/profile/${author.username}`)}
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={author.avatar} />
              <AvatarFallback>{(isCurrentUserPost ? "You" : author.name)[0]}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">
                {isCurrentUserPost ? "You" : author.name}
              </p>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            {!isCurrentUserPost && !following && !pending && (
              <Button
                variant="default"
                size="sm"
                className="bg-gradient-primary text-white h-8"
                onClick={handleFollow}
                data-testid="button-follow"
              >
                Follow
              </Button>
            )}
            {!isCurrentUserPost && pending && (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={handleFollow}
                data-testid="button-requested"
              >
                Requested
              </Button>
            )}
            {!isCurrentUserPost && following && (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={handleFollow}
                data-testid="button-following"
              >
                Following
              </Button>
            )}
            <button data-testid="button-menu" className="text-muted-foreground hover:bg-muted rounded-full p-1">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {category && (
          <div className="px-4 mb-2">
            <Badge variant="secondary" className="text-xs">
              {category}
            </Badge>
          </div>
        )}

        {imageUrl && (
          <div className="w-full cursor-pointer" onClick={() => setLocation(`/activity/${id}`)}>
            <img
              src={imageUrl}
              alt={title}
              className="w-full object-cover"
              style={{ aspectRatio: "16/9" }}
            />
          </div>
        )}

        <div className="px-4 pt-3">
          <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
          {description && (
            <p className="text-sm text-foreground mb-3">{description}</p>
          )}

          <div className="flex flex-wrap gap-3 mb-4">
            {startDate && (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-xl border border-primary/10">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{startDate}</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">{location}</span>
              </div>
            )}
            {participantsCount !== undefined && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">
                  {participantsCount}/{maxParticipants || "∞"} attending
                </span>
              </div>
            )}
            {cost && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-xl border border-green-500/20">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm font-semibold text-green-600">{cost === "FREE" ? "Free" : cost}</span>
              </div>
            )}
          </div>

          {/* Instagram-style action bar */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-5">
              <button
                onClick={handleLike}
                disabled={liked}
                className={`flex items-center gap-2 transition-transform active:scale-95 ${liked ? 'cursor-default' : 'hover:opacity-80'}`}
                data-testid="button-like"
              >
                <Heart
                  className={`w-7 h-7 transition-all ${liked ? "fill-red-500 text-red-500 scale-110" : "text-foreground"}`}
                />
                <span className="text-sm font-semibold text-foreground">{likes}</span>
              </button>
              <button
                onClick={() => setShowComments(true)}
                className="flex items-center gap-2 transition-transform active:scale-95 hover:opacity-80"
                data-testid="button-comment"
              >
                <CommentIcon className="text-foreground" />
                <span className="text-sm font-semibold text-foreground">{localCommentsCount}</span>
              </button>
              <button
                onClick={handleShare}
                className="transition-transform active:scale-95 hover:opacity-80"
                data-testid="button-share"
              >
                <ShareIcon className="text-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                className="transition-transform active:scale-95 hover:opacity-80"
                data-testid="button-save"
              >
                <Bookmark className={`w-7 h-7 transition-all ${saved ? "fill-foreground text-foreground" : "text-foreground"}`} />
              </button>
              <Button
                variant="default"
                size="sm"
                className="bg-gradient-primary text-white h-10 font-semibold px-6 rounded-xl"
                onClick={() => setLocation(`/activity/${id}`)}
                data-testid="button-join"
              >
                {isCurrentUserPost ? "View" : "Join"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Dialog */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-md h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle className="text-center">Comments</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <CommentIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No comments yet</p>
                <p className="text-sm text-muted-foreground/70">Be the first to comment!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="space-y-3">
                  {/* Main comment */}
                  <div className="flex gap-3">
                    <Avatar
                      className="w-9 h-9 flex-shrink-0 cursor-pointer"
                      onClick={() => setLocation(`/profile/${comment.userId}`)}
                    >
                      <AvatarImage src={comment.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`} />
                      <AvatarFallback>{comment.userName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span
                          className="font-semibold mr-2 cursor-pointer hover:underline"
                          onClick={() => setLocation(`/profile/${comment.userId}`)}
                        >
                          {comment.userName || 'AMN'}
                        </span>
                        {comment.content}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {getTimeAgo(comment.createdAt)}
                        </span>
                        {comment.likesCount > 0 && (
                          <button className="text-xs text-muted-foreground hover:text-foreground">
                            {comment.likesCount} likes
                          </button>
                        )}
                        <button
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                          onClick={() => handleReply(comment.id, comment.userName)}
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                    <button className="p-1 hover:bg-muted rounded">
                      <Heart className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-12 space-y-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3">
                          <Avatar
                            className="w-7 h-7 flex-shrink-0 cursor-pointer"
                            onClick={() => setLocation(`/profile/${reply.userId}`)}
                          >
                            <AvatarImage src={reply.userAvatar} />
                            <AvatarFallback>{reply.userName?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm">
                              <span
                                className="font-semibold mr-2 cursor-pointer hover:underline"
                                onClick={() => setLocation(`/profile/${reply.userId}`)}
                              >
                                {reply.userName}
                              </span>
                              {reply.content}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {getTimeAgo(reply.createdAt)}
                              </span>
                              {reply.likesCount > 0 && (
                                <button className="text-xs text-muted-foreground hover:text-foreground">
                                  {reply.likesCount} likes
                                </button>
                              )}
                              <button
                                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                                onClick={() => handleReply(comment.id, reply.userName)}
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                          <button className="p-1 hover:bg-muted rounded">
                            <Heart className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Comment input */}
          <div className="border-t border-border p-3">
            {replyingTo && (
              <div className="flex items-center justify-between mb-2 px-2 py-1 bg-muted rounded">
                <span className="text-sm text-muted-foreground">
                  Replying to <span className="font-semibold">@{replyingTo.userName}</span>
                </span>
                <button onClick={() => {
                  setReplyingTo(null);
                  setNewComment("");
                }}>
                  <X className="w-4 h-4 text-muted-foreground" />
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
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 border-0 bg-transparent focus-visible:ring-0"
                onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
              />
              <button
                onClick={handlePostComment}
                disabled={!newComment.trim() || commentMutation.isPending}
                className="text-primary font-semibold text-sm disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Share Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={copyLink}
            >
              <ShareIcon className="w-5 h-5" />
              Copy Link
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => {
                window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/activity/${id}`)}&text=${encodeURIComponent(title)}`, '_blank');
                setShowShareDialog(false);
              }}
            >
              Share to Twitter
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/activity/${id}`)}`, '_blank');
                setShowShareDialog(false);
              }}
            >
              Share to Facebook
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => {
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} - ${window.location.origin}/activity/${id}`)}`, '_blank');
                setShowShareDialog(false);
              }}
            >
              Share to WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
