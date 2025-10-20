import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertActivitySchema, 
  insertEventSchema, 
  insertGroupSchema, 
  insertNewsSchema,
  insertUserSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/users/username/:username", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validated = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validated);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Activity routes
  app.get("/api/activities", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const activities = await storage.getActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/activities/:id", async (req, res) => {
    try {
      const activity = await storage.getActivity(req.params.id);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.json(activity);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/activities", async (req, res) => {
    try {
      const validated = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(validated);
      res.status(201).json(activity);
    } catch (error) {
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  app.patch("/api/activities/:id", async (req, res) => {
    try {
      const activity = await storage.updateActivity(req.params.id, req.body);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.json(activity);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/activities/:id", async (req, res) => {
    try {
      const success = await storage.deleteActivity(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/activities/:id/like", async (req, res) => {
    try {
      const { increment } = req.body;
      const success = await storage.likeActivity(req.params.id, increment);
      if (!success) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Event routes
  app.get("/api/events", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const events = await storage.getEvents(limit);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const validated = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(validated);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  app.patch("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.updateEvent(req.params.id, req.body);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    try {
      const success = await storage.deleteEvent(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Group routes
  app.get("/api/groups", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const groups = await storage.getGroups(limit);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/groups/:id", async (req, res) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      res.json(group);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/groups", async (req, res) => {
    try {
      const validated = insertGroupSchema.parse(req.body);
      const group = await storage.createGroup(validated);
      res.status(201).json(group);
    } catch (error) {
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  app.patch("/api/groups/:id", async (req, res) => {
    try {
      const group = await storage.updateGroup(req.params.id, req.body);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      res.json(group);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/groups/:id", async (req, res) => {
    try {
      const success = await storage.deleteGroup(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Group not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // News routes
  app.get("/api/news", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const news = await storage.getNews(limit);
      res.json(news);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/news/:id", async (req, res) => {
    try {
      const newsItem = await storage.getNewsItem(req.params.id);
      if (!newsItem) {
        return res.status(404).json({ error: "News not found" });
      }
      res.json(newsItem);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/news", async (req, res) => {
    try {
      const validated = insertNewsSchema.parse(req.body);
      const newsItem = await storage.createNews(validated);
      res.status(201).json(newsItem);
    } catch (error) {
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  app.patch("/api/news/:id", async (req, res) => {
    try {
      const newsItem = await storage.updateNews(req.params.id, req.body);
      if (!newsItem) {
        return res.status(404).json({ error: "News not found" });
      }
      res.json(newsItem);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/news/:id", async (req, res) => {
    try {
      const success = await storage.deleteNews(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "News not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/news/:id/vote", async (req, res) => {
    try {
      const { voteType, increment } = req.body;
      const success = await storage.voteNews(req.params.id, voteType, increment);
      if (!success) {
        return res.status(404).json({ error: "News not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/news/:id/like", async (req, res) => {
    try {
      const { increment } = req.body;
      const success = await storage.likeNews(req.params.id, increment);
      if (!success) {
        return res.status(404).json({ error: "News not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
