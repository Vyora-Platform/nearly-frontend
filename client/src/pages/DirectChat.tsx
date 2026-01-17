import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, Smile, ImageIcon, Mic, Send, 
  Heart, Check, CheckCheck, Camera, Sticker, X, Info 
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { messagingApi, mediaApi } from "@/lib/gateway-api";
import { authFetch } from "@/lib/queryClient";
import { format, isToday, isYesterday } from "date-fns";

interface Message {
  id: string;
  senderId: string;
  recipientId: string | null;
  content: string;
  messageType?: "text" | "image" | "video" | "audio" | "sticker";
  mediaUrl?: string | null;
  imageUrl?: string | null;
  replyToId?: string | null;
  reactions?: { emoji: string; userId: string }[];
  status: "sending" | "sent" | "delivered" | "seen";
  createdAt: Date;
}

// Common emoji reactions like Instagram
const quickReactions = ["❤️", "😂", "😮", "😢", "😡", "👍"];

// Popular emojis for the emoji picker
const popularEmojis = [
  "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂",
  "😉", "😍", "🥰", "😘", "😗", "😋", "😛", "😜", "🤪", "😝",
  "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶",
  "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴",
  "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
  "👍", "👎", "👊", "✊", "🤛", "🤜", "🤝", "👏", "🙌", "👐",
  "🔥", "⭐", "✨", "💫", "🌟", "💥", "💯", "🎉", "🎊", "🎈"
];

export default function DirectChat() {
  const [, params] = useRoute("/chat/:username");
  const [, setLocation] = useLocation();
  const username = params?.username;
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const currentUserId = localStorage.getItem('nearly_user_id') || '';
  const currentUserName = localStorage.getItem('nearly_user_name') || 'You';
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current user data for real name/avatar
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser", currentUserId],
    queryFn: () => api.getUser(currentUserId),
    enabled: !!currentUserId,
  });

  // Fetch user by username
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ["userByUsername", username],
    queryFn: () => api.getUserByUsername(username!),
    enabled: !!username,
  });

  // Fetch direct messages
  const { data: messages = [], isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ["directMessages", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const msgs = await messagingApi.getDirectMessages(currentUserId, user.id);
        return msgs.map((m: any) => ({ ...m, status: m.status || "delivered" }));
      } catch {
        const msgs = await api.getDirectMessages(user.id);
        return msgs.map((m: any) => ({ ...m, status: m.status || "delivered" }));
      }
    },
    enabled: !!user?.id,
    refetchInterval: 2000,
  });

  // Mark messages as seen when viewing
  useEffect(() => {
    if (user?.id && messages.length > 0) {
      const unseenMessages = messages.filter(
        (m) => m.senderId !== currentUserId && m.status !== "seen"
      );
      if (unseenMessages.length > 0) {
        // Mark as seen via API
        authFetch(`/api/messages/mark-seen`, {
          method: "POST",
          body: JSON.stringify({ 
            recipientId: currentUserId, 
            senderId: user.id 
          }),
        }).catch(() => {});
      }
    }
  }, [messages, user?.id, currentUserId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async ({ content, mediaUrl, messageType }: { content: string; mediaUrl?: string; messageType?: string }) => {
      try {
        return await messagingApi.sendMessage({
          senderId: currentUserId,
          senderName: currentUser?.name || currentUserName,
          senderAvatar: currentUser?.avatarUrl,
          recipientId: user?.id,
          content,
          mediaUrl,
          messageType: messageType || "text",
          replyToId: replyingTo?.id,
          status: "sending",
        });
      } catch {
        return await api.createMessage({
          senderId: currentUserId,
          senderName: currentUser?.name || currentUserName,
          senderAvatar: currentUser?.avatarUrl,
          recipientId: user?.id,
          content,
          mediaUrl,
          messageType: messageType || "text",
          replyToId: replyingTo?.id,
          status: "sending",
        });
      }
    },
    onMutate: async ({ content, mediaUrl, messageType }) => {
      // Optimistic update
      const newMessage: Message = {
        id: `temp-${Date.now()}`,
        senderId: currentUserId,
        recipientId: user?.id || null,
        content,
        mediaUrl,
        messageType: (messageType || "text") as Message["messageType"],
        status: "sending",
        createdAt: new Date(),
      };
      queryClient.setQueryData<Message[]>(
        ["directMessages", user?.id],
        (old = []) => [...old, newMessage]
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["directMessages", user?.id] });
      setMessage("");
      setReplyingTo(null);
      setSelectedImage(null);
      setImagePreview(null);
    },
  });

  // Upload image (userId is now extracted from JWT token on server)
  const uploadImage = async (file: File): Promise<string> => {
    // Upload using mediaApi
    try {
      const result = await mediaApi.uploadFile(
        file,
        "MESSAGE",
        user?.id
      );
      return result.success ? result.url : URL.createObjectURL(file);
    } catch {
      // Fallback to local URL
      return URL.createObjectURL(file);
    }
  };

  const handleSend = async () => {
    if (selectedImage) {
      const mediaUrl = await uploadImage(selectedImage);
      sendMutation.mutate({ content: message, mediaUrl, messageType: "image" });
    } else if (message.trim()) {
      sendMutation.mutate({ content: message, messageType: "text" });
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setShowMediaOptions(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await authFetch(`/api/messages/${messageId}/react`, {
        method: "POST",
        body: JSON.stringify({ userId: currentUserId, emoji }),
      });
      queryClient.invalidateQueries({ queryKey: ["directMessages", user?.id] });
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
    setSelectedMessageId(null);
  };

  const formatMessageTime = (date: Date) => {
    const d = new Date(date);
    return format(d, "h:mm a");
  };

  const formatDateDivider = (date: Date) => {
    const d = new Date(date);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMMM d, yyyy");
  };

  // Group messages by date
  const groupedMessages = messages.reduce((acc: { date: string; messages: Message[] }[], msg) => {
    const dateStr = format(new Date(msg.createdAt), "yyyy-MM-dd");
    const lastGroup = acc[acc.length - 1];
    if (lastGroup && lastGroup.date === dateStr) {
      lastGroup.messages.push(msg);
    } else {
      acc.push({ date: dateStr, messages: [msg] });
    }
    return acc;
  }, []);

  const getStatusIcon = (status: Message["status"], isMe: boolean) => {
    if (!isMe) return null;
    switch (status) {
      case "sending":
        return <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />;
      case "sent":
        return <Check className="w-3.5 h-3.5 text-gray-400" />;
      case "delivered":
        return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
      case "seen":
        return <CheckCheck className="w-3.5 h-3.5 text-green-500" />;
      default:
        return <Check className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Instagram-style Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-black border-b border-zinc-800">
        <button
          onClick={() => setLocation("/chat")}
          className="p-1 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        
        <button
          onClick={() => setLocation(`/profile/${username}`)}
          className="flex items-center gap-3 flex-1"
        >
          <div className="relative">
            <Avatar className="w-10 h-10 ring-2 ring-pink-500 ring-offset-2 ring-offset-black">
              <AvatarImage src={user?.avatarUrl || ""} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                {user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">{user?.name || username}</p>
            <p className="text-xs text-zinc-400">Active now</p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setLocation(`/profile/${username}`)}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <Info className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 bg-black">
        {loadingMessages ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Avatar className="w-24 h-24 mb-4 ring-4 ring-pink-500 ring-offset-4 ring-offset-black">
              <AvatarImage src={user?.avatarUrl || ""} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-2xl">
                {user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <p className="text-white font-semibold text-lg">{user?.name || username}</p>
            <p className="text-zinc-400 text-sm">@{username}</p>
            <p className="text-zinc-500 text-sm mt-4">Start a conversation</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date Divider */}
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-400">
                  {formatDateDivider(new Date(group.date))}
                </span>
              </div>
              
              {group.messages.map((msg, idx) => {
                const isMe = msg.senderId === currentUserId;
                const showAvatar = !isMe && (idx === 0 || group.messages[idx - 1]?.senderId !== msg.senderId);
                const isSelected = selectedMessageId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 mb-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar for other user */}
                    {!isMe && (
                      <div className="w-7 flex-shrink-0">
                        {showAvatar && (
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={user?.avatarUrl || ""} />
                            <AvatarFallback className="bg-zinc-700 text-white text-xs">
                              {user?.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
                      {/* Message Bubble */}
                      <div
                        className={`relative group ${
                          msg.messageType === "image" ? "" : "px-4 py-2.5"
                        } ${
                          isMe
                            ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-3xl rounded-br-md"
                            : "bg-zinc-800 text-white rounded-3xl rounded-bl-md"
                        }`}
                        onDoubleClick={() => !isMe && handleReaction(msg.id, "❤️")}
                        onClick={() => setSelectedMessageId(isSelected ? null : msg.id)}
                      >
                        {/* Reply Preview */}
                        {msg.replyToId && (
                          <div className="bg-black/20 rounded-lg p-2 mb-2 text-xs text-zinc-300 border-l-2 border-pink-500">
                            Replying to message
                          </div>
                        )}

                        {/* Media Content */}
                        {msg.messageType === "image" && (msg.mediaUrl || msg.imageUrl) && (
                          <img 
                            src={msg.mediaUrl || msg.imageUrl || ""} 
                            alt="Shared" 
                            className="rounded-2xl max-w-full max-h-64 object-cover"
                          />
                        )}

                        {/* Text Content */}
                        {msg.content && (
                          <p className={`text-sm ${msg.messageType === "image" ? "mt-2 px-2" : ""}`}>
                            {msg.content}
                          </p>
                        )}

                        {/* Quick Reactions Popup */}
                        {isSelected && !isMe && (
                          <div className="absolute -top-12 left-0 flex gap-1 bg-zinc-900 rounded-full px-2 py-1 shadow-xl border border-zinc-700 z-10">
                            {quickReactions.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReaction(msg.id, emoji);
                                }}
                                className="text-lg hover:scale-125 transition-transform p-1"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Reactions Display */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className={`flex gap-0.5 mt-1 ${isMe ? "mr-2" : "ml-2"}`}>
                          {msg.reactions.map((r, i) => (
                            <span key={i} className="text-sm bg-zinc-800 rounded-full px-1.5 py-0.5">
                              {r.emoji}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Time and Status */}
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? "mr-1" : "ml-1"}`}>
                        <span className="text-[10px] text-zinc-500">
                          {formatMessageTime(msg.createdAt)}
                        </span>
                        {getStatusIcon(msg.status, isMe)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800">
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="h-24 rounded-lg object-cover" />
            <button
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
              }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-10 bg-pink-500 rounded-full" />
            <div>
              <p className="text-xs text-pink-500 font-medium">
                Replying to {replyingTo.senderId === currentUserId ? "yourself" : user?.name}
              </p>
              <p className="text-xs text-zinc-400 truncate max-w-[200px]">{replyingTo.content}</p>
            </div>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-1">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 left-4 z-50 bg-zinc-900 rounded-2xl p-3 shadow-xl border border-zinc-800 w-80">
          <p className="text-xs text-zinc-500 mb-2 px-1">Popular Emojis</p>
          <div className="grid grid-cols-8 gap-1 max-h-64 overflow-y-auto">
            {popularEmojis.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => handleEmojiClick(emoji)}
                className="text-2xl p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Media Options */}
      {showMediaOptions && (
        <div className="absolute bottom-20 left-4 bg-zinc-900 rounded-2xl p-4 shadow-xl border border-zinc-800 z-50">
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 p-3 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-purple-500" />
              </div>
              <span className="text-xs text-zinc-400">Gallery</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-3 hover:bg-zinc-800 rounded-xl transition-colors">
              <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-pink-500" />
              </div>
              <span className="text-xs text-zinc-400">Camera</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-3 hover:bg-zinc-800 rounded-xl transition-colors">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Sticker className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-xs text-zinc-400">Sticker</span>
            </button>
          </div>
        </div>
      )}

      {/* Input Area - Instagram Style */}
      <div className="px-4 py-3 bg-black border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowMediaOptions(!showMediaOptions);
              setShowEmojiPicker(false);
            }}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <Camera className="w-6 h-6 text-white" />
          </button>
          
          <div className="flex-1 flex items-center gap-2 bg-zinc-800 rounded-full px-4 py-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
            />
            <button
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowMediaOptions(false);
              }}
              className="hover:opacity-70 transition-opacity"
            >
              <Smile className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {message.trim() || selectedImage ? (
            <button
              onClick={handleSend}
              disabled={sendMutation.isPending}
              className="p-2 hover:opacity-80 transition-opacity"
            >
              <Send className="w-6 h-6 text-pink-500" />
            </button>
          ) : (
            <>
              <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                <Mic className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <ImageIcon className="w-6 h-6 text-white" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Click outside to close popups */}
      {(showEmojiPicker || showMediaOptions) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowEmojiPicker(false);
            setShowMediaOptions(false);
          }}
        />
      )}
    </div>
  );
}
