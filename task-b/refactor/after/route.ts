// AFTER — the route handler itself: validate input, call the service and
// repository, format the response. No business logic, no raw SQL, no
// hardcoded secrets, no unhandled rejections. Compare line-for-line against
// before.ts.

import express from "express";
import { z } from "zod";
import { scoreLead, tierForPriority } from "./lead-routing.service";
import { findAvailableRep, assignLead } from "./leads.repository";
import { notifyRepAssigned } from "./notify";

const router = express.Router();

const routeLeadSchema = z.object({
  company: z.string().min(1),
  employeeCount: z.number().int().nonnegative(),
  dealSizeEstimate: z.number().nonnegative(),
  source: z.string().min(1),
});

router.post("/leads/:id/route", async (req, res) => {
  const leadId = req.params.id;
  const parsed = routeLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const priority = scoreLead(parsed.data);
    const tier = tierForPriority(priority);

    const rep = await findAvailableRep(tier);
    if (!rep) {
      return res.status(409).json({ error: `No available rep for tier: ${tier}` });
    }

    await assignLead(leadId, rep.id, priority);
    await notifyRepAssigned(parsed.data.company, tier, rep.name);

    res.json({ assignedTo: rep.name, priority, tier });
  } catch (err) {
    res.status(500).json({ error: "Failed to route lead" });
  }
});

export default router;
