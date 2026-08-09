# UI kit — fibi.world (marketing site)

Recreation of the FIBI marketing homepage at <https://www.fibi.world>.

**Source & fidelity.** All copy is lifted verbatim from the live page (fetched 9 Aug 2026): headline,
sub-headline, the three "How it works" steps, the four-step share walkthrough including its emoji tips,
the "Why Fibi?" trio, the final CTA and the footer line. The *visual* treatment is FIBI's design-system
interpretation — the site's stylesheet and component source were not available, so spacing, type ramp and
colour come from this system's tokens rather than measured from production. Treat layout as directional,
copy as ground truth.

**Imagery** hotlinks the live site's assets (`hero-image.png`, `1.png`, `2.png`, `3.png`). Copy them into
`assets/` for offline use; each `Shot` falls back to the soft brand wash if a file is missing.

## Files
- `index.html` — the full page, plus the sign-in dialog (click "Sign in" or "Get started").
- `Sections.jsx` — `SiteHeader`, `Hero`, `HowItWorks`, `ShareSteps`, `WhyFibi`, `FinalCTA`, `SiteFooter`, `Shot`.

## Not recreated
The embedded product video (`FiBi__Save_Places copy.mp4`), the `unnamed.png` guide graphic and the
`Fibi.world.png` journey diagram — no local copies were supplied.
