// The WhatsOnTapovan icon set: 24px grid, 2px stroke, round caps and joins, currentColor.
// Icons sit next to a word; an icon on its own needs an aria-label on its button or link.

const C = "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0";

const PATHS = {
  board: "M6.2 5.4l11.9-.8.9 15.9-11.9.8z M9 3h6",
  places: "M3 21h18 M5 21V9l7-5 7 5v12 M10 21v-6h4v6",
  mine: "M6 3h12v18l-6-4-6 4z",
  save: "M6 3h12v18l-6-4-6 4z",
  search: "M4 11a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M20 20l-3.5-3.5",
  filter: "M4 7h9 M17 7h3 M4 17h3 M11 17h9 M13 7a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M7 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  map: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z M9 4v14 M15 6v14",
  list: "M8 6h13 M8 12h13 M8 18h13 M3.5 6h.01 M3.5 12h.01 M3.5 18h.01",
  back: "M15 5l-7 7 7 7",
  next: "M9 5l7 7-7 7",
  close: "M6 6l12 12 M18 6L6 18",
  down: "M6 9l6 6 6-6",
  share: "M15 5a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M3 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M15 19a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M8.6 13.5l6.8 4 M15.4 6.5l-6.8 4",
  directions: "M3 11l18-8-8 18-2-8z",
  calendar: "M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4",
  follow: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.9 1.9 0 0 0 3.4 0",
  remind: "M5 13a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M12 10v3l2 2 M4 5l3-2 M20 5l-3-2",
  message: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z",
  camera: "M4 8h3l2-3h6l2 3h3v11H4z M8.5 13a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0",
  external: "M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  post: "M6 6h12v15H6z M10 3h4v4h-4z M9 12h6 M9 16h4",
  report: "M5 21V4 M5 4h11l-2 4 2 4H5",
  plus: "M12 5v14 M5 12h14",
  check: "M5 12.5l4.5 4.5L19 7.5",
  locate: "M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M12 2v3 M12 19v3 M2 12h3 M19 12h3",
  time: `${C} M12 7v5l3 2`,
  recurring: "M17 2l4 4-4 4 M3 11V9a3 3 0 0 1 3-3h15 M7 22l-4-4 4-4 M21 13v2a3 3 0 0 1-3 3H3",
  "place-exact": "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z M9.5 9.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0",
  "place-approx": C,
  "place-request": "M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z M9.5 10a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.4v.3 M12 16.6h.01",
  rating: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  stay: "M3 18V6 M3 14h18v4 M21 14v-2a3 3 0 0 0-3-3h-7v5 M6 11.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0",
  recommended:
    "M12 2l2.4 2.1 3.2-.3.6 3.1 2.8 1.6-1.3 2.9 1.3 2.9-2.8 1.6-.6 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.6-3.1-2.8-1.6 1.3-2.9-1.3-2.9 2.8-1.6.6-3.1 3.2.3z M8.5 12l2.5 2.5 4.5-5",
  offline: "M3 3l18 18 M8.5 8.6A5.5 5.5 0 0 0 6 18h11 M10.5 6.2A5.5 5.5 0 0 1 17 10a4 4 0 0 1 3.4 6.4",
  "image-failed": "M4 4h16v16H4z M4 15l4-4 4 4 M14 13l2-2 4 4 M3 3l18 18",
  cancelled: `${C} M9 9l6 6 M15 9l-6 6`,
  info: `${C} M12 11v5 M12 8h.01`,
  more: "M5 12h.01 M12 12h.01 M19 12h.01",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className = "", filled = false }: { name: IconName; size?: number; className?: string; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={name === "more" ? 3 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={name === "place-approx" ? "2.6 2.4" : undefined}
      aria-hidden
      className={`shrink-0 ${className}`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
