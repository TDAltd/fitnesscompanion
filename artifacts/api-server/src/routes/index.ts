import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import weightRouter from "./weight";
import workoutsRouter from "./workouts";
import habitsRouter from "./habits";
import statsRouter from "./stats";
import profileRouter from "./profile";
import mealPlanRouter from "./mealPlan";
import measurementsRouter from "./measurements";
import nutritionLookupRouter from "./nutritionLookup";
import dataTransferRouter from "./dataTransfer";
import planSettingsRouter from "./planSettings";
import adminRouter from "./admin";
import { healthRouter as healthDataRouter, healthSyncPublicRouter } from "./healthSync";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// Public
router.use(healthRouter);
router.use(authRouter);
router.use(healthSyncPublicRouter); // uses its own sync key instead of a login

// Everything below needs a logged-in user
router.use(requireAuth);
router.use(weightRouter);
router.use(workoutsRouter);
router.use(habitsRouter);
router.use(statsRouter);
router.use(profileRouter);
router.use(mealPlanRouter);
router.use(measurementsRouter);
router.use(nutritionLookupRouter);
router.use(dataTransferRouter);
router.use(planSettingsRouter);
router.use(healthDataRouter);
router.use(adminRouter);

export default router;
