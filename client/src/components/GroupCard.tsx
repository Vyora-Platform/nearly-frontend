import { Users, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface GroupCardProps {
  id: string;
  name: string;
  imageUrl?: string;
  category: string;
  membersCount: number;
  groupType: "Public" | "Private" | "Invite-only";
  description?: string;
  lastMessage?: string;
}

export default function GroupCard({
  name,
  imageUrl,
  category,
  membersCount,
  groupType,
  description,
  lastMessage,
}: GroupCardProps) {
  const getTypeIcon = () => {
    switch (groupType) {
      case "Public":
        return <Globe className="w-3 h-3" />;
      case "Private":
        return <Lock className="w-3 h-3" />;
      case "Invite-only":
        return <Lock className="w-3 h-3" />;
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="w-14 h-14 flex-shrink-0">
          <AvatarImage src={imageUrl} alt={name} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold text-lg">
            {name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {name}
            </h3>
            {groupType !== "Public" && (
              <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
              {description}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {category}
            </Badge>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {membersCount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <Button
        variant="default"
        size="sm"
        className="w-full bg-gradient-primary text-white h-9"
        data-testid="button-join-group"
      >
        {groupType === "Public" ? "Join Group" : "Request to Join"}
      </Button>
    </div>
  );
}
