import type { Express } from "express";
import analystUpgradesRouter from "../routes/analyst.upgrades";

/** Idempotent mount to avoid duplicates if called twice. */
export function mountAnalyst(app: Express) {
  const stack: any[] = (app as any)?._router?.stack ?? [];
  const already = stack.some((l: any) => l?.route?.path?.startsWith?.("/api/analyst")
    || (l?.name === "router" && l?.regexp?.toString()?.includes?.("/api/analyst")));
  if (!already) {
    app.use("/api/analyst", analystUpgradesRouter);
    console.log("[routes] mounted /api/analyst");
  } else {
    console.log("[routes] /api/analyst already mounted");
  }
}
