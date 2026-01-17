import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useLocation } from "wouter";
import { buildGatewayUrl } from "@/lib/config";

interface User {
  id: string;
  username: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  isVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  login: (user: User, accessToken?: string, refreshToken?: string) => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshAccessToken: () => Promise<string | null>;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Check if token is expired (simple check - JWT has 3 parts)
  const isTokenExpired = useCallback((token: string): boolean => {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return true;
      
      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= exp - 60000; // Consider expired 1 minute before actual expiry
    } catch {
      return true;
    }
  }, []);

  // Refresh access token
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem("nearly_refresh_token");
    if (!refreshToken) return null;

    try {
      const response = await fetch(buildGatewayUrl("/api/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (data.success && data.accessToken) {
        setAccessToken(data.accessToken);
        localStorage.setItem("nearly_access_token", data.accessToken);
        return data.accessToken;
      }

      // Refresh failed - logout
      await logout();
      return null;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return null;
    }
  }, []);

  // Get auth headers with token refresh
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = accessToken || localStorage.getItem("nearly_access_token");
    const userId = localStorage.getItem("nearly_user_id");
    
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (userId) {
      headers["X-User-Id"] = userId;
    }
    
    return headers;
  }, [accessToken]);

  // Load auth state on mount
  useEffect(() => {
    const loadAuthState = async () => {
      const storedToken = localStorage.getItem("nearly_access_token");
      const userId = localStorage.getItem("nearly_user_id");
      const username = localStorage.getItem("nearly_username");
      const onboardingComplete = localStorage.getItem("nearly_onboarding_complete");

      if (storedToken && userId && username && onboardingComplete) {
        // Check if token is expired
        if (isTokenExpired(storedToken)) {
          // Try to refresh
          const newToken = await refreshAccessToken();
          if (!newToken) {
            setIsLoading(false);
            return;
          }
        } else {
          setAccessToken(storedToken);
        }

        setUser({
          id: userId,
          username: username,
        });
      }
      
      setIsLoading(false);
    };

    loadAuthState();
  }, [isTokenExpired, refreshAccessToken]);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!accessToken) return;

    const checkAndRefresh = async () => {
      if (isTokenExpired(accessToken)) {
        await refreshAccessToken();
      }
    };

    // Check every minute
    const interval = setInterval(checkAndRefresh, 60000);
    return () => clearInterval(interval);
  }, [accessToken, isTokenExpired, refreshAccessToken]);

  const login = (userData: User, newAccessToken?: string, newRefreshToken?: string) => {
    setUser(userData);
    
    if (newAccessToken) {
      setAccessToken(newAccessToken);
      localStorage.setItem("nearly_access_token", newAccessToken);
    }
    if (newRefreshToken) {
      localStorage.setItem("nearly_refresh_token", newRefreshToken);
    }
    
    localStorage.setItem("nearly_user_id", userData.id);
    localStorage.setItem("nearly_username", userData.username);
    localStorage.setItem("nearly_onboarding_complete", "true");
  };

  const logout = async () => {
    // Call logout API to invalidate refresh token
    const refreshToken = localStorage.getItem("nearly_refresh_token");
    if (refreshToken) {
      try {
        await fetch(buildGatewayUrl("/api/auth/logout"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.error("Logout API call failed:", error);
      }
    }

    // Clear local state
    setUser(null);
    setAccessToken(null);
    
    // Clear all auth data from localStorage
    localStorage.removeItem("nearly_user_id");
    localStorage.removeItem("nearly_username");
    localStorage.removeItem("nearly_onboarding_complete");
    localStorage.removeItem("nearly_access_token");
    localStorage.removeItem("nearly_refresh_token");
    
    setLocation("/welcome");
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      if (updates.username) {
        localStorage.setItem("nearly_username", updates.username);
      }
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        isLoading,
        accessToken,
        login, 
        logout,
        updateUser,
        refreshAccessToken,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
