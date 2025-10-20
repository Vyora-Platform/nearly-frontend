import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Calendar, Users, DollarSign, Share, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface Attendee {
  id: string;
  activityId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
}

interface Question {
  id: string;
  activityId: string;
  userId: string;
  content: string;
  createdAt: Date;
  userName?: string;
  userAvatar?: string;
  reply?: string;
}

export default function ActivityDetails() {
  const [, params] = useRoute("/activity/:id");
  const [, setLocation] = useLocation();
  const activityId = params?.id;
  const [question, setQuestion] = useState("");
  const currentUserId = "current-user-id";

  const { data: activity, isLoading } = useQuery<any>({
    queryKey: ["/api/activities", activityId],
    enabled: !!activityId,
  });

  const { data: attendees = [] } = useQuery<Attendee[]>({
    queryKey: ["/api/activities", activityId, "attendees"],
    enabled: !!activityId,
  });

  const joinMutation = useMutation({
    mutationFn: () => apiRequest(`/api/activities/${activityId}/join`, "POST", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities", activityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities", activityId, "attendees"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Activity not found</p>
      </div>
    );
  }

  const totalAttendees = attendees.length;
  const displayedAttendees = attendees.slice(0, 3);
  const remainingAttendees = Math.max(0, totalAttendees - 3);
  const maxParticipants = activity.maxParticipants || 0;
  const spotsLeft = maxParticipants > 0 ? Math.max(0, maxParticipants - totalAttendees) : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="relative">
        {activity.imageUrl && (
          <img
            src={activity.imageUrl}
            alt={activity.title}
            className="w-full h-64 object-cover"
          />
        )}
        <button
          onClick={() => setLocation("/")}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4">
        <div className="mb-3">
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-activity-title">
            {activity.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Posted {activity.createdAt ? format(new Date(activity.createdAt), "MMMM dd, yyyy") : "Recently"}
          </p>
        </div>

        <div className="mb-6">
          <p className="text-sm text-foreground leading-relaxed" data-testid="text-activity-description">
            {activity.description || "No description provided"}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 p-3 bg-card rounded-lg">
            <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Date & Time</p>
              <p className="text-sm font-medium text-foreground" data-testid="text-activity-date">
                {activity.startDate ? format(new Date(activity.startDate), "MMMM dd, yyyy, h:mm a") : "Date TBD"}
                {activity.endDate && ` - ${format(new Date(activity.endDate), "h:mm a")}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-card rounded-lg">
            <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-sm font-medium text-foreground" data-testid="text-activity-location">
                {activity.location || "Location TBD"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-card rounded-lg">
            <DollarSign className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Entry</p>
              <p className="text-sm font-medium text-foreground" data-testid="text-activity-entry">
                {activity.cost === "FREE" ? "Free" : `Paid Entry (Approx. ₹${activity.cost || "350"} per ticket)`}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Host</h2>
          </div>
          <div className="flex items-center gap-3 p-3 bg-card rounded-lg">
            <Avatar className="w-12 h-12">
              <AvatarImage src={activity.hostAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activity.userId}`} />
              <AvatarFallback>{activity.hostName?.charAt(0) || "H"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground" data-testid="text-host-name">
                {activity.hostName || "@rahul_kanpur"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-primary/10"
              data-testid="button-follow"
            >
              Follow
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">
              Attendees ({totalAttendees}/{maxParticipants || "unlimited"})
            </h2>
            {spotsLeft !== null && spotsLeft > 0 && (
              <p className="text-xs text-muted-foreground">
                {spotsLeft} spots left
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Guests are allowed
          </p>
          {totalAttendees > 0 ? (
            <div className="flex items-center gap-2">
              {displayedAttendees.map((attendee) => (
                <Avatar key={attendee.id} className="w-10 h-10">
                  <AvatarImage src={attendee.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${attendee.id}`} />
                  <AvatarFallback>{attendee.id.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              ))}
              {remainingAttendees > 0 && (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">+{remainingAttendees}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No attendees yet. Be the first to join!</p>
          )}
        </div>

        <div className="mb-20">
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Questions & Doubts
          </h2>
          
          <div className="space-y-4 mb-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=priya" />
                  <AvatarFallback>PS</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">@priya_sharma</p>
                    <span className="text-xs text-muted-foreground">1h ago</span>
                  </div>
                  <p className="text-sm text-foreground mb-2">
                    Hey, I'm really excited! How are we handling the tickets? Should we book individually?
                  </p>
                  <div className="pl-4 border-l-2 border-primary/20 ml-2">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-primary">@rahul_kanpur</p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                        Host
                      </Badge>
                      <span className="text-xs text-muted-foreground">55m ago</span>
                    </div>
                    <p className="text-sm text-foreground">
                      Great question, @priya_sharma! I was thinking we could book for everyone to make sure we get seats together. Let me know if that works for you all!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=current" />
              <AvatarFallback>ME</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Textarea
                placeholder="Ask a question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="resize-none min-h-[40px] h-10"
                data-testid="input-question"
              />
              <button
                onClick={() => setQuestion("")}
                disabled={!question}
                className="w-16 h-10 rounded-lg bg-gradient-primary text-white text-sm font-medium flex items-center justify-center disabled:opacity-50"
                data-testid="button-post-question"
              >
                Post
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
          data-testid="button-send-request"
        >
          {joinMutation.isPending ? "Sending..." : "Send Participation Request"}
        </Button>
      </div>
    </div>
  );
}
