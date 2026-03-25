import { Router } from "express";

import { requireAuth } from "../middlewares/auth.js";
import { listBoxes, updateOpening, updateActual } from "../controllers/boxes.controller.js";

export const boxesRouter = Router();

const readableRoles = ["admin", "manager", "data_entry"];
const writableRoles = ["admin", "manager"];

boxesRouter.get("/", requireAuth(readableRoles), listBoxes);
boxesRouter.put("/:type/opening", requireAuth(writableRoles), updateOpening);
boxesRouter.put("/:type/actual", requireAuth(writableRoles), updateActual);
