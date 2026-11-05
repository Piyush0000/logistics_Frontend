---
version: alpha
name: MeraCourierWala
description: A dark, high-contrast courier platform with energetic orange accents and dense, conversion-focused cards.
colors:
  primary: "#ff6a00"
  secondary: "#eaf1ff"
  tertiary: "#09101c"
  neutral: "#ffffff"
  surface: "#132236"
  surface-2: "#1b2a42"
  on-surface: "#eaf1ff"
  on-surface-muted: "#aab4c3"
  border: "#ffffff1f"
  overlay: "#00000080"
  success: "#22c55e"
  error: "#ef4444"
typography:
  headline-display:
    fontFamily: Manrope
    fontSize: 44px
    fontWeight: 950
    lineHeight: 46.2px
    letterSpacing: 0.2px
  headline-lg:
    fontFamily: Manrope
    fontSize: 34px
    fontWeight: 950
    lineHeight: 41px
    letterSpacing: 0px
  headline-md:
    fontFamily: Manrope
    fontSize: 27px
    fontWeight: 950
    lineHeight: 32px
    letterSpacing: 0px
  headline-sm:
    fontFamily: Manrope
    fontSize: 21px
    fontWeight: 600
    lineHeight: 25px
    letterSpacing: 0px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: 600
    lineHeight: 28px
    letterSpacing: 0px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: 600
    lineHeight: 26.4px
    letterSpacing: 0px
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 600
    lineHeight: 22px
    letterSpacing: 0px
  label-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: 0px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 800
    lineHeight: 20px
    letterSpacing: 0px
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: 800
    lineHeight: 16px
    letterSpacing: 0.04em
  overline:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.06em
  nav-link:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: 800
    lineHeight: 20px
    letterSpacing: 0px
  input:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: 0px
  caption:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0px
rounded:
  none: 0px
  sm: 8px
  md: 14px
  lg: 18px
  xl: 26px
  full: 9999px
spacing:
  xs: 2px
  sm: 10px
  md: 14px
  lg: 18px
  xl: 28px
  gutter: 24px
  section: 40px
  page: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.tertiary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "#ff7a1a"
    textColor: "{colors.tertiary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "48px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "48px"
  button-tertiary:
    backgroundColor: "#24324a"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
    height: "40px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: "16px"
  card-soft:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "#1a2330"
    textColor: "{colors.on-surface}"
    typography: "{typography.input}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
    height: "40px"
  chip:
    backgroundColor: "#2a3240"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
---

# MeraCourierWala

## Overview
MeraCourierWala feels like a premium, conversion-first logistics product: confident, fast, and practical. The interface uses a dark base with bright orange energy to signal speed and action, while the dense card layout keeps the experience information-rich for business users. The tone is professional rather than playful, with enough glow and contrast to feel modern and high-performing.

## Colors
- **Primary (#ff6a00):** A vivid courier-orange used for the main calls to action, selected highlights, and emphasis moments. It is the brand’s strongest attention signal and should remain reserved for conversion-driving actions.
- **Secondary (#eaf1ff):** A soft off-white used for most readable foreground text on dark surfaces. It keeps the UI crisp without feeling stark.
- **Tertiary (#09101c):** A deep ink tone used for dark text and icon contrast on orange buttons. It provides strong legibility and a grounded, technical feel.
- **Surface (#132236):** The main panel color for large cards and feature sections. It sits between navy and slate, creating depth without losing the dark theme.
- **Surface-2 (#1b2a42):** A slightly lighter panel layer used for softer cards and grouped content blocks. It helps establish hierarchy within the dark system.
- **On-surface (#eaf1ff):** The default text color inside dark containers. Use it for headings, labels, and primary content on dark backgrounds.
- **On-surface-muted (#aab4c3):** Muted supporting text for descriptions, helper copy, and less prominent metadata. It should never compete with key action copy.
- **Border (#ffffff1f):** A translucent white border used to outline cards, inputs, and buttons. It gives structure without making edges feel heavy.
- **Overlay (#00000080):** A dark overlay for depth, scrims, and floating controls where needed.
- **Success (#22c55e):** Use sparingly for positive state feedback, confirmations, or success badges.
- **Error (#ef4444):** Use for validation errors and destructive states only.

## Typography
Manrope is the defining typeface across the product, supported by clean sans-serif fallbacks. Headings are very heavy, often near-black in weight, which creates a bold and assertive hierarchy suited to a shipping and operations platform. Body copy stays semi-bold for clarity on dark backgrounds, while labels and navigation use compact, high-weight treatments to preserve a strong UI rhythm.

`headline-display`, `headline-lg`, and `headline-md` are for hero and section titles. `headline-sm` works for smaller cards, panels, and inline headings. `body-lg`, `body-md`, and `body-sm` handle explanatory copy, with `body-md` as the default reading size. `label-lg` and `label-md` are used for buttons, nav items, and form labels; `label-sm` and `overline` are ideal for microcopy, pills, and status chips.

Uppercase styling is not a major visual feature here. Instead, the system relies on weight, spacing, and contrast rather than all-caps treatment. Letter spacing is minimal overall, with slightly expanded tracking only for the smallest utility text.

## Layout
The layout follows a centered, fixed-max-width hero with large side margins and stacked content sections below. Cards are arranged in a responsive grid, with a clear split between the primary hero panel and the calculator panel at the top. Spacing is compact but not cramped: use the defined scale consistently, with `xs` for micro gaps, `sm` and `md` for inline element separation, `lg` for internal card rhythm, and `section` or `page` spacing for vertical separation between content blocks.

Section containers should feel spacious enough for a premium SaaS product, but not airy in a minimalist sense. Interior padding in cards typically lands around `16px` with button padding around `12px 16px`. Form fields and pill controls should stay tight and efficient to reinforce the operational, utility-driven experience.

## Elevation & Depth
The system uses depth through layered dark surfaces, subtle borders, and selective glow rather than conventional large shadows. Cards have a soft outer shadow and thin translucent outlines, which separates them from the dark page background without making them feel floating or detached. Orange accents may use a gentle glow effect for primary actions, but the overall depth language stays restrained and technical.

Because the interface is dark and performance-oriented, tonal variation does most of the work. Use slightly lighter panels, border translucency, and contrast to indicate hierarchy instead of heavy shadow stacks.

## Shapes
The shape language is rounded and friendly, but still disciplined. Large cards use `rounded.xl`, buttons and inputs use `rounded.md`, and chips/pills should be fully rounded with `rounded.full`. This produces a modern SaaS feel with enough softness to avoid looking sterile, while keeping the structure crisp and trustworthy.

Avoid sharp corners except where intentionally utility-driven. The overall impression should be smooth, polished, and production-ready.

## Components
Buttons are the most expressive component in the system. `button-primary` is the main action style: orange fill, dark text, strong weight, and a 48px height. Use it for actions like “Get Started,” “Check Rates,” and “Fetch Rates.” `button-primary-hover` should brighten slightly rather than changing hue. `button-secondary` is the dark-outline version for supporting actions; it works well in nav and secondary hero CTAs. `button-tertiary` is appropriate for compact utility actions and low-priority actions inside dense content. Keep button labels short and action-oriented.

Cards should follow `card` or `card-soft` depending on prominence. Primary cards need a darker surface, thin border, and spacious internal padding. Secondary cards can be slightly lighter and can support small icon badges, brief headings, and short descriptions. Card content should be stacked clearly: icon or badge first, title second, description last.

Inputs use the `input` style: dark fill, subtle border, rounded corners, and readable placeholder text. Labels should sit above fields with clear spacing, and helper text should be muted but still legible. Dropdowns, numeric fields, and toggles should match the same tonal family so forms read as one integrated calculator module.

Chips use `chip` for small informational badges and status pills. They should feel compact, slightly elevated, and highly legible. Navigation items use `nav-item` with strong weight and enough padding to support click targets while remaining visually quiet. Floating utility controls should follow the same dark-surface language as cards, with orange used only when the control is a direct action trigger.

## Do's and Don'ts
- Do use orange sparingly as the primary action and emphasis color.
- Do keep text high-contrast on dark surfaces with `on-surface` and muted supporting copy with `on-surface-muted`.
- Do maintain the rounded, card-based structure across hero, forms, and feature blocks.
- Do use bold Manrope headings and strong label weights to preserve the product’s assertive tone.
- Don't introduce bright pastel colors or soft gradients that weaken the logistics/operations feel.
- Don't overuse shadows; rely on borders, tonal surfaces, and contrast for hierarchy.
- Don't make buttons or inputs visually thin; the interface depends on sturdy, touch-friendly sizing.
- Don't switch to playful illustration-heavy styling; keep the system functional, premium, and conversion-focused.