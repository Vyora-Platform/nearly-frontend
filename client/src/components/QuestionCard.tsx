import { useState } from "react";
import { 
  HelpCircle, MessageCircle, ThumbsUp, CheckCircle, 
  MoreHorizontal, Share2, Bookmark, Tag 
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface QuestionCardProps {
  id: string;
  title: string;
  content?: string;
  category?: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  answersCount: number;
  upvotes: number;
  timeAgo: string;
  isAnswered?: boolean;
  tags?: string[];
  isDiscussion?: boolean;
}

export default function QuestionCard({
  id,
  title,
  content,
  category,
  author,
  answersCount,
  upvotes,
  timeAgo,
  isAnswered = false,
  tags = [],
  isDiscussion = false,
}: QuestionCardProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';
  
  // Initialize upvoted state from localStorage
  const [isUpvoted, setIsUpvoted] = useState(() => {
    const storageKey = isDiscussion ? 'nearly_upvoted_discussions' : 'nearly_upvoted_questions';
    const upvotedItems = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return upvotedItems.includes(id);
  });
  
  // Initialize saved state from localStorage
  const [isSaved, setIsSaved] = useState(() => {
    const storageKey = isDiscussion ? 'nearly_saved_discussions' : 'nearly_saved_questions';
    const savedItems = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return savedItems.includes(id);
  });
  
  const [localUpvotes, setLocalUpvotes] = useState(upvotes);

  const upvoteMutation = useMutation({
    mutationFn: async () => {
      // Prevent multiple upvotes - only allow one per user
      if (isUpvoted) {
        throw new Error('Already upvoted');
      }
      return isDiscussion 
        ? api.likeDiscussion(id, true)
        : api.upvoteQuestion(id, true);
    },
    onMutate: () => {
      if (isUpvoted) return; // Already upvoted
      
      setIsUpvoted(true);
      setLocalUpvotes(prev => prev + 1);
      
      // Persist to localStorage
      const storageKey = isDiscussion ? 'nearly_upvoted_discussions' : 'nearly_upvoted_questions';
      const upvotedItems = JSON.parse(localStorage.getItem(storageKey) || '[]');
      upvotedItems.push(id);
      localStorage.setItem(storageKey, JSON.stringify(upvotedItems));
    },
    onError: () => {
      // Revert on error
      setIsUpvoted(false);
      setLocalUpvotes(prev => prev - 1);
      
      // Remove from localStorage
      const storageKey = isDiscussion ? 'nearly_upvoted_discussions' : 'nearly_upvoted_questions';
      const upvotedItems = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const filtered = upvotedItems.filter((itemId: string) => itemId !== id);
      localStorage.setItem(storageKey, JSON.stringify(filtered));
    },
  });

  const truncatedContent = content && content.length > 150
    ? content.slice(0, 150) + "..."
    : content;

  return (
    <div 
      className="bg-card rounded-xl border border-border p-4 cursor-pointer hover:border-primary/30 transition-colors"
      onClick={() => setLocation(isDiscussion ? `/discussion/${id}` : `/question/${id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setLocation(`/profile/${author.username.replace('@', '')}`);
          }}
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
          {isAnswered && !isDiscussion && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Answered
            </Badge>
          )}
          {category && (
            <Badge variant="secondary" className="text-xs">
              {category}
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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

      {/* Title */}
      <div className="mb-2">
        <div className="flex items-start gap-2">
          {!isDiscussion && (
            <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          )}
          <h3 className="font-semibold text-foreground leading-snug">{title}</h3>
        </div>
      </div>

      {/* Content Preview */}
      {truncatedContent && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {truncatedContent}
        </p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.slice(0, 4).map((tag, idx) => (
            <Badge 
              key={idx} 
              variant="outline" 
              className="text-xs px-2 py-0.5 font-normal"
              onClick={(e) => e.stopPropagation()}
            >
              <Tag className="w-3 h-3 mr-1" />
              {tag}
            </Badge>
          ))}
          {tags.length > 4 && (
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              +{tags.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-4">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (!isUpvoted) {
                upvoteMutation.mutate();
              }
            }}
            disabled={isUpvoted}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              isUpvoted ? "text-primary cursor-default" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${isUpvoted ? "fill-primary" : ""}`} />
            <span>{localUpvotes}</span>
          </button>
          <button 
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{answersCount} {isDiscussion ? "comments" : "answers"}</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              const newSaved = !isSaved;
              setIsSaved(newSaved);
              
              // Persist to localStorage
              const storageKey = isDiscussion ? 'nearly_saved_discussions' : 'nearly_saved_questions';
              const savedItems = JSON.parse(localStorage.getItem(storageKey) || '[]');
              if (newSaved) {
                savedItems.push(id);
              } else {
                const index = savedItems.indexOf(id);
                if (index > -1) savedItems.splice(index, 1);
              }
              localStorage.setItem(storageKey, JSON.stringify(savedItems));
            }}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-foreground" : ""}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={(e) => e.stopPropagation()}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
