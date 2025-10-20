import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import ActivityCard from "@/components/ActivityCard";
import CategoryPills from "@/components/CategoryPills";
import { Plus, Image as ImageIcon, Video, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useState } from "react";

// TODO: remove mock data
const mockActivities = [
  {
    id: "1",
    author: {
      name: "Rahul Kanpur",
      username: "@rahul_kanpur",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul",
    },
    title: "Going to watch Jawan at PVR Mall",
    description: "Excited to announce a movie meetup for the new Shah Rukh Khan movie, 'Jawan'! Let's catch the first day first show together. It's going to be an amazing experience watching it with fellow fans. Anyone who's a fan of SRK is welcome to join!",
    imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",
    location: "PVR Mall, Kanpur, Uttar Pradesh",
    startDate: "Tomorrow, 7:00 PM - 10:00 PM",
    cost: "Paid Entry",
    category: "Movies",
    likesCount: 23,
    commentsCount: 5,
    participantsCount: 6,
    maxParticipants: 10,
    timeAgo: "2h ago",
  },
  {
    id: "2",
    author: {
      name: "Priya Sharma",
      username: "@priya_sharma",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
    },
    title: "Cricket match at IIT Kanpur ground tomorrow!",
    description: "Need players 🏏",
    location: "IIT Kanpur",
    startDate: "Tomorrow, 4:00 PM",
    cost: "Free",
    category: "Sports",
    likesCount: 15,
    commentsCount: 8,
    participantsCount: 12,
    maxParticipants: 22,
    timeAgo: "5h ago",
  },
  {
    id: "3",
    author: {
      name: "Amit Singh",
      username: "@amit_singh",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit",
    },
    title: "Looking for a study partner in Kakadeo for UPSC prep. Serious aspirants only!",
    location: "Kakadeo",
    startDate: "12 attendees (1 spot left)",
    cost: "Sponsored",
    likesCount: 42,
    commentsCount: 11,
    participantsCount: 12,
    maxParticipants: 13,
    timeAgo: "1d ago",
  },
];

export default function Home() {
  const [postText, setPostText] = useState("");

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />

      <div className="max-w-md mx-auto">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-10 h-10">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser" />
              <AvatarFallback>You</AvatarFallback>
            </Avatar>
            <Input
              placeholder="What are you up to?"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              className="flex-1 bg-muted border-0"
              data-testid="input-post"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <button
                className="text-muted-foreground hover-elevate active-elevate-2"
                data-testid="button-add-image"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                className="text-muted-foreground hover-elevate active-elevate-2"
                data-testid="button-add-video"
              >
                <Video className="w-5 h-5" />
              </button>
              <button
                className="text-muted-foreground hover-elevate active-elevate-2"
                data-testid="button-add-location"
              >
                <MapPin className="w-5 h-5" />
              </button>
            </div>
            <button
              className="text-primary font-semibold text-sm"
              data-testid="button-post"
            >
              Post
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-border">
          <CategoryPills
            categories={["All", "Movies", "Sports", "Food"]}
          />
        </div>

        <div>
          {mockActivities.map((activity) => (
            <ActivityCard key={activity.id} {...activity} />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
