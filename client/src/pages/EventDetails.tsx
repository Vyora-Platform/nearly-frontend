import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Calendar, Users, Share, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface EventGuest {
  id: string;
  eventId: string;
  userId: string;
  status: string;
  userName?: string;
  userAvatar?: string;
}

interface EventComment {
  id: string;
  eventId: string;
  userId: string;
  content: string;
  createdAt: Date;
  userName?: string;
  userAvatar?: string;
}

export default function EventDetails() {
  const [, params] = useRoute("/event/:id");
  const [, setLocation] = useLocation();
  const eventId = params?.id;
  const [comment, setComment] = useState("");

  const { data: event, isLoading } = useQuery<any>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const { data: guests = [] } = useQuery<EventGuest[]>({
    queryKey: ["/api/events", eventId, "guests"],
    enabled: !!eventId,
  });

  const { data: comments = [] } = useQuery<EventComment[]>({
    queryKey: ["/api/events", eventId, "comments"],
    enabled: !!eventId,
  });

  const joinMutation = useMutation({
    mutationFn: () => apiRequest(`/api/events/${eventId}/join`, "POST", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest(`/api/events/${eventId}/comments`, "POST", { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "comments"] });
      setComment("");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  const totalGuests = guests.length;
  const displayedGuests = guests.slice(0, 3);
  const remainingGuests = Math.max(0, totalGuests - 3);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="relative">
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-64 object-cover"
          />
        )}
        <button
          onClick={() => setLocation("/events")}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"
          data-testid="button-options"
        >
          •••
        </button>
      </div>

      <div className="p-4">
        <h1 className="text-2xl font-bold text-foreground mb-3" data-testid="text-event-title">
          {event.title}
        </h1>

        <div className="flex gap-2 mb-4">
          {event.category?.map((cat: string) => (
            <Badge key={cat} variant="secondary" className="bg-primary/10 text-primary border-primary/20" data-testid={`badge-category-${cat.toLowerCase()}`}>
              {cat}
            </Badge>
          ))}
          {event.entryType === "FREE" && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20" data-testid="badge-free">
              FREE
            </Badge>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground" data-testid="text-event-date">
                {event.startDate ? format(new Date(event.startDate), "EEEE, dd MMMM yyyy") : "Date TBD"}
              </p>
              <p className="text-xs text-muted-foreground">
                {event.startDate ? format(new Date(event.startDate), "h:mm a") : ""}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground" data-testid="text-event-location">
                {event.location}
              </p>
              <button className="text-xs text-primary" data-testid="button-view-map">
                View Map
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">About this event</h2>
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-event-description">
            {event.description || "No description provided"}
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">Guest Details</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-card rounded-lg">
              <Avatar className="w-12 h-12">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Kunal" />
                <AvatarFallback>KS</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Kunal Shah</p>
                <p className="text-xs text-muted-foreground">Keynote speaker on "The Future of Fintech"</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-card rounded-lg">
              <Avatar className="w-12 h-12">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Shradha" />
                <AvatarFallback>SS</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Shradha Sharma</p>
                <p className="text-xs text-muted-foreground">Hosting a panel discussion on "Building in India"</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-card rounded-lg">
              <Avatar className="w-12 h-12 bg-primary/10">
                <div className="w-full h-full flex items-center justify-center text-primary font-semibold">
                  R
                </div>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Ritvi</p>
                <p className="text-xs text-muted-foreground">Musician/Artist</p>
                <p className="text-xs text-muted-foreground">Closing the event with a special live music experience</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Host</h2>
          </div>
          <div className="flex items-center gap-3 p-3 bg-card rounded-lg">
            <Avatar className="w-12 h-12">
              <AvatarImage src="https://api.dicebear.com/7.x/initials/svg?seed=TI" />
              <AvatarFallback>TI</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium text-foreground">Techies India</p>
                <BadgeCheck className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Official tech community for developers</p>
            </div>
            <button className="text-xs text-primary font-medium" data-testid="button-view-profile">
              View Profile
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">
              Guests ({totalGuests} attending)
            </h2>
            {totalGuests > 0 && (
              <button className="text-xs text-primary font-medium" data-testid="button-see-all-guests">
                See all
              </button>
            )}
          </div>
          {totalGuests > 0 ? (
            <div className="flex items-center gap-2">
              {displayedGuests.map((guest) => (
                <Avatar key={guest.id} className="w-10 h-10">
                  <AvatarImage src={guest.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${guest.id}`} />
                  <AvatarFallback>{guest.id.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              ))}
              {remainingGuests > 0 && (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">+{remainingGuests}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No guests yet</p>
          )}
        </div>

        <div className="mb-20">
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Comments ({comments.length})
          </h2>
          <div className="space-y-4 mb-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={c.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.id}`} />
                  <AvatarFallback>{c.id.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">{c.userName || "Anonymous"}</p>
                    <span className="text-xs text-muted-foreground">1d ago</span>
                  </div>
                  <p className="text-sm text-foreground">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=current" />
              <AvatarFallback>ME</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Textarea
                placeholder="Add comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none min-h-[40px] h-10"
                data-testid="input-comment"
              />
              <button
                onClick={() => comment && commentMutation.mutate(comment)}
                disabled={!comment || commentMutation.isPending}
                className="w-10 h-10 rounded-full bg-gradient-primary text-white flex items-center justify-center disabled:opacity-50"
                data-testid="button-send-comment"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 flex gap-3">
        <Button
          variant="outline"
          className="flex-shrink-0"
          data-testid="button-share"
        >
          <Share className="w-4 h-4" />
        </Button>
        <Button
          className="flex-1 bg-gradient-primary text-white border-none"
          onClick={() => joinMutation.mutate()}
          disabled={joinMutation.isPending}
          data-testid="button-join-event"
        >
          {joinMutation.isPending ? "Joining..." : "Join Event"}
        </Button>
      </div>
    </div>
  );
}
