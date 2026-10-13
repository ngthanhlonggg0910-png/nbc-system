import { Router } from "express";
import { getSummary } from "../../controllers/dashboard/dashboard.controller.js";
import { isAuthenticated } from "../../middleware/authMiddleware.js";

const router = Router();

router.get("/summary", isAuthenticated, getSummary);

export default router;
