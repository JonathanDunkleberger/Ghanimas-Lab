/**
 * Regenerates the README screenshots in docs/screenshots/.
 *
 * Usage:  node scripts/capture-screens.mjs  (dev server must be running on :3100)
 *
 * Notes:
 * - Uses playwright-core with the locally cached Chromium.
 * - All page requests are fulfilled through Node's fetch because headless
 *   Chromium may be denied local-network access by macOS privacy controls.
 * - Seeds localStorage with a realistic library (favorites, watched,
 *   ratings, timestamped history) so Collection / For You / Wrapped /
 *   Analytics render with real data instead of empty states.
 */
import { chromium } from "playwright-core";
import { mkdirSync, appendFileSync } from "node:fs";

const BASE = "http://localhost:3100";
// Chromium is denied local-network access by macOS, so pages are loaded from
// a fictional host and every request is rewritten to BASE inside Node.
const FAKE = "http://ghanimas-lab.internal";
const OUT = "docs/screenshots";
const EXE =
  process.env.HOME +
  "/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell";

mkdirSync(OUT, { recursive: true });

// ── 1. Build a realistic seed library from live carousel data ───────────────
console.log("Fetching carousel data...");
const carousels = await (await fetch(`${BASE}/api/home-carousels`)).json();

const byType = {};
for (const c of carousels) {
  for (const item of c.items) {
    if (!item.cover_image_url) continue;
    const arr = (byType[item.media_type] ||= []);
    if (!arr.some((x) => x.id === item.id)) arr.push(item);
  }
}
console.log(
  "pool:",
  Object.entries(byType).map(([t, a]) => `${t}=${a.length}`).join(" ")
);
const pick = (type, n, offset = 0) => (byType[type] || []).slice(offset, offset + n);

const favoriteItems = [
  ...pick("anime", 4),
  ...pick("game", 3),
  ...pick("film", 2),
  ...pick("book", 2),
  ...pick("tv", 1),
];
const watchedItems = [
  ...pick("anime", 3, 4),
  ...pick("game", 3, 3),
  ...pick("film", 3, 2),
  ...pick("tv", 2, 1),
  ...pick("book", 2, 2),
  ...favoriteItems.slice(0, 5),
];
const watchlistItems = [
  ...pick("anime", 2, 8),
  ...pick("game", 2, 7),
  ...pick("book", 3, 5),
  ...pick("film", 1, 6),
];

const items = {};
for (const it of [...favoriteItems, ...watchedItems, ...watchlistItems]) {
  items[it.id] = it;
}
const favorites = [...new Set(favoriteItems.map((i) => i.id))];
const watched = [...new Set(watchedItems.map((i) => i.id))];
const watchlist = [...new Set(watchlistItems.map((i) => i.id))].filter(
  (id) => !watched.includes(id)
);

const ratings = {};
const ratedPool = [...watched];
const ratingValues = [10, 9, 9, 8, 8, 8, 7, 9, 8, 7, 10, 8];
ratedPool.slice(0, 12).forEach((id, i) => (ratings[id] = ratingValues[i]));

// Timestamped history spread across the year (powers charts + streaks)
const now = Date.now();
const DAY = 86_400_000;
const history = [];
const monthsAgo = (m, jitterDays = 0) =>
  now - m * 30 * DAY - jitterDays * DAY;
watched.forEach((id, i) => {
  const ts = monthsAgo((i % 7) * 0.9, (i * 3) % 11);
  history.push({ id, action: "watched", ts });
  if (ratings[id]) history.push({ id, action: "rated", ts: ts + 3600e3, value: ratings[id] });
});
favorites.forEach((id, i) => {
  history.push({ id, action: "favorited", ts: monthsAgo((i % 6) * 0.8, (i * 5) % 13) });
});
watchlist.forEach((id, i) => {
  history.push({ id, action: "watchlisted", ts: monthsAgo((i % 5) * 0.7, (i * 2) % 9) });
});
// Recent 4-day streak so "Current Streak" reads nicely
for (let d = 0; d < 4; d++) {
  const id = watched[d % watched.length];
  history.push({ id, action: "rated", ts: now - d * DAY - 3600e3, value: ratings[id] || 8 });
}
history.sort((a, b) => a.ts - b.ts);

const seed = {
  "feyris-favorites": favorites,
  "feyris-watched": watched,
  "feyris-watchlist": watchlist,
  "feyris-ratings": ratings,
  "feyris-items-cache": items,
  "feyris-history": history,
};
console.log(
  `Seed: ${favorites.length} favorites, ${watched.length} watched, ${watchlist.length} watchlist, ${history.length} events`
);

// ── 2. Browser with Node-fetch request bridging ─────────────────────────────
const browser = await chromium.launch({
  executablePath: EXE,
  headless: true,
  args: ["--no-proxy-server"],
});
const context = await browser.newContext({
  viewport: { width: 1560, height: 990 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});

// Fulfill every request via Node fetch (Chromium can't reach localhost here)
let routeHits = 0;
const FORBIDDEN_REQ = new Set([
  "host", "connection", "content-length", "accept-encoding", "upgrade",
  "keep-alive", "transfer-encoding", "te", "trailer", "proxy-connection",
]);
await context.route("**/*", async (route) => {
  routeHits++;
  const req = route.request();
  try {
    const reqHeaders = {};
    for (const [k, v] of Object.entries(req.headers())) {
      if (!FORBIDDEN_REQ.has(k.toLowerCase()) && !k.startsWith(":")) {
        reqHeaders[k] = v;
      }
    }
    // "Accept: text/html" makes Clerk's dev middleware 307-redirect to its
    // handshake endpoint, which is unreachable with placeholder keys.
    if (reqHeaders.accept?.includes("text/html")) reqHeaders.accept = "*/*";
    const resp = await fetch(req.url().replace(FAKE, BASE), {
      method: req.method(),
      headers: reqHeaders,
      body: req.postDataBuffer() ?? undefined,
      redirect: "manual",
    });
    const headers = {};
    resp.headers.forEach((v, k) => {
      if (!["content-encoding", "content-length", "transfer-encoding"].includes(k)) {
        headers[k] = v;
      }
    });
    await route.fulfill({
      status: resp.status,
      headers,
      body: Buffer.from(await resp.arrayBuffer()),
    });
  } catch (e) {
    appendFileSync(
      "/tmp/bridge-errors.log",
      `${req.url().slice(0, 120)} :: ${e.stack?.split("\n")[0] ?? e}\n`
    );
    await route.abort();
  }
});

await context.addInitScript((data) => {
  for (const [k, v] of Object.entries(data)) {
    localStorage.setItem(k, JSON.stringify(v));
  }
}, seed);

const page = await context.newPage();

async function shot(path, name, opts = {}) {
  console.log("navigating", path, `(route hits so far: ${routeHits})`);
  await page.goto(`${FAKE}${path}`, { waitUntil: "load", timeout: 90_000 });
  await page.waitForTimeout(opts.settle ?? 6000);
  if (opts.before) await opts.before();
  // Park the cursor so hover states / chart tooltips don't leak into shots
  await page.mouse.move(5, 5);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}` });
  console.log("captured", name);
}

// ── 3. Capture ───────────────────────────────────────────────────────────────
await shot("/", "01-homepage.png", { settle: 9000 });

// Media detail — open the first poster card on the home page
const cardBox = await page.locator("section img").first().boundingBox();
await page.mouse.click(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
await page.waitForTimeout(6000);
await page.screenshot({ path: `${OUT}/02-media-detail.png` });
console.log("captured 02-media-detail.png");

await shot("/collection", "03-collection.png", { settle: 5000 });
await shot("/for-you", "04-for-you.png", { settle: 9000 });

// Wrapped — advance to the Total Hours slide
await shot("/wrapped", "05-wrapped.png", {
  settle: 4000,
  before: async () => {
    await page.getByRole("button", { name: /next/i }).click();
    await page.waitForTimeout(1800);
  },
});

await shot("/analytics", "06-analytics.png", { settle: 5000 });

await browser.close();
console.log("All screenshots written to", OUT);
