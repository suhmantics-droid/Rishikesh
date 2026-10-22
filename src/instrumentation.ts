export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    const { startScheduler } = await import("./lib/cron");
    startScheduler();
  }
}
