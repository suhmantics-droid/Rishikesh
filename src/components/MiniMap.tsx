"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "@/lib/data";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-paper-2" />,
});

export function MiniMap({ pins, today, className = "h-56" }: { pins: MapPin[]; today: string; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-line ${className}`}>
      <MapView pins={pins} today={today} />
    </div>
  );
}

export { MapView as LazyMapView, MapView };
