---
name: Skein Mobile DS
colors:
  surface: "#0d141c"
  surface-dim: "#0d141c"
  surface-bright: "#333a43"
  surface-container-lowest: "#080f17"
  surface-container-low: "#151c24"
  surface-container: "#192029"
  surface-container-high: "#242b33"
  surface-container-highest: "#2e353e"
  on-surface: "#dce3ef"
  on-surface-variant: "#d7c3b3"
  inverse-surface: "#dce3ef"
  inverse-on-surface: "#2a313a"
  outline: "#9f8d7f"
  outline-variant: "#524438"
  surface-tint: "#ffb873"
  primary: "#ffc794"
  on-primary: "#4b2800"
  primary-container: "#f2a65a"
  on-primary-container: "#6b3c00"
  inverse-primary: "#8b5006"
  secondary: "#aec6ff"
  on-secondary: "#002e6b"
  secondary-container: "#024ead"
  on-secondary-container: "#aec6ff"
  tertiary: "#81defe"
  on-tertiary: "#003543"
  tertiary-container: "#64c2e1"
  on-tertiary-container: "#004e61"
  error: "#ffb4ab"
  on-error: "#690005"
  error-container: "#93000a"
  on-error-container: "#ffdad6"
  primary-fixed: "#ffdcbf"
  primary-fixed-dim: "#ffb873"
  on-primary-fixed: "#2d1600"
  on-primary-fixed-variant: "#6a3b00"
  secondary-fixed: "#d8e2ff"
  secondary-fixed-dim: "#aec6ff"
  on-secondary-fixed: "#001a43"
  on-secondary-fixed-variant: "#004397"
  tertiary-fixed: "#b6ebff"
  tertiary-fixed-dim: "#76d3f2"
  on-tertiary-fixed: "#001f28"
  on-tertiary-fixed-variant: "#004e60"
  background: "#0d141c"
  on-background: "#dce3ef"
  surface-variant: "#2e353e"
typography:
  h1:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: "700"
    lineHeight: 32px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: "600"
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: "500"
    lineHeight: 18px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 16px
  h1-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: "700"
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  screen-padding: 16px
  stack-gap: 12px
  card-padding: 16px
  inline-gap: 8px
---

## Brand & Style

The design system is engineered for high-performance automation monitoring, prioritizing technical clarity and low-fatigue observation. The aesthetic is rooted in **Developer-Centric Minimalism**, blending functional utility with a nocturnal, high-contrast interface.

The visual language emphasizes precision through data-heavy layouts and technical accents. It evokes a sense of "system health" and "operational control," ensuring that critical status changes are immediately legible against a deep, non-distractive background.

## Colors

The palette is optimized for dark mode environments (OLED-friendly). The foundation uses deep charcoals to reduce eye strain, while the accent palette uses high-chroma status colors to signal automation states.

- **Primary Accent:** Used for interactive elements and brand presence.
- **Semantic Status:** These colors are the core of the monitoring experience. Use them for status pills, progress indicators, and log highlights.
- **Neutral System:** Grays are tuned to maintain contrast ratios; avoid using pure white for text to prevent "haloing" on dark backgrounds.

## Typography

This design system employs a dual-font strategy:

- **Inter** is the workhorse for structural UI, navigation, and descriptions. Its humanist qualities ensure legibility in compact mobile views.
- **JetBrains Mono** is reserved for technical identifiers (IDs), timestamps, log outputs, and status labels. Its fixed-width nature allows for easy scanning of numerical data and vertically aligned logs.

Use `label-mono` for all metadata fields to distinguish "system data" from "user interface text."

## Layout & Spacing

The layout follows a strict 4px/8px baseline grid.

- **Margins:** A consistent 16px horizontal safe area is maintained on all mobile screens.
- **Hierarchy:** Use 12px vertical spacing between cards in a list. Inside a card, use 8px spacing for related metadata groups.
- **Grids:** For data dashboards, use a 2-column grid for small metric cards and a 1-column grid for detailed run history.

## Elevation & Depth

Depth is conveyed through **Tonal Layering** rather than heavy shadows.

- **Level 0:** Background (`#0E1116`) is the base.
- **Level 1:** Cards and Surfaces (`#171B22`) sit on top.
- **Borders:** All surfaces use a 1px solid border (`#2A2F3A`) to define edges. Shadows are reserved only for floating modals or context menus, using a soft, 20% opacity black blur.
- **Visual Dividers:** Use the border color for hairline dividers between list items.

## Shapes

A "Rounded" profile provides a modern, professional feel that balances the technical nature of the content.

- **Cards/Modals:** 12px (rounded-lg) for the primary container radius.
- **Buttons/Inputs:** 8px for standard interactive components.
- **Status Pills:** Fully rounded (pill-shaped) to distinguish them from interactive buttons.

## Components

- **Bottom Navigation:** Fixed height 64px. Active states should use the Primary Accent (`#F2A65A`) for the icon and label. Use a subtle top border to separate from content.
- **Status Pills:** Backgrounds must be 15% opacity of the status color (e.g., Success), while the text remains 100% opacity. Use `label-mono` for pill text in all-caps.
- **Cards:** Use a 1px border. The header of the card should often contain a monospace ID and a right-aligned status pill.
- **Monospace Labels:** Use for timestamps, commit hashes, and UUIDs. Pair with the Secondary Text color for a "metadata" look.
- **Action Buttons:** Primary buttons use a solid `#F2A65A` fill with dark text. Secondary buttons use a ghost style with the border color.
- **Inputs:** Darker background than the card (`#0E1116`), with a subtle border that glows with the Primary color on focus.
