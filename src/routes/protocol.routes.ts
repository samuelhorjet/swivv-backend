import { Router } from "express";
import { ProtocolController } from "../controllers/protocol.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router: Router = Router();

router.get("/", requireAuth, requireAdmin, ProtocolController.getConfig);

export default router;