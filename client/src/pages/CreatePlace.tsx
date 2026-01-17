import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  MapPin,
  Clock,
  Image as ImageIcon,
  Phone,
  Globe,
  X,
  Star,
  Navigation,
  Building,
  Utensils,
  Coffee,
  ShoppingBag,
  TreePine,
  Landmark,
  Church,
  Clapperboard,
  Plus,
  Lightbulb,
  Ticket,
  Calendar,
  Wifi,
  Car,
  Accessibility,
  Music,
  PawPrint,
  Baby,
  Umbrella,
  Package
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const placeCategories = [
  { id: "restaurant", label: "Restaurant", icon: Utensils },
  { id: "cafe", label: "Cafe", icon: Coffee },
  { id: "shopping", label: "Shopping", icon: ShoppingBag },
  { id: "park", label: "Park", icon: TreePine },
  { id: "monument", label: "Monument", icon: Landmark },
  { id: "religious", label: "Religious", icon: Church },
  { id: "entertainment", label: "Entertainment", icon: Clapperboard },
  { id: "other", label: "Other", icon: Building },
];

const amenitiesList = [
  { id: "parking", label: "Parking", icon: Car },
  { id: "wifi", label: "WiFi", icon: Wifi },
  { id: "wheelchair", label: "Wheelchair Access", icon: Accessibility },
  { id: "liveMusic", label: "Live Music", icon: Music },
  { id: "petFriendly", label: "Pet Friendly", icon: PawPrint },
  { id: "kidFriendly", label: "Kid Friendly", icon: Baby },
  { id: "outdoor", label: "Outdoor Seating", icon: Umbrella },
  { id: "takeaway", label: "Takeaway", icon: Package },
];

export default function CreatePlace() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    // Basic Info
    name: "",
    category: "restaurant",
    shortDescription: "",
    fullDescription: "",
    
    // Location
    address: "",
    city: "",
    
    // Timing
    openTime: "",
    closeTime: "",
    
    // Entry
    entryFee: "",
    bestTime: "",
    
    // Contact
    phone: "",
    website: "",
    
    // Options
    isTrending: false,
    
    // Images
    images: [] as string[],
    
    // Lists
    selectedAmenities: [] as string[],
    tips: [] as string[],
    nearbyAttractions: [] as { name: string; distance: string }[],
  });
  
  const [newTip, setNewTip] = useState("");
  const [newAttractionName, setNewAttractionName] = useState("");
  const [newAttractionDistance, setNewAttractionDistance] = useState("");
  
  const queryClient = useQueryClient();
  const currentUserId = localStorage.getItem('nearly_user_id') || '';
  
  // Create place mutation
  const createPlaceMutation = useMutation({
    mutationFn: (placeData: any) => api.createPlace(placeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discover-places'] });
      toast({
        title: "Place Added!",
        description: "Your place has been added to the directory.",
      });
      setLocation("/discover");
    },
    onError: (error) => {
      console.error('Failed to create place:', error);
      toast({
        title: "Error",
        description: "Failed to add place. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ 
            ...prev, 
            images: [...prev.images, reader.result as string].slice(0, 5)
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const toggleAmenity = (amenityId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedAmenities: prev.selectedAmenities.includes(amenityId)
        ? prev.selectedAmenities.filter(a => a !== amenityId)
        : [...prev.selectedAmenities, amenityId]
    }));
  };

  const addTip = () => {
    if (newTip.trim()) {
      setFormData(prev => ({
        ...prev,
        tips: [...prev.tips, newTip.trim()]
      }));
      setNewTip("");
    }
  };

  const removeTip = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tips: prev.tips.filter((_, i) => i !== index)
    }));
  };

  const addNearbyAttraction = () => {
    if (newAttractionName.trim() && newAttractionDistance.trim()) {
      setFormData(prev => ({
        ...prev,
        nearbyAttractions: [...prev.nearbyAttractions, { 
          name: newAttractionName.trim(), 
          distance: newAttractionDistance.trim() 
        }]
      }));
      setNewAttractionName("");
      setNewAttractionDistance("");
    }
  };

  const removeNearbyAttraction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      nearbyAttractions: prev.nearbyAttractions.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.address || !formData.city || !formData.shortDescription) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Build opening hours string
    const openHours = formData.openTime && formData.closeTime 
      ? `${formData.openTime} - ${formData.closeTime}`
      : undefined;

    const placeData = {
      name: formData.name,
      category: formData.category,
      shortDescription: formData.shortDescription,
      description: formData.fullDescription || undefined,
      address: formData.address,
      city: formData.city,
      location: `${formData.city}`,
      openHours,
      entryFee: formData.entryFee || undefined,
      bestTime: formData.bestTime || undefined,
      isTrending: formData.isTrending,
      phone: formData.phone || undefined,
      website: formData.website || undefined,
      images: formData.images,
      imageUrl: formData.images[0] || undefined,
      amenities: formData.selectedAmenities,
      tips: formData.tips,
      nearbyAttractions: formData.nearbyAttractions,
      userId: currentUserId,
      createdAt: new Date().toISOString(),
    };

    createPlaceMutation.mutate(placeData);
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="max-w-md mx-auto flex items-center h-14 px-4">
          <button 
            onClick={() => setLocation("/discover")}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold ml-2">Add a Place</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Image Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Photos (up to 5)</label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            multiple
            className="hidden"
          />
          <div className="grid grid-cols-3 gap-2">
            {formData.images.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                <img src={img} alt={`Place ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {formData.images.length < 5 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="w-6 h-6" />
                <span className="text-xs">Add</span>
              </button>
            )}
          </div>
        </div>

        {/* Place Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Building className="w-4 h-4 text-primary" />
            Place Name *
          </label>
          <Input
            placeholder="e.g., India Gate"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {placeCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                    formData.category === cat.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Short Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Short Description *</label>
          <Input
            placeholder="Brief description of this place"
            value={formData.shortDescription}
            onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground text-right">{formData.shortDescription.length}/100</p>
        </div>

        {/* Full Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Full Description</label>
          <Textarea
            placeholder="Tell people about this place in detail..."
            value={formData.fullDescription}
            onChange={(e) => setFormData(prev => ({ ...prev, fullDescription: e.target.value }))}
            rows={5}
          />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Address *
          </label>
          <Textarea
            placeholder="Full street address"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            rows={2}
          />
        </div>

        {/* City */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" />
            City *
          </label>
          <Input
            placeholder="e.g., New Delhi"
            value={formData.city}
            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
          />
        </div>

        {/* Operating Hours */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Operating Hours
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Opens at</label>
              <Input
                type="time"
                value={formData.openTime}
                onChange={(e) => setFormData(prev => ({ ...prev, openTime: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Closes at</label>
              <Input
                type="time"
                value={formData.closeTime}
                onChange={(e) => setFormData(prev => ({ ...prev, closeTime: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Entry Fee */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Ticket className="w-4 h-4 text-primary" />
            Entry Fee
          </label>
          <Input
            placeholder="e.g., Free, ₹50, ₹100 for adults"
            value={formData.entryFee}
            onChange={(e) => setFormData(prev => ({ ...prev, entryFee: e.target.value }))}
          />
        </div>

        {/* Best Time to Visit */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Best Time to Visit
          </label>
          <Input
            placeholder="e.g., Evening (6 PM - 9 PM)"
            value={formData.bestTime}
            onChange={(e) => setFormData(prev => ({ ...prev, bestTime: e.target.value }))}
          />
        </div>

        {/* Mark as Trending */}
        <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium">Mark as Trending</p>
              <p className="text-xs text-muted-foreground">Highlight this place</p>
            </div>
          </div>
          <button
            onClick={() => setFormData(prev => ({ ...prev, isTrending: !prev.isTrending }))}
            className={`w-12 h-7 rounded-full transition-colors ${
              formData.isTrending ? "bg-primary" : "bg-muted"
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
              formData.isTrending ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        </div>

        {/* Amenities */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            Amenities
          </label>
          <div className="grid grid-cols-2 gap-2">
            {amenitiesList.map((amenity) => {
              const Icon = amenity.icon;
              const isSelected = formData.selectedAmenities.includes(amenity.id);
              return (
                <button
                  key={amenity.id}
                  onClick={() => toggleAmenity(amenity.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{amenity.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visitor Tips */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            Visitor Tips
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a tip for visitors"
              value={newTip}
              onChange={(e) => setNewTip(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTip())}
            />
            <Button onClick={addTip} size="icon" variant="secondary">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2 mt-2">
            {formData.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 bg-muted/50 p-2 rounded-lg">
                <span className="text-yellow-500">💡</span>
                <span className="text-sm flex-1">{tip}</span>
                <button onClick={() => removeTip(i)} className="p-1 hover:bg-background rounded">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Nearby Attractions */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Nearby Attractions
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="Attraction name"
              value={newAttractionName}
              onChange={(e) => setNewAttractionName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Distance"
              value={newAttractionDistance}
              onChange={(e) => setNewAttractionDistance(e.target.value)}
              className="w-24"
            />
            <Button onClick={addNearbyAttraction} size="icon" variant="secondary">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2 mt-2">
            {formData.nearbyAttractions.map((attraction, i) => (
              <div key={i} className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
                <span className="text-sm font-medium">{attraction.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{attraction.distance}</span>
                  <button onClick={() => removeNearbyAttraction(i)} className="p-1 hover:bg-background rounded">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              Phone
            </label>
            <Input
              placeholder="+91..."
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Website
            </label>
            <Input
              placeholder="www..."
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={createPlaceMutation.isPending}
          className="w-full h-12 bg-gradient-to-r from-primary to-red-500"
        >
          {createPlaceMutation.isPending ? "Adding..." : "Add Place"}
        </Button>
      </div>
    </div>
  );
}
