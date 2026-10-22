"use client";

import { useActionState, useState } from "react";
import { login, saveVenue } from "@/app/admin/actions";
import { AREAS } from "@/lib/site";
import { LazyMapView } from "./MiniMap";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mx-auto mt-16 flex max-w-sm flex-col gap-3 rounded-2xl border border-line bg-card p-6">
      <h1 className="font-display text-2xl font-extrabold">Admin</h1>
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
        <button className="justify-self-start rounded-lg bg-ink px-3 py-1.5 text-sm font-bold text-paper">Save & mark pin verified</button>
      </div>
      <div className="h-56 overflow-hidden rounded-xl border border-line">
        <LazyMapView pins={[]} today={today} pick picked={pin} onPick={(lat, lng) => setPin({ lat, lng })} />
      </div>
    </form>
  );
}
