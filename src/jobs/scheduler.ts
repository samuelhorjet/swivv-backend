import cron from "node-cron";
import { PoolResolutionService } from "../services/solana/poolResolution.service.js";

export const startCronJobs = () => {
  console.log("⏰ Starting Cron Jobs...");

  cron.schedule("* * * * *", async () => {
    await PoolResolutionService.resolveExpiredPools();
  });
};