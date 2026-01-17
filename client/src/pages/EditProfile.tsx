import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Camera, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { mediaApi } from "@/lib/gateway-api";
import { useToast } from "@/hooks/use-toast";

// Available interests for selection
const AVAILABLE_INTERESTS = [
  "Sports", "Music", "Art", "Technology", "Gaming", "Travel", 
  "Food", "Fitness", "Photography", "Reading", "Movies", "Fashion",
  "Nature", "Cooking", "Dancing", "Writing", "Yoga", "Meditation",
  "Business", "Science", "Politics", "History", "Languages", "Volunteering"
];

export default function EditProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = localStorage.getItem('nearly_user_id');
  const { data: user, isLoading } = useQuery({
    queryKey: ["current-user", userId],
    queryFn: () => api.getCurrentUser(),
    enabled: !!userId,
  });

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    bio: "",
    location: "",
    website: "",
  });

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Initialize form data when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        username: user.username || "",
        bio: user.bio || "",
        location: user.location || "",
        website: user.website || "",
      });
      setSelectedInterests(user.interests || []);
    }
  }, [user]);

  const updateUserMutation = useMutation({
    mutationFn: (data: any) => api.updateUser(user?.id || "", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      queryClient.invalidateQueries({ queryKey: ["current-user", userId] });
      queryClient.invalidateQueries({ queryKey: ["user", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/username", user?.username] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setLocation("/profile");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    updateUserMutation.mutate({
      ...formData,
      interests: selectedInterests,
    });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      // userId is now extracted from JWT token on server
      const result = await mediaApi.uploadFile(
        file,
        "PROFILE"
      );

      if (result.success && result.url) {
        // Update user avatar
        await api.updateUser(user?.id || "", { avatarUrl: result.url });
        queryClient.invalidateQueries({ queryKey: ["current-user"] });
        toast({
          title: "Photo updated",
          description: "Your profile photo has been updated.",
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
      setAvatarPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const displayAvatar = avatarPreview || user?.avatarUrl;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => setLocation("/profile")} className="p-1">
            <X className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Edit profile</h1>
          <button 
            onClick={handleSaveProfile}
            disabled={updateUserMutation.isPending}
            className="text-primary font-semibold disabled:opacity-50"
          >
            {updateUserMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Photo */}
        <div className="flex flex-col items-center">
          <div className="relative" onClick={handleAvatarClick}>
            <Avatar className="w-24 h-24 cursor-pointer">
              <AvatarImage src={displayAvatar} className="object-cover" />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <Camera className="w-8 h-8 text-white" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Camera className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button 
            onClick={handleAvatarClick}
            className="mt-3 text-primary font-semibold text-sm"
          >
            Change profile photo
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
              Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Your name"
              className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
              Username
            </label>
            <Input
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
              placeholder="username"
              className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
              Bio
            </label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell people a little about yourself"
              rows={3}
              maxLength={150}
              className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary resize-none"
            />
            <p className="text-xs text-muted-foreground text-right mt-1">
              {formData.bio.length}/150
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
              Location
            </label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Add your location"
              className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
              Website
            </label>
            <Input
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="Add your website"
              className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>
        </div>

        {/* Interests Section */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-3">
            Interests
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            Select your interests to help others know you better
          </p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_INTERESTS.map((interest) => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedInterests.includes(interest)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* Professional Dashboard Link */}
        <div className="pt-4 border-t border-border">
          <button className="w-full text-left py-3 text-primary font-medium">
            Switch to professional account
          </button>
          <button 
            className="w-full text-left py-3 text-primary font-medium"
            onClick={() => setLocation("/profile-settings")}
          >
            Personal information settings
          </button>
        </div>
      </div>
    </div>
  );
}
