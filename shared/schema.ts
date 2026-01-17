/**
 * Shared type definitions for the Nearly app
 * These types represent the data structures used by the microservices gateway
 * No database dependencies - types only
 */

// User types
export interface User {
  id: string;
  username: string;
  name: string;
  bio?: string | null;
  location?: string | null;
  interests?: string[] | null;
  avatarUrl?: string | null;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isPrivate?: boolean;
  showActivityStatus?: boolean;
  allowStorySharing?: boolean;
  messagePrivacy?: string;
}

export interface InsertUser {
  username: string;
  name: string;
  bio?: string | null;
  location?: string | null;
  interests?: string[] | null;
  avatarUrl?: string | null;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isPrivate?: boolean;
  showActivityStatus?: boolean;
  allowStorySharing?: boolean;
  messagePrivacy?: string;
}

// Activity types
export interface Activity {
  id: string;
  userId: string;
  title: string;
  organizerName?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  location?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  maxParticipants?: number | null;
  visibility: string;
  cost?: string | null;
  category?: string | null;
  likesCount?: number;
  commentsCount?: number;
  participantsCount?: number;
  createdAt?: Date | string;
}

export interface InsertActivity {
  userId: string;
  title: string;
  organizerName?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  location?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  maxParticipants?: number | null;
  visibility: string;
  cost?: string | null;
  category?: string | null;
}

// Event types
export interface Event {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  location: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  maxAttendees?: number | null;
  visibility: string;
  entryType: string;
  price?: number | null;
  category?: string | string[] | null;
  attendeesCount?: number;
  createdAt?: Date | string;
}

export interface InsertEvent {
  userId: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  location: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  maxAttendees?: number | null;
  visibility: string;
  entryType: string;
  price?: number | null;
  category?: string | string[] | null;
}

// Group types
export interface Group {
  id: string;
  userId?: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  groupType: string;
  category?: string | null;
  rules?: string | null;
  membersCount?: number;
  createdAt?: Date | string;
}

export interface InsertGroup {
  userId?: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  groupType: string;
  category?: string | null;
  rules?: string | null;
}

// News types
export interface News {
  id: string;
  userId: string;
  headline: string;
  description?: string | null;
  imageUrl?: string | null;
  location?: string | null;
  eventDate?: Date | string | null;
  eventTime?: string | null;
  category: string;
  trueVotes?: number;
  fakeVotes?: number;
  likesCount?: number;
  commentsCount?: number;
  publishedAt?: Date | string;
}

export interface InsertNews {
  userId: string;
  headline: string;
  description?: string | null;
  imageUrl?: string | null;
  location?: string | null;
  eventDate?: Date | string | null;
  eventTime?: string | null;
  category: string;
}

// Message types
export interface Message {
  id: string;
  senderId: string;
  recipientId?: string | null;
  groupId?: string | null;
  content: string;
  imageUrl?: string | null;
  messageType: string;
  createdAt?: Date | string;
}

export interface InsertMessage {
  senderId: string;
  recipientId?: string | null;
  groupId?: string | null;
  content: string;
  imageUrl?: string | null;
  messageType: string;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  actionUrl?: string | null;
  relatedId?: string | null;
  relatedUserIds?: string[] | null;
  isRead?: boolean;
  createdAt?: Date | string;
}

export interface InsertNotification {
  userId: string;
  type: string;
  title: string;
  description: string;
  actionUrl?: string | null;
  relatedId?: string | null;
  relatedUserIds?: string[] | null;
}

// Event Guest types
export interface EventGuest {
  id: string;
  eventId: string;
  userId: string;
  status: string;
  createdAt?: Date | string;
}

export interface InsertEventGuest {
  eventId: string;
  userId: string;
  status: string;
}

// Event Comment types
export interface EventComment {
  id: string;
  eventId: string;
  userId: string;
  content: string;
  createdAt?: Date | string;
}

export interface InsertEventComment {
  eventId: string;
  userId: string;
  content: string;
}

// Group Member types
export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: string;
  joinedAt?: Date | string;
}

export interface InsertGroupMember {
  groupId: string;
  userId: string;
  role?: string;
}

// Follow types
export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt?: Date | string;
}

export interface InsertFollow {
  followerId: string;
  followingId: string;
}

// Moment types
export interface Moment {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType?: string;
  caption?: string | null;
  textOverlays?: string | null;
  filter?: string | null;
  visibility?: string;
  viewsCount?: number;
  likesCount?: number;
  expiresAt?: Date | string | null;
  createdAt?: Date | string;
}

export interface InsertMoment {
  userId: string;
  mediaUrl: string;
  mediaType?: string;
  caption?: string | null;
  textOverlays?: string | null;
  filter?: string | null;
  visibility?: string;
  expiresAt?: Date | string | null;
}

// Direct Moment types
export interface DirectMoment {
  id: string;
  momentId: string;
  senderId: string;
  recipientId: string;
  isViewed?: boolean;
  viewedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  createdAt?: Date | string;
}

export interface InsertDirectMoment {
  momentId: string;
  senderId: string;
  recipientId: string;
  expiresAt?: Date | string | null;
}

// Moment Streak types
export interface MomentStreak {
  id: string;
  userId1: string;
  userId2: string;
  streakCount?: number;
  lastMomentAt?: Date | string | null;
  streakExpiresAt?: Date | string | null;
  createdAt?: Date | string;
}

export interface InsertMomentStreak {
  userId1: string;
  userId2: string;
  streakCount?: number;
  lastMomentAt?: Date | string | null;
  streakExpiresAt?: Date | string | null;
}

// Moment Interaction types
export interface MomentInteraction {
  id: string;
  momentId: string;
  userId: string;
  interactionType: string;
  replyContent?: string | null;
  createdAt?: Date | string;
}

export interface InsertMomentInteraction {
  momentId: string;
  userId: string;
  interactionType: string;
  replyContent?: string | null;
}

// Zod schema placeholders for validation (client-side only)
// These are simple object validators for forms
import { z } from "zod";

export const insertUserSchema = z.object({
  username: z.string().min(1),
  name: z.string().min(1),
  bio: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  interests: z.array(z.string()).optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
});

export const insertActivitySchema = z.object({
  userId: z.string(),
  title: z.string().min(1),
  organizerName: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  maxParticipants: z.number().optional().nullable(),
  visibility: z.string(),
  cost: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
});

export const insertEventSchema = z.object({
  userId: z.string(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  location: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  maxAttendees: z.number().optional().nullable(),
  visibility: z.string(),
  entryType: z.string(),
  price: z.number().optional().nullable(),
  category: z.union([z.string(), z.array(z.string())]).optional().nullable(),
});

export const insertGroupSchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  groupType: z.string(),
  category: z.string().optional().nullable(),
  rules: z.string().optional().nullable(),
});

export const insertNewsSchema = z.object({
  userId: z.string(),
  headline: z.string().min(1),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  eventDate: z.coerce.date().optional().nullable(),
  eventTime: z.string().optional().nullable(),
  category: z.string(),
});

export const insertMessageSchema = z.object({
  senderId: z.string(),
  recipientId: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  content: z.string().min(1),
  imageUrl: z.string().optional().nullable(),
  messageType: z.string(),
});

export const insertNotificationSchema = z.object({
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  actionUrl: z.string().optional().nullable(),
  relatedId: z.string().optional().nullable(),
  relatedUserIds: z.array(z.string()).optional().nullable(),
});

export const insertMomentSchema = z.object({
  userId: z.string(),
  mediaUrl: z.string(),
  mediaType: z.string().optional(),
  caption: z.string().optional().nullable(),
  textOverlays: z.string().optional().nullable(),
  filter: z.string().optional().nullable(),
  visibility: z.string().optional(),
  expiresAt: z.coerce.date().optional().nullable(),
});

// Post types (Instagram-like)
export interface Post {
  id: string;
  userId: string;
  caption?: string | null;
  mediaUrls: string[];
  location?: string | null;
  tags?: string[] | null;
  likesCount?: number;
  commentsCount?: number;
  createdAt?: Date | string;
}

export interface InsertPost {
  userId: string;
  caption?: string | null;
  mediaUrls: string[];
  location?: string | null;
  tags?: string[] | null;
}

// Poll types
export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  userId: string;
  question: string;
  options: PollOption[];
  category?: string | null;
  totalVotes?: number;
  endsAt?: Date | string | null;
  hasVoted?: boolean;
  userVote?: string | null;
  createdAt?: Date | string;
}

export interface InsertPoll {
  userId: string;
  question: string;
  options: { text: string }[];
  category?: string | null;
  endsAt?: Date | string | null;
}

// Question types
export interface Question {
  id: string;
  userId: string;
  title: string;
  content?: string | null;
  category?: string | null;
  tags?: string[] | null;
  answersCount?: number;
  upvotes?: number;
  isAnswered?: boolean;
  createdAt?: Date | string;
}

export interface InsertQuestion {
  userId: string;
  title: string;
  content?: string | null;
  category?: string | null;
  tags?: string[] | null;
}

// Discussion types
export interface Discussion {
  id: string;
  userId: string;
  title: string;
  content?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  tags?: string[] | null;
  likesCount?: number;
  commentsCount?: number;
  createdAt?: Date | string;
}

export interface InsertDiscussion {
  userId: string;
  title: string;
  content?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  tags?: string[] | null;
}

// Zod schemas for new types
export const insertPostSchema = z.object({
  userId: z.string(),
  caption: z.string().optional().nullable(),
  mediaUrls: z.array(z.string()),
  location: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

export const insertPollSchema = z.object({
  userId: z.string(),
  question: z.string().min(1),
  options: z.array(z.object({ text: z.string().min(1) })).min(2).max(6),
  category: z.string().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
});

export const insertQuestionSchema = z.object({
  userId: z.string(),
  title: z.string().min(1),
  content: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

export const insertDiscussionSchema = z.object({
  userId: z.string(),
  title: z.string().min(1),
  content: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});
