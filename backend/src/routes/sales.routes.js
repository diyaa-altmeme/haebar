import { Router } from "express";

import { requireAuth } from "../middlewares/auth.js";
import {
  createSale,
  updateSale,
  deleteSale,
  getSale,
  getSalesDay,
  getCashBreakdown
} from "../controllers/sales.controller.js";

export const salesRouter = Router();

const salesReadableRoles = ["admin", "manager", "data_entry"];
const salesWritableRoles = ["admin", "manager"];

salesRouter.post("/", requireAuth(salesReadableRoles), createSale);
salesRouter.get("/", requireAuth(salesReadableRoles), getSale);

salesRouter.put("/:id", requireAuth(salesWritableRoles), updateSale);
salesRouter.delete("/:id", requireAuth(salesWritableRoles), deleteSale);

salesRouter.get("/day", requireAuth(salesReadableRoles), getSalesDay);

// Cash breakdown endpoints (read-only for now)
salesRouter.get("/:id/cash-breakdown", requireAuth(salesReadableRoles), getCashBreakdown);
