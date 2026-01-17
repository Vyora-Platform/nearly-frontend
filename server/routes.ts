import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import * as path from "path";
import * as fs from "fs";
import multer from "multer";

// Microservices Gateway URL - ALL API calls go through this
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:9002";

// Setup multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage_multer = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (_req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Allow all media types without restrictions - no signature, no media type validation
const upload = multer({
  storage: storage_multer,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for all media types
  // No fileFilter - accept all files without validation
});

// In-memory storage for fallback when microservices are unavailable
const storage = {
  users: new Map<string, any>(),
  activities: new Map<string, any>(),
  activityComments: new Map<string, any[]>(), // Store comments per activity
  activityLikes: new Map<string, Set<string>>(), // Store likes per activity (userId set)
  events: new Map<string, any>(),
  eventComments: new Map<string, any[]>(), // Store comments per event
  eventLikes: new Map<string, Set<string>>(), // Store likes per event
  groups: new Map<string, any>(),
  groupMembers: new Map<string, any>(),
  messages: new Map<string, any>(),
  messageRequests: new Map<string, any>(), // Store message requests from non-followers
  notifications: new Map<string, any>(),
  follows: new Map<string, any>(),
  followRequests: new Map<string, any>(),
  moments: new Map<string, any>(),
  momentComments: new Map<string, any[]>(), // Store comments per moment
  momentLikes: new Map<string, Set<string>>(), // Store likes per moment
  shots: new Map<string, any>(), // Store shots (short videos)
  shotComments: new Map<string, any[]>(), // Store comments per shot
  shotLikes: new Map<string, Set<string>>(), // Store likes per shot (userId set)
  savedPosts: new Map<string, string[]>(),
  jobs: new Map<string, any>(),
  deals: new Map<string, any>(),
  places: new Map<string, any>(),
  pages: new Map<string, any>(),
  onlineUsers: new Map<string, { sessionId: string; lastActive: Date }>(), // Track online users for random chat
  // New storage for Posts, Polls, Questions, Discussions
  posts: new Map<string, any>(),
  postComments: new Map<string, any[]>(),
  postLikes: new Map<string, Set<string>>(),
  polls: new Map<string, any>(),
  pollVotes: new Map<string, Map<string, string>>(), // pollId -> userId -> optionId
  pollComments: new Map<string, any[]>(), // Store comments per poll
  questions: new Map<string, any>(),
  questionAnswers: new Map<string, any[]>(),
  questionUpvotes: new Map<string, Set<string>>(),
  discussions: new Map<string, any>(),
  discussionComments: new Map<string, any[]>(),
  discussionLikes: new Map<string, Set<string>>(),
};

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

// Helper function to proxy ALL requests to the microservices gateway
async function proxyToGateway(req: Request, res: Response, path: string): Promise<boolean> {
  try {
    // Build full URL with query parameters
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const url = `${GATEWAY_URL}${path}${queryString}`;
    
    console.log(`[GATEWAY PROXY] ${req.method} ${path} -> ${url}`);

    // Create headers object - forward all relevant headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Forward authorization header
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization as string;
    }
    
    // Forward custom headers
    if (req.headers['x-user-id']) {
      headers['X-User-Id'] = req.headers['x-user-id'] as string;
    }
    if (req.headers['x-anonymous-session']) {
      headers['X-Anonymous-Session'] = req.headers['x-anonymous-session'] as string;
    }
    if (req.headers['x-session-id']) {
      headers['X-Session-Id'] = req.headers['x-session-id'] as string;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      signal: controller.signal,
    };

    // Add body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    
    // If gateway returns 503 (Service Unavailable) or 404 (Not Found), use local fallback
    // This allows the local server to handle requests when microservices are unavailable
    if (response.status === 503 || response.status === 404) {
      console.log(`[GATEWAY PROXY] Gateway returned ${response.status} for ${path}, using local fallback`);
      return false;
    }
    
    // Get response as text first
    const responseText = await response.text();
    
    // Forward response status
    res.status(response.status);
    
    // Set content type based on response
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    // Send response
    res.send(responseText);
    return true;

  } catch (error) {
    console.log(`[GATEWAY PROXY] Gateway unavailable for ${path}, using fallback`);
    return false;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files statically
  app.use("/uploads", express.static(uploadDir));

  // ==================== AUTH ROUTES ====================
  app.post("/api/auth/signup", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { email, password, name, username, bio, location, avatarUrl, interests } = req.body;
    
    // Check if username exists
    for (const [, user] of storage.users) {
      if (user.username === username) {
        return res.status(400).json({ success: false, error: "Username already exists" });
      }
    }
    
    const userId = generateId();
    const user = {
      id: userId,
      email,
      name,
      username,
      bio: bio || "",
      location: location || "",
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      interests: interests || [],
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      isPrivate: false,
      isVerified: false,
      createdAt: new Date().toISOString(),
    };
    
    storage.users.set(userId, user);
    
    res.json({
      success: true,
      user: { id: userId, username, name, avatarUrl: user.avatarUrl },
      accessToken: `mock-token-${userId}`,
      refreshToken: `mock-refresh-${userId}`,
    });
  });
  
  app.post("/api/auth/login", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { usernameOrEmail } = req.body;
    
    // Find user by username or email
    let foundUser = null;
    for (const [, user] of storage.users) {
      if (user.username === usernameOrEmail || user.email === usernameOrEmail) {
        foundUser = user;
        break;
      }
    }
    
    if (!foundUser) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }
    
    res.json({
      success: true,
      user: { id: foundUser.id, username: foundUser.username, name: foundUser.name, avatarUrl: foundUser.avatarUrl },
      accessToken: `mock-token-${foundUser.id}`,
      refreshToken: `mock-refresh-${foundUser.id}`,
    });
  });
  
  app.get("/api/auth/check-username", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const username = req.query.username as string;
    let available = true;
    
    for (const [, user] of storage.users) {
      if (user.username === username) {
        available = false;
        break;
      }
    }
    
    res.json({ available, suggestions: available ? [] : [`${username}1`, `${username}_`, `${username}2`] });
  });
  
  app.post("/api/auth/refresh", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: "No refresh token" });
    }
    
    // Extract user ID from mock refresh token
    const userId = refreshToken.replace('mock-refresh-', '');
    res.json({
      success: true,
      accessToken: `mock-token-${userId}-${Date.now()}`,
    });
  });
  
  app.post("/api/auth/logout", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    res.json({ success: true });
  });
  
  app.get("/api/auth/sessions", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    // Return mock session data
    res.json([
      {
        id: "current-session",
        device: "Current Device",
        location: "Your Location",
        lastActive: new Date().toISOString(),
        isCurrent: true,
      }
    ]);
  });

  // ==================== USER ROUTES ====================
  app.get("/api/users/search", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const query = (req.query.q as string || "").toLowerCase();
    const users = Array.from(storage.users.values()).filter(u =>
      u.name.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query)
    );
    res.json(users);
  });
  
  app.get("/api/users/username/:username", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { username } = req.params;
    for (const [, user] of storage.users) {
      if (user.username === username) {
        return res.json(user);
      }
    }
    res.status(404).json({ error: "User not found" });
  });
  
  app.get("/api/users/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const user = storage.users.get(id);
    if (user) {
      return res.json(user);
    }
    // Return mock user for unknown IDs
    res.json({
      id,
      username: "user",
      name: "Unknown User",
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
    });
  });
  
  app.patch("/api/users/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const user = storage.users.get(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const updatedUser = { ...user, ...req.body };
    storage.users.set(id, updatedUser);
    res.json(updatedUser);
  });
  
  app.delete("/api/users/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    storage.users.delete(id);
    res.json({ success: true });
  });
  
  app.post("/api/users/:id/password", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    res.json({ success: true });
  });

  // ==================== FOLLOW ROUTES (Instagram-style) ====================
  app.post("/api/users/:followerId/follow/:followingId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { followerId, followingId } = req.params;
    const targetUser = storage.users.get(followingId);
    
    // If target user is private, create a follow request
    if (targetUser?.isPrivate) {
      const requestId = `${followerId}-${followingId}`;
      storage.followRequests.set(requestId, {
        id: requestId,
        followerId,
        followingId,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      
      // Create notification for follow request
      const notifId = generateId();
      storage.notifications.set(notifId, {
        id: notifId,
        userId: followingId,
        type: "follow_request",
        title: "Follow Request",
        description: `Someone wants to follow you`,
        relatedUserIds: [followerId],
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      
      return res.json({ success: true, status: "requested" });
    }
    
    // Public account - direct follow
    const followId = `${followerId}-${followingId}`;
    storage.follows.set(followId, {
      id: followId,
      followerId,
      followingId,
      createdAt: new Date().toISOString(),
    });
    
    // Update follower/following counts
    const follower = storage.users.get(followerId);
    if (follower) {
      follower.followingCount = (follower.followingCount || 0) + 1;
      storage.users.set(followerId, follower);
    }
    if (targetUser) {
      targetUser.followersCount = (targetUser.followersCount || 0) + 1;
      storage.users.set(followingId, targetUser);
    }
    
    // Create notification for new follower
    const notifId = generateId();
    storage.notifications.set(notifId, {
      id: notifId,
      userId: followingId,
      type: "follow",
      title: "New Follower",
      description: `Someone started following you`,
      relatedUserIds: [followerId],
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    
    res.json({ success: true, status: "following" });
  });
  
  app.delete("/api/users/:followerId/unfollow/:followingId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { followerId, followingId } = req.params;
    const followId = `${followerId}-${followingId}`;
    
    // Remove follow
    if (storage.follows.has(followId)) {
      storage.follows.delete(followId);
      
      // Update counts
      const follower = storage.users.get(followerId);
      if (follower) {
        follower.followingCount = Math.max(0, (follower.followingCount || 1) - 1);
        storage.users.set(followerId, follower);
      }
      const following = storage.users.get(followingId);
      if (following) {
        following.followersCount = Math.max(0, (following.followersCount || 1) - 1);
        storage.users.set(followingId, following);
      }
    }
    
    // Also remove any pending request
    storage.followRequests.delete(followId);
    
    res.json({ success: true });
  });
  
  app.get("/api/users/:userId/followers", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { userId } = req.params;
    const followers = [];
    for (const [, follow] of storage.follows) {
      if (follow.followingId === userId) {
        const user = storage.users.get(follow.followerId);
        if (user) followers.push(user);
      }
    }
    res.json(followers);
  });
  
  app.get("/api/users/:userId/following", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { userId } = req.params;
    const following = [];
    for (const [, follow] of storage.follows) {
      if (follow.followerId === userId) {
        const user = storage.users.get(follow.followingId);
        if (user) following.push(user);
      }
    }
    res.json(following);
  });
  
  app.get("/api/users/:followerId/following/:followingId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { followerId, followingId } = req.params;
    const followId = `${followerId}-${followingId}`;
    const requestId = `${followerId}-${followingId}`;
    
    const isFollowing = storage.follows.has(followId);
    const isPending = storage.followRequests.has(requestId);
    
    res.json({ isFollowing, isPending });
  });
  
  // Follow request management
  app.post("/api/users/:userId/follow-requests/:requesterId/accept", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { userId, requesterId } = req.params;
    const requestId = `${requesterId}-${userId}`;
    
    const request = storage.followRequests.get(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }
    
    // Create the follow
    const followId = `${requesterId}-${userId}`;
    storage.follows.set(followId, {
      id: followId,
      followerId: requesterId,
      followingId: userId,
      createdAt: new Date().toISOString(),
    });
    
    // Update counts
    const follower = storage.users.get(requesterId);
    if (follower) {
      follower.followingCount = (follower.followingCount || 0) + 1;
      storage.users.set(requesterId, follower);
    }
    const following = storage.users.get(userId);
    if (following) {
      following.followersCount = (following.followersCount || 0) + 1;
      storage.users.set(userId, following);
    }
    
    // Remove request
    storage.followRequests.delete(requestId);
    
    // Create notification for accepted request
    const notifId = generateId();
    storage.notifications.set(notifId, {
      id: notifId,
      userId: requesterId,
      type: "follow_accepted",
      title: "Follow Request Accepted",
      description: `Your follow request was accepted`,
      relatedUserIds: [userId],
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    
    res.json({ success: true });
  });
  
  app.post("/api/users/:userId/follow-requests/:requesterId/reject", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { userId, requesterId } = req.params;
    const requestId = `${requesterId}-${userId}`;
    storage.followRequests.delete(requestId);
    res.json({ success: true });
  });
  
  app.get("/api/users/:userId/follow-requests", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { userId } = req.params;
    const requests = [];
    for (const [, request] of storage.followRequests) {
      if (request.followingId === userId && request.status === "pending") {
        const user = storage.users.get(request.followerId);
        if (user) {
          requests.push({ ...request, user });
        }
      }
    }
    res.json(requests);
  });

  // ==================== ACTIVITY ROUTES ====================
  app.get("/api/activities", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const activities = Array.from(storage.activities.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(activities);
  });
  
  app.get("/api/activities/user/:userId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { userId } = req.params;
    const activities = Array.from(storage.activities.values())
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(activities);
  });
  
  app.get("/api/activities/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const activity = storage.activities.get(id);
    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }
    res.json(activity);
  });
  
  app.post("/api/activities", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const id = generateId();
    const activity = {
      id,
      ...req.body,
      likesCount: 0,
      commentsCount: 0,
      participantsCount: 0,
      createdAt: new Date().toISOString(),
    };
    storage.activities.set(id, activity);
    
    // Update user's post count
    const user = storage.users.get(activity.userId);
    if (user) {
      user.postsCount = (user.postsCount || 0) + 1;
      storage.users.set(activity.userId, user);
    }
    
    res.json(activity);
  });
  
  app.patch("/api/activities/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const activity = storage.activities.get(id);
    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }
    const updated = { ...activity, ...req.body };
    storage.activities.set(id, updated);
    res.json(updated);
  });
  
  app.delete("/api/activities/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    storage.activities.delete(id);
    res.json({ success: true });
  });
  
  app.post("/api/activities/:id/like", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { increment, userId } = req.body;
    const activity = storage.activities.get(id);
    if (activity) {
      activity.likesCount = (activity.likesCount || 0) + (increment ? 1 : -1);
      storage.activities.set(id, activity);
      
      // Create notification for activity owner when someone likes (only on like, not unlike)
      if (increment && activity.userId && userId && activity.userId !== userId) {
        const liker = storage.users.get(userId);
        const notifId = generateId();
        storage.notifications.set(notifId, {
          id: notifId,
          userId: activity.userId,
          type: "like",
          title: liker?.name || "Someone",
          description: `liked your activity "${activity.title}"`,
          relatedUserIds: [userId],
          relatedId: id,
          actionUrl: `/activity/${id}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    res.json({ success: true });
  });
  
  app.post("/api/activities/:id/join", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const activity = storage.activities.get(id);
    if (activity) {
      activity.participantsCount = (activity.participantsCount || 0) + 1;
      storage.activities.set(id, activity);
    }
    res.json({ success: true });
  });
  
  // GET comments for an activity
  app.get("/api/activities/:id/comments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const comments = storage.activityComments.get(id) || [];
    res.json(comments);
  });

  // POST a new comment on an activity
  app.post("/api/activities/:id/comments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { content, userId, parentCommentId } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Comment content is required" });
    }
    
    // Get user info for the comment
    const user = storage.users.get(userId);
    
    const commentId = generateId();
    const comment = {
      id: commentId,
      activityId: id,
      userId: userId || 'anonymous',
      userName: user?.name || 'User',
      username: user?.username || 'user',
      userAvatar: user?.avatarUrl,
      content,
      parentCommentId: parentCommentId || null,
      likesCount: 0,
      createdAt: new Date().toISOString(),
    };
    
    // Store the comment
    const comments = storage.activityComments.get(id) || [];
    comments.push(comment);
    storage.activityComments.set(id, comments);
    
    // Update activity comments count
    const activity = storage.activities.get(id);
    if (activity) {
      activity.commentsCount = (activity.commentsCount || 0) + 1;
      storage.activities.set(id, activity);
      
      // Create notification based on comment type
      if (parentCommentId) {
        const parentComment = comments.find(c => c.id === parentCommentId);
        if (parentComment && parentComment.userId && userId && parentComment.userId !== userId) {
          const notifId = generateId();
          storage.notifications.set(notifId, {
            id: notifId,
            userId: parentComment.userId,
            type: "comment_reply",
            title: user?.name || "Someone",
            description: `replied to your comment: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
            relatedUserIds: [userId],
            relatedId: userId,
            entityId: id,
            actionUrl: `/activity/${id}`,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      } else if (activity.userId && userId && activity.userId !== userId) {
        const notifId = generateId();
        storage.notifications.set(notifId, {
          id: notifId,
          userId: activity.userId,
          type: "activity_comment",
          title: user?.name || "Someone",
          description: `commented on your activity: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          relatedUserIds: [userId],
          relatedId: userId,
          entityId: id,
          actionUrl: `/activity/${id}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    res.json(comment);
  });

  // ==================== EVENT ROUTES ====================
  app.get("/api/events", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const events = Array.from(storage.events.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(events);
  });
  
  app.get("/api/events/user/:userId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { userId } = req.params;
    const events = Array.from(storage.events.values())
      .filter(e => e.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(events);
  });
  
  app.get("/api/events/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const event = storage.events.get(id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(event);
  });
  
  app.post("/api/events", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const id = generateId();
    const event = {
      id,
      ...req.body,
      attendeesCount: 0,
      createdAt: new Date().toISOString(),
    };
    storage.events.set(id, event);
    
    // Update user's post count
    const user = storage.users.get(event.userId);
    if (user) {
      user.postsCount = (user.postsCount || 0) + 1;
      storage.users.set(event.userId, user);
    }
    
    res.json(event);
  });
  
  app.patch("/api/events/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const event = storage.events.get(id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    const updated = { ...event, ...req.body };
    storage.events.set(id, updated);
    res.json(updated);
  });
  
  app.delete("/api/events/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    storage.events.delete(id);
    res.json({ success: true });
  });
  
  app.get("/api/events/:id/guests", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    res.json([]);
  });
  
  app.post("/api/events/:id/join", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { userId } = req.body;
    const event = storage.events.get(id);
    if (event) {
      event.attendeesCount = (event.attendeesCount || 0) + 1;
      storage.events.set(id, event);
      
      // Create notification for event host when someone joins (except self-join)
      if (event.userId && userId && event.userId !== userId) {
        const joiner = storage.users.get(userId);
        const notifId = generateId();
        storage.notifications.set(notifId, {
          id: notifId,
          userId: event.userId,
          type: "event",
          title: joiner?.name || "Someone",
          description: `is attending your event "${event.title}"`,
          relatedUserIds: [userId],
          relatedId: id,
          actionUrl: `/event/${id}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    res.json({ success: true });
  });
  
  app.get("/api/events/:id/comments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const comments = storage.eventComments.get(id) || [];
    res.json(comments);
  });
  
  app.post("/api/events/:id/comments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { content, userId, parentCommentId } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Comment content is required" });
    }
    
    // Get user info for the comment
    const user = storage.users.get(userId);
    
    const commentId = generateId();
    const comment = {
      id: commentId,
      eventId: id,
      userId: userId || 'anonymous',
      userName: user?.name || 'User',
      username: user?.username || 'user',
      userAvatar: user?.avatarUrl,
      content,
      parentCommentId: parentCommentId || null,
      likesCount: 0,
      createdAt: new Date().toISOString(),
    };
    
    // Store the comment
    const comments = storage.eventComments.get(id) || [];
    comments.push(comment);
    storage.eventComments.set(id, comments);
    
    // Update event comments count
    const event = storage.events.get(id);
    if (event) {
      event.commentsCount = (event.commentsCount || 0) + 1;
      storage.events.set(id, event);
      
      // Create notification based on comment type (reply vs regular comment)
      if (parentCommentId) {
        // Reply notification - find parent comment owner
        const parentComment = comments.find(c => c.id === parentCommentId);
        if (parentComment && parentComment.userId && userId && parentComment.userId !== userId) {
          const notifId = generateId();
          storage.notifications.set(notifId, {
            id: notifId,
            userId: parentComment.userId,
            type: "comment_reply",
            title: user?.name || "Someone",
            description: `replied to your comment: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
            relatedUserIds: [userId],
            relatedId: userId,
            entityId: id,
            actionUrl: `/event/${id}`,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      } else if (event.userId && userId && event.userId !== userId) {
        // Regular comment notification to event owner
        const notifId = generateId();
        storage.notifications.set(notifId, {
          id: notifId,
          userId: event.userId,
          type: "event_comment",
          title: user?.name || "Someone",
          description: `commented on your event: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          relatedUserIds: [userId],
          relatedId: userId,
          entityId: id,
          actionUrl: `/event/${id}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    res.json(comment);
  });
  
  // Like event
  app.post("/api/events/:id/like", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { increment, userId } = req.body;
    const event = storage.events.get(id);
    
    if (event) {
      // Track user likes to prevent double-liking
      let eventLikes = storage.eventLikes.get(id);
      if (!eventLikes) {
        eventLikes = new Set();
        storage.eventLikes.set(id, eventLikes);
      }
      
      if (increment && !eventLikes.has(userId)) {
        eventLikes.add(userId);
        event.likesCount = (event.likesCount || 0) + 1;
        
        // Create notification for event owner when someone likes
        if (event.userId && userId && event.userId !== userId) {
          const liker = storage.users.get(userId);
          const notifId = generateId();
          storage.notifications.set(notifId, {
            id: notifId,
            userId: event.userId,
            type: "like",
            title: liker?.name || "Someone",
            description: `liked your event "${event.title}"`,
            relatedUserIds: [userId],
            relatedId: id,
            actionUrl: `/event/${id}`,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      } else if (!increment && eventLikes.has(userId)) {
        eventLikes.delete(userId);
        event.likesCount = Math.max(0, (event.likesCount || 0) - 1);
      }
      
      storage.events.set(id, event);
    }
    
    res.json({ success: true });
  });

  // ==================== GROUP ROUTES ====================
  app.get("/api/groups", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const groups = Array.from(storage.groups.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(groups);
  });
  
  app.get("/api/groups/user/:userId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { userId } = req.params;
    const userGroups = [];
    
    // Find groups where user is a member
    for (const [, member] of storage.groupMembers) {
      if (member.userId === userId) {
        const group = storage.groups.get(member.groupId);
        if (group) userGroups.push(group);
      }
    }
    
    // Also include groups created by user
    for (const [, group] of storage.groups) {
      if (group.userId === userId && !userGroups.find(g => g.id === group.id)) {
        userGroups.push(group);
      }
    }
    
    res.json(userGroups);
  });
  
  app.get("/api/groups/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const group = storage.groups.get(id);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    res.json(group);
  });
  
  app.post("/api/groups", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const id = generateId();
    const creatorId = req.body.userId || req.headers['x-user-id'];
    const creator = storage.users.get(creatorId as string);
    
    const group = {
      id,
      ...req.body,
      userId: creatorId,
      imageUrl: req.body.imageUrl || null, // Support group profile picture
      membersCount: 1,
      createdAt: new Date().toISOString(),
    };
    storage.groups.set(id, group);
    
    // Add creator as admin member with real user data
    const memberId = generateId();
    storage.groupMembers.set(memberId, {
      id: memberId,
      groupId: id,
      userId: creatorId,
      name: creator?.name || "Unknown",
      username: creator?.username || `user_${creatorId}`,
      avatarUrl: creator?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${creatorId}`,
      role: "admin",
      joinedAt: new Date().toISOString(),
    });
    
    res.json(group);
  });
  
  app.patch("/api/groups/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const group = storage.groups.get(id);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }
    const updated = { ...group, ...req.body };
    storage.groups.set(id, updated);
    res.json(updated);
  });
  
  app.delete("/api/groups/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    storage.groups.delete(id);
    res.json({ success: true });
  });
  
  app.get("/api/groups/:id/members", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const members = [];
    for (const [, member] of storage.groupMembers) {
      if (member.groupId === id) {
        const user = storage.users.get(member.userId);
        if (user) {
          members.push({ ...member, user });
        }
      }
    }
    res.json(members);
  });
  
  app.post("/api/groups/:id/join", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { userId } = req.body;
    
    const memberId = generateId();
    storage.groupMembers.set(memberId, {
      id: memberId,
      groupId: id,
      userId,
      role: "member",
      joinedAt: new Date().toISOString(),
    });
    
    // Update member count
    const group = storage.groups.get(id);
    if (group) {
      group.membersCount = (group.membersCount || 0) + 1;
      storage.groups.set(id, group);
    }
    
    res.json({ success: true });
  });

  // ==================== MESSAGE ROUTES ====================
  app.get("/api/messages", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { groupId, userId } = req.query;
    let messages = Array.from(storage.messages.values());
    
    if (groupId) {
      messages = messages.filter(m => m.groupId === groupId);
    }
    if (userId) {
      messages = messages.filter(m => m.senderId === userId || m.recipientId === userId);
    }
    
    res.json(messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  });
  
  app.get("/api/messages/group/:groupId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { groupId } = req.params;
    const messages = Array.from(storage.messages.values())
      .filter(m => m.groupId === groupId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    res.json(messages);
  });
  
  app.get("/api/messages/direct/:userId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { userId } = req.params;
    const currentUserId = req.headers['x-user-id'] as string;
    const messages = Array.from(storage.messages.values())
      .filter(m => 
        (m.senderId === currentUserId && m.recipientId === userId) ||
        (m.senderId === userId && m.recipientId === currentUserId)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    res.json(messages);
  });
  
  app.post("/api/messages", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const id = generateId();
    const message = {
      id,
      ...req.body,
      status: "sent",
      seenBy: [],
      reactions: [],
      createdAt: new Date().toISOString(),
    };
    storage.messages.set(id, message);
    res.json(message);
  });
  
  // Mark messages as seen (direct chat)
  app.post("/api/messages/mark-seen", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { recipientId, senderId } = req.body;
    
    // Update all messages from sender to recipient as seen
    for (const [id, message] of storage.messages) {
      if (message.senderId === senderId && message.recipientId === recipientId && message.status !== "seen") {
        message.status = "seen";
        storage.messages.set(id, message);
      }
    }
    
    res.json({ success: true });
  });
  
  // Add reaction to message
  app.post("/api/messages/:messageId/react", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { messageId } = req.params;
    const { userId, emoji } = req.body;
    
    const message = storage.messages.get(messageId);
    if (message) {
      if (!message.reactions) message.reactions = [];
      
      // Remove existing reaction from this user
      message.reactions = message.reactions.filter((r: any) => r.userId !== userId);
      
      // Add new reaction
      message.reactions.push({ userId, emoji });
      storage.messages.set(messageId, message);
    }
    
    res.json({ success: true });
  });
  
  // Poll vote
  app.post("/api/messages/:messageId/poll/vote", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { messageId } = req.params;
    const { userId, optionId } = req.body;
    
    const message = storage.messages.get(messageId);
    if (message && message.poll) {
      // Remove any existing vote from this user
      message.poll.options.forEach((opt: any) => {
        opt.votes = opt.votes.filter((v: string) => v !== userId);
      });
      
      // Add vote to selected option
      const option = message.poll.options.find((opt: any) => opt.id === optionId);
      if (option) {
        option.votes.push(userId);
      }
      
      // Update total votes
      message.poll.totalVotes = message.poll.options.reduce(
        (sum: number, opt: any) => sum + opt.votes.length, 
        0
      );
      
      storage.messages.set(messageId, message);
    }
    
    res.json({ success: true });
  });
  
  // Mark group messages as seen
  app.post("/api/groups/:groupId/messages/mark-seen", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { groupId } = req.params;
    const { userId } = req.body;
    
    // Update all messages in the group to include this user in seenBy
    for (const [id, message] of storage.messages) {
      if (message.groupId === groupId && message.senderId !== userId) {
        if (!message.seenBy) message.seenBy = [];
        if (!message.seenBy.includes(userId)) {
          message.seenBy.push(userId);
        }
        storage.messages.set(id, message);
      }
    }
    
    res.json({ success: true });
  });
  
  app.get("/api/conversations", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    res.json([]);
  });
  
  // Message requests from non-followers (Instagram-style)
  app.get("/api/messages/requests/:userId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { userId } = req.params;
    const requests = [];
    
    // Find messages from users who the current user doesn't follow back
    for (const [, message] of storage.messages) {
      if (message.recipientId === userId && message.isRequest) {
        const sender = storage.users.get(message.senderId);
        if (sender) {
          requests.push({
            ...message,
            sender: {
              id: sender.id,
              name: sender.name,
              username: sender.username,
              avatarUrl: sender.avatarUrl,
            },
          });
        }
      }
    }
    
    // Also check messageRequests storage
    for (const [, request] of storage.messageRequests) {
      if (request.recipientId === userId && request.status === "pending") {
        const sender = storage.users.get(request.senderId);
        if (sender) {
          requests.push({
            ...request,
            sender: {
              id: sender.id,
              name: sender.name,
              username: sender.username,
              avatarUrl: sender.avatarUrl,
            },
          });
        }
      }
    }
    
    res.json(requests);
  });
  
  // Accept message request
  app.post("/api/messages/requests/:requestId/accept", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { requestId } = req.params;
    const request = storage.messageRequests.get(requestId);
    if (request) {
      request.status = "accepted";
      storage.messageRequests.set(requestId, request);
    }
    res.json({ success: true });
  });
  
  // Decline message request
  app.post("/api/messages/requests/:requestId/decline", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { requestId } = req.params;
    storage.messageRequests.delete(requestId);
    res.json({ success: true });
  });
  
  // ==================== RANDOM CHAT ONLINE USERS ====================
  // Get online users count for random chat
  app.get("/api/random-chat/online-count", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    // Clean up stale users (inactive for more than 5 minutes)
    const now = new Date();
    for (const [sessionId, user] of storage.onlineUsers) {
      if (now.getTime() - user.lastActive.getTime() > 5 * 60 * 1000) {
        storage.onlineUsers.delete(sessionId);
      }
    }
    
    res.json({ count: storage.onlineUsers.size });
  });
  
  // Register online user for random chat
  app.post("/api/random-chat/online", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { sessionId } = req.body;
    if (sessionId) {
      storage.onlineUsers.set(sessionId, {
        sessionId,
        lastActive: new Date(),
      });
    }
    res.json({ success: true, onlineCount: storage.onlineUsers.size });
  });
  
  // Unregister online user
  app.delete("/api/random-chat/online/:sessionId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { sessionId } = req.params;
    storage.onlineUsers.delete(sessionId);
    res.json({ success: true });
  });
  
  // Heartbeat to keep user online
  app.post("/api/random-chat/heartbeat", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { sessionId } = req.body;
    if (sessionId && storage.onlineUsers.has(sessionId)) {
      storage.onlineUsers.set(sessionId, {
        sessionId,
        lastActive: new Date(),
      });
    }
    res.json({ success: true, onlineCount: storage.onlineUsers.size });
  });
  
  // Video chat online count
  app.get("/api/video-chat/online-count", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    // Return a portion of online users as video chat users
    const videoOnline = Math.floor(storage.onlineUsers.size * 0.4);
    res.json({ count: videoOnline });
  });

  // GET /api/random-chat/online - Gateway API compatible endpoint
  app.get("/api/random-chat/online", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    // Clean up stale users (inactive for more than 5 minutes)
    const now = new Date();
    for (const [sessionId, user] of storage.onlineUsers) {
      if (now.getTime() - user.lastActive.getTime() > 5 * 60 * 1000) {
        storage.onlineUsers.delete(sessionId);
      }
    }
    
    res.json({ count: storage.onlineUsers.size });
  });

  // GET /api/video-chat/online - Gateway API compatible endpoint
  app.get("/api/video-chat/online", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    // Return video chat stats
    const videoOnline = storage.onlineUsers.size;
    res.json({ 
      count: videoOnline,
      online: videoOnline,
      looking: Math.floor(videoOnline * 0.3),
      inCall: Math.floor(videoOnline * 0.4)
    });
  });

  // POST /api/video-chat/online - Register user online for video chat
  app.post("/api/video-chat/online", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { sessionId, userId, username } = req.body;
    if (sessionId) {
      storage.onlineUsers.set(sessionId, {
        sessionId,
        lastActive: new Date(),
      });
    }
    
    res.json({ 
      success: true, 
      sessionId,
      onlineCount: storage.onlineUsers.size,
      lookingForVideo: Math.floor(storage.onlineUsers.size * 0.3),
      lookingForText: Math.floor(storage.onlineUsers.size * 0.2)
    });
  });

  // DELETE /api/video-chat/online/:sessionId - Unregister user
  app.delete("/api/video-chat/online/:sessionId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { sessionId } = req.params;
    storage.onlineUsers.delete(sessionId);
    res.json({ success: true });
  });

  // POST /api/video-chat/heartbeat - Keep session alive
  app.post("/api/video-chat/heartbeat", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { sessionId } = req.body;
    if (sessionId && storage.onlineUsers.has(sessionId)) {
      storage.onlineUsers.set(sessionId, {
        sessionId,
        lastActive: new Date(),
      });
    }
    
    res.json({ 
      success: true, 
      onlineCount: storage.onlineUsers.size,
      lookingForVideo: Math.floor(storage.onlineUsers.size * 0.3),
      lookingForText: Math.floor(storage.onlineUsers.size * 0.2)
    });
  });

  // GET /api/video-chat/stats - Get video chat statistics
  app.get("/api/video-chat/stats", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const onlineCount = storage.onlineUsers.size;
    res.json({
      onlineUsers: onlineCount,
      lookingForVideo: Math.floor(onlineCount * 0.3),
      lookingForText: Math.floor(onlineCount * 0.2),
      activeRooms: Math.floor(onlineCount * 0.2),
      usersInCall: Math.floor(onlineCount * 0.4),
      status: "online"
    });
  });

  // GET /api/video-chat/queue/status - Get queue status
  app.get("/api/video-chat/queue/status", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const onlineCount = storage.onlineUsers.size;
    res.json({
      videoQueue: Math.floor(onlineCount * 0.3),
      textQueue: Math.floor(onlineCount * 0.2),
      totalLooking: Math.floor(onlineCount * 0.5),
      onlineUsers: onlineCount,
      activeRooms: Math.floor(onlineCount * 0.2)
    });
  });

  // GET /api/video-chat/queue/:sessionId - Check user queue status
  app.get("/api/video-chat/queue/:sessionId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { sessionId } = req.params;
    const isOnline = storage.onlineUsers.has(sessionId);
    
    res.json({
      sessionId,
      inQueue: false,
      inRoom: false,
      roomId: null,
      status: isOnline ? "idle" : "offline"
    });
  });

  // DELETE /api/video-chat/queue/:sessionId - Leave queue
  app.delete("/api/video-chat/queue/:sessionId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    res.json({ success: true, sessionId: req.params.sessionId });
  });

  // GET /api/video-chat/room/session/:sessionId - Get room info by session
  app.get("/api/video-chat/room/session/:sessionId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    res.json({
      inRoom: false,
      sessionId: req.params.sessionId
    });
  });

  // DELETE /api/video-chat/room/session/:sessionId - End room by session
  app.delete("/api/video-chat/room/session/:sessionId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    res.json({ success: true, partnerNotified: false });
  });

  // GET /api/video-chat/ice-servers - WebRTC ICE servers configuration
  app.get("/api/video-chat/ice-servers", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    // Return standard STUN/TURN servers for WebRTC
    res.json([
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
    ]);
  });

  // GET /api/video-chat/health - Health check
  app.get("/api/video-chat/health", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    res.json({ status: "UP", service: "video-chat-service" });
  });

  // ==================== NOTIFICATION ROUTES ====================
  app.get("/api/notifications/:userId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;

    const { userId } = req.params;
    const { type } = req.query;
    let notifications = Array.from(storage.notifications.values());

    // Filter by user ID (required in path)
    notifications = notifications.filter(n => n.userId === userId);

    if (type) {
      notifications = notifications.filter(n => n.type === type);
    }

    res.json(notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  });
  
  app.post("/api/notifications", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const id = generateId();
    const notification = {
      id,
      ...req.body,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    storage.notifications.set(id, notification);
    res.json(notification);
  });
  
  app.patch("/api/notifications/:id/read", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const notification = storage.notifications.get(id);
    if (notification) {
      notification.isRead = true;
      storage.notifications.set(id, notification);
    }
    res.json({ success: true });
  });

  // ==================== MOMENTS ROUTES ====================
  app.get("/api/moments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { visibility } = req.query;
    let moments = Array.from(storage.moments.values());
    
    if (visibility) {
      moments = moments.filter(m => m.visibility === visibility);
    }
    
    // Filter out expired moments
    const now = new Date();
    moments = moments.filter(m => new Date(m.expiresAt) > now);
    
    res.json(moments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  });
  
  app.get("/api/moments/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const moment = storage.moments.get(id);
    if (!moment) {
      return res.status(404).json({ error: "Moment not found" });
    }
    res.json(moment);
  });
  
  app.post("/api/moments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const id = generateId();
    const { 
      mentionedUserIds, 
      mentionedGroupIds, 
      directRecipientIds, 
      directGroupIds,
      visibility,
      expiresAt: customExpiry,
      ...momentData 
    } = req.body;
    
    // Calculate expiry: 24h for public/friends, 7 days for direct share
    const isDirectShare = (directRecipientIds?.length > 0 || directGroupIds?.length > 0);
    const expiresAt = customExpiry || new Date(Date.now() + (isDirectShare ? 7 : 1) * 24 * 60 * 60 * 1000).toISOString();
    
    const moment = {
      id,
      ...momentData,
      visibility: visibility || "friends",
      viewsCount: 0,
      likesCount: 0,
      mentionedUserIds: mentionedUserIds || [],
      mentionedGroupIds: mentionedGroupIds || [],
      directRecipientIds: directRecipientIds || [],
      directGroupIds: directGroupIds || [],
      expiresAt,
      createdAt: new Date().toISOString(),
    };
    storage.moments.set(id, moment);
    
    // Send notifications for mentions
    if (mentionedUserIds?.length > 0) {
      const creator = storage.users.get(momentData.userId);
      for (const mentionedUserId of mentionedUserIds) {
        const notifId = generateId();
        storage.notifications.set(notifId, {
          id: notifId,
          userId: mentionedUserId,
          type: "mention",
          title: creator?.name || "Someone",
          description: `mentioned you in their moment`,
          relatedUserIds: [momentData.userId],
          relatedId: id,
          actionUrl: `/moments`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    // Send notifications for group mentions (to all group members)
    if (mentionedGroupIds?.length > 0) {
      const creator = storage.users.get(momentData.userId);
      for (const groupId of mentionedGroupIds) {
        const group = storage.groups.get(groupId);
        if (group) {
          // Get all group members
          for (const [, member] of storage.groupMembers) {
            if (member.groupId === groupId && member.userId !== momentData.userId) {
              const notifId = generateId();
              storage.notifications.set(notifId, {
                id: notifId,
                userId: member.userId,
                type: "mention",
                title: creator?.name || "Someone",
                description: `mentioned ${group.name} in their moment`,
                relatedUserIds: [momentData.userId],
                relatedId: id,
                actionUrl: `/moments`,
                isRead: false,
                createdAt: new Date().toISOString(),
              });
            }
          }
        }
      }
    }
    
    // Send notifications for direct shares
    if (directRecipientIds?.length > 0) {
      const creator = storage.users.get(momentData.userId);
      for (const recipientId of directRecipientIds) {
        const notifId = generateId();
        storage.notifications.set(notifId, {
          id: notifId,
          userId: recipientId,
          type: "moment",
          title: creator?.name || "Someone",
          description: `sent you a moment`,
          relatedUserIds: [momentData.userId],
          relatedId: id,
          actionUrl: `/moments`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    res.json(moment);
  });
  
  app.delete("/api/moments/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    storage.moments.delete(id);
    res.json({ success: true });
  });
  
  app.post("/api/moments/:id/like", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { userId, increment = true } = req.body;
    const moment = storage.moments.get(id);
    
    if (moment) {
      // Track user likes to prevent double-liking
      let momentLikes = storage.momentLikes.get(id);
      if (!momentLikes) {
        momentLikes = new Set();
        storage.momentLikes.set(id, momentLikes);
      }
      
      if (increment && !momentLikes.has(userId)) {
        momentLikes.add(userId);
        moment.likesCount = (moment.likesCount || 0) + 1;
        
        // Create notification for moment owner when someone likes
        if (moment.userId && userId && moment.userId !== userId) {
          const liker = storage.users.get(userId);
          const notifId = generateId();
          storage.notifications.set(notifId, {
            id: notifId,
            userId: moment.userId,
            type: "like",
            title: liker?.name || "Someone",
            description: `liked your moment`,
            relatedUserIds: [userId],
            relatedId: id,
            actionUrl: `/moments`,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      } else if (!increment && momentLikes.has(userId)) {
        momentLikes.delete(userId);
        moment.likesCount = Math.max(0, (moment.likesCount || 0) - 1);
      }
      
      storage.moments.set(id, moment);
    }
    res.json({ success: true });
  });
  
  app.post("/api/moments/:id/view", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const moment = storage.moments.get(id);
    if (moment) {
      moment.viewsCount = (moment.viewsCount || 0) + 1;
      storage.moments.set(id, moment);
    }
    res.json({ success: true });
  });
  
  // GET comments for a moment
  app.get("/api/moments/:id/comments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const comments = storage.momentComments.get(id) || [];
    res.json(comments);
  });
  
  // POST a new comment on a moment
  app.post("/api/moments/:id/comments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { content } = req.body;
    // Get userId from body OR from X-User-Id header (like the Java backend does)
    const userId = req.body.userId || req.headers['x-user-id'] as string;
    
    if (!content) {
      return res.status(400).json({ error: "Comment content is required" });
    }
    
    // Get user info for the comment
    const user = storage.users.get(userId);
    
    const commentId = generateId();
    const comment = {
      id: commentId,
      momentId: id,
      userId: userId || 'anonymous',
      userName: user?.name || 'User',
      username: user?.username || 'user',
      userAvatar: user?.avatarUrl,
      content,
      createdAt: new Date().toISOString(),
    };
    
    // Store the comment
    const comments = storage.momentComments.get(id) || [];
    comments.push(comment);
    storage.momentComments.set(id, comments);
    
    // Update moment comments count
    const moment = storage.moments.get(id);
    if (moment) {
      moment.commentsCount = (moment.commentsCount || 0) + 1;
      storage.moments.set(id, moment);
      
      // Create notification for moment owner when someone comments (except self-comments)
      if (moment.userId && userId && moment.userId !== userId) {
        const notifId = generateId();
        storage.notifications.set(notifId, {
          id: notifId,
          userId: moment.userId,
          type: "moment_comment",
          title: user?.name || "Someone",
          description: `commented on your moment: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          relatedUserIds: [userId],
          relatedId: userId,
          entityId: id,
          actionUrl: `/moments`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    res.json(comment);
  });

  // ==================== MARKETPLACE ROUTES ====================
  // Jobs
  app.get("/api/jobs", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    res.json(Array.from(storage.jobs.values()));
  });
  
  app.get("/api/jobs/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const job = storage.jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  });
  
  app.post("/api/jobs", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const id = generateId();
    const job = { id, ...req.body, createdAt: new Date().toISOString() };
    storage.jobs.set(id, job);
    res.json(job);
  });
  
  // Deals
  app.get("/api/deals", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    res.json(Array.from(storage.deals.values()));
  });
  
  app.get("/api/deals/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const deal = storage.deals.get(req.params.id);
    if (!deal) return res.status(404).json({ error: "Deal not found" });
    res.json(deal);
  });
  
  app.post("/api/deals", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const id = generateId();
    const deal = { id, ...req.body, createdAt: new Date().toISOString() };
    storage.deals.set(id, deal);
    res.json(deal);
  });
  
  // Places
  app.get("/api/places", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    res.json(Array.from(storage.places.values()));
  });
  
  app.get("/api/places/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const place = storage.places.get(req.params.id);
    if (!place) return res.status(404).json({ error: "Place not found" });
    res.json(place);
  });
  
  app.post("/api/places", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const id = generateId();
    const place = { id, ...req.body, createdAt: new Date().toISOString() };
    storage.places.set(id, place);
    res.json(place);
  });
  
  // Pages
  app.get("/api/pages", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    res.json(Array.from(storage.pages.values()));
  });
  
  app.get("/api/pages/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const page = storage.pages.get(req.params.id);
    if (!page) return res.status(404).json({ error: "Page not found" });
    res.json(page);
  });
  
  app.post("/api/pages", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const id = generateId();
    const page = { id, ...req.body, createdAt: new Date().toISOString() };
    storage.pages.set(id, page);
    res.json(page);
  });

  // ==================== SHOTS ROUTES ====================
  
  // Shot video upload - dedicated endpoint for shot videos
  app.post("/api/shots/upload", upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No video file uploaded" });
      }
      
      // Validate it's a video
      if (!req.file.mimetype.startsWith('video/')) {
        return res.status(400).json({ success: false, error: "Only video files are allowed" });
      }
      
      const id = generateId();
      const userId = req.body.userId || req.headers['x-user-id'] || 'anonymous';
      
      // Generate public URL for the uploaded file
      const fileUrl = `/uploads/${req.file.filename}`;
      
      console.log('Shot video uploaded:', { id, fileUrl, userId, filename: req.file.filename });
      
      res.json({
        success: true,
        id,
        url: fileUrl,
        fileName: req.file.originalname,
        contentType: req.file.mimetype,
        fileSize: req.file.size,
        mediaType: 'VIDEO',
        userId,
      });
    } catch (error) {
      console.error('Shot upload error:', error);
      res.status(500).json({ success: false, error: "Upload failed" });
    }
  });
  
  app.get("/api/shots", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { userId, limit } = req.query;
    let shots = Array.from(storage.shots.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (userId) {
      shots = shots.filter(s => s.userId === userId);
    }
    if (limit) {
      shots = shots.slice(0, parseInt(limit as string));
    }
    res.json(shots);
  });

  app.get("/api/shots/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const shot = storage.shots.get(id);
    if (!shot) {
      return res.status(404).json({ error: "Shot not found" });
    }
    res.json(shot);
  });

  app.post("/api/shots", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const userId = req.body.userId || req.headers['x-user-id'] as string;
    const id = generateId();
    const shot = {
      id,
      userId: userId || 'anonymous',
      videoUrl: req.body.videoUrl,
      thumbnailUrl: req.body.thumbnailUrl,
      caption: req.body.caption || '',
      musicId: req.body.musicId,
      musicTitle: req.body.musicTitle,
      duration: req.body.duration || 0,
      visibility: req.body.visibility || 'public',
      viewsCount: 0,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      createdAt: new Date().toISOString(),
    };
    storage.shots.set(id, shot);
    res.json(shot);
  });

  app.delete("/api/shots/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const userId = req.body.userId || req.headers['x-user-id'] as string;
    
    const shot = storage.shots.get(id);
    if (!shot) {
      return res.status(404).json({ error: "Shot not found" });
    }
    
    // Only the owner can delete their shot
    if (shot.userId !== userId) {
      return res.status(403).json({ error: "Not authorized to delete this shot" });
    }
    
    storage.shots.delete(id);
    storage.shotComments.delete(id);
    storage.shotLikes.delete(id);
    res.json({ success: true });
  });

  // Shot view tracking
  app.post("/api/shots/:id/view", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const shot = storage.shots.get(id);
    if (shot) {
      shot.viewsCount = (shot.viewsCount || 0) + 1;
      storage.shots.set(id, shot);
    }
    res.json({ success: true, viewsCount: shot?.viewsCount || 0 });
  });

  // Shot like
  app.post("/api/shots/:id/like", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const userId = req.body.userId || req.headers['x-user-id'] as string;
    
    const shot = storage.shots.get(id);
    if (!shot) {
      return res.status(404).json({ error: "Shot not found" });
    }
    
    const likes = storage.shotLikes.get(id) || new Set<string>();
    if (!likes.has(userId)) {
      likes.add(userId);
      storage.shotLikes.set(id, likes);
      shot.likesCount = likes.size;
      storage.shots.set(id, shot);
      
      // Create notification for shot owner
      if (shot.userId && userId && shot.userId !== userId) {
        const user = storage.users.get(userId);
        const notifId = generateId();
        storage.notifications.set(notifId, {
          id: notifId,
          userId: shot.userId,
          type: "shot_like",
          title: user?.name || "Someone",
          description: "liked your shot",
          relatedUserIds: [userId],
          relatedId: userId,
          entityId: id,
          actionUrl: `/shots`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    res.json({ success: true, liked: true, likesCount: shot.likesCount });
  });

  // Shot unlike
  app.delete("/api/shots/:id/like", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const userId = req.body.userId || req.headers['x-user-id'] as string;
    
    const shot = storage.shots.get(id);
    if (shot) {
      const likes = storage.shotLikes.get(id) || new Set<string>();
      likes.delete(userId);
      storage.shotLikes.set(id, likes);
      shot.likesCount = likes.size;
      storage.shots.set(id, shot);
    }
    res.json({ success: true, liked: false, likesCount: shot?.likesCount || 0 });
  });

  // Check if shot is liked
  app.get("/api/shots/:id/liked", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const userId = req.headers['x-user-id'] as string;
    const likes = storage.shotLikes.get(id) || new Set<string>();
    res.json({ liked: likes.has(userId) });
  });

  // Shot comments
  app.get("/api/shots/:id/comments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const allComments = storage.shotComments.get(id) || [];
    
    // Organize into threads
    const parentComments = allComments.filter(c => !c.parentCommentId);
    const result = parentComments.map(parent => ({
      ...parent,
      replies: allComments.filter(c => c.parentCommentId === parent.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }));
    
    res.json(result);
  });

  app.post("/api/shots/:id/comments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.body.userId || req.headers['x-user-id'] as string;
    
    if (!content) {
      return res.status(400).json({ error: "Comment content is required" });
    }
    
    const user = storage.users.get(userId);
    const commentId = generateId();
    const comment = {
      id: commentId,
      shotId: id,
      userId: userId || 'anonymous',
      userName: user?.name || 'User',
      username: user?.username || 'user',
      userAvatar: user?.avatarUrl,
      content,
      parentCommentId: parentCommentId || null,
      likesCount: 0,
      createdAt: new Date().toISOString(),
    };
    
    const comments = storage.shotComments.get(id) || [];
    comments.push(comment);
    storage.shotComments.set(id, comments);
    
    const shot = storage.shots.get(id);
    if (shot) {
      shot.commentsCount = (shot.commentsCount || 0) + 1;
      storage.shots.set(id, shot);
      
      // Create notification
      if (parentCommentId) {
        const parentComment = comments.find(c => c.id === parentCommentId);
        if (parentComment && parentComment.userId && userId && parentComment.userId !== userId) {
          const notifId = generateId();
          storage.notifications.set(notifId, {
            id: notifId,
            userId: parentComment.userId,
            type: "comment_reply",
            title: user?.name || "Someone",
            description: `replied to your comment: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
            relatedUserIds: [userId],
            relatedId: userId,
            entityId: id,
            actionUrl: `/shots`,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      } else if (shot.userId && userId && shot.userId !== userId) {
        const notifId = generateId();
        storage.notifications.set(notifId, {
          id: notifId,
          userId: shot.userId,
          type: "shot_comment",
          title: user?.name || "Someone",
          description: `commented on your shot: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          relatedUserIds: [userId],
          relatedId: userId,
          entityId: id,
          actionUrl: `/shots`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    res.json(comment);
  });

  // Shot share
  app.post("/api/shots/:id/share", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const userId = req.body.userId || req.headers['x-user-id'] as string;
    
    const shot = storage.shots.get(id);
    if (shot) {
      shot.sharesCount = (shot.sharesCount || 0) + 1;
      storage.shots.set(id, shot);
      
      // Create notification for shot owner
      if (shot.userId && userId && shot.userId !== userId) {
        const user = storage.users.get(userId);
        const notifId = generateId();
        storage.notifications.set(notifId, {
          id: notifId,
          userId: shot.userId,
          type: "shot_share",
          title: user?.name || "Someone",
          description: "shared your shot",
          relatedUserIds: [userId],
          relatedId: userId,
          entityId: id,
          actionUrl: `/shots`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    res.json({ success: true, sharesCount: shot?.sharesCount || 0 });
  });

  // ==================== NEWS ROUTES ====================
  // In-memory storage for news
  const newsStorage = new Map<string, any>();
  const newsComments = new Map<string, any[]>();
  
  app.get("/api/news", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    const news = Array.from(newsStorage.values())
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    res.json(news);
  });
  
  app.get("/api/news/user/:userId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    const { userId } = req.params;
    const news = Array.from(newsStorage.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    res.json(news);
  });
  
  app.get("/api/news/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const news = newsStorage.get(id);
    if (!news) {
      return res.status(404).json({ error: "News not found" });
    }
    res.json(news);
  });
  
  app.post("/api/news", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const id = generateId();
    const news = { 
      id, 
      ...req.body, 
      likesCount: 0,
      commentsCount: 0,
      viewsCount: 0,
      trueVotes: 0,
      fakeVotes: 0,
      publishedAt: new Date().toISOString() 
    };
    newsStorage.set(id, news);
    res.json(news);
  });
  
  app.patch("/api/news/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const news = newsStorage.get(id);
    if (!news) {
      return res.status(404).json({ error: "News not found" });
    }
    const updated = { ...news, ...req.body };
    newsStorage.set(id, updated);
    res.json(updated);
  });
  
  app.delete("/api/news/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    newsStorage.delete(id);
    newsComments.delete(id);
    res.json({ success: true });
  });
  
  app.post("/api/news/:id/like", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { increment } = req.body;
    const news = newsStorage.get(id);
    if (news) {
      news.likesCount = (news.likesCount || 0) + (increment ? 1 : -1);
      newsStorage.set(id, news);
    }
    res.json(news || { success: true });
  });
  
  app.post("/api/news/:id/vote", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { voteType, increment } = req.body;
    const news = newsStorage.get(id);
    if (news) {
      if (voteType === "true") {
        news.trueVotes = (news.trueVotes || 0) + (increment ? 1 : -1);
      } else if (voteType === "fake") {
        news.fakeVotes = (news.fakeVotes || 0) + (increment ? 1 : -1);
      }
      newsStorage.set(id, news);
    }
    res.json(news || { success: true });
  });
  
  app.post("/api/news/:id/view", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const news = newsStorage.get(id);
    if (news) {
      news.viewsCount = (news.viewsCount || 0) + 1;
      newsStorage.set(id, news);
    }
    res.json(news || { success: true });
  });
  
  app.get("/api/news/:id/comments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const comments = newsComments.get(id) || [];
    res.json(comments);
  });
  
  app.post("/api/news/:id/comments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { content } = req.body;
    // Get userId from body OR from X-User-Id header (like the Java backend does)
    const userId = req.body.userId || req.headers['x-user-id'] as string;
    
    if (!content) {
      return res.status(400).json({ error: "Comment content is required" });
    }
    
    // Get user info for the comment
    const user = storage.users.get(userId);
    
    const commentId = generateId();
    const comment = {
      id: commentId,
      newsId: id,
      userId: userId || 'anonymous',
      userName: user?.name || 'User',
      username: user?.username || 'user',
      userAvatar: user?.avatarUrl,
      content,
      createdAt: new Date().toISOString(),
    };
    
    // Store the comment
    const comments = newsComments.get(id) || [];
    comments.push(comment);
    newsComments.set(id, comments);
    
    // Update news comments count
    const news = newsStorage.get(id);
    if (news) {
      news.commentsCount = (news.commentsCount || 0) + 1;
      newsStorage.set(id, news);
      
      // Create notification for news owner when someone comments (except self-comments)
      if (news.userId && userId && news.userId !== userId) {
        const notifId = generateId();
        storage.notifications.set(notifId, {
          id: notifId,
          userId: news.userId,
          type: "news_comment",
          title: user?.name || "Someone",
          description: `commented on your news: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          relatedUserIds: [userId],
          relatedId: userId,
          entityId: id,
          actionUrl: `/news/${id}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    res.json(comment);
  });

  // ==================== SEARCH ROUTES ====================
  app.get("/api/search", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const query = (req.query.q as string || "").toLowerCase();
    const type = req.query.type as string;
    
    const results: any[] = [];
    
    if (!type || type === "users") {
      for (const [, user] of storage.users) {
        if (user.name.toLowerCase().includes(query) || user.username.toLowerCase().includes(query)) {
          results.push({ type: "user", ...user });
        }
      }
    }
    
    if (!type || type === "activities") {
      for (const [, activity] of storage.activities) {
        if (activity.title.toLowerCase().includes(query)) {
          results.push({ type: "activity", ...activity });
        }
      }
    }
    
    if (!type || type === "events") {
      for (const [, event] of storage.events) {
        if (event.title.toLowerCase().includes(query)) {
          results.push({ type: "event", ...event });
        }
      }
    }
    
    if (!type || type === "groups") {
      for (const [, group] of storage.groups) {
        if (group.name.toLowerCase().includes(query)) {
          results.push({ type: "group", ...group });
        }
      }
    }
    
    res.json(results);
  });

  // ==================== SAVED POSTS ROUTES ====================
  app.get("/api/users/:userId/saved", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { userId } = req.params;
    const savedIds = storage.savedPosts.get(userId) || [];
    
    // Return the saved activity IDs
    const savedActivities = savedIds.map(id => storage.activities.get(id)).filter(Boolean);
    res.json(savedActivities);
  });

  app.post("/api/users/:userId/saved/:postId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { userId, postId } = req.params;
    const savedIds = storage.savedPosts.get(userId) || [];
    
    if (!savedIds.includes(postId)) {
      savedIds.push(postId);
      storage.savedPosts.set(userId, savedIds);
    }
    
    res.json({ success: true, saved: true });
  });

  app.delete("/api/users/:userId/saved/:postId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { userId, postId } = req.params;
    const savedIds = storage.savedPosts.get(userId) || [];
    const index = savedIds.indexOf(postId);
    
    if (index > -1) {
      savedIds.splice(index, 1);
      storage.savedPosts.set(userId, savedIds);
    }
    
    res.json({ success: true, saved: false });
  });

  // ==================== MEDIA ROUTES ====================
  app.post("/api/media/upload", upload.single('file'), async (req: any, res) => {
    try {
      // Handle multipart/form-data uploads
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No file uploaded" });
      }
      
      const id = generateId();
      const userId = req.body.userId || 'anonymous';
      const context = req.body.context || 'OTHER';
      
      // Generate public URL for the uploaded file
      const fileUrl = `/uploads/${req.file.filename}`;
      
      // Determine media type
      const mimeType = req.file.mimetype;
      let mediaType = 'DOCUMENT';
      if (mimeType.startsWith('image/')) mediaType = 'IMAGE';
      else if (mimeType.startsWith('video/')) mediaType = 'VIDEO';
      else if (mimeType.startsWith('audio/')) mediaType = 'AUDIO';
      
      res.json({
        success: true,
        id,
        url: fileUrl,
        thumbnailUrl: mediaType === 'IMAGE' ? fileUrl : undefined,
        fileName: req.file.originalname,
        contentType: req.file.mimetype,
        fileSize: req.file.size,
        mediaType,
        userId,
        context,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ success: false, error: "Upload failed" });
    }
  });

  app.post("/api/media/upload/multiple", upload.array('files', 10), async (req: any, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ success: false, error: "No files uploaded" });
      }
      
      const userId = req.body.userId || 'anonymous';
      const context = req.body.context || 'OTHER';
      
      const results = req.files.map((file: any) => {
        const id = generateId();
        const fileUrl = `/uploads/${file.filename}`;
        
        const mimeType = file.mimetype;
        let mediaType = 'DOCUMENT';
        if (mimeType.startsWith('image/')) mediaType = 'IMAGE';
        else if (mimeType.startsWith('video/')) mediaType = 'VIDEO';
        else if (mimeType.startsWith('audio/')) mediaType = 'AUDIO';
        
        return {
          success: true,
          id,
          url: fileUrl,
          thumbnailUrl: mediaType === 'IMAGE' ? fileUrl : undefined,
          fileName: file.originalname,
          contentType: file.mimetype,
          fileSize: file.size,
          mediaType,
          userId,
          context,
        };
      });
      
      res.json(results);
    } catch (error) {
      console.error('Multiple upload error:', error);
      res.status(500).json({ success: false, error: "Upload failed" });
    }
  });
  
  app.post("/api/media/presigned-upload", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const id = generateId();
    res.json({
      uploadUrl: "#",
      fileUrl: `https://picsum.photos/seed/${id}/800/600`,
      fileId: id,
    });
  });

  // ==================== POSTS ROUTES (Instagram-like) ====================
  app.get("/api/posts", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const posts = Array.from(storage.posts.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(posts);
  });

  app.get("/api/posts/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const post = storage.posts.get(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json(post);
  });

  app.post("/api/posts", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const id = generateId();
    const post = {
      id,
      ...req.body,
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    };
    storage.posts.set(id, post);
    res.json(post);
  });

  app.patch("/api/posts/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const post = storage.posts.get(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const updated = { ...post, ...req.body };
    storage.posts.set(id, updated);
    res.json(updated);
  });

  app.delete("/api/posts/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    storage.posts.delete(id);
    res.json({ success: true });
  });

  app.post("/api/posts/:id/like", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { increment, userId } = req.body;
    const post = storage.posts.get(id);
    if (post) {
      post.likesCount = (post.likesCount || 0) + (increment ? 1 : -1);
      storage.posts.set(id, post);
    }
    res.json({ success: true });
  });

  app.get("/api/posts/:id/comments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const comments = storage.postComments.get(id) || [];
    res.json(comments);
  });

  app.post("/api/posts/:id/comments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { content, userId, parentCommentId } = req.body;
    const user = storage.users.get(userId);
    const commentId = generateId();
    const comment = {
      id: commentId,
      postId: id,
      userId: userId || 'anonymous',
      userName: user?.name || 'User',
      username: user?.username || 'user',
      userAvatar: user?.avatarUrl,
      content,
      parentCommentId: parentCommentId || null,
      likesCount: 0,
      createdAt: new Date().toISOString(),
    };
    
    const comments = storage.postComments.get(id) || [];
    comments.push(comment);
    storage.postComments.set(id, comments);
    
    // Update post comment count
    const post = storage.posts.get(id);
    if (post) {
      post.commentsCount = (post.commentsCount || 0) + 1;
      storage.posts.set(id, post);
      
      // Create notification based on comment type
      if (parentCommentId) {
        const parentComment = comments.find(c => c.id === parentCommentId);
        if (parentComment && parentComment.userId && userId && parentComment.userId !== userId) {
          const notifId = generateId();
          storage.notifications.set(notifId, {
            id: notifId,
            userId: parentComment.userId,
            type: "comment_reply",
            title: user?.name || "Someone",
            description: `replied to your comment: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
            relatedUserIds: [userId],
            relatedId: userId,
            entityId: id,
            actionUrl: `/post/${id}`,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      } else if (post.userId && userId && post.userId !== userId) {
        const notifId = generateId();
        storage.notifications.set(notifId, {
          id: notifId,
          userId: post.userId,
          type: "post_comment",
          title: user?.name || "Someone",
          description: `commented on your post: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          relatedUserIds: [userId],
          relatedId: userId,
          entityId: id,
          actionUrl: `/post/${id}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    res.json(comment);
  });

  // ==================== POLLS ROUTES ====================
  app.get("/api/polls", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;

    const polls = Array.from(storage.polls.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(polls);
  });

  app.get("/api/polls/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const poll = storage.polls.get(id);
    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }
    res.json(poll);
  });

  app.post("/api/polls", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;

    const id = generateId();
    const { options, ...rest } = req.body;
    
    // Create poll with proper option structure
    const pollOptions = options.map((opt: { text: string }, index: number) => ({
      id: `${id}-opt-${index}`,
      text: opt.text,
      votes: 0,
    }));
    
    const poll = {
      id,
      ...rest,
      options: pollOptions,
      totalVotes: 0,
      createdAt: new Date().toISOString(),
    };
    storage.polls.set(id, poll);
    storage.pollVotes.set(id, new Map());
    res.json(poll);
  });

  app.post("/api/polls/:id/vote", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { optionId, userId } = req.body;
    
    const poll = storage.polls.get(id);
    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }
    
    // Check if user already voted
    const votes = storage.pollVotes.get(id) || new Map();
    if (votes.has(userId)) {
      return res.status(400).json({ error: "Already voted" });
    }
    
    // Record vote
    votes.set(userId, optionId);
    storage.pollVotes.set(id, votes);
    
    // Update poll options and total votes
    poll.options = poll.options.map((opt: any) => ({
      ...opt,
      votes: opt.id === optionId ? opt.votes + 1 : opt.votes,
    }));
    poll.totalVotes = (poll.totalVotes || 0) + 1;
    storage.polls.set(id, poll);
    
    res.json({ success: true, poll });
  });

  app.delete("/api/polls/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    storage.polls.delete(id);
    storage.pollVotes.delete(id);
    res.json({ success: true });
  });

  // Poll view tracking
  app.post("/api/polls/:id/view", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const poll = storage.polls.get(id);
    if (poll) {
      poll.viewsCount = (poll.viewsCount || 0) + 1;
      storage.polls.set(id, poll);
    }
    res.json({ success: true });
  });

  // Poll comments
  app.get("/api/polls/:id/comments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const comments = storage.pollComments?.get(id) || [];
    res.json(comments);
  });

  app.post("/api/polls/:id/comments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { content, userId, parentCommentId } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Comment content is required" });
    }
    
    const user = storage.users.get(userId);
    const commentId = generateId();
    const comment = {
      id: commentId,
      pollId: id,
      userId: userId || 'anonymous',
      userName: user?.name || 'User',
      username: user?.username || 'user',
      userAvatar: user?.avatarUrl,
      content,
      parentCommentId: parentCommentId || null,
      likesCount: 0,
      createdAt: new Date().toISOString(),
    };
    
    // Initialize pollComments if needed
    if (!storage.pollComments) {
      (storage as any).pollComments = new Map<string, any[]>();
    }
    
    const comments = storage.pollComments?.get(id) || [];
    comments.push(comment);
    storage.pollComments?.set(id, comments);
    
    // Update poll comments count
    const poll = storage.polls.get(id);
    if (poll) {
      poll.commentsCount = (poll.commentsCount || 0) + 1;
      storage.polls.set(id, poll);
      
      // Create notification based on comment type
      if (parentCommentId) {
        const parentComment = comments.find(c => c.id === parentCommentId);
        if (parentComment && parentComment.userId && userId && parentComment.userId !== userId) {
          const notifId = generateId();
          storage.notifications.set(notifId, {
            id: notifId,
            userId: parentComment.userId,
            type: "comment_reply",
            title: user?.name || "Someone",
            description: `replied to your comment: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
            relatedUserIds: [userId],
            relatedId: userId,
            entityId: id,
            actionUrl: `/poll/${id}`,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      } else if (poll.userId && userId && poll.userId !== userId) {
        const notifId = generateId();
        storage.notifications.set(notifId, {
          id: notifId,
          userId: poll.userId,
          type: "poll_comment",
          title: user?.name || "Someone",
          description: `commented on your poll: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          relatedUserIds: [userId],
          relatedId: userId,
          entityId: id,
          actionUrl: `/poll/${id}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    res.json(comment);
  });

  // ==================== QUESTIONS ROUTES ====================
  app.get("/api/questions", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const questions = Array.from(storage.questions.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(questions);
  });

  app.get("/api/questions/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const question = storage.questions.get(id);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }
    res.json(question);
  });

  app.post("/api/questions", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const id = generateId();
    const question = {
      id,
      ...req.body,
      answersCount: 0,
      upvotes: 0,
      isAnswered: false,
      createdAt: new Date().toISOString(),
    };
    storage.questions.set(id, question);
    res.json(question);
  });

  app.post("/api/questions/:id/upvote", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { increment, userId } = req.body;
    const question = storage.questions.get(id);
    if (question) {
      question.upvotes = (question.upvotes || 0) + (increment ? 1 : -1);
      storage.questions.set(id, question);
    }
    res.json({ success: true });
  });

  app.delete("/api/questions/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    storage.questions.delete(id);
    res.json({ success: true });
  });

  app.get("/api/questions/:id/answers", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const answers = storage.questionAnswers.get(id) || [];
    res.json(answers);
  });

  app.post("/api/questions/:id/answers", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { content, userId } = req.body;
    const answerId = generateId();
    const answer = {
      id: answerId,
      questionId: id,
      userId,
      content,
      upvotes: 0,
      isAccepted: false,
      createdAt: new Date().toISOString(),
    };
    
    const answers = storage.questionAnswers.get(id) || [];
    answers.push(answer);
    storage.questionAnswers.set(id, answers);
    
    // Update question answer count
    const question = storage.questions.get(id);
    if (question) {
      question.answersCount = (question.answersCount || 0) + 1;
      storage.questions.set(id, question);
    }
    
    res.json(answer);
  });

  // ==================== PAI MATCHING ROUTES (AI-powered user matching) ====================
  // Queue for PAI matching
  const paiMatchQueue = new Map<string, { sessionId: string; chatMode: string; preferences: any; timestamp: Date }>();
  
  app.post("/api/pai/match", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { sessionId, chatMode, preferences } = req.body;
    
    // Add to queue
    paiMatchQueue.set(sessionId, {
      sessionId,
      chatMode,
      preferences: preferences || {},
      timestamp: new Date(),
    });
    
    // Try to find a match (simple FIFO for fallback, PAI microservice would do intelligent matching)
    let matchedSession = null;
    for (const [queuedSessionId, queuedData] of paiMatchQueue.entries()) {
      if (queuedSessionId !== sessionId && queuedData.chatMode === chatMode) {
        matchedSession = queuedData;
        paiMatchQueue.delete(queuedSessionId);
        break;
      }
    }
    
    if (matchedSession) {
      // Remove current session from queue
      paiMatchQueue.delete(sessionId);
      
      const roomId = generateId();
      res.json({
        success: true,
        matchedSessionId: matchedSession.sessionId,
        matchScore: 0.85 + Math.random() * 0.15, // Simulated match score
        roomId,
      });
    } else {
      // No immediate match found, keep in queue
      res.json({
        success: false,
        message: "Added to matching queue",
      });
    }
  });
  
  app.delete("/api/pai/queue/:sessionId", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { sessionId } = req.params;
    paiMatchQueue.delete(sessionId);
    res.json({ success: true });
  });
  
  app.get("/api/pai/queue/:sessionId/status", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { sessionId } = req.params;
    const inQueue = paiMatchQueue.has(sessionId);
    const position = inQueue ? Array.from(paiMatchQueue.keys()).indexOf(sessionId) + 1 : 0;
    
    res.json({
      inQueue,
      position,
      estimatedWaitTime: position * 10, // Estimated seconds
    });
  });
  
  app.post("/api/pai/match/rate", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    // Store rating for PAI learning (in real implementation, this would be sent to ML service)
    const { sessionId, matchedSessionId, rating, feedback } = req.body;
    console.log(`Match rating: ${sessionId} rated ${matchedSessionId} as ${rating}/5`);
    
    res.json({ success: true });
  });

  // ==================== DISCUSSIONS ROUTES ====================
  app.get("/api/discussions", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const discussions = Array.from(storage.discussions.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(discussions);
  });

  app.get("/api/discussions/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const discussion = storage.discussions.get(id);
    if (!discussion) {
      return res.status(404).json({ error: "Discussion not found" });
    }
    res.json(discussion);
  });

  app.post("/api/discussions", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const id = generateId();
    const discussion = {
      id,
      ...req.body,
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
    };
    storage.discussions.set(id, discussion);
    res.json(discussion);
  });

  app.post("/api/discussions/:id/like", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { increment, userId } = req.body;
    const discussion = storage.discussions.get(id);
    if (discussion) {
      discussion.likesCount = (discussion.likesCount || 0) + (increment ? 1 : -1);
      storage.discussions.set(id, discussion);
    }
    res.json({ success: true });
  });

  app.delete("/api/discussions/:id", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    storage.discussions.delete(id);
    res.json({ success: true });
  });

  app.get("/api/discussions/:id/comments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const comments = storage.discussionComments.get(id) || [];
    res.json(comments);
  });

  app.post("/api/discussions/:id/comments", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    const { id } = req.params;
    const { content, userId, parentCommentId } = req.body;
    const user = storage.users.get(userId);
    const commentId = generateId();
    const comment = {
      id: commentId,
      discussionId: id,
      userId: userId || 'anonymous',
      userName: user?.name || 'User',
      username: user?.username || 'user',
      userAvatar: user?.avatarUrl,
      content,
      parentCommentId: parentCommentId || null,
      likesCount: 0,
      createdAt: new Date().toISOString(),
    };
    
    const comments = storage.discussionComments.get(id) || [];
    comments.push(comment);
    storage.discussionComments.set(id, comments);
    
    // Update discussion comment count
    const discussion = storage.discussions.get(id);
    if (discussion) {
      discussion.commentsCount = (discussion.commentsCount || 0) + 1;
      storage.discussions.set(id, discussion);
      
      // Create notification based on comment type
      if (parentCommentId) {
        const parentComment = comments.find(c => c.id === parentCommentId);
        if (parentComment && parentComment.userId && userId && parentComment.userId !== userId) {
          const notifId = generateId();
          storage.notifications.set(notifId, {
            id: notifId,
            userId: parentComment.userId,
            type: "comment_reply",
            title: user?.name || "Someone",
            description: `replied to your comment: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
            relatedUserIds: [userId],
            relatedId: userId,
            entityId: id,
            actionUrl: `/discussion/${id}`,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
      } else if (discussion.userId && userId && discussion.userId !== userId) {
        const notifId = generateId();
        storage.notifications.set(notifId, {
          id: notifId,
          userId: discussion.userId,
          type: "discussion_comment",
          title: user?.name || "Someone",
          description: `commented on your discussion: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
          relatedUserIds: [userId],
          relatedId: userId,
          entityId: id,
          actionUrl: `/discussion/${id}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
    
    res.json(comment);
  });

  // ==================== CATCH-ALL FOR UNHANDLED ROUTES ====================
  app.all("/api/*", async (req, res) => {
    const proxied = await proxyToGateway(req, res, req.path);
    if (proxied) return;
    
    // Return empty array for GET requests, success for others
    if (req.method === "GET") {
      res.json([]);
    } else {
      res.json({ success: true });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
