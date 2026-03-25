import { Router } from "express";

import { requireAuth } from "../middlewares/auth.js";
import {
  createTransfer,
  listTransfers,
  confirmTransfer
} from "../controllers/transfers.controller.js";

export const transfersRouter = Router();

const readableRoles = ["admin", "manager", "data_entry"];
const writableRoles = ["admin", "manager"];

transfersRouter.post("/", requireAuth(writableRoles), createTransfer);
transfersRouter.get("/", requireAuth(readableRoles), listTransfers);
transfersRouter.put("/:id/confirm", requireAuth(writableRoles), confirmTransfer);
