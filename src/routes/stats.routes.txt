import { Router } from "express";
import { StatsController } from "../controllers/stats.controller.js";

const router: Router = Router();

router.get("/global", StatsController.getGlobalStats);

export default router;