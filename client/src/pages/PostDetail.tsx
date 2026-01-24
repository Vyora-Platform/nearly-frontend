import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Heart, MessageCircle, Share, Bookmark, MoreHorizontal, X, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { authFetch } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Helper to enrich post data with defaults
const enrichPostData = (activity: any, user: any) => ({
  id: activity.id,
  userId: activity.userId,
  username: user?.username || `user_${activity.userId}`,
  name: user?.name || 'Unknown',
  avatarUrl: user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.userId}`,
  imageUrl: activity.imageUrl || '',
  type: activity.type || 'image',
  title: activity.title,
  subtitle: activity.location,
  caption: activity.description || '',
  likesCount: activity.likesCount || 0,
  commentsCount: activity.commentsCount || 0,
  createdAt: activity.createdAt,
  isLiked: false,
  isBookmarked: false,
});

export default function PostDetail() {
  const [, params] = useRoute("/post/:id");
  const [, setLocation] = useLocation();
  const postId = params?.id;

  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';

  // Fetch the activity/post
  const { data: activity, isLoading, error } = useQuery({
    queryKey: ['activity', postId],
    queryFn: () => api.getActivity(postId || ''),
    enabled: !!postId,
  });

  // Fetch activity author
  const { data: activityUser } = useQuery({
    queryKey: ['user', activity?.userId],
    queryFn: () => api.getUser(activity?.userId || ''),
    enabled: !!activity?.userId,
  });

  // Fetch comments and enrich with user data
  const { data: rawComments = [], refetch: refetchComments } = useQuery({
    queryKey: ['activity-comments', postId],
    queryFn: async () => {
      try {
        const fetchedComments = await api.getActivityComments(postId || '');
        const enrichedComments = await Promise.all(
          fetchedComments.map(async (c: any) => {
            let userName = c.userName || 'User';
            let userAvatar = c.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.userId}`;

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
    enabled: !!postId,
  });

  // Organize comments into threads
  const organizedComments = (() => {
    const parentComments: any[] = [];
    const repliesMap: Record<string, any[]> = {};

    rawComments.forEach((c: any) => {
      const comment = {
        ...c,
        userName: c.userName,
        userAvatar: c.userAvatar,
        replies: []
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
      parent.replies.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    return parentComments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  })();

  // Enrich post data
  const post = activity ? enrichPostData(activity, activityUser) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading post...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Post not found</p>
          <Button onClick={() => setLocation("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  // Get user data
  const { data: user } = useQuery({
    queryKey: ["/api/users/username", post?.username],
    queryFn: () => api.getUserByUsername(post?.username || ""),
    enabled: !!post?.username,
  });

  const handleLike = () => {
    // In a real app, this would call an API
    console.log("Like post:", postId);
  };

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const res = await authFetch(`/api/activities/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, userId: currentUserId, parentCommentId: parentId })
      });
      return res.json();
    },
    onSuccess: () => {
      setNewComment("");
      setReplyingTo(null);
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ["activity", postId] });
    },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const handleReply = (commentId: string, userName: string) => {
    setReplyingTo({ id: commentId, userName });
    const text = `@${userName} `;
    setNewComment(text);
    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
        commentInputRef.current.setSelectionRange(text.length, text.length);
      }
    }, 100);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment("");
  };

  const handleComment = () => {
    if (!newComment.trim()) return;
    commentMutation.mutate({
      content: newComment,
      parentId: replyingTo?.id
    });
  };

  const handleShare = () => {
    // In a real app, this would open share dialog
    navigator.share?.({
      title: "Check out this post",
      url: window.location.href,
    }).catch(() => {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    });
  };

  const handleBookmark = () => {
    // In a real app, this would toggle bookmark
    console.log("Bookmark post:", postId);
  };

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Post not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => setLocation(`/profile/${post.username}`)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={post.avatarUrl} />
              <AvatarFallback>{post.name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{post.name}</p>
              <p className="text-xs text-muted-foreground">@{post.username}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto">
        {/* Post Content */}
        <div className="relative">
          <img
            src={post.imageUrl}
            alt="Post"
            className="w-full aspect-square object-cover"
          />


          {/* Post type overlay */}
          {post.type === "activity" && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
              <h3 className="text-white text-lg font-bold">{post.title}</h3>
              <p className="text-white/90 text-sm">{post.subtitle}</p>
            </div>
          )}

          {post.type === "poll" && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
              <h3 className="text-white text-lg font-bold">{post.title}</h3>
              <p className="text-white/90 text-sm">{post.subtitle}</p>
              <div className="mt-2 space-y-1">
                {post.options?.map((option, index) => (
                  <div key={index} className="text-white/80 text-sm">
                    {option}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className="flex items-center gap-1 text-muted-foreground hover:text-red-500 transition-colors"
            >
              <Heart className="w-6 h-6" />
              <span className="text-sm">{post.likesCount}</span>
            </button>
            <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="w-6 h-6" />
              <span className="text-sm">{post.commentsCount}</span>
            </button>
            <button
              onClick={handleShare}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Share className="w-6 h-6" />
            </button>
          </div>
          <button
            onClick={handleBookmark}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bookmark className="w-6 h-6" />
          </button>
        </div>

        {/* Caption */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={post.avatarUrl} />
              <AvatarFallback>{post.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-medium mr-2">{post.username}</span>
                {post.caption}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="p-4">
          <h3 className="font-medium text-sm mb-4">
            Comments ({rawComments.length})
          </h3>

          {/* Comment Input */}
          <div className="space-y-2 mb-4">
            {replyingTo && (
              <div className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-lg text-sm mb-2">
                <span className="text-muted-foreground">Replying to <span className="font-semibold text-foreground">@{replyingTo.userName}</span></span>
                <button onClick={cancelReply} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserId}`} />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Textarea
                  ref={commentInputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={replyingTo ? `Reply to @${replyingTo.userName}...` : "Add a comment..."}
                  className="min-h-[40px] resize-none"
                  rows={1}
                />
                <Button
                  onClick={handleComment}
                  disabled={!newComment.trim() || commentMutation.isPending}
                  size="sm"
                  className="self-end"
                >
                  Post
                </Button>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {organizedComments.length === 0 ? (
              <p className="text-muted-foreground text-center text-sm py-4">No comments yet</p>
            ) : (
              organizedComments.map((comment: any) => (
                <div key={comment.id} className="space-y-3">
                  {/* Parent */}
                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={comment.userAvatar} />
                      <AvatarFallback>{comment.userName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium mr-2">{comment.userName}</span>
                        {comment.content}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {comment.likesCount || 0} likes
                        </span>
                        <button
                          onClick={() => handleReply(comment.id, comment.userName)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <Reply className="w-3 h-3" /> Reply
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-11 space-y-3 border-l-2 border-muted pl-4">
                      {comment.replies.map((reply: any) => (
                        <div key={reply.id} className="flex gap-3">
                          <Avatar className="w-6 h-6 flex-shrink-0">
                            <AvatarImage src={reply.userAvatar} />
                            <AvatarFallback>{reply.userName?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm">
                              <span className="font-medium mr-2">{reply.userName}</span>
                              {reply.content}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {new Date(reply.createdAt).toLocaleDateString()}
                              </span>
                              <button
                                onClick={() => handleReply(comment.id, reply.userName)}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                              >
                                <Reply className="w-3 h-3" /> Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
