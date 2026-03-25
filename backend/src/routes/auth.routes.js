import { Router } from "express";

import { login, logout, refresh } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.js";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/refresh", refresh);
// Logout can be done either with Authorization header or only by refreshToken in body.
authRouter.post("/logout", requireAuth(), logout);
