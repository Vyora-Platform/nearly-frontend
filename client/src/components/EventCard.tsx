import { Calendar, MapPin, Users, Heart, Bookmark, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { messagingApi } from "@/lib/gateway-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Instagram-style share icon SVG (Paper plane)
const ShareIcon = ({ className }: { className?: string }) => (
  <svg
    aria-label="Share"
    className={className}
    fill="none"
    height="24"
    role="img"
    viewBox="0 0 24 24"
    width="24"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <line x1="22" x2="9.218" y1="3" y2="10.083"></line>
    <polygon points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334"></polygon>
  </svg>
);

// WhatsApp Icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

// Telegram Icon
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

// Instagram Icon
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
  </svg>
);

// Facebook Icon
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

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

  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareMode, setShareMode] = useState<"main" | "friends" | "groups">("main");
  const [selectedShareTargets, setSelectedShareTargets] = useState<string[]>([]);

  const { toast } = useToast();
  const currentUserId = localStorage.getItem('nearly_user_id');

  // Check if this is the current user's event
  const isCurrentUserEvent = isOwnEvent || (host.id && host.id === currentUserId) || host.name === "You";

  // Fetch friends (users that the current user is following)
  const { data: friends = [] } = useQuery({
    queryKey: ["following", currentUserId],
    queryFn: () => api.getFollowing(currentUserId || ''),
    enabled: !!currentUserId && showShareDialog && shareMode === "friends",
  });

  // Fetch groups
  const { data: groups = [] } = useQuery({
    queryKey: ["user-groups", currentUserId],
    queryFn: () => api.getUserGroups(currentUserId || ''),
    enabled: !!currentUserId && showShareDialog && shareMode === "groups",
  });

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
        setShowShareDialog(true);
      }
    } catch (error) {
      setShowShareDialog(true);
    }
  };

  const copyLink = async () => {
    const shareUrl = `${window.location.origin}/event/${id}`;
    await navigator.clipboard.writeText(shareUrl);
    setShowShareDialog(false);
  };

  return (
    <>
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
            <button onClick={handleShare} className="p-2 hover:bg-muted rounded-full transition-colors transition-transform active:scale-95">
              <ShareIcon className="w-5 h-5 text-muted-foreground" />
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

      {/* Share Dialog - Instagram Style */}
      <Dialog open={showShareDialog} onOpenChange={(open) => {
        setShowShareDialog(open);
        if (!open) {
          setShareMode("main");
          setSelectedShareTargets([]);
        }
      }}>
        <DialogContent className="max-w-sm max-h-[80vh] flex flex-col p-0" onClick={(e) => e.stopPropagation()}>
          <DialogHeader className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              {shareMode !== "main" && (
                <button
                  onClick={() => {
                    setShareMode("main");
                    setSelectedShareTargets([]);
                  }}
                  className="p-1 -ml-1 hover:bg-muted rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <DialogTitle className="text-center flex-1">
                {shareMode === "main" ? "Share Event" : shareMode === "friends" ? "Share with Friends" : "Share to Groups"}
              </DialogTitle>
              {shareMode !== "main" && selectedShareTargets.length > 0 && (
                <button
                  onClick={async () => {
                    const shareText = `Check out this event: ${title}\n\n🔗 ${window.location.origin}/event/${id}`;
                    // Send message to all selected targets
                    for (const targetId of selectedShareTargets) {
                      try {
                        if (shareMode === "friends") {
                          await messagingApi.sendMessage({
                            senderId: currentUserId,
                            recipientId: targetId,
                            content: shareText,
                            messageType: "text",
                          });
                        }
                        // For groups, would need group message API
                      } catch (e) {
                        console.error("Failed to send share message:", e);
                      }
                    }
                    setShowShareDialog(false);
                    setShareMode("main");
                    setSelectedShareTargets([]);
                  }}
                  className="text-primary font-semibold text-sm"
                >
                  Send
                </button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {shareMode === "main" && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShareMode("friends")}
                    className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium text-sm">Friends</span>
                  </button>
                  <button
                    onClick={() => setShareMode("groups")}
                    className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className="font-medium text-sm">Groups</span>
                  </button>
                </div>

                <div className="border-t border-border/50 my-3" />

                <div className="grid grid-cols-4 gap-2">
                  <button
                    className="flex flex-col items-center gap-1 p-2 hover:bg-muted/50 rounded-lg transition-colors"
                    onClick={() => {
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} - ${window.location.origin}/event/${id}`)}`, '_blank');
                      setShowShareDialog(false);
                    }}
                  >
                    <WhatsAppIcon className="w-10 h-10 text-[#25D366]" />
                    <span className="text-xs text-muted-foreground">WhatsApp</span>
                  </button>
                  <button
                    className="flex flex-col items-center gap-1 p-2 hover:bg-muted/50 rounded-lg transition-colors"
                    onClick={() => {
                      window.open(`https://telegram.me/share/url?url=${encodeURIComponent(`${window.location.origin}/event/${id}`)}&text=${encodeURIComponent(title)}`, '_blank');
                      setShowShareDialog(false);
                    }}
                  >
                    <TelegramIcon className="w-10 h-10 text-[#0088cc]" />
                    <span className="text-xs text-muted-foreground">Telegram</span>
                  </button>
                  <button
                    className="flex flex-col items-center gap-1 p-2 hover:bg-muted/50 rounded-lg transition-colors"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title, url: `${window.location.origin}/event/${id}` });
                      }
                      setShowShareDialog(false);
                    }}
                  >
                    <InstagramIcon className="w-10 h-10 text-[#E1306C]" />
                    <span className="text-xs text-muted-foreground">Instagram</span>
                  </button>
                  <button
                    className="flex flex-col items-center gap-1 p-2 hover:bg-muted/50 rounded-lg transition-colors"
                    onClick={() => {
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/event/${id}`)}`, '_blank');
                      setShowShareDialog(false);
                    }}
                  >
                    <FacebookIcon className="w-10 h-10 text-[#1877F2]" />
                    <span className="text-xs text-muted-foreground">Facebook</span>
                  </button>
                </div>

                <Button
                  variant="ghost"
                  className="w-full justify-center gap-2 mt-2"
                  onClick={copyLink}
                >
                  <ShareIcon className="w-4 h-4" />
                  Copy Link
                </Button>
              </div>
            )}

            {shareMode === "friends" && (
              <div className="divide-y divide-border/50">
                {friends.length === 0 ? (
                  <div className="p-8 text-center">
                    <Heart className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No friends to share with</p>
                  </div>
                ) : (
                  friends.map((friend: any) => (
                    <button
                      key={friend.id}
                      onClick={() => {
                        setSelectedShareTargets(prev =>
                          prev.includes(friend.id)
                            ? prev.filter(id => id !== friend.id)
                            : [...prev, friend.id]
                        );
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={friend.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`} />
                        <AvatarFallback>{friend.name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{friend.name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">@{friend.username || 'user'}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedShareTargets.includes(friend.id)
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                        }`}>
                        {selectedShareTargets.includes(friend.id) && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {shareMode === "groups" && (
              <div className="divide-y divide-border/50">
                {groups.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No groups to share with</p>
                  </div>
                ) : (
                  groups.map((group: any) => (
                    <button
                      key={group.id}
                      onClick={() => {
                        setSelectedShareTargets(prev =>
                          prev.includes(group.id)
                            ? prev.filter(id => id !== group.id)
                            : [...prev, group.id]
                        );
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={group.imageUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${group.id}`} />
                        <AvatarFallback>{group.name?.[0] || 'G'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{group.name || 'Group'}</p>
                        <p className="text-xs text-muted-foreground">{group.membersCount || 0} members</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedShareTargets.includes(group.id)
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                        }`}>
                        {selectedShareTargets.includes(group.id) && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
