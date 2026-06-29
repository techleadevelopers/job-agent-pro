import { Router } from "express";
import { db } from "@workspace/db";
import { preferencesTable } from "@workspace/db";

const router = Router();

router.get("/preferences", async (req, res) => {
  const rows = await db.select().from(preferencesTable).limit(1);
  if (rows.length === 0) {
    res.status(404).json({ error: "No preferences found" });
    return;
  }
  const p = rows[0];
  res.json({
    id: p.id,
    work_type: p.work_type,
    city: p.city ?? undefined,
    roles: p.roles,
    min_salary: p.min_salary ?? undefined,
    updated_at: p.updated_at?.toISOString() ?? new Date().toISOString(),
  });
});

router.post("/preferences", async (req, res) => {
  const { work_type, city, roles, min_salary } = req.body;
  if (!work_type || !roles) {
    res.status(400).json({ error: "work_type and roles are required" });
    return;
  }

  await db.delete(preferencesTable);
  const [inserted] = await db.insert(preferencesTable).values({
    work_type,
    city: city ?? null,
    roles,
    min_salary: min_salary ?? null,
  }).returning();

  res.json({
    id: inserted.id,
    work_type: inserted.work_type,
    city: inserted.city ?? undefined,
    roles: inserted.roles,
    min_salary: inserted.min_salary ?? undefined,
    updated_at: inserted.updated_at?.toISOString() ?? new Date().toISOString(),
  });
});

export default router;
