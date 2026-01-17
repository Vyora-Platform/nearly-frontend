import { Calendar, MapPin, Users, Heart, Bookmark, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface EventCardProps {
  id: string;
  title: string;
  imageUrl: string;
  host: {
    id?: string;
    name: string;
    username: string;
    avatar?: string;
  };
  date: string;
  location: string;
  attendeesCount: number;
  entryType: string;
  price?: number;
  categories: string[];
  isOwnEvent?: boolean;
}

export default function EventCard({
  id,
  title,
  imageUrl,
  host,
  date,
  location,
  attendeesCount,
  entryType,
  price,
  categories,
  isOwnEvent = false,
}: EventCardProps) {
  const [, setLocation] = useLocation();
  
  // Initialize liked state from localStorage
  const [liked, setLiked] = useState(() => {
    const likedEvents = JSON.parse(localStorage.getItem('nearly_liked_events') || '[]');
    return likedEvents.includes(id);
  });
  
  // Initialize saved state from localStorage
  const [saved, setSaved] = useState(() => {
    const savedEvents = JSON.parse(localStorage.getItem('nearly_saved_events') || '[]');
    return savedEvents.includes(id);
  });
  
  const { toast } = useToast();
  const currentUserId = localStorage.getItem('nearly_user_id');
  
  // Check if this is the current user's event
  const isCurrentUserEvent = isOwnEvent || (host.id && host.id === currentUserId) || host.name === "You";

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Prevent multiple likes - only allow one like per user
    if (liked) {
      return;
    }
    
    setLiked(true);
    
    // Persist to localStorage
    const likedEvents = JSON.parse(localStorage.getItem('nearly_liked_events') || '[]');
    likedEvents.push(id);
    localStorage.setItem('nearly_liked_events', JSON.stringify(likedEvents));
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newSaved = !saved;
    setSaved(newSaved);
    
    // Persist to localStorage
    const savedEvents = JSON.parse(localStorage.getItem('nearly_saved_events') || '[]');
    if (newSaved) {
      savedEvents.push(id);
    } else {
      const index = savedEvents.indexOf(id);
      if (index > -1) savedEvents.splice(index, 1);
    }
    localStorage.setItem('nearly_saved_events', JSON.stringify(savedEvents));
    
    toast({ title: newSaved ? "Event saved!" : "Removed from saved" });
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/event/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "Link copied!" });
      }
    } catch (error) {
      console.log('Share cancelled');
    }
  };

  return (
    <div 
      className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer" 
      data-testid={`card-event-${id}`}
      onClick={() => setLocation(`/event/${id}`)}
    >
      {/* Image with overlay */}
      <div className="relative">
        <img
          src={imageUrl}
          alt={title}
          className="w-full object-cover"
          style={{ aspectRatio: "16/9" }}
        />
        {/* Entry type badge on image */}
        <div className="absolute top-3 right-3">
          {entryType === "FREE" ? (
            <Badge className="bg-green-500 text-white border-0 shadow-lg font-semibold">
              FREE
            </Badge>
          ) : entryType === "SPONSORED" ? (
            <Badge className="bg-gradient-primary text-white border-0 shadow-lg font-semibold">
              SPONSORED
            </Badge>
          ) : price ? (
            <Badge className="bg-background/90 backdrop-blur-sm text-foreground border-0 shadow-lg font-semibold">
              ₹{price}
            </Badge>
          ) : null}
        </div>
        {/* Like button on image */}
        <button 
          onClick={handleLike}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-90"
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : "text-foreground"}`} />
        </button>
      </div>

      <div className="p-4">
        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {categories.map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className="text-xs bg-primary/10 text-primary border-primary/20"
              >
                {category}
              </Badge>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">{title}</h3>

        {/* Host */}
        <button 
          className="flex items-center gap-2 mb-3"
          onClick={(e) => {
            if (!isCurrentUserEvent && host.username) {
              e.stopPropagation();
              setLocation(`/profile/${host.username.replace('@', '')}`);
            }
          }}
        >
          <Avatar className="w-6 h-6 ring-1 ring-border">
            <AvatarImage src={host.avatar} />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {isCurrentUserEvent ? "Y" : host.name[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {isCurrentUserEvent ? "You" : host.name}
          </span>
        </button>

        {/* Event details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <span className="text-foreground font-medium">{date}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <MapPin className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-muted-foreground truncate">{location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="text-muted-foreground">{attendeesCount} attending</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button onClick={handleSave} className="p-2 hover:bg-muted rounded-full transition-colors">
            <Bookmark className={`w-5 h-5 ${saved ? "fill-foreground text-foreground" : "text-muted-foreground"}`} />
          </button>
          <button onClick={handleShare} className="p-2 hover:bg-muted rounded-full transition-colors">
            <Share2 className="w-5 h-5 text-muted-foreground" />
          </button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 ml-auto bg-gradient-primary text-white h-10 font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              setLocation(`/event/${id}`);
            }}
            data-testid="button-join-event"
          >
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
}
