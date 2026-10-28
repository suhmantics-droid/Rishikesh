"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES } from "@/lib/site";
import { useFollows, writeFollows, type LocalFollow } from "./Follow";
import { PushToggle } from "./PushToggle";

type Opt = { slug: string; name: string };
type Follow = { kind: "venue" | "artist" | "category"; target: string };

export function AlertsForm({
  venues,
  artists,
  token,
  initial,
  emailOn = true,
}: {
  venues: Opt[];
  artists: Opt[];
  /** Present when managing an existing subscription. */
  token?: string;
  initial?: { follows: Follow[]; daily: boolean; email: string };
  /** Emails are actually sent. When they aren't, only phone notifications are offered. */
  emailOn?: boolean;
}) {
  const local = useFollows();
  const [picked, setPicked] = useState<Follow[] | null>(initial?.follows ?? null);
  const follows = picked ?? local.map(({ kind, target }) => ({ kind, target }));
  const [daily, setDaily] = useState(initial?.daily ?? true);
  const [email, setEmail] = useState(initial?.email ?? "");
  const [q, setQ] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "manage-link-sent" | "saved" | "gone">("idle");
  const [error, setError] = useState<string | null>(null);

  const has = (kind: Follow["kind"], target: string) => follows.some((f) => f.kind === kind && f.target === target);
  function toggle(kind: Follow["kind"], target: string, label: string) {
    const next = has(kind, target) ? follows.filter((f) => !(f.kind === kind && f.target === target)) : [...follows, { kind, target }];
    setPicked(next);
    if (!token) {
      // Keep the device's follow list in sync so Follow buttons elsewhere agree.
      const labels = new Map(local.map((l) => [`${l.kind}:${l.target}`, l.label]));
      writeFollows(next.map((f) => ({ ...f, label: labels.get(`${f.kind}:${f.target}`) ?? (f.target === target ? label : f.target) }) as LocalFollow));
    }
  }

  const filter = (list: Opt[]) => (q ? list.filter((o) => o.name.toLowerCase().includes(q.toLowerCase())) : list);
  const shownVenues = useMemo(() => filter(venues), [venues, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownArtists = useMemo(() => filter(artists), [artists, q]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("busy");
    const res = await fetch(token ? `/api/alerts/${token}` : "/api/alerts", {
      method: token ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(token ? { follows, daily } : { email, follows, daily }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error ?? "Something went wrong");
      setState("idle");
      return;
    }
    setState(token ? "saved" : d.status === "manage-link-sent" ? "manage-link-sent" : "sent");
  }

  async function unsubscribe() {
    if (!token || !confirm("Stop all emails and delete your alerts?")) return;
    await fetch(`/api/alerts/${token}`, { method: "DELETE" });
    setState("gone");
  }

  if (state === "sent" || state === "manage-link-sent" || state === "gone") {
    return (
      <div className="rounded-2xl border border-line bg-card p-6 text-center">
        <p className="text-4xl">{state === "gone" ? "👋" : "📬"}</p>
        <p className="mt-2 font-display text-2xl font-semibold">
          {state === "gone" ? "You're unsubscribed" : state === "sent" ? "Check your inbox" : "We've emailed you a link"}
        </p>
        <p className="mt-1 text-ink-2">
          {state === "gone"
            ? "No more emails. Come back any time."
            : state === "sent"
              ? `Tap the confirm link we sent to ${email} and your alerts are on.`
              : `${email} already has alerts — we sent its private manage link so you can change them.`}
        </p>
        <Link href="/" className="mt-4 inline-block rounded-full bg-ink px-4 py-2 font-bold text-paper">
          Back to the flyers
        </Link>
      </div>
    );
  }

  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${on ? "border-ganga bg-ganga text-on-ganga" : "border-line bg-card text-ink-2 hover:border-ink-2"}`;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <section>
        <h2 className="font-display text-lg font-semibold">Vibes</h2>
        <p className="mb-2 text-sm text-muted">Hear when any new flyer of this kind goes up.</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.filter((c) => c.key !== "other").map((c) => (
            <button key={c.key} type="button" className={chip(has("category", c.key))} onClick={() => toggle("category", c.key, c.label)}>
              {has("category", c.key) ? "✓ " : ""}
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search cafes and artists…"
        className="rounded-full border border-line bg-card px-4 py-2 text-sm outline-none focus:border-ink-2"
      />

      <section>
        <h2 className="font-display text-lg font-semibold">Cafes & venues</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {shownVenues.map((v) => (
            <button key={v.slug} type="button" className={chip(has("venue", v.slug))} onClick={() => toggle("venue", v.slug, v.name)}>
              {has("venue", v.slug) ? "✓ " : ""}
              {v.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold">Musicians & facilitators</h2>
        {artists.length === 0 ? <p className="text-sm text-muted">Artists appear here as flyers go up — or tap Follow on any artist&apos;s page.</p> : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {shownArtists.map((a) => (
            <button key={a.slug} type="button" className={chip(has("artist", a.slug))} onClick={() => toggle("artist", a.slug, a.name)}>
              {has("artist", a.slug) ? "✓ " : ""}
              {a.name}
            </button>
          ))}
        </div>
      </section>

      {!token ? (
        <section className="grid gap-2 rounded-2xl border border-ganga/40 bg-ganga-soft/50 p-4">
          <h2 className="font-display text-lg font-semibold">{emailOn ? "Get them on this phone" : "Turn on notifications"}</h2>
          <p className="-mt-1 text-sm text-ink-2">Instant notifications, no email or account needed.</p>
          <PushToggle />
        </section>
      ) : null}

      {emailOn || token ? (
      <section className="grid gap-3 rounded-2xl border border-saffron/40 bg-saffron-soft/40 p-4">
        {!token ? <h2 className="font-display text-lg font-semibold">…or by email</h2> : null}
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={daily} onChange={(e) => setDaily(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--saffron)]" />
          <span>
            <b>Morning email: what&apos;s on today in Tapovan</b>
            <br />
            <span className="text-muted">One short list each morning, only on days with something on.</span>
          </span>
        </label>
        {!token ? (
          <input
            type="email"
            required
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            className="rounded-xl border border-line bg-card px-3 py-2.5"
          />
        ) : (
          <p className="text-sm text-muted">Alerts go to {initial?.email}</p>
        )}
        <button disabled={state === "busy"} className="rounded-xl bg-saffron px-4 py-3 font-extrabold text-white disabled:opacity-60">
          {state === "busy" ? "Saving…" : token ? "Save my alerts" : `Turn on alerts${follows.length ? ` (${follows.length})` : ""}`}
        </button>
        {state === "saved" ? <p className="text-sm font-semibold text-ganga">Saved ✓</p> : null}
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
        {token ? (
          <button type="button" onClick={unsubscribe} className="justify-self-start text-sm text-muted underline">
            Unsubscribe from everything
          </button>
        ) : (
          <p className="text-xs text-muted">No account, no spam. Every email has a one-tap unsubscribe.</p>
        )}
      </section>
      ) : null}
    </form>
  );
}
