import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { 
  ArrowLeft, Heart, Send, Volume2, VolumeX, 
  Play, Pause, MessageCircle, Share2, X,
  MoreHorizontal, Bookmark, Flag, Trash2,
  ChevronUp, ChevronDown, Music2, Loader2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { shotsApi, userApi, notificationApi } from "@/lib/gateway-api";
import { cn } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// Types
interface ShotUser {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  isVerified?: boolean;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
  parentCommentId?: string;
}

interface Shot {
  id: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  musicId?: string;
  musicTitle?: string;
  duration?: number;
  visibility?: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  user?: ShotUser;
  isLiked?: boolean;
  isSaved?: boolean;
}

// Format number
const formatCount = (count: number): string => {
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
  return count.toString();
};

// Time ago helper
const getTimeAgo = (date: string) => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

export default function ShotDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id || localStorage.getItem('nearly_user_id') || '';

  // State
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Fetch shot
  const { data: shot, isLoading, error } = useQuery({
    queryKey: ['shot', id],
    queryFn: async () => {
      if (!id) throw new Error("No shot ID");
      const shotData = await shotsApi.getShot(id);
      
      // Fetch user data
      let shotUser: ShotUser | undefined;
      try {
        const userData = await userApi.getUser(shotData.userId);
        shotUser = {
          id: userData.id,
          username: userData.username || 'unknown',
          name: userData.name || 'Unknown User',
          avatarUrl: userData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.id}`,
          isVerified: userData.isVerified || false,
        };
      } catch {
        shotUser = {
          id: shotData.userId,
          username: 'unknown',
          name: 'Unknown User',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${shotData.userId}`,
        };
      }
      
      // Check local storage for liked/saved state
      const likedShots = JSON.parse(localStorage.getItem('nearly_liked_shots') || '[]');
      const savedShots = JSON.parse(localStorage.getItem('nearly_saved_shots') || '[]');
      
      return {
        ...shotData,
        user: shotUser,
        isLiked: likedShots.includes(shotData.id),
        isSaved: savedShots.includes(shotData.id),
      } as Shot;
    },
    enabled: !!id,
  });

  // Initialize state from shot data
  useEffect(() => {
    if (shot) {
      setIsLiked(shot.isLiked || false);
      setLikesCount(shot.likesCount || 0);
      setIsSaved(shot.isSaved || false);
      
      // Track view
      shotsApi.viewShot(shot.id).catch(() => {});
    }
  }, [shot]);

  // Fetch comments
  useEffect(() => {
    if (id && showComments) {
      shotsApi.getComments(id).then(async (fetchedComments) => {
        const mappedComments: Comment[] = await Promise.all(
          fetchedComments.map(async (c: any) => {
            let userName = c.userName || 'User';
            let userAvatar = c.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.userId}`;
            
            if (!c.userName) {
              try {
                const userData = await userApi.getUser(c.userId);
                userName = userData.name || userData.username || 'User';
                userAvatar = userData.avatarUrl || userAvatar;
              } catch {}
            }
            
            return {
              id: c.id,
              userId: c.userId,
              userName,
              userAvatar,
              content: c.content,
              createdAt: c.createdAt,
              likesCount: c.likesCount || 0,
              isLiked: false,
              parentCommentId: c.parentCommentId,
            };
          })
        );
        setComments(mappedComments);
      }).catch(() => setComments([]));
    }
  }, [id, showComments]);

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!shot) return;
      await shotsApi.likeShot(shot.id);
      
      if (shot.userId !== userId) {
        await notificationApi.createNotification({
          userId: shot.userId,
          type: 'shot_like',
          title: 'New Like',
          description: 'liked your shot',
          relatedId: userId,
          entityId: shot.id,
          actionUrl: `/shot/${shot.id}`,
        });
      }
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentCommentId }: { content: string; parentCommentId?: string }) => {
      if (!shot) throw new Error("No shot");
      const result = await shotsApi.addComment(shot.id, content, parentCommentId);
      
      if (shot.userId !== userId) {
        await notificationApi.createNotification({
          userId: shot.userId,
          type: parentCommentId ? 'comment_reply' : 'shot_comment',
          title: parentCommentId ? 'New Reply' : 'New Comment',
          description: content.substring(0, 100),
          relatedId: userId,
          entityId: shot.id,
          actionUrl: `/shot/${shot.id}`,
        });
      }
      
      return result;
    },
    onSuccess: (result) => {
      if (result && result.id) {
        const newCommentObj: Comment = {
          id: result.id,
          userId: userId,
          userName: user?.name || user?.username || 'You',
          userAvatar: user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          content: result.content,
          createdAt: result.createdAt || new Date().toISOString(),
          likesCount: 0,
          parentCommentId: result.parentCommentId,
        };
        setComments(prev => [...prev, newCommentObj]);
      }
      setNewComment("");
      setReplyingTo(null);
      toast({ title: "Comment posted!" });
    },
    onError: () => {
      toast({ title: "Failed to post comment", variant: "destructive" });
    },
  });

  const handleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikesCount(prev => prev - 1);
      const likedShots = JSON.parse(localStorage.getItem('nearly_liked_shots') || '[]');
      localStorage.setItem('nearly_liked_shots', JSON.stringify(likedShots.filter((sid: string) => sid !== shot?.id)));
    } else {
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
      const likedShots = JSON.parse(localStorage.getItem('nearly_liked_shots') || '[]');
      if (!likedShots.includes(shot?.id)) {
        likedShots.push(shot?.id);
        localStorage.setItem('nearly_liked_shots', JSON.stringify(likedShots));
      }
      likeMutation.mutate();
    }
  };

  const handleSave = () => {
    if (isSaved) {
      setIsSaved(false);
      const savedShots = JSON.parse(localStorage.getItem('nearly_saved_shots') || '[]');
      localStorage.setItem('nearly_saved_shots', JSON.stringify(savedShots.filter((sid: string) => sid !== shot?.id)));
    } else {
      setIsSaved(true);
      const savedShots = JSON.parse(localStorage.getItem('nearly_saved_shots') || '[]');
      if (!savedShots.includes(shot?.id)) {
        savedShots.push(shot?.id);
        localStorage.setItem('nearly_saved_shots', JSON.stringify(savedShots));
      }
      toast({ title: "Shot saved!" });
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const handlePostComment = () => {
    if (!newComment.trim()) return;
    commentMutation.mutate({
      content: newComment,
      parentCommentId: replyingTo?.commentId,
    });
  };

  const handleReply = (commentId: string, userName: string) => {
    setReplyingTo({ commentId, userName });
    setNewComment(`@${userName} `);
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedReplies(newExpanded);
  };

  const copyShareLink = async () => {
    if (shot) {
      await navigator.clipboard.writeText(`${window.location.origin}/shot/${shot.id}`);
      toast({ title: "Link copied!" });
      setShowShare(false);
      shotsApi.shareShot(shot.id).catch(() => {});
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  // Error state
  if (error || !shot) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Shot not found</h2>
          <p className="text-muted-foreground mb-4">This shot may have been deleted</p>
          <Button onClick={() => setLocation('/shots')}>
            Back to Shots
          </Button>
        </div>
      </div>
    );
  }

  // Group comments
  const parentComments = comments.filter(c => !c.parentCommentId);
  const repliesMap = comments.reduce((acc, comment) => {
    if (comment.parentCommentId) {
      if (!acc[comment.parentCommentId]) {
        acc[comment.parentCommentId] = [];
      }
      acc[comment.parentCommentId].push(comment);
    }
    return acc;
  }, {} as Record<string, Comment[]>);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setLocation('/shots')}
            className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                <MoreHorizontal className="w-5 h-5 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleSave}>
                <Bookmark className="w-4 h-4 mr-2" />
                {isSaved ? 'Unsave' : 'Save'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowShare(true)}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-500">
                <Flag className="w-4 h-4 mr-2" />
                Report
              </DropdownMenuItem>
              {shot.userId === userId && (
                <DropdownMenuItem className="text-red-500">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Video */}
      <div className="relative w-full h-screen">
        {/* Placeholder gradient when no thumbnail */}
        {!shot.thumbnailUrl && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0" />
        )}
        <video
          ref={videoRef}
          src={shot.videoUrl}
          className="w-full h-full object-cover"
          loop
          autoPlay
          muted={isMuted}
          playsInline
          preload="metadata"
          poster={shot.thumbnailUrl || undefined}
          onClick={togglePlay}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none" />

        {/* Play indicator */}
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
              <Play className="w-10 h-10 text-white ml-1" />
            </div>
          </div>
        )}

        {/* Right Actions */}
        <div className="absolute right-4 bottom-32 flex flex-col items-center gap-5 z-20">
          {/* Like */}
          <button onClick={handleLike} className="flex flex-col items-center">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              isLiked ? "bg-rose-500/20" : "bg-black/40"
            )}>
              <Heart className={cn(
                "w-7 h-7",
                isLiked ? "fill-rose-500 text-rose-500" : "text-white"
              )} />
            </div>
            <span className="text-white text-xs font-medium mt-1">{formatCount(likesCount)}</span>
          </button>

          {/* Comment */}
          <button onClick={() => setShowComments(true)} className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <span className="text-white text-xs font-medium mt-1">{formatCount(shot.commentsCount)}</span>
          </button>

          {/* Save */}
          <button onClick={handleSave} className="flex flex-col items-center">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              isSaved ? "bg-amber-500/20" : "bg-black/40"
            )}>
              <Bookmark className={cn(
                "w-7 h-7",
                isSaved ? "fill-amber-500 text-amber-500" : "text-white"
              )} />
            </div>
          </button>

          {/* Share */}
          <button onClick={() => setShowShare(true)} className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center">
              <Share2 className="w-7 h-7 text-white" />
            </div>
            <span className="text-white text-xs font-medium mt-1">{formatCount(shot.sharesCount)}</span>
          </button>

          {/* Mute */}
          <button onClick={() => setIsMuted(!isMuted)}>
            <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </div>
          </button>
        </div>

        {/* Bottom Content */}
        <div className="absolute bottom-6 left-0 right-20 p-4 z-20">
          {/* User Info */}
          <button 
            onClick={() => setLocation(`/profile/${shot.user?.username || shot.userId}`)}
            className="flex items-center gap-3 mb-3"
          >
            <Avatar className="w-11 h-11 ring-2 ring-white">
              <AvatarImage src={shot.user?.avatarUrl} />
              <AvatarFallback className="bg-gradient-to-br from-rose-500 to-purple-600 text-white font-bold">
                {shot.user?.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <div className="flex items-center gap-1">
                <span className="text-white font-bold">@{shot.user?.username}</span>
                {shot.user?.isVerified && (
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px]">✓</span>
                  </div>
                )}
              </div>
              <span className="text-white/60 text-xs">{getTimeAgo(shot.createdAt)}</span>
            </div>
          </button>

          {/* Caption */}
          {shot.caption && (
            <p className="text-white text-sm leading-relaxed mb-3">
              {shot.caption}
            </p>
          )}

          {/* Music */}
          {shot.musicTitle && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
                <Music2 className="w-3 h-3 text-white" />
                <span className="text-white text-xs truncate max-w-[200px]">
                  {shot.musicTitle}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comments Dialog */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-md h-[70vh] flex flex-col p-0 bg-background rounded-t-3xl">
          <DialogHeader className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="w-8" />
              <DialogTitle className="text-center font-bold">
                {comments.length} Comments
              </DialogTitle>
              <button onClick={() => setShowComments(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {parentComments.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground font-medium">No comments yet</p>
                <p className="text-sm text-muted-foreground/70">Be the first to comment!</p>
              </div>
            ) : (
              parentComments.map((comment) => {
                const replies = repliesMap[comment.id] || [];
                const isExpanded = expandedReplies.has(comment.id);
                
                return (
                  <div key={comment.id} className="space-y-3">
                    <div className="flex gap-3">
                      <Avatar 
                        className="w-10 h-10 flex-shrink-0 cursor-pointer"
                        onClick={() => setLocation(`/profile/${comment.userId}`)}
                      >
                        <AvatarImage src={comment.userAvatar} />
                        <AvatarFallback>{comment.userName?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{comment.userName}</span>
                          <span className="text-xs text-muted-foreground">{getTimeAgo(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm mt-1">{comment.content}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <button className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Heart className="w-4 h-4" />
                            {comment.likesCount > 0 && comment.likesCount}
                          </button>
                          <button 
                            className="text-xs font-medium text-muted-foreground"
                            onClick={() => handleReply(comment.id, comment.userName)}
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>

                    {replies.length > 0 && (
                      <div className="ml-12 space-y-3">
                        <button
                          onClick={() => toggleReplies(comment.id)}
                          className="flex items-center gap-2 text-xs font-medium text-primary"
                        >
                          <div className="w-6 h-[1px] bg-muted-foreground/30" />
                          {isExpanded ? (
                            <>Hide replies <ChevronUp className="w-3 h-3" /></>
                          ) : (
                            <>View {replies.length} replies <ChevronDown className="w-3 h-3" /></>
                          )}
                        </button>

                        {isExpanded && replies.map((reply) => (
                          <div key={reply.id} className="flex gap-3">
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarImage src={reply.userAvatar} />
                              <AvatarFallback>{reply.userName?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{reply.userName}</span>
                                <span className="text-xs text-muted-foreground">{getTimeAgo(reply.createdAt)}</span>
                              </div>
                              <p className="text-sm mt-1">{reply.content}</p>
                              <div className="flex items-center gap-4 mt-2">
                                <button className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Heart className="w-3 h-3" />
                                  {reply.likesCount > 0 && reply.likesCount}
                                </button>
                                <button 
                                  className="text-xs font-medium text-muted-foreground"
                                  onClick={() => handleReply(comment.id, reply.userName)}
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Comment input */}
          <div className="border-t border-border p-3 bg-background">
            {replyingTo && (
              <div className="flex items-center justify-between mb-2 px-3 py-2 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">
                  Replying to <span className="font-semibold text-foreground">@{replyingTo.userName}</span>
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
              <Avatar className="w-9 h-9">
                <AvatarImage src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`} />
                <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-4">
                <Input
                  ref={commentInputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 px-0"
                  onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                />
                <button
                  onClick={handlePostComment}
                  disabled={!newComment.trim() || commentMutation.isPending}
                  className="text-primary font-semibold text-sm disabled:opacity-50"
                >
                  {commentMutation.isPending ? "..." : "Post"}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShare} onOpenChange={setShowShare}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Share Shot</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-4 py-4">
            <button 
              onClick={() => {
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shot.caption || 'Check out this shot!'} ${window.location.origin}/shot/${shot.id}`)}`, '_blank');
                setShowShare(false);
              }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
                <Send className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs">WhatsApp</span>
            </button>
            <button 
              onClick={() => {
                window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/shot/${shot.id}`)}&text=${encodeURIComponent(shot.caption || '')}`, '_blank');
                setShowShare(false);
              }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-full bg-sky-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">𝕏</span>
              </div>
              <span className="text-xs">Twitter</span>
            </button>
            <button 
              onClick={() => {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/shot/${shot.id}`)}`, '_blank');
                setShowShare(false);
              }}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-xl">f</span>
              </div>
              <span className="text-xs">Facebook</span>
            </button>
            <button 
              onClick={copyShareLink}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Share2 className="w-6 h-6" />
              </div>
              <span className="text-xs">Copy Link</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
