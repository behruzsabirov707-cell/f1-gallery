---
title: Aivora "top 1%" design escalation — Operator direction
date: 2026-07-05
status: approved
---

# Aivora "top 1%" design escalation

## Context

After 7 incremental UX fixes (services grid, hero spacing, real portfolio content,
contact/telegram merge, brand eyebrow treatment, uz wording, contrast), the user
asked for a further push: "nimadir kamlik qilyapti... designni top 1% ga olib
chiqishimiz kerak." The current visual system (near-black background + purple→blue
gradient accent, generic outline icons) matches one of the well-known "AI-generated
design" defaults (near-black bg + single bright accent), regardless of subject
matter. The request explicitly allows 3D or animation as tools, but the goal is
distinctiveness, not motion for its own sake — bolting effects onto a generic base
makes it read as more AI-generated, not less.

Direction chosen and confirmed with the user: ground the redesign in what Aivora
actually builds — Telegram-first automation, AI agents, finance bots, and reports
for Uzbek SMBs — via a "live operations console" visual metaphor, rather than
generic AI-gradient decoration.

## Goals

- Replace the generic near-black + blue-purple-gradient signature with a palette
  and motif tied to Aivora's real product: automated pipelines (message → agent →
  action → result).
- Add one signature moment (hero pipeline visualization) that the site is
  remembered by, rather than scattering effects across sections.
- Fix an existing inconsistency: `WhyUs` uses "01/02/03" numbering copied from
  `ProcessTimeline`, but its 3 points aren't an ordered sequence — the numbering
  there is decorative mimicry, not information encoding.
- Preserve the accessibility/quality floor already established this session:
  AA/AAA contrast, `prefers-reduced-motion` guards, keyboard focus, mobile
  responsiveness, i18n structure (uz/ru/en dictionaries must stay in sync).

## Non-goals

- No 3D (WebGL/three.js). Rejected per advisor review: 3D orbs/meshes on an AI
  agency site are themselves a cliché, and carry real bundle-size/perf/SSR cost
  disproportionate to Aivora's needs (a marketing site, not a product demo).
  Restrained, purposeful 2D motion achieves the "top 1%" goal without that cost.
- No rewrite of copy, information architecture, or page order — this is a visual
  system escalation, not a content/IA redesign.
- No new sections. The hero signature reuses existing structure (`Hero.tsx`); it
  does not add a new "how it works" section duplicating `ProcessTimeline`.

## Design system (tokens)

Color (`app/globals.css` `@theme` block), replacing the current
brand-from/brand-to purple→blue gradient tokens:

| Token | Value | Role |
|---|---|---|
| `--color-bg` | `#0a0c0f` | Base background — cooler, neutral graphite-black (vs. current violet-tinted black) |
| `--color-bg-elevated` | `#12161a` | Card/panel surfaces |
| `--color-border` | `#20262c` | Hairlines, card borders (re-tuned to sit correctly against new bg) |
| `--color-signal` | `#ff9d42` | The one bright accent — an "active process" amber, as used in real ops/monitoring dashboards, standing in place of the old blue-purple gradient |
| `--color-signal-soft` | `#ff9d42` at low alpha (e.g. `/15`, `/30`) | Signal glows, hover backgrounds — reuses `--color-signal`, no new hex |
| `--color-wire` | `#3d5a80` | Muted steel-blue for connector lines/paths in the pipeline motif and section dividers |
| `--color-ink` | `#eef1f4` | Primary text |
| `--color-ink-muted` | re-measured against new `--color-bg`/`--color-bg-elevated` to hold ≥7:1 (same methodology as the prior contrast fix) | Secondary text |

Typography — adds a third role, keeps the two existing ones:

- Display (unchanged): Lora, italic, brand-color accent — used exactly as today
  for eyebrows and the hero's accented word. This is already distinctive and
  earns its keep; not being replaced.
- Body (unchanged): Inter.
- **New** utility/data face: IBM Plex Mono — used only for pipeline node labels,
  timestamps, and numeric metrics (Portfolio stat values, TrustSignals numbers,
  ProcessTimeline step numbers). Functional, not decorative: it signals "this is
  a real system reading out data," consistent with the operations-console
  motif. Loaded via `next/font` alongside the existing Inter/Lora setup.

Layout / signature element:

- **Hero**: replaces the current floating icon chips with a 4-node pipeline,
  horizontal on `sm:` and above, stacked vertically on mobile:
  `Xabar → AI tahlili → Avtomatlashtirilgan harakat → Natija`. Nodes connect via
  a `--color-wire` path. A small dot in `--color-signal` travels the path on a
  ~5s loop; each node's border/glow briefly activates in `--color-signal` as the
  dot passes it. Node micro-labels use the new mono face.
  - `prefers-reduced-motion: reduce` fallback: no travel animation; all nodes
    render in their "active" (lit) state statically. This follows the same
    guard pattern already used for `hero-glow-drift`/`hero-chip-float`.
- **ProcessTimeline**: keeps its "01/02/03..." numbering (legitimate here — it's
  a real ordered sequence) but the numbers switch to the new mono face, and a
  thin `--color-wire` connector is added between steps to echo the hero motif.
- **WhyUs**: drops the "01/02/03" numbering (its 3 points are not ordered) in
  favor of a small icon badge per point, matching the existing `ServiceCard`
  icon-badge treatment (asymmetric corner-radius, brand-color icon) for visual
  consistency with the rest of the site.
- **Portfolio / TrustSignals metrics**: numeric values switch from the
  italic-serif treatment to the new mono face, reinforcing the "data readout"
  feel established by the hero signature.
- All existing gradient utility classes referencing
  `--color-brand-from`/`--color-brand-to` (in `ServiceCard`, `ServicesCtaCard`,
  `Portfolio` flagship card, `Hero`'s glow) are updated to the new
  `--color-signal`/`--color-wire` tokens so the whole site reads as one system,
  not just the hero.

## Rejected alternatives (self-critique)

- **3D hero (three.js/WebGL agent avatar or particle field)** — rejected: cliché
  on AI-agency sites specifically, adds real bundle/perf/SSR cost, and doesn't
  ground itself in Aivora's actual product the way a literal pipeline does.
- **Green "matrix code rain" or neon acid-green accent** — rejected: this is
  itself one of the three recognized AI-generated-design defaults (near-black +
  neon accent), the same failure mode as the current site, just a different hue.
- **Keeping the current purple→blue gradient, only adding motion** — rejected
  per advisor review: motion on top of an already-generic base amplifies the
  "generic AI startup" read rather than fixing it.

## Testing / verification plan

- `npx tsc --noEmit` after all component edits.
- Contrast re-check for `--color-ink-muted` against both new `--color-bg` and
  `--color-bg-elevated`, same Python/WCAG method used for the prior contrast
  fix, targeting ≥7:1.
- Playwright viewport screenshots (not `fullPage`, per this session's established
  methodology — full-page capture fires before `whileInView` reveals trigger)
  of: Hero (default + after `scrollIntoView` to Services/WhyUs/Process/
  Portfolio/TrustSignals), at both desktop and a mobile viewport width, to
  confirm the pipeline animates, the mobile stacked layout doesn't overflow,
  and no section regresses visually.
- Manually toggle `prefers-reduced-motion` (via Playwright `emulateMedia` or
  CSS media override) and confirm the hero pipeline renders in its static lit
  state with no motion.
- Re-verify all three locales (uz/ru/en) still build — this change touches no
  dictionary strings, only visual tokens/components, so no i18n content changes
  are expected, but the `DeepStringify` structural check via `tsc` will catch
  any accidental drift.

## Rollout order

Build and self-critique the hero signature first in isolation (it's the
highest-risk, highest-payoff piece), screenshot it, then propagate the token
system (color/mono face) to the rest of the site (ServiceCard, ServicesCtaCard,
Portfolio, ProcessTimeline, WhyUs, TrustSignals) once the hero direction is
confirmed to work.
