import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { ChevronLeft, ImageIcon, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { insertEventSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Guest {
  id: string;
  name: string;
  role: string;
}

const createEventFormSchema = insertEventSchema
  .omit({ 
    attendeesCount: true,
    startDate: true,
    endDate: true,
  })
  .extend({
    hostName: z.string().min(1, "Host name is required"),
    startDate: z.string().min(1, "Start date is required"),
    startTime: z.string().min(1, "Start time is required"),
    endDate: z.string().optional(),
    endTime: z.string().optional(),
    maxAttendees: z.string().optional(),
  });

type CreateEventFormValues = z.infer<typeof createEventFormSchema>;

export default function CreateEvent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentUserId = "current-user-id";

  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestRole, setGuestRole] = useState("");

  const form = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventFormSchema),
    defaultValues: {
      userId: currentUserId,
      title: "",
      hostName: "",
      description: "",
      location: "",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      maxAttendees: "",
      visibility: "Public",
      entryType: "FREE",
      price: null,
      imageUrl: null,
      category: [],
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: CreateEventFormValues) => {
      const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
      const endDateTime = data.endDate && data.endTime 
        ? new Date(`${data.endDate}T${data.endTime}`)
        : undefined;

      const eventData: any = {
        userId: data.userId,
        title: data.title.trim(),
        location: data.location.trim(),
        entryType: data.entryType,
        visibility: data.visibility,
        startDate: startDateTime.toISOString(),
        category: data.category || [],
      };

      // Only include optional fields if they have values
      if (data.description?.trim()) {
        eventData.description = data.description.trim();
      }
      if (endDateTime) {
        eventData.endDate = endDateTime.toISOString();
      }
      if (data.maxAttendees) {
        eventData.maxAttendees = parseInt(data.maxAttendees);
      }
      if (data.price !== null) {
        eventData.price = data.price;
      }
      if (data.imageUrl) {
        eventData.imageUrl = data.imageUrl;
      }

      return apiRequest("POST", "/api/events", eventData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success!",
        description: "Event published successfully",
      });
      setLocation("/events");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateEventFormValues) => {
    createEventMutation.mutate(data);
  };

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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-6">
            {/* Event Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Event Title*</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Mumbai Startup Meetup"
                      data-testid="input-event-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Host Name */}
            <FormField
              control={form.control}
              name="hostName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Host Organization or Personal Name*
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., IIT Bombay E-Cell or Priya Singh"
                      data-testid="input-host-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Tell everyone what your event is about..."
                      className="min-h-24 resize-none"
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Add Photos/Videos */}
            <div className="space-y-2">
              <FormLabel className="text-sm font-medium">Add Photos/Videos (Optional)</FormLabel>
              <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center gap-2 bg-muted/30">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Tap to upload from gallery</p>
              </div>
            </div>

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Location*</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Search or pick on map"
                      data-testid="input-location"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Starts*</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        data-testid="input-start-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">&nbsp;</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="time"
                        data-testid="input-start-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* End Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Ends (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        type="date"
                        data-testid="input-end-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">&nbsp;</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        type="time"
                        data-testid="input-end-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Maximum Attendees */}
            <FormField
              control={form.control}
              name="maxAttendees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Maximum Attendees</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      type="number"
                      placeholder="e.g., 100 (or leave blank for unlimited)"
                      min="1"
                      data-testid="input-max-attendees"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Event Visibility */}
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold">Event Visibility</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="space-y-3"
                    >
                      <div
                        className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer ${
                          field.value === "Public"
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                        onClick={() => field.onChange("Public")}
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
                          field.value === "Private"
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                        onClick={() => field.onChange("Private")}
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
                          field.value === "Invite Only"
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                        onClick={() => field.onChange("Invite Only")}
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
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Entry Type */}
            <FormField
              control={form.control}
              name="entryType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-sm font-semibold">Entry Type*</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        type="button"
                        variant={field.value === "FREE" ? "default" : "outline"}
                        className={field.value === "FREE" ? "bg-gradient-primary text-white" : ""}
                        onClick={() => field.onChange("FREE")}
                        data-testid="button-entry-free"
                      >
                        Free
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "PAID" ? "default" : "outline"}
                        className={field.value === "PAID" ? "bg-gradient-primary text-white" : ""}
                        onClick={() => field.onChange("PAID")}
                        data-testid="button-entry-paid"
                      >
                        Paid
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "SPONSORED" ? "default" : "outline"}
                        className={field.value === "SPONSORED" ? "bg-gradient-primary text-white" : ""}
                        onClick={() => field.onChange("SPONSORED")}
                        data-testid="button-entry-sponsored"
                      >
                        Sponsored
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Guest Details */}
            <div className="space-y-3">
              <FormLabel className="text-sm font-semibold">Guest Details (Optional)</FormLabel>
              
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
                    type="button"
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
                type="submit"
                disabled={createEventMutation.isPending}
                className="flex-1 h-11 bg-gradient-primary text-white"
                data-testid="button-publish"
              >
                {createEventMutation.isPending ? "Publishing..." : "Publish"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
