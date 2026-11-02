// Fetches class/spec icons and character portraits from the Blizzard API
// and writes their URLs to media.json. Images stay on Blizzard's servers.
// Env: BNET_CLIENT_ID, BNET_CLIENT_SECRET. Node 20+ (global fetch).
import { readFile, writeFile } from "node:fs/promises";

const ROSTER_FILE = "roster.json";
const MEDIA_FILE = "media.json";
const TOKEN_URL = "https://oauth.battle.net/token";
const LOCALE = "en_US";
const HTTP_OK = 200;
const PORTRAIT_KEYS = ["avatar", "inset", "main-raw", "main"];

// Our spec names → Blizzard's current spec names, where they differ.
const SPEC_ALIASES = {
  "Druid/Feral (Bear)": "Druid/Guardian",
  "Druid/Feral (Cat)": "Druid/Feral",
  "Rogue/Combat": "Rogue/Outlaw",
};

// Tried in order for character lookups when roster.json sets no profileNamespace.
// WoW Forever's namespace is unconfirmed; set it in roster.json once known.
const PROFILE_NAMESPACE_CANDIDATES = (region) => [
  `profile-classic1x-${region}`,
  `profile-classic-${region}`,
  `profile-${region}`,
];

const { BNET_CLIENT_ID, BNET_CLIENT_SECRET } = process.env;
if (!BNET_CLIENT_ID || !BNET_CLIENT_SECRET) {
  console.error("Missing BNET_CLIENT_ID / BNET_CLIENT_SECRET.");
  process.exit(1);
}

const roster = JSON.parse(await readFile(ROSTER_FILE, "utf8"));
const cfg = roster.guild.api || {};
const region = cfg.region || "us";
const apiBase = `https://${region}.api.blizzard.com`;
const staticNs = `static-${region}`;

const previous = await readFile(MEDIA_FILE, "utf8").then(JSON.parse).catch(() => ({}));
const media = { classes: {}, specs: {}, characters: {}, notes: [] };

async function getToken() {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${BNET_CLIENT_ID}:${BNET_CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (res.status !== HTTP_OK) throw new Error(`Token request failed: HTTP ${res.status}`);
  return (await res.json()).access_token;
}

const token = await getToken();

async function api(path, namespace) {
  const url = `${apiBase}${path}?namespace=${namespace}&locale=${LOCALE}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status !== HTTP_OK) return { error: res.status };
  return res.json();
}

const asset = (m, keys) => {
  const assets = m?.assets || [];
  for (const k of keys) {
    const a = assets.find((x) => x.key === k);
    if (a) return a.value;
  }
  return null;
};

// Class + spec icons
const wanted = new Set(roster.members.map((m) => m.cls));
const classIndex = await api("/data/wow/playable-class/index", staticNs);
if (classIndex.error) media.notes.push(`Class index failed: HTTP ${classIndex.error}`);
for (const c of classIndex.classes || []) {
  if (!wanted.has(c.name)) continue;
  const cm = await api(`/data/wow/media/playable-class/${c.id}`, staticNs);
  const icon = asset(cm, ["icon"]);
  if (icon) media.classes[c.name] = icon;
  const detail = await api(`/data/wow/playable-class/${c.id}`, staticNs);
  for (const s of detail.specializations || []) {
    const sm = await api(`/data/wow/media/playable-specialization/${s.id}`, staticNs);
    const sIcon = asset(sm, ["icon"]);
    if (sIcon) media.specs[`${c.name}/${s.name}`] = sIcon;
  }
}
for (const [ours, theirs] of Object.entries(SPEC_ALIASES)) {
  if (media.specs[theirs]) media.specs[ours] = media.specs[theirs];
}

// Character portraits (need realm slug + in-game name)
const realm = (cfg.realmSlug || "").trim();
const namespaces = cfg.profileNamespace ? [cfg.profileNamespace] : PROFILE_NAMESPACE_CANDIDATES(region);
if (!realm) media.notes.push("No realmSlug in roster.json; skipped character portraits.");
for (const m of roster.members) {
  if (!realm || !m.ign) continue;
  const name = encodeURIComponent(m.ign.toLowerCase());
  let found = null;
  for (const ns of namespaces) {
    const cm = await api(`/profile/wow/character/${realm}/${name}/character-media`, ns);
    if (cm.error) continue;
    const entry = {};
    for (const k of PORTRAIT_KEYS) {
      const v = asset(cm, [k]) || cm[`${k.replace("-raw", "")}_url`];
      if (v) entry[k] = v;
    }
    if (Object.keys(entry).length) { found = { ...entry, namespace: ns }; break; }
  }
  if (found) media.characters[m.id] = found;
  else media.notes.push(`No portrait for ${m.ign}`);
}

// Keep old portraits if the API is temporarily unavailable.
for (const [id, v] of Object.entries(previous.characters || {})) {
  if (!media.characters[id] && roster.members.some((m) => m.id === id)) media.characters[id] = v;
}

const strip = ({ notes, updated, ...rest }) => rest;
if (JSON.stringify(strip(previous)) === JSON.stringify(strip(media))) {
  console.log("No media changes.");
} else {
  media.updated = new Date().toISOString();
  await writeFile(MEDIA_FILE, JSON.stringify(media, null, 2) + "\n");
  console.log("media.json updated.");
}
console.log(`Classes: ${Object.keys(media.classes).length}, specs: ${Object.keys(media.specs).length}, portraits: ${Object.keys(media.characters).length}`);
for (const n of media.notes) console.log("note:", n);
