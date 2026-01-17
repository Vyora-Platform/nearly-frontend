import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Tag,
  Bell,
  Percent,
  Store,
  Gift,
  Sparkles
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function CreateDeal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleNotifyMe = () => {
    toast({
      title: "You're on the list! 🎉",
      description: "We'll notify you when deal creation goes live.",
    });
    setLocation("/discover");
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
          <h1 className="text-lg font-semibold ml-2">Add Business Deal</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4">
        {/* Coming Soon Content */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {/* Animated Icon */}
          <div className="relative mb-8">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center animate-pulse">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <Tag className="w-12 h-12 text-white" />
              </div>
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center animate-bounce">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-3">Coming Soon!</h2>
          <p className="text-muted-foreground mb-8 max-w-xs leading-relaxed">
            Share amazing deals and discounts from your business with the local community. 
            This feature is launching soon!
          </p>

          {/* Features Preview */}
          <div className="w-full space-y-3 mb-8">
            <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <Percent className="w-6 h-6 text-green-500" />
              </div>
              <div className="text-left">
                <h4 className="font-medium">Create Custom Offers</h4>
                <p className="text-sm text-muted-foreground">Discounts, BOGO, cashback & more</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Store className="w-6 h-6 text-blue-500" />
              </div>
              <div className="text-left">
                <h4 className="font-medium">Reach Local Customers</h4>
                <p className="text-sm text-muted-foreground">Connect with your neighborhood</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                <Gift className="w-6 h-6 text-purple-500" />
              </div>
              <div className="text-left">
                <h4 className="font-medium">Track Redemptions</h4>
                <p className="text-sm text-muted-foreground">See how your deals perform</p>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
              🍔 Restaurants
            </Badge>
                  <Badge variant="secondary" className="bg-red-500/10 text-red-600">
              💈 Salons
            </Badge>
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
              🏪 Retail
            </Badge>
            <Badge variant="secondary" className="bg-green-500/10 text-green-600">
              💪 Fitness
            </Badge>
            <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">
              🎭 Entertainment
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            <Button
              onClick={handleNotifyMe}
              className="w-full h-12 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold"
            >
              <Bell className="w-5 h-5 mr-2" />
              Notify Me When Live
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/discover")}
              className="w-full h-12"
            >
              Back to Discover
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
