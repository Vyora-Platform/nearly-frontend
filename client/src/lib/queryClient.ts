import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { buildGatewayUrl } from "./config";

// Endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/verify-otp",
  "/api/auth/reset-password",
  "/api/auth/check-username",
  "/api/auth/anonymous/session",
];

// Helper to check if endpoint is public (no auth required)
function isPublicEndpoint(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    return PUBLIC_ENDPOINTS.some(pub => path.startsWith(pub));
  } catch {
    // If URL parsing fails, check against the raw url
    return PUBLIC_ENDPOINTS.some(pub => url.includes(pub));
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper to get headers with auth tokens - exported for use in components
export function getAuthHeaders(additionalHeaders?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {};
  
  // Add JWT access token if available
  const accessToken = localStorage.getItem('nearly_access_token');
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Add user ID if available
  const userId = localStorage.getItem('nearly_user_id');
  if (userId) {
    headers['X-User-Id'] = userId;
  }
  
  // Add anonymous session ID if available
  const sessionId = localStorage.getItem('anonymous_session_id');
  if (sessionId) {
    headers['X-Anonymous-Session'] = sessionId;
  }
  
  if (additionalHeaders) {
    Object.assign(headers, additionalHeaders);
  }
  
  return headers;
}

// Helper to get headers based on whether endpoint is public
function getHeadersForEndpoint(url: string, additionalHeaders?: HeadersInit): HeadersInit {
  if (isPublicEndpoint(url)) {
    // Public endpoints only get additional headers (like Content-Type), no auth
    return additionalHeaders || {};
  }
  return getAuthHeaders(additionalHeaders);
}

/**
 * Authenticated fetch wrapper - automatically adds auth headers to all requests
 * except for public endpoints (login, signup, forgot password, etc.)
 * Use this instead of direct fetch() calls in components
 */
export async function authFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  // Build the full gateway URL if path is relative
  const fullUrl = url.startsWith('http') ? url : buildGatewayUrl(url);
  
  // Merge auth headers with any provided headers
  const headers: HeadersInit = {
    ...getHeadersForEndpoint(fullUrl, { 'Content-Type': 'application/json' }),
    ...(options?.headers || {}),
  };
  
  return fetch(fullUrl, {
    ...options,
    headers,
  });
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // If URL doesn't start with http, assume it's a relative API path and build gateway URL
  const fullUrl = url.startsWith('http') ? url : buildGatewayUrl(url);

  const headers = getHeadersForEndpoint(fullUrl, data ? { "Content-Type": "application/json" } : {});

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build the full gateway URL from the query key
    const path = queryKey.join("/");
    const fullUrl = path.startsWith('http') ? path : buildGatewayUrl(path);
    
    const headers = getHeadersForEndpoint(fullUrl);
    
    const res = await fetch(fullUrl, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
