import { 
  type User, type InsertUser,
  type Activity, type InsertActivity,
  type Event, type InsertEvent,
  type Group, type InsertGroup,
  type News, type InsertNews
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private activities: Map<string, Activity>;
  private events: Map<string, Event>;
  private groups: Map<string, Group>;
  private news: Map<string, News>;

  constructor() {
    this.users = new Map();
    this.activities = new Map();
    this.events = new Map();
    this.groups = new Map();
    this.news = new Map();
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
}

export const storage = new MemStorage();
