# FULL CIRCLE guild site

Static site: `index.html` renders `roster.json`. No build step.

## Setup (once, ~10 min)

1. Repo: `fraczles/fullcircle`.
2. Files are in place.
3. `GITHUB_REPO` in `index.html` is set to `fraczles/fullcircle`.
4. Repo **Settings → Pages**: Source = `main` branch, `/ (root)`. Site goes live at `https://fraczles.github.io/fullcircle/`.
5. **Settings → Collaborators**: add each officer's GitHub account.

## Custom domain (e.g. fullcircleguild.com)

1. Buy the domain (Porkbun, Namecheap, etc.).
2. At the registrar, add DNS records:
   - `A` records for `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` for `www` → `fraczles.github.io`
3. Repo **Settings → Pages → Custom domain**: enter the domain, then tick **Enforce HTTPS** once offered.

## Editing the roster (officers)

Click **Edit roster** on the site (or open `roster.json` on GitHub → pencil icon), change, **Commit**. Site updates in ~1 minute.

Member fields:

| Field | Values |
|---|---|
| `ign` | In-game name, `""` if unknown |
| `discord` | Discord name |
| `cls` | Druid, Hunter, Mage, Paladin, Priest, Rogue, Shaman, Warlock, Warrior |
| `race` | Human, Dwarf, Night Elf, Gnome, Skyborne, or `""` |
| `spec`, `spec2` | Spec name; `spec2` = dual spec or `""` |
| `role` | `TANK`, `HEALER`, `MELEE`, `RANGED` |
| `profs` | e.g. `[{"n": "Alchemy", "s": 300}, {"n": "Herbalism", "s": 300}]` |
| `rank` | Guild Master, Officer, Raider, Member, Trial, Alt |
| `status` | Raider, Bench, Tentative |
| `verified` | `true` once spec is confirmed (removes the `?`) |
| `note` | Free text |

Invalid JSON (missing comma, quote) breaks the page; GitHub's editor flags most mistakes.
