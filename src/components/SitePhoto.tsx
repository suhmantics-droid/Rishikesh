import type { Photo } from "@/lib/photos";

/**
 * A site photograph, or — until one is uploaded in Admin → Settings — a plain river-coloured
 * placeholder that says which photo belongs there.
 */
export function SitePhoto({
  photo,
  want,
  className = "",
  sizes = "100vw",
  priority = false,
  showCredit = true,
}: {
  photo: Photo | null;
  want: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Turn off when the parent shows the credit itself (e.g. above an overlay). */
  showCredit?: boolean;
}) {
  if (!photo) {
    return (
      <div className={`flex items-start justify-end bg-gradient-to-br from-river-1 via-river-2 to-river-deep ${className}`} aria-hidden>
        <span className="m-3 max-w-[70%] rounded-full bg-black/25 px-3 py-1 text-right text-[11px] font-semibold text-white/90" title={want}>
          Photo placeholder<span className="hidden sm:inline"> · {want}</span>
        </span>
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/f/${photo.id}.webp`}
        srcSet={`/f/${photo.id}-sm.webp 1200w, /f/${photo.id}.webp ${photo.w}w`}
        sizes={sizes}
        alt=""
        loading={priority ? "eager" : "lazy"}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {photo.credit && showCredit ? (
        <span className="absolute right-2 bottom-2 z-10 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white/90">📷 {photo.credit}</span>
      ) : null}
    </div>
  );
}
