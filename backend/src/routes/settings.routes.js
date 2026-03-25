import { Router } from "express";

import { requireAuth } from "../middlewares/auth.js";
import {
  listExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  getActiveMonth,
  setActiveMonth
} from "../controllers/settings.controller.js";

export const settingsRouter = Router();

settingsRouter.get("/expense-categories", requireAuth(["admin", "manager", "data_entry"]), listExpenseCategories);
settingsRouter.post("/expense-categories", requireAuth(["admin", "manager"]), createExpenseCategory);
settingsRouter.put("/expense-categories/:id", requireAuth(["admin", "manager"]), updateExpenseCategory);
settingsRouter.get("/month", requireAuth(["admin", "manager", "data_entry"]), getActiveMonth);
settingsRouter.put("/month", requireAuth(["admin", "manager"]), setActiveMonth);
