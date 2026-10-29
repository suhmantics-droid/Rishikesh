"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FlyerFields } from "@/lib/extract";
import { addDays, daysLabel, formatDayLong, formatTimeRange, WEEK_ORDER, WEEKDAY_SHORT } from "@/lib/dates";
import { LINK_LABELS, type FlyerLink } from "@/lib/links";
import { fitForUpload } from "@/lib/shrink";
import { AREAS, CATEGORIES, SITE } from "@/lib/site";
import type { Duplicate } from "@/lib/uploads";
import { CropEditor, type Corners } from "./CropEditor";
import { MapLinkInput } from "./MapLinkInput";
import { LazyMapView } from "./MiniMap";
import { Icon } from "./Icon";
import { rememberListing } from "./MyFlyers";
import { PayWidget } from "./PayWidget";

type VenueOpt = { slug: string; name: string; area: string; is_demo: number };
type DateRow = { date: string; start_time: string; end_time: string };
type SessionRow = { label: string; days: number[]; start_time: string; end_time: string };
type Kind = "event" | "classes";

type Form = {
  title: string;
  description: string;
  category: string;
  kind: Kind;
  dates: DateRow[];
  weeklyOn: boolean; // an event that repeats every week
  sessions: SessionRow[]; // the weekly times: a class timetable, or a repeating event's slot
  repeatUntil: string; // "" = for as long as the listing is up
  venueSlug: string; // "" = none chosen, "__new" = new venue
  newVenue: { name: string; area: string; address: string; lat: number | null; lng: number | null; onRequest: boolean };
  price_type: "free" | "donation" | "paid" | "unknown";
  price_min: string;
  price_max: string;
  price_note: string;
  artists: string[];
  contact_phone: string;
  contact_instagram: string;
  booking_url: string;
  links: FlyerLink[]; // read from the flyer's QR codes
  organiser_name: string;
  organiser_email: string;
  organiser_whatsapp: string;
};

const emptySession = (): SessionRow => ({ label: "", days: [], start_time: "", end_time: "" });

function emptyForm(today: string): Form {
  return {
    title: "",
    description: "",
    category: "music",
    kind: "event",
    dates: [{ date: today, start_time: "", end_time: "" }],
    weeklyOn: false,
    sessions: [],
    repeatUntil: "",
    venueSlug: "",
    newVenue: { name: "", area: "upper-tapovan", address: "", lat: null, lng: null, onRequest: false },
    price_type: "unknown",
    price_min: "",
    price_max: "",
    price_note: "",
    artists: [],
    contact_phone: "",
    contact_instagram: "",
    booking_url: "",
    links: [],
    organiser_name: "",
    organiser_email: "",
    organiser_whatsapp: "",
  };
}

const input =
  "min-h-12 w-full border-[1.5px] border-line-strong bg-surface px-3 py-2.5 text-[16px] outline-none placeholder:text-muted focus:border-ink";
const label = "block text-[16px] font-bold";
const section = "grid gap-3 bg-surface p-4 shadow-e1";
const h2 = "text-[19px] font-extrabold";
const seg = (on: boolean) => `min-h-11 px-2 text-[16px] font-bold ${on ? "bg-ink text-wall" : ""}`;
const addLink = "inline-flex min-h-11 items-center gap-1 justify-self-start text-[16px] font-bold text-act-ink";

export function PostFlow({
  venues,
  today,
  priceLabel,
  listingDays,
  isAdmin,
  editToken,
  openUpload,
  payMode,
  owner,
  autoFill,
  emailOn,
}: {
  venues: VenueOpt[];
  today: string;
  priceLabel: string;
  listingDays: number;
  isAdmin: boolean;
  editToken?: string;
  /** An already-uploaded photo to start from (the admin's batch queue). */
  openUpload?: string;
  payMode: "cash" | "upi" | "razorpay";
  owner: { name: string | null; whatsapp: string | null };
  /** Flyer auto-fill (a Claude API key) is switched on. */
  autoFill: boolean;
  /** Emails are actually sent (a Resend key), not just logged. */
  emailOn: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "details" | "pay">(editToken || openUpload ? "details" : "upload");
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [upload, setUpload] = useState<{ id: string; url: string } | null>(null);
  const [reading, setReading] = useState(Boolean(openUpload && !editToken));
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiFilled, setAiFilled] = useState(false);
  const [form, setForm] = useState<Form>(() => emptyForm(today));
  const [artistDraft, setArtistDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ slug: string; manageToken: string } | null>(null);
  const [loaded, setLoaded] = useState(!editToken);
  const [cropOpen, setCropOpen] = useState(false);
  const [aiCorners, setAiCorners] = useState<Corners | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Edit mode: load the existing listing.
  useEffect(() => {
    if (!editToken) return;
    let cancelled = false;
    fetch(`/api/listings/${editToken}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) return setError(d.error);
        setLoaded(true);
        setUpload({ id: d.uploadId, url: `/f/${d.uploadId}.webp` });
        const sch = d.schedule as { dates: Nullable<DateRow>[]; sessions: Nullable<SessionRow>[]; until: string | null };
        const kind: Kind = d.kind === "classes" ? "classes" : "event";
        setForm((f) => ({
          ...f,
          title: d.title ?? "",
          description: d.description ?? "",
          category: d.category,
          kind,
          dates: sch.dates.filter((x) => x.date && x.date >= today).map((x) => ({ date: x.date!, start_time: x.start_time ?? "", end_time: x.end_time ?? "" })),
          sessions: sch.sessions.map((x) => ({ label: x.label ?? "", days: x.days ?? [], start_time: x.start_time ?? "", end_time: x.end_time ?? "" })),
          weeklyOn: kind === "event" && sch.sessions.length > 0,
          repeatUntil: sch.until ?? "",
          venueSlug: d.venue.slug,
          price_type: d.price_type,
          price_min: d.price_min?.toString() ?? "",
          price_max: d.price_max?.toString() ?? "",
          price_note: d.price_note ?? "",
          artists: d.artists ?? [],
          contact_phone: d.contact_phone ?? "",
          contact_instagram: d.contact_instagram ?? "",
          booking_url: d.booking_url ?? "",
          links: d.links ?? [],
          organiser_name: d.organiser_name ?? "",
          organiser_email: d.organiser_email ?? "",
          organiser_whatsapp: d.organiser_whatsapp ?? "",
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [editToken, today]);

  async function onFile(file: File) {
    setError(null);
    setReading(true);
    setAiNote(null);
    const fd = new FormData();
    try {
      fd.append("flyer", await fitForUpload(file));
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const up = await res.json();
      if (!res.ok) throw new Error(up.error || "Upload failed");
      await afterUpload(up);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(false);
    }
  }

  /** Shows an upload in the form and fills in what we know: QR links now, then the photo read. */
  async function afterUpload(up: { id: string; url: string; links?: FlyerLink[]; duplicates?: Duplicate[] }) {
    {
      setUpload({ id: up.id, url: up.url });
      setDuplicates(up.duplicates ?? []);
      setAiCorners(null);
      const links = (up.links ?? []) as FlyerLink[];
      setForm((f) => ({
        ...f,
        links,
        booking_url: f.booking_url || links.find((l) => l.kind === "form" || l.kind === "website")?.url || "",
        contact_phone: f.contact_phone || waPhone(links) || "",
      }));
      setStep("details");
      const ex = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId: up.id }),
      }).then((r) => r.json());
      if (ex.fields) applyAi(ex.fields as FlyerFields);
      else setAiNote(ex.reason ?? null);
    }
  }

  // Opened from the admin's batch queue: start from that photo.
  useEffect(() => {
    if (!openUpload || editToken) return;
    let cancelled = false;
    fetch(`/api/uploads/${openUpload}`)
      .then((r) => r.json())
      .then(async (up) => {
        if (cancelled) return;
        if (up.error) throw new Error(up.error);
        await afterUpload(up);
      })
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setReading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openUpload, editToken]);

  function applyAi(f: FlyerFields) {
    if (!f.is_event_flyer) {
      setAiNote("That doesn't look like an event flyer to us. Double-check the photo, or fill in the details yourself.");
      return;
    }
    setAiFilled(true);
    setAiNote(f.unclear ? `Please check: ${f.unclear}` : null);
    const knownVenue = f.venue_slug && venues.some((v) => v.slug === f.venue_slug) ? f.venue_slug : "";
    setForm((cur) => ({
      ...cur,
      title: f.title || cur.title,
      description: f.description || cur.description,
      category: f.category,
      kind: f.kind === "classes" ? "classes" : "event",
      dates: f.dates.length
        ? f.dates.map((d) => ({ date: d.date, start_time: d.start_time ?? "", end_time: d.end_time ?? "" }))
        : f.sessions?.length
          ? []
          : cur.dates,
      sessions: (f.sessions ?? []).map((x) => ({ label: x.label ?? "", days: x.days, start_time: x.start_time ?? "", end_time: x.end_time ?? "" })),
      weeklyOn: f.kind !== "classes" && (f.sessions?.length ?? 0) > 0,
      repeatUntil: f.repeat_until ?? "",
      venueSlug: knownVenue || (f.venue_name ? "__new" : cur.venueSlug),
      newVenue: knownVenue ? cur.newVenue : { ...cur.newVenue, name: f.venue_name ?? "" },
      price_type: f.price_type,
      price_min: f.price_min?.toString() ?? "",
      price_max: f.price_max?.toString() ?? "",
      price_note: f.price_note ?? "",
      artists: f.artists,
      // Links read from QR codes are exact; keep them over what the model read off the print.
      contact_phone: cur.contact_phone || f.contact_phone || "",
      contact_instagram: f.contact_instagram ?? "",
      booking_url: cur.booking_url || f.booking_url || "",
    }));
    if (f.flyer_corners) setAiCorners(f.flyer_corners as Corners);
    if (!(f.venue_slug && venues.some((v) => v.slug === f.venue_slug)) && f.venue_name) pinFromFlyer(form.links);
  }

  /** A new venue on a flyer with a Google Maps QR code: drop the pin where the code points. */
  async function pinFromFlyer(links: FlyerLink[]) {
    const map = links.find((l) => l.kind === "map");
    if (!map) return;
    const res = await fetch("/api/maplink", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: map.url }) }).catch(() => null);
    if (!res?.ok) return;
    const { lat, lng } = (await res.json()) as { lat: number; lng: number };
    setForm((f) => (f.newVenue.lat == null ? { ...f, newVenue: { ...f.newVenue, lat, lng } } : f));
  }

  async function straightenTo(corners: Corners) {
    if (!upload) return;
    const res = await fetch(`/api/uploads/${upload.id}/straighten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corners }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Couldn't straighten that.");
    setUpload({ id: d.id, url: d.url });
    setAiCorners(null);
    setCropOpen(false);
  }

  function payload() {
    const dates = form.dates
      .filter((d) => d.date)
      .map((d) => ({ date: d.date, start_time: d.start_time || null, end_time: d.end_time || null }));
    const venue =
      form.venueSlug === "__new"
        ? {
            name: form.newVenue.name,
            area: form.newVenue.area,
            address: form.newVenue.address || null,
            lat: form.newVenue.onRequest ? null : (form.newVenue.lat ?? NaN),
            lng: form.newVenue.onRequest ? null : (form.newVenue.lng ?? NaN),
          }
        : { slug: form.venueSlug };
    const num = (s: string) => (s.trim() ? Math.round(Number(s.replace(/[^\d.]/g, ""))) : null);
    const classes = form.kind === "classes";
    const sessions = activeSessions(form).map((x) => ({
      days: x.days,
      start_time: x.start_time || null,
      end_time: x.end_time || null,
      label: classes ? x.label.trim() || null : null,
    }));
    return {
      uploadId: upload?.id,
      title: form.title,
      description: form.description || null,
      category: form.category,
      kind: form.kind,
      dates: classes ? [] : dates,
      sessions,
      repeat_until: sessions.length && form.repeatUntil ? form.repeatUntil : null,
      venue,
      price_type: form.price_type,
      price_min: num(form.price_min),
      price_max: num(form.price_max),
      price_note: form.price_note || null,
      artists: form.artists,
      contact_phone: form.contact_phone || null,
      contact_instagram: form.contact_instagram || null,
      booking_url: form.booking_url || null,
      links: form.links,
      organiser_name: form.organiser_name || null,
      organiser_email: form.organiser_email || null,
      organiser_whatsapp: form.organiser_whatsapp || form.contact_phone || null,
      ai_extracted: aiFilled,
    };
  }

  function validate(): string | null {
    if (!upload) return "Upload the flyer first.";
    if (form.title.trim().length < 3) return "Add the event name.";
    if (form.kind === "classes") {
      if (!activeSessions(form).length) return "Add at least one class: tap the days it runs and set its start time.";
    } else if (!form.dates.some((d) => d.date) && !activeSessions(form).length) {
      return "Add at least one date (or set it to repeat weekly).";
    }
    if (!form.venueSlug) return "Choose where it's happening.";
    if (form.venueSlug === "__new") {
      if (form.newVenue.name.trim().length < 2) return "Add the venue's name.";
      if (form.newVenue.onRequest) {
        if (!form.contact_phone && !form.contact_instagram) return "Add a WhatsApp number or Instagram, so people can ask where it is.";
      } else if (form.newVenue.lat == null) return "Tap the map to drop a pin, or tick “The flyer doesn't say exactly where”.";
    }
    if (form.organiser_email && !/^\S+@\S+\.\S+$/.test(form.organiser_email)) return "That email doesn't look right.";
    if (!(form.organiser_whatsapp || form.contact_phone) && !form.organiser_email && !isAdmin) return "Add your WhatsApp number, so we can tell you when it's checked.";
    return null;
  }

  async function submit() {
    const v = validate();
    if (v) return setError(v);
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(editToken ? `/api/listings/${editToken}` : "/api/listings", {
        method: editToken ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not save");
      if (editToken) {
        router.push(`/manage/${editToken}?saved=1`);
        return;
      }
      setCreated(d);
      rememberListing(d.manageToken, form.title);
      setStep("pay");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ---------- Step 1: upload ----------
  if (step === "upload") {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <Steps step={1} />
        <h1 className="text-[30px] leading-tight font-extrabold [font-stretch:88%]">Pin your flyer</h1>
        <p className="text-[17px] text-ink-2">
          Snap the poster or upload the image you share on WhatsApp.{" "}
          {autoFill ? <>We&apos;ll read the date, time, place and price for you.</> : <>Then add the date, time and place. About a minute.</>}
        </p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={reading}
          className="flex w-full flex-col items-center justify-center gap-2 border-[1.5px] border-dashed border-ink bg-surface px-6 py-14 text-center hover:bg-slip"
        >
          <Icon name="camera" size={36} />
          <span className="text-[19px] font-extrabold">{reading ? "Uploading…" : "Take a photo or choose an image"}</span>
          <span className="text-[15px] text-muted">From the camera or WhatsApp, up to 12 MB</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        {error ? <ErrorBox msg={error} /> : null}
        {isAdmin ? (
          <p className="bg-act-soft px-4 py-3 text-[16px] font-semibold text-act-soft-ink">Admin mode: you can publish straight away and record the fee.</p>
        ) : owner.whatsapp ? (
          <p className="bg-surface px-4 py-3 text-[16px] text-ink-2 shadow-e1">
            Rather not fill in a form?{" "}
            <a
              className="font-bold text-act-ink underline"
              href={`https://wa.me/${owner.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hi! I'd like to put my event flyer on WhatsOnTapovan.")}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp your flyer to {owner.name ?? "us"}
            </a>{" "}
            and we&apos;ll put it up for you.
          </p>
        ) : null}
        <ul className="flex flex-col gap-2.5 text-[16px] text-ink-2">
          <li className="flex gap-2">
            <Icon name="check" size={20} className="mt-0.5 text-act-ink" /> A person checks it the same day and messages you on WhatsApp.
          </li>
          <li className="flex gap-2">
            <Icon name="check" size={20} className="mt-0.5 text-act-ink" /> {priceLabel} for {listingDays / 7} weeks on the wall, the map and the agenda, paid after it&apos;s checked.
          </li>
          <li className="flex gap-2">
            <Icon name="check" size={20} className="mt-0.5 text-act-ink" /> People following your venue, artists or kind of event hear {emailOn ? "by email or on their phone" : "on their phone"} when it goes up.
          </li>
          <li className="flex gap-2">
            <Icon name="check" size={20} className="mt-0.5 text-act-ink" /> Edit any time and see how many people viewed it.
          </li>
        </ul>
      </div>
    );
  }

  // ---------- Step 3: check and send ----------
  if (step === "pay" && created) {
    const venueName = form.venueSlug === "__new" ? form.newVenue.name : venues.find((v) => v.slug === form.venueSlug)?.name;
    const when =
      activeSessions(form).length
        ? `${daysLabel(activeSessions(form).flatMap((x) => x.days))} · ${formatTimeRange(activeSessions(form)[0].start_time || null, activeSessions(form)[0].end_time || null) || "time not listed"}`
        : form.dates
            .filter((d) => d.date)
            .slice(0, 2)
            .map((d) => `${formatDayLong(d.date, today)} ${formatTimeRange(d.start_time || null, d.end_time || null)}`)
            .join(" · ");
    const price = form.price_type === "free" ? "Free" : form.price_type === "donation" ? "Donation" : form.price_type === "paid" && form.price_min ? `₹${form.price_min}` : "Price not listed";
    const where = [venueName, form.venueSlug === "__new" && form.newVenue.onRequest ? "spot on request" : null].filter(Boolean).join(" · ");
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <Steps step={3} />
        <h1 className="text-[30px] leading-tight font-extrabold [font-stretch:88%]">Check and send</h1>
        <p className="-mt-2 text-[16px] text-ink-2">This is how it&apos;ll look on the wall.</p>
        <div className="mx-auto w-56">
          {upload ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={upload.url} alt="Your flyer" className="block w-full shadow-e1" />
          ) : null}
          <span className="slip relative -mt-3 ml-2 flex w-[calc(100%-1rem)] flex-col gap-0.5 bg-slip px-2.5 pt-2.5 pb-2.5 text-slip-ink shadow-e1">
            <span className="tape" aria-hidden />
            <span className="slip-time">{when || "Date not set"}</span>
            <span className="slip-name">{form.title}</span>
            <span className="slip-meta">{[price, where].filter(Boolean).join(" · ")}</span>
          </span>
        </div>
        <button type="button" className="inline-flex min-h-11 items-center gap-1 self-center text-[16px] font-bold text-act-ink underline" onClick={() => router.push(`/post?edit=${created.manageToken}`)}>
          Edit details
        </button>
        <p className="text-[15px] text-muted">
          {SITE.name} checks that the date, time and place match the flyer. It doesn&apos;t vet or recommend events.
        </p>
        <PayWidget
          token={created.manageToken}
          purpose="new"
          priceLabel={priceLabel}
          mode={payMode}
          isAdmin={isAdmin}
          onDone={(r) => router.push(`/manage/${created.manageToken}?${r === "paid" ? "paid" : "pending"}=1`)}
        />
      </div>
    );
  }

  // ---------- Step 2: details ----------
  const newVenuePin = form.newVenue.lat != null && form.newVenue.lng != null ? { lat: form.newVenue.lat, lng: form.newVenue.lng } : null;
  const venueGroups = AREAS.map((a) => ({ ...a, list: venues.filter((v) => v.area === a.key) })).filter((g) => g.list.length);

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        {!editToken ? <Steps step={2} /> : null}
        {upload ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={upload.url} alt="Your flyer" className="w-full shadow-e1 max-lg:max-h-72 max-lg:object-contain" />
        ) : (
          <div className="aspect-[4/5] animate-pulse bg-wall-2" />
        )}
        {upload ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <button type="button" className="min-h-11 text-[16px] font-bold text-act-ink underline" onClick={() => setCropOpen(true)} disabled={reading}>
              Straighten and crop
            </button>
            {!editToken ? (
              <button type="button" className="min-h-11 text-[16px] font-semibold underline" onClick={() => fileRef.current?.click()}>
                Use a different photo
              </button>
            ) : null}
          </div>
        ) : null}
        {aiCorners && upload ? (
          <div className="mt-3 bg-act-soft p-3 text-[16px] text-act-soft-ink">
            <p className="font-semibold">Photo taken on a wall? We found the flyer&apos;s edges.</p>
            <button type="button" className="mt-1 font-bold underline" onClick={() => setCropOpen(true)}>
              Straighten it
            </button>
          </div>
        ) : null}
        {cropOpen && upload ? <CropEditor src={upload.url} initial={aiCorners} onCancel={() => setCropOpen(false)} onDone={straightenTo} /> : null}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </aside>

      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-[30px] leading-tight font-extrabold [font-stretch:88%]">{editToken ? "Edit your flyer" : "About it"}</h1>
          {reading ? (
            <p className="mt-2 flex items-center gap-2 bg-act-soft px-3 py-2 text-[16px] font-semibold text-act-soft-ink">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-act border-t-transparent" /> Reading your flyer…
            </p>
          ) : aiFilled ? (
            <p className="mt-2 bg-act-soft px-3 py-2 text-[16px] font-semibold text-act-soft-ink">Filled in from your flyer. Give it a quick check.</p>
          ) : null}
          {aiNote ? <p className="mt-2 bg-now-soft px-3 py-2 text-[16px]">{aiNote}</p> : null}
          {duplicates.length ? (
            <div className="mt-2 border-[1.5px] border-warn bg-warn-soft px-3 py-2 text-[16px] text-warn-soft-ink">
              <p className="font-bold">Already on the site?</p>
              {duplicates.map((d) => (
                <p key={d.slug}>
                  This {d.why === "looks the same" ? "looks like" : d.why === "same QR code" ? "has the same QR code as" : "has the same name as"}{" "}
                  <a href={`/e/${d.slug}`} target="_blank" rel="noreferrer" className="font-semibold underline">
                    {d.title}
                  </a>
                  {d.status !== "live" ? " (not published yet)" : ""}.
                </p>
              ))}
            </div>
          ) : null}
        </div>

        <fieldset disabled={reading || !loaded} className="flex flex-col gap-6 disabled:opacity-60">
          <section className="grid gap-4">
            <div>
              <label className={label} htmlFor="title">
                {form.kind === "classes" ? "Name (studio or class series)" : "Event name"}
              </label>
              <input id="title" className={input} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Full Moon Sound Bath" />
            </div>
            <div>
              <span className={label}>What kind of event?</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => set("category", c.key)}
                    aria-pressed={form.category === c.key}
                    className={`inline-flex min-h-11 items-center rounded-full border-[1.5px] border-ink px-3.5 text-[15px] font-semibold ${form.category === c.key ? "bg-ink text-wall" : "bg-surface"}`}
                  >
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: c.color }} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={label} htmlFor="desc">
                Short description <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea id="desc" rows={3} className={input} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What happens, what to bring…" />
            </div>
          </section>

          <section className={section}>
            <h2 className={h2}>When</h2>
            <div className="grid grid-cols-2 overflow-hidden border-[1.5px] border-ink" role="radiogroup" aria-label="Kind of listing">
              {(
                [
                  ["event", "An event", "One date, a few, or weekly"],
                  ["classes", "Regular classes", "A weekly timetable"],
                ] as const
              ).map(([k, l, hint]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={form.kind === k}
                  onClick={() => setForm((f) => ({ ...f, kind: k, sessions: k === "classes" && !f.sessions.length ? [emptySession()] : f.sessions }))}
                  className={`px-3 py-2 text-left ${form.kind === k ? "bg-ink text-wall" : ""}`}
                >
                  <span className="block text-[16px] font-bold">{l}</span>
                  <span className={`block text-[14px] ${form.kind === k ? "opacity-85" : "text-muted"}`}>{hint}</span>
                </button>
              ))}
            </div>
            {form.kind === "event" ? (
              <>
                {form.dates.map((d, i) => (
                  <div key={i} className="grid grid-cols-[1.3fr_1fr_1fr_auto] items-end gap-2">
                    <div>
                      {i === 0 ? <span className="text-[14px] font-semibold text-ink-2">Date</span> : null}
                      <input type="date" min={today} className={input} value={d.date} onChange={(e) => set("dates", form.dates.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} />
                    </div>
                    <div>
                      {i === 0 ? <span className="text-[14px] font-semibold text-ink-2">Starts</span> : null}
                      <input type="time" className={input} value={d.start_time} onChange={(e) => set("dates", form.dates.map((x, j) => (j === i ? { ...x, start_time: e.target.value } : x)))} />
                    </div>
                    <div>
                      {i === 0 ? <span className="text-[14px] font-semibold text-ink-2">Ends</span> : null}
                      <input type="time" className={input} value={d.end_time} onChange={(e) => set("dates", form.dates.map((x, j) => (j === i ? { ...x, end_time: e.target.value } : x)))} />
                    </div>
                    <button type="button" aria-label="Remove date" className="flex h-12 w-11 items-center justify-center text-ink-2 hover:bg-wall-2" onClick={() => set("dates", form.dates.filter((_, j) => j !== i))}>
                      <Icon name="close" size={20} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={addLink}
                  onClick={() => {
                    const last = form.dates[form.dates.length - 1];
                    set("dates", [...form.dates, { date: last ? addDays(last.date || today, 1) : today, start_time: last?.start_time ?? "", end_time: last?.end_time ?? "" }]);
                  }}
                >
                  <Icon name="plus" size={18} /> Add another date
                </button>
                <label className="flex min-h-11 items-center gap-3 text-[16px] font-bold">
                  <input
                    type="checkbox"
                    checked={form.weeklyOn}
                    onChange={(e) => setForm((f) => ({ ...f, weeklyOn: e.target.checked, sessions: e.target.checked && !f.sessions.length ? [emptySession()] : f.sessions }))}
                    className="h-5 w-5 accent-[var(--act)]"
                  />
                  Repeats every week
                </label>
                {form.weeklyOn ? <SessionsEditor sessions={form.sessions} onChange={(v) => set("sessions", v)} /> : null}
              </>
            ) : (
              <SessionsEditor sessions={form.sessions} onChange={(v) => set("sessions", v)} classes />
            )}
            {form.kind === "classes" || form.weeklyOn ? (
              <label className="grid gap-1 text-[15px] font-semibold text-ink-2 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-3">
                Runs until <span className="font-normal">(optional: leave empty to keep it going while it&apos;s up)</span>
                <input type="date" min={today} className={`${input} sm:col-span-2 sm:max-w-56`} value={form.repeatUntil} onChange={(e) => set("repeatUntil", e.target.value)} />
              </label>
            ) : null}
          </section>

          <section className={section}>
            <h2 className={h2}>Where</h2>
            <select
              className={input}
              value={form.venueSlug}
              onChange={(e) => {
                set("venueSlug", e.target.value);
                if (e.target.value === "__new") pinFromFlyer(form.links);
              }}
              aria-label="Venue"
            >
              <option value="">Choose the place…</option>
              {venueGroups.map((g) => (
                <optgroup key={g.key} label={g.label}>
                  {g.list.map((v) => (
                    <option key={v.slug} value={v.slug}>
                      {v.name}
                      {v.is_demo ? " (sample)" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="__new">Somewhere else: add a place</option>
            </select>
            {form.venueSlug === "__new" ? (
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <input className={input} placeholder="Venue name" value={form.newVenue.name} onChange={(e) => set("newVenue", { ...form.newVenue, name: e.target.value })} />
                  <select className={input} value={form.newVenue.area} onChange={(e) => set("newVenue", { ...form.newVenue, area: e.target.value })}>
                    {AREAS.map((a) => (
                      <option key={a.key} value={a.key}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
                <input className={input} placeholder="Landmark (optional), e.g. above the German Bakery" value={form.newVenue.address} onChange={(e) => set("newVenue", { ...form.newVenue, address: e.target.value })} />
                <label className="flex min-h-11 items-start gap-3 text-[16px] font-semibold">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--act)]" checked={form.newVenue.onRequest} onChange={(e) => set("newVenue", { ...form.newVenue, onRequest: e.target.checked })} />
                  The flyer doesn&apos;t say exactly where. People message the organiser for the spot.
                </label>
                {form.newVenue.onRequest ? null : (
                  <>
                    <p className="text-[16px] font-semibold">{newVenuePin ? "Pin dropped. Tap again to move it." : "Tap the map where it is, or paste a Google Maps link:"}</p>
                    <MapLinkInput onPin={(lat, lng) => set("newVenue", { ...form.newVenue, lat, lng })} />
                    <div className="h-64 overflow-hidden border border-line">
                      <LazyMapView pins={[]} today={today} pick picked={newVenuePin} onPick={(lat, lng) => set("newVenue", { ...form.newVenue, lat, lng })} />
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </section>

          <section className={section}>
            <h2 className={h2}>Price</h2>
            <div className="grid grid-cols-4 overflow-hidden border-[1.5px] border-ink">
              {(
                [
                  ["free", "Free"],
                  ["donation", "Donation"],
                  ["paid", "Paid"],
                  ["unknown", "Not on flyer"],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" onClick={() => set("price_type", k)} aria-pressed={form.price_type === k} className={seg(form.price_type === k)}>
                  {l}
                </button>
              ))}
            </div>
            {form.price_type === "paid" || form.price_type === "donation" ? (
              <div className="grid grid-cols-3 gap-2">
                <label className="text-[14px] font-semibold text-ink-2">
                  {form.price_type === "donation" ? "Suggested ₹" : "From ₹"}
                  <input inputMode="numeric" className={input} value={form.price_min} onChange={(e) => set("price_min", e.target.value)} placeholder="500" />
                </label>
                {form.price_type === "paid" ? (
                  <label className="text-[14px] font-semibold text-ink-2">
                    Up to ₹ <span className="font-normal">(optional)</span>
                    <input inputMode="numeric" className={input} value={form.price_max} onChange={(e) => set("price_max", e.target.value)} placeholder="800" />
                  </label>
                ) : null}
                <label className="text-[14px] font-semibold text-ink-2">
                  Note
                  <input className={input} value={form.price_note} onChange={(e) => set("price_note", e.target.value)} placeholder="incl. cacao" />
                </label>
              </div>
            ) : null}
          </section>

          <section className={section}>
            <h2 className={h2}>Who&apos;s playing or leading</h2>
            <p className="-mt-2 text-[15px] text-ink-2">People who follow them hear when your flyer goes up.</p>
            <div className="flex flex-wrap gap-2">
              {form.artists.map((a) => (
                <span key={a} className="inline-flex min-h-10 items-center gap-1 rounded-full bg-ink pr-1 pl-3.5 text-[15px] font-semibold text-wall">
                  {a}
                  <button type="button" aria-label={`Remove ${a}`} onClick={() => set("artists", form.artists.filter((x) => x !== a))} className="flex h-9 w-9 items-center justify-center opacity-80 hover:opacity-100">
                    <Icon name="close" size={16} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className={input}
                placeholder="Add a name and press Enter"
                value={artistDraft}
                onChange={(e) => setArtistDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const v = artistDraft.trim();
                    if (v && !form.artists.includes(v)) set("artists", [...form.artists, v]);
                    setArtistDraft("");
                  }
                }}
              />
              <button
                type="button"
                className="min-h-12 shrink-0 border-[1.5px] border-ink px-4 text-[16px] font-bold"
                onClick={() => {
                  const v = artistDraft.trim();
                  if (v && !form.artists.includes(v)) set("artists", [...form.artists, v]);
                  setArtistDraft("");
                }}
              >
                Add
              </button>
            </div>
          </section>

          <section className={section}>
            <h2 className={h2}>How do people reach you?</h2>
            <p className="-mt-2 text-[15px] text-ink-2">Shown on the listing.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={input} inputMode="tel" placeholder="WhatsApp or phone" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
              <input className={input} placeholder="Instagram handle" value={form.contact_instagram} onChange={(e) => set("contact_instagram", e.target.value)} />
              <input className={`${input} sm:col-span-2`} placeholder="Booking or info link (optional)" value={form.booking_url} onChange={(e) => set("booking_url", e.target.value)} />
            </div>
            {form.links.length ? (
              <div className="grid gap-2">
                <p className="text-[16px] font-bold">From the QR codes on your flyer</p>
                <p className="-mt-1.5 text-[15px] text-ink-2">Shown as buttons, since people can&apos;t scan a code on their own screen. Remove any that shouldn&apos;t be public.</p>
                <ul className="grid gap-1.5">
                  {form.links.map((l) => (
                    <li key={l.url} className="flex min-h-12 items-center gap-2 border border-line bg-wall px-3 text-[15px]">
                      <span className="shrink-0 font-bold">{LINK_LABELS[l.kind]}</span>
                      <span className="min-w-0 flex-1 truncate text-muted">{l.url.replace(/^https?:\/\//, "")}</span>
                      <button type="button" aria-label={`Remove ${LINK_LABELS[l.kind]}`} className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-2 hover:text-ink" onClick={() => set("links", form.links.filter((x) => x.url !== l.url))}>
                        <Icon name="close" size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className={`${section} border-l-4 border-act`}>
            <h2 className={h2}>You</h2>
            <label className="grid gap-1">
              <span className={label}>
                Your WhatsApp, for {SITE.name} only {isAdmin ? <span className="font-normal text-muted">(optional)</span> : null}
              </span>
              <input
                className={input}
                inputMode="tel"
                placeholder={form.contact_phone ? `${form.contact_phone} (same as above)` : "e.g. 98531 81006"}
                value={form.organiser_whatsapp}
                onChange={(e) => set("organiser_whatsapp", e.target.value)}
              />
              <span className="text-[15px] text-ink-2">We&apos;ll message you here today: approved, or with a question. It&apos;s never shown on the listing.</span>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={input} placeholder="Your name or organisation (optional, shown)" value={form.organiser_name} onChange={(e) => set("organiser_name", e.target.value)} />
              <input className={input} type="email" inputMode="email" placeholder="Email (optional, private)" value={form.organiser_email} onChange={(e) => set("organiser_email", e.target.value)} />
            </div>
          </section>
        </fieldset>

        {error ? <ErrorBox msg={error} /> : null}
        <button
          type="button"
          onClick={submit}
          disabled={busy || reading || !loaded}
          className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] min-h-[52px] w-full bg-ink px-5 text-[17px] font-bold text-wall shadow-e2 disabled:opacity-60 lg:bottom-4"
        >
          {busy ? "Saving…" : editToken ? "Save changes" : isAdmin ? "Next: publish" : "Next: check and send"}
        </button>
      </div>
    </div>
  );
}

type Nullable<T> = { [K in keyof T]: T[K] | null };

/** Phone number from a wa.me/<number> QR link. */
function waPhone(links: FlyerLink[]) {
  for (const l of links) {
    const m = l.kind === "whatsapp" ? l.url.match(/wa\.me\/(\d{10,15})/) : null;
    if (m) return `+${m[1]}`;
  }
  return null;
}

/** Weekly times with at least one day chosen. */
function activeSessions(form: Form) {
  if (form.kind === "event" && !form.weeklyOn) return [];
  return form.sessions.filter((x) => x.days.length);
}

/** Weekly slots: a class timetable (with class names) or a repeating event's day and time. */
function SessionsEditor({ sessions, onChange, classes = false }: { sessions: SessionRow[]; onChange: (s: SessionRow[]) => void; classes?: boolean }) {
  const update = (i: number, patch: Partial<SessionRow>) => onChange(sessions.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="grid gap-3">
      {sessions.map((x, i) => (
        <div key={i} className="grid gap-2 bg-wall p-3">
          {classes ? (
            <div className="flex gap-2">
              <input className={input} placeholder="Class name, e.g. Hatha Flow" value={x.label} onChange={(e) => update(i, { label: e.target.value })} aria-label="Class name" />
              <button type="button" aria-label="Remove class" className="flex h-12 w-11 shrink-0 items-center justify-center text-ink-2 hover:bg-wall-2" onClick={() => onChange(sessions.filter((_, j) => j !== i))}>
                <Icon name="close" size={20} />
              </button>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {WEEK_ORDER.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={x.days.includes(d)}
                onClick={() => update(i, { days: x.days.includes(d) ? x.days.filter((y) => y !== d) : [...x.days, d].sort() })}
                className={`h-11 w-11 text-[15px] font-bold ${x.days.includes(d) ? "bg-ink text-wall" : "border-[1.5px] border-line-strong bg-surface"}`}
              >
                {WEEKDAY_SHORT[d]}
              </button>
            ))}
            <button type="button" onClick={() => update(i, { days: x.days.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6] })} className="h-11 border-[1.5px] border-ink bg-surface px-3 text-[15px] font-bold">
              {x.days.length === 7 ? "Clear" : "Daily"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[14px] font-semibold text-ink-2">
              Starts
              <input type="time" className={input} value={x.start_time} onChange={(e) => update(i, { start_time: e.target.value })} />
            </label>
            <label className="text-[14px] font-semibold text-ink-2">
              Ends
              <input type="time" className={input} value={x.end_time} onChange={(e) => update(i, { end_time: e.target.value })} />
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        className={addLink}
        onClick={() => onChange([...sessions, { ...emptySession(), days: sessions[sessions.length - 1]?.days ?? [] }])}
      >
        <Icon name="plus" size={18} /> {classes ? "Add a class" : "Add another weekly time"}
      </button>
    </div>
  );
}

function Steps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-extrabold tracking-[0.08em] text-muted uppercase">Step {step} of 3</span>
      <ol className="flex gap-1.5" aria-label={`Step ${step} of 3: ${["Flyer", "About it", "Check and send"][step - 1]}`}>
        {[1, 2, 3].map((i) => (
          <li key={i} className={`h-1.5 flex-1 ${i <= step ? "bg-ink" : "bg-line"}`} aria-hidden />
        ))}
      </ol>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return <p role="alert" className="mt-3 bg-warn-soft p-3 text-[16px] font-semibold text-warn-soft-ink">{msg}</p>;
}
