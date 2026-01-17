import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { buildGatewayUrl } from "@/lib/config";
import { ChevronLeft, Loader2, Mail, KeyRound, MapPin } from "lucide-react";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(buildGatewayUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "OTP Sent!",
          description: "Check your email for the verification code",
        });
        // Navigate to OTP verification with email
        setLocation(`/verify-otp?email=${encodeURIComponent(email)}`);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send OTP",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/login")}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-center font-semibold text-lg pr-9">Forgot Password</h1>
      </div>

      <div className="flex-1 px-6 py-8 flex flex-col">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-4">
            <KeyRound className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-center">Reset Your Password</h2>
          <p className="text-muted-foreground mt-2 text-center max-w-xs">
            Enter your email and we'll send you a code to reset your password.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 flex-1">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-11 h-12"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sending Code...
              </>
            ) : (
              "Send Verification Code"
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            Remember your password?{" "}
            <button 
              type="button"
              className="text-primary font-semibold hover:underline"
              onClick={() => setLocation("/login")}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
