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

interface CreateNewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function CreateNewsDialog({
  open,
  onOpenChange,
  userId,
}: CreateNewsDialogProps) {
  const { toast } = useToast();
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("Local");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!headline.trim() || !description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await api.createNews({
        userId,
        headline: headline.trim(),
        description: description.trim(),
        location: location.trim() || "Unknown",
        category,
        imageUrl: null,
        trueVotes: 0,
        fakeVotes: 0,
        likesCount: 0,
        commentsCount: 0,
        publishedAt: new Date(),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      
      toast({
        title: "Success!",
        description: "News posted successfully",
      });

      setHeadline("");
      setDescription("");
      setLocation("");
      setCategory("Local");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post news. Please try again.",
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
          <DialogTitle>Create News</DialogTitle>
          <DialogDescription>
            Share local news with your community
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="news-headline">Headline *</Label>
              <Input
                id="news-headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g., New café opening in Swaroop Nagar"
                data-testid="input-news-headline"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="news-description">Description *</Label>
              <Textarea
                id="news-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about the news"
                data-testid="input-news-description"
                className="min-h-20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="news-location">Location</Label>
                <Input
                  id="news-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Kanpur"
                  data-testid="input-news-location"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="news-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-news-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Local">Local</SelectItem>
                    <SelectItem value="National">National</SelectItem>
                    <SelectItem value="SPORT">Sport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-news"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-primary text-white"
              disabled={isLoading}
              data-testid="button-submit-news"
            >
              {isLoading ? "Posting..." : "Post News"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
