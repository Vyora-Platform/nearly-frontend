import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, MoreVertical, MapPin, Calendar, DollarSign, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface ActivityCardProps {
  id: string;
  author: {
    name: string;
    username: string;
    avatar?: string;
  };
  title: string;
  description?: string;
  imageUrl?: string;
  location?: string;
  startDate?: string;
  cost?: string;
  category?: string;
  likesCount: number;
  commentsCount: number;
  participantsCount?: number;
  maxParticipants?: number;
  timeAgo: string;
  isFollowing?: boolean;
}

export default function ActivityCard({
  author,
  title,
  description,
  imageUrl,
  location,
  startDate,
  cost,
  category,
  likesCount,
  commentsCount,
  participantsCount,
  maxParticipants,
  timeAgo,
  isFollowing = false,
}: ActivityCardProps) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(likesCount);
  const [following, setFollowing] = useState(isFollowing);

  const handleLike = () => {
    setLiked(!liked);
    setLikes(liked ? likes - 1 : likes + 1);
  };

  const handleFollow = () => {
    setFollowing(!following);
    console.log(`${following ? "Unfollowed" : "Followed"} ${author.username}`);
  };

  return (
    <div className="bg-background border-b border-border pb-4">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={author.avatar} />
            <AvatarFallback>{author.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-foreground">{author.name}</p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!following && (
            <Button
              variant="default"
              size="sm"
              className="bg-gradient-primary text-white h-8"
              onClick={handleFollow}
              data-testid="button-follow"
            >
              Follow
            </Button>
          )}
          <button data-testid="button-menu" className="text-muted-foreground">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {category && (
        <div className="px-4 mb-2">
          <Badge variant="secondary" className="text-xs">
            {category}
          </Badge>
        </div>
      )}

      {imageUrl && (
        <div className="w-full">
          <img
            src={imageUrl}
            alt={title}
            className="w-full object-cover"
            style={{ aspectRatio: "16/9" }}
          />
        </div>
      )}

      <div className="px-4 pt-3">
        <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-foreground mb-3">{description}</p>
        )}

        <div className="flex flex-col gap-2 text-xs text-muted-foreground mb-3">
          {startDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{startDate}</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{location}</span>
            </div>
          )}
          {participantsCount !== undefined && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>
                {participantsCount}/{maxParticipants || "∞"} attendees{" "}
                {maxParticipants && `(${maxParticipants - participantsCount} spots left)`}
              </span>
            </div>
          )}
          {cost && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span className="font-semibold text-primary">{cost}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className="flex items-center gap-1 hover-elevate active-elevate-2"
              data-testid="button-like"
            >
              <Heart
                className={`w-5 h-5 ${liked ? "fill-destructive text-destructive" : "text-foreground"}`}
              />
              <span className="text-xs text-muted-foreground">{likes}</span>
            </button>
            <button
              className="flex items-center gap-1 hover-elevate active-elevate-2"
              data-testid="button-comment"
            >
              <MessageCircle className="w-5 h-5 text-foreground" />
              <span className="text-xs text-muted-foreground">{commentsCount}</span>
            </button>
            <button
              className="flex items-center gap-1 hover-elevate active-elevate-2"
              data-testid="button-share"
            >
              <Share2 className="w-5 h-5 text-foreground" />
            </button>
          </div>
          <Button
            variant="default"
            size="sm"
            className="bg-gradient-primary text-white h-9"
            data-testid="button-join"
          >
            Join
          </Button>
        </div>
      </div>
    </div>
  );
}
