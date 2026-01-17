import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

interface NewsCardProps {
  id: string;
  author: {
    id?: string;
    name: string;
    username?: string;
    location?: string;
    avatar?: string;
  };
  headline: string;
  description?: string | null;
  imageUrl?: string | null;
  category: string;
  location?: string | null;
  trueVotes: number;
  fakeVotes: number;
  likesCount: number;
  commentsCount: number;
  timeAgo?: string;
  publishedAt?: string;
}

export default function NewsCard({
  id,
  author,
  headline,
  description,
  imageUrl,
  category,
  location,
  trueVotes,
  fakeVotes,
  likesCount,
  commentsCount,
  timeAgo,
  publishedAt,
}: NewsCardProps) {
  const displayTime = timeAgo || publishedAt || "Just now";
  const displayLocation = location || author.location;
  
  // Initialize liked state from localStorage
  const [liked, setLiked] = useState(() => {
    const likedNews = JSON.parse(localStorage.getItem('nearly_liked_news') || '[]');
    return likedNews.includes(id);
  });
  const [likes, setLikes] = useState(likesCount);
  
  // Initialize vote state from localStorage
  const [userVote, setUserVote] = useState<"true" | "fake" | null>(() => {
    const newsVotes = JSON.parse(localStorage.getItem('nearly_news_votes') || '{}');
    return newsVotes[id] || null;
  });
  const [votes, setVotes] = useState({ true: trueVotes, fake: fakeVotes });

  const totalVotes = votes.true + votes.fake;
  const truePercentage = totalVotes > 0 ? (votes.true / totalVotes) * 100 : 0;
  const fakePercentage = totalVotes > 0 ? (votes.fake / totalVotes) * 100 : 0;

  const handleVote = async (vote: "true" | "fake") => {
    const previousVote = userVote;
    const previousVotes = { ...votes };

    // Helper to persist vote to localStorage
    const persistVote = (newVote: "true" | "fake" | null) => {
      const newsVotes = JSON.parse(localStorage.getItem('nearly_news_votes') || '{}');
      if (newVote === null) {
        delete newsVotes[id];
      } else {
        newsVotes[id] = newVote;
      }
      localStorage.setItem('nearly_news_votes', JSON.stringify(newsVotes));
    };

    if (userVote === vote) {
      setUserVote(null);
      setVotes({ ...votes, [vote]: votes[vote] - 1 });
      persistVote(null);
      try {
        await api.voteNews(id, vote, false);
        queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      } catch (error) {
        setUserVote(previousVote);
        setVotes(previousVotes);
        persistVote(previousVote);
        console.error("Failed to remove vote:", error);
      }
    } else {
      if (userVote) {
        setVotes({ 
          ...votes, 
          [userVote]: votes[userVote] - 1, 
          [vote]: votes[vote] + 1 
        });
        try {
          await api.voteNews(id, userVote, false);
          await api.voteNews(id, vote, true);
          queryClient.invalidateQueries({ queryKey: ["/api/news"] });
        } catch (error) {
          setUserVote(previousVote);
          setVotes(previousVotes);
          persistVote(previousVote);
          console.error("Failed to change vote:", error);
        }
      } else {
        setVotes({ ...votes, [vote]: votes[vote] + 1 });
        try {
          await api.voteNews(id, vote, true);
          queryClient.invalidateQueries({ queryKey: ["/api/news"] });
        } catch (error) {
          setUserVote(previousVote);
          setVotes(previousVotes);
          persistVote(previousVote);
          console.error("Failed to vote:", error);
        }
      }
      setUserVote(vote);
      persistVote(vote);
    }
  };

  const handleLike = async () => {
    // Prevent multiple likes - only allow one like per user
    if (liked) {
      return; // Already liked, don't allow unliking or re-liking
    }
    
    setLiked(true);
    setLikes(likes + 1);
    
    // Persist to localStorage
    const likedNews = JSON.parse(localStorage.getItem('nearly_liked_news') || '[]');
    likedNews.push(id);
    localStorage.setItem('nearly_liked_news', JSON.stringify(likedNews));
    
    try {
      await api.likeNews(id, true);
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
    } catch (error) {
      // Revert on error
      setLiked(false);
      setLikes(likes);
      const revertedLikes = JSON.parse(localStorage.getItem('nearly_liked_news') || '[]');
      const filtered = revertedLikes.filter((newsId: string) => newsId !== id);
      localStorage.setItem('nearly_liked_news', JSON.stringify(filtered));
      console.error("Failed to like news:", error);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-card-border overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={author.avatar} />
              <AvatarFallback className="text-xs">{author.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-semibold text-foreground">{author.name}</p>
              <p className="text-xs text-muted-foreground">
                {displayLocation && `${displayLocation} • `}{displayTime}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {category}
          </Badge>
        </div>

        <h3 className="text-base font-semibold text-foreground mb-2">{headline}</h3>
        <p className="text-sm text-foreground mb-3">{description}</p>

        {imageUrl && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <img
              src={imageUrl}
              alt={headline}
              className="w-full object-cover"
              style={{ aspectRatio: "16/9" }}
            />
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <Button
            variant={userVote === "true" ? "default" : "outline"}
            size="sm"
            className={`flex-1 h-10 gap-2 ${
              userVote === "true"
                ? "bg-chart-3 hover:bg-chart-3 text-white"
                : "border-chart-3/50 hover:bg-chart-3/10"
            }`}
            onClick={() => handleVote("true")}
            data-testid="button-vote-true"
          >
            <ThumbsUp className="w-4 h-4" />
            <span className="text-xs font-semibold">True ({votes.true})</span>
          </Button>
          <Button
            variant={userVote === "fake" ? "default" : "outline"}
            size="sm"
            className={`flex-1 h-10 gap-2 ${
              userVote === "fake"
                ? "bg-destructive hover:bg-destructive text-white"
                : "border-destructive/50 hover:bg-destructive/10"
            }`}
            onClick={() => handleVote("fake")}
            data-testid="button-vote-fake"
          >
            <ThumbsDown className="w-4 h-4" />
            <span className="text-xs font-semibold">FAKE ({votes.fake})</span>
          </Button>
        </div>

        {totalVotes > 0 && (
          <div className="flex gap-1 mb-3 h-2 rounded-full overflow-hidden">
            <div
              className="bg-chart-3"
              style={{ width: `${truePercentage}%` }}
            />
            <div
              className="bg-destructive"
              style={{ width: `${fakePercentage}%` }}
            />
          </div>
        )}

        <div className="flex items-center gap-4 text-muted-foreground">
          <button
            onClick={handleLike}
            className="flex items-center gap-1 hover-elevate active-elevate-2"
            data-testid="button-like-news"
          >
            <Heart
              className={`w-5 h-5 ${liked ? "fill-destructive text-destructive" : ""}`}
            />
            <span className="text-xs">{likes}</span>
          </button>
          <button
            className="flex items-center gap-1 hover-elevate active-elevate-2"
            data-testid="button-comment-news"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs">{commentsCount}</span>
          </button>
          <button
            className="flex items-center gap-1 hover-elevate active-elevate-2"
            data-testid="button-share-news"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
