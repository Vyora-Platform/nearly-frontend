import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  FileText,
  Image as ImageIcon,
  Phone,
  Globe,
  X,
  Camera,
  Building,
  Users,
  Clapperboard,
  BookOpen,
  Mic,
  Dumbbell,
  Heart,
  Mail,
  MapPin,
  AtSign,
  Info,
  Link as LinkIcon,
  Facebook,
  Instagram,
  Twitter
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const pageCategories = [
  { id: "business", label: "Business", icon: Building },
  { id: "community", label: "Community", icon: Users },
  { id: "entertainment", label: "Entertainment", icon: Clapperboard },
  { id: "education", label: "Education", icon: BookOpen },
  { id: "news", label: "News & Media", icon: Mic },
  { id: "sports", label: "Sports", icon: Dumbbell },
  { id: "lifestyle", label: "Lifestyle", icon: Heart },
  { id: "other", label: "Other", icon: FileText },
];

export default function CreatePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    // Basic Info
    name: "",
    username: "",
    category: "business",
    
    // Descriptions
    shortDescription: "",
    about: "",
    
    // Contact
    email: "",
    phone: "",
    website: "",
    location: "",
    
    // Social Links
    facebook: "",
    instagram: "",
    twitter: "",
    
    // Images
    avatarUrl: "",
    coverUrl: "",
    
    // Options
    isVerified: false,
  });
  
  const queryClient = useQueryClient();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';
  
  // Create page mutation
  const createPageMutation = useMutation({
    mutationFn: (pageData: any) => api.createPage(pageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discover-pages'] });
      toast({
        title: "Page Created!",
        description: "Your page is now live.",
      });
      setLocation("/discover");
    },
    onError: (error) => {
      console.error('Failed to create page:', error);
      toast({
        title: "Error",
        description: "Failed to create page. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, coverUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.username || !formData.shortDescription) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Validate username format
    if (!/^[a-z0-9_]+$/.test(formData.username)) {
      toast({
        title: "Invalid username",
        description: "Username can only contain lowercase letters, numbers, and underscores.",
        variant: "destructive",
      });
      return;
    }

    const pageData = {
      name: formData.name,
      username: formData.username,
      category: formData.category,
      shortDescription: formData.shortDescription,
      description: formData.about || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      website: formData.website || undefined,
      location: formData.location || undefined,
      avatarUrl: formData.avatarUrl || undefined,
      coverUrl: formData.coverUrl || undefined,
      socialLinks: {
        facebook: formData.facebook || undefined,
        instagram: formData.instagram || undefined,
        twitter: formData.twitter || undefined,
      },
      isVerified: false,
      followersCount: 0,
      userId: currentUserId,
      createdAt: new Date().toISOString(),
    };

    createPageMutation.mutate(pageData);
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="max-w-md mx-auto flex items-center h-14 px-4">
          <button 
            onClick={() => setLocation("/discover")}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold ml-2">Create a Page</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto">
        {/* Cover & Avatar Section */}
        <div className="relative">
          {/* Cover Image */}
          <input
            type="file"
            ref={coverInputRef}
            onChange={handleCoverSelect}
            accept="image/*"
            className="hidden"
          />
          <div 
            onClick={() => coverInputRef.current?.click()}
            className="h-36 bg-gradient-to-br from-primary/20 to-primary/5 cursor-pointer relative overflow-hidden"
          >
            {formData.coverUrl ? (
              <>
                <img src={formData.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormData(prev => ({ ...prev, coverUrl: "" }));
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-sm">Add cover photo (820x312 recommended)</span>
                </div>
              </div>
            )}
          </div>

          {/* Avatar */}
          <input
            type="file"
            ref={avatarInputRef}
            onChange={handleAvatarSelect}
            accept="image/*"
            className="hidden"
          />
          <div 
            onClick={() => avatarInputRef.current?.click()}
            className="absolute -bottom-12 left-4 cursor-pointer"
          >
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-background">
                <AvatarImage src={formData.avatarUrl} />
                <AvatarFallback className="bg-muted text-2xl">
                  {formData.name?.[0] || <Camera className="w-8 h-8 text-muted-foreground" />}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full text-primary-foreground">
                <Camera className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 pt-16 space-y-6">
          {/* Page Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Page Name *
            </label>
            <Input
              placeholder="e.g., Delhi Food Lovers"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <AtSign className="w-4 h-4 text-primary" />
              Username *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                placeholder="delhifoodlovers"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                className="pl-8"
              />
            </div>
            <p className="text-xs text-muted-foreground">Only lowercase letters, numbers, and underscores</p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {pageCategories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                      formData.category === cat.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:border-primary/50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Short Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Short Description *</label>
            <Input
              placeholder="A brief tagline for your page"
              value={formData.shortDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.shortDescription.length}/100
            </p>
          </div>

          {/* About */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              About
            </label>
            <Textarea
              placeholder="Tell people what your page is about, your mission, what content you'll share..."
              value={formData.about}
              onChange={(e) => setFormData(prev => ({ ...prev, about: e.target.value }))}
              rows={5}
            />
          </div>

          {/* Contact Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              Contact Information
            </h3>
            
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground flex items-center gap-2">
                <Mail className="w-3 h-3" />
                Email
              </label>
              <Input
                type="email"
                placeholder="contact@yourpage.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-2">
                  <Phone className="w-3 h-3" />
                  Phone
                </label>
                <Input
                  placeholder="+91..."
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  Website
                </label>
                <Input
                  placeholder="www.yourpage.com"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                Location
              </label>
              <Input
                placeholder="e.g., Delhi, India"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>
          </div>

          {/* Social Links Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <LinkIcon className="w-4 h-4 text-primary" />
              Social Links
            </h3>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-2">
                  <Facebook className="w-3 h-3" />
                  Facebook
                </label>
                <Input
                  placeholder="facebook.com/yourpage"
                  value={formData.facebook}
                  onChange={(e) => setFormData(prev => ({ ...prev, facebook: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-2">
                  <Instagram className="w-3 h-3" />
                  Instagram
                </label>
                <Input
                  placeholder="instagram.com/yourpage"
                  value={formData.instagram}
                  onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground flex items-center gap-2">
                  <Twitter className="w-3 h-3" />
                  Twitter / X
                </label>
                <Input
                  placeholder="twitter.com/yourpage"
                  value={formData.twitter}
                  onChange={(e) => setFormData(prev => ({ ...prev, twitter: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            onClick={handleSubmit}
            disabled={createPageMutation.isPending}
            className="w-full h-12 bg-gradient-to-r from-primary to-red-500"
          >
            {createPageMutation.isPending ? "Creating..." : "Create Page"}
          </Button>
        </div>
      </div>
    </div>
  );
}
