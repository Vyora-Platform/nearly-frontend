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

interface CreateActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function CreateActivityDialog({
  open,
  onOpenChange,
  userId,
}: CreateActivityDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("Movies");
  const [cost, setCost] = useState("Free");
  const [maxParticipants, setMaxParticipants] = useState("");
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
      await api.createActivity({
        userId,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim(),
        category,
        cost,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        visibility: "Public",
        imageUrl: null,
        startDate: new Date(Date.now() + 86400000),
        endDate: null,
        likesCount: 0,
        commentsCount: 0,
        participantsCount: 0,
        createdAt: new Date(),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      
      toast({
        title: "Success!",
        description: "Activity created successfully",
      });

      setTitle("");
      setDescription("");
      setLocation("");
      setCategory("Movies");
      setCost("Free");
      setMaxParticipants("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create activity. Please try again.",
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
          <DialogTitle>Create Activity</DialogTitle>
          <DialogDescription>
            Share what you're planning to do and invite others to join
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Going to watch a movie"
                data-testid="input-activity-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details about your activity"
                data-testid="input-activity-description"
                className="min-h-20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., PVR Mall, Kanpur"
                data-testid="input-activity-location"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-activity-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Movies">Movies</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Food">Food</SelectItem>
                  <SelectItem value="Gaming">Gaming</SelectItem>
                  <SelectItem value="Travel">Travel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Cost</Label>
                <Select value={cost} onValueChange={setCost}>
                  <SelectTrigger data-testid="select-activity-cost">
                    <SelectValue placeholder="Select cost" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Free">Free</SelectItem>
                    <SelectItem value="Paid Entry">Paid Entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Max Participants</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  placeholder="10"
                  min="1"
                  data-testid="input-activity-max-participants"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-primary text-white"
              disabled={isLoading}
              data-testid="button-create-activity"
            >
              {isLoading ? "Creating..." : "Create Activity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
