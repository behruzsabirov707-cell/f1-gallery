# Aivora "top 1%" redesign (Operator direction) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic near-black + purple→blue-gradient visual system with an "operations console" system (amber signal + steel-blue wire + a functional mono type role) grounded in Aivora's real product (automated pipelines), anchored by a new animated pipeline signature in the hero.

**Architecture:** Token-first: update the `@theme` CSS custom properties in `app/globals.css` and add a third font role in `app/[lang]/layout.tsx`, then update each component that currently references the old `--color-brand-from`/`--color-brand-to` tokens or the old numbered-marker treatment to use the new tokens. The hero gets one new component (`components/home/HeroPipeline.tsx`) driven by CSS keyframes (no new JS animation library — this project already uses framer-motion for reveals and plain CSS keyframes for the existing `hero-glow`/`hero-chip` effects; the pipeline follows the same CSS-keyframe pattern for consistency and to keep bundle size flat).

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4 (`@theme` tokens, arbitrary-value syntax `bg-(--color-x)`), framer-motion (reveals only), `next/font/google` (Inter, Lora, + new IBM Plex Mono), lucide-react icons, TypeScript.

## Global Constraints

- No 3D/WebGL. No new npm dependencies beyond the `IBM_Plex_Mono` export already bundled in `next/font/google` (no `package.json` change needed).
- Every new/changed animation must be guarded by `@media (prefers-reduced-motion: no-preference)`, matching the existing `hero-glow-drift`/`hero-chip-float` pattern in `app/globals.css:31-61`.
- `--color-ink-muted` must hold contrast ≥7:1 against both `--color-bg` and `--color-bg-elevated` (WCAG relative-luminance formula — see Task 1 verification).
- Do not change any dictionary copy/strings in `i18n/dictionaries/*` — this is a visual-token and component-structure change only. The one exception is Task 5, which needs no copy change either (icons are keyed by array index, not new strings).
- `npx tsc --noEmit` must pass after every task.
- All Playwright verification must use viewport screenshots after `scrollIntoView({behavior:'instant'})`, never `fullPage: true` (established this session: `fullPage` fires before framer-motion `whileInView` reveals trigger, producing false-blank screenshots).

---

### Task 1: Update color tokens + add mono font role

**Files:**
- Modify: `app/globals.css:1-14`
- Modify: `app/[lang]/layout.tsx:1-19,50-54`

**Interfaces:**
- Produces: CSS custom properties `--color-signal`, `--color-wire`, updated `--color-bg`, `--color-bg-elevated`, `--color-border`, `--color-ink`, `--color-ink-muted`, and new `--font-mono` (mapped to `--font-plex-mono`). All later tasks consume these by name.
- Removes: `--color-brand-from`, `--color-brand-to` (all consumers updated in Tasks 3-6 in this same plan — no dangling references should remain after Task 6).

- [ ] **Step 1: Update the `@theme` block in `app/globals.css`**

Replace lines 3-14:

```css
@theme {
  --color-brand-from: #6d4ae8;
  --color-brand-to: #3fa0f5;
  --color-bg: #08080c;
  --color-bg-elevated: #111118;
  --color-border: #22222c;
  --color-ink: #f5f5f7;
  --color-ink-muted: #b3b3c2;

  --font-sans: var(--font-inter);
  --font-display: var(--font-lora);
}
```

with:

```css
@theme {
  --color-signal: #ff9d42;
  --color-wire: #3d5a80;
  --color-bg: #0a0c0f;
  --color-bg-elevated: #12161a;
  --color-border: #20262c;
  --color-ink: #eef1f4;
  --color-ink-muted: #a3aab3;

  --font-sans: var(--font-inter);
  --font-display: var(--font-lora);
  --font-mono: var(--font-plex-mono);
}
```

- [ ] **Step 2: Verify contrast of the new `--color-ink-muted` against both backgrounds**

Run:

```bash
python3 << 'PYEOF'
def lum(hex_color):
    hex_color = hex_color.lstrip('#')
    r,g,b = int(hex_color[0:2],16)/255, int(hex_color[2:4],16)/255, int(hex_color[4:6],16)/255
    def lin(c):
        return c/12.92 if c <= 0.03928 else ((c+0.055)/1.055)**2.4
    r,g,b = lin(r), lin(g), lin(b)
    return 0.2126*r + 0.7152*g + 0.0722*b

def contrast(c1, c2):
    l1, l2 = lum(c1), lum(c2)
    l1, l2 = max(l1,l2), min(l1,l2)
    return (l1+0.05)/(l2+0.05)

print("ink-muted vs bg:", round(contrast("#a3aab3","#0a0c0f"),2))
print("ink-muted vs bg-elevated:", round(contrast("#a3aab3","#12161a"),2))
PYEOF
```

Expected: both values ≥ 7.0 (actual: 8.35 and 7.75).

- [ ] **Step 3: Add IBM Plex Mono in `app/[lang]/layout.tsx`**

Replace the import on line 2:

```tsx
import { Inter, Lora, IBM_Plex_Mono } from "next/font/google";
```

Add after the `lora` declaration (after line 19):

```tsx
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});
```

Update the `<html>` className on line 53 to include the new variable:

```tsx
      className={`${inter.variable} ${lora.variable} ${plexMono.variable} antialiased`}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css "app/[lang]/layout.tsx"
git commit -m "feat: replace brand gradient tokens with operator signal/wire palette, add mono font role"
```

---

### Task 2: Hero pipeline signature component

**Files:**
- Create: `components/home/HeroPipeline.tsx`
- Modify: `app/globals.css` (append keyframes after line 61, the end of the existing `hero-chip-float` block)
- Modify: `components/home/Hero.tsx` (remove `floatingChips`/chip rendering, render `HeroPipeline` instead)
- Modify: `i18n/dictionaries/uz/home.ts`, `i18n/dictionaries/ru/home.ts`, `i18n/dictionaries/en/home.ts` (add 4 short node labels under `hero`)

**Interfaces:**
- Consumes: `--color-wire`, `--color-signal`, `--color-bg-elevated`, `--color-border`, `--font-mono` from Task 1.
- Produces: `export default function HeroPipeline({ labels }: { labels: [string, string, string, string] })`, rendered by `Hero.tsx`.

- [ ] **Step 1: Add the pipeline node labels to the uz dictionary**

In `i18n/dictionaries/uz/home.ts`, inside the `hero` object (alongside `eyebrow`, `titleLine1`, etc.), add:

```ts
    pipeline: [
      "Xabar",
      "AI tahlili",
      "Avtomatlashtirilgan harakat",
      "Natija",
    ] as const,
```

- [ ] **Step 2: Mirror the same key in `ru` and `en` dictionaries**

In `i18n/dictionaries/ru/home.ts`, inside `hero`:

```ts
    pipeline: [
      "Сообщение",
      "AI анализ",
      "Автоматическое действие",
      "Результат",
    ] as const,
```

In `i18n/dictionaries/en/home.ts`, inside `hero`:

```ts
    pipeline: [
      "Message",
      "AI analysis",
      "Automated action",
      "Result",
    ] as const,
```

- [ ] **Step 3: Type-check dictionary structure**

Run: `npx tsc --noEmit`
Expected: no errors (the `DeepStringify<T>` mapped type in `i18n/dictionaries/uz/index.ts` will fail the build if any locale's `pipeline` array shape diverges — confirm all three have exactly 4 string entries).

- [ ] **Step 4: Add the pipeline keyframes to `app/globals.css`**

Append after the existing `hero-chip-float` block (end of file, after line 61):

```css
@keyframes pipeline-packet {
  0% {
    left: 0%;
  }
  100% {
    left: 100%;
  }
}

@keyframes pipeline-node-pulse {
  0%,
  85%,
  100% {
    border-color: var(--color-border);
    box-shadow: none;
  }
  10%,
  25% {
    border-color: var(--color-signal);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-signal) 20%, transparent);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .pipeline-packet {
    animation: pipeline-packet 5s linear infinite;
  }

  .pipeline-node {
    animation: pipeline-node-pulse 5s linear infinite;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pipeline-node {
    border-color: var(--color-signal);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-signal) 20%, transparent);
  }
}
```

Note on timing: each node's pulse window is offset via an inline `animation-delay` set per-node in the component (Step 5), so the 4 nodes light up in sequence over the 5s loop rather than all at once.

- [ ] **Step 5: Create `components/home/HeroPipeline.tsx`**

Note on the `labels` prop type: `dict.home.hero.pipeline` is sourced through the
`DeepStringify<T>` mapped type in `i18n/dictionaries/uz/index.ts:18-24`, which
collapses any `readonly (infer U)[]` (including `as const` tuples) down to
`readonly DeepStringify<U>[]` — i.e. a variable-length `readonly string[]`, not
a fixed 4-tuple. `HeroPipeline` must accept `readonly string[]` to match what
`Dictionary` actually produces; a fixed-length tuple prop type would fail
`tsc` when `hero.pipeline` is passed in from `Hero.tsx`.

```tsx
const nodeDelays = ["0s", "1.1s", "2.2s", "3.3s"];

export default function HeroPipeline({
  labels,
}: {
  labels: readonly string[];
}) {
  return (
    <div
      aria-hidden="true"
      className="relative mt-4 flex w-full max-w-2xl flex-col items-stretch gap-6 sm:flex-row sm:items-center sm:gap-0"
    >
      <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-(--color-wire) sm:block">
        <span className="pipeline-packet absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-(--color-signal) shadow-[0_0_8px_2px_rgba(255,157,66,0.6)]" />
      </div>
      {labels.map((label, i) => (
        <div
          key={label}
          className="relative flex flex-1 flex-col items-center gap-2"
        >
          <span
            style={{ animationDelay: nodeDelays[i] }}
            className="pipeline-node flex h-12 w-12 items-center justify-center rounded-full border border-(--color-border) bg-(--color-bg-elevated) font-(family-name:--font-mono) text-xs text-(--color-ink-muted)"
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="font-(family-name:--font-mono) text-[11px] uppercase tracking-wide text-(--color-ink-muted)">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Wire `HeroPipeline` into `Hero.tsx`, remove the old floating chips**

In `components/home/Hero.tsx`:

Remove the import of `Send, Workflow, Sparkles` from `lucide-react` (line 4) and the `floatingChips` array (lines 10-14), and remove the `{floatingChips.map(...)}` block (lines 40-49).

Add an import:

```tsx
import HeroPipeline from "@/components/home/HeroPipeline";
```

Replace the closing of the `<Container>` block — after the CTA `motion.div` (currently the last child, ending at line 86) and before the `</Container>` closing tag — insert:

```tsx
            <HeroPipeline labels={hero.pipeline} />
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Visual verification — desktop, motion enabled**

Start the dev server if not already running (`npm run dev`), then via Playwright: navigate to `http://localhost:3000/uz`, take a viewport screenshot of the hero. Confirm: 4 nodes render left-to-right with mono labels underneath, a thin wire line connects them, and (since motion is unthrottled by default) the packet dot is visible somewhere along the line.

- [ ] **Step 9: Visual verification — reduced motion**

Via Playwright, emulate `prefers-reduced-motion: reduce` (e.g. `browser_evaluate` setting `matchMedia` is not sufficient — use the CDP emulation if the Playwright MCP tool exposes `emulateMedia`; otherwise inject a `<style>` override for the test: `@media (prefers-reduced-motion: reduce) { .pipeline-node { border-color: var(--color-signal) !important; } }` is already in globals.css, so simply verify visually that when the OS-level reduced-motion flag is set, all 4 nodes show the amber border/glow simultaneously and no packet dot is present).

- [ ] **Step 10: Visual verification — mobile viewport**

Resize to 390×844 (iPhone 12 viewport), screenshot the hero. Confirm the 4 nodes stack vertically (the wire/packet line is `hidden` below `sm:`, by design — a vertical connector is out of scope for this task; nodes alone communicate the sequence via their `01`-`04` numbering), no horizontal overflow.

- [ ] **Step 11: Commit**

```bash
git add app/globals.css components/home/Hero.tsx components/home/HeroPipeline.tsx i18n/dictionaries/uz/home.ts i18n/dictionaries/ru/home.ts i18n/dictionaries/en/home.ts
git commit -m "feat: replace hero floating chips with animated pipeline signature"
```

---

### Task 3: Propagate signal/wire tokens to service + portfolio cards

**Files:**
- Modify: `components/home/ServiceCard.tsx:26`
- Modify: `components/home/ServicesCtaCard.tsx:18,20`
- Modify: `components/home/Portfolio.tsx:23,25`
- Modify: `components/home/Hero.tsx` (the `hero-glow` div, still present after Task 2's edits)
- Modify: `components/ui/SectionHeading.tsx:15` (eyebrow color)

**Interfaces:**
- Consumes: `--color-signal`, `--color-wire` from Task 1. No new exports.

- [ ] **Step 1: Update `ServiceCard.tsx` icon badge**

Replace line 26:

```tsx
          <span className="flex h-11 w-11 items-center justify-center rounded-tr-2xl rounded-bl-2xl rounded-tl-md rounded-br-md bg-gradient-to-br from-(--color-brand-from) to-(--color-brand-to) transition-transform duration-300 group-hover:scale-110">
```

with:

```tsx
          <span className="flex h-11 w-11 items-center justify-center rounded-tr-2xl rounded-bl-2xl rounded-tl-md rounded-br-md bg-(--color-signal) transition-transform duration-300 group-hover:scale-110">
```

Also update the hover shadow on line 24 (`hover:shadow-[0_20px_50px_-24px_rgba(63,160,245,0.35)]`) to the amber equivalent:

```tsx
      className="group flex h-full flex-col gap-4 rounded-xl border border-(--color-border) bg-(--color-bg-elevated) p-6 transition-all duration-300 hover:-translate-y-1 hover:border-(--color-signal)/40 hover:shadow-[0_20px_50px_-24px_rgba(255,157,66,0.35)]"
```

And the CTA/tool-icon hover colors further down (`group-hover:text-(--color-brand-to)` and the `text-(--color-brand-to)` on the CTA span) both become `text-(--color-signal)`.

- [ ] **Step 2: Update `ServicesCtaCard.tsx`**

Replace line 18:

```tsx
      className="group flex h-full flex-col gap-4 rounded-xl border border-(--color-brand-to)/30 bg-gradient-to-br from-(--color-brand-from)/15 to-(--color-brand-to)/15 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-(--color-brand-to)/60 hover:shadow-[0_20px_50px_-24px_rgba(63,160,245,0.35)]"
```

with:

```tsx
      className="group flex h-full flex-col gap-4 rounded-xl border border-(--color-signal)/30 bg-(--color-signal)/10 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-(--color-signal)/60 hover:shadow-[0_20px_50px_-24px_rgba(255,157,66,0.35)]"
```

Replace line 20's `border-(--color-brand-to)/40` with `border-(--color-signal)/40`, and the `ArrowUpRight` icon's `text-(--color-brand-to)` (line 22) with `text-(--color-signal)`. Update the CTA span's `text-(--color-brand-to)` similarly.

- [ ] **Step 3: Update `Portfolio.tsx` flagship card**

Replace line 23's classes `border-(--color-brand-to)/30 bg-gradient-to-br from-(--color-brand-from)/10 to-(--color-brand-to)/10` with `border-(--color-signal)/30 bg-(--color-signal)/10`, and line 25's `border-(--color-brand-to)/40` with `border-(--color-signal)/40`. The `Bot` icon's `text-(--color-brand-to)` becomes `text-(--color-signal)`.

- [ ] **Step 4: Update `Hero.tsx`'s glow gradient**

The `hero-glow` div's classes reference `from-(--color-brand-from)/25 to-(--color-brand-to)/25`. Replace with a single-tone signal glow: `bg-(--color-signal)/20` (drop the gradient — a two-stop gradient here would silently reintroduce the old brand-from/to tokens which no longer exist).

- [ ] **Step 5: Update `SectionHeading.tsx` eyebrow color**

Replace `text-(--color-brand-to)` on line 15 with `text-(--color-signal)`.

- [ ] **Step 6: Search for any remaining references to the removed tokens**

Run:

```bash
grep -rn "color-brand-from\|color-brand-to" --include="*.tsx" --include="*.css" .
```

Expected: no output. If any remain, replace with `--color-signal` (or `--color-wire` if it's a structural line rather than an accent) following the same pattern as above.

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Visual verification**

Via Playwright, screenshot Services, Portfolio, and Hero sections. Confirm all icon badges/glows now render in amber (`--color-signal`) rather than purple-blue, with no leftover gradient.

- [ ] **Step 9: Commit**

```bash
git add components/home/ServiceCard.tsx components/home/ServicesCtaCard.tsx components/home/Portfolio.tsx components/home/Hero.tsx components/ui/SectionHeading.tsx
git commit -m "feat: propagate operator signal color to service/portfolio cards and section eyebrows"
```

---

### Task 4: ProcessTimeline — mono step numbers + wire connector

**Files:**
- Modify: `components/home/ProcessTimeline.tsx:18-34`

**Interfaces:**
- Consumes: `--font-mono`, `--color-wire`, `--color-signal` from Task 1.

- [ ] **Step 1: Update the step number + add a wire connector**

Replace lines 18-34:

```tsx
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {process.steps.map((step, i) => (
            <li key={step.id} className="border-t border-(--color-border) pt-4">
              <Reveal delay={i * 0.08} className="flex flex-col gap-3">
                <span className="text-sm font-semibold text-(--color-brand-to)">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-semibold text-(--color-ink)">
                  {step.title}
                </h3>
                <p className="text-sm text-(--color-ink-muted)">
                  {step.description}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
```

with:

```tsx
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {process.steps.map((step, i) => (
            <li
              key={step.id}
              className="border-t-2 border-(--color-wire) pt-4"
            >
              <Reveal delay={i * 0.08} className="flex flex-col gap-3">
                <span className="font-(family-name:--font-mono) text-sm text-(--color-signal)">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-semibold text-(--color-ink)">
                  {step.title}
                </h3>
                <p className="text-sm text-(--color-ink-muted)">
                  {step.description}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Visual verification**

Via Playwright, `scrollIntoView({behavior:'instant'})` to `#process`, screenshot. Confirm step numbers are mono/amber and the top border reads as a distinct steel-blue "wire" rather than the old neutral hairline.

- [ ] **Step 4: Commit**

```bash
git add components/home/ProcessTimeline.tsx
git commit -m "feat: apply operator wire/mono treatment to ProcessTimeline steps"
```

---

### Task 5: WhyUs — replace decorative numbering with icon badges

**Files:**
- Modify: `components/home/WhyUs.tsx:1-41`

**Interfaces:**
- Consumes: `Code2`, `Globe2`, `LifeBuoy` icons from `lucide-react` (already a project dependency, used elsewhere e.g. `data/services.ts`).
- Produces: no new exports; `WhyUs` remains `export default function WhyUs({ dict }: { dict: Dictionary })`.

This fixes the inconsistency identified in the spec: `WhyUs`'s three points are not an ordered sequence (unlike `ProcessTimeline`'s steps), so the "01/02/03" numbering there was decorative mimicry rather than real information. Icon badges (matching `ServiceCard`'s existing asymmetric-corner treatment) replace it.

- [ ] **Step 1: Add an icon map keyed by point index**

Replace the full file content:

```tsx
import { Code2, Globe2, LifeBuoy } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/uz";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

const pointIcons = [Code2, Globe2, LifeBuoy] as const;

export default function WhyUs({ dict }: { dict: Dictionary }) {
  const { whyUs } = dict.home;

  return (
    <section id="why-us" className="relative overflow-hidden py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-(--color-signal)/10 blur-[110px]"
      />
      <Container className="relative flex flex-col gap-12">
        <Reveal>
          <SectionHeading eyebrow={whyUs.eyebrow} title={whyUs.title} />
        </Reveal>
        <div className="grid gap-8 sm:grid-cols-3">
          {whyUs.points.map((point, i) => {
            const Icon = pointIcons[i];
            return (
              <Reveal
                key={point.title}
                delay={i * 0.08}
                className="flex flex-col gap-3 rounded-xl border border-(--color-border) bg-(--color-bg-elevated)/60 p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-tr-2xl rounded-bl-2xl rounded-tl-md rounded-br-md bg-(--color-signal)">
                  <Icon className="h-5 w-5 text-(--color-bg)" strokeWidth={1.75} />
                </span>
                <h3 className="text-lg font-semibold text-(--color-ink)">
                  {point.title}
                </h3>
                <p className="text-sm text-(--color-ink-muted)">
                  {point.description}
                </p>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
```

Note: `pointIcons` has exactly 3 entries matching the 3 hardcoded `whyUs.points` entries in every locale dictionary (verified in Task file review — `i18n/dictionaries/{uz,ru,en}/home.ts` each define exactly 3 points). If a future edit adds a 4th point, `pointIcons[3]` would be `undefined` and `Icon` would fail to render — this is acceptable for now (YAGNI) but worth a one-line comment.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Visual verification**

Via Playwright, scroll to `#why-us`, screenshot. Confirm each of the 3 cards shows an icon badge (not a number) — Code2 for the dev+AI point, Globe2 for the local-market point, LifeBuoy for the support point.

- [ ] **Step 4: Commit**

```bash
git add components/home/WhyUs.tsx
git commit -m "fix: replace WhyUs decorative numbering with icon badges (points are not an ordered sequence)"
```

---

### Task 6: Portfolio + TrustSignals metrics — mono numeric face

**Files:**
- Modify: `components/home/Portfolio.tsx:45` (metric value span)
- Modify: `components/home/TrustSignals.tsx:24` (stat value span)

**Interfaces:**
- Consumes: `--font-mono` from Task 1.

- [ ] **Step 1: Update `Portfolio.tsx` metric value styling**

Replace line 45:

```tsx
                  <span className="font-(family-name:--font-display) text-4xl italic text-(--color-brand-to)">
```

with:

```tsx
                  <span className="font-(family-name:--font-mono) text-4xl text-(--color-signal)">
```

- [ ] **Step 2: Update `TrustSignals.tsx` stat value styling**

Replace line 24:

```tsx
            <span className="text-3xl font-semibold text-(--color-ink)">
```

with:

```tsx
            <span className="font-(family-name:--font-mono) text-3xl font-medium text-(--color-ink)">
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Visual verification**

Via Playwright, screenshot the TrustSignals strip and the Portfolio metrics grid. Confirm both now render numbers in the mono face, reading as a "data readout" consistent with the hero pipeline's node labels.

- [ ] **Step 5: Commit**

```bash
git add components/home/Portfolio.tsx components/home/TrustSignals.tsx
git commit -m "feat: apply mono data-readout treatment to Portfolio and TrustSignals metrics"
```

---

### Task 7: Full-site verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Confirm no dangling old tokens anywhere**

Run:

```bash
grep -rn "color-brand-from\|color-brand-to" --include="*.tsx" --include="*.css" .
```

Expected: no output.

- [ ] **Step 3: Screenshot every section on desktop (uz locale)**

Via Playwright: navigate to `/uz`, then for each of Hero, `#services` (Services), TrustSignals (no id — appears directly after Services), `#why-us`, `#process`, `#portfolio`, `#faq`, `#contact`, scroll with `scrollIntoView({behavior:'instant'})` and take a viewport screenshot. Confirm: consistent amber/wire palette throughout, no purple-blue remnants, mono face used consistently for numbers/labels, no layout regressions vs. the pre-redesign screenshots taken earlier this session.

- [ ] **Step 4: Screenshot hero + services on mobile (390×844)**

Resize viewport, screenshot Hero (pipeline stacks vertically, no overflow) and Services (grid still 1-column, cards intact).

- [ ] **Step 5: Confirm `ru` and `en` locales still render**

Navigate to `/ru` and `/en`, screenshot the hero on each. Confirm the pipeline node labels show the translated strings from Task 2 Step 2, and no console errors appear (check via Playwright console message read-out).

- [ ] **Step 6: Final commit (if any fixups were needed during verification)**

```bash
git add -A
git commit -m "fix: address visual regressions found during full-site redesign verification"
```

(Skip this step if verification found no issues — do not create an empty commit.)
