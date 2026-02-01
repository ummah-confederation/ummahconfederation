# UI Mode Customization Guide

This guide explains how to customize the UI Mode appearance in `index.html`.

## Table of Contents

1. [Text Sizes](#text-sizes)
2. [Grid Columns (Items per Row)](#grid-columns)
3. [Colors](#colors)
4. [Images (Avatar & Cover)](#images)
5. [Spacing & Gaps](#spacing)
6. [Card Dimensions](#card-dimensions)
7. [Squircle Styling](#squircle-styling)

---

## Text Sizes

### Location
File: [`index.html`](index.html) - Inside the `<style>` tag

### Content Tab - Item Labels
```css
.squircle-label {
  font-size: 0.75rem;  /* EDIT THIS: Change item name size under squircle */
}
```

### Account/Space Cards - Text Sizes
```css
.id-card-name {
  font-size: 0.95rem;  /* EDIT THIS: Institution/Jurisdiction name size */
}

.id-card-label {
  font-size: 0.8rem;   /* EDIT THIS: Label text size */
}

.id-card-count {
  font-size: 0.75rem;  /* EDIT THIS: Count text size (e.g., "5 contributions") */
}
```

### Tab Buttons
```css
/* In index.html, search for tab-btn classes */
.tab-btn {
  font-size: 0.875rem;  /* Default Tailwind text-sm */
}
```

**Common font-size values:**
- `0.75rem` = 12px
- `0.875rem` = 14px
- `1rem` = 16px
- `1.125rem` = 18px

---

## Grid Columns

### Location
File: [`index.html`](index.html) - Inside the `<style>` tag

### Content Tab (Squircles)
```css
.content-gallery {
  grid-template-columns: repeat(4, 1fr);  /* EDIT: 4 items per row on desktop */
}

@media (max-width: 768px) {
  .content-gallery {
    grid-template-columns: repeat(3, 1fr);  /* EDIT: 3 items per row on tablet */
  }
}

@media (max-width: 480px) {
  .content-gallery {
    grid-template-columns: repeat(3, 1fr);  /* EDIT: 3 items per row on mobile */
  }
}
```

### Account/Space Tabs (Cards)
```css
.card-gallery {
  grid-template-columns: repeat(3, 1fr);  /* EDIT: 3 cards per row on desktop */
}

@media (max-width: 768px) {
  .card-gallery {
    grid-template-columns: repeat(2, 1fr);  /* EDIT: 2 cards per row on tablet */
  }
}

@media (max-width: 480px) {
  .card-gallery {
    grid-template-columns: repeat(1, 1fr);  /* EDIT: 1 card per row on mobile */
  }
}
```

**Change the number** after `repeat(` to adjust items per row.

---

## Colors

### Location
File: [`index.html`](index.html) - Inside the `<style>` tag

### Squircle Background
```css
.squircle {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  /* EDIT: Change hex colors for different squircle backgrounds */
}
```

### Card Cover Backgrounds
Account cards (default purple gradient):
```css
.id-card-cover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

Space cards (blue gradient - in [`js/index-ui.js`](js/index-ui.js)):
```javascript
// Look for this line in renderSpaceGallery function:
<div class="id-card-cover" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);">
```

### Text Colors
```css
.id-card-name {
  color: #111827;  /* EDIT: Name text color (default: dark gray) */
}

.id-card-label {
  color: #6b7280;  /* EDIT: Label text color (default: medium gray) */
}

.id-card-count {
  color: #9ca3af;  /* EDIT: Count text color (default: light gray) */
}

.squircle-label {
  color: #3b82f6;  /* EDIT: Item label color (default: blue) */
}
```

---

## Images

### Location
File: [`js/index-ui.js`](js/index-ui.js)

### Content Tab - Squircle Icons
Look for this comment in `renderContentGallery`:
```javascript
// EDIT SQUIRCLE ICON: Replace the SVG below with an <img> tag for custom icons
// Example: <img src="images/items/${item.toLowerCase()}.png" alt="${item}">
```

**To add custom icons:**
1. Create folder: `images/items/`
2. Add images named after items (e.g., `book.png`, `policy.png`, `decision.png`)
3. Replace the SVG with: `<img src="images/items/${item.toLowerCase()}.png" alt="${item}">`

### Account Cards - Avatars
Look for this comment in `renderAccountGallery`:
```javascript
// EDIT AVATAR: Replace the SVG below with an <img> tag pointing to your avatar image
// Example: <img src="images/institutions/${institution.toLowerCase().replace(/\s+/g, '-')}.png" alt="${institution}">
```

**To add custom avatars:**
1. Create folder: `images/institutions/`
2. Add images named after institutions (e.g., `ummah-cabinet.png`, `ummah-governance.png`)
3. Replace the SVG with the example code above

### Space Cards - Avatars
Look for this comment in `renderSpaceGallery`:
```javascript
// EDIT AVATAR: Replace the SVG below with an <img> tag pointing to your avatar image
// Example: <img src="images/jurisdictions/${displayName.toLowerCase().replace(/\s+/g, '-')}.png" alt="${displayName}">
```

### Card Covers (Background Images)
Look for this comment in `renderSpaceGallery`:
```javascript
// EDIT COVER: Change the gradient colors or replace with an image
// Example with image: <div class="id-card-cover" style="background-image: url('images/covers/${displayName.toLowerCase().replace(/\s+/g, '-')}.jpg'); background-size: cover;">
```

---

## Spacing

### Location
File: [`index.html`](index.html) - Inside the `<style>` tag

### Grid Gaps
```css
.content-gallery {
  gap: 1.5rem;  /* EDIT: Space between squircles (desktop) */
}

@media (max-width: 768px) {
  .content-gallery {
    gap: 1rem;  /* EDIT: Space between squircles (tablet) */
  }
}

.card-gallery {
  gap: 1.25rem;  /* EDIT: Space between cards */
}
```

### Card Internal Spacing
```css
.id-card-content {
  padding: 2.5rem 1rem 1rem;  /* EDIT: Top, sides, bottom padding */
}
```

### Tab Navigation Spacing
```css
/* In the HTML structure, look for: */
<div class="flex justify-center mb-8 mt-6">  /* EDIT: mb-8 = margin bottom, mt-6 = margin top */
```

**Tailwind spacing scale:**
- `0.5rem` = 2px
- `1rem` = 4px
- `1.5rem` = 6px
- `2rem` = 8px
- etc.

---

## Card Dimensions

### Location
File: [`index.html`](index.html) - Inside the `<style>` tag

### Card Cover Height
```css
.id-card-cover {
  height: 80px;  /* EDIT: Height of the colored cover area */
}
```

### Avatar Size
```css
.id-card-avatar {
  width: 64px;   /* EDIT: Avatar width */
  height: 64px;  /* EDIT: Avatar height */
}
```

### Squircle Size
The squircle size is controlled by the grid and aspect ratio:
```css
.squircle {
  aspect-ratio: 1;  /* EDIT: 1 = square, 1.5 = rectangle, etc. */
}
```

---

## Squircle Styling

### Location
File: [`index.html`](index.html) - Inside the `<style>` tag

### Border Radius (Roundness)
```css
.squircle {
  border-radius: 22%;  /* EDIT: Lower = more square, Higher = more circle */
}
```

**Examples:**
- `0%` = Square
- `22%` = iOS-style squircle (default)
- `50%` = Circle

### Shadow
```css
.squircle {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);  /* EDIT: x-offset y-offset blur color */
}
```

### Icon Size
```css
.squircle svg {
  width: 50%;   /* EDIT: Icon width relative to squircle */
  height: 50%;  /* EDIT: Icon height relative to squircle */
}
```

---

## Quick Reference Table

| Element | File | CSS Class/Property |
|---------|------|-------------------|
| Item name size | `index.html` | `.squircle-label { font-size }` |
| Institution name size | `index.html` | `.id-card-name { font-size }` |
| Label size | `index.html` | `.id-card-label { font-size }` |
| Count size | `index.html` | `.id-card-count { font-size }` |
| Squircles per row | `index.html` | `.content-gallery { grid-template-columns }` |
| Cards per row | `index.html` | `.card-gallery { grid-template-columns }` |
| Squircle color | `index.html` | `.squircle { background }` |
| Card cover color | `index.html` / `js/index-ui.js` | `.id-card-cover { background }` |
| Text colors | `index.html` | `.id-card-* { color }` |
| Grid gaps | `index.html` | `.content-gallery { gap }` |
| Card cover height | `index.html` | `.id-card-cover { height }` |
| Avatar size | `index.html` | `.id-card-avatar { width/height }` |
| Squircle roundness | `index.html` | `.squircle { border-radius }` |
| Custom images | `js/index-ui.js` | Replace SVG with `<img>` tags |

---

## Example Customizations

### Make Cards More Compact
```css
.id-card-cover {
  height: 60px;  /* Reduced from 80px */
}

.id-card-avatar {
  width: 48px;   /* Reduced from 64px */
  height: 48px;
}

.id-card-content {
  padding: 2rem 0.75rem 0.75rem;  /* Reduced padding */
}
```

### Change to 4 Cards Per Row on Desktop
```css
.card-gallery {
  grid-template-columns: repeat(4, 1fr);  /* Changed from 3 */
}
```

### Brighter Squircles
```css
.squircle {
  background: linear-gradient(135deg, #90caf9 0%, #42a5f5 100%);
}
```

### Larger Text
```css
.id-card-name {
  font-size: 1.1rem;  /* Increased from 0.95rem */
}
```

---

## Need More Help?

- **Tailwind CSS docs**: https://tailwindcss.com/docs
- **CSS Grid guide**: https://css-tricks.com/snippets/css/complete-guide-grid/
- **CSS Flexbox guide**: https://css-tricks.com/snippets/css/a-guide-to-flexbox/
