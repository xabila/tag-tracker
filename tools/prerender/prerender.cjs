#!/usr/bin/env node
/*
 * Prerender the TagTrack marketing home (EN + FR/ES/PT/DE) into static HTML.
 *
 * Why: the home is a client-side React app (assets/index-*.js). Crawlers that
 * do not run JavaScript (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot...)
 * only saw the placeholder inside #root. This script loads each home page in
 * headless Chrome, waits for React + js/site.js (pricing block) to render,
 * and writes the rendered #root markup back into the HTML file.
 *
 * The app boots with createRoot().render(), which clears #root and renders
 * from scratch, so the snapshot is simply replaced on load (no hydration).
 * Top-level snapshot nodes carry data-tt-prerender so js/site.js waits for
 * React before mounting the pricing block.
 *
 * Re-run after every new app bundle or copy change:
 *   cd tools/prerender && npm install && node prerender.cjs
 * Idempotent: running it twice gives the same files.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const SITE = path.resolve(__dirname, "../..");
const PAGES = ["index.html", "fr/index.html", "es/index.html", "pt/index.html", "de/index.html"];
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".json": "application/json", ".txt": "text/plain", ".mp4": "video/mp4", ".webm": "video/webm", ".webmanifest": "application/manifest+json" };
const ROOT_RE = /(<div id="root">)([\s\S]*?)(<\/div>\s*(?:<link[^>]*>\s*)?(?:<script[^>]*><\/script>\s*)?<\/body>)/;

function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(SITE, p);
    if (!file.startsWith(SITE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r(server)));
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--no-sandbox", "--lang=en-US"] });
  let failed = false;
  for (const page of PAGES) {
    const url = base + "/" + page.replace(/index\.html$/, "");
    const tab = await browser.newPage();
    const errors = [];
    tab.on("pageerror", (e) => errors.push(e.message));
    // Same language for every run: the EN root must render in English.
    await tab.evaluateOnNewDocument(() => { Object.defineProperty(navigator, "language", { get: () => "en-US" }); });
    // Do not send analytics hits from the build.
    await tab.setRequestInterception(true);
    tab.on("request", (r) => (/googletagmanager|google-analytics|posthog/.test(r.url()) ? r.abort() : r.continue()));
    await tab.setViewport({ width: 1440, height: 900 });
    await tab.goto(url, { waitUntil: "networkidle0" });
    await tab.waitForFunction(() => !document.querySelector("#root [data-tt-prerender]") && document.getElementById("faq") && document.getElementById("pricing"), { timeout: 15000 });
    // Scroll once so on-scroll reveals are in their final state.
    await tab.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
    await new Promise((r) => setTimeout(r, 800));
    const markup = await tab.evaluate(() => {
      const root = document.getElementById("root").cloneNode(true);
      root.querySelectorAll("[data-tt-store]").forEach((n) => n.removeAttribute("data-tt-store"));
      // The app emits relative links (compare.html, blog.html...). On /fr/ etc.
      // they resolve to /fr/compare.html, which does not exist: make them
      // root-relative in the snapshot so crawlers do not follow 404 links.
      root.querySelectorAll("a[href]").forEach((a) => {
        const href = a.getAttribute("href");
        if (!/^(?:[a-z]+:|\/|#)/i.test(href)) a.setAttribute("href", "/" + href);
      });
      [...root.children].forEach((n) => n.setAttribute("data-tt-prerender", ""));
      return root.innerHTML;
    });
    await tab.close();
    if (errors.length || markup.length < 20000) { console.error(`✗ ${page}: ${errors.join(" | ") || "markup too short"}`); failed = true; continue; }
    const file = path.join(SITE, page);
    const src = fs.readFileSync(file, "utf8");
    if (!ROOT_RE.test(src)) { console.error(`✗ ${page}: #root not found`); failed = true; continue; }
    const comment = "\n      <!-- Prerendered by tools/prerender/prerender.cjs so crawlers without JavaScript read the full page. React replaces it on boot. -->\n      ";
    const out = src.replace(ROOT_RE, (_, open, __, close) => open + comment + markup + "\n    " + close);
    fs.writeFileSync(file, out);
    console.log(`✓ ${page}: ${markup.length} bytes of prerendered markup`);
  }
  await browser.close();
  server.close();
  process.exit(failed ? 1 : 0);
})();
