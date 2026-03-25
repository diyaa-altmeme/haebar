import { Router } from "express";

import { requireAuth } from "../middlewares/auth.js";
import {
  dailyReport,
  weeklyReport,
  monthlyReport,
  employeeReport
} from "../controllers/reports.controller.js";

export const reportsRouter = Router();

const reportRoles = ["admin", "manager"];

reportsRouter.get("/daily", requireAuth(reportRoles), dailyReport);
reportsRouter.get("/weekly", requireAuth(reportRoles), weeklyReport);
reportsRouter.get("/monthly", requireAuth(reportRoles), monthlyReport);
reportsRouter.get("/monthly/export", requireAuth(reportRoles), (_req, res) => {
  res.status(501).json({ message: "Export not implemented yet" });
});
reportsRouter.get("/employee/:id", requireAuth(reportRoles), employeeReport);
