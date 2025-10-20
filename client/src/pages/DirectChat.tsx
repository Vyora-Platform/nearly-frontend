import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Smile, Paperclip, Mic, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface Message {
  id: string;
  senderId: string;
  recipientId: string | null;
  content: string;
  imageUrl?: string | null;
  createdAt: Date;
}

export default function DirectChat() {
  const [, params] = useRoute("/chat/:username");
  const [, setLocation] = useLocation();
  const username = params?.username;
  const [message, setMessage] = useState("");
  const currentUserId = "current-user-id";

  const { data: user } = useQuery<any>({
    queryKey: ["/api/users/username", username],
    enabled: !!username,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages/direct", user?.id],
    enabled: !!user?.id,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest("/api/messages", "POST", {
        recipientId: user?.id,
        content,
        messageType: "text",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/direct", user?.id] });
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
          onClick={() => setLocation("/")}
          className="flex-shrink-0"
          data-testid="button-back"
        >
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <button
          className="flex items-center gap-3 flex-1"
          data-testid="button-user-profile"
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.avatarUrl || ""} />
            <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <p className="text-sm font-semibold text-foreground" data-testid="text-username">
            @{username}
          </p>
        </button>
        <button className="flex-shrink-0" data-testid="button-options">
          <span className="text-foreground text-xl">⋮</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isCurrentUser = msg.senderId === currentUserId;

          if (msg.imageUrl) {
            return (
              <div
                key={msg.id}
                className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[75%] ${isCurrentUser ? "items-end" : "items-start"} flex flex-col`}>
                  {!isCurrentUser && (
                    <Avatar className="w-8 h-8 mb-2">
                      <AvatarImage src={user?.avatarUrl || ""} />
                      <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="rounded-2xl overflow-hidden bg-muted">
                    <img src={msg.imageUrl} alt="Shared" className="max-w-xs" />
                    {msg.content && (
                      <div className="p-4">
                        <p className="text-sm text-foreground">{msg.content}</p>
                      </div>
                    )}
                    <div className="px-4 pb-2">
                      <Button className="w-full bg-gradient-primary text-white border-none">
                        Join Event
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(msg.createdAt), "h:mm a")}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex gap-2 ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}
            >
              {!isCurrentUser && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={user?.avatarUrl || ""} />
                  <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              )}
              <div className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"} max-w-[75%]`}>
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
                <p className="text-[10px] text-muted-foreground mt-1">
                  {format(new Date(msg.createdAt), "h:mm a")}
                </p>
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground text-sm">No messages yet</p>
            <p className="text-muted-foreground text-xs mt-1">Say hi to start a conversation!</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-background">
        <div className="flex items-center gap-2">
          <button
            className="flex-shrink-0"
            data-testid="button-emoji"
          >
            <Smile className="w-6 h-6 text-muted-foreground" />
          </button>
          <button
            className="flex-shrink-0"
            data-testid="button-attach-image"
          >
            <Paperclip className="w-6 h-6 text-muted-foreground" />
          </button>
          <button
            className="flex-shrink-0"
            data-testid="button-attach-file"
          >
            <Mic className="w-6 h-6 text-muted-foreground" />
          </button>
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 px-4 py-2.5 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
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
