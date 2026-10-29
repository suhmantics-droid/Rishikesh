@AGENTS.md

# WhatsOnTapovan

A what's-on noticeboard of real event flyers for Tapovan, Rishikesh: rishikesh.suhmantics.com.
Owner and reviewer: Sagar. Phones first; desktop must work too.

## Decisions (don't change without asking Sagar)

- Name is **WhatsOnTapovan**. Never "Pinned" in anything a visitor sees. No logo: the wordmark only.
  The brand picture will be an illustrated map of Tapovan that Sagar makes in Gemini (for the app icon).
- Anyone who advertises pays the same: ₹50 for 4 weeks (`LISTING` in `src/lib/site.ts`). No accounts.
- Flow: organiser submits, a person reviews it the same day, the organiser hears on WhatsApp, then pays.
  Review comes before payment. Nothing renews by itself.
- How to pay, cut-off times and rating dates are handled by word of mouth: keep them off the screens.
- "Tonight" starts at 6pm (`TONIGHT_FROM`). "Now" means on now or starting in the next 2 hours (`src/lib/now.ts`).
- Recommended means Sagar's own pick, never paid for. Don't add claims about a place (awards, who runs it)
  unless Sagar gives the source.
- Never invent facts about venues, events or prices. Unknown price says "Price not listed".
- Place certainty is always shown: `venues.lat` null means "spot on request"; `coords_verified = 0` means
  approximate (dashed ring, "approx."); 1 means a checked pin.
- Home layout is still open, to be settled by testing with real people.

## Writing style (all copy, comments and commit messages)

- No em dashes. Recast the sentence instead.
- Short, plain, warm. Like a person, not a template. No emoji in the UI: use `<Icon>` from `src/components/Icon.tsx`.

## Design system: Direction A, "The Wall"

- Tokens live in `src/app/globals.css` (`--wall`, `--slip`, `--ink`, `--now` marigold for now/next,
  `--act` jade for actions, `--sandal` for practice/Recommended, `--dusk` for evening). Dark mode is defined there.
  Use the Tailwind names (`bg-wall`, `bg-surface`, `text-act-ink`, `bg-now`...), not raw hex, in components.
- Font: Anek Latin, one variable file (weight + width). Condensed headings use `[font-stretch:88%]`.
  Hindi section labels use the `.hi` class with the subset Devanagari font; only the label words in
  `DAY_BANDS` and the headings are in that subset, so new Hindi words need the font re-subset.
- Flyers are never cropped on the wall: CSS columns masonry, wide flyers span. Each flyer gets a paper
  "slip" (`.slip-time`, `.slip-name`, `.slip-meta`, `.tape`).
- Touch targets at least 44px (`min-h-11`), body text 16px or more.
- Share images (`/today/og`, `/today/story`, `/opengraph-image`) use static Anek fonts in `assets/fonts`
  (satori can't read woff2).

## Where things are

- Tabs: What's on (`/`, `/flyers`, `/map`, `/today`, `/e/[slug]`), Places (`/venues`, `/v/[slug]`, `/artists`),
  Mine (`/plan`, `/alerts`, `/manage`). `src/components/Nav.tsx` matches routes to tabs.
- Map: `MapScreen.tsx` (page chrome, sheet) + `MapView.tsx` (Leaflet; labels below zoom 16, flyer collage at 16+).
- Posting: `PostFlow.tsx` (3 steps) and `PayWidget.tsx`. Status words: `src/lib/status.ts`
  (Not sent yet, In review, Changes needed, Live, Ending soon, Ended, Taken down). Use these words everywhere.
- Review: `/admin`. "Ask for changes" sets `status = 'changes_needed'` with `review_note`; the organiser's edit
  sends it back to `pending_review`. `organiser_whatsapp` is private: never show it on a listing.
- Things saved on the phone (no account): plan, follows, manage links (`pinned:*` localStorage keys; keep the names).

## Running it

- `npm run dev`, `npm test`, `npm run lint`, `npx tsc --noEmit`, `npx next build`. Check all before committing.
- Local data: SQLite under `DATA_DIR`. On Vercel: Turso (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) and Vercel Blob.
- New columns go in `MIGRATIONS` in `src/lib/db.ts`; they're added on the next cold start.
- `cacheComponents` is on: anything reading search params, cookies, the DB or `usePathname` must sit inside `<Suspense>`.
- Deploy: push a branch for a Vercel preview; main is the live site. Sagar reviews the preview before main.

## Still to do

- App icon and manifest icons from Sagar's Gemini map of Tapovan.
- A timeline of review steps on the manage page (each step recorded by the admin action).
- Room reports for stays (a later feature).
