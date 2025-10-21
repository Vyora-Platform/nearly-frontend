import { 
  type User, type InsertUser,
  type Activity, type InsertActivity,
  type Event, type InsertEvent,
  type Group, type InsertGroup,
  type News, type InsertNews,
  type Message, type InsertMessage,
  type Notification, type InsertNotification,
  type EventGuest, type InsertEventGuest,
  type EventComment, type InsertEventComment,
  type GroupMember, type InsertGroupMember,
  users, activities, events, groups, news, messages, notifications,
  eventGuests, eventComments, groupMembers
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, desc, or } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Activities
  getActivities(limit?: number): Promise<Activity[]>;
  getActivity(id: string): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: string, updates: Partial<InsertActivity>): Promise<Activity | undefined>;
  deleteActivity(id: string): Promise<boolean>;
  likeActivity(id: string, increment: boolean): Promise<boolean>;
  
  // Events
  getEvents(limit?: number): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;
  
  // Groups
  getGroups(limit?: number): Promise<Group[]>;
  getGroup(id: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: string, updates: Partial<InsertGroup>): Promise<Group | undefined>;
  deleteGroup(id: string): Promise<boolean>;
  
  // News
  getNews(limit?: number): Promise<News[]>;
  getNewsItem(id: string): Promise<News | undefined>;
  createNews(news: InsertNews): Promise<News>;
  updateNews(id: string, updates: Partial<InsertNews>): Promise<News | undefined>;
  deleteNews(id: string): Promise<boolean>;
  voteNews(id: string, voteType: 'true' | 'fake', increment: boolean): Promise<boolean>;
  likeNews(id: string, increment: boolean): Promise<boolean>;
  
  // Messages
  getMessages(groupId?: string, userId?: string): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: string): Promise<boolean>;
  
  // Notifications
  getNotifications(userId: string, type?: string): Promise<Notification[]>;
  getNotification(id: string): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<boolean>;
  deleteNotification(id: string): Promise<boolean>;
  
  // Event Guests
  getEventGuests(eventId: string): Promise<EventGuest[]>;
  createEventGuest(guest: InsertEventGuest): Promise<EventGuest>;
  updateEventGuestStatus(eventId: string, userId: string, status: string): Promise<boolean>;
  
  // Event Comments
  getEventComments(eventId: string): Promise<EventComment[]>;
  createEventComment(comment: InsertEventComment): Promise<EventComment>;
  deleteEventComment(id: string): Promise<boolean>;
  
  // Group Members
  getGroupMembers(groupId: string): Promise<GroupMember[]>;
  getUserGroups(userId: string): Promise<GroupMember[]>;
  createGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  deleteGroupMember(groupId: string, userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  // Activity methods
  async getActivities(limit = 50): Promise<Activity[]> {
    return await db.select().from(activities).orderBy(desc(activities.createdAt)).limit(limit);
  }

  async getActivity(id: string): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity || undefined;
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }

  async updateActivity(id: string, updates: Partial<InsertActivity>): Promise<Activity | undefined> {
    const [activity] = await db.update(activities).set(updates).where(eq(activities.id, id)).returning();
    return activity || undefined;
  }

  async deleteActivity(id: string): Promise<boolean> {
    const result = await db.delete(activities).where(eq(activities.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async likeActivity(id: string, increment: boolean): Promise<boolean> {
    const activity = await this.getActivity(id);
    if (!activity) return false;
    
    const newCount = (activity.likesCount || 0) + (increment ? 1 : -1);
    await db.update(activities).set({ likesCount: newCount }).where(eq(activities.id, id));
    return true;
  }

  // Event methods
  async getEvents(limit = 50): Promise<Event[]> {
    return await db.select().from(events).orderBy(desc(events.createdAt)).limit(limit);
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent).returning();
    return event;
  }

  async updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    const [event] = await db.update(events).set(updates).where(eq(events.id, id)).returning();
    return event || undefined;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Group methods
  async getGroups(limit = 50): Promise<Group[]> {
    return await db.select().from(groups).orderBy(desc(groups.membersCount)).limit(limit);
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group || undefined;
  }

  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const [group] = await db.insert(groups).values(insertGroup).returning();
    return group;
  }

  async updateGroup(id: string, updates: Partial<InsertGroup>): Promise<Group | undefined> {
    const [group] = await db.update(groups).set(updates).where(eq(groups.id, id)).returning();
    return group || undefined;
  }

  async deleteGroup(id: string): Promise<boolean> {
    const result = await db.delete(groups).where(eq(groups.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // News methods
  async getNews(limit = 50): Promise<News[]> {
    return await db.select().from(news).orderBy(desc(news.publishedAt)).limit(limit);
  }

  async getNewsItem(id: string): Promise<News | undefined> {
    const [newsItem] = await db.select().from(news).where(eq(news.id, id));
    return newsItem || undefined;
  }

  async createNews(insertNews: InsertNews): Promise<News> {
    const [newsItem] = await db.insert(news).values(insertNews).returning();
    return newsItem;
  }

  async updateNews(id: string, updates: Partial<InsertNews>): Promise<News | undefined> {
    const [newsItem] = await db.update(news).set(updates).where(eq(news.id, id)).returning();
    return newsItem || undefined;
  }

  async deleteNews(id: string): Promise<boolean> {
    const result = await db.delete(news).where(eq(news.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async voteNews(id: string, voteType: 'true' | 'fake', increment: boolean): Promise<boolean> {
    const newsItem = await this.getNewsItem(id);
    if (!newsItem) return false;
    
    if (voteType === 'true') {
      const newCount = (newsItem.trueVotes || 0) + (increment ? 1 : -1);
      await db.update(news).set({ trueVotes: newCount }).where(eq(news.id, id));
    } else {
      const newCount = (newsItem.fakeVotes || 0) + (increment ? 1 : -1);
      await db.update(news).set({ fakeVotes: newCount }).where(eq(news.id, id));
    }
    return true;
  }

  async likeNews(id: string, increment: boolean): Promise<boolean> {
    const newsItem = await this.getNewsItem(id);
    if (!newsItem) return false;
    
    const newCount = (newsItem.likesCount || 0) + (increment ? 1 : -1);
    await db.update(news).set({ likesCount: newCount }).where(eq(news.id, id));
    return true;
  }

  // Message methods
  async getMessages(groupId?: string, userId?: string): Promise<Message[]> {
    if (groupId) {
      return await db.select().from(messages).where(eq(messages.groupId, groupId)).orderBy(messages.createdAt);
    }
    if (userId) {
      return await db.select().from(messages)
        .where(or(eq(messages.recipientId, userId), eq(messages.senderId, userId)))
        .orderBy(messages.createdAt);
    }
    return await db.select().from(messages).orderBy(messages.createdAt);
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Notification methods
  async getNotifications(userId: string, type?: string): Promise<Notification[]> {
    if (type) {
      return await db.select().from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.type, type)))
        .orderBy(desc(notifications.createdAt));
    }
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification || undefined;
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const result = await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await db.delete(notifications).where(eq(notifications.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Event Guest methods
  async getEventGuests(eventId: string): Promise<EventGuest[]> {
    return await db.select().from(eventGuests).where(eq(eventGuests.eventId, eventId));
  }

  async createEventGuest(insertGuest: InsertEventGuest): Promise<EventGuest> {
    const [guest] = await db.insert(eventGuests).values(insertGuest).returning();
    return guest;
  }

  async updateEventGuestStatus(eventId: string, userId: string, status: string): Promise<boolean> {
    const result = await db.update(eventGuests)
      .set({ status })
      .where(and(eq(eventGuests.eventId, eventId), eq(eventGuests.userId, userId)));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Event Comment methods
  async getEventComments(eventId: string): Promise<EventComment[]> {
    return await db.select().from(eventComments)
      .where(eq(eventComments.eventId, eventId))
      .orderBy(desc(eventComments.createdAt));
  }

  async createEventComment(insertComment: InsertEventComment): Promise<EventComment> {
    const [comment] = await db.insert(eventComments).values(insertComment).returning();
    return comment;
  }

  async deleteEventComment(id: string): Promise<boolean> {
    const result = await db.delete(eventComments).where(eq(eventComments.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Group Member methods
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    return await db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
  }

  async getUserGroups(userId: string): Promise<GroupMember[]> {
    return await db.select().from(groupMembers)
      .where(eq(groupMembers.userId, userId))
      .orderBy(desc(groupMembers.joinedAt));
  }

  async createGroupMember(insertMember: InsertGroupMember): Promise<GroupMember> {
    const [member] = await db.insert(groupMembers).values(insertMember).returning();
    return member;
  }

  async deleteGroupMember(groupId: string, userId: string): Promise<boolean> {
    const result = await db.delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private activities: Map<string, Activity>;
  private events: Map<string, Event>;
  private groups: Map<string, Group>;
  private news: Map<string, News>;
  private messages: Map<string, Message>;
  private notifications: Map<string, Notification>;
  private eventGuests: Map<string, EventGuest>;
  private eventComments: Map<string, EventComment>;
  private groupMembers: Map<string, GroupMember>;

  constructor() {
    this.users = new Map();
    this.activities = new Map();
    this.events = new Map();
    this.groups = new Map();
    this.news = new Map();
    this.messages = new Map();
    this.notifications = new Map();
    this.eventGuests = new Map();
    this.eventComments = new Map();
    this.groupMembers = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed users
    const user1: User = {
      id: randomUUID(),
      username: "rahul_kanpur",
      name: "Rahul Kanpur",
      bio: "Product Designer | Foodie | Traveler 📍Delhi\nTrying to capture the beauty of my city, one click at a time.",
      location: "Delhi, India",
      interests: ["Food", "Travel", "Photography"],
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul",
      followersCount: 1200,
      followingCount: 300,
      postsCount: 120,
    };
    this.users.set(user1.id, user1);

    const user2: User = {
      id: randomUUID(),
      username: "priya_sharma",
      name: "Priya Sharma",
      bio: "Sports enthusiast | IIT Kanpur",
      location: "Kanpur, India",
      interests: ["Sports", "Cricket", "Fitness"],
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
      followersCount: 850,
      followingCount: 420,
      postsCount: 65,
    };
    this.users.set(user2.id, user2);

    const user3: User = {
      id: randomUUID(),
      username: "localreporter",
      name: "Local Reporter",
      bio: "Reporting local news from Delhi NCR",
      location: "Delhi, India",
      interests: ["News", "Journalism"],
      avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=LR",
      followersCount: 5200,
      followingCount: 150,
      postsCount: 342,
    };
    this.users.set(user3.id, user3);

    // Seed activities
    const activity1: Activity = {
      id: randomUUID(),
      userId: user1.id,
      title: "Going to watch Jawan at PVR Mall",
      description: "Excited to announce a movie meetup for the new Shah Rukh Khan movie! Let's catch the first day first show together.",
      imageUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",
      location: "PVR Mall, Kanpur",
      startDate: new Date(Date.now() + 86400000),
      endDate: null,
      maxParticipants: 10,
      visibility: "Public",
      cost: "Paid Entry",
      category: "Movies",
      likesCount: 23,
      commentsCount: 5,
      participantsCount: 6,
      createdAt: new Date(Date.now() - 7200000),
    };
    this.activities.set(activity1.id, activity1);

    const activity2: Activity = {
      id: randomUUID(),
      userId: user2.id,
      title: "Cricket match at IIT Kanpur ground tomorrow!",
      description: "Need players 🏏",
      imageUrl: null,
      location: "IIT Kanpur",
      startDate: new Date(Date.now() + 86400000),
      endDate: null,
      maxParticipants: 22,
      visibility: "Public",
      cost: "Free",
      category: "Sports",
      likesCount: 15,
      commentsCount: 8,
      participantsCount: 12,
      createdAt: new Date(Date.now() - 18000000),
    };
    this.activities.set(activity2.id, activity2);

    // Seed events
    const event1: Event = {
      id: randomUUID(),
      userId: user1.id,
      title: "TechSparks 2024",
      description: "India's biggest startup conference",
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
      location: "Bangalore International Centre",
      startDate: new Date(Date.now() + 864000000),
      endDate: null,
      maxAttendees: null,
      visibility: "Public",
      entryType: "FREE",
      price: null,
      category: ["TECH", "STARTUP"],
      attendeesCount: 125,
      createdAt: new Date(),
    };
    this.events.set(event1.id, event1);

    const event2: Event = {
      id: randomUUID(),
      userId: user2.id,
      title: "Rang Barse - Holi Festival",
      description: "Celebrate Holi with colors and music",
      imageUrl: "https://images.unsplash.com/photo-1583338506904-91cfd5c67a9b?w=800",
      location: "Jawaharlal Nehru Stadium, Delhi",
      startDate: new Date(Date.now() + 2592000000),
      endDate: null,
      maxAttendees: 1000,
      visibility: "Public",
      entryType: "PAID",
      price: 500,
      category: ["FESTIVAL"],
      attendeesCount: 500,
      createdAt: new Date(),
    };
    this.events.set(event2.id, event2);

    // Seed groups
    const group1: Group = {
      id: randomUUID(),
      name: "Kanpur Startups",
      description: "A community for startup enthusiasts in Kanpur",
      imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400",
      groupType: "Public",
      category: "Startups",
      rules: "Be respectful, No spam, Stay relevant",
      membersCount: 1200,
      createdAt: new Date(),
    };
    this.groups.set(group1.id, group1);

    const group2: Group = {
      id: randomUUID(),
      name: "Delhi Foodies",
      description: "For food lovers sharing restaurant recommendations",
      imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400",
      groupType: "Private",
      category: "Foodies",
      rules: "Share food pics, Recommend places, No self-promotion",
      membersCount: 875,
      createdAt: new Date(),
    };
    this.groups.set(group2.id, group2);

    // Seed news
    const news1: News = {
      id: randomUUID(),
      userId: user3.id,
      headline: "Road closed near IIT Gate",
      description: "A brief summary of the news item about a temporary road closure affecting local traffic.",
      imageUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800",
      location: "Hauz Khas, Delhi",
      category: "Local",
      trueVotes: 210,
      fakeVotes: 105,
      likesCount: 120,
      commentsCount: 88,
      publishedAt: new Date(Date.now() - 300000),
    };
    this.news.set(news1.id, news1);

    const news2: News = {
      id: randomUUID(),
      userId: user3.id,
      headline: "New café opening in Swaroop Nagar",
      description: "Exciting news for coffee lovers! A brand new cafe is opening its doors this weekend.",
      imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800",
      location: "Swaroop Nagar, Kanpur",
      category: "Local",
      trueVotes: 560,
      fakeVotes: 12,
      likesCount: 973,
      commentsCount: 102,
      publishedAt: new Date(Date.now() - 7200000),
    };
    this.news.set(news2.id, news2);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      username: insertUser.username,
      name: insertUser.name,
      bio: insertUser.bio ?? null,
      location: insertUser.location ?? null,
      interests: insertUser.interests ?? null,
      avatarUrl: insertUser.avatarUrl ?? null,
      followersCount: insertUser.followersCount ?? 0,
      followingCount: insertUser.followingCount ?? 0,
      postsCount: insertUser.postsCount ?? 0,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  // Activity methods
  async getActivities(limit = 50): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  async getActivity(id: string): Promise<Activity | undefined> {
    return this.activities.get(id);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const activity: Activity = {
      id,
      userId: insertActivity.userId,
      title: insertActivity.title,
      description: insertActivity.description ?? null,
      imageUrl: insertActivity.imageUrl ?? null,
      location: insertActivity.location ?? null,
      startDate: insertActivity.startDate ?? null,
      endDate: insertActivity.endDate ?? null,
      maxParticipants: insertActivity.maxParticipants ?? null,
      visibility: insertActivity.visibility,
      cost: insertActivity.cost ?? null,
      category: insertActivity.category ?? null,
      likesCount: 0,
      commentsCount: 0,
      participantsCount: 0,
      createdAt: new Date(),
    };
    this.activities.set(id, activity);
    return activity;
  }

  async updateActivity(id: string, updates: Partial<InsertActivity>): Promise<Activity | undefined> {
    const activity = this.activities.get(id);
    if (!activity) return undefined;
    
    const updated = { ...activity, ...updates };
    this.activities.set(id, updated);
    return updated;
  }

  async deleteActivity(id: string): Promise<boolean> {
    return this.activities.delete(id);
  }

  async likeActivity(id: string, increment: boolean): Promise<boolean> {
    const activity = this.activities.get(id);
    if (!activity) return false;
    
    activity.likesCount = (activity.likesCount || 0) + (increment ? 1 : -1);
    this.activities.set(id, activity);
    return true;
  }

  // Event methods
  async getEvents(limit = 50): Promise<Event[]> {
    return Array.from(this.events.values())
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  async getEvent(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const event: Event = {
      id,
      userId: insertEvent.userId,
      title: insertEvent.title,
      description: insertEvent.description ?? null,
      imageUrl: insertEvent.imageUrl ?? null,
      location: insertEvent.location,
      startDate: insertEvent.startDate,
      endDate: insertEvent.endDate ?? null,
      maxAttendees: insertEvent.maxAttendees ?? null,
      visibility: insertEvent.visibility,
      entryType: insertEvent.entryType,
      price: insertEvent.price ?? null,
      category: insertEvent.category ?? null,
      attendeesCount: 0,
      createdAt: new Date(),
    };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    const updated = { ...event, ...updates };
    this.events.set(id, updated);
    return updated;
  }

  async deleteEvent(id: string): Promise<boolean> {
    return this.events.delete(id);
  }

  // Group methods
  async getGroups(limit = 50): Promise<Group[]> {
    return Array.from(this.groups.values())
      .sort((a, b) => (b.membersCount || 0) - (a.membersCount || 0))
      .slice(0, limit);
  }

  async getGroup(id: string): Promise<Group | undefined> {
    return this.groups.get(id);
  }

  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const id = randomUUID();
    const group: Group = {
      id,
      name: insertGroup.name,
      description: insertGroup.description ?? null,
      imageUrl: insertGroup.imageUrl ?? null,
      groupType: insertGroup.groupType,
      category: insertGroup.category ?? null,
      rules: insertGroup.rules ?? null,
      membersCount: 0,
      createdAt: new Date(),
    };
    this.groups.set(id, group);
    return group;
  }

  async updateGroup(id: string, updates: Partial<InsertGroup>): Promise<Group | undefined> {
    const group = this.groups.get(id);
    if (!group) return undefined;
    
    const updated = { ...group, ...updates };
    this.groups.set(id, updated);
    return updated;
  }

  async deleteGroup(id: string): Promise<boolean> {
    return this.groups.delete(id);
  }

  // News methods
  async getNews(limit = 50): Promise<News[]> {
    return Array.from(this.news.values())
      .sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  async getNewsItem(id: string): Promise<News | undefined> {
    return this.news.get(id);
  }

  async createNews(insertNews: InsertNews): Promise<News> {
    const id = randomUUID();
    const newsItem: News = {
      id,
      userId: insertNews.userId,
      headline: insertNews.headline,
      description: insertNews.description ?? null,
      imageUrl: insertNews.imageUrl ?? null,
      location: insertNews.location ?? null,
      category: insertNews.category,
      trueVotes: 0,
      fakeVotes: 0,
      likesCount: 0,
      commentsCount: 0,
      publishedAt: new Date(),
    };
    this.news.set(id, newsItem);
    return newsItem;
  }

  async updateNews(id: string, updates: Partial<InsertNews>): Promise<News | undefined> {
    const newsItem = this.news.get(id);
    if (!newsItem) return undefined;
    
    const updated = { ...newsItem, ...updates };
    this.news.set(id, updated);
    return updated;
  }

  async deleteNews(id: string): Promise<boolean> {
    return this.news.delete(id);
  }

  async voteNews(id: string, voteType: 'true' | 'fake', increment: boolean): Promise<boolean> {
    const newsItem = this.news.get(id);
    if (!newsItem) return false;
    
    if (voteType === 'true') {
      newsItem.trueVotes = (newsItem.trueVotes || 0) + (increment ? 1 : -1);
    } else {
      newsItem.fakeVotes = (newsItem.fakeVotes || 0) + (increment ? 1 : -1);
    }
    this.news.set(id, newsItem);
    return true;
  }

  async likeNews(id: string, increment: boolean): Promise<boolean> {
    const newsItem = this.news.get(id);
    if (!newsItem) return false;
    
    newsItem.likesCount = (newsItem.likesCount || 0) + (increment ? 1 : -1);
    this.news.set(id, newsItem);
    return true;
  }

  // Message methods
  async getMessages(groupId?: string, userId?: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => {
        if (groupId) return msg.groupId === groupId;
        if (userId) return msg.recipientId === userId || msg.senderId === userId;
        return true;
      })
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
  }

  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      id,
      senderId: insertMessage.senderId,
      recipientId: insertMessage.recipientId ?? null,
      groupId: insertMessage.groupId ?? null,
      content: insertMessage.content,
      imageUrl: insertMessage.imageUrl ?? null,
      messageType: insertMessage.messageType,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async deleteMessage(id: string): Promise<boolean> {
    return this.messages.delete(id);
  }

  // Notification methods
  async getNotifications(userId: string, type?: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notif => {
        if (notif.userId !== userId) return false;
        if (type && notif.type !== type) return false;
        return true;
      })
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      id,
      userId: insertNotification.userId,
      type: insertNotification.type,
      title: insertNotification.title,
      description: insertNotification.description,
      actionUrl: insertNotification.actionUrl ?? null,
      relatedId: insertNotification.relatedId ?? null,
      relatedUserIds: insertNotification.relatedUserIds ?? null,
      isRead: false,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    notification.isRead = true;
    this.notifications.set(id, notification);
    return true;
  }

  async deleteNotification(id: string): Promise<boolean> {
    return this.notifications.delete(id);
  }

  // Event Guest methods
  async getEventGuests(eventId: string): Promise<EventGuest[]> {
    return Array.from(this.eventGuests.values())
      .filter(guest => guest.eventId === eventId);
  }

  async createEventGuest(insertGuest: InsertEventGuest): Promise<EventGuest> {
    const id = randomUUID();
    const guest: EventGuest = {
      id,
      eventId: insertGuest.eventId,
      userId: insertGuest.userId,
      status: insertGuest.status,
      createdAt: new Date(),
    };
    this.eventGuests.set(id, guest);
    return guest;
  }

  async updateEventGuestStatus(eventId: string, userId: string, status: string): Promise<boolean> {
    const guest = Array.from(this.eventGuests.values())
      .find(g => g.eventId === eventId && g.userId === userId);
    if (!guest) return false;
    
    guest.status = status;
    this.eventGuests.set(guest.id, guest);
    return true;
  }

  // Event Comment methods
  async getEventComments(eventId: string): Promise<EventComment[]> {
    return Array.from(this.eventComments.values())
      .filter(comment => comment.eventId === eventId)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  async createEventComment(insertComment: InsertEventComment): Promise<EventComment> {
    const id = randomUUID();
    const comment: EventComment = {
      id,
      eventId: insertComment.eventId,
      userId: insertComment.userId,
      content: insertComment.content,
      createdAt: new Date(),
    };
    this.eventComments.set(id, comment);
    return comment;
  }

  async deleteEventComment(id: string): Promise<boolean> {
    return this.eventComments.delete(id);
  }

  // Group Member methods
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    return Array.from(this.groupMembers.values())
      .filter(member => member.groupId === groupId);
  }

  async getUserGroups(userId: string): Promise<GroupMember[]> {
    return Array.from(this.groupMembers.values())
      .filter(member => member.userId === userId)
      .sort((a, b) => {
        const dateA = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
        const dateB = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  async createGroupMember(insertMember: InsertGroupMember): Promise<GroupMember> {
    const id = randomUUID();
    const member: GroupMember = {
      id,
      groupId: insertMember.groupId,
      userId: insertMember.userId,
      role: insertMember.role ?? "member",
      joinedAt: new Date(),
    };
    this.groupMembers.set(id, member);
    return member;
  }

  async deleteGroupMember(groupId: string, userId: string): Promise<boolean> {
    const member = Array.from(this.groupMembers.values())
      .find(m => m.groupId === groupId && m.userId === userId);
    if (!member) return false;
    
    return this.groupMembers.delete(member.id);
  }
}

// Use DatabaseStorage for production with PostgreSQL
export const storage = new DatabaseStorage();

// Keep MemStorage available for testing/development if needed
// export const storage = new MemStorage();
