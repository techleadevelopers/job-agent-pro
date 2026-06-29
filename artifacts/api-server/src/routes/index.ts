import { Router, type IRouter } from "express";
import healthRouter from "./health";
import resumeRouter from "./resume";
import preferencesRouter from "./preferences";
import jobsRouter from "./jobs";
import applicationsRouter from "./applications";
import agentRouter from "./agent";
import dashboardRouter from "./dashboard";
import emailRouter from "./email";

const router: IRouter = Router();

router.use(healthRouter);
router.use(resumeRouter);
router.use(preferencesRouter);
router.use(jobsRouter);
router.use(applicationsRouter);
router.use(agentRouter);
router.use(dashboardRouter);
router.use(emailRouter);

export default router;
