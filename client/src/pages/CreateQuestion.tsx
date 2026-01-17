import { useState } from "react";
import { ArrowLeft, HelpCircle, X, Loader2, Tag } from "lucide-react";
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

const QUESTION_CATEGORIES = ["Recommendations", "Local Info", "Community", "Tech Help", "General", "Events", "Other"];

export default function CreateQuestion() {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';

  const createQuestionMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      content?: string;
      category: string;
      tags?: string[];
    }) => {
      return api.createQuestion({
        userId: currentUserId,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast({
        title: "Question posted!",
        description: "Your question has been shared with the community.",
      });
      setLocation("/discuss");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post question. Please try again.",
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

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter your question.",
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

    createQuestionMutation.mutate({
      title: title.trim(),
      content: content.trim() || undefined,
      category,
      tags: tags.length > 0 ? tags : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => setLocation("/discuss")} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Ask a Question</h1>
          <Button
            onClick={handleSubmit}
            disabled={createQuestionMutation.isPending}
            className="bg-gradient-primary text-white"
          >
            {createQuestionMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Post"
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Question Icon */}
        <div className="flex justify-center py-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Your Question</Label>
          <Input
            placeholder="What would you like to know?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
          <div className="text-xs text-muted-foreground text-right mt-1">
            {title.length}/200
          </div>
        </div>

        {/* Details */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Details (optional)</Label>
          <Textarea
            placeholder="Add more context to help others understand your question..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none"
            maxLength={2000}
          />
          <div className="text-xs text-muted-foreground text-right mt-1">
            {content.length}/2000
          </div>
        </div>

        {/* Category */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                placeholder="Add relevant tags"
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
                  className="cursor-pointer"
                  onClick={() => removeTag(tag)}
                >
                  {tag}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">Tips for good questions</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Be specific and clear about what you need</li>
            <li>• Add relevant context and details</li>
            <li>• Use tags to help others find your question</li>
            <li>• Check if your question was already asked</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
