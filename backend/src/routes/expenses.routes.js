import { Router } from "express";

import { requireAuth } from "../middlewares/auth.js";
import {
  createExpense,
  listExpenses,
  updateExpense,
  deleteExpense
} from "../controllers/expenses.controller.js";

export const expensesRouter = Router();

const readableRoles = ["admin", "manager", "data_entry"];
const writableRoles = ["admin", "manager"];

expensesRouter.post("/", requireAuth(readableRoles), createExpense);
expensesRouter.get("/", requireAuth(readableRoles), listExpenses);
expensesRouter.put("/:id", requireAuth(writableRoles), updateExpense);
expensesRouter.delete("/:id", requireAuth(writableRoles), deleteExpense);
