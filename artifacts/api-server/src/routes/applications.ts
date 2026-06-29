import { Router } from "express";
import { db } from "@workspace/db";
import { applicationsTable, jobsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/applications", async (req, res) => {
  const { status } = req.query;
  let rows = await db.select().from(applicationsTable).orderBy(applicationsTable.applied_at);
  rows = rows.sort((a, b) => (b.applied_at?.getTime() ?? 0) - (a.applied_at?.getTime() ?? 0));
  if (status && status !== "all") {
    rows = rows.filter(a => a.status === status);
  }
  res.json(rows.map(a => ({
    id: a.id,
    job_id: a.job_id,
    job_title: a.job_title,
    company: a.company,
    status: a.status,
    applied_at: a.applied_at?.toISOString() ?? new Date().toISOString(),
    notes: a.notes ?? undefined,
    salary: a.salary ?? undefined,
    work_type: a.work_type,
    match_score: a.match_score,
  })));
});

router.post("/applications", async (req, res) => {
  const { job_id, notes } = req.body;
  if (!job_id) { res.status(400).json({ error: "job_id is required" }); return; }

  const jobs = await db.select().from(jobsTable).where(eq(jobsTable.id, job_id));
  if (jobs.length === 0) { res.status(404).json({ error: "Job not found" }); return; }
  const job = jobs[0];

  // Mark job as applied
  await db.update(jobsTable).set({ status: "applied" }).where(eq(jobsTable.id, job_id));

  const [inserted] = await db.insert(applicationsTable).values({
    job_id,
    job_title: job.title,
    company: job.company,
    status: "applied",
    notes: notes ?? null,
    salary: job.salary ?? null,
    work_type: job.work_type,
    match_score: job.match_score,
  }).returning();

  // Log activity
  await db.insert(activityTable).values({
    type: "applied",
    title: job.title,
    company: job.company,
    match_score: job.match_score,
  });

  res.status(201).json({
    id: inserted.id,
    job_id: inserted.job_id,
    job_title: inserted.job_title,
    company: inserted.company,
    status: inserted.status,
    applied_at: inserted.applied_at?.toISOString() ?? new Date().toISOString(),
    notes: inserted.notes ?? undefined,
    salary: inserted.salary ?? undefined,
    work_type: inserted.work_type,
    match_score: inserted.match_score,
  });
});

router.get("/applications/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const rows = await db.select().from(applicationsTable).where(eq(applicationsTable.id, id));
  if (rows.length === 0) { res.status(404).json({ error: "Application not found" }); return; }
  const a = rows[0];
  res.json({
    id: a.id,
    job_id: a.job_id,
    job_title: a.job_title,
    company: a.company,
    status: a.status,
    applied_at: a.applied_at?.toISOString() ?? new Date().toISOString(),
    notes: a.notes ?? undefined,
    salary: a.salary ?? undefined,
    work_type: a.work_type,
    match_score: a.match_score,
  });
});

router.patch("/applications/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status, notes } = req.body;
  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  const [updated] = await db.update(applicationsTable).set(updates).where(eq(applicationsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Application not found" }); return; }

  // Log interview/offer activity
  if (status === "interview" || status === "offer") {
    await db.insert(activityTable).values({
      type: status,
      title: updated.job_title,
      company: updated.company,
      match_score: updated.match_score,
    });
  }

  res.json({
    id: updated.id,
    job_id: updated.job_id,
    job_title: updated.job_title,
    company: updated.company,
    status: updated.status,
    applied_at: updated.applied_at?.toISOString() ?? new Date().toISOString(),
    notes: updated.notes ?? undefined,
    salary: updated.salary ?? undefined,
    work_type: updated.work_type,
    match_score: updated.match_score,
  });
});

export default router;
