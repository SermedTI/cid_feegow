import { Router } from "express";
import { requireRole } from "../middleware/require-role.js";
import { userService } from "../services/user-service.js";
import { AppError } from "../lib/app-error.js";

export const usersRouter = Router();

usersRouter.use(requireRole("admin"));

usersRouter.get("/", async (req, res, next) => {
  try {
    const users = await userService.list();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, "Nao autenticado.");
    }

    const user = await userService.create(req.body, req.user.id);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

usersRouter.patch("/:userId", async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError(401, "Nao autenticado.");
    }

    const user = await userService.update(req.params.userId, req.body, req.user.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
});
