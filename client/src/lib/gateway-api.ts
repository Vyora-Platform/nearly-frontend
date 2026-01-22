/**
 * Gateway API Service
 * Connects to Spring Boot Microservices via API Gateway
 * Direct connection to localhost:9002 - no Express proxy needed
 *
 * Architecture:
 * - auth-service: Handles authentication (login, signup, password reset, tokens)
 * - user-service: Handles user data (profiles, follows, settings)
 * - Auth-service calls user-service internally for user operations
 * - All endpoints are accessed via API Gateway which handles routing
 */

import { buildGatewayUrl, buildGatewayWsUrl } from "./config";

// Network logging utilities
const NETWORK_LOGGING_ENABLED = true; // Set to false to disable network logging

const logNetwork = (type: 'request' | 'response' | 'error', data: any) => {
  if (!NETWORK_LOGGING_ENABLED) return;

  const timestamp = new Date().toISOString();
  const prefix = type === 'request' ? '🚀' : type === 'response' ? '📥' : '💥';

  console.log(`${prefix} Network ${type.toUpperCase()}:`, { ...data, timestamp });
};

// Check network connectivity
const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch(buildGatewayUrl('/actuator/health'), {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Network status tracking
let networkStatusCallbacks: ((online: boolean) => void)[] = [];
let lastNetworkStatus: boolean | null = null;

// Subscribe to network status changes
export const onNetworkStatusChange = (callback: (online: boolean) => void) => {
  networkStatusCallbacks.push(callback);
  return () => {
    networkStatusCallbacks = networkStatusCallbacks.filter(cb => cb !== callback);
  };
};

// Get current network status
export const getNetworkStatus = (): boolean | null => lastNetworkStatus;

// Log network status periodically and notify subscribers
if (NETWORK_LOGGING_ENABLED) {
  const updateNetworkStatus = async () => {
    const online = await checkNetworkStatus();
    if (lastNetworkStatus !== online) {
      lastNetworkStatus = online;
      console.log(`🌐 Network Status: ${online ? 'ONLINE' : 'OFFLINE'} - Gateway: ${buildGatewayUrl('/actuator/health')}`);

      // Notify all subscribers
      networkStatusCallbacks.forEach(callback => {
        try {
          callback(online);
        } catch (error) {
          console.error('Error in network status callback:', error);
        }
      });
    }
  };

  // Check immediately
  updateNetworkStatus();

  // Log network status every 30 seconds
  setInterval(updateNetworkStatus, 30000);
}

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
const isPublicEndpoint = (endpoint: string): boolean => {
  return PUBLIC_ENDPOINTS.some(pub => endpoint.startsWith(pub));
};

// Helper to get auth headers including JWT token
const getAuthHeaders = (): Record<string, string> => {
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

  return headers;
};

// Generic API request helper with automatic auth header injection
async function gatewayRequest<T>(
  method: string,
  endpoint: string,
  body?: any
): Promise<T> {
  const url = buildGatewayUrl(endpoint);
  const startTime = Date.now();

  // Build headers - add auth headers for non-public endpoints
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add auth headers if not a public endpoint
  if (!isPublicEndpoint(endpoint)) {
    Object.assign(headers, getAuthHeaders());
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  // Log outgoing request
  logNetwork('request', {
    method,
    url,
    endpoint,
    headers: { ...headers, Authorization: headers.Authorization ? '[HIDDEN]' : undefined },
    body: body ? JSON.stringify(body) : undefined
  });

  try {
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;

    // Clone response for logging
    const responseClone = response.clone();
    let responseBody;
    try {
      responseBody = await responseClone.json();
    } catch {
      responseBody = await responseClone.text();
    }

    // Log response
    logNetwork('response', {
      method,
      url,
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      logNetwork('error', {
        method,
        url,
        status: response.status,
        error: error.message || `HTTP ${response.status}`,
        duration: `${duration}ms`
      });
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return responseBody;
  } catch (error) {
    const duration = Date.now() - startTime;
    logNetwork('error', {
      method,
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`
    });
    throw error;
  }
}

// =====================
// USER SERVICE
// =====================
// Handles all user-related operations (profiles, follows, settings)
// Auth operations (login, signup) are handled by auth-service
export const userApi = {
  // Get all users
  getUsers: () => gatewayRequest<any[]>("GET", "/api/users"),
  
  // Get current authenticated user's profile
  getCurrentUser: () => gatewayRequest<any>("GET", "/api/users/current"),
  
  // Get user by ID
  getUser: (id: string) => gatewayRequest<any>("GET", `/api/users/${id}`),
  
  // Get user by username
  getUserByUsername: (username: string) => 
    gatewayRequest<any>("GET", `/api/users/username/${username}`),
  
  // Create user (typically called by auth-service internally)
  createUser: (data: any) => gatewayRequest<any>("POST", "/api/users", data),
  
  // Update user profile
  updateUser: (id: string, data: any) => 
    gatewayRequest<any>("PATCH", `/api/users/${id}`, data),
  
  // Delete user
  deleteUser: (id: string) => 
    gatewayRequest<{ success: boolean }>("DELETE", `/api/users/${id}`),
  
  // Search users
  searchUsers: (query: string) => 
    gatewayRequest<any[]>("GET", `/api/users/search?q=${encodeURIComponent(query)}`),
  
  // Follow a user
  followUser: (followerId: string, followingId: string) =>
    gatewayRequest<{ success: boolean }>("POST", `/api/users/${followerId}/follow/${followingId}`),
  
  // Unfollow a user
  unfollowUser: (followerId: string, followingId: string) =>
    gatewayRequest<{ success: boolean }>("DELETE", `/api/users/${followerId}/unfollow/${followingId}`),
  
  // Get user's followers
  getFollowers: (userId: string) => 
    gatewayRequest<any[]>("GET", `/api/users/${userId}/followers`),
  
  // Get users that a user is following
  getFollowing: (userId: string) => 
    gatewayRequest<any[]>("GET", `/api/users/${userId}/following`),
  
  // Check if one user is following another
  isFollowing: (followerId: string, followingId: string) =>
    gatewayRequest<{ isFollowing: boolean }>("GET", `/api/users/${followerId}/following/${followingId}`),
  
  // Change password (user-service handles password updates)
  changePassword: (userId: string, currentPassword: string, newPassword: string) =>
    gatewayRequest<{ success: boolean; message?: string }>("POST", `/api/users/${userId}/password`, {
      currentPassword,
      newPassword,
    }),
};

// =====================
// ACTIVITY SERVICE
// =====================
export const activityApi = {
  getActivities: (limit?: number) => 
    gatewayRequest<any[]>("GET", limit ? `/api/activities?limit=${limit}` : "/api/activities"),
  
  getActivity: (id: string) => gatewayRequest<any>("GET", `/api/activities/${id}`),
  
  createActivity: (data: any) => gatewayRequest<any>("POST", "/api/activities", data),
  
  updateActivity: (id: string, data: any) => 
    gatewayRequest<any>("PATCH", `/api/activities/${id}`, data),
  
  deleteActivity: (id: string) => 
    gatewayRequest<{ success: boolean }>("DELETE", `/api/activities/${id}`),
  
  likeActivity: (id: string, increment: boolean) =>
    gatewayRequest<any>("POST", `/api/activities/${id}/like`, { increment }),
  
  joinActivity: (id: string, userId: string) =>
    gatewayRequest<any>("POST", `/api/activities/${id}/join`, { userId }),
  
  getUserActivities: (userId: string) =>
    gatewayRequest<any[]>("GET", `/api/activities/user/${userId}`),
};

// =====================
// EVENT SERVICE
// =====================
export const eventApi = {
  getEvents: (limit?: number) => 
    gatewayRequest<any[]>("GET", limit ? `/api/events?limit=${limit}` : "/api/events"),
  
  getEvent: (id: string) => gatewayRequest<any>("GET", `/api/events/${id}`),
  
  createEvent: (data: any) => gatewayRequest<any>("POST", "/api/events", data),
  
  updateEvent: (id: string, data: any) => 
    gatewayRequest<any>("PATCH", `/api/events/${id}`, data),
  
  deleteEvent: (id: string) => 
    gatewayRequest<{ success: boolean }>("DELETE", `/api/events/${id}`),
  
  getGuests: (eventId: string) => 
    gatewayRequest<any[]>("GET", `/api/events/${eventId}/guests`),
  
  joinEvent: (eventId: string, userId: string, status = "attending") =>
    gatewayRequest<any>("POST", `/api/events/${eventId}/join`, { userId, status }),
  
  getComments: (eventId: string) =>
    gatewayRequest<any[]>("GET", `/api/events/${eventId}/comments`),
  
  addComment: (eventId: string, userId: string, content: string) =>
    gatewayRequest<any>("POST", `/api/events/${eventId}/comments`, { userId, content }),
};

// =====================
// GROUP SERVICE
// =====================
export const groupApi = {
  getGroups: (limit?: number) => 
    gatewayRequest<any[]>("GET", limit ? `/api/groups?limit=${limit}` : "/api/groups"),
  
  getGroup: (id: string) => gatewayRequest<any>("GET", `/api/groups/${id}`),
  
  createGroup: (data: any) => gatewayRequest<any>("POST", "/api/groups", data),
  
  updateGroup: (id: string, data: any) => 
    gatewayRequest<any>("PATCH", `/api/groups/${id}`, data),
  
  deleteGroup: (id: string) => 
    gatewayRequest<{ success: boolean }>("DELETE", `/api/groups/${id}`),
  
  getMembers: (groupId: string) => 
    gatewayRequest<any[]>("GET", `/api/groups/${groupId}/members`),
  
  joinGroup: (groupId: string, userId: string) =>
    gatewayRequest<any>("POST", `/api/groups/${groupId}/join`, { userId }),
  
  leaveGroup: (groupId: string, userId: string) =>
    gatewayRequest<void>("DELETE", `/api/groups/${groupId}/leave/${userId}`),
  
  getUserGroups: (userId: string) =>
    gatewayRequest<any[]>("GET", `/api/groups/user/${userId}`),
};

// =====================
// NEWS SERVICE
// =====================
export const newsApi = {
  getNews: (limit?: number) => 
    gatewayRequest<any[]>("GET", limit ? `/api/news?limit=${limit}` : "/api/news"),
  
  getNewsItem: (id: string) => gatewayRequest<any>("GET", `/api/news/${id}`),
  
  createNews: (data: any) => gatewayRequest<any>("POST", "/api/news", data),
  
  updateNews: (id: string, data: any) => 
    gatewayRequest<any>("PATCH", `/api/news/${id}`, data),
  
  deleteNews: (id: string) => 
    gatewayRequest<{ success: boolean }>("DELETE", `/api/news/${id}`),
  
  voteNews: (id: string, voteType: "true" | "fake", increment: boolean) =>
    gatewayRequest<any>("POST", `/api/news/${id}/vote`, { voteType, increment }),
  
  likeNews: (id: string, increment: boolean) =>
    gatewayRequest<any>("POST", `/api/news/${id}/like`, { increment }),
  
  viewNews: (id: string) =>
    gatewayRequest<any>("POST", `/api/news/${id}/view`),
  
  getComments: (newsId: string) =>
    gatewayRequest<any[]>("GET", `/api/news/${newsId}/comments`),
  
  addComment: (newsId: string, content: string) =>
    gatewayRequest<any>("POST", `/api/news/${newsId}/comments`, { content }),
};

// =====================
// MESSAGING SERVICE
// =====================
export const messagingApi = {
  sendMessage: (data: any) => gatewayRequest<any>("POST", "/api/messages", data),
  
  getGroupMessages: (groupId: string) =>
    gatewayRequest<any[]>("GET", `/api/messages/group/${groupId}`),
  
  getDirectMessages: (userId: string, withUserId: string) =>
    gatewayRequest<any[]>("GET", `/api/messages/direct/${userId}?withUserId=${withUserId}`),
  
  getConversations: (userId: string) =>
    gatewayRequest<any[]>("GET", `/api/messages/conversations/${userId}`),
  
  markAsRead: (recipientId: string) =>
    gatewayRequest<void>("POST", `/api/messages/read/${recipientId}`),
};

// =====================
// MOMENTS SERVICE
// =====================
export const momentsApi = {
  getMoments: (visibility?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (visibility) params.append("visibility", visibility);
    if (limit) params.append("limit", limit.toString());
    return gatewayRequest<any[]>("GET", `/api/moments?${params.toString()}`);
  },
  
  getMoment: (id: string) => gatewayRequest<any>("GET", `/api/moments/${id}`),
  
  createMoment: (data: any) => gatewayRequest<any>("POST", "/api/moments", data),
  
  deleteMoment: (id: string) => 
    gatewayRequest<{ success: boolean }>("DELETE", `/api/moments/${id}`),
  
  likeMoment: (id: string) => gatewayRequest<any>("POST", `/api/moments/${id}/like`),
  
  viewMoment: (id: string) => gatewayRequest<any>("POST", `/api/moments/${id}/view`),
  
  sendDirectMoment: (momentId: string, senderId: string, recipientId: string) =>
    gatewayRequest<any>("POST", `/api/moments/${momentId}/send`, { senderId, recipientId }),
  
  getDirectMoments: (userId: string) =>
    gatewayRequest<any[]>("GET", `/api/moments/direct/${userId}`),
  
  markDirectMomentViewed: (id: string) =>
    gatewayRequest<void>("POST", `/api/moments/direct/${id}/view`),
  
  getStreaks: (userId: string) =>
    gatewayRequest<any[]>("GET", `/api/moments/streaks/${userId}`),
  
  getComments: (momentId: string) =>
    gatewayRequest<any[]>("GET", `/api/moments/${momentId}/comments`),
  
  addComment: (momentId: string, content: string, parentCommentId?: string) =>
    gatewayRequest<any>("POST", `/api/moments/${momentId}/comments`, { content, parentCommentId }),
};

// =====================
// SHOTS SERVICE (Short Videos)
// =====================
export const shotsApi = {
  // Upload video for shot - uses media service with SHOT context
  uploadVideo: async (file: File): Promise<{ success: boolean; url: string; id?: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("context", "SHOT"); // Use uppercase SHOT - valid MediaContext enum value
    formData.append("isPublic", "true");

    // Get auth headers without Content-Type (browser will set it for FormData)
    const headers: Record<string, string> = {};
    const accessToken = localStorage.getItem('nearly_access_token');
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    const userId = localStorage.getItem('nearly_user_id');
    if (userId) {
      headers['X-User-Id'] = userId;
    }

    try {
      // Use media upload endpoint with SHOT context
      const response = await fetch(buildGatewayUrl("/api/media/video/async"), {
        method: "POST",
        headers,
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        // Handle different response structures from media service
        const url = result.url || result.data?.url || result.fileUrl || result.data?.fileUrl || '';
        const id = result.id || result.data?.id || result.fileId || result.data?.fileId || '';
        
        if (url) {
          return { success: true, url, id };
        }
      }

      return { success: false, url: '' };
    } catch (error) {
      console.error('Shot upload error:', error);
      return { success: false, url: '' };
    }
  },

  // Get all shots with optional filters
  getShots: (limit?: number, userId?: string) => {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (userId) params.append("userId", userId);
    return gatewayRequest<any[]>("GET", `/api/shots?${params.toString()}`);
  },
  
  // Get single shot
  getShot: (id: string) => gatewayRequest<any>("GET", `/api/shots/${id}`),
  
  // Create a new shot (video upload should be done first via mediaApi)
  // Supports both mediaId (preferred) and videoUrl (legacy)
  createShot: (data: {
    mediaId?: string;      // Media service file ID (preferred)
    videoUrl?: string;     // Direct URL (legacy/fallback)
    thumbnailUrl?: string;
    caption?: string;
    musicId?: string;
    musicTitle?: string;
    duration?: number;
    visibility?: string;
  }) => gatewayRequest<any>("POST", "/api/shots", data),
  
  // Delete shot
  deleteShot: (id: string) => 
    gatewayRequest<{ success: boolean }>("DELETE", `/api/shots/${id}`),
  
  // Track view
  viewShot: (id: string) => 
    gatewayRequest<{ success: boolean; viewsCount: number }>("POST", `/api/shots/${id}/view`),
  
  // Like shot
  likeShot: (id: string) => 
    gatewayRequest<{ success: boolean; liked: boolean; likesCount: number }>("POST", `/api/shots/${id}/like`),
  
  // Unlike shot
  unlikeShot: (id: string) => 
    gatewayRequest<{ success: boolean; liked: boolean; likesCount: number }>("DELETE", `/api/shots/${id}/like`),
  
  // Check if liked
  checkLiked: (id: string) => 
    gatewayRequest<{ liked: boolean }>("GET", `/api/shots/${id}/liked`),
  
  // Get comments (with nested replies)
  getComments: (shotId: string) => 
    gatewayRequest<any[]>("GET", `/api/shots/${shotId}/comments`),
  
  // Add comment (supports replies with parentCommentId)
  addComment: (shotId: string, content: string, parentCommentId?: string) =>
    gatewayRequest<any>("POST", `/api/shots/${shotId}/comments`, { content, parentCommentId }),
  
  // Delete comment
  deleteComment: (shotId: string, commentId: string) =>
    gatewayRequest<{ success: boolean }>("DELETE", `/api/shots/${shotId}/comments/${commentId}`),
  
  // Like comment
  likeComment: (shotId: string, commentId: string) =>
    gatewayRequest<{ success: boolean; likesCount: number }>("POST", `/api/shots/${shotId}/comments/${commentId}/like`),
  
  // Unlike comment
  unlikeComment: (shotId: string, commentId: string) =>
    gatewayRequest<{ success: boolean; likesCount: number }>("DELETE", `/api/shots/${shotId}/comments/${commentId}/like`),
  
  // Share shot (increments share count)
  shareShot: (id: string) => 
    gatewayRequest<{ success: boolean; sharesCount: number }>("POST", `/api/shots/${id}/share`),
  
  // Get user's shots
  getUserShots: (userId: string, limit?: number) => {
    const params = new URLSearchParams();
    params.append("userId", userId);
    if (limit) params.append("limit", limit.toString());
    return gatewayRequest<any[]>("GET", `/api/shots?${params.toString()}`);
  },
  
  // Get trending shots
  getTrendingShots: (limit?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    params.append("sort", "trending");
    return gatewayRequest<any[]>("GET", `/api/shots?${params.toString()}`);
  },
  
  // Get following shots (shots from users you follow)
  getFollowingShots: (limit?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    params.append("feed", "following");
    return gatewayRequest<any[]>("GET", `/api/shots?${params.toString()}`);
  },
  
  // Save/bookmark shot
  saveShot: (id: string) =>
    gatewayRequest<{ success: boolean; saved: boolean }>("POST", `/api/shots/${id}/save`),
  
  // Unsave/remove bookmark
  unsaveShot: (id: string) =>
    gatewayRequest<{ success: boolean; saved: boolean }>("DELETE", `/api/shots/${id}/save`),
  
  // Get saved shots
  getSavedShots: (limit?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    return gatewayRequest<any[]>("GET", `/api/shots/saved?${params.toString()}`);
  },
};

// =====================
// MARKETPLACE SERVICE
// =====================
export const jobsApi = {
  getJobs: (category?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (limit) params.append("limit", limit.toString());
    return gatewayRequest<any[]>("GET", `/api/jobs?${params.toString()}`);
  },
  
  getJob: (id: string) => gatewayRequest<any>("GET", `/api/jobs/${id}`),
  
  createJob: (data: any) => gatewayRequest<any>("POST", "/api/jobs", data),
  
  updateJob: (id: string, data: any) => 
    gatewayRequest<any>("PATCH", `/api/jobs/${id}`, data),
  
  deleteJob: (id: string) => 
    gatewayRequest<{ success: boolean }>("DELETE", `/api/jobs/${id}`),
  
  searchJobs: (query: string) =>
    gatewayRequest<any[]>("GET", `/api/jobs/search?q=${encodeURIComponent(query)}`),
};

export const dealsApi = {
  getDeals: (category?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (limit) params.append("limit", limit.toString());
    return gatewayRequest<any[]>("GET", `/api/deals?${params.toString()}`);
  },
  
  getDeal: (id: string) => gatewayRequest<any>("GET", `/api/deals/${id}`),
  
  createDeal: (data: any) => gatewayRequest<any>("POST", "/api/deals", data),
  
  updateDeal: (id: string, data: any) => 
    gatewayRequest<any>("PATCH", `/api/deals/${id}`, data),
  
  deleteDeal: (id: string) => 
    gatewayRequest<{ success: boolean }>("DELETE", `/api/deals/${id}`),
  
  claimDeal: (id: string) => gatewayRequest<any>("POST", `/api/deals/${id}/claim`),
};

export const placesApi = {
  getPlaces: (category?: string, city?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (city) params.append("city", city);
    if (limit) params.append("limit", limit.toString());
    return gatewayRequest<any[]>("GET", `/api/places?${params.toString()}`);
  },
  
  getPlace: (id: string) => gatewayRequest<any>("GET", `/api/places/${id}`),
  
  createPlace: (data: any) => gatewayRequest<any>("POST", "/api/places", data),
  
  updatePlace: (id: string, data: any) => 
    gatewayRequest<any>("PATCH", `/api/places/${id}`, data),
  
  deletePlace: (id: string) => 
    gatewayRequest<{ success: boolean }>("DELETE", `/api/places/${id}`),
};

export const pagesApi = {
  getPages: (category?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (limit) params.append("limit", limit.toString());
    return gatewayRequest<any[]>("GET", `/api/pages?${params.toString()}`);
  },
  
  getPage: (id: string) => gatewayRequest<any>("GET", `/api/pages/${id}`),
  
  getPageByUsername: (username: string) =>
    gatewayRequest<any>("GET", `/api/pages/username/${username}`),
  
  createPage: (data: any) => gatewayRequest<any>("POST", "/api/pages", data),
  
  updatePage: (id: string, data: any) => 
    gatewayRequest<any>("PATCH", `/api/pages/${id}`, data),
  
  deletePage: (id: string) => 
    gatewayRequest<{ success: boolean }>("DELETE", `/api/pages/${id}`),
  
  followPage: (id: string) => gatewayRequest<any>("POST", `/api/pages/${id}/follow`),
};

// =====================
// NOTIFICATION SERVICE
// =====================
export const notificationApi = {
  getNotifications: (userId: string, type?: string) => {
    const url = type
      ? `/api/notifications/${userId}?type=${type}`
      : `/api/notifications/${userId}`;
    return gatewayRequest<any[]>("GET", url);
  },
  
  getUnreadNotifications: (userId: string) =>
    gatewayRequest<any[]>("GET", `/api/notifications/${userId}/unread`),
  
  getUnreadCount: (userId: string) =>
    gatewayRequest<{ count: number }>("GET", `/api/notifications/${userId}/unread/count`),
  
  createNotification: (data: any) =>
    gatewayRequest<any>("POST", "/api/notifications", data),
  
  markAsRead: (id: string) =>
    gatewayRequest<any>("PATCH", `/api/notifications/${id}/read`),
  
  markAllAsRead: (userId: string) =>
    gatewayRequest<void>("POST", `/api/notifications/${userId}/read-all`),
  
  deleteNotification: (id: string) =>
    gatewayRequest<void>("DELETE", `/api/notifications/${id}`),
};

// =====================
// SEARCH SERVICE
// =====================
export const searchApi = {
  search: (query: string, type?: string, category?: string, location?: string, limit?: number) => {
    const params = new URLSearchParams();
    params.append("q", query);
    if (type) params.append("type", type);
    if (category) params.append("category", category);
    if (location) params.append("location", location);
    if (limit) params.append("limit", limit.toString());
    return gatewayRequest<any[]>("GET", `/api/search?${params.toString()}`);
  },
  
  getByType: (type: string, page = 0, size = 20) =>
    gatewayRequest<any[]>("GET", `/api/search/type/${type}?page=${page}&size=${size}`),
  
  getTrendingSearches: (limit = 10) =>
    gatewayRequest<string[]>("GET", `/api/search/trending?limit=${limit}`),
};

// =====================
// MEDIA SERVICE
// =====================
export const mediaApi = {
  // userId is now extracted from JWT token via X-User-Id header on server
  uploadFile: async (file: File, context: string, contextId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("context", context);
    if (contextId) formData.append("contextId", contextId);
    formData.append("isPublic", "true");

    // Build headers with auth (X-User-Id header is set automatically from JWT)
    const headers: Record<string, string> = getAuthHeaders();

    const response = await fetch(buildGatewayUrl("/api/media/crt/upload"), {
      method: "POST",
      headers,
      body: formData,
    });
    if (!response.ok) throw new Error("Upload failed");
    return response.json();
  },
  
  // userId is now extracted from JWT token via X-User-Id header on server
  uploadMultiple: async (files: File[], context: string, contextId?: string) => {
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    formData.append("context", context);
    if (contextId) formData.append("contextId", contextId);
    formData.append("isPublic", "true");

    // Build headers with auth (X-User-Id header is set automatically from JWT)
    const headers: Record<string, string> = getAuthHeaders();

    const response = await fetch(buildGatewayUrl("/api/media/crt/upload/multiple"), {
      method: "POST",
      headers,
      body: formData,
    });
    console.log(headers);

    if (!response.ok) throw new Error("Upload failed");
    return response.json();
  },
  
  // userId is now extracted from JWT token via X-User-Id header on server
  getPresignedUrl: (fileName: string, contentType: string, context: string, contextId?: string) =>
    gatewayRequest<any>("POST", "/api/media/presigned-url", {
      fileName,
      contentType,
      context,
      contextId,
      isPublic: true,
    }),
  
  confirmUpload: (fileId: string, fileSize: number) =>
    gatewayRequest<void>("POST", `/api/media/${fileId}/confirm`, { fileSize }),
  
  getMediaFile: (id: string) => gatewayRequest<any>("GET", `/api/media/${id}`),
  
  getMediaByContext: (context: string, contextId: string) =>
    gatewayRequest<any[]>("GET", `/api/media/context/${context}/${contextId}`),
  
  getMediaByUser: (userId: string) =>
    gatewayRequest<any[]>("GET", `/api/media/user/${userId}`),
  
  deleteMedia: (id: string) => gatewayRequest<void>("DELETE", `/api/media/${id}`),
};

// =====================
// STREAMING SERVICE (HLS Video)
// YouTube/Instagram-style adaptive streaming with MP4 fallbacks
// =====================
export interface VideoInfo {
  id: string;
  url: string;

  // HLS streaming (primary playback method) - PROXY URLs through StreamController
  hlsUrl?: string; // /api/media/hls/{mediaId}/playlist.m3u8
  hlsVariants?: string[]; // Available quality levels: ["1080p", "720p", "480p", "360p"]

  // MP4 fallbacks for Safari and legacy browsers - PROXY URLs through StreamController
  mp4Urls?: Record<string, string>; // { "1080p": "/api/media/mp4/{mediaId}/1080p", ... }
  mp4Url?: string; // Best quality MP4 proxy URL (convenient single fallback)

  // Thumbnail
  thumbnailUrl?: string; // Direct S3 URL (thumbnails are small and CORS-friendly)

  // Direct streaming URL (for byte-range requests)
  streamUrl: string;
  
  // Video metadata
  width: number;
  height: number;
  duration: number;
  
  // Transcoding status
  transcoded: boolean;
  transcodeStatus?: 'UPLOADED' | 'TRANSCODING' | 'READY' | 'FAILED';
  
  // Source info
  sourceFormat?: string;
  sourceCodec?: string;
}

export interface TranscodeProgress {
  jobId: string;
  mediaId: string;
  fileName: string;
  status: 'PENDING' | 'DOWNLOADING' | 'TRANSCODING' | 'GENERATING_THUMBNAIL' | 'UPLOADING' | 'COMPLETED' | 'FAILED';
  progressPercent: number;
  error?: string;
}

export interface UploadProgressEvent {
  uploadId: string;
  fileName: string;
  status: 'INITIALIZING' | 'UPLOADING' | 'COMPLETING' | 'COMPLETED' | 'FAILED';
  bytesTransferred: number;
  totalBytes: number;
  progressPercent: number;
  transferRateBps?: number;
  estimatedSecondsRemaining?: number;
  error?: string;
}

export const streamingApi = {
  /**
   * Get video info including HLS URL if transcoded
   */
  getVideoInfo: (mediaId: string): Promise<VideoInfo> =>
    gatewayRequest<VideoInfo>("GET", `/api/media/info/${mediaId}`),

  /**
   * Get direct stream URL (with byte-range support for seeking)
   */
  getStreamUrl: (mediaId: string): string =>
    buildGatewayUrl(`/api/media/stream/${mediaId}`),

  /**
   * Get HLS playlist URL
   */
  getHlsPlaylistUrl: (mediaId: string): string =>
    buildGatewayUrl(`/api/media/hls/${mediaId}/playlist.m3u8`),

  /**
   * Get MP4 fallback URL for a specific quality
   */
  getMp4Url: (mediaId: string, quality: string): string =>
    buildGatewayUrl(`/api/media/mp4/${mediaId}/${quality}`),

  /**
   * Get HLS.js configuration with auth headers for XHR requests.
   * Use this when initializing HLS.js to ensure authenticated requests.
   */
  getHlsConfig: () => ({
    xhrSetup: (xhr: XMLHttpRequest, url: string) => {
      const accessToken = localStorage.getItem('nearly_access_token');
      if (accessToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      }
      const userId = localStorage.getItem('nearly_user_id');
      if (userId) {
        xhr.setRequestHeader('X-User-Id', userId);
      }
    },
  }),

  /**
   * Trigger HLS transcoding for a video
   */
  triggerTranscode: (mediaId: string): Promise<{ status: string; jobId?: string; hlsUrl?: string }> =>
    gatewayRequest<any>("POST", `/api/media/transcode/${mediaId}`),

  /**
   * Get transcoding job status
   */
  getTranscodeStatus: (jobId: string): Promise<TranscodeProgress> =>
    gatewayRequest<TranscodeProgress>("GET", `/api/media/transcode/status/${jobId}`),

  /**
   * Get all active transcoding jobs
   */
  getActiveTranscodes: (): Promise<TranscodeProgress[]> =>
    gatewayRequest<TranscodeProgress[]>("GET", `/api/media/transcode/active`),

  /**
   * Get upload progress for a specific upload
   */
  getUploadProgress: (uploadId: string): Promise<UploadProgressEvent | null> =>
    gatewayRequest<UploadProgressEvent>("GET", `/api/media/crt/progress/${uploadId}`)
      .catch(() => null),

  /**
   * Get all active uploads
   */
  getActiveUploads: (): Promise<UploadProgressEvent[]> =>
    gatewayRequest<UploadProgressEvent[]>("GET", `/api/media/crt/active`),

  /**
   * Fetch video stream with auth headers (for direct fetch requests)
   */
  fetchStream: async (mediaId: string, options?: { range?: string }): Promise<Response> => {
    const headers: Record<string, string> = { ...getAuthHeaders() };
    if (options?.range) {
      headers['Range'] = options.range;
    }
    return fetch(buildGatewayUrl(`/api/media/stream/${mediaId}`), {
      method: 'GET',
      headers,
    });
  },

  /**
   * Fetch HLS playlist with auth headers
   */
  fetchHlsPlaylist: async (mediaId: string): Promise<string> => {
    const response = await fetch(buildGatewayUrl(`/api/media/hls/${mediaId}/playlist.m3u8`), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch HLS playlist');
    return response.text();
  },

  /**
   * Fetch HLS variant playlist with auth headers
   */
  fetchHlsVariantPlaylist: async (mediaId: string, variant: string): Promise<string> => {
    const response = await fetch(buildGatewayUrl(`/api/media/hls/${mediaId}/${variant}/playlist.m3u8`), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch HLS variant playlist');
    return response.text();
  },

  /**
   * Smart upload with auto-transcode for videos
   * Uses CRT for large files, triggers HLS transcode for videos
   */
  uploadVideoWithTranscode: async (
    file: File,
    context: string,
    contextId?: string,
    onProgress?: (percent: number) => void
  ): Promise<{ mediaId: string; url: string; hlsUrl?: string; thumbnailUrl?: string }> => {
    // Upload using CRT endpoint
    const formData = new FormData();
    formData.append("file", file);
    formData.append("context", context);
    if (contextId) formData.append("contextId", contextId);
    formData.append("isPublic", "true");

    // Get auth headers
    const headers: Record<string, string> = { ...getAuthHeaders() };
    // Remove Content-Type for FormData (browser sets it with boundary)
    delete headers['Content-Type'];

    const response = await fetch(buildGatewayUrl("/api/media/crt/upload"), {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) throw new Error("Upload failed");
    const uploadResult = await response.json();

    // If it's a video, trigger transcoding (Note: auto-transcode is now handled server-side)
    if (file.type.startsWith('video/') && uploadResult.id) {
      try {
        const transcodeResult = await streamingApi.triggerTranscode(uploadResult.id);
        return {
          mediaId: uploadResult.id,
          url: uploadResult.url,
          hlsUrl: transcodeResult.hlsUrl,
          thumbnailUrl: uploadResult.thumbnailUrl,
        };
      } catch (e) {
        console.warn('Transcoding trigger failed (may be auto-triggered server-side):', e);
      }
    }

    return {
      mediaId: uploadResult.id,
      url: uploadResult.url,
      thumbnailUrl: uploadResult.thumbnailUrl,
    };
  },

  /**
   * Upload media file with auth headers
   */
  uploadMedia: async (
    file: File,
    context: string,
    contextId?: string,
    isPublic: boolean = true
  ): Promise<{ id: string; url: string; thumbnailUrl?: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("context", context);
    if (contextId) formData.append("contextId", contextId);
    formData.append("isPublic", String(isPublic));

    // Get auth headers (without Content-Type for FormData)
    const headers: Record<string, string> = { ...getAuthHeaders() };

    const response = await fetch(buildGatewayUrl("/api/media/upload"), {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Upload failed");
    }

    return response.json();
  },
};

// =====================
// RANDOM CHAT SERVICE (Legacy - use videoChatApi for unified matching)
// Note: Backend video-chat-service handles both video and text chat matching
// The chat mode is decided by the backend based on availability
// =====================
export const randomChatApi = {
  // Get online users count
  getOnlineCount: () =>
    gatewayRequest<{ count: number; online?: number; looking?: number; inChat?: number }>(
      "GET", "/api/random-chat/online"
    ),
  
  // Get queue status
  getQueueStatus: () =>
    gatewayRequest<{
      queue: number;
      totalLooking: number;
      onlineUsers: number;
      activeRooms: number;
    }>("GET", "/api/random-chat/queue/status"),
  
  // Check if user is in queue or room
  checkUserStatus: (sessionId: string) =>
    gatewayRequest<{
      sessionId: string;
      inQueue: boolean;
      inRoom: boolean;
      roomId?: string;
      status: "in_chat" | "looking" | "idle";
    }>("GET", `/api/random-chat/queue/${sessionId}`),
  
  // Leave matching queue
  leaveQueue: (sessionId: string) =>
    gatewayRequest<{ success: boolean }>("DELETE", `/api/random-chat/queue/${sessionId}`),
  
  // Register user online
  registerOnline: (data: { sessionId: string; userId?: number; username?: string }) =>
    gatewayRequest<{
      success: boolean;
      sessionId: string;
      onlineCount: number;
      lookingForMatch: number;
    }>("POST", "/api/random-chat/online", data),
  
  // Unregister user
  unregisterOnline: (sessionId: string) =>
    gatewayRequest<{ success: boolean }>("DELETE", `/api/random-chat/online/${sessionId}`),
  
  // Send heartbeat to keep session alive
  heartbeat: (sessionId: string) =>
    gatewayRequest<{
      success: boolean;
      onlineCount: number;
      lookingForMatch: number;
    }>("POST", "/api/random-chat/heartbeat", { sessionId }),
  
  // Get chat statistics
  getStats: () =>
    gatewayRequest<{
      onlineUsers: number;
      lookingForMatch: number;
      activeRooms: number;
      usersInChat: number;
      status: string;
    }>("GET", "/api/random-chat/stats"),
  
  // Get room info by session
  getRoomBySession: (sessionId: string) =>
    gatewayRequest<{
      inRoom: boolean;
      roomId?: string;
      sessionId: string;
    }>("GET", `/api/random-chat/room/session/${sessionId}`),
  
  // End room by session
  endRoom: (sessionId: string) =>
    gatewayRequest<{ success: boolean; partnerNotified: boolean }>(
      "DELETE", `/api/random-chat/room/session/${sessionId}`
    ),
  
  // Get WebSocket URL for chat signaling (Legacy - use video-chat service)
  getWebSocketUrl: () => buildGatewayWsUrl("/ws/video"),
  
  // Get direct WebSocket URL - use video-chat-service which handles both modes
  // Backend decides the chat mode (video or text) based on matching availability
  getDirectWebSocketUrl: () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Connect to video-chat-service (port 9016) which handles both video and text
    return `${protocol}//${window.location.hostname}:9016/ws/video`;
  },
};

// =====================
// VIDEO CHAT SERVICE (Primary service for random chat matching)
// This service handles BOTH video and text chat matching
// Backend decides the chat mode based on availability and matching logic
// =====================
export const videoChatApi = {
  // Get ICE servers for WebRTC connection
  getIceServers: () =>
    gatewayRequest<any[]>("GET", "/api/video-chat/ice-servers"),
  
  // Get online users count
  getOnlineCount: () =>
    gatewayRequest<{ count: number; online?: number; looking?: number; inCall?: number }>(
      "GET", "/api/video-chat/online"
    ),
  
  // Get queue status
  getQueueStatus: () =>
    gatewayRequest<{
      videoQueue: number;
      textQueue: number;
      totalLooking: number;
      onlineUsers: number;
      activeRooms: number;
    }>("GET", "/api/video-chat/queue/status"),
  
  // Check if user is in queue or room
  checkUserStatus: (sessionId: string) =>
    gatewayRequest<{
      sessionId: string;
      inQueue: boolean;
      inRoom: boolean;
      roomId?: string;
      status: "in_call" | "looking" | "idle";
    }>("GET", `/api/video-chat/queue/${sessionId}`),
  
  // Leave matching queue
  leaveQueue: (sessionId: string) =>
    gatewayRequest<{ success: boolean }>("DELETE", `/api/video-chat/queue/${sessionId}`),
  
  // Register user online
  registerOnline: (data: { sessionId: string; userId?: number; username?: string }) =>
    gatewayRequest<{
      success: boolean;
      sessionId: string;
      onlineCount: number;
      lookingForVideo: number;
      lookingForText: number;
    }>("POST", "/api/video-chat/online", data),
  
  // Unregister user
  unregisterOnline: (sessionId: string) =>
    gatewayRequest<{ success: boolean }>("DELETE", `/api/video-chat/online/${sessionId}`),
  
  // Send heartbeat to keep session alive
  heartbeat: (sessionId: string) =>
    gatewayRequest<{
      success: boolean;
      onlineCount: number;
      lookingForVideo: number;
      lookingForText: number;
    }>("POST", "/api/video-chat/heartbeat", { sessionId }),
  
  // Get video chat statistics
  getStats: () =>
    gatewayRequest<{
      onlineUsers: number;
      lookingForVideo: number;
      lookingForText: number;
      activeRooms: number;
      usersInCall: number;
      status: string;
    }>("GET", "/api/video-chat/stats"),
  
  // Get room info by session
  getRoomBySession: (sessionId: string) =>
    gatewayRequest<{
      inRoom: boolean;
      roomId?: string;
      sessionId: string;
      isInitiator?: boolean;
      chatMode?: string;
    }>("GET", `/api/video-chat/room/session/${sessionId}`),
  
  // End room by session
  endRoom: (sessionId: string) =>
    gatewayRequest<{ success: boolean; partnerNotified: boolean }>(
      "DELETE", `/api/video-chat/room/session/${sessionId}`
    ),
  
  // Get WebSocket URL for video chat signaling
  getWebSocketUrl: () => buildGatewayWsUrl("/ws/video"),
  
  // Get direct WebSocket URL (bypassing gateway for lower latency)
  getDirectWebSocketUrl: () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Connect directly to video chat microservice on port 9016
    return `${protocol}//${window.location.hostname}:9016/ws/video`;
  },
};

// =====================
// PAI MATCHING SERVICE (AI-powered user matching)
// =====================
export const paiMatchingApi = {
  // Find a match using PAI (Peer-based AI) microservice
  findMatch: (data: {
    sessionId: string;
    chatMode: "text" | "video";
    preferences?: {
      interests?: string[];
      language?: string;
      ageRange?: { min?: number; max?: number };
    };
  }) => gatewayRequest<{
    success: boolean;
    matchedSessionId?: string;
    matchedUserId?: string;
    matchScore?: number;
    roomId?: string;
  }>("POST", "/api/pai/match", data),
  
  // Leave matching queue
  leaveQueue: (sessionId: string) =>
    gatewayRequest<{ success: boolean }>("DELETE", `/api/pai/queue/${sessionId}`),
  
  // Get queue status
  getQueueStatus: (sessionId: string) =>
    gatewayRequest<{
      inQueue: boolean;
      position?: number;
      estimatedWaitTime?: number;
    }>("GET", `/api/pai/queue/${sessionId}/status`),
  
  // Rate a match (for PAI learning)
  rateMatch: (data: {
    sessionId: string;
    matchedSessionId: string;
    rating: number; // 1-5
    feedback?: string;
  }) => gatewayRequest<{ success: boolean }>("POST", "/api/pai/match/rate", data),
};

// =====================
// REPORT SERVICE
// =====================
export const reportApi = {
  submitReport: (data: {
    reporterSessionId: string;
    reportedSessionId: string;
    chatType: "text" | "video";
    category: string;
    description?: string;
  }) => gatewayRequest<{ success: boolean; reportId: string }>("POST", "/api/reports", data),
};

// =====================
// AUTH SERVICE
// =====================
// Handles all authentication operations (login, signup, password reset, tokens)
// User data is managed by user-service; auth-service calls it internally
export const authApi = {
  // User Signup - creates user via user-service and returns JWT tokens
  signup: (data: {
    email: string;
    password: string;
    username: string;
    name: string;
    bio?: string;
    location?: string;
    avatarUrl?: string;
    interests?: string[];
  }) => gatewayRequest<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    user?: any;
    error?: string;
  }>("POST", "/api/auth/signup", data),

  login: (data: { usernameOrEmail: string; password: string; deviceInfo?: string }) =>
    gatewayRequest<{
      success: boolean;
      accessToken?: string;
      refreshToken?: string;
      user?: any;
      error?: string;
    }>("POST", "/api/auth/login", data),

  refreshToken: (refreshToken: string) =>
    gatewayRequest<{
      success: boolean;
      accessToken?: string;
      refreshToken?: string;
      error?: string;
    }>("POST", "/api/auth/refresh", { refreshToken }),

  logout: (refreshToken: string) =>
    gatewayRequest<{ success: boolean }>("POST", "/api/auth/logout", { refreshToken }),

  logoutAll: () =>
    gatewayRequest<{ success: boolean }>("POST", "/api/auth/logout-all"),

  // Password Reset
  forgotPassword: (email: string) =>
    gatewayRequest<{ success: boolean; message: string }>("POST", "/api/auth/forgot-password", { email }),

  verifyOtp: (email: string, otp: string) =>
    gatewayRequest<{ success: boolean; verified: boolean; error?: string }>("POST", "/api/auth/verify-otp", { email, otp }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    gatewayRequest<{ success: boolean; message?: string; error?: string }>("POST", "/api/auth/reset-password", { email, otp, newPassword }),

  // Username Check
  checkUsername: (username: string) =>
    gatewayRequest<{ available: boolean; suggestions?: string[] }>("GET", `/api/auth/check-username?username=${encodeURIComponent(username)}`),

  // Token Validation
  validateToken: () =>
    gatewayRequest<{ valid: boolean; userId?: string; username?: string }>("GET", "/api/auth/validate"),

  // Anonymous Sessions (for Random Chat)
  createAnonymousSession: () =>
    gatewayRequest<{ sessionId: string; expiresAt: string }>("POST", "/api/auth/anonymous/session"),
  
  validateSession: (sessionId: string) =>
    gatewayRequest<{ valid: boolean }>("GET", `/api/auth/anonymous/session/${sessionId}/validate`),

  endSession: (sessionId: string) =>
    gatewayRequest<{ success: boolean }>("DELETE", `/api/auth/anonymous/session/${sessionId}`),

  extendSession: (sessionId: string) =>
    gatewayRequest<{ success: boolean }>("POST", `/api/auth/anonymous/session/${sessionId}/extend`),
};

// Export all APIs as a single object for convenience
export const gatewayApi = {
  users: userApi,
  activities: activityApi,
  events: eventApi,
  groups: groupApi,
  news: newsApi,
  messaging: messagingApi,
  moments: momentsApi,
  shots: shotsApi,
  jobs: jobsApi,
  deals: dealsApi,
  places: placesApi,
  pages: pagesApi,
  notifications: notificationApi,
  search: searchApi,
  media: mediaApi,
  randomChat: randomChatApi,
  videoChat: videoChatApi,
  paiMatching: paiMatchingApi,
  reports: reportApi,
  auth: authApi,
};

export default gatewayApi;

