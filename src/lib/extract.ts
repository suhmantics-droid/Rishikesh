// Reads a flyer photo with Claude and returns draft listing fields, so an organiser
// only has to check the form instead of typing everything out.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { addDays, isValidDate, isValidTime, todayIST, weekday } from "./dates";
import { CATEGORIES, CATEGORY_KEYS } from "./site";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

const FlyerSchema = z.object({
  is_event_flyer: z.boolean().describe("False if the image is not an event flyer or poster"),
  title: z.string().describe("Event name as printed, in normal capitalisation"),
  description: z.string().describe("1-3 plain sentences about what happens, using only what the flyer says"),
  category: z.enum(CATEGORY_KEYS),
  dates: z
    .array(
      z.object({
        date: z.string().describe("YYYY-MM-DD"),
        start_time: z.string().nullable().describe("24h HH:MM, null if not printed"),
        end_time: z.string().nullable().describe("24h HH:MM, null if not printed"),
      }),
    )
    .describe("Each specific date printed on the flyer"),
  weekly_days: z
    .array(z.number().int())
    .describe("For recurring events ('every Saturday'): weekdays 0=Sunday..6=Saturday. Empty if not recurring"),
  weekly_start_time: z.string().nullable(),
  weekly_end_time: z.string().nullable(),
  venue_slug: z.string().nullable().describe("Slug from the known venues list if the flyer's venue matches one, else null"),
  venue_name: z.string().nullable().describe("Venue name exactly as printed"),
  price_type: z.enum(["free", "donation", "paid", "unknown"]),
  price_min: z.number().int().nullable().describe("Lowest price in rupees"),
  price_max: z.number().int().nullable().describe("Highest price in rupees, if a range or tiers are shown"),
  price_note: z.string().nullable().describe("Short note such as 'incl. cacao' or 'early bird ₹400'"),
  artists: z.array(z.string()).describe("Performers, facilitators, DJs or teachers named on the flyer"),
  contact_phone: z.string().nullable(),
  contact_instagram: z.string().nullable().describe("Instagram handle without @"),
  booking_url: z.string().nullable(),
  unclear: z.string().nullable().describe("Anything you could not read or had to guess, in a short sentence"),
});

export type FlyerFields = z.infer<typeof FlyerSchema>;

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

const SYSTEM = `You read photos of event flyers and posters from Tapovan, Rishikesh (India) and turn them into a structured listing.

Guidelines:
- Only use information visible on the flyer. Never invent artists, prices or times.
- Dates: flyers often omit the year or only say a weekday ("Saturday 25th", "every Friday"). Resolve each date to the next occurrence on or after today's date. If a flyer gives a day-of-month and a weekday that disagree, prefer the day-of-month.
- Recurring events ("every Tuesday", "daily", "Mon-Fri") go in weekly_days rather than dates; leave dates empty unless specific dates are also printed.
- Times are Indian Standard Time; convert "7pm" to "19:00". "Doors 5pm, music 6pm" means start_time 17:00.
- Prices are in rupees. "Contribution", "energy exchange" or "donation-based" is donation; "free entry" is free. A single fixed price goes in price_min.
- Phone numbers: keep the digits as printed, including +91 if present.
- Pick the closest category; ecstatic dance with cacao is "dance", sound bath is "sound", jam session or concert is "music".
- If the image isn't an event flyer, set is_event_flyer to false and fill other fields with empty values.`;

export async function extractFlyer(image: Buffer, venues: { slug: string; name: string }[]): Promise<FlyerFields> {
  const client = new Anthropic();
  const today = todayIST();
  const wd = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][weekday(today)];

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(FlyerSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/webp", data: image.toString("base64") } },
          {
            type: "text",
            text:
              `Today is ${wd} ${today}.\n\n` +
              `Known venues (slug: name):\n${venues.map((v) => `${v.slug}: ${v.name}`).join("\n")}\n\n` +
              `Categories: ${CATEGORIES.map((c) => `${c.key} (${c.label})`).join(", ")}\n\n` +
              `Extract this flyer.`,
          },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("The flyer could not be read automatically.");
  if (!response.parsed_output) throw new Error("No structured output returned.");
  return clean(response.parsed_output, venues, today);
}

/** The model is good but not infallible: drop anything malformed or in the past. */
function clean(f: FlyerFields, venues: { slug: string }[], today: string): FlyerFields {
  const time = (t: string | null) => (t && isValidTime(t) ? t : null);
  const horizon = addDays(today, 365);
  return {
    ...f,
    dates: f.dates
      .filter((d) => isValidDate(d.date) && d.date >= today && d.date <= horizon)
      .map((d) => ({ date: d.date, start_time: time(d.start_time), end_time: time(d.end_time) }))
      .slice(0, 30),
    weekly_days: [...new Set(f.weekly_days.filter((d) => d >= 0 && d <= 6))].sort(),
    weekly_start_time: time(f.weekly_start_time),
    weekly_end_time: time(f.weekly_end_time),
    venue_slug: venues.some((v) => v.slug === f.venue_slug) ? f.venue_slug : null,
    price_min: f.price_min != null && f.price_min >= 0 ? f.price_min : null,
    price_max: f.price_max != null && f.price_max >= 0 ? f.price_max : null,
    artists: f.artists.map((a) => a.trim()).filter(Boolean).slice(0, 10),
    contact_instagram: f.contact_instagram?.replace(/^@/, "") ?? null,
  };
}
