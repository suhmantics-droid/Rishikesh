"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES } from "@/lib/site";
import { useFollows, writeFollows, type LocalFollow } from "./Follow";
import { Icon } from "./Icon";
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
  const [tab, setTab] = useState<"vibes" | "venues" | "artists">("vibes");
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
      <div className="flex flex-col items-start gap-2 bg-surface p-5 shadow-e1">
        <p className="text-[21px] font-extrabold">
          {state === "gone" ? "You're unsubscribed" : state === "sent" ? "Check your inbox" : "We've emailed you a link"}
        </p>
        <p className="text-[16px] text-ink-2">
          {state === "gone"
            ? "No more emails. Come back any time."
            : state === "sent"
              ? `Tap the confirm link we sent to ${email} and your alerts are on.`
              : `${email} already has alerts. We sent its private link so you can change them.`}
        </p>
        <Link href="/" className="mt-2 inline-flex min-h-12 items-center rounded-full bg-ink px-5 text-[16px] font-bold text-wall">
          Back to the wall
        </Link>
      </div>
    );
  }

  const chip = (on: boolean) =>
    `inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] px-4 text-[16px] font-semibold ${on ? "border-ink bg-ink text-wall" : "border-ink bg-wall hover:bg-wall-2"}`;
  const tabs = [
    { key: "vibes", label: "Vibes" },
    { key: "venues", label: "Venues" },
    { key: "artists", label: "Artists" },
  ] as const;
  const vibes = CATEGORIES.filter((c) => c.key !== "other" && (!q || c.label.toLowerCase().includes(q.toLowerCase())));

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div role="tablist" aria-label="Follow" className="flex overflow-hidden rounded-full border-[1.5px] border-ink self-start">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`min-h-11 px-4 text-[16px] font-semibold ${tab === t.key ? "bg-ink text-wall" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <label className="flex min-h-12 items-center gap-2 border-[1.5px] border-line-strong bg-surface px-3 focus-within:border-ink">
        <Icon name="search" size={20} className="text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={`Search ${tab}`}
          placeholder={tab === "vibes" ? "Search vibes" : tab === "venues" ? "Search cafes and venues" : "Search musicians and teachers"}
          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {tab === "vibes"
          ? vibes.map((c) => (
              <button key={c.key} type="button" aria-pressed={has("category", c.key)} className={chip(has("category", c.key))} onClick={() => toggle("category", c.key, c.label)}>
                <span className="h-2.5 w-2.5 rounded-full ring-1 ring-current" style={{ background: c.color }} aria-hidden />
                {c.label}
              </button>
            ))
          : tab === "venues"
            ? shownVenues.map((v) => (
                <button key={v.slug} type="button" aria-pressed={has("venue", v.slug)} className={chip(has("venue", v.slug))} onClick={() => toggle("venue", v.slug, v.name)}>
                  {has("venue", v.slug) ? <Icon name="check" size={16} /> : null}
                  {v.name}
                </button>
              ))
            : shownArtists.map((a) => (
                <button key={a.slug} type="button" aria-pressed={has("artist", a.slug)} className={chip(has("artist", a.slug))} onClick={() => toggle("artist", a.slug, a.name)}>
                  {has("artist", a.slug) ? <Icon name="check" size={16} /> : null}
                  {a.name}
                </button>
              ))}
        {tab === "artists" && artists.length === 0 ? <p className="text-[16px] text-ink-2">Artists appear here as their flyers go up.</p> : null}
      </div>

      <p className="text-[17px] font-bold">
        {follows.length ? `Following ${follows.length}` : "Nothing followed yet"}
        <span className="font-normal text-muted"> · across vibes, venues and artists</span>
      </p>

      {!token ? (
        <section className="flex flex-col gap-2 border-t border-line pt-4">
          <h2 className="text-[19px] font-extrabold">On this phone</h2>
          <p className="-mt-1 text-[16px] text-ink-2">One notification when a new flyer goes up for something you follow. No email or account needed.</p>
          <PushToggle />
        </section>
      ) : null}

      {emailOn || token ? (
        <section className="flex flex-col gap-3 border-t border-line pt-4">
          {!token ? <h2 className="text-[19px] font-extrabold">Or by email</h2> : null}
          <label className="flex items-start gap-3 text-[16px]">
            <input type="checkbox" checked={daily} onChange={(e) => setDaily(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--act)]" />
            <span>
              <b>Morning email: what&apos;s on today in Tapovan</b>
              <br />
              <span className="text-ink-2">One short list each morning, only on days with something on.</span>
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
              aria-label="Your email"
              className="min-h-12 border-[1.5px] border-line-strong bg-surface px-3 text-[16px] focus:border-ink"
            />
          ) : (
            <p className="text-[16px] text-ink-2">Alerts go to {initial?.email}</p>
          )}
          <button disabled={state === "busy"} className="min-h-12 self-start rounded-full bg-ink px-5 text-[16px] font-bold text-wall disabled:opacity-60">
            {state === "busy" ? "Saving…" : token ? "Save my alerts" : `Email me${follows.length ? ` about ${follows.length}` : ""}`}
          </button>
          {state === "saved" ? <p className="text-[16px] font-semibold text-act-ink">Saved.</p> : null}
          {error ? <p className="text-[16px] font-semibold text-warn">{error}</p> : null}
          {token ? (
            <button type="button" onClick={unsubscribe} className="min-h-11 self-start text-[15px] text-ink-2 underline">
              Unsubscribe from everything
            </button>
          ) : (
            <p className="text-[14px] text-muted">No account, no spam. Every email has a one-tap unsubscribe.</p>
          )}
        </section>
      ) : null}
    </form>
  );
}
