import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ImageIcon, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Guest {
  id: string;
  name: string;
  role: string;
}

export default function CreateEvent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentUserId = "current-user-id";

  const [eventTitle, setEventTitle] = useState("");
  const [hostName, setHostName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocationField] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [visibility, setVisibility] = useState("Public");
  const [entryType, setEntryType] = useState("Free");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestRole, setGuestRole] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const addGuest = () => {
    if (guestName.trim() && guestRole.trim()) {
      setGuests([...guests, { id: Date.now().toString(), name: guestName, role: guestRole }]);
      setGuestName("");
      setGuestRole("");
    }
  };

  const removeGuest = (id: string) => {
    setGuests(guests.filter(g => g.id !== id));
  };

  const handleSubmit = async () => {
    if (!eventTitle.trim() || !hostName.trim() || !location.trim() || !startDate || !startTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = endDate && endTime ? new Date(`${endDate}T${endTime}`) : null;

      await api.createEvent({
        userId: currentUserId,
        title: eventTitle.trim(),
        description: description.trim() || null,
        location: location.trim(),
        entryType: entryType === "Free" ? "FREE" : entryType === "Paid" ? "PAID" : "SPONSORED",
        price: null,
        visibility,
        imageUrl: null,
        startDate: startDateTime,
        endDate: endDateTime,
        maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
        category: [],
        attendeesCount: 0,
        createdAt: new Date(),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      
      toast({
        title: "Success!",
        description: "Event published successfully",
      });

      setLocation("/events");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <button
            onClick={() => setLocation("/events")}
            className="hover-elevate active-elevate-2"
            data-testid="button-back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Create Event</h1>
        </div>

        <div className="p-4 space-y-6">
          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="event-title" className="text-sm font-medium">
              Event Title*
            </Label>
            <Input
              id="event-title"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="e.g., Mumbai Startup Meetup"
              data-testid="input-event-title"
            />
          </div>

          {/* Host Name */}
          <div className="space-y-2">
            <Label htmlFor="host-name" className="text-sm font-medium">
              Host Organization or Personal Name*
            </Label>
            <Input
              id="host-name"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="e.g., IIT Bombay E-Cell or Priya Singh"
              data-testid="input-host-name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell everyone what your event is about..."
              className="min-h-24 resize-none"
              data-testid="input-description"
            />
          </div>

          {/* Add Photos/Videos */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Add Photos/Videos (Optional)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center gap-2 bg-muted/30">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Tap to upload from gallery</p>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium">
              Location*
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocationField(e.target.value)}
              placeholder="Search or pick on map"
              className="pl-9"
              data-testid="input-location"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-sm font-medium">
                Starts*
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-time" className="text-sm font-medium">
                &nbsp;
              </Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                data-testid="input-start-time"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="end-date" className="text-sm font-medium">
                Ends (Optional)
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time" className="text-sm font-medium">
                &nbsp;
              </Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                data-testid="input-end-time"
              />
            </div>
          </div>

          {/* Maximum Attendees */}
          <div className="space-y-2">
            <Label htmlFor="max-attendees" className="text-sm font-medium">
              Maximum Attendees
            </Label>
            <Input
              id="max-attendees"
              type="number"
              value={maxAttendees}
              onChange={(e) => setMaxAttendees(e.target.value)}
              placeholder="e.g., 100 (or leave blank for unlimited)"
              min="1"
              data-testid="input-max-attendees"
            />
          </div>

          {/* Event Visibility */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Event Visibility</Label>
            <RadioGroup value={visibility} onValueChange={setVisibility}>
              <div className="space-y-3">
                <div
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer ${
                    visibility === "Public"
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  onClick={() => setVisibility("Public")}
                  data-testid="radio-visibility-public"
                >
                  <RadioGroupItem value="Public" id="public" className="mt-0.5" />
                  <div className="flex-1">
                    <label htmlFor="public" className="font-medium cursor-pointer">
                      Public
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Anyone can see and join this event.
                    </p>
                  </div>
                </div>

                <div
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer ${
                    visibility === "Private"
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  onClick={() => setVisibility("Private")}
                  data-testid="radio-visibility-private"
                >
                  <RadioGroupItem value="Private" id="private" className="mt-0.5" />
                  <div className="flex-1">
                    <label htmlFor="private" className="font-medium cursor-pointer">
                      Private
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Only people you approve can join.
                    </p>
                  </div>
                </div>

                <div
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer ${
                    visibility === "Invite Only"
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  onClick={() => setVisibility("Invite Only")}
                  data-testid="radio-visibility-invite"
                >
                  <RadioGroupItem value="Invite Only" id="invite-only" className="mt-0.5" />
                  <div className="flex-1">
                    <label htmlFor="invite-only" className="font-medium cursor-pointer">
                      Invite Only
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Anyone with the link can join.
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Entry Type */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Entry Type*</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                type="button"
                variant={entryType === "Free" ? "default" : "outline"}
                className={entryType === "Free" ? "bg-gradient-primary text-white" : ""}
                onClick={() => setEntryType("Free")}
                data-testid="button-entry-free"
              >
                Free
              </Button>
              <Button
                type="button"
                variant={entryType === "Paid" ? "default" : "outline"}
                className={entryType === "Paid" ? "bg-gradient-primary text-white" : ""}
                onClick={() => setEntryType("Paid")}
                data-testid="button-entry-paid"
              >
                Paid
              </Button>
              <Button
                type="button"
                variant={entryType === "Sponsored" ? "default" : "outline"}
                className={entryType === "Sponsored" ? "bg-gradient-primary text-white" : ""}
                onClick={() => setEntryType("Sponsored")}
                data-testid="button-entry-sponsored"
              >
                Sponsored
              </Button>
            </div>
          </div>

          {/* Guest Details */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Guest Details (Optional)</Label>
            
            {guests.map((guest) => (
              <div
                key={guest.id}
                className="flex items-center gap-3 p-3 bg-muted rounded-lg"
              >
                <Avatar className="w-10 h-10 bg-primary/10">
                  <AvatarFallback>
                    <User className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{guest.name}</p>
                  <p className="text-xs text-muted-foreground">{guest.role}</p>
                </div>
                <button
                  onClick={() => removeGuest(guest.id)}
                  className="text-muted-foreground hover-elevate active-elevate-2"
                  data-testid={`button-remove-guest-${guest.id}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            <div className="space-y-2">
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Guest Name"
                data-testid="input-guest-name"
              />
              <Input
                value={guestRole}
                onChange={(e) => setGuestRole(e.target.value)}
                placeholder="Role, e.g., Team Captain"
                data-testid="input-guest-role"
              />
            </div>

            <button
              type="button"
              onClick={addGuest}
              className="text-primary font-medium text-sm flex items-center gap-1"
              data-testid="button-add-guest"
            >
              <span className="text-lg">+</span> Add another participant
            </button>
          </div>

          {/* Bottom Buttons */}
          <div className="flex gap-3 pt-4 pb-6">
            <Button
              type="button"
              variant="secondary"
              className="flex-1 h-11"
              data-testid="button-preview"
            >
              Preview
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 h-11 bg-gradient-primary text-white"
              data-testid="button-publish"
            >
              {isLoading ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
