Perfect! I'll update the plan to focus on the **big structural requirements** (multiple heroes with slides) while giving the AI creative freedom for the actual content details.

---

**AI Prompt:**

Create a dynamic, **artsy and flexible marquee component** for my website **AND a corresponding feed page** with the following specifications:

---

## **PART 1: MARQUEE - "Mini Hero"**

**Marquee Behavior:**
1. Display content items that slide from right to left continuously
2. After each item completes its slide-left animation, trigger a transition effect:
   - If there's a next item: slide UP to reveal it
   - If it's the last item: slide DOWN to loop back to the first item
3. The slide-up/slide-down transitions should be smooth and distinct from the horizontal scrolling

**Content Requirements:**

Create **4 different marquee content items** with the following themes:

1. **Prayer Times (API-based)**
   - Fetch from prayer times API
   - Show current prayer info and countdown
   
2. **Text with Panoramic Background**
   - Artistic text overlay on panoramic image
   - Horizontal scrolling background effect

3. **Pure Panoramic Background**
   - Full panoramic visual experience
   - No text, just imagery

4. **Text with Emoji and Shaped Pictures**
   - Creative typography with emojis
   - Mix of square and circle images
   - Modern, playful aesthetic

**Important:** Generate your own creative content, styling, and implementation details for each theme. These are just the general concepts - you have full creative freedom on the specifics.

---

## **PART 2: FEED PAGE (feed.html) - "Real Hero"**

**CRITICAL REQUIREMENT - Multiple Heroes with Slides:**

The feed page must have **4 hero sections** (one for each marquee content type), and **EACH hero must contain multiple slides** that can be navigated horizontally.

**Structure:**
```
Feed Page (Vertical Scroll):
├── Hero Section 1: Prayer Times
│   ├── Slide 1
│   ├── Slide 2
│   ├── Slide 3
│   └── Slide 4
│   └── [Navigation: Previous/Next buttons, Dots indicator]
│
├── Hero Section 2: Text + Panorama
│   ├── Slide 1
│   ├── Slide 2
│   └── Slide 3
│   └── [Navigation: Previous/Next buttons, Dots indicator]
│
├── Hero Section 3: Pure Panorama
│   ├── Slide 1
│   ├── Slide 2
│   └── Slide 3
│   └── [Navigation: Previous/Next buttons, Dots indicator]
│
└── Hero Section 4: Emoji & Shapes
    ├── Slide 1
    ├── Slide 2
    └── Slide 3
    └── [Navigation: Previous/Next buttons, Dots indicator]
```

**Each Hero Section Requirements:**

1. **Full-screen or large hero layout**
2. **3-5 slides** within each hero (you decide the exact number and content)
3. **Horizontal slide navigation:**
   - Previous/Next buttons
   - Dot indicators showing current slide
   - Auto-play option (slides advance automatically)
   - Pause on hover
   - Swipe gestures for mobile
4. **Smooth transitions** between slides
5. **Each slide is a full, complete presentation** - much more detailed than marquee
6. **Section ID** for deep linking from marquee (#prayer-times, #feature-2, etc.)

**Feed Page Navigation:**

- **Vertical scrolling** between hero sections
- **Horizontal sliding** within each hero section
- **URL hash support** - clicking marquee navigates to specific hero section
- **Smooth scroll behavior** to target section on page load
- **Section indicators** (side dots/navigation showing which hero you're viewing)
- **Back button** to return to previous page

**Creative Freedom:**

You have full freedom to decide:
- What each slide contains (as long as it relates to the theme)
- How many slides per hero (3-5 recommended)
- Visual design and animations
- Layout and styling
- Interactive elements
- Content details

---

## **SHARED DATA STRUCTURE:**

**File: `js/marquee-data.js`**

Create a data structure that supports:
- 4 content items for the marquee
- Each content item has a corresponding feed section
- Each feed section contains multiple slides (3-5 slides each)
- Include necessary metadata (IDs, hashes, titles, etc.)

**Example structure concept** (you implement the details):

```javascript
export const contentData = [
  { 
    id: 1, 
    type: "prayer-times",
    hash: "prayer-times",
    marquee: {
      // Marquee-specific data
    },
    feed: {
      title: "Complete Prayer Schedule",
      slides: [
        { /* slide 1 data */ },
        { /* slide 2 data */ },
        { /* slide 3 data */ },
        { /* slide 4 data */ }
      ]
    }
  },
  // ... 3 more content items with similar structure
];
```

---

## **TECHNICAL REQUIREMENTS:**

**For Both Pages:**
- Use vanilla JavaScript with ES6 modules
- Share the same data structure (`js/marquee-data.js`)
- Consistent design language and color scheme
- Smooth animations and transitions throughout
- Full responsive design (mobile, tablet, desktop)
- Modern CSS (Grid, Flexbox, Custom Properties, Tailwind CSS)
- Error handling for API calls
- Loading states
- Performance optimized

**Marquee Page:**
- Compact, attention-grabbing presentations
- Auto-cycling through 4 content items
- Click handlers that navigate to `feed.html#hash`
- Pause on hover

**Feed Page:**
- 4 full hero sections (vertical scroll between them)
- Each hero has 3-5 slides (horizontal navigation within each)
- URL hash detection and auto-scroll to correct hero section
- Slide carousel functionality within each hero
- Smooth scroll between hero sections
- Scroll animations (fade-in, slide-in effects)
- Intersection Observer for scroll-triggered animations

---

## **DELIVERABLES:**

Please provide these files ONLY (no redundant files):

1. **marquee.html** - Complete marquee page (NEW FILE)
2. **feed.html** - Complete feed page with multiple heroes, each with slides (NEW FILE)
3. **src/styles/_marquee.css** - All styles for both marquee and feed pages (NEW FILE)
4. **js/marquee-data.js** - Shared data structure with slide content (NEW FILE)
5. **js/marquee-main.js** - Marquee page entry point (NEW FILE)
6. **js/marquee-ui.js** - Marquee UI logic (NEW FILE)
7. **js/feed-main.js** - Feed page entry point (NEW FILE)
8. **js/feed-ui.js** - Feed page UI logic including carousel/slide functionality (NEW FILE)
9. **README.md** - Instructions for usage and customization (NEW FILE)

**IMPORTANT - Integration with Existing Codebase:**

- **DO NOT create** `styles.css` or `style.css` - use existing CSS structure in `src/styles/`
- **DO NOT create** `script.js` - use existing modular JS structure in `js/`
- **DO NOT create** `index.html` - this is separate from the main site
- **DO create** new HTML files: `marquee.html` and `feed.html`
- **DO create** new CSS file: `src/styles/_marquee.css` (import it in `src/styles/main.css`)
- **DO create** new JS files following existing naming pattern: `*-main.js` and `*-ui.js`
- **DO use** existing CSS variables from `src/styles/_variables.css`
- **DO use** existing utility functions from `js/utils.js` if available
- **DO integrate** with existing dark mode implementation
- **DO use** Tailwind CSS classes where appropriate
- **DO follow** existing code patterns and conventions

---

## **CSS INTEGRATION INSTRUCTIONS:**

**Step 1: Add the import to `src/styles/main.css`**

After the existing imports, add:
```css
/* Import Marquee & Feed Styles */
@import './_marquee.css';
```

**Step 2: Use existing CSS variables**

In `src/styles/_marquee.css`, use the existing CSS variables from `src/styles/_variables.css`:
- `--color-paper`, `--color-ink`, `--color-white`, `--color-gray-600`, etc.
- `--gradient-squircle`, `--gradient-profile`, etc.
- `--radius-card`, `--radius-pill`, etc.
- `--shadow-card`, `--shadow-button`, etc.
- `--transition-fast`, `--transition-normal`, etc.

**Step 3: Dark mode support**

Add dark mode styles using the existing `.dark` class pattern:
```css
.dark .marquee-component {
  /* Dark mode styles */
}
```

---

## **HTML PAGE STRUCTURE:**

**Both `marquee.html` and `feed.html` should follow this pattern:**

```html
<!doctype html>
<html lang="en" class="scroll-smooth">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DAARUSSALAAM — Marquee</title> <!-- or Feed -->
    <link rel="icon" type="image/x-icon" href="images/favicon.png" />

    <!-- Tailwind CSS - Compiled for Production -->
    <link rel="stylesheet" href="dist/output.css" />

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Spectral:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>

  <body class="py-10 px-5">
    <div class="paper-sheet max-w-4xl mx-auto bg-white shadow-lg px-6 py-10 sm:px-12 sm:py-16 lg:px-20 lg:py-20 mb-16">
      <!-- Your marquee or feed content here -->
    </div>

    <script type="module" src="js/marquee-main.js"></script> <!-- or feed-main.js -->
  </body>
</html>
```

---

## **JAVASCRIPT MODULE STRUCTURE:**

**Follow this pattern:**

**`js/marquee-main.js`** (Entry point):
```javascript
import { initMarqueeUI } from './marquee-ui.js';

document.addEventListener('DOMContentLoaded', () => {
  initMarqueeUI();
});
```

**`js/marquee-ui.js`** (UI logic):
```javascript
import { contentData } from './marquee-data.js';

export function initMarqueeUI() {
  // Your marquee UI logic here
}
```

**`js/feed-main.js`** (Entry point):
```javascript
import { initFeedUI } from './feed-ui.js';

document.addEventListener('DOMContentLoaded', () => {
  initFeedUI();
});
```

**`js/feed-ui.js`** (UI logic - must include carousel functionality):
```javascript
import { contentData } from './marquee-data.js';

export function initFeedUI() {
  // Initialize all hero sections
  // Implement carousel/slide functionality for each hero
  // Handle URL hash navigation
  // Handle scroll animations
}
```

---

## **KEY FEATURES TO IMPLEMENT:**

**Marquee Page:**
- ✅ 4 rotating content items
- ✅ Slide left + slide up/down transitions
- ✅ Click to navigate to feed page with hash
- ✅ Auto-play with pause on hover

**Feed Page:**
- ✅ 4 full-screen/large hero sections (vertical scroll)
- ✅ **Each hero has 3-5 slides (horizontal carousel)**
- ✅ **Previous/Next buttons for slides**
- ✅ **Dot indicators for current slide**
- ✅ **Auto-play slides with pause on hover**
- ✅ **Swipe gestures for mobile**
- ✅ URL hash navigation to specific hero
- ✅ Smooth scroll between heroes
- ✅ Section indicators for vertical navigation
- ✅ Back button to return

---

**Code should include:**
- Comprehensive comments explaining each section
- Clean, organized structure
- Reusable components/functions
- Examples of how to extend functionality
- Integration with existing dark mode toggle

**Focus on the big picture - no redundant files, follow existing project structure, and ensure each hero section has its own working carousel/slide system.**