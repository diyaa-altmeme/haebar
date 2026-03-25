import { Router } from "express";
import { getUsers, createUser, updateUser, deleteUser } from "../controllers/users.controller.js";
import { requireAuth } from "../middlewares/auth.js";

export const usersRouter = Router();

// Only admin can manage users
usersRouter.use(requireAuth("admin"));

usersRouter.get("/", getUsers);
usersRouter.post("/", createUser);
usersRouter.patch("/:id", updateUser);
usersRouter.delete("/:id", deleteUser);
