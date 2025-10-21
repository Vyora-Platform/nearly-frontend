import { type Express } from "express";
import passport from "passport";

export function registerAuthRoutes(app: Express) {
  // Initiate Google OAuth
  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  // Google OAuth callback
  app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/sign-in?error=auth_failed",
    }),
    (req, res) => {
      // Successful authentication, redirect to home
      res.redirect("/");
    }
  );

  // Logout
  app.post("/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: "Session destruction failed" });
        }
        res.clearCookie("connect.sid");
        res.json({ success: true });
      });
    });
  });

  // Get current user
  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });
}
