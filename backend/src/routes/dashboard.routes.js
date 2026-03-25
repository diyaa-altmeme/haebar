import { Router } from "express";

import { requireAuth } from "../middlewares/auth.js";
import { getDashboard } from "../controllers/dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", requireAuth(["admin", "manager"]), getDashboard);
