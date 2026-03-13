import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requireAuth } from "./middleware/require-auth.js";
import { authRouter } from "./routes/auth.js";
import { beneficiariosRouter } from "./routes/beneficiarios.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { exportsRouter } from "./routes/exports.js";
import { usersRouter } from "./routes/users.js";

export function createApp() {
  const app = express();
  const allowedOrigins = new Set([env.APP_ORIGIN, ...env.APP_ORIGINS]);

  const openCors = allowedOrigins.has("*");

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || openCors) {
          return callback(null, true);
        }

        if (allowedOrigins.has(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: false,
    }),
  );
  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRouter);
  app.use(requireAuth);
  app.use("/dashboard", dashboardRouter);
  app.use("/beneficiarios", beneficiariosRouter);
  app.use("/exports", exportsRouter);
  app.use("/users", usersRouter);

  app.use(errorHandler);

  return app;
}
