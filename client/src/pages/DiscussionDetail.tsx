import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { authFetch } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Send, Eye, MessageSquareMore, Loader2, Reply, X
} from "lucide-react";

interface DiscussionComment {
  id: string;
  discussionId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  content: string;
  parentCommentId?: string;
  likesCount?: number;
  createdAt: string;
  replies?: DiscussionComment[];
}

export default function DiscussionDetail() {
  const [, params] = useRoute("/discussion/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const discussionId = params?.id || "";
  const currentUserId = localStorage.getItem('nearly_user_id') || '';
  const [comment, setComment] = useState("");
  const [hasLiked, setHasLiked] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Load liked/saved status from localStorage
  useEffect(() => {
    const likedDiscussions = JSON.parse(localStorage.getItem('nearly_liked_discussions') || '[]');
    const savedDiscussions = JSON.parse(localStorage.getItem('nearly_saved_discussions') || '[]');
    setHasLiked(likedDiscussions.includes(discussionId));
    setHasSaved(savedDiscussions.includes(discussionId));
  }, [discussionId]);

  // Fetch discussion
  const { data: discussion, isLoading } = useQuery({
    queryKey: ["discussion", discussionId],
    queryFn: () => api.getDiscussion(discussionId),
    enabled: !!discussionId,
  });

  // Fetch author
  const { data: author } = useQuery({
    queryKey: ["user", discussion?.userId],
    queryFn: () => api.getUser(discussion?.userId),
    enabled: !!discussion?.userId,
  });

  // Fetch comments
  const { data: rawComments = [] } = useQuery({
    queryKey: ["discussion-comments", discussionId],
    queryFn: () => api.getDiscussionComments(discussionId),
    enabled: !!discussionId,
  });

  // Organize comments into threads
  const organizedComments = (() => {
    const parentComments: DiscussionComment[] = [];
    const repliesMap: Record<string, DiscussionComment[]> = {};

    rawComments.forEach((c: any) => {
      const comment: DiscussionComment = {
        ...c,
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
    });

    return parentComments;
  })();

  // Track view on mount
  useEffect(() => {
    if (discussionId) {
      authFetch(`/api/discussions/${discussionId}/view`, {
        method: 'POST',
        body: JSON.stringify({ userId: currentUserId })
      }).catch(() => {});
    }
  }, [discussionId, currentUserId]);

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (hasLiked) return { success: false };
      return api.likeDiscussion(discussionId, true);
    },
    onSuccess: () => {
      if (!hasLiked) {
        const likedDiscussions = JSON.parse(localStorage.getItem('nearly_liked_discussions') || '[]');
        likedDiscussions.push(discussionId);
        localStorage.setItem('nearly_liked_discussions', JSON.stringify(likedDiscussions));
        setHasLiked(true);
        queryClient.invalidateQueries({ queryKey: ["discussion", discussionId] });
        toast({ title: "Liked!" });
      }
    },
  });

  // Comment mutation with reply support
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentCommentId }: { content: string; parentCommentId?: string }) => {
      const res = await authFetch(`/api/discussions/${discussionId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, userId: currentUserId, parentCommentId }),
      });
      return res.json();
    },
    onSuccess: () => {
      setComment("");
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ["discussion-comments", discussionId] });
      queryClient.invalidateQueries({ queryKey: ["discussion", discussionId] });
      toast({ title: replyingTo ? "Reply added!" : "Comment added!" });
    },
    onError: () => {
      toast({ title: "Failed to post comment", variant: "destructive" });
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

  const handleSubmitComment = () => {
    if (!comment.trim()) return;
    commentMutation.mutate({
      content: comment,
      parentCommentId: replyingTo?.id,
    });
  };

  const handleSave = () => {
    const savedDiscussions = JSON.parse(localStorage.getItem('nearly_saved_discussions') || '[]');
    if (hasSaved) {
      const filtered = savedDiscussions.filter((id: string) => id !== discussionId);
      localStorage.setItem('nearly_saved_discussions', JSON.stringify(filtered));
      setHasSaved(false);
      toast({ title: "Removed from saved" });
    } else {
      savedDiscussions.push(discussionId);
      localStorage.setItem('nearly_saved_discussions', JSON.stringify(savedDiscussions));
      setHasSaved(true);
      toast({ title: "Saved!" });
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/discussion/${discussionId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: discussion?.title, url: shareUrl });
      } catch {
        navigator.clipboard.writeText(shareUrl);
        toast({ title: "Link copied!" });
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied!" });
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Discussion not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => setLocation("/")} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Discussion</h1>
          <button className="p-1">
            <MoreHorizontal className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Author Info */}
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={author?.avatarUrl} />
            <AvatarFallback>{author?.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-semibold">{author?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground">{getTimeAgo(discussion.createdAt)}</p>
          </div>
          {discussion.category && (
            <Badge variant="secondary">{discussion.category}</Badge>
          )}
        </div>

        {/* Discussion Icon */}
        <div className="flex items-center gap-2 text-primary">
          <MessageSquareMore className="w-5 h-5" />
          <span className="font-medium">Discussion</span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold">{discussion.title}</h1>

        {/* Content */}
        {discussion.content && (
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground whitespace-pre-wrap">{discussion.content}</p>
          </div>
        )}

        {/* Tags */}
        {discussion.tags && discussion.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {discussion.tags.map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 py-3 border-y border-border">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Eye className="w-4 h-4" />
            <span className="text-sm">{discussion.viewsCount || 0} views</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">{discussion.commentsCount || rawComments.length} discusses</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between py-3">
          <button 
            onClick={() => !hasLiked && likeMutation.mutate()}
            className={`flex items-center gap-2 ${hasLiked ? 'text-red-500' : 'text-muted-foreground'}`}
            disabled={hasLiked}
          >
            <Heart className={`w-6 h-6 ${hasLiked ? 'fill-current' : ''}`} />
            <span>{discussion.likesCount || 0}</span>
          </button>
          <button className="flex items-center gap-2 text-muted-foreground">
            <MessageCircle className="w-6 h-6" />
            <span>{rawComments.length}</span>
          </button>
          <button onClick={handleShare} className="text-muted-foreground">
            <Share2 className="w-6 h-6" />
          </button>
          <button onClick={handleSave} className={hasSaved ? 'text-primary' : 'text-muted-foreground'}>
            <Bookmark className={`w-6 h-6 ${hasSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Comments Section */}
        <div className="space-y-4">
          <h3 className="font-semibold">Discuss ({rawComments.length})</h3>
          
          {/* Add Comment */}
          <div className="space-y-2">
            {replyingTo && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                <Reply className="w-4 h-4" />
                <span>Replying to <span className="font-semibold text-foreground">@{replyingTo.userName}</span></span>
                <button onClick={cancelReply} className="ml-auto hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserId}`} />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <Input
                ref={commentInputRef}
                placeholder={replyingTo ? `Reply to @${replyingTo.userName}...` : "Add to discussion..."}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && comment.trim() && handleSubmitComment()}
              />
              <Button 
                size="sm" 
                onClick={handleSubmitComment}
                disabled={!comment.trim() || commentMutation.isPending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Comments List with Replies */}
          {organizedComments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No discussions yet. Be the first to discuss!</p>
          ) : (
            organizedComments.map((c) => (
              <div key={c.id} className="space-y-3">
                {/* Parent Comment */}
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={c.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.userId}`} />
                    <AvatarFallback>{c.userName?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{c.userName || 'User'}</span>
                      <span className="text-xs text-muted-foreground">{getTimeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-sm">{c.content}</p>
                    <div className="flex items-center gap-4 mt-1">
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
                  <div className="ml-11 space-y-3 border-l-2 border-muted pl-4">
                    {c.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={reply.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.userId}`} />
                          <AvatarFallback>{reply.userName?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{reply.userName || 'User'}</span>
                            <span className="text-xs text-muted-foreground">{getTimeAgo(reply.createdAt)}</span>
                          </div>
                          <p className="text-xs">{reply.content}</p>
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
