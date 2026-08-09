# FIBI Design System

FIBI is a place-saving app for travel inspiration. You share a link from TikTok, Instagram, YouTube or
anywhere else; Fibi pulls through a preview, lets you add your own screenshot, name, location and note,
and keeps everything on a map in one calm, algorithm-free place.

The product's own words: **"Organise your travel inspiration. Beautifully. Simply. Calmly."**

## Sources used to build this system

| Source | What it gave us |
| --- | --- |
| `uploads/FIBI Logo.png` | Square logo lockup on deep indigo → `assets/fibi-logo-dark.png` |
| `uploads/Fibi Logo Light.png` | Square logo lockup on white → `assets/fibi-logo-light.png`; also the source for the transparent `fibi-logo-full.png` and `fibi-mark.png` |
| <https://fibi.world> (fetched 9 Aug 2026) | All marketing copy, page structure, product model, `theme-color: #171717`, and the imagery filenames referenced by the marketing UI kit |

**Not available.** No codebase, Figma file, brand book, font files or app screenshots were supplied, and
`/login` + `/signup` are client-rendered behind auth. Colours are sampled from the logo artwork; type,
motion, elevation and the app screens are reasoned from the brand's stated character. Everything inferred
rather than measured is flagged in place.

---

## Content fundamentals

**Voice.** Calm, plain, second person. Fibi talks to *you* about *your* places; it never says "we" except
to describe what the product does for you ("We help you keep it organised"). No hype, no growth-speak, no
exclamation-heavy sales tone in headline copy — though the how-to walkthrough does allow itself a warm
exclamation ("everything is pulled through automatically!").

**Sentence shape.** Short. Often fragments used as a rhythm device: *"Beautifully. Simply. Calmly."*
Marketing sections open with a question the reader already has ("Why Fibi?", "Ready to start saving?") and
answer it in one line. Feature copy leads with the user's problem, not the mechanism: *"That restaurant you
saw on Instagram? That beach from TikTok? Save it before it disappears from your feed."*

**Casing.** Sentence case everywhere — headlines, buttons, labels, nav. No Title Case On Buttons. The
brand name appears two ways in the wild: **FIBI** in the logo mark, wordmark and page title; **Fibi** in
running copy and product UI ("Install Fibi", "Tap the Fibi icon"). Follow that split.

**Spelling.** British: *organise, organised*. (The live site is inconsistent — "organized" appears once in
the How-it-works copy. Prefer the British form in new copy.)

**Numbers and lists.** Numbered steps for anything procedural, each with a short imperative title
("Find something to save", "Tap the Share button") and one explanatory sentence.

**Emoji.** Yes, sparingly, and only as *callout markers* in instructional copy — never in headlines,
buttons, navigation or product chrome. The live site uses exactly four, each opening a tip box:
💡 Tip, 📱 Important, ✨ Auto-preview, and 🎯-style framing is avoided. Do not add new ones.

**Words FIBI uses:** save, place, share, collection, organise, calm, algorithm-free, inspiration, preview.
**Words FIBI avoids:** platform, workflow, supercharge, unlock, seamless, AI-powered, curate, leverage.

**Microcopy examples**
- Empty state: "Nothing saved yet — share a link from TikTok or Instagram and it lands here."
- Confirmation: "Saved to Lisbon" (+ Undo)
- Error: "Couldn't reach that link" (+ Retry) — states the fact, offers the next action, no apology essay.
- Footer: "© 2026 Fibi. Save places before you lose them."

---

## Visual foundations

**Colour.** The whole palette is sampled from the logo, which sweeps **sky blue → orchid → gold** across the
"F", set on a **deep indigo** ground (`#101028`). Sky (`--sky-500`) is the working accent and carries every
primary action; orchid and gold are *accents of the accent* — gold marks saved things, orchid marks visited
ones, and the full three-stop gradient appears at most once per screen (a hero CTA, a collection tile).
Surfaces are plain white over near-white; the neutral ramp is untinted, bottoming out at `#171717` — the
value the live site ships as its `theme-color`. Dark mode swaps white surfaces for the indigo ramp rather
than grey.

**Type.** Geist (variable) for everything, Geist Mono for coordinates and data. Headings are 600 with tight
negative tracking (−0.018em, −0.032em at display size) and short balanced lines; body is 15px/1.55 with
`text-wrap: pretty` and a 640px prose measure. Weight does the emphasis work — 400 and 500 carry most of the
UI, 600 is reserved for headings. No italics, no all-caps except the 12px eyebrow at 0.11em tracking.

**Layout.** 1120px max container, 32px desktop / 20px mobile gutters, 96px between marketing sections. The
app is a 390px column with a 56px top bar and a 64px bottom tab bar, both sticky and frosted. Content sits
on a 4px spacing rhythm above 8px. Fixed elements are limited to those two bars plus the map's floating
search pill — everything else scrolls.

**Backgrounds.** Predominantly flat white or `--neutral-50`. Photography is the user's own screenshots, so
the system never assumes an image exists: the fallback is `--gradient-brand-soft`, a near-pastel wash of the
same three brand stops, with a pin glyph — never a grey box. One reusable atmospheric treatment exists,
`--wash-aurora`: three very low-opacity radial gradients (sky top-left, orchid top-right, gold bottom-right)
behind hero areas only. No repeating patterns, no textures, no grain, no hand-drawn illustration.

**Imagery vibe.** Cool and bright — sky-leaning daylight, the gold used as a warm counterpoint rather than a
grade. Map tiles are desaturated (~45%) and slightly lightened so pins read first. No black-and-white, no
heavy filters.

**Corner radii.** 6 / 8 / 12 / 16 / 22 / 28 / 36 / full. Controls are 12px, cards 22px, bottom sheets 28px,
media 16px; buttons, chips, tags and search are fully rounded. The rounding is generous but never bubbly —
a 22px card at 320px wide reads soft, not toy-like.

**Cards.** White surface, 1px `--border-subtle` hairline, 22px radius, and a whisper shadow
(`--shadow-sm`). Border *and* shadow together — neither alone. Interactive cards lift 2px and step to
`--shadow-lg` on hover; their media scales 1.03 inside the clipped corner. Never stack two elevated cards.

**Shadows.** All shadows are indigo-tinted (`rgba(16,16,40,…)`), wide, and soft — never black, never tight.
Five steps from `--shadow-xs` to `--shadow-xl`, plus `--shadow-pin`, a coloured sky glow used only under map
pins. There is one inset shadow (`--shadow-inset`) and it is rare.

**Borders.** 1px hairlines at `--neutral-200`; 1.5px only on radio rings. Dividers are the same hairline, run
edge-to-edge inside cards, and never appear as decorative rules between sections — whitespace separates
sections instead.

**Transparency and blur.** Glass is functional, not decorative: the sticky top bar, the bottom tab bar, the
source pill over a place image, and icon buttons floating over the map or photography — anything that sits
*on top of content that scrolls beneath it*. `--surface-glass` (72% white) with
`saturate(160%) blur(18px)`. Modal scrims are indigo at 48% with a light 3px blur. Solid backgrounds
everywhere else.

**Protection.** Text over imagery gets a gradient scrim (`--scrim-bottom` / `--scrim-top`, indigo-based),
never a solid capsule. Small labels over maps use the glass capsule instead, because a scrim would fight
the tiles.

**Motion.** Quick and decelerating. 130ms for hover and focus, 190ms for toggles and toasts, 280ms for
sheets and dialogs, 420ms for route changes. Two curves only: `--ease-standard` for state, `--ease-out`
(`cubic-bezier(.16,1,.3,1)`) for anything entering. Dialogs fade + rise 8px and scale from 0.98; sheets
translate up from 100%. **Nothing bounces, nothing overshoots, nothing loops.** All durations collapse to 0
under `prefers-reduced-motion`.

**Hover states.** Filled buttons step one stop darker on the ramp (`--accent` → `--accent-hover`); the
gradient button uses `brightness(1.04)` because a gradient has no next stop; ghost and secondary controls
gain a background tint rather than changing text colour; cards lift. Never opacity-fade a control on hover.

**Press states.** `transform: scale(0.985)` — a barely-there compress — plus the active ramp stop on filled
controls. No ripples.

**Focus.** A 3px sky ring at 38% (`--focus-ring`) plus a `--border-brand` border on inputs. Always visible,
never removed.

---

## Iconography

FIBI ships no proprietary icon set, no icon font and no SVG sprite — none exists in the supplied material,
and none has been invented. The system uses **Lucide** (`https://unpkg.com/lucide@0.454.0`), wrapped by the
`Icon` component. **This is a substitution and should be confirmed:** Lucide was chosen because its light,
open, rounded-cap stroke matches the calm register of the brand and the Next.js/Tailwind stack the live
site appears to be built on. If FIBI already uses a different set, swap it inside `Icon.jsx` — nothing else
references icons directly.

- **Stroke** 1.75px default (Lucide ships 2px — we lighten it), round caps and joins, no filled glyphs.
- **Sizes** 14 (inline meta), 16 (inside buttons), 18–20 (icon buttons, tab bar), 26+ (empty states).
- **Colour** inherits `currentColor`; icons are `--text-tertiary` at rest and take the accent only when their
  control is active.
- **The one hand-drawn shape** in the system is the map pin used by `PinMarker` and `PlaceCard`, because it
  echoes the dropped pin in the logo mark. Everything else comes from Lucide.
- **Emoji** are content, not iconography — see Content fundamentals. Never use an emoji where an icon
  belongs, and never use a unicode character (→, ×, ▾) as a decorative icon; the only exceptions are the
  `×` in dismissible tags and the `▾` in `Select`, both of which are control glyphs.
- **Brand marks** for TikTok / Instagram / YouTube are **not** included — third-party trademarks were not
  supplied. `PlaceCard` shows a coloured dot plus the platform name instead. Add the official marks if you
  have licence to.

---

## Font substitution — please confirm

No font files were provided. The live site is served by Next.js with `next/font` and a `#171717`
foreground, which is the create-next-app default pairing, so this system standardises on **Geist** and
**Geist Mono**, loaded from Google Fonts. If FIBI's real typeface is something else, send the files and
this is a one-file change (`tokens/fonts.css`).

---

## Intentional additions

Nothing in the supplied material enumerates a component inventory, so this is an authored set. Beyond the
standard primitives, five components exist because the product demands them:

- **Icon** — wrapper so the icon library can be swapped in one place.
- **Logo** — guarantees the supplied artwork is used rather than redrawn.
- **PlaceCard, PinMarker, CollectionTile, MapSurface** — a saved place, its pin, its collection and the map
  they sit on are FIBI's actual subject matter.
- **SearchField, TabBar, TopBar, EmptyState, Field** — app-shell pieces the screens allshare.

---

## Index

**Root**
- `styles.css` — the single entry point consumers link. Imports only.
- `readme.md` — this file. `SKILL.md` — Agent Skills wrapper.
- `thumbnail.html` — homepage tile.

**`tokens/`** — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `radius.css`,
`elevation.css`, `motion.css`, `base.css`.

**`assets/`** — `fibi-logo-dark.png`, `fibi-logo-light.png` (original square lockups),
`fibi-logo-full.png` (transparent, glyph + wordmark), `fibi-mark.png` (transparent, glyph only).

**`guidelines/`** — 20 specimen cards: colour ramps (Sky, Orchid, Gold, Indigo ground, Neutrals, Status,
Gradients, Semantic aliases), type (Families, Display & headings, Body & small, Weights & tracking),
spacing (Space scale, Layout & controls, Radius, Elevation), Motion, and Brand (Logo lockups, Pin motif,
Voice).

**`components/`** — 23 components in five groups, each with `.jsx`, `.d.ts` and `.prompt.md`:
- `core/` — **Button**, **IconButton**, **Icon**, **Logo**, **Card**, **Badge**, **Tag**
- `forms/` — **Field**, **Input**, **Textarea**, **Select**, **Checkbox**, **Radio**, **Switch**, **SearchField**
- `feedback/` — **Dialog**, **Toast**, **Tooltip**, **EmptyState**
- `navigation/` — **Tabs**, **TopBar**, **TabBar**
- `places/` — **PlaceCard**, **PinMarker**, **CollectionTile**, **MapSurface**

**`ui_kits/`**
- `marketing/` — fibi.world homepage recreation (copy verbatim, visuals interpreted). See its README.
- `app/` — Fibi app screens (interpretation, not recreation — no source was available). See its README.
