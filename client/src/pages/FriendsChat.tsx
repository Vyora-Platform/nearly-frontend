import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Search, Mail, Check, X, MessageCircle, Clock, UserX, MessageSquare
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
    <div className="flex flex-col min-h-screen bg-black">
      {/* Search Bar */}
      <div className="p-4 sticky top-0 bg-black z-10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-zinc-900 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={() => setActiveSection("chats")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all
            ${activeSection === "chats"
              ? "bg-primary text-white"
              : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
        >
          <MessageCircle className="w-4 h-4" />
          Messages
        </button>
        <button
          onClick={() => setActiveSection("requests")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all relative
            ${activeSection === "requests"
              ? "bg-primary text-white"
              : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
        >
          <Mail className="w-4 h-4" />
          Requests
          {filteredMessageRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-white text-primary text-xs rounded-full flex items-center justify-center font-bold px-1 ring-2 ring-black">
              {filteredMessageRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {activeSection === "chats" ? (
        <div className="flex-1">
          {/* Headline with total friends count */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">
              Friends ({friends.length})
            </h2>
          </div>

          {/* Messages List */}
          <div className="divide-y divide-zinc-800/50">
            {filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                  <MessageSquare className="w-10 h-10 text-zinc-600" />
                </div>
                <p className="text-white font-semibold text-lg">Your messages</p>
                <p className="text-zinc-500 text-sm text-center mt-1">
                  {searchQuery ? "No results found" : "Send a message to start a chat"}
                </p>
                <Button
                  onClick={() => setLocation("/discover")}
                  className="mt-6 bg-primary hover:bg-primary/90 text-white rounded-xl px-6"
                >
                  Send message
                </Button>
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <Link
                  key={friend.id}
                  href={`/chat/${friend.username}`}
                  className="flex items-center gap-3 p-4 hover:bg-zinc-900/50 active:bg-zinc-900 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={friend.avatarUrl} />
                      <AvatarFallback className="bg-primary text-white font-semibold">
                        {friend.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {friend.isOnline && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-black" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-semibold ${friend.unreadCount ? "text-white" : "text-zinc-300"}`}>
                        {friend.name}
                      </p>
                      <span className={`text-xs ${friend.unreadCount ? "text-white" : "text-zinc-500"}`}>
                        {formatTime(friend.lastMessageTime)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-sm truncate pr-4 ${friend.unreadCount ? "text-white font-medium" : "text-zinc-500"}`}>
                        {friend.lastMessage ? friend.lastMessage : (
                          <span className="text-primary italic">Start conversation</span>
                        )}
                      </p>
                      {friend.unreadCount && friend.unreadCount > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
                          {friend.unreadCount > 9 ? "9+" : friend.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

        </div>
      ) : (
        <div className="px-4 pb-4 space-y-3">
          {/* Headline with requests count */}
          <h2 className="text-lg font-semibold text-white pt-2">
            Requests ({filteredMessageRequests.length})
          </h2>

          {/* Info banner */}
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <UserX className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Message Requests</p>
                <p className="text-xs text-zinc-500 mt-1">
                  These are messages from people you don't follow. They won't know you've seen their request until you accept.
                </p>
              </div>
            </div>
          </div>

          {filteredMessageRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                <Mail className="w-10 h-10 text-zinc-600" />
              </div>
              <p className="text-white font-semibold">No message requests</p>
              <p className="text-sm text-zinc-500 text-center mt-1">
                Messages from people you don't follow will appear here
              </p>
            </div>
          ) : (
            filteredMessageRequests.map((request) => (
              <div
                key={request.id}
                className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800"
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    className="w-14 h-14 cursor-pointer ring-2 ring-primary ring-offset-2 ring-offset-black"
                    onClick={() => setLocation(`/profile/${request.senderUsername}`)}
                  >
                    <AvatarImage src={request.senderAvatar} />
                    <AvatarFallback className="bg-primary text-white font-semibold">
                      {request.senderName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className="text-sm font-semibold text-white cursor-pointer hover:underline"
                          onClick={() => setLocation(`/profile/${request.senderUsername}`)}
                        >
                          {request.senderName}
                        </p>
                        <p className="text-xs text-zinc-500">@{request.senderUsername}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="w-3 h-3" />
                        {formatTime(request.createdAt)}
                      </div>
                    </div>
                    {request.message && (
                      <div className="mt-3 p-3 bg-zinc-800 rounded-xl">
                        <p className="text-sm text-zinc-300 line-clamp-3">
                          {request.message}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => handleAcceptRequest(request.id)}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl h-11"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Accept
                  </Button>
                  <Button
                    onClick={() => handleDeclineRequest(request.id)}
                    variant="outline"
                    className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl h-11"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
