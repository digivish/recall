# Project: Recall Hero
**Vibe Coding Manifesto:** Speed, minimalism, and high-fidelity math.

## Tech Stack
- **Design:** Stitch (Minimalist Black/White/Grey)
- **Framework:** Next.js 16 (React 20)
- **Intelligence:** Gemini 3 Pro (for complex math), MiniMax M2.7 (for speed)

## Aesthetic Constraints
- Use ONLY the following hex codes: #000000, #FFFFFF, #888888.
- No rounded corners > 4px (Swiss Modernism).
- Layouts must be "Insight-First": Minimal inputs, maximal visual feedback.

## Critical Instructions
- All weight loss projections MUST use the `trynestor` skill.
- Never suggest a linear 2lb/week loss. If the math isn't asymptotic, it's a bug.
- Avoid external libraries for charts; use SVG primitives via Stitch.

## Knowledge Sources
- **Visual Source of Truth:** `@design/`
  - This folder contains Stitch exports (HTML/CSS/JS).
  - Treat these as "Frozen Specs." Never edit files in this directory.
  - When creating React components in `@src/`, always cross-reference the layout, spacing, and classes found in `@design/`.

## Design Architecture
- **Global Styles:** Refer to `@design/nestor_clinical_mono/DESIGN.md` for all hex codes, spacing scales, and typography.
- **Screen Pattern:** Each screen is a pair of `code.html` (structure) and `screen.png` (visual reference).
- **Responsive Logic:** When building a component, look at both the standard folder (e.g., `nestor_calculator`) and the mobile folder (e.g., `nestor_calculator_mobile`) to determine breakpoints.

## Design Implementation Rules
- Always use **Tailwind CSS** to replicate Stitch's exported styles.
- If a component in `@src/` deviates from the design in `@design/`, flag it during a `/vibe-check`.
