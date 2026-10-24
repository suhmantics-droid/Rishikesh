import { getEventByToken } from "@/lib/data";
import { ListingError, ListingInput, updateListing } from "@/lib/listings";

// The manage token is the organiser's key: whoever has the link can edit the listing.

export async function GET(_req: Request, ctx: RouteContext<"/api/listings/[token]">) {
  const d = await getEventByToken((await ctx.params).token);
  if (!d) return Response.json({ error: "Not found" }, { status: 404 });
  const { event, venue, dates, artists, schedule, links } = d;
  return Response.json({
    uploadId: event.flyer,
    title: event.title,
    description: event.description,
    category: event.category,
    kind: event.kind,
    // Listings made before schedules were stored only have their generated dates.
    schedule: schedule ?? { dates, sessions: [], until: null },
    venue: { slug: venue.slug },
    price_type: event.price_type,
    price_min: event.price_min,
    price_max: event.price_max,
    price_note: event.price_note,
    artists: artists.map((a) => a.name),
    contact_phone: event.contact_phone,
    contact_instagram: event.contact_instagram,
    booking_url: event.booking_url,
    links,
    organiser_name: event.organiser_name,
    organiser_email: event.organiser_email,
  });
}

export async function PUT(req: Request, ctx: RouteContext<"/api/listings/[token]">) {
  const d = await getEventByToken((await ctx.params).token);
  if (!d) return Response.json({ error: "Not found" }, { status: 404 });
  const parsed = ListingInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json({ error: `Check "${issue.path.join(".") || "form"}": ${issue.message}` }, { status: 400 });
  }
  try {
    updateListing(d.event.id, parsed.data);
    return Response.json({ slug: d.event.slug, manageToken: d.event.manage_token });
  } catch (e) {
    if (e instanceof ListingError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
