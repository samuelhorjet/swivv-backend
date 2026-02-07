import { Router } from "express";
import { LeaderboardController } from "../controllers/leaderboard.controller.js";

const router: Router = Router();

router.get("/profit", LeaderboardController.getProfitLeaderboard);
router.get("/volume", LeaderboardController.getVolumeLeaderboard);

export default router;