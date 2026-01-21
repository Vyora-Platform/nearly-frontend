
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { buildGatewayUrl } from "@/lib/config";
import { ChevronLeft, Eye, EyeOff, Loader2, Mail, Lock, MapPin } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [formData, setFormData] = useState({
    emailOrUsername: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.emailOrUsername || !formData.password) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1f1c3937-538a-43f4-8309-11a2672fc7a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Login.tsx:handleSubmit:start',message:'Login submit started',data:{emailOrUsername:formData.emailOrUsername},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      // Call auth service for login
      const response = await fetch(buildGatewayUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: formData.emailOrUsername,
          password: formData.password,
          deviceInfo: navigator.userAgent,
        }),
      });

      const data = await response.json();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1f1c3937-538a-43f4-8309-11a2672fc7a3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Login.tsx:handleSubmit:response',message:'Login response',data:{status:response.status,ok:response.ok,success:data.success,hasUser:!!data.user,error:data.error},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Login failed");
      }

      // Store JWT tokens
      if (data.accessToken) {
        localStorage.setItem("nearly_access_token", data.accessToken);
      }
      if (data.refreshToken) {
        localStorage.setItem("nearly_refresh_token", data.refreshToken);
      }

      // Store user info
      localStorage.setItem("nearly_user_id", data.user.id);
      localStorage.setItem("nearly_username", data.user.username);
      localStorage.setItem("nearly_onboarding_complete", "true");

      toast({
        title: "Welcome back!",
        description: `Logged in as @${data.user.username}`,
      });

      setLocation("/");
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
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
        <Button variant="ghost" size="icon" onClick={() => setLocation("/welcome")}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-center font-semibold text-lg pr-9">Sign In</h1>
      </div>

      <div className="flex-1 px-6 py-8 flex flex-col">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-4">
            <MapPin className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold">Welcome back</h2>
          <p className="text-muted-foreground mt-1">Sign in to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 flex-1">
          <div className="space-y-2">
            <Label htmlFor="emailOrUsername">Username or Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="emailOrUsername"
                type="text"
                placeholder="Enter your username or email"
                value={formData.emailOrUsername}
                onChange={(e) => setFormData({ ...formData, emailOrUsername: e.target.value })}
                className="pl-11 h-12"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
          </div>
        <div className="relative">
  {/* Left Lock Icon */}
  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
    <Lock className="w-5 h-5" />
  </span>

  {/* Password Input */}
  <Input
    id="password"
    type={showPassword ? "text" : "password"}
    placeholder="Enter your password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="pl-11 pr-12 h-12"
  />

  {/* Right Eye Icon */}
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center h-6 w-6 text-muted-foreground hover:text-foreground transition"
  >
    {showPassword ? (
      <EyeOff className="w-5 h-5" />
    ) : (
      <Eye className="w-5 h-5" />
    )}
  </button>
</div>


          <div className="flex justify-end">
            <Button 
              variant="ghost" 
              className="text-primary p-0 h-auto text-sm"
              onClick={() => setLocation("/forgot-password")}
            >
              Forgot password?
            </Button>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            Don't have an account?{" "}
            <button 
              type="button"
              className="text-primary font-semibold hover:underline"
              onClick={() => setLocation("/signup")}
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

