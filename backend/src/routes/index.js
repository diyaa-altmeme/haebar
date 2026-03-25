import { Router } from "express";

import { authRouter } from "./auth.routes.js";
import { dashboardRouter } from "./dashboard.routes.js";
import { salesRouter } from "./sales.routes.js";
import { expensesRouter } from "./expenses.routes.js";
import { boxesRouter } from "./boxes.routes.js";
import { transfersRouter } from "./transfers.routes.js";
import { reportsRouter } from "./reports.routes.js";
import { employeesRouter } from "./employees.routes.js";
import { settingsRouter } from "./settings.routes.js";
import { usersRouter } from "./users.routes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/sales", salesRouter);
apiRouter.use("/expenses", expensesRouter);
apiRouter.use("/boxes", boxesRouter);
apiRouter.use("/transfers", transfersRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/employees", employeesRouter);
apiRouter.use("/settings", settingsRouter);
apiRouter.use("/users", usersRouter);
