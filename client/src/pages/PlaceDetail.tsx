import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Star,
  Share2,
  Bookmark,
  BookmarkCheck,
  Phone,
  Globe,
  Navigation,
  Users,
  TrendingUp,
  Camera,
  MessageCircle,
  ThumbsUp,
  Wifi,
  Car,
  Accessibility,
  Music,
  Coffee,
  Utensils
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const amenityIcons: Record<string, any> = {
  "WiFi": Wifi,
  "Parking": Car,
  "Wheelchair Access": Accessibility,
  "Live Music": Music,
  "Restaurants": Utensils,
  "Street Food": Coffee,
};

export default function PlaceDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/place/:id");
  const { toast } = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  const placeId = params?.id || "1";

  const { data: apiPlace, isLoading, error } = useQuery({
    queryKey: ['place', placeId],
    queryFn: () => api.getPlace(placeId),
  });

  // Enrich API data with defaults
  const place = apiPlace ? {
    ...apiPlace,
    category: apiPlace.category || 'Place',
    distance: apiPlace.distance || '-- km',
    rating: apiPlace.rating || 4.0,
    totalReviews: apiPlace.reviewsCount || 0,
    visitorsToday: apiPlace.visitorsCount || 0,
    image: apiPlace.imageUrl || 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800',
    images: apiPlace.images || [apiPlace.imageUrl || 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800'],
    isTrending: apiPlace.isTrending || false,
    description: apiPlace.description || '',
    address: apiPlace.address || '',
    phone: apiPlace.phone || '',
    website: apiPlace.website || '',
    openHours: apiPlace.openHours || '',
    amenities: apiPlace.amenities || [],
    popularTimes: apiPlace.popularTimes || [],
    recentVisitors: apiPlace.recentVisitors || [],
  } : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading place details...</p>
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Place not found</p>
          <Button onClick={() => setLocation("/discover")}>Back to Discover</Button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: isSaved ? "Removed from saved" : "Place saved!",
      description: isSaved ? "Place removed from your saved list." : "You can find this place in your saved items.",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: place.name,
        text: `Check out ${place.name}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      try {
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied!",
          description: "Place link copied to clipboard.",
        });
      } catch {
        toast({
          title: "Share this place",
          description: window.location.href,
        });
      }
    }
  };

  const handleGetDirections = () => {
    const encodedAddress = encodeURIComponent(place.address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-md mx-auto flex items-center justify-between h-14 px-4">
          <button 
            onClick={() => setLocation("/discover")}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Place Details</h1>
          <div className="flex items-center gap-1">
            <button 
              onClick={handleShare}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button 
              onClick={handleSave}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              {isSaved ? (
                <BookmarkCheck className="w-5 h-5 text-primary fill-primary" />
              ) : (
                <Bookmark className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto">
        {/* Image Gallery */}
        <div className="relative">
          <img 
            src={place.images[currentImage]} 
            alt={place.name} 
            className="w-full h-56 object-cover"
          />
          {place.isTrending && (
            <Badge className="absolute top-4 left-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <TrendingUp className="w-3 h-3 mr-1" />
              Trending
            </Badge>
          )}
          {/* Image Dots */}
          {place.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {place.images.map((_: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentImage ? "bg-white w-4" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}
          {/* Add Photo Button */}
          <button className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm flex items-center gap-1">
            <Camera className="w-4 h-4" />
            Add Photo
          </button>
        </div>

        {/* Place Info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{place.name}</h1>
              <p className="text-muted-foreground">{place.category}</p>
            </div>
            <div className="flex items-center bg-muted px-3 py-1.5 rounded-lg">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 mr-1" />
              <span className="font-bold">{place.rating}</span>
              <span className="text-muted-foreground text-sm ml-1">({place.totalReviews.toLocaleString()})</span>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center">
              <MapPin className="w-4 h-4 mr-1 text-primary" />
              {place.distance} away
            </span>
            <span className="flex items-center">
              <Users className="w-4 h-4 mr-1 text-primary" />
              {place.visitorsToday.toLocaleString()} visitors today
            </span>
          </div>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-3 gap-2 p-4 border-b border-border">
          <div className="bg-card p-3 rounded-xl text-center">
            <Clock className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground">Hours</p>
            <p className="text-xs font-medium">{place.openHours.split(",")[0]}</p>
          </div>
          <div className="bg-card p-3 rounded-xl text-center">
            <span className="text-xl">🎫</span>
            <p className="text-xs text-muted-foreground">Entry</p>
            <p className="text-xs font-medium">{place.entryFee}</p>
          </div>
          <div className="bg-card p-3 rounded-xl text-center">
            <span className="text-xl">⏰</span>
            <p className="text-xs text-muted-foreground">Best Time</p>
            <p className="text-xs font-medium">{place.bestTime.split(" ")[0]}</p>
          </div>
        </div>

        {/* Description */}
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">About</h2>
          <p className="text-muted-foreground whitespace-pre-line text-sm leading-relaxed">
            {place.fullDescription}
          </p>
        </div>

        {/* Amenities */}
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {place.amenities.map((amenity: string, i: number) => {
              const Icon = amenityIcons[amenity] || Star;
              return (
                <Badge key={i} variant="secondary" className="py-1.5">
                  <Icon className="w-3 h-3 mr-1" />
                  {amenity}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Tips */}
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">Visitor Tips</h2>
          <ul className="space-y-2">
            {place.tips.map((tip: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-yellow-500">💡</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Location */}
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">Location</h2>
          <div className="bg-card rounded-xl p-4">
            <p className="text-sm mb-3">{place.address}</p>
            <Button 
              onClick={handleGetDirections}
              variant="secondary"
              className="w-full"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Get Directions
            </Button>
          </div>
        </div>

        {/* Nearby Attractions */}
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">Nearby Attractions</h2>
          <div className="space-y-2">
            {place.nearbyAttractions.map((attraction: { name: string; distance: string }, i: number) => (
              <div key={i} className="flex items-center justify-between bg-card p-3 rounded-xl">
                <span className="text-sm font-medium">{attraction.name}</span>
                <span className="text-sm text-muted-foreground">{attraction.distance}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Reviews</h2>
            <Button variant="ghost" size="sm" className="text-primary">
              See All
            </Button>
          </div>
          <div className="space-y-4">
            {place.reviews.map((review: any) => (
              <div key={review.id} className="bg-card p-3 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={review.avatar} />
                    <AvatarFallback>{review.user[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{review.user}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3 h-3 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-muted"}`} 
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{review.date}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{review.comment}</p>
                <div className="flex items-center gap-4 mt-2">
                  <button className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ThumbsUp className="w-3 h-3" />
                    {review.likes}
                  </button>
                  <button className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageCircle className="w-3 h-3" />
                    Reply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="max-w-md mx-auto flex gap-3">
          <Button 
            onClick={handleGetDirections}
            className="flex-1 h-12 bg-gradient-to-r from-primary to-red-500"
          >
            <Navigation className="w-5 h-5 mr-2" />
            Get Directions
          </Button>
          <Button 
            variant="secondary"
            className="h-12 px-6"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

