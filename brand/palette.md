# OpenHospitalCost — Brand Basics (Color + Type)

Color + type reference for brand assets. Load `openhospitalcost.ase` into Illustrator (instructions at bottom). Color source of truth is [build-palette.mjs](build-palette.mjs) — edit + re-run to regenerate the `.ase`.

## Swatches

| Name | Hex | Role |
|---|---|---|
| Ink | `#13283A` | Body text, wordmark — deep slate-navy (not pure black) |
| Paper | `#FAF9F6` | Page background — warm off-white |
| Surface | `#FFFFFF` | Cards / price tables (lift off paper) |
| Primary Teal | `#1A6B7A` | Links, primary buttons, wordmark accent |
| Link Teal | `#12545F` | Inline text links (darker, for AA contrast on paper) |
| Savings Green | `#147A52` | "Lower / you save" signal — **data only** |
| Higher Red | `#B4433A` | "Higher / increase" signal — **data only** |
| Border | `#E5E3DD` | Table rules, dividers, hairlines |
| Muted Text | `#5B6670` | Captions, "sourced from… [date]" provenance |
| Navy (alt primary) | `#1B3A5B` | Optional swap for Primary Teal → more institutional |

## Usage discipline

- **~90% neutral** (ink on paper, gray hairlines). The numbers carry the page — "data is the product, not the interface."
- **Accent (teal) sparingly** — links, one CTA, the wordmark. If everything's teal, nothing is.
- **Green/red ONLY in price data** (savings, deltas, "↑23% since Jan") — never decoration. Keeps the brand calm and makes the semantic colors mean something.
- **Accessibility:** always pair red/green with an arrow or label (≈8% of men can't distinguish them by color). Aim WCAG AA contrast; use *Link Teal* for text links, *Primary Teal* for buttons/fills.

## Typography — Direction B ("Trust / editorial") — LOCKED

| Use | Font | Weight |
|---|---|---|
| **Wordmark / logo** | **Source Serif Pro** | Bold (700) — audition SemiBold 600 if 700 feels heavy at logo size; **never** Black 900 (uneven at large sizes) |
| **Headlines** | **Source Serif Pro** | SemiBold (600) / Bold (700) |
| **Body / UI / tables** | **Inter** | Regular (400) + SemiBold (600) |
| **Prices / numbers** | **IBM Plex Mono** | Medium (500) — monospaced, so dollar figures align column-to-column and read as precise "real data" |

Source Serif headlines + Inter body = the editorial, public-interest authority that differentiates from generic SaaS-sans competitors; Plex Mono on the numbers reinforces "this is sourced data."

Body sans note: keep `font-variant-numeric: tabular-nums` on Inter too, for any inline figures not set in Plex Mono.

**Weight discipline:** ship only the 5 weights above. Fewer weights = faster pages (matters for the SEO that drives your traffic).

**Logo production:** once the wordmark looks right, **Type → Create Outlines** (⇧⌘O) so the logo is font-independent forever; keep an editable (pre-outline) copy too. Consider weight/color contrast within the name for hierarchy (e.g. "Open" lighter, **"HospitalCost"** bolder).

**Where to get them:** Source Serif Pro, Inter, and IBM Plex Sans/Mono are all on **Adobe Fonts** (Type → More from Adobe Fonts) and free on **Google Fonts** (download → Font Book) as a fallback.

## Loading the .ase in Illustrator

1. **Window → Swatches** to open the Swatches panel.
2. Panel menu (top-right) → **Open Swatch Library → Other Library…**
3. Select `brand/openhospitalcost.ase`. It opens as a library panel named "OpenHospitalCost."
4. Click any swatch there to add it to the current document's Swatches.

(For the website later, these same hexes go into the Tailwind/CSS theme — the `.ase` is just for design tools.)
