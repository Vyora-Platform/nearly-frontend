import { useState } from "react";
import { BarChart3, Clock, User, MoreHorizontal, Share2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface PollOption {
  id?: string;
  text: string;
  votes?: number;
}

interface PollCardProps {
  id: string;
  question: string;
  options: PollOption[];
  category?: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  totalVotes: number;
  endsAt?: string | Date;
  timeAgo: string;
  hasVoted?: boolean;
  userVote?: string;
}

export default function PollCard({
  id,
  question,
  options,
  category,
  author,
  totalVotes,
  endsAt,
  timeAgo,
  hasVoted: initialHasVoted = false,
  userVote: initialUserVote,
}: PollCardProps) {
  const [, setLocation] = useLocation();
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [userVote, setUserVote] = useState(initialUserVote);
  // Normalize options to ensure they have id and votes
  const normalizeOptions = (opts: PollOption[] | undefined): PollOption[] => {
    if (!opts || !Array.isArray(opts)) return [];
    return opts.map((opt, index) => ({
      id: opt.id || `option-${index}`,
      text: opt.text || `Option ${index + 1}`,
      votes: opt.votes || 0,
    }));
  };
  const [localOptions, setLocalOptions] = useState(normalizeOptions(options));
  const [localTotalVotes, setLocalTotalVotes] = useState(totalVotes);
  const queryClient = useQueryClient();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';

  const isExpired = endsAt ? new Date(endsAt) < new Date() : false;
  const showResults = hasVoted || isExpired;

  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      return api.votePoll(id, optionId);
    },
    onMutate: (optionId) => {
      setHasVoted(true);
      setUserVote(optionId);
      setLocalOptions(prev => 
        prev.map(opt => ({
          ...opt,
          votes: opt.id === optionId ? (opt.votes || 0) + 1 : (opt.votes || 0)
        }))
      );
      setLocalTotalVotes(prev => prev + 1);
    },
    onError: () => {
      setHasVoted(initialHasVoted);
      setUserVote(initialUserVote);
      setLocalOptions(normalizeOptions(options));
      setLocalTotalVotes(totalVotes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
  });

  const getTimeRemaining = () => {
    if (!endsAt) return null;
    const end = new Date(endsAt);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Ended";
    
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d left`;
    if (hours > 0) return `${hours}h left`;
    return "Ending soon";
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <button 
          onClick={() => setLocation(`/profile/${author.username.replace('@', '')}`)}
          className="flex items-center gap-2"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={author.avatar} alt={author.name} />
            <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="text-sm font-medium leading-tight">{author.name}</p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {category && (
            <Badge variant="secondary" className="text-xs">
              {category}
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Share</DropdownMenuItem>
              <DropdownMenuItem>Copy Link</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Report</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Question */}
      <div className="mb-4">
        <div className="flex items-start gap-2 mb-3">
          <BarChart3 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <h3 className="font-semibold text-foreground">{question}</h3>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {localOptions.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No options available
          </div>
        ) : localOptions.map((option) => {
          const votes = option.votes || 0;
          const percentage = localTotalVotes > 0 
            ? Math.round((votes / localTotalVotes) * 100) 
            : 0;
          const isSelected = userVote === option.id;
          
          return (
            <button
              key={option.id || `opt-${Math.random()}`}
              onClick={() => !hasVoted && !isExpired && option.id && voteMutation.mutate(option.id)}
              disabled={hasVoted || isExpired}
              className={`w-full text-left relative overflow-hidden rounded-lg border transition-all ${
                isSelected 
                  ? "border-primary bg-primary/5" 
                  : hasVoted
                    ? "border-border bg-muted/30"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              {showResults && (
                <div 
                  className={`absolute inset-y-0 left-0 transition-all ${
                    isSelected ? "bg-primary/20" : "bg-muted"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              )}
              <div className="relative px-4 py-3 flex items-center justify-between">
                <span className={`text-sm ${isSelected ? "font-medium" : ""}`}>
                  {option.text}
                </span>
                {showResults && (
                  <span className={`text-sm ${isSelected ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                    {percentage}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <User className="w-4 h-4" />
            {localTotalVotes.toLocaleString()} votes
          </span>
          {getTimeRemaining() && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {getTimeRemaining()}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <Share2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
