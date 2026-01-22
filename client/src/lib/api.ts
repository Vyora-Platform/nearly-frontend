/**
 * API Client for Nearly Application
 * 
 * Architecture:
 * - auth-service: Handles authentication (login, signup, password reset, tokens)
 * - user-service: Handles user data (profiles, follows, settings, password changes)
 * - Auth-service calls user-service internally for user operations
 * - All endpoints are accessed via API Gateway which handles routing
 * 
 * Endpoint Routing:
 * - /api/auth/** -> auth-service (login, signup, forgot-password, reset-password, tokens)
 * - /api/users/** -> user-service (profiles, follows, settings, password changes)
 */

import { apiRequest } from "./queryClient";
import { buildGatewayUrl } from "./config";
import type { Activity, Event, Group, News, User, Notification, Message, Post, Poll, Question, Discussion } from "@shared/schema";

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
const isPublicEndpoint = (url: string): boolean => {
  // Extract the path from the full URL
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    return PUBLIC_ENDPOINTS.some(pub => path.startsWith(pub));
  } catch {
    // If URL parsing fails, check against the raw url
    return PUBLIC_ENDPOINTS.some(pub => url.includes(pub));
  }
};

// Helper to get auth headers including JWT token
const getAuthHeaders = (includeContentType: boolean = true): Record<string, string> => {
  const headers: Record<string, string> = {};
  
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  // Add JWT access token if available
  const accessToken = localStorage.getItem('nearly_access_token');
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Add user ID if available (for current user requests)
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

// Helper to get headers based on whether endpoint is public
const getHeadersForEndpoint = (url: string, includeContentType: boolean = true): Record<string, string> => {
  if (isPublicEndpoint(url)) {
    // Public endpoints only get Content-Type header
    return includeContentType ? { 'Content-Type': 'application/json' } : {};
  }
  return getAuthHeaders(includeContentType);
};

// Helper function for authenticated fetch with headers
const gatewayFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  const headers: HeadersInit = {
    ...getHeadersForEndpoint(url, false),
    ...(options?.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  return response;
};

// Helper function for gateway API requests (POST, PATCH, DELETE, etc.)
const gatewayRequest = async (method: string, url: string, data?: unknown): Promise<Response> => {
  return fetch(url, {
    method,
    headers: getHeadersForEndpoint(url, true),
    body: data ? JSON.stringify(data) : undefined,
  });
};

export const api = {
  // Activities
  getActivities: async (limit?: number): Promise<Activity[]> => {
    const url = limit ? `${buildGatewayUrl("/api/activities")}?limit=${limit}` : buildGatewayUrl("/api/activities");
    const res = await gatewayFetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },
  getActivitiesQuery: () => api.getActivities(),
  getActivity: async (id: string): Promise<Activity> => {
    const res = await gatewayFetch(buildGatewayUrl(`/api/activities/${id}`));
    return res.json();
  },
  createActivity: async (data: Partial<Activity>): Promise<Activity> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/activities"), data);
    return res.json();
  },
  updateActivity: async (id: string, data: Partial<Activity>): Promise<Activity> => {
    const res = await gatewayRequest("PATCH", buildGatewayUrl(`/api/activities/${id}`), data);
    return res.json();
  },
  deleteActivity: async (id: string): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("DELETE", buildGatewayUrl(`/api/activities/${id}`));
    return res.json();
  },
  likeActivity: async (id: string, increment: boolean): Promise<{ success: boolean }> => {
    // userId is now extracted from JWT token via X-User-Id header on server
    const res = await gatewayRequest("POST", buildGatewayUrl(`/api/activities/${id}/like`), { increment });
    return res.json();
  },
  // Activity comments - fetches comments from the activity
  getActivityComments: async (activityId: string): Promise<any[]> => {
    try {
      if (!activityId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/activities/${activityId}/comments`));
      if (!res.ok) {
        // If comments endpoint fails, try to get from activity data
        const activity = await gatewayFetch(buildGatewayUrl(`/api/activities/${activityId}`));
        if (activity.ok) {
          const activityData = await activity.json();
          return Array.isArray(activityData.comments) ? activityData.comments : [];
        }
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  createActivityComment: async (activityId: string, content: string): Promise<any> => {
    try {
      // userId is now extracted from JWT token via X-User-Id header on server
      const res = await gatewayRequest("POST", buildGatewayUrl(`/api/activities/${activityId}/comments`), { 
        content
      });
      if (!res.ok) return { success: false };
      return res.json();
    } catch { return { success: false }; }
  },
  // Activity attendees/participants - returns data from activity itself or dedicated endpoint
  getActivityAttendees: async (activityId: string): Promise<any[]> => {
    // Attendees endpoint might not be implemented - return empty array
    // The activity details contain participantsCount
    return [];
  },
  joinActivity: async (activityId: string): Promise<any> => {
    try {
      // userId is now extracted from JWT token via X-User-Id header on server
      const res = await gatewayRequest("POST", buildGatewayUrl(`/api/activities/${activityId}/join`), {});
      if (!res.ok) return { success: false };
      return res.json();
    } catch { return { success: false }; }
  },

  // Events
  getEvents: async (limit?: number): Promise<Event[]> => {
    const url = limit ? `${buildGatewayUrl("/api/events")}?limit=${limit}` : buildGatewayUrl("/api/events");
    const res = await gatewayFetch(url);
    return res.json();
  },
  getEvent: async (id: string): Promise<Event> => {
    const res = await gatewayFetch(buildGatewayUrl(`/api/events/${id}`));
    return res.json();
  },
  createEvent: async (data: Partial<Event>): Promise<Event> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/events"), data);
    return res.json();
  },
  updateEvent: async (id: string, data: Partial<Event>): Promise<Event> => {
    const res = await gatewayRequest("PATCH", buildGatewayUrl(`/api/events/${id}`), data);
    return res.json();
  },
  deleteEvent: async (id: string): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("DELETE", buildGatewayUrl(`/api/events/${id}`));
    return res.json();
  },

  // Groups - with graceful error handling
  getGroups: async (limit?: number): Promise<Group[]> => {
    try {
      const url = limit ? `${buildGatewayUrl("/api/groups")}?limit=${limit}` : buildGatewayUrl("/api/groups");
      const res = await gatewayFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getGroup: async (id: string): Promise<Group> => {
    const res = await gatewayFetch(buildGatewayUrl(`/api/groups/${id}`));
    return res.json();
  },
  createGroup: async (data: Partial<Group>): Promise<Group> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/groups"), data);
    return res.json();
  },
  updateGroup: async (id: string, data: Partial<Group>): Promise<Group> => {
    const res = await gatewayRequest("PATCH", buildGatewayUrl(`/api/groups/${id}`), data);
    return res.json();
  },
  deleteGroup: async (id: string): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("DELETE", buildGatewayUrl(`/api/groups/${id}`));
    return res.json();
  },

  // Group Members - with graceful error handling
  getGroupMembers: async (groupId: string): Promise<any[]> => {
    try {
      if (!groupId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/groups/${groupId}/members`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getUserGroups: async (userId: string): Promise<Group[]> => {
    try {
      if (!userId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/groups/user/${userId}`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  joinGroup: async (groupId: string): Promise<any> => {
    try {
      // userId is now extracted from JWT token via X-User-Id header on server
      const res = await gatewayRequest("POST", buildGatewayUrl(`/api/groups/${groupId}/join`), {});
      if (!res.ok) return { success: false };
      return res.json();
    } catch { return { success: false }; }
  },

  // Event Guests - with graceful error handling
  getEventGuests: async (eventId: string): Promise<any[]> => {
    try {
      if (!eventId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/events/${eventId}/guests`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  joinEvent: async (eventId: string): Promise<any> => {
    try {
      // userId is now extracted from JWT token via X-User-Id header on server
      const res = await gatewayRequest("POST", buildGatewayUrl(`/api/events/${eventId}/join`), {});
      if (!res.ok) return { success: false };
      return res.json();
    } catch { return { success: false }; }
  },

  // Event Comments - with graceful error handling
  getEventComments: async (eventId: string): Promise<any[]> => {
    try {
      if (!eventId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/events/${eventId}/comments`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  createEventComment: async (eventId: string, content: string, userId?: string): Promise<any> => {
    const res = await gatewayRequest("POST", buildGatewayUrl(`/api/events/${eventId}/comments`), { content, userId });
    return res.json();
  },

  // News - with graceful error handling
  getNews: async (limit?: number): Promise<News[]> => {
    try {
      const url = limit ? `${buildGatewayUrl("/api/news")}?limit=${limit}` : buildGatewayUrl("/api/news");
      const res = await gatewayFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getNewsItem: async (id: string): Promise<News> => {
    const res = await gatewayFetch(buildGatewayUrl(`/api/news/${id}`));
    return res.json();
  },
  createNews: async (data: Partial<News>): Promise<News> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/news"), data);
    return res.json();
  },
  updateNews: async (id: string, data: Partial<News>): Promise<News> => {
    const res = await gatewayRequest("PATCH", buildGatewayUrl(`/api/news/${id}`), data);
    return res.json();
  },
  deleteNews: async (id: string): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("DELETE", buildGatewayUrl(`/api/news/${id}`));
    return res.json();
  },
  voteNews: async (id: string, voteType: 'true' | 'fake', increment: boolean): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("POST", buildGatewayUrl(`/api/news/${id}/vote`), { voteType, increment });
    return res.json();
  },
  likeNews: async (id: string, increment: boolean): Promise<{ success: boolean }> => {
    // userId is now extracted from JWT token via X-User-Id header on server
    const res = await gatewayRequest("POST", buildGatewayUrl(`/api/news/${id}/like`), { increment });
    return res.json();
  },
  
  // News view tracking
  viewNews: async (id: string): Promise<any> => {
    const res = await gatewayRequest("POST", buildGatewayUrl(`/api/news/${id}/view`), {});
    return res.json();
  },
  
  // News comments
  getNewsComments: async (newsId: string): Promise<any[]> => {
    try {
      if (!newsId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/news/${newsId}/comments`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  createNewsComment: async (newsId: string, content: string): Promise<any> => {
    try {
      // userId is now extracted from JWT token via X-User-Id header on server
      const res = await gatewayRequest("POST", buildGatewayUrl(`/api/news/${newsId}/comments`), { 
        content
      });
      if (!res.ok) return { success: false };
      return res.json();
    } catch { return { success: false }; }
  },

  // =====================
  // USER SERVICE ENDPOINTS
  // =====================
  // User operations are handled by user-service
  
  getUsers: async (): Promise<User[]> => {
    try {
      // Try search endpoint for getting all users
      const res = await gatewayFetch(buildGatewayUrl("/api/users/search?q="));
      if (!res.ok) {
        // Fallback: return empty array if endpoint doesn't exist
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getUser: async (id: string): Promise<User> => {
    try {
      if (!id) throw new Error('User ID required');
      const res = await gatewayFetch(buildGatewayUrl(`/api/users/${id}`));
      if (!res.ok) throw new Error('User not found');
      return res.json();
    } catch (error) {
      // Return a default user object to prevent crashes
      return {
        id: id || 'unknown',
        username: 'user',
        name: 'Unknown User',
        email: '',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
      } as User;
    }
  },
  getCurrentUser: async (): Promise<User> => {
    try {
      // Get current user ID from localStorage and fetch user by ID
      const userId = localStorage.getItem('nearly_user_id');
      if (!userId) {
        throw new Error('Not authenticated');
      }
      const res = await gatewayFetch(buildGatewayUrl(`/api/users/${userId}`));
      if (!res.ok) {
        throw new Error('User not found');
      }
      return res.json();
    } catch (error) {
      // Return user data from localStorage if API fails
      const userId = localStorage.getItem('nearly_user_id') || '';
      const username = localStorage.getItem('nearly_username') || 'user';
      return {
        id: userId,
        username: username,
        name: username,
        email: '',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      } as User;
    }
  },
  getUserByUsername: async (username: string): Promise<User> => {
    const res = await gatewayFetch(buildGatewayUrl(`/api/users/username/${username}`));
    return res.json();
  },
  createUser: async (data: Partial<User>): Promise<User> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/users"), data);
    return res.json();
  },
  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    const res = await gatewayRequest("PATCH", buildGatewayUrl(`/api/users/${id}`), data);
    return res.json();
  },
  deleteUser: async (id: string): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("DELETE", buildGatewayUrl(`/api/users/${id}`));
    return res.json();
  },

  // =====================
  // AUTH SERVICE ENDPOINTS  
  // =====================
  // Authentication operations are handled by auth-service
  // Password changes are handled by user-service
  
  // Change password (user-service handles password storage)
  changePassword: async (userId: string, data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("POST", buildGatewayUrl(`/api/users/${userId}/password`), data);
    return res.json();
  },
  
  // Logout (auth-service handles token invalidation)
  logout: async (): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/auth/logout"));
    return res.json();
  },
  
  // Check username availability (auth-service routes to user-service internally)
  checkUsername: async (username: string): Promise<{ available: boolean; suggestions?: string[] }> => {
    const res = await gatewayFetch(buildGatewayUrl(`/api/auth/check-username?username=${encodeURIComponent(username)}`));
    return res.json();
  },
  
  // Signup (auth-service creates user via user-service and returns JWT tokens)
  signup: async (data: {
    email: string;
    password: string;
    name: string;
    username: string;
    bio?: string;
    location?: string;
    avatarUrl?: string;
    interests?: string[];
  }): Promise<{ success: boolean; user: { id: string; username: string; name: string; avatarUrl?: string } }> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/auth/signup"), data);
    return res.json();
  },
  
  // Login (auth-service validates credentials via user-service and returns JWT tokens)
  login: async (data: { usernameOrEmail: string; password: string }): Promise<{ success: boolean; user: { id: string; username: string; name: string; avatarUrl?: string } }> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/auth/login"), data);
    return res.json();
  },

  // User Data Export - with graceful error handling for missing endpoints
  getUserActivities: async (userId: string): Promise<Activity[]> => {
    try {
      if (!userId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/activities/user/${userId}`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getUserEvents: async (userId: string): Promise<Event[]> => {
    try {
      if (!userId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/events/user/${userId}`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getUserGroupsData: async (userId: string): Promise<Group[]> => {
    try {
      if (!userId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/groups/user/${userId}`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getUserNews: async (userId: string): Promise<News[]> => {
    try {
      if (!userId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/news/user/${userId}`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },

  // Follows - Instagram-style with support for private accounts and follow requests
  followUser: async (followerId: string, followingId: string): Promise<{ success: boolean; status?: 'following' | 'requested' }> => {
    try {
      const res = await gatewayRequest("POST", buildGatewayUrl(`/api/users/${followerId}/follow/${followingId}`));
      if (!res.ok) return { success: false };
      return res.json();
    } catch { return { success: false }; }
  },
  unfollowUser: async (followerId: string, followingId: string): Promise<any> => {
    try {
      const res = await gatewayRequest("DELETE", buildGatewayUrl(`/api/users/${followerId}/unfollow/${followingId}`));
      if (!res.ok) return { success: false };
      return res.json();
    } catch { return { success: false }; }
  },
  getFollowers: async (userId: string): Promise<User[]> => {
    try {
      if (!userId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/users/${userId}/followers`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getFollowing: async (userId: string): Promise<User[]> => {
    try {
      if (!userId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/users/${userId}/following`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getFriends: async (userId: string): Promise<User[]> => {
    try {
      if (!userId) return [];
      // Friends are mutual followers (people you follow who also follow you back)
      const following = await api.getFollowing(userId);
      const followers = await api.getFollowers(userId);
      const followerIds = new Set(followers.map(f => f.id));
      return following.filter(user => followerIds.has(user.id));
    } catch { return []; }
  },
  isFollowing: async (followerId: string, followingId: string): Promise<boolean> => {
    try {
      if (!followerId || !followingId) return false;
      const res = await gatewayFetch(buildGatewayUrl(`/api/users/${followerId}/following/${followingId}`));
      if (!res.ok) return false;
      const data = await res.json();
      return data.isFollowing ?? false;
    } catch { return false; }
  },
  getFollowStatus: async (followerId: string, followingId: string): Promise<{ isFollowing: boolean; isPending: boolean }> => {
    try {
      if (!followerId || !followingId) return { isFollowing: false, isPending: false };
      const res = await gatewayFetch(buildGatewayUrl(`/api/users/${followerId}/following/${followingId}`));
      if (!res.ok) return { isFollowing: false, isPending: false };
      const data = await res.json();
      return { isFollowing: data.isFollowing ?? false, isPending: data.isPending ?? false };
    } catch { return { isFollowing: false, isPending: false }; }
  },
  // Follow request management
  getFollowRequests: async (userId: string): Promise<any[]> => {
    try {
      if (!userId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/users/${userId}/follow-requests`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  acceptFollowRequest: async (userId: string, requesterId: string): Promise<{ success: boolean }> => {
    try {
      const res = await gatewayRequest("POST", buildGatewayUrl(`/api/users/${userId}/follow-requests/${requesterId}/accept`));
      if (!res.ok) return { success: false };
      return res.json();
    } catch { return { success: false }; }
  },
  rejectFollowRequest: async (userId: string, requesterId: string): Promise<{ success: boolean }> => {
    try {
      const res = await gatewayRequest("POST", buildGatewayUrl(`/api/users/${userId}/follow-requests/${requesterId}/reject`));
      if (!res.ok) return { success: false };
      return res.json();
    } catch { return { success: false }; }
  },

  // Notifications - with graceful error handling for 503 service unavailable
  getNotifications: async (userId: string, type?: string): Promise<Notification[]> => {
    try {
      if (!userId) return [];
      // Use RESTful path parameter approach
      const baseUrl = `${buildGatewayUrl("/api/notifications")}/${userId}`;
      const url = type ? `${baseUrl}?type=${type}` : baseUrl;
      const res = await gatewayFetch(url);
      // Handle 503 Service Unavailable gracefully
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  createNotification: async (data: Partial<Notification>): Promise<Notification> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/notifications"), data);
    return res.json();
  },
  markNotificationAsRead: async (id: string): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("PATCH", buildGatewayUrl(`/api/notifications/${id}/read`));
    return res.json();
  },

  // Messages - with graceful error handling
  getMessages: async (groupId?: string, userId?: string): Promise<Message[]> => {
    try {
      const params = new URLSearchParams();
      if (groupId) params.append('groupId', groupId);
      if (userId) params.append('userId', userId);
      const url = `${buildGatewayUrl("/api/messages")}?${params.toString()}`;
      const res = await gatewayFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getGroupMessages: async (groupId: string): Promise<Message[]> => {
    try {
      if (!groupId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/messages/group/${groupId}`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getDirectMessages: async (userId: string): Promise<Message[]> => {
    try {
      if (!userId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/messages/direct/${userId}`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  createMessage: async (data: Partial<Message>): Promise<Message> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/messages"), data);
    return res.json();
  },

  // Moments - with graceful error handling
  getMoments: async (visibility?: 'global' | 'friends', limit?: number): Promise<any[]> => {
    try {
      const params = new URLSearchParams();
      if (visibility) params.append('visibility', visibility);
      if (limit) params.append('limit', limit.toString());
      const url = `${buildGatewayUrl("/api/moments")}?${params.toString()}`;
      const res = await gatewayFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getMoment: async (id: string): Promise<any> => {
    const res = await gatewayFetch(buildGatewayUrl(`/api/moments/${id}`));
    return res.json();
  },
  createMoment: async (data: {
    mediaUrl: string;
    mediaType: 'image' | 'video';
    caption?: string;
    textOverlays?: string;
    filter?: string;
    visibility: 'global' | 'friends' | 'private';
    recipientIds?: string[];
  }): Promise<any> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/moments"), data);
    return res.json();
  },
  deleteMoment: async (id: string): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("DELETE", buildGatewayUrl(`/api/moments/${id}`));
    return res.json();
  },
  likeMoment: async (id: string): Promise<{ success: boolean }> => {
    // userId is now extracted from JWT token via X-User-Id header on server
    const res = await gatewayRequest("POST", buildGatewayUrl(`/api/moments/${id}/like`), {});
    return res.json();
  },
  viewMoment: async (id: string): Promise<{ success: boolean }> => {
    // viewMoment doesn't need userId - just tracks views
    const res = await gatewayRequest("POST", buildGatewayUrl(`/api/moments/${id}/view`), {});
    return res.json();
  },
  
  // Moment comments
  getMomentComments: async (momentId: string): Promise<any[]> => {
    try {
      if (!momentId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/moments/${momentId}/comments`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  createMomentComment: async (momentId: string, content: string, parentCommentId?: string): Promise<any> => {
    try {
      // userId is now extracted from JWT token via X-User-Id header on server
      const res = await gatewayRequest("POST", buildGatewayUrl(`/api/moments/${momentId}/comments`), { 
        content,
        parentCommentId
      });
      if (!res.ok) return { success: false };
      return res.json();
    } catch { return { success: false }; }
  },

  // Direct Moments - with graceful error handling
  getDirectMoments: async (userId: string): Promise<any[]> => {
    try {
      if (!userId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/moments/direct/${userId}`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  sendDirectMoment: async (momentId: string, recipientIds: string[]): Promise<any> => {
    const res = await gatewayRequest("POST", buildGatewayUrl(`/api/moments/${momentId}/send`), { recipientIds });
    return res.json();
  },
  markDirectMomentViewed: async (directMomentId: string): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("POST", buildGatewayUrl(`/api/moments/direct/${directMomentId}/view`));
    return res.json();
  },

  // Moment Streaks - with graceful error handling
  getStreaks: async (userId: string): Promise<any[]> => {
    try {
      if (!userId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/moments/streaks/${userId}`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getStreak: async (userId1: string, userId2: string): Promise<any> => {
    try {
      const res = await gatewayFetch(buildGatewayUrl(`/api/moments/streaks/${userId1}/${userId2}`));
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  },

  // Marketplace - Jobs - with graceful error handling
  getJobs: async (limit?: number): Promise<any[]> => {
    try {
      const url = limit ? `${buildGatewayUrl("/api/jobs")}?limit=${limit}` : buildGatewayUrl("/api/jobs");
      const res = await gatewayFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getJob: async (id: string): Promise<any> => {
    const res = await gatewayFetch(buildGatewayUrl(`/api/jobs/${id}`));
    return res.json();
  },
  createJob: async (data: any): Promise<any> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/jobs"), data);
    return res.json();
  },
  updateJob: async (id: string, data: any): Promise<any> => {
    const res = await gatewayRequest("PATCH", buildGatewayUrl(`/api/jobs/${id}`), data);
    return res.json();
  },
  deleteJob: async (id: string): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("DELETE", buildGatewayUrl(`/api/jobs/${id}`));
    return res.json();
  },

  // Marketplace - Deals - with graceful error handling
  getDeals: async (limit?: number): Promise<any[]> => {
    try {
      const url = limit ? `${buildGatewayUrl("/api/deals")}?limit=${limit}` : buildGatewayUrl("/api/deals");
      const res = await gatewayFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getDeal: async (id: string): Promise<any> => {
    const res = await gatewayFetch(buildGatewayUrl(`/api/deals/${id}`));
    return res.json();
  },
  createDeal: async (data: any): Promise<any> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/deals"), data);
    return res.json();
  },
  updateDeal: async (id: string, data: any): Promise<any> => {
    const res = await gatewayRequest("PATCH", buildGatewayUrl(`/api/deals/${id}`), data);
    return res.json();
  },
  deleteDeal: async (id: string): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("DELETE", buildGatewayUrl(`/api/deals/${id}`));
    return res.json();
  },

  // Marketplace - Places - with graceful error handling
  getPlaces: async (limit?: number): Promise<any[]> => {
    try {
      const url = limit ? `${buildGatewayUrl("/api/places")}?limit=${limit}` : buildGatewayUrl("/api/places");
      const res = await gatewayFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getPlace: async (id: string): Promise<any> => {
    const res = await gatewayFetch(buildGatewayUrl(`/api/places/${id}`));
    return res.json();
  },
  createPlace: async (data: any): Promise<any> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/places"), data);
    return res.json();
  },
  updatePlace: async (id: string, data: any): Promise<any> => {
    const res = await gatewayRequest("PATCH", buildGatewayUrl(`/api/places/${id}`), data);
    return res.json();
  },
  deletePlace: async (id: string): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("DELETE", buildGatewayUrl(`/api/places/${id}`));
    return res.json();
  },

  // Marketplace - Pages - with graceful error handling
  getPages: async (limit?: number): Promise<any[]> => {
    try {
      const url = limit ? `${buildGatewayUrl("/api/pages")}?limit=${limit}` : buildGatewayUrl("/api/pages");
      const res = await gatewayFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getPage: async (id: string): Promise<any> => {
    const res = await gatewayFetch(buildGatewayUrl(`/api/pages/${id}`));
    return res.json();
  },
  createPage: async (data: any): Promise<any> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/pages"), data);
    return res.json();
  },
  updatePage: async (id: string, data: any): Promise<any> => {
    const res = await gatewayRequest("PATCH", buildGatewayUrl(`/api/pages/${id}`), data);
    return res.json();
  },
  deletePage: async (id: string): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("DELETE", buildGatewayUrl(`/api/pages/${id}`));
    return res.json();
  },

  // Search - with graceful error handling
  search: async (query: string, type?: string): Promise<any[]> => {
    try {
      const params = new URLSearchParams({ q: query });
      if (type) params.append('type', type);
      const url = `${buildGatewayUrl("/api/search")}?${params.toString()}`;
      const res = await gatewayFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },

  // Media Upload
  uploadMedia: async (file: File, folder?: string): Promise<{ url: string; id: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);
    
    // Build auth headers (don't include Content-Type for FormData)
    const headers: HeadersInit = {};
    const accessToken = localStorage.getItem('nearly_access_token');
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    const userId = localStorage.getItem('nearly_user_id');
    if (userId) {
      headers['X-User-Id'] = userId;
    }
    const sessionId = localStorage.getItem('anonymous_session_id');
    if (sessionId) {
      headers['X-Anonymous-Session'] = sessionId;
    }
    
    const res = await fetch(buildGatewayUrl("/media/video/async"), {
      method: 'POST',
      headers,
      body: formData,
    });
    return res.json();
  },
  
  getPresignedUploadUrl: async (fileName: string, contentType: string, folder?: string): Promise<{ uploadUrl: string; fileUrl: string; fileId: string }> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/media/presigned-upload"), {
      fileName,
      contentType,
      folder,
    });
    return res.json();
  },

  // Saved Posts
  getSavedPosts: async (userId: string): Promise<any[]> => {
    try {
      if (!userId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/users/${userId}/saved`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  savePost: async (userId: string, postId: string): Promise<{ success: boolean; saved: boolean }> => {
    try {
      const res = await gatewayRequest("POST", buildGatewayUrl(`/api/users/${userId}/saved/${postId}`));
      if (!res.ok) return { success: false, saved: false };
      return res.json();
    } catch { return { success: false, saved: false }; }
  },
  unsavePost: async (userId: string, postId: string): Promise<{ success: boolean; saved: boolean }> => {
    try {
      const res = await gatewayRequest("DELETE", buildGatewayUrl(`/api/users/${userId}/saved/${postId}`));
      if (!res.ok) return { success: false, saved: true };
      return res.json();
    } catch { return { success: false, saved: true }; }
  },

  // Posts (Instagram-like)
  getPosts: async (limit?: number): Promise<Post[]> => {
    try {
      const url = limit ? `${buildGatewayUrl("/api/posts")}?limit=${limit}` : buildGatewayUrl("/api/posts");
      const res = await gatewayFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getPost: async (id: string): Promise<Post> => {
    const res = await gatewayFetch(buildGatewayUrl(`/api/posts/${id}`));
    return res.json();
  },
  createPost: async (data: Partial<Post>): Promise<Post> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/posts"), data);
    return res.json();
  },
  updatePost: async (id: string, data: Partial<Post>): Promise<Post> => {
    const res = await gatewayRequest("PATCH", buildGatewayUrl(`/api/posts/${id}`), data);
    return res.json();
  },
  deletePost: async (id: string): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("DELETE", buildGatewayUrl(`/api/posts/${id}`));
    return res.json();
  },
  likePost: async (id: string, increment: boolean): Promise<{ success: boolean }> => {
    // userId is now extracted from JWT token via X-User-Id header on server
    const res = await gatewayRequest("POST", buildGatewayUrl(`/api/posts/${id}/like`), { increment });
    return res.json();
  },
  getPostComments: async (postId: string): Promise<any[]> => {
    try {
      if (!postId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/posts/${postId}/comments`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  createPostComment: async (postId: string, content: string, parentId?: string): Promise<any> => {
    try {
      // userId is now extracted from JWT token via X-User-Id header on server
      const data: any = { content };
      if (parentId) data.parentId = parentId;
      const res = await gatewayRequest("POST", buildGatewayUrl(`/api/posts/${postId}/comments`), data);
      if (!res.ok) return { success: false };
      return res.json();
    } catch { return { success: false }; }
  },

  // Polls
  getPolls: async (limit?: number): Promise<Poll[]> => {
    try {
      const url = limit ? `${buildGatewayUrl("/api/polls")}?limit=${limit}` : buildGatewayUrl("/api/polls");
      const res = await gatewayFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getPoll: async (id: string): Promise<Poll> => {
    const res = await gatewayFetch(buildGatewayUrl(`/api/polls/${id}`));
    return res.json();
  },
  createPoll: async (data: any): Promise<Poll> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/polls"), data);
    return res.json();
  },
  votePoll: async (pollId: string, optionId: string): Promise<{ success: boolean }> => {
    // userId is now extracted from JWT token via X-User-Id header on server
    const res = await gatewayRequest("POST", buildGatewayUrl(`/api/polls/${pollId}/vote`), { optionId });
    return res.json();
  },
  deletePoll: async (id: string): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("DELETE", buildGatewayUrl(`/api/polls/${id}`));
    return res.json();
  },

  // Questions
  getQuestions: async (limit?: number): Promise<Question[]> => {
    try {
      const url = limit ? `${buildGatewayUrl("/api/questions")}?limit=${limit}` : buildGatewayUrl("/api/questions");
      const res = await gatewayFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getQuestion: async (id: string): Promise<Question> => {
    const res = await gatewayFetch(buildGatewayUrl(`/api/questions/${id}`));
    return res.json();
  },
  createQuestion: async (data: any): Promise<Question> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/questions"), data);
    return res.json();
  },
  upvoteQuestion: async (id: string, increment: boolean): Promise<{ success: boolean }> => {
    // userId is now extracted from JWT token via X-User-Id header on server
    const res = await gatewayRequest("POST", buildGatewayUrl(`/api/questions/${id}/upvote`), { increment });
    return res.json();
  },
  deleteQuestion: async (id: string): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("DELETE", buildGatewayUrl(`/api/questions/${id}`));
    return res.json();
  },
  getQuestionAnswers: async (questionId: string): Promise<any[]> => {
    try {
      if (!questionId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/questions/${questionId}/answers`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  createAnswer: async (questionId: string, content: string): Promise<any> => {
    try {
      // userId is now extracted from JWT token via X-User-Id header on server
      const res = await gatewayRequest("POST", buildGatewayUrl(`/api/questions/${questionId}/answers`), { content });
      if (!res.ok) return { success: false };
      return res.json();
    } catch { return { success: false }; }
  },

  // Discussions
  getDiscussions: async (limit?: number): Promise<Discussion[]> => {
    try {
      const url = limit ? `${buildGatewayUrl("/api/discussions")}?limit=${limit}` : buildGatewayUrl("/api/discussions");
      const res = await gatewayFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  getDiscussion: async (id: string): Promise<Discussion> => {
    const res = await gatewayFetch(buildGatewayUrl(`/api/discussions/${id}`));
    return res.json();
  },
  createDiscussion: async (data: any): Promise<Discussion> => {
    const res = await gatewayRequest("POST", buildGatewayUrl("/api/discussions"), data);
    return res.json();
  },
  likeDiscussion: async (id: string, increment: boolean): Promise<{ success: boolean }> => {
    // userId is now extracted from JWT token via X-User-Id header on server
    const res = await gatewayRequest("POST", buildGatewayUrl(`/api/discussions/${id}/like`), { increment });
    return res.json();
  },
  deleteDiscussion: async (id: string): Promise<{ success: boolean }> => {
    const res = await gatewayRequest("DELETE", buildGatewayUrl(`/api/discussions/${id}`));
    return res.json();
  },
  getDiscussionComments: async (discussionId: string): Promise<any[]> => {
    try {
      if (!discussionId) return [];
      const res = await gatewayFetch(buildGatewayUrl(`/api/discussions/${discussionId}/comments`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  },
  createDiscussionComment: async (discussionId: string, content: string): Promise<any> => {
    try {
      // userId is now extracted from JWT token via X-User-Id header on server
      const res = await gatewayRequest("POST", buildGatewayUrl(`/api/discussions/${discussionId}/comments`), { content });
      if (!res.ok) return { success: false };
      return res.json();
    } catch { return { success: false }; }
  },
};
