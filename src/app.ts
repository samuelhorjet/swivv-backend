// src/app.ts
import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet"; 
import { apiLimiter } from "./middleware/rateLimiter.js"; 

import userRoutes from "./routes/users.routes.js";
import poolRoutes from "./routes/pools.routes.js";
import predictionRoutes from "./routes/predictions.routes.js";
import stateRoutes from "./routes/stats.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";
import protocolRoutes from "./routes/protocol.routes.js";

const app: Express = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000", 
  methods: ["GET", "POST", "PUT"],
  allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"],
}));

app.use("/api", apiLimiter);

app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/pools", poolRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/stats", stateRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/protocol", protocolRoutes);

export default app;