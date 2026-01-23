import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Search, Mail, Check, X, MessageCircle, Clock, UserX, MessageSquare, Sparkles, ChevronRight, Share2, UserPlus, Users
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

  const handleInviteFriends = () => {
    const text = `Hey! 👋 connect with me on Nearly - The Only Campus Social Network you'll ever need.
    
🚀 Connect with verified students from your campus
💬 Secure Chats & Group Discussions
📸 Share Photo/Video Moments
🔥 Discover Campus Events, Confessions & More!
    
Join the community now: https://nearlyapp.in`;
    const message = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${message}`, '_blank');
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
            <MessageSquare className="w-4 h-4 fill-current" />
            <span>Messages</span>
          </button>
          <button
            onClick={() => setActiveSection("requests")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 relative z-10 ${activeSection === "requests"
              ? "text-white"
              : "text-muted-foreground"
              }`}
          >
            <Mail className="w-4 h-4 fill-current" />
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
            {/* WhatsApp Invite Button */}
            <button
              onClick={handleInviteFriends}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#25D366] hover:opacity-80 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Invite Friends
            </button>
          </div>

          {/* Messages List */}
          <div>
            {filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <UserPlus className="w-9 h-9 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">No messages yet</h3>
                <p className="text-muted-foreground text-sm text-center max-w-[260px]">
                  {searchQuery ? "No results found for your search" : "Invite your friends to chat with them here"}
                </p>
                <Button
                  onClick={handleInviteFriends}
                  className="mt-6 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl px-8 py-6 font-semibold shadow-lg shadow-green-500/20"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current mr-2" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Invite Friends on WhatsApp
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
