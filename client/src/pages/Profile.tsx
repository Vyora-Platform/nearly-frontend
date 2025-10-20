import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Settings, MessageCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const mockPosts = [
  {
    id: "1",
    imageUrl: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400",
    type: "image",
  },
  {
    id: "2",
    imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",
    type: "image",
  },
  {
    id: "3",
    imageUrl: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400",
    type: "activity",
    title: "Morning Yoga",
    subtitle: "Lodhi Garden, 7 AM",
  },
  {
    id: "4",
    imageUrl: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400",
    type: "poll",
    title: "Best Biryani in CP?",
    subtitle: "Vote for your favorite!",
    options: ["A. Paradise", "B. Bikkgane"],
  },
  {
    id: "5",
    imageUrl: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400",
    type: "image",
  },
  {
    id: "6",
    imageUrl: "https://images.unsplash.com/photo-1564769662461-755f2039c3ba?w=400",
    type: "image",
  },
];

export default function Profile() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/users/username", "rahul_kanpur"],
    queryFn: () => api.getUserByUsername("rahul_kanpur"),
  });

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button data-testid="button-back">
            <span className="text-2xl">←</span>
          </button>
          <h2 className="text-lg font-semibold">@{user.username}</h2>
          <button data-testid="button-settings">
            <Settings className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-start gap-4 mb-4">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl">{user.name[0]}</AvatarFallback>
              </Avatar>
              <button
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-gradient-primary text-white flex items-center justify-center text-lg"
                data-testid="button-edit-avatar"
              >
                +
              </button>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground mb-1">
                {user.name}
              </h1>
              <p className="text-sm text-muted-foreground whitespace-pre-line mb-3">
                {user.bio}
              </p>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <Button
              variant="secondary"
              className="flex-1 h-10"
              data-testid="button-edit-profile"
            >
              Edit Profile
            </Button>
            <Button
              variant="secondary"
              className="flex-1 h-10"
              data-testid="button-share-profile"
            >
              Share Profile
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10"
              data-testid="button-message"
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-card rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{user.postsCount || 0}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div className="bg-card rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {(user.followersCount || 0) >= 1000
                  ? `${((user.followersCount || 0) / 1000).toFixed(1)}k`
                  : user.followersCount || 0}
              </p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="bg-card rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{user.followingCount || 0}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
          </div>

          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-muted h-10">
              <TabsTrigger value="posts" data-testid="tab-posts">
                Posts
              </TabsTrigger>
              <TabsTrigger value="events" data-testid="tab-events">
                Events
              </TabsTrigger>
              <TabsTrigger value="saved" data-testid="tab-saved">
                Saved
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-4">
              <div className="grid grid-cols-3 gap-1">
                {mockPosts.map((post) => (
                  <div
                    key={post.id}
                    className="aspect-square relative rounded-sm overflow-hidden bg-muted"
                  >
                    <img
                      src={post.imageUrl}
                      alt="Post"
                      className="w-full h-full object-cover"
                    />
                    {post.type === "activity" && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2">
                        <p className="text-white text-xs font-semibold">{post.title}</p>
                        <p className="text-white/80 text-[10px]">{post.subtitle}</p>
                      </div>
                    )}
                    {post.type === "poll" && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2">
                        <p className="text-white text-xs font-semibold">{post.title}</p>
                        <p className="text-white/80 text-[10px]">{post.subtitle}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="events" className="mt-4">
              <div className="text-center py-12">
                <p className="text-muted-foreground">No events yet</p>
              </div>
            </TabsContent>

            <TabsContent value="saved" className="mt-4">
              <div className="text-center py-12">
                <p className="text-muted-foreground">No saved posts</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
