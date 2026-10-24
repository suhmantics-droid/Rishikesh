// Reads a flyer photo with Claude and returns draft listing fields, so an organiser
// only has to check the form instead of typing everything out.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { config } from "./config";
import { addDays, isValidDate, isValidTime, todayIST, weekday } from "./dates";
import { CATEGORIES, CATEGORY_KEYS } from "./site";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

const FlyerSchema = z.object({
  is_event_flyer: z.boolean().describe("False if the image is not an event flyer or poster"),
  title: z.string().describe("Event name as printed, in normal capitalisation"),
  description: z.string().describe("1-3 plain sentences about what happens, using only what the flyer says"),
  category: z.enum(CATEGORY_KEYS),
  kind: z
    .enum(["event", "classes"])
    .describe("'classes' when the flyer is a timetable of regular classes or drop-in sessions; 'event' for a one-off or multi-day event, or a simple repeating one like a weekly jam"),
  dates: z
    .array(
      z.object({
        date: z.string().describe("YYYY-MM-DD"),
        start_time: z.string().nullable().describe("24h HH:MM, null if not printed"),
        end_time: z.string().nullable().describe("24h HH:MM, null if not printed"),
      }),
    )
    .describe("Each specific date printed on the flyer"),
  sessions: z
    .array(
      z.object({
        days: z.array(z.number().int()).describe("Weekdays 0=Sunday..6=Saturday"),
        start_time: z.string().nullable().describe("24h HH:MM"),
        end_time: z.string().nullable().describe("24h HH:MM"),
        label: z.string().nullable().describe("Class name as printed, e.g. 'Hatha Flow'; null for a simple repeating event"),
      }),
    )
    .describe("Weekly repeating sessions. One entry per class and time; put all the days a class runs at that time in one entry. Empty for one-off events"),
  repeat_until: z.string().nullable().describe("YYYY-MM-DD if the flyer says when the repeating sessions stop, else null"),
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
  flyer_corners: z
    .array(z.array(z.number()))
    .nullable()
    .describe(
      "If the photo shows the flyer on a wall, noticeboard or in a hand with background around it: the main flyer's four corners as [x, y] fractions of the image width and height (0 to 1), in the order top-left, top-right, bottom-right, bottom-left. Null if the image is already just the flyer (a screenshot or digital file).",
    ),
});

export type FlyerFields = z.infer<typeof FlyerSchema>;

export function aiEnabled() {
  return Boolean(config("ANTHROPIC_API_KEY"));
}

const SYSTEM = `You read photos of event flyers and posters from Tapovan, Rishikesh (India) and turn them into a structured listing.

Guidelines:
- Only use information visible on the flyer. Never invent artists, prices or times.
- The photo is usually taken on a wall or noticeboard with other flyers around it. Read only the main flyer in the middle of the photo; ignore neighbouring flyers cut off at the edges, and their prices and dates.
- Dates: flyers often omit the year or only say a weekday ("Saturday 25th", "every Friday"). Resolve each date to the next occurrence on or after today's date. If a flyer gives a day-of-month and a weekday that disagree, prefer the day-of-month. A multi-day event ("October 24 & 25, 8:30am-9pm") gets one entry per day.
- Timetables ("Daily classes", a weekly schedule grid, "Mon-Sat 7am Hatha, 4pm Vinyasa") are kind "classes": list every class in sessions with its name as the label and the days it runs at that time. "Daily" means all seven days; "Monday off" or "open Tuesday-Saturday" limits the days.
- A simple repeating event ("every Tuesday jam", "Thursday & Sunday 3:30pm") is kind "event" with one session and label null. Leave dates empty unless specific dates are also printed.
- Times are Indian Standard Time; convert "7pm" to "19:00". "Doors 5pm, music 6pm" means start_time 17:00. "6pm onwards" has no end time.
- Prices are in rupees. "Contribution" or "donation-based" with no amount is donation. "Energy exchange INR 500" is a fixed price: paid, 500. "Free entry" or "free event" is free. A single fixed price goes in price_min; "from ₹1,500" or "early bird from" is price_min with a note. "Complimentary first session" goes in the price note.
- Handwritten additions on the flyer (an extra phone number, "for cash payments") count — include them.
- Phone numbers: keep the digits as printed, including +91 if present. If there are several, use the WhatsApp or booking number.
- Teachers named in a timetable ("by Sachin Ji") are artists.
- Pick the closest category: ecstatic dance with cacao is "dance", classical and folk dance (Kathak, garba) are "dance", sound bath is "sound", jam session or concert is "music", martial arts and fitness are "fitness", a festival with many kinds of activity is "market" (festivals, markets & pop-ups), a multi-day course is "course".
- If the image isn't an event flyer, set is_event_flyer to false and fill other fields with empty values.`;

export async function extractFlyer(image: Buffer, venues: { slug: string; name: string }[]): Promise<FlyerFields> {
  const client = new Anthropic({ apiKey: config("ANTHROPIC_API_KEY") });
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
    sessions: f.sessions
      .map((x) => ({
        days: [...new Set(x.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort(),
        start_time: time(x.start_time),
        end_time: time(x.end_time),
        label: x.label?.trim().slice(0, 80) || null,
      }))
      .filter((x) => x.days.length)
      .slice(0, 80),
    repeat_until: f.repeat_until && isValidDate(f.repeat_until) && f.repeat_until >= today ? f.repeat_until : null,
    venue_slug: venues.some((v) => v.slug === f.venue_slug) ? f.venue_slug : null,
    price_min: f.price_min != null && f.price_min >= 0 ? f.price_min : null,
    price_max: f.price_max != null && f.price_max >= 0 ? f.price_max : null,
    artists: f.artists.map((a) => a.trim()).filter(Boolean).slice(0, 10),
    contact_instagram: f.contact_instagram?.replace(/^@/, "") ?? null,
    flyer_corners: validCorners(f.flyer_corners),
  };
}

/** Four points inside the image that enclose a reasonable share of it; anything else is ignored. */
function validCorners(c: number[][] | null): number[][] | null {
  if (!c || c.length !== 4 || c.some((p) => p.length !== 2 || p.some((n) => !Number.isFinite(n) || n < -0.02 || n > 1.02))) return null;
  const pts = c.map(([x, y]) => [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))]);
  // Shoelace area: skip tiny or twisted shapes, and ones that are basically the whole image.
  const area = Math.abs(pts.reduce((s, [x, y], i) => s + x * pts[(i + 1) % 4][1] - pts[(i + 1) % 4][0] * y, 0)) / 2;
  if (area < 0.12 || area > 0.93) return null;
  return pts;
}
