export async function register() {
  // On Vercel nothing runs between requests: Vercel Cron and a GitHub Action call /api/cron instead.
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production" && !process.env.VERCEL) {
    const { startScheduler } = await import("./lib/cron");
    startScheduler();
  }
}
