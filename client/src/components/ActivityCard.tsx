import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Calendar, Users, Bookmark, IndianRupee, X, MessageCircle } from "lucide-react";
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
import { messagingApi } from "@/lib/gateway-api";
import { queryClient, authFetch } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";



// Instagram-style share icon SVG (Paper plane)
const ShareIcon = ({ className }: { className?: string }) => (
  <svg
    aria-label="Share"
    className={className}
    fill="none"
    height="24"
    role="img"
    viewBox="0 0 24 24"
    width="24"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <line x1="22" x2="9.218" y1="3" y2="10.083"></line>
    <polygon points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334"></polygon>
  </svg>
);

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
  const [shareMode, setShareMode] = useState<"main" | "friends" | "groups">("main");
  const [selectedShareTargets, setSelectedShareTargets] = useState<string[]>([]);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [localCommentsCount, setLocalCommentsCount] = useState(commentsCount);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
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
    } else {
      const index = savedPosts.indexOf(id);
      if (index > -1) savedPosts.splice(index, 1);
    }
    localStorage.setItem('nearly_saved_posts', JSON.stringify(savedPosts));
  };

  const handleLike = async () => {
    // Check if already liked - only allow one like per user
    if (liked) {
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
    const text = `@${userName} `;
    setNewComment(text);
    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
        commentInputRef.current.setSelectionRange(text.length, text.length);
      }
    }, 100);
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
          </div>
        </div>

        {imageUrl && (
          <div className="w-full cursor-pointer" onClick={() => setLocation(`/activity/${id}`)}>
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-auto object-contain bg-black/5"
            />
          </div>
        )}

        <div className="px-4 pt-3">
          <div className="space-y-2 mb-3">
            {category && (
              <Badge variant="secondary" className="text-xs">
                {category}
              </Badge>
            )}
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {description && (
              <div>
                <p className={`text-sm text-foreground/90 ${!isExpanded ? "line-clamp-4" : ""}`}>
                  {description}
                </p>
                {description.length > 100 && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs font-medium text-muted-foreground mt-1 hover:text-foreground transition-colors"
                  >
                    {isExpanded ? "Show less" : "... See more"}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {startDate && (
              <div className="flex items-center gap-2 px-2.5 py-2 bg-secondary/20 rounded-lg border border-border/50">
                <div className="w-6 h-6 shrink-0 rounded-md bg-red-500/10 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5 text-red-500" />
                </div>
                <span className="text-xs font-medium text-foreground truncate">{startDate}</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-2 px-2.5 py-2 bg-secondary/20 rounded-lg border border-border/50">
                <div className="w-6 h-6 shrink-0 rounded-md bg-accent flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium text-foreground truncate">{location}</span>
              </div>
            )}
            {participantsCount !== undefined && (
              <div className="flex items-center gap-2 px-2.5 py-2 bg-secondary/20 rounded-lg border border-border/50">
                <div className="w-6 h-6 shrink-0 rounded-md bg-accent flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {participantsCount}/{maxParticipants || "∞"} attending
                </span>
              </div>
            )}
            {cost && (
              <div className="flex items-center gap-2 px-2.5 py-2 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="w-6 h-6 shrink-0 rounded-md bg-green-500/20 flex items-center justify-center">
                  <IndianRupee className="w-3.5 h-3.5 text-green-600" />
                </div>
                <span className="text-xs font-semibold text-green-600">{cost === "FREE" ? "Free" : cost}</span>
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
                <MessageCircle className="w-6 h-6 text-foreground" />
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
                View
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
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
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
                    const shareText = `Check out this activity: ${title}\n\n🔗 ${window.location.origin}/activity/${id}`;
                    // Send message to all selected targets
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
                        // For groups, would need group message API
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
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} - ${window.location.origin}/activity/${id}`)}`, '_blank');
                      setShowShareDialog(false);
                    }}
                  >
                    <WhatsAppIcon className="w-10 h-10 text-[#25D366]" />
                    <span className="text-xs text-muted-foreground">WhatsApp</span>
                  </button>
                  <button
                    className="flex flex-col items-center gap-1 p-2 hover:bg-muted/50 rounded-lg transition-colors"
                    onClick={() => {
                      window.open(`https://telegram.me/share/url?url=${encodeURIComponent(`${window.location.origin}/activity/${id}`)}&text=${encodeURIComponent(title)}`, '_blank');
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
                        navigator.share({ title, url: `${window.location.origin}/activity/${id}` });
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
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/activity/${id}`)}`, '_blank');
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
                  <ShareIcon className="w-4 h-4" />
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
    </>
  );
}
