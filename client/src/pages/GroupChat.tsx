import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, Users, Send, Plus, Smile, ImageIcon, Mic, Camera, 
  Check, CheckCheck, BarChart2, X, Info,
  Share2, Crown
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { messagingApi, mediaApi } from "@/lib/gateway-api";
import { authFetch } from "@/lib/queryClient";
import { format, isToday, isYesterday } from "date-fns";

interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  groupId: string;
  content: string;
  messageType?: "text" | "image" | "video" | "audio" | "poll";
  mediaUrl?: string | null;
  poll?: Poll | null;
  reactions?: { emoji: string; userId: string }[];
  seenBy?: string[];
  createdAt: Date;
}

interface Poll {
  id: string;
  question: string;
  options: { id: string; text: string; votes: string[] }[];
  totalVotes: number;
  expiresAt?: string;
  createdBy: string;
}

interface GroupMember {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatarUrl?: string;
  role: "admin" | "member";
}

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

export default function GroupChat() {
  const [, params] = useRoute("/group/:id/chat");
  const [, setLocation] = useLocation();
  const groupId = params?.id;
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const currentUserId = localStorage.getItem('nearly_user_id') || '';
  const currentUserName = localStorage.getItem('nearly_user_name') || 'You';
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current user for real data
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser", currentUserId],
    queryFn: () => api.getUser(currentUserId),
    enabled: !!currentUserId,
  });

  // Fetch group details
  const { data: group, isLoading: loadingGroup } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => api.getGroup(groupId!),
    enabled: !!groupId,
  });

  // Fetch group messages
  const { data: messages = [], isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: ["groupMessages", groupId],
    queryFn: async () => {
      try {
        const msgs = await messagingApi.getGroupMessages(groupId!);
        return (msgs || []).map((m: any) => ({ ...m, seenBy: m.seenBy || [] }));
      } catch {
        const msgs = await api.getGroupMessages(groupId!);
        return msgs.map((m: any) => ({ ...m, seenBy: m.seenBy || [] }));
      }
    },
    enabled: !!groupId,
    refetchInterval: 2000,
  });

  // Fetch group members with real user data
  const { data: members = [] } = useQuery<GroupMember[]>({
    queryKey: ["groupMembers", groupId],
    queryFn: async () => {
      const memberData = await api.getGroupMembers(groupId!);
      // Enrich with real user data
      const enrichedMembers = await Promise.all(
        memberData.map(async (m: any) => {
          try {
            const user = await api.getUser(m.userId);
            return {
              ...m,
              name: user?.name || m.name || "Unknown",
              username: user?.username || `user_${m.userId}`,
              avatarUrl: user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.userId}`,
            };
          } catch {
            return m;
          }
        })
      );
      return enrichedMembers;
    },
    enabled: !!groupId,
  });

  // Mark messages as seen
  useEffect(() => {
    if (groupId && messages.length > 0) {
      authFetch(`/api/groups/${groupId}/messages/mark-seen`, {
        method: "POST",
        body: JSON.stringify({ userId: currentUserId }),
      }).catch(() => {});
    }
  }, [messages, groupId, currentUserId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async ({ content, mediaUrl, messageType, poll }: { 
      content: string; 
      mediaUrl?: string; 
      messageType?: string;
      poll?: Poll;
    }) => {
      try {
        return await messagingApi.sendMessage({
          groupId,
          senderId: currentUserId,
          senderName: currentUser?.name || currentUserName,
          senderAvatar: currentUser?.avatarUrl,
          content,
          mediaUrl,
          messageType: messageType || "text",
          poll,
        });
      } catch {
        return await api.createMessage({
          groupId,
          senderId: currentUserId,
          senderName: currentUser?.name || currentUserName,
          senderAvatar: currentUser?.avatarUrl,
          content,
          mediaUrl,
          messageType: messageType || "text",
          poll,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupMessages", groupId] });
      setMessage("");
      setSelectedImage(null);
      setImagePreview(null);
    },
  });

  // Vote on poll mutation
  const voteMutation = useMutation({
    mutationFn: async ({ messageId, optionId }: { messageId: string; optionId: string }) => {
      const res = await authFetch(`/api/messages/${messageId}/poll/vote`, {
        method: "POST",
        body: JSON.stringify({ userId: currentUserId, optionId }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupMessages", groupId] });
    },
  });

  const handleSend = async () => {
    if (selectedImage) {
      try {
        // userId is now extracted from JWT token on server
        const result = await mediaApi.uploadFile(
          selectedImage,
          "MESSAGE",
          groupId
        );
        const mediaUrl = result.success ? result.url : URL.createObjectURL(selectedImage);
        sendMutation.mutate({ content: message, mediaUrl, messageType: "image" });
      } catch {
        sendMutation.mutate({ content: message, mediaUrl: URL.createObjectURL(selectedImage), messageType: "image" });
      }
    } else if (message.trim()) {
      sendMutation.mutate({ content: message, messageType: "text" });
    }
  };

  const handleCreatePoll = () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;
    
    const poll: Poll = {
      id: `poll-${Date.now()}`,
      question: pollQuestion,
      options: pollOptions.filter(o => o.trim()).map((text, idx) => ({
        id: `opt-${idx}`,
        text,
        votes: [],
      })),
      totalVotes: 0,
      createdBy: currentUserId,
    };

    sendMutation.mutate({ content: "", messageType: "poll", poll });
    setShowPollCreator(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
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
      queryClient.invalidateQueries({ queryKey: ["groupMessages", groupId] });
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
    setSelectedMessageId(null);
  };

  const handleShareGroup = async () => {
    const shareUrl = `${window.location.origin}/group/${groupId}`;
    const shareData = {
      title: group?.name || "Group",
      text: `Join ${group?.name} on Nearly!`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard!");
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
  };

  const formatMessageTime = (date: Date) => format(new Date(date), "h:mm a");

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

  // Check if all members have seen the message
  const allMembersSeen = (seenBy: string[] = []) => {
    return members.length > 0 && seenBy.length >= members.length - 1;
  };

  const getStatusIcon = (msg: Message, isMe: boolean) => {
    if (!isMe) return null;
    const seenCount = msg.seenBy?.length || 0;
    if (seenCount === 0) {
      return <Check className="w-3.5 h-3.5 text-zinc-500" />;
    } else if (allMembersSeen(msg.seenBy)) {
      return <CheckCheck className="w-3.5 h-3.5 text-green-500" />;
    } else {
      return <CheckCheck className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getMemberById = (userId: string) => members.find(m => m.userId === userId);

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-black border-b border-zinc-800">
        <button
          onClick={() => setLocation("/chat")}
          className="p-1 hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        
        <button
          onClick={() => setLocation(`/group/${groupId}/details`)}
          className="flex items-center gap-3 flex-1"
        >
          <div className="relative">
            <Avatar className="w-10 h-10 ring-2 ring-purple-500 ring-offset-2 ring-offset-black">
              <AvatarImage src={group?.imageUrl || ""} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                {group?.name?.charAt(0) || "G"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">{group?.name || "Group"}</p>
            <p className="text-xs text-zinc-400">{members.length} members</p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleShareGroup}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <Share2 className="w-5 h-5 text-white" />
          </button>
          <button 
            onClick={() => setLocation(`/group/${groupId}/details`)}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <Info className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 bg-black">
        {loadingMessages ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
              <Users className="w-12 h-12 text-white" />
            </div>
            <p className="text-white font-semibold text-lg">{group?.name}</p>
            <p className="text-zinc-400 text-sm">{members.length} members</p>
            <p className="text-zinc-500 text-sm mt-4">Start the conversation!</p>
          </div>
        ) : (
          groupedMessages.map((grp) => (
            <div key={grp.date}>
              {/* Date Divider */}
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-400">
                  {formatDateDivider(new Date(grp.date))}
                </span>
              </div>
              
              {grp.messages.map((msg, idx) => {
                const isMe = msg.senderId === currentUserId;
                const sender = getMemberById(msg.senderId);
                const showSenderInfo = !isMe && (idx === 0 || grp.messages[idx - 1]?.senderId !== msg.senderId);
                const isSelected = selectedMessageId === msg.id;

                // Poll message
                if (msg.messageType === "poll" && msg.poll) {
                  const hasVoted = msg.poll.options.some(o => o.votes.includes(currentUserId));
                  
                  return (
                    <div key={msg.id} className="my-4">
                      <div className="bg-zinc-900 rounded-2xl p-4 max-w-md mx-auto border border-zinc-800">
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart2 className="w-5 h-5 text-purple-500" />
                          <span className="text-sm font-medium text-white">Poll</span>
                          <span className="text-xs text-zinc-500 ml-auto">
                            {msg.poll.totalVotes} votes
                          </span>
                        </div>
                        
                        <p className="text-white font-medium mb-4">{msg.poll.question}</p>
                        
                        <div className="space-y-2">
                          {msg.poll.options.map((option) => {
                            const votePercentage = msg.poll!.totalVotes > 0 
                              ? (option.votes.length / msg.poll!.totalVotes) * 100 
                              : 0;
                            const isMyVote = option.votes.includes(currentUserId);

                            return (
                              <button
                                key={option.id}
                                onClick={() => !hasVoted && voteMutation.mutate({ messageId: msg.id, optionId: option.id })}
                                disabled={hasVoted}
                                className={`w-full relative overflow-hidden rounded-xl p-3 text-left transition-all ${
                                  hasVoted 
                                    ? "bg-zinc-800" 
                                    : "bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98]"
                                }`}
                              >
                                {hasVoted && (
                                  <div 
                                    className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 transition-all"
                                    style={{ width: `${votePercentage}%` }}
                                  />
                                )}
                                <div className="relative flex items-center justify-between">
                                  <span className={`text-sm ${isMyVote ? "text-purple-400 font-medium" : "text-white"}`}>
                                    {option.text}
                                  </span>
                                  {hasVoted && (
                                    <span className="text-xs text-zinc-400">
                                      {Math.round(votePercentage)}%
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        
                        <p className="text-xs text-zinc-500 mt-3">
                          Created by {sender?.name || "Unknown"} • {formatMessageTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 mb-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    {!isMe && (
                      <div className="w-7 flex-shrink-0">
                        {showSenderInfo && (
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={msg.senderAvatar || sender?.avatarUrl || ""} />
                            <AvatarFallback className="bg-zinc-700 text-white text-xs">
                              {(msg.senderName || sender?.name || "U").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}

                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}>
                      {/* Sender Name */}
                      {showSenderInfo && !isMe && (
                        <p className="text-xs text-zinc-500 mb-1 ml-1 flex items-center gap-1">
                          {msg.senderName || sender?.name || "Unknown"}
                          {sender?.role === "admin" && (
                            <Crown className="w-3 h-3 text-yellow-500" />
                          )}
                        </p>
                      )}

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
                        {/* Media Content */}
                        {msg.messageType === "image" && msg.mediaUrl && (
                          <img 
                            src={msg.mediaUrl} 
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

                        {/* Quick Reactions */}
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

                      {/* Reactions */}
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
                        {getStatusIcon(msg, isMe)}
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

      {/* Poll Creator Modal */}
      {showPollCreator && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
          <div className="bg-zinc-900 rounded-t-3xl w-full max-w-md p-6 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Create Poll</h3>
              <button onClick={() => setShowPollCreator(false)}>
                <X className="w-6 h-6 text-zinc-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Question</label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full px-4 py-3 bg-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Options</label>
                <div className="space-y-2">
                  {pollOptions.map((option, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...pollOptions];
                          newOptions[idx] = e.target.value;
                          setPollOptions(newOptions);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 px-4 py-3 bg-zinc-800 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      {idx > 1 && (
                        <button
                          onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                          className="p-3 bg-zinc-800 rounded-xl"
                        >
                          <X className="w-5 h-5 text-zinc-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {pollOptions.length < 4 && (
                  <button
                    onClick={() => setPollOptions([...pollOptions, ""])}
                    className="mt-2 text-sm text-purple-400 hover:text-purple-300"
                  >
                    + Add option
                  </button>
                )}
              </div>
            </div>

            <Button
              onClick={handleCreatePoll}
              disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
              className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-6 rounded-xl font-medium"
            >
              Create Poll
            </Button>
          </div>
        </div>
      )}

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
            <button
              onClick={() => {
                setShowMediaOptions(false);
                setShowPollCreator(true);
              }}
              className="flex flex-col items-center gap-2 p-3 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center">
                <BarChart2 className="w-6 h-6 text-pink-500" />
              </div>
              <span className="text-xs text-zinc-400">Poll</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-3 hover:bg-zinc-800 rounded-xl transition-colors">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-xs text-zinc-400">Camera</span>
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-3 bg-black border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowMediaOptions(!showMediaOptions);
              setShowEmojiPicker(false);
            }}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <Plus className="w-6 h-6 text-white" />
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
              <Send className="w-6 h-6 text-purple-500" />
            </button>
          ) : (
            <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
              <Mic className="w-6 h-6 text-white" />
            </button>
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
