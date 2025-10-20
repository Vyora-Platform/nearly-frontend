import { apiRequest } from "./queryClient";
import type { Activity, Event, Group, News, User } from "@shared/schema";

export const api = {
  // Activities
  getActivities: async (): Promise<Activity[]> => {
    const res = await fetch("/api/activities");
    return res.json();
  },
  getActivity: async (id: string): Promise<Activity> => {
    const res = await fetch(`/api/activities/${id}`);
    return res.json();
  },
  createActivity: async (data: Partial<Activity>): Promise<Activity> => {
    const res = await apiRequest("POST", "/api/activities", data);
    return res.json();
  },
  likeActivity: async (id: string, increment: boolean): Promise<{ success: boolean }> => {
    const res = await apiRequest("POST", `/api/activities/${id}/like`, { increment });
    return res.json();
  },

  // Events
  getEvents: async (): Promise<Event[]> => {
    const res = await fetch("/api/events");
    return res.json();
  },
  getEvent: async (id: string): Promise<Event> => {
    const res = await fetch(`/api/events/${id}`);
    return res.json();
  },
  createEvent: async (data: Partial<Event>): Promise<Event> => {
    const res = await apiRequest("POST", "/api/events", data);
    return res.json();
  },

  // Groups
  getGroups: async (): Promise<Group[]> => {
    const res = await fetch("/api/groups");
    return res.json();
  },
  getGroup: async (id: string): Promise<Group> => {
    const res = await fetch(`/api/groups/${id}`);
    return res.json();
  },
  createGroup: async (data: Partial<Group>): Promise<Group> => {
    const res = await apiRequest("POST", "/api/groups", data);
    return res.json();
  },

  // News
  getNews: async (): Promise<News[]> => {
    const res = await fetch("/api/news");
    return res.json();
  },
  getNewsItem: async (id: string): Promise<News> => {
    const res = await fetch(`/api/news/${id}`);
    return res.json();
  },
  createNews: async (data: Partial<News>): Promise<News> => {
    const res = await apiRequest("POST", "/api/news", data);
    return res.json();
  },
  voteNews: async (id: string, voteType: 'true' | 'fake', increment: boolean): Promise<{ success: boolean }> => {
    const res = await apiRequest("POST", `/api/news/${id}/vote`, { voteType, increment });
    return res.json();
  },
  likeNews: async (id: string, increment: boolean): Promise<{ success: boolean }> => {
    const res = await apiRequest("POST", `/api/news/${id}/like`, { increment });
    return res.json();
  },

  // Users
  getUser: async (id: string): Promise<User> => {
    const res = await fetch(`/api/users/${id}`);
    return res.json();
  },
  getUserByUsername: async (username: string): Promise<User> => {
    const res = await fetch(`/api/users/username/${username}`);
    return res.json();
  },
  updateUser: async (id: string, data: Partial<User>): Promise<User> => {
    const res = await apiRequest("PATCH", `/api/users/${id}`, data);
    return res.json();
  },
};
