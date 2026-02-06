import { Router } from "express";
import { PredictionController } from "../controllers/predictions.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router: Router = Router();

router.get("/me", requireAuth, PredictionController.getMyHistory);
router.post("/sync", requireAuth, PredictionController.sync);
router.get("/stats/:pool_id", PredictionController.getPoolStats);

export default router;