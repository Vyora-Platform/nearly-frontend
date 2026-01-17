import { useState, useRef } from "react";
import { ArrowLeft, Image, X, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { mediaApi } from "@/lib/gateway-api";
import { useToast } from "@/hooks/use-toast";

const MAX_IMAGES = 10;

export default function CreatePost() {
  const [, setLocation] = useLocation();
  const [caption, setCaption] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';

  const createPostMutation = useMutation({
    mutationFn: async (data: {
      caption: string;
      location?: string;
      tags?: string[];
      mediaUrls: string[];
    }) => {
      return api.createPost({
        userId: currentUserId,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({
        title: "Post created!",
        description: "Your post has been shared.",
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (mediaFiles.length + files.length > MAX_IMAGES) {
      toast({
        title: "Too many files",
        description: `You can only upload up to ${MAX_IMAGES} images/videos.`,
        variant: "destructive",
      });
      return;
    }

    const newFiles = [...mediaFiles, ...files];
    setMediaFiles(newFiles);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (mediaFiles.length === 0) {
      toast({
        title: "No media",
        description: "Please add at least one photo or video.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload all media files using mediaApi (userId is now extracted from JWT token on server)
      const uploadResults = await mediaApi.uploadMultiple(
        mediaFiles,
        "ACTIVITY"
      );
      
      const mediaUrls = uploadResults
        .filter((r: any) => r.success)
        .map((r: any) => r.url);

      if (mediaUrls.length === 0) {
        throw new Error("No files uploaded successfully");
      }

      // Create post with media URLs
      await createPostMutation.mutateAsync({
        caption,
        mediaUrls,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload media. Please try again.",
        variant: "destructive",
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
          <h1 className="text-lg font-semibold">New Post</h1>
          <Button
            onClick={handleSubmit}
            disabled={mediaFiles.length === 0 || isUploading || createPostMutation.isPending}
            className="bg-gradient-primary text-white"
          >
            {isUploading || createPostMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Share"
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Media Upload */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium">Photos/Videos</label>
            <span className="text-xs text-muted-foreground">
              {mediaFiles.length}/{MAX_IMAGES}
            </span>
          </div>

          {mediaPreviews.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {mediaPreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  {mediaFiles[index]?.type.startsWith('video') ? (
                    <video src={preview} className="w-full h-full object-cover" />
                  ) : (
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => removeMedia(index)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {mediaFiles.length < MAX_IMAGES && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-xs">Add</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-video rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Image className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-medium">Add Photos/Videos</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tap to select from your device
                </p>
              </div>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Caption */}
        <div>
          <label className="text-sm font-medium mb-2 block">Caption</label>
          <Textarea
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="min-h-[120px] resize-none"
            maxLength={2200}
          />
          <div className="text-xs text-muted-foreground text-right mt-1">
            {caption.length}/2200
          </div>
        </div>


      </div>
    </div>
  );
}
