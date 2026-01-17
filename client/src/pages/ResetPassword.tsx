import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { buildGatewayUrl } from "@/lib/config";
import { ChevronLeft, Loader2, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  // Get email and OTP from URL params
  const params = new URLSearchParams(search);
  const email = params.get("email") || "";
  const otp = params.get("otp") || "";

  // Redirect if missing params
  useEffect(() => {
    if (!email || !otp) {
      setLocation("/forgot-password");
    }
  }, [email, otp, setLocation]);

  // Password strength check
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-500"];
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.password || !formData.confirmPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(buildGatewayUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          newPassword: formData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        toast({
          title: "Password Reset!",
          description: "Your password has been changed successfully",
        });
      } else {
        toast({
          title: "Reset Failed",
          description: data.error || "Failed to reset password",
          variant: "destructive",
        });
        // If OTP is invalid, redirect back
        if (data.error?.includes("OTP")) {
          setTimeout(() => setLocation("/forgot-password"), 2000);
        }
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

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className="w-20 h-20 rounded-2xl bg-green-500 flex items-center justify-center shadow-lg mb-6 animate-in zoom-in duration-300">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            Password Reset Successful!
          </h2>
          <p className="text-muted-foreground text-center max-w-xs mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            Your password has been changed. You can now sign in with your new password.
          </p>
          <Button 
            onClick={() => setLocation("/login")}
            className="w-full max-w-xs h-12 text-base font-semibold animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/verify-otp")}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-center font-semibold text-lg pr-9">Reset Password</h1>
      </div>

      <div className="flex-1 px-6 py-8 flex flex-col">
        {/* Icon */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-4">
            <Lock className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-center">Create New Password</h2>
          <p className="text-muted-foreground mt-2 text-center max-w-xs">
            Your new password must be different from previously used passwords.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 flex-1">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-11 pr-11 h-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            
            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Password strength: <span className="font-medium">{strengthLabels[passwordStrength - 1] || "Too weak"}</span>
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="pl-11 pr-11 h-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-xs text-red-500">Passwords don't match</p>
            )}
            {formData.confirmPassword && formData.password === formData.confirmPassword && (
              <p className="text-xs text-green-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Passwords match
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold"
            disabled={isLoading || formData.password !== formData.confirmPassword || formData.password.length < 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Resetting Password...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>

        {/* Requirements */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-2">Password requirements:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li className={formData.password.length >= 6 ? "text-green-500" : ""}>
              • Minimum 6 characters
            </li>
            <li className={/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password) ? "text-green-500" : ""}>
              • Mix of uppercase & lowercase letters
            </li>
            <li className={/\d/.test(formData.password) ? "text-green-500" : ""}>
              • At least one number
            </li>
            <li className={/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? "text-green-500" : ""}>
              • At least one special character
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
