import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express } from "express";
import { storage } from "./storage";

declare global {
  namespace Express {
    interface User {
      id: string;
      googleId: string;
      email: string;
      username: string;
      name: string;
      avatarUrl: string | null;
    }
  }
}

export function setupAuth(app: Express) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const BASE_URL = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : "http://localhost:5000";

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error("⚠️  Google OAuth credentials not found in environment variables");
    console.error("Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: `${BASE_URL}/auth/google/callback`,
        scope: ["profile", "email"],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName;
          const avatarUrl = profile.photos?.[0]?.value || null;

          if (!email) {
            return done(new Error("No email found in Google profile"));
          }

          // Check if user exists by googleId
          let user = await storage.getUserByGoogleId(googleId);

          if (!user) {
            // Check if user exists by email
            user = await storage.getUserByEmail(email);

            if (user) {
              // User exists with email but no googleId - link accounts
              user = await storage.updateUser(user.id, { googleId });
            } else {
              // Create new user
              // Generate username from email
              const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
              let username = baseUsername;
              let counter = 1;

              // Ensure username is unique
              while (await storage.getUserByUsername(username)) {
                username = `${baseUsername}${counter}`;
                counter++;
              }

              user = await storage.createUser({
                googleId,
                email,
                username,
                name,
                avatarUrl,
                bio: null,
                location: null,
                interests: null,
                followersCount: 0,
                followingCount: 0,
                postsCount: 0,
              });
            }
          }

          if (!user) {
            return done(new Error("Failed to create or retrieve user"));
          }

          return done(null, {
            id: user.id,
            googleId: user.googleId!,
            email: user.email!,
            username: user.username,
            name: user.name,
            avatarUrl: user.avatarUrl,
          });
        } catch (error) {
          console.error("Error in Google OAuth strategy:", error);
          return done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, {
        id: user.id,
        googleId: user.googleId!,
        email: user.email!,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
      });
    } catch (error) {
      done(error);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());
}
