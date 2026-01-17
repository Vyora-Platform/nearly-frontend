import { useState } from "react";
import { ArrowLeft, Newspaper, X, Loader2, Tag, ImageIcon, Link } from "lucide-react";
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
import { mediaApi } from "@/lib/gateway-api";
import { useToast } from "@/hooks/use-toast";

const NEWS_CATEGORIES = [
  "Local",
  "Community",
  "Safety",
  "Traffic",
  "Weather",
  "Events",
  "Politics",
  "Business",
  "Sports",
  "Education",
  "Health",
  "Environment",
  "Technology",
  "Entertainment",
];

export default function CreateNews() {
  const [, setLocation] = useLocation();
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const createNewsMutation = useMutation({
    mutationFn: async (data: {
      headline: string;
      description?: string;
      content?: string;
      category: string;
      imageUrl?: string;
      sourceUrl?: string;
    }) => {
      return api.createNews({
        userId: currentUserId,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast({
        title: "News shared!",
        description: "Your news has been posted to the community.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create news. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    if (!headline.trim()) {
      toast({
        title: "Missing headline",
        description: "Please enter a headline for your news.",
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

    setIsUploading(true);

    try {
      let imageUrl: string | undefined;
      
      if (imageFile) {
        try {
          // userId is now extracted from JWT token on server
          const uploadResult = await mediaApi.uploadFile(
            imageFile,
            "NEWS"
          );
          if (uploadResult.success && uploadResult.url) {
            imageUrl = uploadResult.url;
          }
        } catch (error) {
          console.error("Image upload failed:", error);
        }
      }

      await createNewsMutation.mutateAsync({
        headline: headline.trim(),
        description: description.trim() || undefined,
        content: content.trim() || undefined,
        category,
        imageUrl,
        sourceUrl: sourceUrl.trim() || undefined,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => setLocation("/")} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Share News</h1>
          <Button
            onClick={handleSubmit}
            disabled={createNewsMutation.isPending || isUploading}
            className="bg-gradient-primary text-white"
          >
            {createNewsMutation.isPending || isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Post"
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* News Icon */}
        <div className="flex justify-center py-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Newspaper className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Headline */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Headline *</Label>
          <Input
            placeholder="What's the news?"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={200}
            className="text-lg"
          />
          <div className="text-xs text-muted-foreground text-right mt-1">
            {headline.length}/200
          </div>
        </div>

        {/* Description */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Summary (optional)</Label>
          <Textarea
            placeholder="Brief summary of the news..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[80px] resize-none"
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground text-right mt-1">
            {description.length}/500
          </div>
        </div>

        {/* Content */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Details (optional)</Label>
          <Textarea
            placeholder="Full news details..."
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
              <SelectValue placeholder="Select news category" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {NEWS_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Image Upload */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Image (optional)</Label>
          {imagePreview ? (
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="w-full h-48 object-cover rounded-xl"
              />
              <button
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
              <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Add an image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Source URL */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Source URL (optional)</Label>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="https://..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Guidelines */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-medium">Community Guidelines</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Share only accurate and verified news</li>
            <li>• Include source when sharing external news</li>
            <li>• Be respectful and avoid sensationalism</li>
            <li>• Community can vote on news authenticity</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
