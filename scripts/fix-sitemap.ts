// Post-render: tidy sitemap.xml / robots.txt for Search Console.
// Runs on Quarto's bundled Deno, so no extra dependencies are needed.
//
// 1. Quarto lists folder index pages as ".../index.html" in sitemap.xml, but the
//    pages' <link rel="canonical"> points at ".../". Search Console then flags
//    "Duplicate without user-selected canonical". Rewrite them to the folder form.
// 2. Other project sites are served under this domain (separate GitHub Pages
//    repos). Google only reads robots.txt at the domain root, so their own
//    robots.txt files are ignored. Point to their sitemaps from ours, and list
//    pages of projects that have no sitemap directly in ours.

const SITE = "https://suyashnaik.com";

// Project sites that publish their own sitemap.xml (kept up to date by their builds).
const EXTERNAL_SITEMAPS = [`${SITE}/DeskPets/sitemap.xml`];

// Pages of project sites without a sitemap; added to ours.
const EXTRA_URLS = [
  `${SITE}/fitbit-calendar-sync/`,
  `${SITE}/fitbit-calendar-sync/guide.html`,
];

const outDir = Deno.env.get("QUARTO_PROJECT_OUTPUT_DIR") ?? "_site";

function edit(file: string, fn: (text: string) => string) {
  const path = `${outDir}/${file}`;
  let text: string;
  try {
    text = Deno.readTextFileSync(path);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return; // partial render: file not produced
    throw e;
  }
  const updated = fn(text);
  if (updated !== text) Deno.writeTextFileSync(path, updated);
}

edit("sitemap.xml", (xml) => {
  xml = xml.replace(/(<loc>[^<]*\/)index\.html(<\/loc>)/g, "$1$2");
  const missing = EXTRA_URLS.filter((u) => !xml.includes(`<loc>${u}</loc>`));
  const entries = missing.map((u) => `  <url>\n    <loc>${u}</loc>\n  </url>\n`).join("");
  return xml.replace("</urlset>", `${entries}</urlset>`);
});

edit("robots.txt", (txt) => {
  const missing = EXTERNAL_SITEMAPS.filter((u) => !txt.includes(`Sitemap: ${u}`));
  if (missing.length === 0) return txt;
  return txt.trimEnd() + "\n" + missing.map((u) => `Sitemap: ${u}`).join("\n") + "\n";
});
