---
name: The Midnight Navigator
description: Premium dark-tech maritime dashboard for certificate survey tracking.
colors:
  primary: "#cca43b"
  bg-primary: "#070c0b"
  bg-secondary: "#0e1614"
  bg-card: "#16221f"
  border-color: "#22322e"
  text-primary: "#f2f5f4"
  text-secondary: "#9aa8a5"
  status-red: "#d64f3e"
  status-yellow: "#e59b3c"
  status-green: "#48a37e"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, sans-serif"
    fontWeight: 400
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  input-field:
    backgroundColor: "rgba(255, 255, 255, 0.05)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: The Midnight Navigator

## 1. Overview

**Creative North Star: "The Midnight Navigator"**

The Midnight Navigator visual design system is a high-glanceability dark Spruce-Green and Gold theme engineered for professional maritime operations. It is optimized for 24/7 monitoring centers, low-light shipboard bridges, and office dashboard displays. The system uses a deep background tone with high-contrast, color-coded accents that highlight critical compliance data without creating unnecessary visual noise.

This system explicitly rejects generic white/gray templates and alarmist flashing alert patterns, opting instead for a unified, secure, and professional layout.

**Key Characteristics:**
- Deep Spruce-Green and Charcoal neutrals to minimize screen glare and eye strain.
- Controlled use of Marine Gold (`#cca43b`) as a primary interactive and highlighting accent.
- Clear status hierarchy (Emerald Safe, Amber Warning, Coral Alert) designed for rapid scanning.
- Compact, flat bento-style grids that maximize screen space while maintaining structure.

## 2. Colors

The color palette is characterized by rich, dark, tinted Spruce-Green neutrals paired with a premium Marine Gold primary accent.

### Primary
- **Marine Gold** (`#cca43b`): Used for primary actions, active tabs, search highlights, and branding accents.

### Neutral
- **Deep Spruce Black** (`#070c0b`): The base page background color.
- **Spruce Charcoal** (`#0e1614`): Sidebar, header, and container background color.
- **Muted Forest** (`#16221f`): Card backgrounds, hover states, and inactive containers.
- **Dark Spruce Border** (`#22322e`): Solid divider lines and element borders.
- **Off-white Green** (`#f2f5f4`): Primary body text, titles, and active inputs.
- **Muted Sage** (`#9aa8a5`): Secondary text, labels, and helper icons.

### Status Colors
- **Emerald Safe** (`#48a37e`): Indicates valid certificates, active status, or completed actions.
- **Amber Warning** (`#e59b3c`): Indicates items expiring soon or requiring attention.
- **Coral Alert** (`#d64f3e`): Indicates critical overdue items, expirations, or deletions.

### Named Rules
**The 10% Accent Rule.** The primary Marine Gold accent is used strictly on 10% or less of any layout surface. Its purpose is to guide the user's focus, not overwhelm it.
**The Tinted Neutral Rule.** No pure black (`#000000`) or white (`#ffffff`) is permitted. Every neutral color must be tinted toward the Spruce-Green hue.

## 3. Typography

**Display Font:** Plus Jakarta Sans
**Body Font:** Inter
**Label/Mono Font:** Roboto Mono, Courier New

The typography uses a geometric display font with tight letter-spacing for headers, paired with a highly legible, clean sans-serif for numbers, text, and tables.

### Hierarchy
- **Display / H1** (Bold (700), 26px, 1.2): Main view titles and prominent dashboard headers.
- **Headline / H2** (Bold (700), 22px, 1.25): Modal titles and secondary section headers.
- **Title / H3** (Semi-Bold (600), 18px, 1.3): Card titles and vessel header labels.
- **Body** (Regular (400), 14px, 1.5): Standard text paragraphs, table cell content. Cap line length at 65–75ch.
- **Label / Small** (Medium (500), 11px, 1.1, uppercase, letter-spacing 0.5px): Table headers, stats labels, and minor metadata.

### Named Rules
**The Tabular Number Rule.** All numeric displays (dates, IMO numbers, count indicators) must use tabular numbers (supported by Inter/Roboto Mono) to ensure visual column alignment in tables.

## 4. Elevation

The system is flat by default, prioritizing tonal layering and dark Spruce borders over heavy drop shadows. This preserves high-contrast readability under varying ambient lighting conditions.

### Shadow Vocabulary
- **Ambient Glow** (`box-shadow: 0 10px 15px -3px rgba(0,0,0,0.25)`): Applied exclusively to interactive cards upon hover or inside open modals to draw focus.

### Named Rules
**The Flat-at-Rest Rule.** All cards, tables, and buttons must remain completely flat at rest. Subtle shadow elevations are triggered only as a dynamic response to hover, active states, or modal presentation.

## 5. Components

### Buttons
- **Shape:** Softly curved corners (6px radius).
- **Primary Button:** Background uses `var(--primary-gradient)` with white text and `var(--shadow-sm)`.
- **Hover Treatment:** Transition over `var(--transition-fast)` with brightness scale of 1.08.
- **Outline Button:** Transparent background, `1px solid var(--border-color)` border, with `var(--text-primary)` text.
- **States:** Dynamic scale-down (`transform: scale(0.97)`) on press active state.

### Cards / Containers
- **Shape:** Rounded corners (8px radius).
- **Background:** Solid `var(--bg-card)`.
- **Borders:** Thin outline (`1px solid var(--border-color)`).
- **Interactive Hover:** Card scales slightly upward (`transform: translateY(-3px)`), borders brighten to `rgba(255, 255, 255, 0.15)`, and casts `var(--shadow-lg)`.

### Inputs / Fields
- **Style:** Background uses `rgba(255, 255, 255, 0.05)`, border uses `1px solid var(--border-color)`, with `var(--border-radius-md)`.
- **Focus state:** Border shifts to `var(--primary-color)` (Marine Gold), and background brightens to `rgba(255, 255, 255, 0.08)`.

### Navigation Items
- **Style:** Flex container with 12px gap, 12px 16px padding, using `var(--text-secondary)`.
- **Active state:** Changes color to `var(--primary-color)` and applies an inset left border indicator (`inset 3px 0 0 var(--primary-color)`).

## 6. Do's and Don'ts

### Do:
- **Do** use icons alongside status badges (e.g., Check for Valid, Warning for Due, Alert for Overdue) to ensure readability for colorblind operators.
- **Do** optimize the layout for full-screen office TV viewing, utilizing high font weight and clear visual boundaries.
- **Do** preserve the Spruce-Green brand identity by using tinted neutrals on all custom components.

### Don't:
- **Don't** use colored side-stripe borders larger than 1px as a highlight on cards or list items.
- **Don't** use gradient text or clipping effects, as they detract from glanceability and safety readings.
- **Don't** trigger popups or modals for secondary notifications that can be displayed inline or via auto-dismissing toasts.
