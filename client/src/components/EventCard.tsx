import { Calendar, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";

interface EventCardProps {
  id: string;
  title: string;
  imageUrl: string;
  host: {
    name: string;
    username: string;
    avatar?: string;
  };
  date: string;
  location: string;
  attendeesCount: number;
  entryType: string;
  price?: number;
  categories: string[];
}

export default function EventCard({
  id,
  title,
  imageUrl,
  host,
  date,
  location,
  attendeesCount,
  entryType,
  price,
  categories,
}: EventCardProps) {
  return (
    <div className="bg-card rounded-xl overflow-hidden border border-card-border" data-testid={`card-event-${id}`}>
      <div className="relative">
        <img
          src={imageUrl}
          alt={title}
          className="w-full object-cover"
          style={{ aspectRatio: "16/9" }}
        />
      </div>

      <div className="p-4">
        <div className="flex gap-2 mb-2">
          {categories.map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="text-xs uppercase"
            >
              {category}
            </Badge>
          ))}
        </div>

        <h3 className="text-base font-semibold text-foreground mb-3">{title}</h3>

        <div className="flex items-center gap-2 mb-3">
          <Avatar className="w-6 h-6">
            <AvatarImage src={host.avatar} />
            <AvatarFallback className="text-xs">{host.name[0]}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{host.username}</span>
        </div>

        <div className="flex flex-col gap-2 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{attendeesCount} attending</span>
            {entryType === "FREE" ? (
              <Badge variant="secondary" className="ml-auto text-xs bg-chart-3/20 text-chart-3">
                FREE
              </Badge>
            ) : entryType === "SPONSORED" ? (
              <Badge variant="secondary" className="ml-auto text-xs bg-primary/20 text-primary">
                SPONSORED
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-auto text-xs">
                ₹{price}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/event/${id}`}>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              data-testid="button-view-details"
            >
              View Details
            </Button>
          </Link>
          <Button
            variant="default"
            size="sm"
            className="flex-1 bg-gradient-primary text-white h-9"
            data-testid="button-join-event"
          >
            Join
          </Button>
        </div>
      </div>
    </div>
  );
}
