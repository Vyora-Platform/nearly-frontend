import { Users, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GroupCardProps {
  id: string;
  name: string;
  imageUrl?: string;
  category: string;
  membersCount: number;
  groupType: "Public" | "Private" | "Invite-only";
}

export default function GroupCard({
  name,
  imageUrl,
  category,
  membersCount,
  groupType,
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
    <div className="bg-card rounded-xl border border-card-border p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-primary flex items-center justify-center text-white font-bold text-xl">
              {name[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Badge variant="secondary" className="text-xs mb-2">
            {category}
          </Badge>
          <h3 className="text-base font-semibold text-foreground mb-1 truncate">
            {name}
          </h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{membersCount.toLocaleString()} members</span>
            </div>
            <div className="flex items-center gap-1">
              {getTypeIcon()}
              <span>{groupType}</span>
            </div>
          </div>
        </div>
      </div>

      <Button
        variant="default"
        size="sm"
        className="w-full bg-gradient-primary text-white h-10"
        data-testid="button-join-group"
      >
        {groupType === "Public" ? "Join Group" : "Request to Join"}
      </Button>
    </div>
  );
}
