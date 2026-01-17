import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { newsApi } from "@/lib/gateway-api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Send, Eye, ThumbsUp, ThumbsDown, Loader2, Reply, X
} from "lucide-react";

interface NewsComment {
  id: string;
  newsId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  content: string;
  parentCommentId?: string;
  likesCount: number;
  createdAt: string;
  replies?: NewsComment[];
}

export default function NewsDetail() {
  const [, params] = useRoute("/news/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const newsId = params?.id || "";
  const currentUserId = localStorage.getItem('nearly_user_id') || '';
  const [comment, setComment] = useState("");
  const [hasLiked, setHasLiked] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [hasVotedTrue, setHasVotedTrue] = useState(false);
  const [hasVotedFake, setHasVotedFake] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Load liked/saved status from localStorage
  useEffect(() => {
    const likedNews = JSON.parse(localStorage.getItem('nearly_liked_news') || '[]');
    const savedNews = JSON.parse(localStorage.getItem('nearly_saved_news') || '[]');
    const votedTrueNews = JSON.parse(localStorage.getItem('nearly_voted_true_news') || '[]');
    const votedFakeNews = JSON.parse(localStorage.getItem('nearly_voted_fake_news') || '[]');
    setHasLiked(likedNews.includes(newsId));
    setHasSaved(savedNews.includes(newsId));
    setHasVotedTrue(votedTrueNews.includes(newsId));
    setHasVotedFake(votedFakeNews.includes(newsId));
  }, [newsId]);

  // Fetch news item
  const { data: news, isLoading } = useQuery({
    queryKey: ["news", newsId],
    queryFn: () => api.getNewsItem(newsId),
    enabled: !!newsId,
  });

  // Fetch author
  const { data: author } = useQuery({
    queryKey: ["user", news?.userId],
    queryFn: () => api.getUser(news?.userId),
    enabled: !!news?.userId,
  });

  // Fetch comments using gateway API
  const { data: rawComments = [] } = useQuery({
    queryKey: ["news-comments", newsId],
    queryFn: async () => {
      try {
        return await newsApi.getComments(newsId);
      } catch {
        return [];
      }
    },
    enabled: !!newsId,
  });

  // Organize comments into threads (parent comments with their replies)
  const organizedComments = (() => {
    const parentComments: NewsComment[] = [];
    const repliesMap: Record<string, NewsComment[]> = {};

    rawComments.forEach((c: any) => {
      const comment: NewsComment = {
        id: c.id,
        newsId: c.newsId,
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

  // Track view on mount
  useEffect(() => {
    if (newsId) {
      newsApi.viewNews(newsId).catch(() => {});
    }
  }, [newsId]);

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (hasLiked) return { success: false };
      return api.likeNews(newsId, true);
    },
    onSuccess: () => {
      if (!hasLiked) {
        const likedNews = JSON.parse(localStorage.getItem('nearly_liked_news') || '[]');
        likedNews.push(newsId);
        localStorage.setItem('nearly_liked_news', JSON.stringify(likedNews));
        setHasLiked(true);
        queryClient.invalidateQueries({ queryKey: ["news", newsId] });
        toast({ title: "Liked!" });
      }
    },
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (voteType: 'true' | 'fake') => {
      if (hasVotedTrue || hasVotedFake) return { success: false };
      return api.voteNews(newsId, voteType, true);
    },
    onSuccess: (_, voteType) => {
      if (!hasVotedTrue && !hasVotedFake) {
        if (voteType === 'true') {
          const votedNews = JSON.parse(localStorage.getItem('nearly_voted_true_news') || '[]');
          votedNews.push(newsId);
          localStorage.setItem('nearly_voted_true_news', JSON.stringify(votedNews));
          setHasVotedTrue(true);
        } else {
          const votedNews = JSON.parse(localStorage.getItem('nearly_voted_fake_news') || '[]');
          votedNews.push(newsId);
          localStorage.setItem('nearly_voted_fake_news', JSON.stringify(votedNews));
          setHasVotedFake(true);
        }
        queryClient.invalidateQueries({ queryKey: ["news", newsId] });
        toast({ title: `Marked as ${voteType === 'true' ? 'True' : 'Fake'}` });
      }
    },
  });

  // Comment mutation - supports replies with parentCommentId
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentCommentId }: { content: string; parentCommentId?: string }) => {
      const response = await fetch(`/api/news/${newsId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('nearly_access_token')}`,
          'X-User-Id': currentUserId,
        },
        body: JSON.stringify({ content, parentCommentId }),
      });
      return response.json();
    },
    onSuccess: () => {
      setComment("");
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ["news-comments", newsId] });
      queryClient.invalidateQueries({ queryKey: ["news", newsId] });
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
    const savedNews = JSON.parse(localStorage.getItem('nearly_saved_news') || '[]');
    if (hasSaved) {
      const filtered = savedNews.filter((id: string) => id !== newsId);
      localStorage.setItem('nearly_saved_news', JSON.stringify(filtered));
      setHasSaved(false);
      toast({ title: "Removed from saved" });
    } else {
      savedNews.push(newsId);
      localStorage.setItem('nearly_saved_news', JSON.stringify(savedNews));
      setHasSaved(true);
      toast({ title: "Saved!" });
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/news/${newsId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: news?.headline, url: shareUrl });
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

  if (!news) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">News not found</p>
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
          <h1 className="text-lg font-semibold">News</h1>
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
            <p className="text-xs text-muted-foreground">{getTimeAgo(news.createdAt || news.publishedAt)}</p>
          </div>
          {news.category && (
            <Badge variant="secondary">{news.category}</Badge>
          )}
        </div>

        {/* Headline */}
        <h1 className="text-xl font-bold">{news.headline || news.title}</h1>

        {/* Image */}
        {news.imageUrl && (
          <img 
            src={news.imageUrl} 
            alt={news.headline} 
            className="w-full rounded-xl object-cover max-h-64"
          />
        )}

        {/* Description */}
        {news.description && (
          <p className="text-muted-foreground">{news.description}</p>
        )}

        {/* Content */}
        {news.content && (
          <div className="prose prose-sm max-w-none">
            <p>{news.content}</p>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 py-3 border-y border-border">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Eye className="w-4 h-4" />
            <span className="text-sm">{news.viewsCount || 0} views</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Heart className="w-4 h-4" />
            <span className="text-sm">{news.likesCount || 0} likes</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">{news.commentsCount || rawComments.length} discusses</span>
          </div>
        </div>

        {/* True/Fake Voting */}
        <div className="flex items-center gap-3">
          <Button
            variant={hasVotedTrue ? "default" : "outline"}
            size="sm"
            onClick={() => !hasVotedTrue && !hasVotedFake && voteMutation.mutate('true')}
            disabled={hasVotedTrue || hasVotedFake}
            className={hasVotedTrue ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <ThumbsUp className="w-4 h-4 mr-1" />
            True ({news.trueVotes || 0})
          </Button>
          <Button
            variant={hasVotedFake ? "default" : "outline"}
            size="sm"
            onClick={() => !hasVotedTrue && !hasVotedFake && voteMutation.mutate('fake')}
            disabled={hasVotedTrue || hasVotedFake}
            className={hasVotedFake ? "bg-red-600 hover:bg-red-700" : ""}
          >
            <ThumbsDown className="w-4 h-4 mr-1" />
            Fake ({news.fakeVotes || 0})
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between py-3">
          <button 
            onClick={() => !hasLiked && likeMutation.mutate()}
            className={`flex items-center gap-2 ${hasLiked ? 'text-red-500' : 'text-muted-foreground'}`}
            disabled={hasLiked}
          >
            <Heart className={`w-6 h-6 ${hasLiked ? 'fill-current' : ''}`} />
            <span>{news.likesCount || 0}</span>
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
                      {c.likesCount > 0 && (
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
                            {reply.likesCount > 0 && (
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
