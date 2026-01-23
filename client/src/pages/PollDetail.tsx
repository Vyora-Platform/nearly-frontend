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
  ArrowLeft, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Send, Eye, BarChart3, Loader2, Check, Reply, X
} from "lucide-react";

interface PollComment {
  id: string;
  pollId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  content: string;
  parentCommentId?: string;
  likesCount: number;
  createdAt: string;
  replies?: PollComment[];
}

export default function PollDetail() {
  const [, params] = useRoute("/poll/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pollId = params?.id || "";
  const currentUserId = localStorage.getItem('nearly_user_id') || '';
  const [comment, setComment] = useState("");
  const [hasSaved, setHasSaved] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOption, setVotedOption] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Load saved/voted status from localStorage
  useEffect(() => {
    const savedPolls = JSON.parse(localStorage.getItem('nearly_saved_polls') || '[]');
    const votedPolls = JSON.parse(localStorage.getItem('nearly_voted_polls') || '{}');
    setHasSaved(savedPolls.includes(pollId));
    if (votedPolls[pollId]) {
      setHasVoted(true);
      setVotedOption(votedPolls[pollId]);
    }
  }, [pollId]);

  // Fetch poll with options normalization
  const { data: poll, isLoading } = useQuery({
    queryKey: ["poll", pollId],
    queryFn: async () => {
      const p = await api.getPoll(pollId) as any;

      // Handle legacy/malformed optionsJson
      if ((!p.options || p.options.length === 0) && p.optionsJson) {
        try {
          // Try standard JSON parse first
          p.options = JSON.parse(p.optionsJson);
        } catch {
          // Fallback for stringified format: [{text=val}, ...]
          // Regex to capture text value between "text=" and "}" or ","
          const matches = [...p.optionsJson.matchAll(/text=([^},\]]+)/g)];
          if (matches.length > 0) {
            p.options = matches.map((m: any, idx: number) => ({
              id: `opt-${idx}`, // Generate simple ID
              text: m[1].trim(),
              votesCount: 0,
              votes: []
            }));
          }
        }
      }
      return p;
    },
    enabled: !!pollId,
  });

  // Fetch author
  const { data: author } = useQuery({
    queryKey: ["user", poll?.userId],
    queryFn: () => api.getUser(poll?.userId),
    enabled: !!poll?.userId,
  });

  // Fetch comments and enrich with user data
  const { data: comments = [] } = useQuery({
    queryKey: ["poll-comments", pollId],
    queryFn: async () => {
      try {
        const res = await authFetch(`/api/polls/${pollId}/comments`);
        if (!res.ok) return [];
        const fetchedComments = await res.json();

        // Enrich comments with user data
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
    enabled: !!pollId,
  });

  // Organize comments into threads (parent comments with their replies)
  const organizedComments = (() => {
    const parentComments: PollComment[] = [];
    const repliesMap: Record<string, PollComment[]> = {};

    comments.forEach((c: any) => {
      const comment: PollComment = {
        id: c.id,
        pollId: c.pollId,
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
      if (parent.replies) {
        parent.replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    });

    // Sort parent comments by date desc
    return parentComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  })();

  // Track view on mount
  useEffect(() => {
    if (pollId) {
      authFetch(`/api/polls/${pollId}/view`, {
        method: 'POST',
        body: JSON.stringify({ userId: currentUserId })
      }).catch(() => { });
    }
  }, [pollId, currentUserId]);

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      if (hasVoted) return { success: false };
      return api.votePoll(pollId, optionId);
    },
    onSuccess: (_, optionId) => {
      if (!hasVoted) {
        const votedPolls = JSON.parse(localStorage.getItem('nearly_voted_polls') || '{}');
        votedPolls[pollId] = optionId;
        localStorage.setItem('nearly_voted_polls', JSON.stringify(votedPolls));
        setHasVoted(true);
        setVotedOption(optionId);
        queryClient.invalidateQueries({ queryKey: ["poll", pollId] });
        toast({ title: "Vote recorded!" });
      }
    },
  });

  // Comment mutation - supports replies with parentCommentId
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentCommentId }: { content: string; parentCommentId?: string }) => {
      const res = await authFetch(`/api/polls/${pollId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, userId: currentUserId, parentCommentId })
      });
      return res.json();
    },
    onSuccess: () => {
      setComment("");
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ["poll-comments", pollId] });
      queryClient.invalidateQueries({ queryKey: ["poll", pollId] });
      toast({ title: replyingTo ? "Reply added!" : "Comment added!" });
    },
    onError: () => {
      toast({ title: "Failed to post comment", variant: "destructive" });
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

  const handleSubmitComment = () => {
    if (!comment.trim()) return;
    commentMutation.mutate({
      content: comment,
      parentCommentId: replyingTo?.id,
    });
  };

  const handleSave = () => {
    const savedPolls = JSON.parse(localStorage.getItem('nearly_saved_polls') || '[]');
    if (hasSaved) {
      const filtered = savedPolls.filter((id: string) => id !== pollId);
      localStorage.setItem('nearly_saved_polls', JSON.stringify(filtered));
      setHasSaved(false);
      toast({ title: "Removed from saved" });
    } else {
      savedPolls.push(pollId);
      localStorage.setItem('nearly_saved_polls', JSON.stringify(savedPolls));
      setHasSaved(true);
      toast({ title: "Saved!" });
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/poll/${pollId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: poll?.question, url: shareUrl });
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

  const getTotalVotes = () => {
    if (!poll?.options) return 0;
    return poll.options.reduce((acc: number, opt: any) => acc + (opt.votes?.length || opt.votesCount || 0), 0);
  };

  const getVotePercentage = (option: any) => {
    const total = getTotalVotes();
    if (total === 0) return 0;
    const optionVotes = option.votes?.length || option.votesCount || 0;
    return Math.round((optionVotes / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Poll not found</p>
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
          <h1 className="text-lg font-semibold">Poll</h1>
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
            <p className="text-xs text-muted-foreground">{getTimeAgo(poll.createdAt)}</p>
          </div>
          {poll.category && (
            <Badge variant="secondary">{poll.category}</Badge>
          )}
        </div>

        {/* Poll Icon */}
        <div className="flex items-center gap-2 text-primary">
          <BarChart3 className="w-5 h-5" />
          <span className="font-medium">Poll</span>
        </div>

        {/* Question */}
        <h1 className="text-xl font-bold">{poll.question}</h1>

        {/* Stats */}
        <div className="flex items-center gap-4 py-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{poll.viewsCount || 0} views</span>
          </div>
          <div className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            <span>{getTotalVotes()} votes</span>
          </div>
        </div>

        {/* Poll Options */}
        <div className="space-y-3">
          {poll.options?.map((option: any, idx: number) => {
            const optionId = option.id || `opt-${idx}`;
            const isSelected = votedOption === optionId;
            const percentage = getVotePercentage(option);
            const optionVotes = option.votes?.length || option.votesCount || 0;

            return (
              <button
                key={optionId}
                onClick={() => !hasVoted && voteMutation.mutate(optionId)}
                disabled={hasVoted}
                className={`w-full relative overflow-hidden rounded-xl p-4 text-left transition-all border ${isSelected
                  ? "border-primary bg-primary/10"
                  : hasVoted
                    ? "border-border bg-muted/30"
                    : "border-border bg-card hover:bg-muted/50"
                  }`}
              >
                {/* Progress bar background */}
                {hasVoted && (
                  <div
                    className={`absolute inset-0 ${isSelected ? 'bg-primary/20' : 'bg-muted/50'} transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                    <span className={`font-medium ${isSelected ? 'text-primary' : ''}`}>
                      {option.text || option.label}
                    </span>
                  </div>
                  {hasVoted && (
                    <span className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                      {percentage}% ({optionVotes})
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between py-3 border-t border-border">
          <button className="flex items-center gap-2 text-muted-foreground">
            <MessageCircle className="w-6 h-6" />
            <span>{comments.length}</span>
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
          <h3 className="font-semibold">Discuss ({comments.length})</h3>

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
