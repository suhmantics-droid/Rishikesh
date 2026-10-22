import { dateParts, formatDayLong } from "@/lib/dates";

const plural = (n: number, word: string) => `${n.toLocaleString("en-IN")} ${word}${n === 1 ? "" : "s"}`;

type Point = { day: string; visitors: number; pageviews: number; flyerViews: number; actions: number };

/**
 * Daily unique visitors as columns (single series, so the title names it — no legend).
 * Bars cap at 24px with a 4px rounded top; each column is a full-height hover target.
 */
export function VisitorsChart({ data, today }: { data: Point[]; today: string }) {
  const max = Math.max(1, ...data.map((d) => d.visitors));
  const last = data[data.length - 1];
  return (
    <figure className="rounded-2xl border border-line bg-card p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-lg font-semibold">Visitors, last {data.length} days</span>
        <span className="text-sm text-muted">
          {plural(data.reduce((s, d) => s + d.visitors, 0), "visitor")} · {plural(data.reduce((s, d) => s + d.pageviews, 0), "page view")}
        </span>
      </figcaption>
      <div className="relative mt-6 h-40">
        <span className="absolute -top-5 left-0 text-[11px] text-muted">{max}</span>
        <div className="absolute inset-x-0 top-0 border-t border-line" aria-hidden />
        <div className="absolute inset-0 flex items-end gap-[2px] border-b border-line">
          {data.map((d) => {
            const h = (d.visitors / max) * 100;
            const isLast = d === last;
            return (
              <div key={d.day} className="group relative flex h-full flex-1 items-end justify-center" tabIndex={0} aria-label={`${formatDayLong(d.day, today)}: ${d.visitors} visitors`}>
                {isLast && d.visitors > 0 ? (
                  <span className="absolute text-[11px] font-bold text-ink" style={{ bottom: `calc(${h}% + 4px)` }}>
                    {d.visitors}
                  </span>
                ) : null}
                <div className="w-full max-w-6 rounded-t-[4px] bg-chart" style={{ height: `${h}%`, minHeight: d.visitors ? 2 : 0 }} />
                <div className="pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs shadow-card group-hover:block group-focus:block">
                  <div className="font-bold">{formatDayLong(d.day, today)}</div>
                  <div className="text-ink-2">{d.visitors} visitors · {d.pageviews} page views</div>
                  <div className="text-ink-2">{d.flyerViews} flyer views · {d.actions} taps</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        {[data[0], data[Math.floor(data.length / 2)], last].map((d) => {
          const p = dateParts(d.day);
          return <span key={d.day}>{d.day === today ? "Today" : `${p.day} ${p.mon}`}</span>;
        })}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1">Day</th>
              <th>Visitors</th>
              <th>Page views</th>
              <th>Flyer views</th>
              <th>Taps</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.day} className="border-t border-line">
                <td className="py-1">{formatDayLong(d.day, today)}</td>
                <td>{d.visitors}</td>
                <td>{d.pageviews}</td>
                <td>{d.flyerViews}</td>
                <td>{d.actions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
