import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { pool } from "./config/db.js";
import { notFoundHandler } from "./middleware/notFound.js";
import universityRoutes from "./routes/university.routes.js";
import industryRoutes from "./routes/industry.routes.js";
import govtNodalRoutes from "./routes/govtNodal.routes.js";
import citizenRoutes from "./routes/citizen.routes.js";
import issueRoutes from "./routes/issue.routes.js";
import agentRoutes from "./routes/agent.routes.js";
import { connectMongoDB } from "./config/mongo.js";
import { startAgentQueue, stopAgentQueue } from "./ai/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Allowed origins (local frontend dev server & environment variable)
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

// CORS configuration with credentials support
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true, // Enables cookies (httpOnly) & authorization headers across origins
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Standard cookie options for setting httpOnly cookies
export const getCookieOptions = () => ({
  httpOnly: true, // Prevents client-side script from accessing the cookie (XSS protection)
  secure: process.env.NODE_ENV === "production", // HTTPS only in production
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Health check endpoint
app.get("/", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ message: "Server is running and Database is connected!" });
  } catch (error) {
    res.status(500).json({
      message: "Server is running, but Database connection failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Test endpoint to set an httpOnly cookie
app.post("/api/test-cookie", (_req, res) => {
  res.cookie("auth_token", "sample_secure_session_token_123", getCookieOptions());
  res.json({ success: true, message: "httpOnly cookie set successfully!" });
});

// Test endpoint to read the httpOnly cookie sent by the frontend
app.get("/api/test-cookie", (req, res) => {
  const token = req.cookies?.auth_token;
  res.json({
    success: true,
    hasCookie: !!token,
    cookieValue: token || null,
  });
});

// Test endpoint to clear the httpOnly cookie
app.post("/api/clear-cookie", (_req, res) => {
  res.clearCookie("auth_token", getCookieOptions());
  res.json({ success: true, message: "Cookie cleared successfully!" });
});

// Mount API Routes
app.use("/api/v1/university", universityRoutes);
app.use("/api/v1/industry", industryRoutes);
app.use("/api/v1/govt", govtNodalRoutes);
app.use("/api/v1/citizen", citizenRoutes);
app.use("/api/v1/issue", issueRoutes);
app.use("/api/v1/agent", agentRoutes);

// Middleware for unhandled routes (404 Not Found)
app.use(notFoundHandler);

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Initialize MongoDB connection via Mongoose
  await connectMongoDB();

  // Initialize and start persistent AI Agent Queue & monitor
  await startAgentQueue();

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "citizens" (
        "id" varchar(255) PRIMARY KEY,
        "full_name" text NOT NULL,
        "email" text NOT NULL UNIQUE,
        "password_hash" text NOT NULL,
        "phone" text,
        "state" text,
        "district" text,
        "pincode" text,
        "refresh_token" text,
        "is_email_verified" boolean DEFAULT false,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    console.log("Database: 'citizens' table verified/initialized successfully.");
  } catch (error) {
    console.error("Database initialization notice:", error);
  }
});

// Graceful shutdown
const handleShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  await stopAgentQueue();
  process.exit(0);
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));