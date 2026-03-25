import { Router } from "express";

import { requireAuth } from "../middlewares/auth.js";
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  employeeSales
} from "../controllers/employees.controller.js";

export const employeesRouter = Router();

employeesRouter.get("/", requireAuth(["admin", "manager"]), listEmployees);
employeesRouter.post("/", requireAuth(["admin"]), createEmployee);
employeesRouter.put("/:id", requireAuth(["admin", "manager"]), updateEmployee);
employeesRouter.get("/:id/sales", requireAuth(["admin", "manager"]), employeeSales);
