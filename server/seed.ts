import { db } from "./db";
import { users, activities, events, groups, news, eventGuests, eventComments, groupMembers, messages, notifications } from "@shared/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await db.delete(eventGuests);
  await db.delete(eventComments);
  await db.delete(groupMembers);
  await db.delete(messages);
  await db.delete(notifications);
  await db.delete(activities);
  await db.delete(events);
  await db.delete(groups);
  await db.delete(news);
  await db.delete(users);

  console.log("✓ Cleared existing data");

  // Seed users
  const [user1, user2, user3] = await db.insert(users).values([
    {
      username: "rahul_kanpur",
      name: "Rahul Kanpur",
      bio: "Product Designer | Foodie | Traveler 📍Delhi\nTrying to capture the beauty of my city, one click at a time.",
      location: "Delhi, India",
      interests: ["Food", "Travel", "Photography"],
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul",
      followersCount: 1200,
      followingCount: 300,
      postsCount: 120,
    },
    {
      username: "priya_sharma",
      name: "Priya Sharma",
      bio: "Sports enthusiast | IIT Kanpur",
      location: "Kanpur, India",
      interests: ["Sports", "Cricket", "Fitness"],
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
      followersCount: 850,
      followingCount: 420,
      postsCount: 65,
    },
    {
      username: "localreporter",
      name: "Local Reporter",
      bio: "Reporting local news from Delhi NCR",
      location: "Delhi, India",
      interests: ["News", "Journalism"],
      avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=LR",
      followersCount: 5200,
      followingCount: 150,
      postsCount: 342,
    }
  ]).returning();

  console.log("✓ Seeded users");

  // Seed activities
  await db.insert(activities).values([
    {
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
    },
    {
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
    }
  ]);

  console.log("✓ Seeded activities");

  // Seed events
  await db.insert(events).values([
    {
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
    },
    {
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
    }
  ]);

  console.log("✓ Seeded events");

  // Seed groups
  await db.insert(groups).values([
    {
      name: "Kanpur Startups",
      description: "A community for startup enthusiasts in Kanpur",
      imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400",
      groupType: "Public",
      category: "Startups",
      rules: "Be respectful, No spam, Stay relevant",
      membersCount: 1200,
    },
    {
      name: "Delhi Foodies",
      description: "For food lovers sharing restaurant recommendations",
      imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400",
      groupType: "Private",
      category: "Foodies",
      rules: "Share food pics, Recommend places, No self-promotion",
      membersCount: 875,
    }
  ]);

  console.log("✓ Seeded groups");

  // Seed news
  await db.insert(news).values([
    {
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
    },
    {
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
    }
  ]);

  console.log("✓ Seeded news");

  console.log("✅ Database seeding complete!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Error seeding database:", error);
  process.exit(1);
});
