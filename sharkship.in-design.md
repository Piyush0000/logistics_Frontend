---
version: alpha
name: Sharkship
description: A clean, enterprise logistics system with strong blue branding, airy spacing, and practical card-based UI.
colors:
  primary: "#184FA2"
  secondary: "#E5E5E5"
  tertiary: "#FAFAFA"
  neutral: "#FFFFFF"
  surface: "#FFFFFF"
  on-surface: "#0A0A0A"
  muted: "#184FA21A"
  accent: "#2EA8E6"
  success: "#22C55E"
  warning: "#F59E0B"
  error: "#EF4444"
typography:
  headline-display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: 700
    lineHeight: 48px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 40px
    fontWeight: 700
    lineHeight: 40px
    letterSpacing: 0px
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: 400
    lineHeight: 32px
    letterSpacing: 0px
  headline-sm:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: 400
    lineHeight: 28px
    letterSpacing: 0px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: 400
    lineHeight: 28px
    letterSpacing: 0px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  label-lg:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0px
  label-md:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0px
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  caption:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0px
  button:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0px
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  xs: 2px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.tertiary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    size: 107px
    height: 32px
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    size: 107px
    height: 32px
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.none}"
    padding: 0px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: 24px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  chip:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 4px 10px
---

# Sharkship

## Overview
Sharkship presents as an enterprise logistics platform that balances operational seriousness with a friendly, optimistic blue brand. The page feels spacious and marketing-led, using large typography, soft card containers, and a bright sky-to-white atmosphere to suggest speed, trust, and scale. It is designed for business users who need confidence, clarity, and quick actions rather than decorative flourish.

## Colors
- **Primary (#184FA2):** The core Sharkship blue, used for key brand moments, primary buttons, links, and emphasized words in headlines. It communicates reliability and technical competence.
- **Secondary (#E5E5E5):** A light neutral border and divider tone for card edges, input outlines, and subtle separation. It keeps the UI clean without heavy contrast.
- **Tertiary (#FAFAFA):** An off-white used for button text and very light surfaces. It softens contrast slightly versus pure white while staying crisp.
- **Neutral (#FFFFFF):** The main page and card background color. It reinforces the airy, uncluttered feel of the interface.
- **On-surface (#0A0A0A):** The primary text color, used for headlines, body copy, and navigation. Its near-black tone gives the layout strong legibility.
- **Muted (#184FA21A):** A translucent blue tint used for subtle borders or soft UI accents. It adds brand color without overpowering content.
- **Accent (#2EA8E6):** A brighter sky blue for highlights, progress moments, and the ambient gradient feel in the hero area. It supports the sense of motion and modern logistics.
- **Success (#22C55E):** Used for positive status indicators such as paid or secure states. It should remain reserved for confirmation and success messaging.
- **Warning (#F59E0B):** A warm caution tone for pending or attention-needed states. It helps communicate shipping workflow status quickly.
- **Error (#EF4444):** Reserved for failed actions, blocked states, or critical alerts. It should be used sparingly to preserve the calm brand tone.

## Typography
The system combines three type voices: Inter for the strongest headline presence, IBM Plex Sans for structured display headings, and Manrope for body and interface text. Headline-display is bold, compact, and tightly tracked, giving the hero message a decisive, editorial impact. Headline levels below that stay clean and neutral, with IBM Plex Sans supporting the platform's technical, enterprise character.

Body text uses Manrope at 16px with a comfortable 24px line height, which suits the dense explanatory copy in the hero and product cards. Labels and buttons are slightly heavier to improve scanability in forms and navigation. Uppercase styling is minimal; the UI relies more on weight, size, and blue emphasis than on aggressive letter spacing or all-caps treatment.

## Layout
The layout follows a wide, centered desktop composition with a strong hero block and floating product cards to the right. Content is arranged in a loose multi-column structure rather than a rigid grid, but spacing remains generous and predictable. The rhythm is based on 2px, 12px, 24px, 48px, and 80px increments, which supports fine adjustments inside controls and large breathing room between major sections.

Cards and form regions use consistent inner padding of 24px, while buttons and inputs keep compact internal spacing for efficiency. The overall feel is spacious and high-clarity, with enough whitespace to prevent the interface from feeling operationally dense. Use broad margins, prominent section separation, and restrained stacking for any new page content.

## Elevation & Depth
Depth is intentionally soft and understated. The system relies on thin borders, white surfaces, and subtle shadowing rather than dramatic elevation or layered blur effects. Cards appear to lift only slightly from the background, enough to separate interactive modules while keeping the visual language calm and enterprise-oriented.

The most important hierarchy signal is contrast: dark text against white panels, blue action colors against neutral surfaces, and selective brand gradients in the hero background. When depth is needed, prefer border and tonal contrast first, then a small shadow. Avoid heavy shadows or glassmorphism that would conflict with the clean logistics aesthetic.

## Shapes
The shape language is rounded but controlled. Interactive elements commonly use 8px corners, while larger containers and cards expand to 16px for a softer, friendlier shell. This creates a polished, practical feel rather than a playful or highly organic one.

Use rounded-md for inputs and primary buttons, rounded-xl for cards, and fully rounded pills for chips or status badges. Sharp corners should be rare and intentional, mostly reserved for structural alignment or plain text links. The overall impression should be neat, approachable, and operationally precise.

## Components
Buttons should feel compact and efficient. `button-primary` is the main call to action: solid blue, white text, 8px 16px padding, 32px height, and 8px radius. `button-secondary` is an outlined or transparent alternative for lower-priority actions, while `button-link` is reserved for inline text actions and navigation. Keep button labels short and action-oriented; avoid oversized button chrome.

Cards should use the `card` treatment: white background, 24px padding, a 16px radius, and a thin neutral border. They work best for shipping summaries, order lists, checkout panels, and small dashboard widgets. Keep card content structured and scannable, with clear headings and compact metadata rows.

Inputs should be visually calm and easy to scan. Use `input` with a white background, 8px radius, and moderate padding so the field feels usable without dominating the form. Pair inputs with strong labels or tabs when the workflow needs classification, as shown by the AWB number pattern. Error states should be obvious but restrained, using the error color only when necessary.

Chips and status tags should be small, rounded, and color-coded. Use `chip` for lightweight markers such as shipment state, secure badges, or quick status indications. Avoid heavy pill shapes unless the element is truly a tag or filter.

Navigation should stay light and text-first, with subtle dropdown indicators and minimal framing. Prominent utility actions like Login and Try For Free can use the button system, but the main navigation itself should remain quiet. Product illustration, device mockups, and supporting imagery should be framed by whitespace rather than nested in complex chrome.

## Do's and Don'ts
- Do keep layouts airy, with large negative space around hero content and cards.
- Don't introduce dense dashboard grids or tightly packed admin-style UI unless the page is explicitly operational.
- Do use strong blue accents for primary actions and key brand emphasis.
- Don't overuse blue on every surface; reserve it for hierarchy and call-to-action moments.
- Do rely on white cards, subtle borders, and minimal shadows for depth.
- Don't add heavy drop shadows, glass effects, or dark overlays that would fight the clean look.
- Do use large, bold headlines with compact line heights for strong messaging.
- Don't stretch headings into loose, airy display treatments that weaken the brand's decisiveness.
- Do keep controls compact and efficient, especially buttons and inputs.
- Don't make interactive components oversized or decorative at the expense of usability.
