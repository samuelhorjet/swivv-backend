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

app.get("/", (req, res) => {
  const uptime = process.uptime();
  const uptimeString = new Date(uptime * 1000).toISOString().substr(11, 8);
  const memoryUsage = process.memoryUsage();
  const usedMemory = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
  const serverTime = new Date().toISOString();

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Swiv Privacy Node | Status</title>
      <style>
        body {
          background-color: #0b0f1a;
          color: #e2e8f0;
          font-family: 'Courier New', monospace;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
        .container {
          background: #161b2c;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 40px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        h1 {
          color: #3b82f6;
          margin-top: 0;
          font-size: 24px;
          border-bottom: 1px solid #334155;
          padding-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .status-dot {
          height: 10px;
          width: 10px;
          background-color: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 10px #22c55e;
          display: inline-block;
        }
        .metric {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #1e293b;
          font-size: 14px;
        }
        .metric:last-child { border-bottom: none; }
        .label { color: #94a3b8; }
        .value { color: #f8fafc; font-weight: bold; }
        .links {
          margin-top: 25px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .btn {
          background: #1e293b;
          color: #60a5fa;
          text-decoration: none;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          transition: background 0.2s;
          border: 1px solid #334155;
        }
        .btn:hover { background: #334155; color: white; }
        .refresh {
          font-size: 10px;
          color: #475569;
          text-align: center;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1><span class="status-dot"></span> Swiv Privacy Node</h1>
        
        <div class="metric">
          <span class="label">Status</span>
          <span class="value" style="color:#22c55e">OPERATIONAL 🚀</span>
        </div>
        <div class="metric">
          <span class="label">Server Time</span>
          <span class="value">${serverTime}</span>
        </div>
        <div class="metric">
          <span class="label">Uptime</span>
          <span class="value">${uptimeString} (HH:MM:SS)</span>
        </div>
        <div class="metric">
          <span class="label">Memory Usage</span>
          <span class="value">${usedMemory} MB</span>
        </div>
        <div class="metric">
          <span class="label">Environment</span>
          <span class="value">${process.env.NODE_ENV || 'Development'}</span>
        </div>
        <div class="refresh">System Auto-Monitoring Active</div>
      </div>
    </body>
    </html>
  `;
  
  res.send(html);
});

// --- API Routes ---
app.use("/api/users", userRoutes);
app.use("/api/pools", poolRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/stats", stateRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/protocol", protocolRoutes);

export default app;