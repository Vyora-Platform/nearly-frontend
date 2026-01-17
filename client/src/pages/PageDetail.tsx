import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Share2,
  MoreHorizontal,
  Bell,
  BellOff,
  MapPin,
  Globe,
  Mail,
  Phone,
  Calendar,
  Users,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Image as ImageIcon,
  Info,
  Star
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";


export default function PageDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/page/:id");
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");

  const pageId = params?.id || "1";

  const { data: apiPage, isLoading, error } = useQuery({
    queryKey: ['page', pageId],
    queryFn: () => api.getPage(pageId),
  });

  // Enrich API data with defaults
  const page = apiPage ? {
    ...apiPage,
    category: apiPage.category || 'Page',
    avatarUrl: apiPage.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${apiPage.id}`,
    coverUrl: apiPage.coverUrl || 'https://images.unsplash.com/photo-1560472355-536de3962603?w=1200',
    isVerified: apiPage.isVerified || false,
    followers: apiPage.followersCount || 0,
    likes: apiPage.likesCount || 0,
    description: apiPage.description || '',
    about: apiPage.about || apiPage.description || '',
    location: apiPage.location || '',
    website: apiPage.website || '',
    email: apiPage.email || '',
    phone: apiPage.phone || '',
    createdAt: apiPage.createdAt || new Date().toISOString(),
    posts: apiPage.posts || [],
    photos: apiPage.photos || [],
    events: apiPage.events || [],
    reviews: apiPage.reviews || [],
    recentActivity: apiPage.recentActivity || [],
  } : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading page details...</p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Page not found</p>
          <Button onClick={() => setLocation("/discover")}>Back to Discover</Button>
        </div>
      </div>
    );
  }

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    toast({
      title: isFollowing ? "Unfollowed" : "Following!",
      description: isFollowing ? `You unfollowed ${page.name}` : `You are now following ${page.name}`,
    });
  };

  const handleNotifications = () => {
    setHasNotifications(!hasNotifications);
    toast({
      title: hasNotifications ? "Notifications off" : "Notifications on",
      description: hasNotifications ? "You won't receive notifications from this page" : "You'll be notified about new posts",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: page.name,
        text: `Check out ${page.name} on Nearly`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      try {
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied!",
          description: "Page link copied to clipboard.",
        });
      } catch {
        toast({
          title: "Share this page",
          description: window.location.href,
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-md mx-auto flex items-center justify-between h-14 px-4">
          <button 
            onClick={() => setLocation("/discover")}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Page</h1>
          <button className="p-2 hover:bg-muted rounded-full transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto">
        {/* Cover Image */}
        <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5">
          <img 
            src={page.coverUrl} 
            alt={page.name} 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Profile Section */}
        <div className="relative px-4 pb-4 border-b border-border">
          {/* Avatar */}
          <div className="absolute -top-12 left-4">
            <Avatar className="w-24 h-24 border-4 border-background">
              <AvatarImage src={page.avatarUrl} />
              <AvatarFallback className="text-2xl">{page.name[0]}</AvatarFallback>
            </Avatar>
          </div>

          {/* Action Buttons - Top Right */}
          <div className="flex justify-end gap-2 pt-2">
            <button 
              onClick={handleShare}
              className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
            {isFollowing && (
              <button 
                onClick={handleNotifications}
                className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors"
              >
                {hasNotifications ? (
                  <Bell className="w-5 h-5 text-primary" />
                ) : (
                  <BellOff className="w-5 h-5" />
                )}
              </button>
            )}
          </div>

          {/* Page Info */}
          <div className="mt-6">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{page.name}</h1>
              {page.isVerified && (
                <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[10px] text-white">✓</span>
                </span>
              )}
            </div>
            <p className="text-muted-foreground">@{page.username}</p>
            <Badge variant="secondary" className="mt-2">{page.category}</Badge>
            <p className="text-sm mt-2">{page.description}</p>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <p className="font-bold">{formatCount(page.followers)}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <p className="font-bold">{formatCount(page.following)}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
            <div className="text-center">
              <p className="font-bold">{formatCount(page.postsCount)}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            <Button 
              onClick={handleFollow}
              variant={isFollowing ? "outline" : "default"}
              className={`flex-1 ${!isFollowing ? "bg-gradient-to-r from-primary to-red-500" : ""}`}
            >
              {isFollowing ? "Following" : "Follow"}
            </Button>
            <Button variant="secondary" className="flex-1">
              <Send className="w-4 h-4 mr-2" />
              Message
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-transparent h-12 border-b border-border rounded-none">
            <TabsTrigger 
              value="posts"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <ImageIcon className="w-5 h-5" />
            </TabsTrigger>
            <TabsTrigger 
              value="about"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Info className="w-5 h-5" />
            </TabsTrigger>
            <TabsTrigger 
              value="reviews"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Star className="w-5 h-5" />
            </TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="mt-0">
            <div className="grid grid-cols-3 gap-0.5">
              {page.posts.map((post: any) => (
                <button 
                  key={post.id}
                  className="aspect-square relative group overflow-hidden"
                >
                  <img 
                    src={post.image} 
                    alt="Post" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <span className="text-white text-sm flex items-center">
                      <Heart className="w-4 h-4 mr-1 fill-white" />
                      {formatCount(post.likes)}
                    </span>
                    <span className="text-white text-sm flex items-center">
                      <MessageCircle className="w-4 h-4 mr-1" />
                      {formatCount(post.comments)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="mt-0">
            <div className="p-4 space-y-6">
              {/* About Text */}
              <div>
                <h3 className="font-semibold mb-2">About</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {page.about}
                </p>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="font-semibold mb-3">Contact & Info</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    <span>{page.location}</span>
                  </div>
                  {page.website && (
                    <a href={`https://${page.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-primary">
                      <Globe className="w-5 h-5" />
                      <span>{page.website}</span>
                    </a>
                  )}
                  {page.email && (
                    <a href={`mailto:${page.email}`} className="flex items-center gap-3 text-sm text-primary">
                      <Mail className="w-5 h-5" />
                      <span>{page.email}</span>
                    </a>
                  )}
                  {page.phone && (
                    <a href={`tel:${page.phone}`} className="flex items-center gap-3 text-sm text-primary">
                      <Phone className="w-5 h-5" />
                      <span>{page.phone}</span>
                    </a>
                  )}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Calendar className="w-5 h-5" />
                    <span>Page created {page.createdAt}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="font-semibold mb-3">Recent Activity</h3>
                <div className="space-y-3">
                  {page.recentActivity.map((activity: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                      <div>
                        <p>{activity.text}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="mt-0">
            <div className="p-4">
              <div className="text-center py-12">
                <Star className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No reviews yet</p>
                <Button variant="outline" className="mt-4">
                  Be the first to review
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

