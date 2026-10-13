import { Router } from "express";
import { isAuthenticated } from "../../middleware/authMiddleware.js";
import * as controller from "../../controllers/attendance/feedback.controller.js";

const router = Router();
router.use(isAuthenticated);
router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.detail);
router.post("/:id/resolve", controller.resolve);
export default router;
