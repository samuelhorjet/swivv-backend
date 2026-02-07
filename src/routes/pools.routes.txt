import { Router } from "express";
import { PoolController } from "../controllers/pools.controller.js";

const router: Router = Router();

router.get("/", PoolController.getMarkets);
router.get("/:address", PoolController.getPoolDetail);
router.delete("/:address", PoolController.deletePool);

export default router;