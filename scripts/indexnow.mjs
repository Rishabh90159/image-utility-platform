// Tells IndexNow search engines (Bing, Yandex, Seznam, Naver; Bing results also feed DuckDuckGo, Yahoo
// and ChatGPT search) that pages were added or changed, so they recrawl them without waiting.
// Google doesn't use IndexNow; use Search Console for Google.
//
// Run after a deploy, never before (the engines fetch the live pages and the key file):
//   npm run indexnow                                  every URL in the live sitemap
//   npm run indexnow -- /tools/resize-jpg /tools/merge-images   only these paths
//
// The key is public by design: IndexNow checks it by fetching /<key>.txt from the site.
const SITE = "https://www.imgifyr.com";
const KEY = "4bed409154729f0d77532494f01753c5";
const ENDPOINT = "https://api.indexnow.org/indexnow";

const paths = process.argv.slice(2);
let urls;
if (paths.length) {
  urls = paths.map((p) => new URL(p, SITE).href);
} else {
  const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
  urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}
urls = urls.filter((u) => new URL(u).origin === SITE);
if (!urls.length) {
  console.error("No URLs to submit.");
  process.exit(1);
}

const keyCheck = await fetch(`${SITE}/${KEY}.txt`);
if (!keyCheck.ok || (await keyCheck.text()).trim() !== KEY) {
  console.error(`The key file ${SITE}/${KEY}.txt isn't live yet (HTTP ${keyCheck.status}). Deploy first.`);
  process.exit(1);
}

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
});
// 200 = accepted, 202 = accepted and key validation pending; anything else is an error.
console.log(`IndexNow: HTTP ${res.status} for ${urls.length} URL${urls.length === 1 ? "" : "s"}`);
if (res.status !== 200 && res.status !== 202) {
  console.error(await res.text());
  process.exit(1);
}
