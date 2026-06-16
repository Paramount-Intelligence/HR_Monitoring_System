---
name: PIMS Mobile Intelligence
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#434655'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#575e70'
  on-secondary: '#ffffff'
  secondary-container: '#d9dff5'
  on-secondary-container: '#5c6274'
  tertiary: '#7f2500'
  on-tertiary: '#ffffff'
  tertiary-container: '#a73400'
  on-tertiary-container: '#ffc9b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#dce2f7'
  secondary-fixed-dim: '#c0c6db'
  on-secondary-fixed: '#141b2b'
  on-secondary-fixed-variant: '#404758'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59c'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#832700'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
  background-alt: '#F8F9FA'
  status-success: '#10B981'
  status-warning: '#F59E0B'
  status-error: '#EF4444'
  status-info: '#3B82F6'
  critical-accent: '#7F1D1D'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  grid-margin: 16px
  gutter: 12px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style
The design system for the PIMS mobile application is built upon a **Modern Corporate** aesthetic that emphasizes operational efficiency and institutional trust. It transitions the web-based monitoring platform into a high-performance mobile environment designed for field oversight and real-time intelligence.

The style leverages **Minimalism** with a focus on data density and legibility. By utilizing a "System Intelligence" narrative, the UI feels like a precision tool: clean, responsive, and authoritative. It prioritizes utility without sacrificing the premium feel expected of an enterprise-grade monitoring system, ensuring that critical data points—such as attendance and project health—are immediately glanceable.

## Colors
The palette is rooted in a professional "Command Blue" (#1D4ED8) which serves as the primary action color. The neutral scale uses deep ink tones for high-contrast typography and soft grays for architectural containment.

**Functional Color Application:**
- **Primary:** Navigation, primary buttons, and active selection states.
- **Surface & Background:** Use `#FFFFFF` for primary cards and `#F8F9FA` for page backgrounds to create subtle layering.
- **Semantic Indicators:** High-saturation tones are reserved for status logic. Green (Present/On Track), Amber (Late/At Risk), and Red (Absent/Critical) must maintain a 4.5:1 contrast ratio against surface colors to ensure accessibility for field users.

## Typography
We utilize **Inter** across all levels to provide a systematic, neutral, and highly legible experience that mirrors the web application's professional tone while optimizing for mobile pixel density.

**Hierarchy Strategy:**
- **Headlines:** Use Bold weights with tight letter spacing for a "newsroom" authority.
- **Numeric Data:** Use the "tabular figures" feature of Inter for project metrics and attendance counts to ensure vertical alignment in lists.
- **Labels:** Uppercase styling is reserved for status badges and small category headers to differentiate meta-data from body content.

## Layout & Spacing
This design system follows a strict **8px grid system** (with a 4px half-step for fine-tuning icons and labels). The layout is optimized for single-handed mobile use.

**Mobile-Specific Layout Rules:**
- **Margins:** Standard 16px lateral margins for all screens.
- **Safe Areas:** Adhere to platform-specific safe areas (Top notch/Bottom home indicator).
- **Touch Targets:** All interactive elements (buttons, chips, list items) must maintain a minimum height/width of 44px to ensure operational accuracy in the field.
- **Content Stacking:** Vertical layouts are preferred over horizontal scrolling, except for status-filter chips.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** rather than heavy shadows to maintain a clean, corporate appearance.

- **Level 0 (Background):** `#F8F9FA` - The canvas.
- **Level 1 (Cards/Surfaces):** White `#FFFFFF` with a very soft, diffused shadow (0px 2px 8px, 4% opacity black).
- **Level 2 (Active Elements):** For items being interacted with or dragged, increase shadow density to 8% and add a 1px neutral border (#E5E7EB).
- **Modals & Bottom Sheets:** Use a 40% black backdrop blur to isolate the task and signal a temporary state change.

## Shapes
A consistent "Rounded" language is applied to humanize the data-heavy interface.

- **Standard Elements (Cards, Inputs):** 8px (0.5rem) corner radius.
- **Status Badges:** Fully rounded (pill-shaped) to distinguish them as non-interactive indicators versus buttons.
- **Buttons:** 8px radius to match the input fields, creating a cohesive visual unit in forms.
- **Avatars:** Circular (100% radius) to maintain standard social/personnel recognition.

## Components
Consistent styling across these core patterns ensures the mobile app feels like a natural extension of the PIMS ecosystem.

- **Bottom Tab Bar:** Persistent navigation using the Secondary color for icons and the Primary color for active states. Use blurred white background for "Glassmorphism" effect.
- **Status Badges:** Use low-opacity background tints (15% of the base status color) with high-saturation text for maximum readability (e.g., "Late" = 15% Amber BG / 100% Amber Text).
- **Intelligence Cards:** Primary container for project and attendance data. Include a 4px vertical "accent stripe" on the left edge of the card that matches the status color (e.g., Green for On Track).
- **Bottom Sheets:** Use for complex filtering or quick-entry of attendance. They should slide up to cover 50% or 90% of the screen depending on the data density.
- **Input Fields:** Outlined style with a 1px gray border. On focus, the border transitions to Primary Blue with a subtle 2px outer glow.
- **Action Buttons:** Large-format, full-width buttons for primary "Submit" or "Check-In" actions. Use the Primary Blue with white text.