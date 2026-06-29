import { Router } from "express";
import { db } from "@workspace/db";
import { agentTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

async function getOrCreateAgent() {
  const rows = await db.select().from(agentTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [inserted] = await db.insert(agentTable).values({
    running: false,
    jobs_scanned_today: 0,
    applications_today: 0,
  }).returning();
  return inserted;
}

router.get("/agent/status", async (req, res) => {
  const agent = await getOrCreateAgent();
  res.json({
    running: agent.running,
    jobs_scanned_today: agent.jobs_scanned_today,
    applications_today: agent.applications_today,
    last_run_at: agent.last_run_at?.toISOString() ?? null,
  });
});

router.post("/agent/start", async (req, res) => {
  const agent = await getOrCreateAgent();
  await db.update(agentTable).set({ running: true, last_run_at: new Date() });
  res.json({
    running: true,
    jobs_scanned_today: agent.jobs_scanned_today,
    applications_today: agent.applications_today,
    last_run_at: new Date().toISOString(),
  });
});

router.post("/agent/stop", async (req, res) => {
  const agent = await getOrCreateAgent();
  await db.update(agentTable).set({ running: false });
  res.json({
    running: false,
    jobs_scanned_today: agent.jobs_scanned_today,
    applications_today: agent.applications_today,
    last_run_at: agent.last_run_at?.toISOString() ?? null,
  });
});

export default router;
