import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Heart, MessageCircle, Share, Bookmark, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
  const [comments, setComments] = useState<any[]>([]);

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

  // Fetch comments for the activity
  const { data: commentsData } = useQuery({
    queryKey: ['activity-comments', postId],
    queryFn: () => api.getActivityComments(postId || ''),
    enabled: !!postId,
  });

  // Update comments when data loads
  useEffect(() => {
    if (commentsData) {
      setComments(commentsData);
    }
  }, [commentsData]);

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

  const handleComment = () => {
    if (!newComment.trim()) return;

    const currentUserId = localStorage.getItem('nearly_user_id') || '';
    const currentUsername = localStorage.getItem('nearly_username') || 'user';
    
    const comment = {
      id: Date.now().toString(),
      userId: currentUserId,
      username: currentUsername,
      name: currentUsername,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserId}`,
      content: newComment,
      createdAt: new Date().toISOString(),
      likesCount: 0,
    };

    setComments(prev => [comment, ...prev]);
    setNewComment("");
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
            Comments ({comments.length})
          </h3>

          {/* Comment Input */}
          <div className="flex gap-3 mb-4">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=current" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="min-h-[40px] resize-none"
                rows={1}
              />
              <Button
                onClick={handleComment}
                disabled={!newComment.trim()}
                size="sm"
                className="self-end"
              >
                Post
              </Button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={comment.avatarUrl} />
                  <AvatarFallback>{comment.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium mr-2">{comment.username}</span>
                    {comment.content}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                    <button className="text-xs text-muted-foreground hover:text-foreground">
                      {comment.likesCount} likes
                    </button>
                    <button className="text-xs text-muted-foreground hover:text-foreground">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
