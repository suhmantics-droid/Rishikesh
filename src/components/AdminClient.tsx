"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { login, saveVenue } from "@/app/admin/actions";
import { AREAS } from "@/lib/site";
import { MapLinkInput } from "./MapLinkInput";
import { LazyMapView } from "./MiniMap";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mx-auto mt-16 flex max-w-sm flex-col gap-3 rounded-2xl border border-line bg-card p-6">
      <h1 className="font-display text-2xl font-semibold">Admin</h1>
      <input name="password" type="password" placeholder="Password" autoFocus className="rounded-xl border border-line bg-paper px-3 py-2.5" />
      <button disabled={pending} className="rounded-xl bg-ink px-4 py-2.5 font-bold text-paper">
        {pending ? "Checking…" : "Sign in"}
      </button>
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
    </form>
  );
}

type V = { id: number; name: string; area: string; lat: number | null; lng: number | null; address: string | null; instagram: string | null; description: string | null };

/** Edit a venue and fix its map pin by tapping the map. Saving marks the pin as verified. */
export function VenueEditor({ v, today }: { v: V; today: string }) {
  const [pin, setPin] = useState(v.lat != null && v.lng != null ? { lat: v.lat, lng: v.lng } : null);
  const input = "rounded-lg border border-line bg-paper px-2 py-1.5 text-sm";
  return (
    <form action={saveVenue} className="grid gap-2 md:grid-cols-[1fr_280px]">
      <input type="hidden" name="id" value={v.id} />
      <input type="hidden" name="lat" value={pin?.lat ?? ""} />
      <input type="hidden" name="lng" value={pin?.lng ?? ""} />
      <div className="grid content-start gap-2">
        <input name="name" defaultValue={v.name} className={input} />
        <select name="area" defaultValue={v.area} className={input}>
          {AREAS.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
        </select>
        <input name="address" defaultValue={v.address ?? ""} placeholder="Address / landmark" className={input} />
        <input name="instagram" defaultValue={v.instagram ?? ""} placeholder="Instagram handle" className={input} />
        <textarea name="description" defaultValue={v.description ?? ""} placeholder="Short description" rows={2} className={input} />
        <p className="text-xs text-muted">{pin ? `Pin: ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : "No pin"} — tap the map to move it.</p>
        <MapLinkInput onPin={(lat, lng) => setPin({ lat, lng })} />
        <button className="justify-self-start rounded-lg bg-ink px-3 py-1.5 text-sm font-bold text-paper">Save & mark pin verified</button>
      </div>
      <div className="h-56 overflow-hidden rounded-xl border border-line">
        <LazyMapView pins={[]} today={today} pick picked={pin} onPick={(lat, lng) => setPin({ lat, lng })} />
      </div>
    </form>
  );
}

/** Upload or replace one of the site photos (home banner, aarti card) from a phone. */
export function PhotoUploader({
  slot,
  label,
  want,
  current,
}: {
  slot: string;
  label: string;
  want: string;
  current: { id: string; credit: string | null } | null;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  async function submit(form: HTMLFormElement, remove = false) {
    setBusy(true);
    setMsg(null);
    const fd = new FormData(form);
    fd.set("slot", slot);
    if (remove) fd.set("remove", "1");
    const res = await fetch("/api/admin/photo", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(d.error ?? "Upload failed");
    setMsg(remove ? "Removed" : "Saved ✓");
    window.location.reload();
  }
  const src = preview ?? (current ? `/f/${current.id}-sm.webp` : null);
  return (
    <form
      className="grid gap-3 rounded-2xl border border-line bg-card p-4 sm:grid-cols-[220px_minmax(0,1fr)]"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="aspect-[16/9] w-full rounded-xl object-cover" />
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl bg-gradient-to-br from-river-1 via-river-2 to-river-deep p-3 text-center text-xs font-semibold text-white/90">
          No photo yet
        </div>
      )}
      <div className="grid content-start gap-2 text-sm">
        <p className="font-bold">{label}</p>
        <p className="text-xs text-muted">{want}</p>
        <input
          type="file"
          name="photo"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
          className="text-sm"
        />
        <input name="credit" defaultValue={current?.credit ?? ""} placeholder="Photo credit (optional), e.g. your name or @handle" className="rounded-lg border border-line bg-paper px-3 py-2" />
        <div className="flex gap-2">
          <button disabled={busy} className="rounded-lg bg-ink px-3 py-1.5 font-bold text-paper disabled:opacity-60">
            {busy ? "Uploading…" : current ? "Save" : "Upload photo"}
          </button>
          {current ? (
            <button type="button" disabled={busy} onClick={(e) => submit(e.currentTarget.form!, true)} className="rounded-lg border border-line px-3 py-1.5 font-bold">
              Remove
            </button>
          ) : null}
        </div>
        {msg ? <p className="text-xs font-semibold">{msg}</p> : null}
      </div>
    </form>
  );
}

/** Many flyer photos at once — snap a whole wall on a walk, post them one by one later from the queue. */
export function BatchUploader() {
  const router = useRouter();
  const [progress, setProgress] = useState<{ done: number; total: number; failed: string[] } | null>(null);

  async function upload(files: FileList) {
    const list = [...files];
    const failed: string[] = [];
    setProgress({ done: 0, total: list.length, failed });
    // One at a time: phone connections in Tapovan are slow, and each photo is read on arrival.
    for (const [i, file] of list.entries()) {
      const fd = new FormData();
      fd.append("flyer", file);
      fd.append("batch", "1");
      const res = await fetch("/api/uploads", { method: "POST", body: fd }).catch(() => null);
      if (!res?.ok) failed.push(file.name);
      setProgress({ done: i + 1, total: list.length, failed: [...failed] });
    }
    router.refresh();
  }

  const busy = progress && progress.done < progress.total;
  return (
    <div className="rounded-2xl border-2 border-dashed border-line bg-card p-4">
      <label className={`flex cursor-pointer flex-col items-center gap-1 text-center ${busy ? "pointer-events-none opacity-60" : ""}`}>
        <span className="text-3xl">📸</span>
        <span className="font-display text-lg font-semibold">Add flyer photos</span>
        <span className="text-sm text-muted">Pick as many as you like. Each is read in the background and waits below for you to check and post.</span>
        <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => e.target.files?.length && upload(e.target.files)} />
      </label>
      {progress ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-paper-2">
            <div className="h-full bg-ganga transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {busy ? `Uploading ${progress.done + 1} of ${progress.total}…` : `${progress.done - progress.failed.length} uploaded.`}
            {progress.failed.length ? ` Couldn't upload: ${progress.failed.join(", ")}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
