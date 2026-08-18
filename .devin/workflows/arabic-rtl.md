---
description: Plan for Arabic RTL support — Phase 2 (Months 3-6)
---

# Arabic RTL Implementation Plan

## Overview
Arabic language support requires Right-to-Left (RTL) layout, not just translations.

## Technical Requirements

### 1. CSS / Layout
- Add `dir="rtl"` on `<html>` element when locale is `ar`
- Invert all directional utilities:
  - `ml-*` → `mr-*` and vice versa
  - `pl-*` → `pr-*` and vice versa
  - `left-*` → `right-*` and vice versa
  - `space-x-*` → `space-x-reverse`
- Use Tailwind's `rtl:` variant (requires `tailwindcss-rtl` plugin or Tailwind v3.3+)
- Flexbox `flex-row` → `flex-row-reverse` for nav, buttons, etc.

### 2. Navigation
- Logo on right side
- Nav links flow right-to-left
- Dropdown menus open from right
- Breadcrumbs reversed

### 3. Content
- Text alignment: `text-right` by default
- Icons that indicate direction (arrows, chevrons) need mirroring
- Number formatting: Arabic-Indic digits optional (Western Arabic numerals acceptable)
- Date formatting: Hijri calendar optional

### 4. Testing
- Visual regression tests for every page
- Check all modals, dropdowns, tooltips
- Verify forms (labels, inputs, validation messages)
- Test on actual Arabic content (not just Lorem Ipsum)

### 5. Implementation Steps
1. Add `ar` to locales in `i18n.ts`
2. Create `ar` translation dictionary
3. Add `dir` attribute to `<html>` based on locale
4. Install `tailwindcss-rtl` plugin
5. Audit all components for directional CSS
6. Create `/ar/page.tsx` with Arabic content
7. Update `LocaleSwitcher` to include Arabic
8. Update `sitemap.ts` and `robots.ts` for `/ar` route
9. Full visual QA pass

## Timeline
- **Month 3**: Start translations + CSS audit
- **Month 4**: Implement RTL layout + component fixes
- **Month 5**: Visual QA + content creation
- **Month 6**: Launch Arabic version

## Priority
Medium — only after EN + FR are stable and generating revenue.
