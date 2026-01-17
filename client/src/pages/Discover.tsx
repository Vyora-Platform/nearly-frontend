import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Users,
  Store,
  MapPin,
  Sparkles,
  UserPlus,
  Tag,
  Percent,
  Clock,
  Star,
  ChevronRight,
  Filter,
  Zap,
  Heart,
  Camera,
  Music,
  Utensils,
  Dumbbell,
  Palette,
  Code,
  GraduationCap,
  Plane,
  Car,
  Home,
  Smartphone,
  Shirt,
  Sofa,
  Wrench,
  Baby,
  Bike,
  BookOpen,
  Briefcase,
  Gamepad2,
  Watch,
  Gem,
  Dog,
  Leaf,
  ShoppingBag,
  Package,
  Hammer,
  Scissors,
  Stethoscope,
  Scale,
  Laptop,
  Tv,
  Headphones,
  Bell,
  Gift,
  Coffee,
  Pizza,
  Share2,
  Mail,
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Category filters for people section
const peopleCategories = [
  { id: "all", label: "All", icon: Users },
  { id: "creators", label: "Creators", icon: Camera },
  { id: "artists", label: "Artists", icon: Palette },
  { id: "musicians", label: "Musicians", icon: Music },
  { id: "fitness", label: "Fitness", icon: Dumbbell },
  { id: "tech", label: "Tech", icon: Code },
  { id: "food", label: "Foodies", icon: Utensils },
  { id: "travel", label: "Travelers", icon: Plane },
];

// Marketplace categories - OLX style hyperlocal categories
const marketplaceCategories = [
  // Electronics
  { id: "mobiles", label: "Mobile Phones", icon: Smartphone, color: "bg-blue-500" },
  { id: "laptops", label: "Laptops & Computers", icon: Laptop, color: "bg-indigo-500" },
  { id: "tablets", label: "Tablets", icon: Tv, color: "bg-purple-500" },
  { id: "electronics", label: "Electronics & Appliances", icon: Tv, color: "bg-cyan-500" },
  { id: "cameras", label: "Cameras & Lenses", icon: Camera, color: "bg-pink-500" },
  { id: "audio", label: "Audio & Headphones", icon: Headphones, color: "bg-rose-500" },
  { id: "gaming", label: "Gaming", icon: Gamepad2, color: "bg-red-500" },
  
  // Vehicles
  { id: "cars", label: "Cars", icon: Car, color: "bg-orange-500" },
  { id: "bikes", label: "Bikes & Scooters", icon: Bike, color: "bg-amber-500" },
  { id: "bicycles", label: "Bicycles", icon: Bike, color: "bg-lime-500" },
  
  // Property
  { id: "houses", label: "Houses & Apartments", icon: Home, color: "bg-green-500" },
  { id: "pg-rooms", label: "PG & Rooms", icon: Home, color: "bg-emerald-500" },
  
  // Fashion
  { id: "clothing", label: "Clothing", icon: Shirt, color: "bg-teal-500" },
  { id: "shoes", label: "Footwear", icon: ShoppingBag, color: "bg-sky-500" },
  { id: "watches", label: "Watches", icon: Watch, color: "bg-yellow-500" },
  { id: "jewelry", label: "Jewelry & Accessories", icon: Gem, color: "bg-fuchsia-500" },
  
  // Home & Living
  { id: "furniture", label: "Furniture", icon: Sofa, color: "bg-violet-500" },
  { id: "home-decor", label: "Home Decor", icon: Gift, color: "bg-slate-500" },
  { id: "kitchen", label: "Kitchen & Dining", icon: Coffee, color: "bg-zinc-500" },
  { id: "garden", label: "Garden & Outdoor", icon: Leaf, color: "bg-green-600" },
  
  // Kids & Baby
  { id: "baby-products", label: "Baby Products", icon: Baby, color: "bg-pink-400" },
  { id: "kids-toys", label: "Kids Toys", icon: Gift, color: "bg-orange-400" },
  
  // Books & Hobbies
  { id: "books", label: "Books & Magazines", icon: BookOpen, color: "bg-amber-600" },
  { id: "sports", label: "Sports Equipment", icon: Dumbbell, color: "bg-red-600" },
  { id: "musical", label: "Musical Instruments", icon: Music, color: "bg-purple-600" },
  
  // Pets
  { id: "pets", label: "Pets & Pet Supplies", icon: Dog, color: "bg-brown-500" },
  
  // Services
  { id: "repair", label: "Repair & Services", icon: Wrench, color: "bg-gray-500" },
  { id: "beauty", label: "Beauty & Salon", icon: Scissors, color: "bg-pink-600" },
  { id: "health", label: "Health & Wellness", icon: Stethoscope, color: "bg-blue-600" },
  { id: "education", label: "Tutors & Classes", icon: GraduationCap, color: "bg-indigo-600" },
  { id: "legal", label: "Legal Services", icon: Scale, color: "bg-slate-600" },
  { id: "home-services", label: "Home Services", icon: Hammer, color: "bg-orange-600" },
  
  // Food
  { id: "food-delivery", label: "Food & Catering", icon: Pizza, color: "bg-red-400" },
  { id: "groceries", label: "Groceries", icon: ShoppingBag, color: "bg-green-400" },
  
  // Other
  { id: "office", label: "Office Supplies", icon: Briefcase, color: "bg-gray-600" },
  { id: "other", label: "Other Items", icon: Package, color: "bg-neutral-500" },
];

// Deals categories for coming soon message
const dealCategories = [
  { id: "all", label: "All Deals", icon: Tag },
  { id: "food", label: "Food & Dining", icon: Utensils },
  { id: "fitness", label: "Fitness", icon: Dumbbell },
  { id: "fashion", label: "Fashion", icon: Shirt },
  { id: "electronics", label: "Electronics", icon: Gamepad2 },
  { id: "beauty", label: "Beauty", icon: Heart },
  { id: "services", label: "Services", icon: Wrench },
  { id: "entertainment", label: "Entertainment", icon: Music },
];

// Helper function to enrich data with default values
const enrichUserData = (user: any) => ({
  ...user,
  avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
  bio: user.bio || '',
  mutualFriends: 0,
  isVerified: user.isVerified || false,
  category: 'all',
});

// Category Pills Component
function CategoryPills({ 
  categories, 
  selected, 
  onSelect 
}: { 
  categories: { id: string; label: string; icon: any }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isActive = selected === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';

  // Category filter states
  const [peopleFilter, setPeopleFilter] = useState("all");
  const [dealFilter, setDealFilter] = useState("all");

  // Follow state - Initialize from localStorage
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(() => {
    const followed = JSON.parse(localStorage.getItem('nearly_following') || '[]');
    return new Set(followed);
  });

  // Coming soon dialogs
  const [showMarketplaceDialog, setShowMarketplaceDialog] = useState(false);
  const [selectedMarketplaceCategory, setSelectedMarketplaceCategory] = useState<typeof marketplaceCategories[0] | null>(null);
  const [showDealsComingSoon, setShowDealsComingSoon] = useState(false);

  // Follow user mutation - with localStorage persistence
  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Prevent multiple follows
      if (followedUsers.has(userId)) {
        throw new Error('Already following');
      }
      return api.followUser(currentUserId, userId);
    },
    onMutate: (userId) => {
      if (followedUsers.has(userId)) return;
      
      // Optimistically update
      setFollowedUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(userId);
        // Persist to localStorage
        localStorage.setItem('nearly_following', JSON.stringify([...newSet]));
        return newSet;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following', currentUserId] });
      toast({
        title: "Following!",
        description: "You are now following this user.",
      });
    },
    onError: (_, userId) => {
      // Revert on error
      setFollowedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        localStorage.setItem('nearly_following', JSON.stringify([...newSet]));
        return newSet;
      });
      toast({
        title: "Error",
        description: "Failed to follow user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFollowUser = (userId: string) => {
    if (followedUsers.has(userId)) return;
    followMutation.mutate(userId);
  };

  // API Queries
  const { data: peopleData = [], isLoading: loadingPeople } = useQuery({
    queryKey: ['discover-people'],
    queryFn: async () => {
      try {
        const users = await api.getUsers();
        return users.map(enrichUserData);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        return [];
      }
    },
  });

  const formatFollowers = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  // Filter functions using API data
  const filteredPeople = peopleFilter === "all"
    ? peopleData
    : peopleData.filter((p: any) => p.category === peopleFilter);

  // Handle marketplace category click
  const handleMarketplaceCategoryClick = (category: typeof marketplaceCategories[0]) => {
    setSelectedMarketplaceCategory(category);
    setShowMarketplaceDialog(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar title="Discover" />

      <div className="max-w-md mx-auto">
        {/* Search Bar */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search people, marketplace, deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-11 rounded-full bg-muted border-0"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-background/50 rounded-full transition-colors">
              <Filter className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border overflow-x-auto scrollbar-hide">
            <TabsList className="w-max min-w-full flex bg-transparent h-12 p-0 gap-0">
              <TabsTrigger
                value="all"
                className="flex-1 min-w-[70px] px-4 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                All
              </TabsTrigger>
              <TabsTrigger
                value="people"
                className="flex-1 min-w-[70px] px-4 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Users className="w-4 h-4 mr-1.5" />
                People
              </TabsTrigger>
              <TabsTrigger
                value="marketplace"
                className="flex-1 min-w-[85px] px-4 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Store className="w-4 h-4 mr-1.5" />
                Marketplace
              </TabsTrigger>
              <TabsTrigger
                value="deals"
                className="flex-1 min-w-[70px] px-4 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Tag className="w-4 h-4 mr-1.5" />
                Deals
              </TabsTrigger>
            </TabsList>
          </div>

          {/* All Tab - Overview */}
          <TabsContent value="all" className="mt-0">
            {/* People Section */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  People You May Know
                </h3>
                <button 
                  onClick={() => setActiveTab("people")}
                  className="text-sm text-primary font-medium flex items-center"
                >
                  See All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {loadingPeople ? (
                  <div className="flex items-center justify-center w-full py-4">
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                ) : peopleData.slice(0, 4).map((person: any) => {
                  const isFollowing = followedUsers.has(person.id);
                  return (
                    <div
                      key={person.id}
                      className="flex-shrink-0 w-28 bg-card rounded-xl p-3 text-center border border-border"
                    >
                      <button
                        onClick={() => setLocation(`/profile/${person.username || person.id}`)}
                        className="w-full"
                      >
                        <Avatar className="w-14 h-14 mx-auto mb-2 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                          <AvatarImage src={person.avatarUrl} />
                          <AvatarFallback>{person.name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <p className="text-sm font-medium truncate hover:text-primary transition-colors">{person.name?.split(" ")[0] || 'User'}</p>
                      </button>
                      <p className="text-xs text-muted-foreground truncate">{person.mutualFriends} mutual</p>
                      <Button 
                        size="sm" 
                        className={`w-full mt-2 h-7 text-xs ${isFollowing ? 'bg-muted text-foreground hover:bg-muted/80' : ''}`}
                        onClick={() => handleFollowUser(person.id)}
                        disabled={followMutation.isPending}
                      >
                        {isFollowing ? (
                          <>Following</>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3 mr-1" />
                            Follow
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Invite Friends Section */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Invite Friends
                </h3>
              </div>
              <button
                onClick={async () => {
                  const inviteText = `Join me on Nearly - the hyperlocal community app! Connect with people, discover events, and explore your neighborhood. Download now: ${window.location.origin}`;
                  try {
                    if (navigator.share) {
                      await navigator.share({
                        title: 'Join me on Nearly!',
                        text: inviteText,
                        url: window.location.origin,
                      });
                    } else {
                      await navigator.clipboard.writeText(inviteText);
                      toast({
                        title: "Invite link copied!",
                        description: "Share this link with your friends.",
                      });
                    }
                  } catch (e) {
                    // User cancelled or error - copy to clipboard
                    await navigator.clipboard.writeText(inviteText);
                    toast({
                      title: "Invite link copied!",
                      description: "Share this link with your friends.",
                    });
                  }
                }}
                className="w-full bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-xl p-4 border border-primary/20 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <h4 className="font-semibold text-foreground">Invite your friends</h4>
                    <p className="text-sm text-muted-foreground">Share Nearly with friends and grow your network</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </button>
            </div>

            {/* Marketplace Preview */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary" />
                  Marketplace
                </h3>
                <button 
                  onClick={() => setActiveTab("marketplace")}
                  className="text-sm text-primary font-medium flex items-center"
                >
                  See All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {marketplaceCategories.slice(0, 8).map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleMarketplaceCategoryClick(category)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full ${category.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs text-center font-medium line-clamp-1">
                        {category.label.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Deals Coming Soon */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Best Deals
                </h3>
                <button 
                  onClick={() => setActiveTab("deals")}
                  className="text-sm text-primary font-medium flex items-center"
                >
                  See All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setShowDealsComingSoon(true)}
                className="w-full bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-xl p-6 border border-red-500/20 hover:border-red-500/40 transition-colors"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-4">
                    <Tag className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-semibold text-lg mb-1">Deals Coming Soon!</h4>
                  <p className="text-sm text-muted-foreground">
                    Amazing deals from your favorite local brands
                  </p>
                </div>
              </button>
            </div>
          </TabsContent>

          {/* People Tab */}
          <TabsContent value="people" className="mt-0">
            <div className="p-4 border-b border-border">
              <CategoryPills 
                categories={peopleCategories} 
                selected={peopleFilter} 
                onSelect={setPeopleFilter} 
              />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Suggested For You</h3>
                <Badge variant="secondary">{filteredPeople.length} people</Badge>
              </div>
              <div className="space-y-4">
                {filteredPeople.map((person: any) => {
                  const isFollowing = followedUsers.has(person.id);
                  return (
                    <div
                      key={person.id}
                      className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border"
                    >
                      <button
                        onClick={() => setLocation(`/profile/${person.username || person.id}`)}
                        className="flex-shrink-0"
                      >
                        <Avatar className="w-14 h-14 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                          <AvatarImage src={person.avatarUrl} />
                          <AvatarFallback>{person.name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                      </button>
                      <button
                        onClick={() => setLocation(`/profile/${person.username || person.id}`)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center gap-1">
                          <h4 className="font-medium truncate hover:text-primary transition-colors">{person.name}</h4>
                          {person.isVerified && (
                            <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <span className="text-[8px] text-white">✓</span>
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">@{person.username}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{person.mutualFriends} mutual friends</p>
                      </button>
                      <Button 
                        size="sm" 
                        className={`shrink-0 ${isFollowing ? 'bg-muted text-foreground hover:bg-muted/80' : ''}`}
                        onClick={() => handleFollowUser(person.id)}
                        disabled={followMutation.isPending}
                      >
                        {isFollowing ? (
                          <>Following</>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-1" />
                            Follow
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
                {filteredPeople.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No people found in this category</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Marketplace Tab - OLX style categories */}
          <TabsContent value="marketplace" className="mt-0">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Browse Categories</h3>
                <Badge variant="secondary">{marketplaceCategories.length} categories</Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {marketplaceCategories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleMarketplaceCategoryClick(category)}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 hover:border-primary/30 transition-all"
                    >
                      <div className={`w-12 h-12 rounded-full ${category.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs text-center font-medium line-clamp-2 leading-tight">
                        {category.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Deals Tab - Coming Soon */}
          <TabsContent value="deals" className="mt-0">
            <div className="p-4 border-b border-border">
              <CategoryPills 
                categories={dealCategories} 
                selected={dealFilter} 
                onSelect={(id) => {
                  setDealFilter(id);
                  setShowDealsComingSoon(true);
                }} 
              />
            </div>
            <div className="p-4">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-6 animate-pulse">
                  <Tag className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Coming Soon!</h2>
                <p className="text-muted-foreground mb-4 max-w-xs">
                  Discover the best deals from your favorite local brands.
                  Exclusive discounts, coupons, and offers coming your way!
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                    🏪 Local Stores
                  </Badge>
                  <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                    🍔 Restaurants
                  </Badge>
                  <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                    💈 Services
                  </Badge>
                  <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                    🛍️ Shopping
                  </Badge>
                </div>
                <Button
                  onClick={() => {
                    toast({
                      title: "You're on the list! 🎉",
                      description: "We'll notify you when deals go live in your area.",
                    });
                  }}
                  className="bg-gradient-to-r from-red-500 to-red-600 text-white"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Notify Me When Live
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Marketplace Coming Soon Dialog */}
      <Dialog open={showMarketplaceDialog} onOpenChange={setShowMarketplaceDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Coming Soon!</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center text-center py-6">
            {selectedMarketplaceCategory && (
              <>
                <div className={`w-20 h-20 rounded-full ${selectedMarketplaceCategory.color} flex items-center justify-center mb-4`}>
                  {(() => {
                    const Icon = selectedMarketplaceCategory.icon;
                    return <Icon className="w-10 h-10 text-white" />;
                  })()}
                </div>
                <h3 className="text-xl font-semibold mb-2">{selectedMarketplaceCategory.label}</h3>
              </>
            )}
            <p className="text-muted-foreground mb-6">
              The marketplace for this category is coming soon! 
              Buy, sell, and discover items from your local community.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowMarketplaceDialog(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowMarketplaceDialog(false);
                  toast({
                    title: "You're on the list! 🎉",
                    description: `We'll notify you when ${selectedMarketplaceCategory?.label} listings go live.`,
                  });
                }}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white"
              >
                <Bell className="w-4 h-4 mr-2" />
                Notify Me
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deals Coming Soon Dialog */}
      <Dialog open={showDealsComingSoon} onOpenChange={setShowDealsComingSoon}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Deals Coming Soon!</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-4">
              <Percent className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Amazing Deals Await!</h3>
            <p className="text-muted-foreground mb-6">
              Get exclusive discounts and offers from your favorite local brands. 
              Restaurants, shops, services, and more!
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDealsComingSoon(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowDealsComingSoon(false);
                  toast({
                    title: "You're on the list! 🎉",
                    description: "We'll notify you when deals go live in your area.",
                  });
                }}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white"
              >
                <Bell className="w-4 h-4 mr-2" />
                Notify Me
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
