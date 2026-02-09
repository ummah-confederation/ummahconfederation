# Implementation Prompt: Update Metadata Display on Profile Pages

## Task Overview

Update the metadata display for content items on Institution Profile and Jurisdiction Profile pages only. The Content tab library view must remain unchanged.

## Current Behavior

On both Institution Profile and Jurisdiction Profile pages, each content item displays:
```
Title | Version | Updated Date
```

This is rendered by the `createLibraryRow(doc)` function in `js/library-ui.js` (lines 20-54).

## Required Changes

### Institution Profile Page
Replace the metadata display with:
```
Title | Posted in {Jurisdiction Name}
```

- `{Jurisdiction Name}` should come from the `doc.jurisdiction` field of each document
- Example: "Book I — The Constitution | Posted in Ummah Cabinet Members [Team Space]"

### Jurisdiction Profile Page
Replace the metadata display with:
```
Title | Posted by {Institution Name}
```

- `{Institution Name}` should come from the `doc.institution` field of each document
- Example: "Book I — The Constitution | Posted by Ummah Cabinet [Non-Profit • Private]"

## Implementation Details

### 1. Detect Profile Mode Context

Use the `detectProfileMode()` function from `js/profile-ui.js` to determine the current page context:

```javascript
import { detectProfileMode } from './profile-ui.js';

const profileInfo = detectProfileMode();
// Returns: { type: 'institution', name: '...' } or { type: 'jurisdiction', name: '...' } or null
```

### 2. Modify `createLibraryRow()` Function

Update the `createLibraryRow(doc)` function in `js/library-ui.js` to conditionally render metadata based on profile mode:

**Current implementation** (lines 20-54):
```javascript
function createLibraryRow(doc) {
  const row = document.createElement('div');
  row.className = 'library-row sm:grid sm:grid-cols-[1fr_120px_140px] gap-4 items-baseline border-b border-gray-200 py-2';
  row.dataset.name = doc.title;
  row.dataset.version = doc.version;
  row.dataset.date = doc.date;
  row.dataset.item = doc.item;
  row.dataset.institution = doc.institution;
  row.dataset.jurisdiction = doc.jurisdiction;

  // Title cell with link
  const titleCell = document.createElement('span');
  titleCell.className = 'overflow-hidden text-ellipsis whitespace-nowrap';
  const link = document.createElement('a');
  link.href = doc.filename;
  link.textContent = doc.title;
  link.className = 'block overflow-hidden text-ellipsis whitespace-nowrap';
  titleCell.appendChild(link);

  // Version cell
  const versionCell = document.createElement('span');
  versionCell.className = 'library-version text-center tabular-nums';
  versionCell.innerHTML = `<span class="sm:hidden text-base">Version </span>${doc.version}`;

  // Date cell
  const dateCell = document.createElement('span');
  dateCell.className = 'library-date text-right whitespace-nowrap';
  dateCell.textContent = doc.dateFormatted;

  row.appendChild(titleCell);
  row.appendChild(versionCell);
  row.appendChild(dateCell);

  return row;
}
```

**Required changes:**

1. Import `detectProfileMode` at the top of `js/library-ui.js`:
```javascript
import { detectProfileMode } from './profile-ui.js';
```

2. Modify `createLibraryRow(doc)` to:
   - Detect profile mode at the start of the function
   - Conditionally render metadata based on profile type
   - Keep the default behavior (Title | Version | Date) when not in profile mode

3. Update the row's grid layout class to accommodate the new metadata format:
   - For profile mode: Use a 2-column layout (Title | Posted in/by)
   - For non-profile mode: Keep the existing 3-column layout (Title | Version | Date)

4. Update the header row in `renderLibraryTable()` function (lines 60-90) to match the new column structure when in profile mode

### 3. Data Fields to Use

- **Jurisdiction Name**: Use `doc.jurisdiction` (full jurisdiction name, e.g., "General Public [Community]")
- **Institution Name**: Use `doc.institution` (full institution name, e.g., "Ummah Cabinet [Non-Profit • Private]")

These fields are already available in the document object and are already stored as dataset attributes on the row element.

{"display": "none;"}

### 5. Mobile Responsiveness

Ensure the new metadata display works correctly on mobile devices:
- Mobile currently uses card-style rows (see `library.html` lines 150-169)
- The "Posted in/by" metadata should display below the title on mobile
- Use the existing mobile styling pattern with `sm:hidden` prefix for mobile-specific labels

## Files to Modify

1. **js/library-ui.js** - Primary file to modify:
   - Import `detectProfileMode` from `profile-ui.js`
   - Update `createLibraryRow()` function
   - Update `renderLibraryTable()` function for header row

2. **library.html** - May need minor updates to header row structure if necessary

## Testing Checklist

After implementation, verify:

1. **Institution Profile Page** (e.g., `library.html?institution=Ummah Cabinet [Non-Profit • Private]`):
   - Each item displays: "Title | Posted in {Jurisdiction Name}"
   - Jurisdiction name is correctly extracted from `doc.jurisdiction`

2. **Jurisdiction Profile Page** (e.g., `library.html?jurisdiction=General Public [Community]`):
   - Each item displays: "Title | Posted by {Institution Name}"
   - Institution name is correctly extracted from `doc.institution`

3. **Content Tab Library** (e.g., `library.html` or `library.html?item=Book`):
   - Each item displays: "Title | Version | Updated Date" (unchanged)
   - No profile-specific metadata is shown

4. **Mobile Responsiveness**:
   - All three views work correctly on mobile devices
   - Card-style layout is preserved on mobile

5. **Sorting and Filtering**:
   - Sort buttons still work correctly in non profile
   - Profile filter pills still work correctly
   - All existing functionality is preserved



### NB. Hide Sort Controls in Profile Mode

Identify where the Sort button / sorting UI is rendered (likely in `library-ui.js` or `library.html`).

When `detectProfileMode()` returns a non-null value:

* Do **one** of the following (prefer existing patterns):

  * Do not render the Sort button at all
  * OR apply a class such as `hidden` / `display: none`
* Prevent sort event listeners from initializing in profile mode

Sorting must remain unchanged when `profileInfo === null`.

---