import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  userId,
}: CreateEventDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [entryType, setEntryType] = useState("FREE");
  const [price, setPrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !location.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await api.createEvent({
        userId,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim(),
        entryType,
        price: entryType === "PAID" && price ? parseFloat(price) : null,
        visibility: "Public",
        imageUrl: null,
        startDate: new Date(Date.now() + 604800000),
        endDate: null,
        maxAttendees: null,
        category: [],
        attendeesCount: 0,
        createdAt: new Date(),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      
      toast({
        title: "Success!",
        description: "Event created successfully",
      });

      setTitle("");
      setDescription("");
      setLocation("");
      setEntryType("FREE");
      setPrice("");
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
          <DialogDescription>
            Share an upcoming event with your community
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Title *</Label>
              <Input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., TechSparks 2024"
                data-testid="input-event-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add event details"
                data-testid="input-event-description"
                className="min-h-20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-location">Location *</Label>
              <Input
                id="event-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Bangalore International Centre"
                data-testid="input-event-location"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entry-type">Entry Type</Label>
                <Select value={entryType} onValueChange={setEntryType}>
                  <SelectTrigger data-testid="select-event-entry">
                    <SelectValue placeholder="Select entry type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">Free</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {entryType === "PAID" && (
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="500"
                    min="0"
                    step="0.01"
                    data-testid="input-event-price"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-event"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-primary text-white"
              disabled={isLoading}
              data-testid="button-submit-event"
            >
              {isLoading ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
