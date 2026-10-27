import { after } from "next/server";

/**
 * Work that shouldn't hold up the response (emails, reading a flyer). On Vercel it has to be handed to
 * after(), or it's cut off when the response is sent. Outside a request (tests, scripts) it just runs.
 */
export function inBackground(label: string, task: () => Promise<unknown>) {
  const run = () => task().catch((e) => console.error(`${label} failed`, e));
  try {
    after(run);
  } catch {
    void run();
  }
}
