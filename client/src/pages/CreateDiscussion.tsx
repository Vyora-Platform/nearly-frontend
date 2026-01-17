import { useState } from "react";
import { ArrowLeft, MessageSquareMore, X, Loader2, Tag, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Expanded hyperlocal discussion categories
const DISCUSSION_CATEGORIES = [
  // General Community
  { value: "general", label: "General Discussion", description: "Open topics for community" },
  { value: "tips", label: "Tips & Advice", description: "Share helpful tips" },
  { value: "announcements", label: "Announcements", description: "Important community updates" },
  
  // Local Issues
  { value: "local-issues", label: "Local Issues", description: "Neighborhood concerns" },
  { value: "traffic", label: "Traffic & Roads", description: "Traffic updates and road conditions" },
  { value: "safety", label: "Safety & Security", description: "Safety concerns and alerts" },
  { value: "utilities", label: "Utilities & Services", description: "Water, electricity, gas issues" },
  { value: "construction", label: "Construction Updates", description: "Building and roadwork updates" },
  { value: "noise", label: "Noise Complaints", description: "Noise disturbances in the area" },
  { value: "parking", label: "Parking Issues", description: "Parking problems and solutions" },
  { value: "pollution", label: "Pollution & Environment", description: "Environmental concerns" },
  
  // Recommendations
  { value: "recommendations", label: "Recommendations", description: "Suggest local spots" },
  { value: "restaurants", label: "Food & Restaurants", description: "Restaurant recommendations" },
  { value: "shops", label: "Local Shops", description: "Shop recommendations" },
  { value: "services", label: "Services", description: "Service provider recommendations" },
  { value: "healthcare", label: "Healthcare", description: "Doctors, clinics, hospitals" },
  { value: "education", label: "Education", description: "Schools, tutors, courses" },
  { value: "entertainment", label: "Entertainment", description: "Fun activities nearby" },
  
  // Help & Support
  { value: "help-wanted", label: "Help Wanted", description: "Request community help" },
  { value: "lost-found", label: "Lost & Found", description: "Lost or found items/pets" },
  { value: "neighbors-help", label: "Neighbor Help", description: "Help from neighbors" },
  
  // Community Life
  { value: "rants", label: "Rants & Vents", description: "Get things off your chest" },
  { value: "praise", label: "Praise & Thanks", description: "Appreciate community members" },
  { value: "community-events", label: "Community Events", description: "Local event discussions" },
  { value: "pets", label: "Pets & Animals", description: "Pet-related discussions" },
  { value: "gardening", label: "Gardening", description: "Gardening tips and help" },
  { value: "housing", label: "Housing & Property", description: "Housing discussions" },
  
  // Other
  { value: "other", label: "Other", description: "Miscellaneous topics" },
];

export default function CreateDiscussion() {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';

  const createDiscussionMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      content?: string;
      category: string;
      tags?: string[];
    }) => {
      return api.createDiscussion({
        userId: currentUserId,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discussions"] });
      toast({
        title: "Discussion started!",
        description: "Your discussion has been posted to the community.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create discussion. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase()) && tags.length < 5) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter a title for your discussion.",
        variant: "destructive",
      });
      return;
    }

    if (!category) {
      toast({
        title: "Missing category",
        description: "Please select a category.",
        variant: "destructive",
      });
      return;
    }

    await createDiscussionMutation.mutateAsync({
      title: title.trim(),
      content: content.trim() || undefined,
      category,
      tags: tags.length > 0 ? tags : undefined,
    });
  };

  const selectedCategoryInfo = DISCUSSION_CATEGORIES.find(c => c.value === category);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => setLocation("/")} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Start Discussion</h1>
          <Button
            onClick={handleSubmit}
            disabled={createDiscussionMutation.isPending}
            className="bg-gradient-primary text-white"
          >
            {createDiscussionMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Post"
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Discussion Icon */}
        <div className="flex justify-center py-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquareMore className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Info Banner - No Media */}
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl border border-border">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Text-Only Discussions</p>
            <p className="text-xs text-muted-foreground mt-1">
              Discussions are text-based to encourage meaningful conversations. 
              Community members can discuss and reply to each other's points.
            </p>
          </div>
        </div>

        {/* Title */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Title *</Label>
          <Input
            placeholder="What's on your mind?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="text-lg"
          />
          <div className="text-xs text-muted-foreground text-right mt-1">
            {title.length}/200
          </div>
        </div>

        {/* Content */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Details (optional)</Label>
          <Textarea
            placeholder="Share more details, context, or your thoughts..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] resize-none"
            maxLength={5000}
          />
          <div className="text-xs text-muted-foreground text-right mt-1">
            {content.length}/5000
          </div>
        </div>

        {/* Category */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Category *</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select a topic category" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {DISCUSSION_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  <div className="flex flex-col">
                    <span>{cat.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCategoryInfo && (
            <p className="text-xs text-muted-foreground mt-2">
              {selectedCategoryInfo.description}
            </p>
          )}
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Tags (optional)</Label>
            <span className="text-xs text-muted-foreground">{tags.length}/5</span>
          </div>
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Add tags to help others find this"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                className="pl-10"
                disabled={tags.length >= 5}
              />
            </div>
            <Button variant="outline" onClick={addTag} disabled={tags.length >= 5}>
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive/20"
                  onClick={() => removeTag(tag)}
                >
                  #{tag}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Community Guidelines */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-medium">Community Guidelines</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Be respectful and considerate of others</li>
            <li>• Stay on topic and relevant to the category</li>
            <li>• No spam, harassment, or hate speech</li>
            <li>• Discussions are text-only to encourage thoughtful engagement</li>
            <li>• Use "Discuss" to reply and engage with others' points</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
