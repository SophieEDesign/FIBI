# UI kit — Fibi app

The saving surface: places, map, the add-a-place flow, place detail and settings, inside an iPhone frame.

**Fidelity warning.** The Fibi app sits behind authentication at fibi.world and no source, Figma file or
screenshots were supplied — so unlike the marketing kit, these screens are an *interpretation*, not a
recreation. They are built strictly from what the marketing site states the product does (share from any
app → auto-pulled preview → add screenshot, name, location → find it later on a map, algorithm-free) and
from this design system's tokens and components. **Replace them with real recreations as soon as app
source or Figma access is available.**

Interactions that work: tab bar (Places / Map / Add / You), search filter, tapping a place opens detail,
map pins select, the two-step add sheet appends a place and fires a toast.

## Files
- `index.html` — click-through demo.
- `Screens.jsx` — `FibiApp` shell plus `PlacesScreen`, `MapScreen`, `DetailScreen`, `YouScreen`, `AddSheet`.
- `ios-frame.jsx` — device bezel only; not part of the design system.

## Placeholders
Place imagery falls back to the soft brand wash — no product screenshots were provided. Map tiles come
from OpenStreetMap via `MapSurface`; the production tile provider is unknown.
