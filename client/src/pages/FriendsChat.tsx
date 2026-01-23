import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Search, Mail, Check, X, MessageCircle, Clock, UserX, MessageSquare, Sparkles, ChevronRight
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { messagingApi } from "@/lib/gateway-api";
import { authFetch } from "@/lib/queryClient";

interface Friend {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface MessageRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar?: string;
  message?: string;
  createdAt: string;
  status: "pending" | "accepted" | "declined";
}

export default function FriendsChat() {
  const [activeSection, setActiveSection] = useState<"chats" | "requests">("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';
  const currentUserName = localStorage.getItem('nearly_user_name') || 'User';

  // Fetch current user for real data
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser", currentUserId],
    queryFn: () => api.getUser(currentUserId),
    enabled: !!currentUserId,
  });

  // Fetch following users (friends)
  const { data: following = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["following", currentUserId],
    queryFn: () => api.getFollowing(currentUserId),
  });

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", currentUserId],
    queryFn: async () => {
      try {
        return await messagingApi.getConversations(currentUserId);
      } catch {
        return [];
      }
    },
  });

  // Fetch message requests (Instagram-style)
  const { data: messageRequests = [] } = useQuery({
    queryKey: ["messageRequests", currentUserId],
    queryFn: async () => {
      try {
        const res = await authFetch(`/api/messages/requests/${currentUserId}`);
        if (!res.ok) return [];
        return res.json();
      } catch {
        return [];
      }
    },
  });

  // Transform following to friends
  const friends: Friend[] = following.map((user: any) => {
    const conversation = conversations.find((c: any) =>
      c.participantIds && c.participantIds.includes(user.id) && !c.groupId
    );
    return {
      id: user.id,
      username: user.username || `user_${user.id}`,
      name: user.name || "Unknown",
      avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
      isOnline: false,
      lastMessage: conversation?.lastMessage || "",
      lastMessageTime: conversation?.lastMessageTime,
      unreadCount: conversation?.unreadCount || 0,
    };
  });

  // Transform message requests
  const pendingMessageRequests: MessageRequest[] = messageRequests
    .filter((r: any) => r.status === "pending")
    .map((r: any) => ({
      id: r.id,
      senderId: r.senderId || r.sender?.id || "",
      senderName: r.sender?.name || "Unknown",
      senderUsername: r.sender?.username || "user",
      senderAvatar: r.sender?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.senderId}`,
      message: r.content || r.message,
      createdAt: r.createdAt,
      status: "pending" as const,
    }));

  const [localRequests, setLocalRequests] = useState<Map<string, "accepted" | "declined">>(new Map());

  const filteredFriends = friends.filter(
    (friend) =>
      friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (time?: string) => {
    if (!time) return "";
    const date = new Date(time);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const mins = Math.floor(diffInMs / (1000 * 60));
      return mins === 0 ? "now" : `${mins}m`;
    }
    if (diffInHours < 24) return format(date, "h:mm a");
    if (diffInHours < 48) return "Yesterday";
    return format(date, "MMM d");
  };

  // Accept message request
  const acceptMessageMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await authFetch(`/api/messages/requests/${requestId}/accept`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messageRequests", currentUserId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", currentUserId] });
    },
  });

  // Decline message request
  const declineMessageMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await authFetch(`/api/messages/requests/${requestId}/decline`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messageRequests", currentUserId] });
    },
  });

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptMessageMutation.mutateAsync(requestId);
      setLocalRequests(prev => new Map(prev).set(requestId, "accepted"));
    } catch (error) {
      console.error("Failed to accept message request:", error);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await declineMessageMutation.mutateAsync(requestId);
      setLocalRequests(prev => new Map(prev).set(requestId, "declined"));
    } catch (error) {
      console.error("Failed to decline message request:", error);
    }
  };

  const filteredMessageRequests = pendingMessageRequests.filter((r) => !localRequests.has(r.id));

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Native Search Bar */}
      <div className="px-4 py-3 sticky top-0 bg-background/95 backdrop-blur-lg z-10">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-muted/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 border-0 transition-all duration-200"
          />
        </div>
      </div>

      {/* Native Segment Control */}
      <div className="px-4 pb-3">
        <div className="relative bg-muted/50 p-1 rounded-xl flex">
          {/* Active indicator */}
          <div
            className={`absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] bg-gradient-primary rounded-lg transition-all duration-300 ease-out shadow-sm ${activeSection === "requests" ? "left-[calc(50%+2px)]" : "left-1"
              }`}
          />
          <button
            onClick={() => setActiveSection("chats")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 z-10 ${activeSection === "chats"
                ? "text-white"
                : "text-muted-foreground"
              }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Messages</span>
          </button>
          <button
            onClick={() => setActiveSection("requests")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 relative z-10 ${activeSection === "requests"
                ? "text-white"
                : "text-muted-foreground"
              }`}
          >
            <Mail className="w-4 h-4" />
            <span>Requests</span>
            {filteredMessageRequests.length > 0 && (
              <span className={`absolute -top-1 right-6 min-w-5 h-5 text-xs rounded-full flex items-center justify-center font-bold px-1.5 ${activeSection === "requests"
                  ? "bg-white text-primary"
                  : "bg-primary text-white"
                }`}>
                {filteredMessageRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {activeSection === "chats" ? (
        <div className="flex-1">
          {/* Section Header */}
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                Friends
              </h2>
              <span className="text-sm text-muted-foreground">({friends.length})</span>
            </div>
            {friends.length > 0 && (
              <button
                onClick={() => setLocation("/discover")}
                className="flex items-center gap-1 text-xs font-medium text-primary"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Find friends
              </button>
            )}
          </div>

          {/* Messages List */}
          <div>
            {filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageSquare className="w-9 h-9 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Start a conversation</h3>
                <p className="text-muted-foreground text-sm text-center max-w-[260px]">
                  {searchQuery ? "No results found for your search" : "Connect with friends to start messaging"}
                </p>
                <Button
                  onClick={() => setLocation("/discover")}
                  className="mt-5 bg-gradient-primary text-white rounded-xl px-6 py-5 font-semibold"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Discover people
                </Button>
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <Link
                  key={friend.id}
                  href={`/chat/${friend.username}`}
                  className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors border-b border-border/30"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={friend.avatarUrl} className="object-cover" />
                      <AvatarFallback className="bg-gradient-primary text-white font-semibold text-lg">
                        {friend.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {friend.isOnline && (
                      <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-[15px] font-semibold truncate ${friend.unreadCount ? "text-foreground" : "text-foreground/90"
                        }`}>
                        {friend.name}
                      </p>
                      <span className={`text-xs flex-shrink-0 ml-3 ${friend.unreadCount ? "text-primary font-medium" : "text-muted-foreground"
                        }`}>
                        {formatTime(friend.lastMessageTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate pr-3 ${friend.unreadCount
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                        }`}>
                        {friend.lastMessage ? friend.lastMessage : (
                          <span className="text-primary/70 italic font-normal">Tap to start chatting</span>
                        )}
                      </p>
                      {friend.unreadCount && friend.unreadCount > 0 ? (
                        <span className="flex-shrink-0 min-w-5 h-5 bg-gradient-primary text-white text-xs rounded-full flex items-center justify-center font-bold px-1.5">
                          {friend.unreadCount > 99 ? "99+" : friend.unreadCount}
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="px-4 pb-6 space-y-3">
          {/* Section Header */}
          <div className="flex items-center gap-2 pt-1">
            <h2 className="text-base font-bold text-foreground">
              Requests
            </h2>
            <span className="text-sm text-muted-foreground">({filteredMessageRequests.length})</span>
          </div>

          {/* Info Banner */}
          <div className="rounded-xl border border-border bg-card p-3.5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <UserX className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Message Requests</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Messages from people you don't follow. They won't know you've seen their request until you accept.
              </p>
            </div>
          </div>

          {filteredMessageRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Mail className="w-9 h-9 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">No requests yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-[260px]">
                Messages from people you don't follow will appear here
              </p>
            </div>
          ) : (
            filteredMessageRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <Avatar
                      className="w-12 h-12 cursor-pointer ring-2 ring-primary/20"
                      onClick={() => setLocation(`/profile/${request.senderUsername}`)}
                    >
                      <AvatarImage src={request.senderAvatar} className="object-cover" />
                      <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                        {request.senderName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p
                            className="text-sm font-semibold text-foreground cursor-pointer"
                            onClick={() => setLocation(`/profile/${request.senderUsername}`)}
                          >
                            {request.senderName}
                          </p>
                          <p className="text-xs text-muted-foreground">@{request.senderUsername}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatTime(request.createdAt)}
                        </div>
                      </div>
                      {request.message && (
                        <div className="mt-2.5 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-foreground/90 leading-relaxed line-clamp-3">
                            {request.message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2.5 mt-4">
                    <Button
                      onClick={() => handleAcceptRequest(request.id)}
                      className="flex-1 bg-gradient-primary text-white rounded-xl h-11 font-semibold"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                    <Button
                      onClick={() => handleDeclineRequest(request.id)}
                      variant="outline"
                      className="flex-1 border-border text-foreground rounded-xl h-11 font-semibold"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
