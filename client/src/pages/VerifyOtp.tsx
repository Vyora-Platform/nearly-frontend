import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { buildGatewayUrl } from "@/lib/config";
import { ChevronLeft, Loader2, ShieldCheck, RefreshCw } from "lucide-react";

export default function VerifyOtp() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get email from URL params
  const email = new URLSearchParams(search).get("email") || "";

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      setLocation("/forgot-password");
    }
  }, [email, setLocation]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take only last character
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      setOtp(pastedData.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join("");
    
    if (otpCode.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter all 6 digits",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(buildGatewayUrl("/api/auth/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpCode }),
      });

      const data = await response.json();

      if (data.success && data.verified) {
        toast({
          title: "OTP Verified!",
          description: "You can now reset your password",
        });
        // Navigate to reset password with email and OTP
        setLocation(`/reset-password?email=${encodeURIComponent(email)}&otp=${otpCode}`);
      } else {
        toast({
          title: "Verification Failed",
          description: data.error || "Invalid or expired OTP",
          variant: "destructive",
        });
        // Clear OTP inputs
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
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

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setIsResending(true);

    try {
      const response = await fetch(buildGatewayUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "OTP Resent!",
          description: "Check your email for the new code",
        });
        setResendTimer(60);
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to resend OTP",
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
      setIsResending(false);
    }
  };

  // Auto-submit when all digits are entered
  useEffect(() => {
    if (otp.every(digit => digit !== "") && !isLoading) {
      handleVerify();
    }
  }, [otp]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/forgot-password")}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-center font-semibold text-lg pr-9">Verify OTP</h1>
      </div>

      <div className="flex-1 px-6 py-8 flex flex-col">
        {/* Icon */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-4">
            <ShieldCheck className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-center">Enter Verification Code</h2>
          <p className="text-muted-foreground mt-2 text-center">
            We've sent a 6-digit code to
          </p>
          <p className="text-primary font-medium mt-1">{email}</p>
        </div>

        {/* OTP Input */}
        <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-2xl font-bold border-2 border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-background"
            />
          ))}
        </div>

        {/* Timer */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">
            Code expires in <span className="font-semibold text-foreground">10 minutes</span>
          </p>
        </div>

        {/* Verify Button */}
        <Button 
          onClick={handleVerify}
          className="w-full h-12 text-base font-semibold"
          disabled={isLoading || otp.some(digit => digit === "")}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify Code"
          )}
        </Button>

        {/* Resend */}
        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm mb-2">
            Didn't receive the code?
          </p>
          <Button
            variant="ghost"
            onClick={handleResendOtp}
            disabled={resendTimer > 0 || isResending}
            className="text-primary"
          >
            {isResending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resending...
              </>
            ) : resendTimer > 0 ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Resend in {resendTimer}s
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Resend Code
              </>
            )}
          </Button>
        </div>

        {/* Change Email */}
        <div className="mt-auto pt-6 text-center">
          <p className="text-muted-foreground">
            Wrong email?{" "}
            <button 
              type="button"
              className="text-primary font-semibold hover:underline"
              onClick={() => setLocation("/forgot-password")}
            >
              Change email
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
