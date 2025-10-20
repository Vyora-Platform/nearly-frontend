import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Users, Send, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface Message {
  id: string;
  senderId: string;
  groupId: string;
  content: string;
  createdAt: Date;
  senderName?: string;
  senderAvatar?: string;
}

export default function GroupChat() {
  const [, params] = useRoute("/group/:id/chat");
  const [, setLocation] = useLocation();
  const groupId = params?.id;
  const [message, setMessage] = useState("");
  const currentUserId = "current-user-id";

  const { data: group } = useQuery<any>({
    queryKey: ["/api/groups", groupId],
    enabled: !!groupId,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages", groupId],
    enabled: !!groupId,
  });

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/groups", groupId, "members"],
    enabled: !!groupId,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("/api/messages", "POST", {
        groupId,
        content,
        messageType: "text",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", groupId] });
      setMessage("");
    },
  });

  const handleSend = () => {
    if (message.trim()) {
      sendMutation.mutate(message);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center gap-3 p-4 border-b border-border bg-background">
        <button
          onClick={() => setLocation("/my-groups")}
          className="flex-shrink-0"
          data-testid="button-back"
        >
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <button
          className="flex items-center gap-3 flex-1"
          data-testid="button-group-info"
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={group?.imageUrl || ""} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {group?.name?.charAt(0) || "G"}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground" data-testid="text-group-name">
              {group?.name || "Group"}
            </p>
            <p className="text-xs text-muted-foreground">
              {members.length} members
            </p>
          </div>
        </button>
        <button className="flex-shrink-0" data-testid="button-options">
          <span className="text-foreground text-xl">⋮</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isCurrentUser = msg.senderId === currentUserId;
          const showAvatar = !isCurrentUser;

          return (
            <div
              key={msg.id}
              className={`flex gap-2 ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}
            >
              {showAvatar && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={msg.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`} />
                  <AvatarFallback>{msg.senderName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              )}
              <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"} max-w-[75%]`}>
                {!isCurrentUser && (
                  <p className="text-xs text-muted-foreground mb-1 px-1">
                    {msg.senderName || "User"}
                  </p>
                )}
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    isCurrentUser
                      ? "bg-gradient-primary text-white"
                      : "bg-muted text-foreground"
                  }`}
                  data-testid={`message-${msg.id}`}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 px-1">
                  {format(new Date(msg.createdAt), "h:mm a")}
                </p>
              </div>
              {isCurrentUser && (
                <Avatar className="w-8 h-8 flex-shrink-0 opacity-0">
                  <AvatarFallback>ME</AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-border bg-background">
        <div className="flex items-center gap-2">
          <button
            className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            data-testid="button-attach"
          >
            <Plus className="w-5 h-5 text-muted-foreground" />
          </button>
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 px-4 py-2.5 bg-muted rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            data-testid="input-message"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-primary text-white flex items-center justify-center disabled:opacity-50"
            data-testid="button-send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
