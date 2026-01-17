import { useState, useRef, useEffect } from "react";
import { Heart, Bookmark, MoreHorizontal, MapPin, ChevronLeft, ChevronRight, Send, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { buildGatewayUrl } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";

// Instagram-style comment icon SVG
const CommentIcon = ({ className }: { className?: string }) => (
  <svg
    aria-label="Comment"
    className={className}
    fill="none"
    height="24"
    role="img"
    viewBox="0 0 24 24"
    width="24"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" strokeLinejoin="round"></path>
  </svg>
);

// Instagram-style share icon SVG
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
    strokeWidth="2"
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

interface PostCardProps {
  id: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  mediaUrls: string[];
  caption?: string;
  location?: string;
  likesCount: number;
  commentsCount: number;
  timeAgo: string;
  isOwnPost?: boolean;
}

export default function PostCard({
  id,
  author,
  mediaUrls,
  caption,
  location,
  likesCount,
  commentsCount,
  timeAgo,
  isOwnPost,
}: PostCardProps) {
  const [, setLocation] = useLocation();
  
  // Initialize liked state from localStorage
  const [isLiked, setIsLiked] = useState(() => {
    const likedPosts = JSON.parse(localStorage.getItem('nearly_liked_posts') || '[]');
    return likedPosts.includes(id);
  });
  
  // Initialize saved state from localStorage
  const [isSaved, setIsSaved] = useState(() => {
    const savedPosts = JSON.parse(localStorage.getItem('nearly_saved_posts') || '[]');
    return savedPosts.includes(id);
  });
  
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [localCommentsCount, setLocalCommentsCount] = useState(commentsCount);
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(null);
  const touchStartX = useRef<number | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';
  const { toast } = useToast();

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user", currentUserId],
    queryFn: () => api.getCurrentUser(),
    enabled: !!currentUserId,
  });

  // Fetch comments when dialog opens
  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ['post-comments', id],
    queryFn: () => api.getPostComments(id),
    enabled: showComments,
  });

  useEffect(() => {
    if (commentsData) {
      setComments(commentsData);
    }
  }, [commentsData]);

  // Helper function to resolve media URLs
  const resolveMediaUrl = (url: string): string => {
    if (!url) return '';

    // If URL is already absolute (starts with http/https), return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // If URL starts with /api/, it's a gateway URL that needs to be built
    if (url.startsWith('/api/')) {
      return buildGatewayUrl(url);
    }

    // If URL is relative, assume it's a gateway media URL
    if (url.startsWith('/')) {
      return buildGatewayUrl(url);
    }

    // For any other relative URLs, prefix with gateway
    return buildGatewayUrl(`/api/media/${url}`);
  };

  // Reset loading/error states when media changes
  useEffect(() => {
    if (mediaUrls.length > 0) {
      setMediaLoading(true);
      setMediaError(false);
    }
  }, [mediaUrls, currentMediaIndex]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      // Prevent multiple likes - only allow one per user
      if (isLiked) {
        throw new Error('Already liked');
      }
      return api.likePost(id, true);
    },
    onMutate: () => {
      if (isLiked) return; // Already liked
      
      setIsLiked(true);
      setLocalLikesCount(prev => prev + 1);
      
      // Persist to localStorage
      const likedPosts = JSON.parse(localStorage.getItem('nearly_liked_posts') || '[]');
      likedPosts.push(id);
      localStorage.setItem('nearly_liked_posts', JSON.stringify(likedPosts));
    },
    onError: () => {
      // Revert on error
      setIsLiked(false);
      setLocalLikesCount(prev => prev - 1);
      
      // Remove from localStorage
      const likedPosts = JSON.parse(localStorage.getItem('nearly_liked_posts') || '[]');
      const filtered = likedPosts.filter((postId: string) => postId !== id);
      localStorage.setItem('nearly_liked_posts', JSON.stringify(filtered));
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      return api.createPostComment(id, content, parentId);
    },
    onSuccess: (newComment) => {
      if (replyingTo) {
        // Add reply to parent comment
        setComments(prev => prev.map(comment => {
          if (comment.id === replyingTo.commentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), {
                id: Date.now().toString(),
                userId: currentUserId,
                userName: currentUser?.name || 'You',
                userAvatar: currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserId}`,
                content: newComment,
                createdAt: new Date().toISOString(),
                likesCount: 0,
              }]
            };
          }
          return comment;
        }));
      } else {
        // Add new top-level comment
        setComments(prev => [{
          id: Date.now().toString(),
          userId: currentUserId,
          userName: currentUser?.name || 'You',
          userAvatar: currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserId}`,
          content: newComment,
          createdAt: new Date().toISOString(),
          likesCount: 0,
          replies: [],
        }, ...prev]);
        setLocalCommentsCount(prev => prev + 1);
      }
      setNewComment("");
      setReplyingTo(null);
      refetchComments();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
    },
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentMediaIndex < mediaUrls.length - 1) {
        setCurrentMediaIndex(prev => prev + 1);
        setMediaLoading(true);
        setMediaError(false);
      } else if (diff < 0 && currentMediaIndex > 0) {
        setCurrentMediaIndex(prev => prev - 1);
        setMediaLoading(true);
        setMediaError(false);
      }
    }
    touchStartX.current = null;
  };

  const handleDoubleClick = () => {
    // Double click to like - only if not already liked
    if (!isLiked) {
      likeMutation.mutate();
    }
  };
  
  // Handle save with localStorage persistence
  const handleSavePost = () => {
    const newSaved = !isSaved;
    setIsSaved(newSaved);
    
    // Persist to localStorage
    const savedPosts = JSON.parse(localStorage.getItem('nearly_saved_posts') || '[]');
    if (newSaved) {
      savedPosts.push(id);
    } else {
      const index = savedPosts.indexOf(id);
      if (index > -1) savedPosts.splice(index, 1);
    }
    localStorage.setItem('nearly_saved_posts', JSON.stringify(savedPosts));
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${id}`;
    const shareData = {
      title: `Post by ${author.name}`,
      text: caption || 'Check out this post!',
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        setShowShareDialog(true);
      }
    } catch (error) {
      // User cancelled or error - show dialog
      setShowShareDialog(true);
    }
  };

  const copyLink = async () => {
    const shareUrl = `${window.location.origin}/post/${id}`;
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link copied!" });
    setShowShareDialog(false);
  };

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

  const truncatedCaption = caption && caption.length > 100 && !showFullCaption
    ? caption.slice(0, 100) + "..."
    : caption;

  // Helper function to determine if a URL is a video
  const isVideoUrl = (url: string): boolean => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v', '.3gp', '.mpg', '.mpeg'];
    const videoMimeTypes = ['video/mp4', 'video/webm', 'video/avi', 'video/mov', 'video/quicktime'];

    const lowerUrl = url.toLowerCase();
    const hasVideoExtension = videoExtensions.some(ext => lowerUrl.includes(ext));
    const hasVideoMimeType = videoMimeTypes.some(mime => lowerUrl.includes(mime));

    return hasVideoExtension || hasVideoMimeType;
  };

  return (
    <>
      <div className="bg-background border-b border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-3">
          <button 
            onClick={() => setLocation(`/profile/${author.username.replace('@', '')}`)}
            className="flex items-center gap-3"
          >
            <Avatar className="w-9 h-9 ring-2 ring-primary/20">
              <AvatarImage src={author.avatar} alt={author.name} />
              <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground leading-tight">{author.name}</p>
              {location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {location}
                </p>
              )}
            </div>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLocation(`/post/${id}`)}>
                View Post
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>Share</DropdownMenuItem>
              <DropdownMenuItem onClick={copyLink}>Copy Link</DropdownMenuItem>
              {isOwnPost && (
                <>
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                </>
              )}
              {!isOwnPost && (
                <DropdownMenuItem className="text-destructive">Report</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Media */}
        <div 
          className="relative aspect-square bg-muted"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
        >
          {mediaUrls.length > 0 ? (
            <>
              {isVideoUrl(resolveMediaUrl(mediaUrls[currentMediaIndex])) ? (
                <video
                  src={resolveMediaUrl(mediaUrls[currentMediaIndex])}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                  onLoadStart={() => setMediaLoading(true)}
                  onLoadedData={() => setMediaLoading(false)}
                  onError={() => {
                    setMediaLoading(false);
                    setMediaError(true);
                  }}
                />
              ) : (
                <img
                  src={resolveMediaUrl(mediaUrls[currentMediaIndex])}
                  alt="Post"
                  className="w-full h-full object-cover"
                  onLoad={() => setMediaLoading(false)}
                  onError={() => {
                    setMediaLoading(false);
                    setMediaError(true);
                  }}
                  style={{ display: mediaLoading ? 'none' : 'block' }}
                />
              )}

              {/* Loading overlay */}
              {mediaLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              {/* Error fallback */}
              {mediaError && !mediaLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground">
                  <div className="text-sm mb-2">Media failed to load</div>
                  <button
                    onClick={() => {
                      setMediaError(false);
                      setMediaLoading(true);
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Try again
                  </button>
                </div>
              )}
              
              {/* Media Navigation */}
              {mediaUrls.length > 1 && (
                <>
                  {/* Dots indicator */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                    {Array.from({ length: mediaUrls.length }, (_, idx) => (
                      <div
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          idx === currentMediaIndex
                            ? "bg-white w-2"
                            : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Navigation arrows */}
                  {currentMediaIndex > 0 && (
                    <button
                      onClick={() => {
                        setCurrentMediaIndex(prev => prev - 1);
                        setMediaLoading(true);
                        setMediaError(false);
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  {currentMediaIndex < mediaUrls.length - 1 && (
                    <button
                      onClick={() => {
                        setCurrentMediaIndex(prev => prev + 1);
                        setMediaLoading(true);
                        setMediaError(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}

                  {/* Counter */}
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/50 text-white text-xs">
                    {currentMediaIndex + 1}/{mediaUrls.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No media
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => !isLiked && likeMutation.mutate()}
                className={`flex items-center gap-1 group ${isLiked ? 'cursor-default' : ''}`}
                data-testid="like-button"
                disabled={isLiked}
              >
                <Heart
                  className={`w-6 h-6 transition-all ${
                    isLiked
                      ? "fill-red-500 text-red-500"
                      : "text-foreground group-hover:text-red-500"
                  }`}
                />
              </button>
              <button
                onClick={() => setShowComments(true)}
                className="flex items-center gap-1 group"
              >
                <CommentIcon className="w-6 h-6 text-foreground group-hover:text-primary" />
              </button>
              <button 
                onClick={handleShare}
                className="flex items-center gap-1 group"
              >
                <ShareIcon className="w-6 h-6 text-foreground group-hover:text-primary" />
              </button>
            </div>
            <button
              onClick={handleSavePost}
              data-testid="save-button"
            >
              <Bookmark
                className={`w-6 h-6 transition-all ${
                  isSaved
                    ? "fill-foreground text-foreground"
                    : "text-foreground hover:text-primary"
                }`}
              />
            </button>
          </div>

          {/* Likes */}
          {localLikesCount > 0 && (
            <p className="text-sm font-semibold mb-1">
              {localLikesCount.toLocaleString()} {localLikesCount === 1 ? "like" : "likes"}
            </p>
          )}

          {/* Caption */}
          {caption && (
            <div className="text-sm mb-1">
              <span className="font-semibold mr-2">{author.name}</span>
              <span className="text-foreground/90">
                {truncatedCaption}
                {caption.length > 100 && !showFullCaption && (
                  <button
                    onClick={() => setShowFullCaption(true)}
                    className="text-muted-foreground ml-1"
                  >
                    more
                  </button>
                )}
              </span>
            </div>
          )}

          {/* Comments preview */}
          {localCommentsCount > 0 && (
            <button
              onClick={() => setShowComments(true)}
              className="text-sm text-muted-foreground mb-1"
            >
              View all {localCommentsCount} comments
            </button>
          )}

          {/* Quick comment input */}
          <div className="flex items-center gap-2 mt-2">
            <Avatar className="w-7 h-7">
              <AvatarImage src={currentUser?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserId}`} />
              <AvatarFallback>{currentUser?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => setShowComments(true)}
              className="text-sm text-muted-foreground flex-1 text-left"
            >
              Add a comment...
            </button>
          </div>

          {/* Timestamp */}
          <p className="text-xs text-muted-foreground uppercase mt-2">{timeAgo}</p>
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
                      <AvatarImage src={comment.userAvatar} />
                      <AvatarFallback>{comment.userName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span 
                          className="font-semibold mr-2 cursor-pointer hover:underline"
                          onClick={() => setLocation(`/profile/${comment.userId}`)}
                        >
                          {comment.userName}
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
            <DialogTitle className="text-center">Share Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={copyLink}
            >
              <Send className="w-5 h-5" />
              Copy Link
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={() => {
                window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/post/${id}`)}`, '_blank');
                setShowShareDialog(false);
              }}
            >
              Share to Twitter
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={() => {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/post/${id}`)}`, '_blank');
                setShowShareDialog(false);
              }}
            >
              Share to Facebook
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
