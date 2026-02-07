import { Router } from "express";
import { validate, schemas } from "../utils/validator.js";
import { UserController } from "../controllers/users.controller.js";

const router: Router = Router();

router.post("/sync", validate(schemas.userSync), UserController.syncUser);

export default router;