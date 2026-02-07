import app from "./app.js";
import { env } from "./config/env.js";
import { startCronJobs } from "./jobs/scheduler.js";
import { contractService } from "./services/solana/contract.service.js";
import { PoolResolutionService } from "./services/solana/poolResolution.service.js";

const startServer = async () => {
  try {
    await contractService.runInitialFullSync();
    await PoolResolutionService.resolveExpiredPools();
    startCronJobs();
    app.listen(env.port, () => {
      console.log(`🚀 Server ready on port ${env.port}`);
    });
  } catch (err) {
    console.error(err);
  }
};

startServer();
