# Library Non-Profile Mode Changes Plan

## Overview
This plan outlines the changes needed to modify the library page in non-profile mode to display "Posted In" and "Posted By" columns instead of "Version" and "Updated Date", along with corresponding sorting functionality.

## Current State

### Non-Profile Mode Display
The library currently shows 3 columns in non-profile mode:
1. **Title** - Document title with link
2. **Version** - Document version number
3. **Updated Date** - Formatted date string

### Current Sort Buttons
Located in [`library.html`](library.html:74-87):
- **Title** - Sorts alphabetically by document title
- **Version** - Sorts by version number (descending), then by date
- **Date** - Sorts by date (newest first)

## Proposed Changes

### 1. Update Sort Buttons in library.html

**File:** [`library.html`](library.html:74-87)

**Current:**
```html
<div class="sort-controls">
  <button data-sort="name" class="sort-btn active">
    Title
  </button>
  <button data-sort="version" class="sort-btn">
    Version
  </button>
  <button data-sort="date" class="sort-btn">
    Date
  </button>
</div>
```

**Proposed:**
```html
<div class="sort-controls">
  <button data-sort="name" class="sort-btn active">
    Title
  </button>
  <button data-sort="postedIn" class="sort-btn">
    Posted In
  </button>
  <button data-sort="postedBy" class="sort-btn">
    Posted By
  </button>
</div>
```

### 2. Update Table Header in library.html

**File:** [`library.html`](library.html:92-96)

**Current:**
```html
<div class="library-row library-header hidden sm:grid sm:grid-cols-[1fr_120px_140px] gap-4 items-baseline text-left font-bold border-b border-black pb-1 mb-3">
  <span class="overflow-hidden text-ellipsis whitespace-nowrap">Title</span>
  <span class="text-center tabular-nums">Version</span>
  <span class="text-right whitespace-nowrap">Updated Date</span>
</div>
```

**Proposed:**
```html
<div class="library-row library-header hidden sm:grid sm:grid-cols-[1fr_140px_140px] gap-4 items-baseline text-left font-bold border-b border-black pb-1 mb-3">
  <span class="overflow-hidden text-ellipsis whitespace-nowrap">Title</span>
  <span class="text-center whitespace-nowrap">Posted In</span>
  <span class="text-right whitespace-nowrap">Posted By</span>
</div>
```

### 3. Update createLibraryRow Function in js/library-ui.js

**File:** [`js/library-ui.js`](js/library-ui.js:76-91)

**Current non-profile mode logic:**
```javascript
} else {
  // Non-profile mode: Show version and date (default behavior)
  const versionCell = document.createElement("span");
  versionCell.className = "library-version text-center text-sm tabular-nums";
  versionCell.innerHTML = `<span class="sm:hidden text-sm">Version </span>${doc.version}`;

  const dateCell = document.createElement("span");
  dateCell.className = "library-date text-right whitespace-nowrap";
  dateCell.textContent = doc.dateFormatted;

  row.appendChild(titleCell);
  row.appendChild(versionCell);
  row.appendChild(dateCell);

  return row;
}
```

**Proposed:**
```javascript
} else {
  // Non-profile mode: Show Posted In (jurisdiction) and Posted By (institution)
  const postedInCell = document.createElement("span");
  postedInCell.className = "library-posted-in text-center text-sm whitespace-nowrap overflow-hidden text-ellipsis";
  const jurisdictionName = (doc.jurisdiction || "").replace(/\s*\[.*?\]\s*/g, "");
  const jurisdictionLink = doc.jurisdiction ? `?jurisdiction=${encodeURIComponent(doc.jurisdiction)}` : "#";
  postedInCell.innerHTML = `<a href="${escapeHtml(jurisdictionLink)}" class="library-profile-link">${escapeHtml(jurisdictionName) || "-"}</a>`;

  const postedByCell = document.createElement("span");
  postedByCell.className = "library-posted-by text-right whitespace-nowrap overflow-hidden text-ellipsis";
  const institutionName = (doc.institution || "").replace(/\s*\[.*?\]\s*/g, "");
  const institutionLink = doc.institution ? `?institution=${encodeURIComponent(doc.institution)}` : "#";
  postedByCell.innerHTML = `<a href="${escapeHtml(institutionLink)}" class="library-profile-link">${escapeHtml(institutionName) || "-"}</a>`;

  row.appendChild(titleCell);
  row.appendChild(postedInCell);
  row.appendChild(postedByCell);

  return row;
}
```

### 4. Update renderLibraryTable Header in js/library-ui.js

**File:** [`js/library-ui.js`](js/library-ui.js:139-148)

**Current:**
```javascript
} else {
  // Non-profile mode header
  const gridClass = "library-grid-default";
  headerHTML = `
<div class="library-row library-header ${gridClass} gap-4 items-start text-left font-bold border-b border-black pb-1 mb-3">
  <span class="overflow-hidden text-ellipsis whitespace-nowrap">Title</span>
  <span class="text-center tabular-nums">Version</span>
  <span class="text-right whitespace-nowrap">Updated Date</span>
</div>`;
}
```

**Proposed:**
```javascript
} else {
  // Non-profile mode header
  const gridClass = "library-grid-default";
  headerHTML = `
<div class="library-row library-header ${gridClass} gap-4 items-start text-left font-bold border-b border-black pb-1 mb-3">
  <span class="overflow-hidden text-ellipsis whitespace-nowrap">Title</span>
  <span class="text-center whitespace-nowrap">Posted In</span>
  <span class="text-right whitespace-nowrap">Posted By</span>
</div>`;
}
```

### 5. Add New Sort Cases in js/utils.js

**File:** [`js/utils.js`](js/utils.js:71-91)

**Current sortDocuments function:**
```javascript
export function sortDocuments(documents, sortBy) {
  const sorted = [...documents];

  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));

    case 'version':
      return sorted.sort((a, b) => {
        const versionDiff = b.version - a.version;
        if (versionDiff !== 0) return versionDiff;
        return new Date(b.date) - new Date(a.date);
      });

    case 'date':
      return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));

    default:
      return sorted;
  }
}
```

**Proposed:**
```javascript
export function sortDocuments(documents, sortBy) {
  const sorted = [...documents];

  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));

    case 'postedIn':
      // Sort by jurisdiction name (without [type] suffix)
      return sorted.sort((a, b) => {
        const aJurisdiction = (a.jurisdiction || "").replace(/\s*\[.*?\]\s*/g, "");
        const bJurisdiction = (b.jurisdiction || "").replace(/\s*\[.*?\]\s*/g, "");
        return aJurisdiction.localeCompare(bJurisdiction);
      });

    case 'postedBy':
      // Sort by institution name (without [type] suffix)
      return sorted.sort((a, b) => {
        const aInstitution = (a.institution || "").replace(/\s*\[.*?\]\s*/g, "");
        const bInstitution = (b.institution || "").replace(/\s*\[.*?\]\s*/g, "");
        return aInstitution.localeCompare(bInstitution);
      });

    case 'version':
      // Keep for backward compatibility with profile mode
      return sorted.sort((a, b) => {
        const versionDiff = b.version - a.version;
        if (versionDiff !== 0) return versionDiff;
        return new Date(b.date) - new Date(a.date);
      });

    case 'date':
      // Keep for backward compatibility with profile mode
      return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));

    default:
      return sorted;
  }
}
```

## Files to Modify

| File | Changes |
|------|---------|
| [`library.html`](library.html) | Update sort buttons and table header |
| [`js/library-ui.js`](js/library-ui.js) | Update createLibraryRow and renderLibraryTable for non-profile mode |
| [`js/utils.js`](js/utils.js) | Add postedIn and postedBy sort cases |

## Behavior Summary

### Non-Profile Mode (After Changes)
- **Title** column: Document title with link to document
- **Posted In** column: Jurisdiction name (clickable, navigates to jurisdiction profile)
- **Posted By** column: Institution name (clickable, navigates to institution profile)

### Sort Behavior
- **Title**: Alphabetical A-Z
- **Posted In**: Alphabetical by jurisdiction name
- **Posted By**: Alphabetical by institution name

### Profile Mode (Unchanged)
Profile mode will continue to work as before:
- Institution profile: Shows Title and Posted In
- Jurisdiction profile: Shows Title and Posted By
- Sort controls are hidden in profile mode

## Implementation Notes

1. The `[type]` suffix removal logic (e.g., removing `[City]` from jurisdiction names) is already implemented in profile mode and will be reused
2. Both Posted In and Posted By cells will be clickable links that navigate to the respective profile pages
3. Empty values will display as "-" to maintain visual consistency
4. The grid layout classes remain the same (3-column layout)
