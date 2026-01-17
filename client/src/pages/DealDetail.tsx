import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Tag,
  Bell,
  Percent,
  Store,
  Gift,
  Sparkles,
  Heart,
  Coffee,
  ShoppingBag,
  Scissors
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function DealDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/deal/:id");
  const { toast } = useToast();

  const handleNotifyMe = () => {
    toast({
      title: "You're on the list! 🎉",
      description: "We'll notify you when deals go live from your favorite brands.",
    });
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
          <h1 className="text-lg font-semibold">Deal Details</h1>
          <div className="w-8" />
        </div>
      </header>

      <div className="max-w-md mx-auto">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-red-700 px-4 py-12">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          
          <div className="relative text-center">
            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
              <Tag className="w-12 h-12 text-white" />
            </div>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-white font-medium">Coming Soon</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Amazing Deals Await!</h1>
            <p className="text-white/80">Exclusive discounts from your favorite local brands</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* What to Expect */}
          <div className="bg-card rounded-xl p-5 border border-border">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              What to Expect
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <Percent className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-medium">Exclusive Discounts</h4>
                  <p className="text-sm text-muted-foreground">Up to 50% off at local favorites</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-medium">Local Businesses</h4>
                  <p className="text-sm text-muted-foreground">Support shops in your neighborhood</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-medium">Easy Redemption</h4>
                  <p className="text-sm text-muted-foreground">Show coupon code at checkout</p>
                </div>
              </div>
            </div>
          </div>

          {/* Categories Preview */}
          <div className="bg-card rounded-xl p-5 border border-border">
            <h3 className="font-semibold text-lg mb-4">Categories Coming Soon</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Coffee className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium">Food & Dining</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Heart className="w-5 h-5 text-pink-500" />
                <span className="text-sm font-medium">Beauty & Spa</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <ShoppingBag className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">Shopping</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Scissors className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium">Services</span>
              </div>
            </div>
          </div>

          {/* Sample Deals Preview (blurred/coming soon) */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Sample Deals</h3>
            {[
              { name: "Café Delight", discount: "30% OFF", category: "Coffee & Snacks" },
              { name: "Fitness Zone", discount: "First Month Free", category: "Gym & Fitness" },
              { name: "Style Studio", discount: "₹200 OFF", category: "Hair Salon" },
            ].map((deal, index) => (
              <div
                key={index}
                className="relative bg-card rounded-xl p-4 border border-border overflow-hidden"
              >
                <div className="absolute inset-0 backdrop-blur-sm bg-background/50 flex items-center justify-center z-10">
                  <Badge className="bg-primary text-white">Coming Soon</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{deal.name}</h4>
                    <p className="text-sm text-muted-foreground">{deal.category}</p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {deal.discount}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="max-w-md mx-auto">
          <Button
            onClick={handleNotifyMe}
            className="w-full h-12 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold"
          >
            <Bell className="w-5 h-5 mr-2" />
            Notify Me When Deals Go Live
          </Button>
        </div>
      </div>
    </div>
  );
}
