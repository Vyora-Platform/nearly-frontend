# API Configuration Guide

This document explains how the API calls are centralized and configured for the Nearly application.

## Architecture Overview

**ALL API requests go through the Spring Boot Microservices Gateway.**

```
Client (React) → Express Proxy → API Gateway (9002) → Microservices
```

- Express server (port 3000) serves the frontend and proxies `/api/*` requests to the gateway
- API Gateway (port 9002) routes requests to the appropriate microservice
- No local database - all data persistence is handled by microservices

## Configuration System

### Config File Structure (`client/src/lib/config.ts`)

The configuration file provides environment-specific settings:

```typescript
interface Config {
  API_BASE_URL: string;
  WS_BASE_URL: string;
  GATEWAY_URL: string;
  GATEWAY_WS_URL: string;
  APP_NAME: string;
  APP_VERSION: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  FEATURES: {
    ENABLE_NOTIFICATIONS: boolean;
    ENABLE_CHAT: boolean;
    ENABLE_ANALYTICS: boolean;
    ENABLE_RANDOM_CHAT: boolean;
    ENABLE_VIDEO_CHAT: boolean;
  };
}
```

### Environment Detection

The system automatically detects the environment based on:
1. `import.meta.env.PROD` for production mode
2. `VITE_ENV` environment variable
3. Replit environment (`REPL_ID`)
4. Falls back to development

### Environment Configurations

- **Development**: Local development - Express proxies to gateway on localhost:9002
- **Staging**: Staging gateway URLs
- **Production**: Production gateway URLs

## API Methods

All API calls are centralized in `client/src/lib/api.ts` using gateway URLs:

### Activities
- `getActivities(limit?)` - GET /api/activities
- `getActivity(id)` - GET /api/activities/:id
- `createActivity(data)` - POST /api/activities
- `updateActivity(id, data)` - PATCH /api/activities/:id
- `deleteActivity(id)` - DELETE /api/activities/:id
- `likeActivity(id, increment)` - POST /api/activities/:id/like

### Events
- `getEvents(limit?)` - GET /api/events
- `getEvent(id)` - GET /api/events/:id
- `createEvent(data)` - POST /api/events
- `updateEvent(id, data)` - PATCH /api/events/:id
- `deleteEvent(id)` - DELETE /api/events/:id
- `getEventGuests(eventId)` - GET /api/events/:id/guests
- `joinEvent(eventId, userId?)` - POST /api/events/:id/join
- `getEventComments(eventId)` - GET /api/events/:id/comments
- `createEventComment(eventId, content, userId?)` - POST /api/events/:id/comments

### Groups
- `getGroups(limit?)` - GET /api/groups
- `getGroup(id)` - GET /api/groups/:id
- `createGroup(data)` - POST /api/groups
- `updateGroup(id, data)` - PATCH /api/groups/:id
- `deleteGroup(id)` - DELETE /api/groups/:id
- `getGroupMembers(groupId)` - GET /api/groups/:id/members
- `getUserGroups(userId)` - GET /api/users/:id/groups
- `joinGroup(groupId, userId?)` - POST /api/groups/:id/join

### News
- `getNews(limit?)` - GET /api/news
- `getNewsItem(id)` - GET /api/news/:id
- `createNews(data)` - POST /api/news
- `updateNews(id, data)` - PATCH /api/news/:id
- `deleteNews(id)` - DELETE /api/news/:id
- `voteNews(id, voteType, increment)` - POST /api/news/:id/vote
- `likeNews(id, increment)` - POST /api/news/:id/like

### Users
- `getUsers()` - GET /api/users
- `getUser(id)` - GET /api/users/:id
- `getCurrentUser()` - GET /api/users/current
- `getUserByUsername(username)` - GET /api/users/username/:username
- `createUser(data)` - POST /api/users
- `updateUser(id, data)` - PATCH /api/users/:id
- `deleteUser(id)` - DELETE /api/users/:id

### Authentication
- `checkUsername(username)` - GET /api/users/auth/check-username
- `signup(data)` - POST /api/users/auth/signup
- `login(data)` - POST /api/users/auth/login
- `logout()` - POST /api/auth/logout
- `changePassword(userId, data)` - POST /api/users/:id/password

### Follow System
- `followUser(followerId, followingId)` - POST /api/follows
- `unfollowUser(followerId, followingId)` - DELETE /api/follows/:followerId/:followingId
- `getFollowers(userId)` - GET /api/users/:id/followers
- `getFollowing(userId)` - GET /api/users/:id/following
- `isFollowing(followerId, followingId)` - GET /api/follows/:followerId/:followingId

### Notifications
- `getNotifications(userId, type?)` - GET /api/notifications/:userId
- `createNotification(data)` - POST /api/notifications
- `markNotificationAsRead(id)` - PATCH /api/notifications/:id/read

### Messages
- `getMessages(groupId?, userId?)` - GET /api/messages
- `getGroupMessages(groupId)` - GET /api/messages/:groupId
- `getDirectMessages(userId)` - GET /api/messages/direct/:userId
- `createMessage(data)` - POST /api/messages

### Moments
- `getMoments(visibility?, limit?)` - GET /api/moments
- `getMoment(id)` - GET /api/moments/:id
- `createMoment(data)` - POST /api/moments
- `deleteMoment(id)` - DELETE /api/moments/:id
- `likeMoment(id)` - POST /api/moments/:id/like
- `viewMoment(id)` - POST /api/moments/:id/view

### Marketplace
- `getJobs(limit?)` - GET /api/jobs
- `getDeals(limit?)` - GET /api/deals
- `getPlaces(limit?)` - GET /api/places
- `getPages(limit?)` - GET /api/pages

### Media
- `uploadMedia(file, folder?)` - POST /api/media/upload
- `getPresignedUploadUrl(fileName, contentType, folder?)` - POST /api/media/presigned-upload

### Search
- `search(query, type?)` - GET /api/search

## Gateway API Service

For more advanced usage, use `client/src/lib/gateway-api.ts` which provides organized API modules:

```typescript
import { gatewayApi } from '@/lib/gateway-api';

// Users
await gatewayApi.users.getUser(id);

// Activities
await gatewayApi.activities.getActivities();

// Auth
await gatewayApi.auth.login({ usernameOrEmail, password });

// Media
await gatewayApi.media.uploadFile(file, userId, context);
```

## Server Proxy Configuration

The Express server (`server/routes.ts`) proxies all `/api/*` requests to the gateway:

```typescript
// All API requests are proxied to the microservices gateway
app.all("/api/*", (req, res) => {
  proxyToGateway(req, res, req.path);
});
```

## Environment Variables

```bash
# Gateway URL (optional - defaults to localhost:9002)
GATEWAY_URL=http://localhost:9002

# Port for Express server (optional - defaults to 3000)
PORT=3000

# Production gateway URLs
VITE_GATEWAY_URL=https://gateway.nearly.app
VITE_GATEWAY_WS_URL=wss://gateway.nearly.app
```

## Build Commands

```bash
# Development
npm run dev

# Staging
npm run build:staging
npm run start:staging

# Production
npm run build
npm run start
```

## Usage Examples

### Basic API Call
```typescript
import { api } from '@/lib/api';

// Get activities
const activities = await api.getActivities();

// Create a new activity
const newActivity = await api.createActivity({
  title: 'New Activity',
  description: 'Activity description',
  userId: 'user123'
});
```

### Using Gateway API
```typescript
import { gatewayApi } from '@/lib/gateway-api';

// Get user with full error handling
try {
  const user = await gatewayApi.users.getUser('user-id');
} catch (error) {
  console.error('Failed to fetch user:', error);
}

// Upload media
const result = await gatewayApi.media.uploadFile(file, userId, 'profile');
```

### Using Configuration
```typescript
import { config, buildGatewayUrl } from '@/lib/config';

// Check environment
console.log('Environment:', config.ENVIRONMENT);

// Build custom gateway URL
const customUrl = buildGatewayUrl('/api/custom-endpoint');
```

## Key Points

1. **Gateway Only**: ALL API calls go through the microservices gateway
2. **No Local Database**: The Express server only proxies requests, no local storage
3. **Centralized**: All API calls are centralized in `api.ts` and `gateway-api.ts`
4. **Type Safe**: Full TypeScript support with shared type definitions
5. **Configurable**: Easy switching between environments via config
