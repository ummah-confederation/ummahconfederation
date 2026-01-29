# DAARUSSALAAM Codebase Refactoring Prompt

## Project Overview
DAARUSSALAAM is a document management and library system for Islamic governance documents. The system includes:
- **Index page** (`index.html`) - Registry of items, institutions, and jurisdictions with filtering
- **Library page** (`library.html`) - Sortable, filterable document listing
- **Document pages** (`book1.html`, etc.) - Individual document content with metadata
- **JavaScript loader** (`index.js`) - Dynamically extracts metadata and builds registries

## Current Architecture

### File Structure
```
/
├── index.html          # Main registry/index page
├── library.html        # Document library with filtering & sorting
├── index.js            # Metadata extraction & registry builder
├── styles.css          # Shared styles (not provided)
├── book1.html          # Example document
├── book[0-6].html      # Book documents
├── policy[1-3].html    # Policy documents
├── decision1.html      # Decision document
└── images/
    ├── admin-seal.png
    └── favicon.png
```

### Current Features
1. **Dynamic Registry Building** - Extracts Items, Institutions, and Jurisdictions from documents
2. **Filtering System** - URL parameters for item/institution/jurisdiction filters
3. **Sorting System** - Sort by title, version, or date
4. **Metadata Structure** - Each document contains: Title, Institution, Jurisdiction, Version, Date

### Current Technical Stack
- Pure HTML/CSS/JavaScript (no frameworks)
- Client-side rendering
- Inline scripts and styles
- Manual metadata hardcoding in library.html

## Problems to Solve

### 1. **Data Duplication**
- Document metadata is hardcoded in both:
  - Individual document files (book1.html, etc.)
  - Library listing (library.html)
- Any update requires changing multiple files
- High risk of inconsistency

### 2. **Scalability Issues**
- Adding new documents requires:
  - Creating HTML file
  - Adding to documents array in index.js
  - Adding hardcoded row in library.html
- No single source of truth

### 3. **Maintainability**
- Inline scripts in library.html
- Mixed concerns (data + presentation)
- No separation of configuration
- Character encoding issues (â€" instead of —)

### 4. **Limited Metadata Extraction**
- Current regex parsing is fragile
- Only extracts: Institution, Jurisdiction
- Title extraction from h2 is unreliable
- Version and Date not extracted (hardcoded in library)

### 5. **Poor Code Organization**
- No modular structure
- Duplicate logic between pages
- Hard to test or extend

## Refactoring Goals

### Primary Objectives
1. **Single Source of Truth** - Centralize all document metadata
2. **DRY Principle** - Eliminate all data duplication
3. **Maintainability** - Make adding/editing documents trivial
4. **Robustness** - Better metadata extraction and validation
5. **Modern Structure** - Separate data, logic, and presentation

### Secondary Objectives
6. **Progressive Enhancement** - Works without JavaScript (where possible)
7. **Accessibility** - Semantic HTML, ARIA labels
8. **Performance** - Efficient loading and filtering
9. **Extensibility** - Easy to add new document types and metadata fields

## Proposed Solution Architecture

### Option A: JSON Configuration File (Recommended)
**Best for: Immediate improvement with minimal changes**

```javascript
// documents-config.json
{
  "documents": [
    {
      "id": "book1",
      "filename": "book1.html",
      "title": "Book I — The Constitution",
      "item": "Book",
      "institution": "Ummah Cabinet",
      "jurisdiction": "Ummah Cabinet Members [Profession]",
      "version": 2,
      "date": "2026-01-25T06:00:00",
      "visible": true
    },
    // ... more documents
  ]
}
```

**Advantages:**
- Single source of truth
- Easy to edit
- Can be validated
- Enables build scripts
- API-ready

**Implementation:**
1. Create JSON config file
2. Load config in both index.js and library page
3. Generate all lists/tables dynamically
4. Documents still contain metadata for standalone viewing

### Option B: Enhanced HTML Metadata Extraction
**Best for: Keeping everything in HTML**

Add structured metadata to each document:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "GovernmentDocument",
  "name": "Book I — The Constitution",
  "item": "Book",
  "institution": "Ummah Cabinet",
  "jurisdiction": "Ummah Cabinet Members [Profession]",
  "version": 2,
  "dateModified": "2026-01-25T06:00:00"
}
</script>
```

**Advantages:**
- Metadata stays with content
- Standard format (JSON-LD)
- SEO benefits
- Easy to parse

**Implementation:**
1. Add JSON-LD to each document
2. Fetch and parse in index.js
3. Generate registry and library dynamically

### Option C: Build-Time Generation (Advanced)
**Best for: Long-term scalability**

Use a static site generator or build script:

```javascript
// build.js
const documents = require('./documents-config.json');

function generateLibrary(documents) {
  // Generate library.html from template
}

function generateIndex(documents) {
  // Generate index.html from template
}
```

**Advantages:**
- Zero runtime overhead
- Type safety
- Validation at build time
- Template-based generation

## Detailed Refactoring Steps

### Phase 1: Immediate Improvements (No Architecture Change)

#### Step 1.1: Fix Character Encoding
```html
<!-- Change all instances of â€" to — -->
<!-- Ensure UTF-8 meta tag is present -->
<meta charset="UTF-8" />
```

#### Step 1.2: Extract Inline Scripts
Move library.html inline scripts to separate file:
```javascript
// library.js
export function initializeLibrary() {
  // Filtering logic
  // Sorting logic
  // Context display
}
```

#### Step 1.3: Create Shared Utilities
```javascript
// utils.js
export function parseQueryParams() { ... }
export function formatDate(dateString) { ... }
export function sortByField(array, field) { ... }
```

### Phase 2: Implement Single Source of Truth

#### Step 2.1: Create Central Configuration
Choose Option A (JSON) or Option B (JSON-LD)

#### Step 2.2: Update index.js
```javascript
// Load from config instead of hardcoded array
async function loadDocumentsConfig() {
  const response = await fetch('documents-config.json');
  const config = await response.json();
  return config.documents;
}

// Generate all registries from config
async function buildRegistries() {
  const documents = await loadDocumentsConfig();
  
  const items = new Set();
  const institutions = new Set();
  const jurisdictions = new Set();
  
  documents.forEach(doc => {
    items.add(doc.item);
    institutions.add(doc.institution);
    jurisdictions.add(doc.jurisdiction);
  });
  
  renderList('item-list', items);
  renderList('institution-list', institutions);
  renderList('jurisdiction-list', jurisdictions);
}
```

#### Step 2.3: Generate Library Table Dynamically
```javascript
// library-generator.js
async function generateLibraryTable() {
  const documents = await loadDocumentsConfig();
  const params = parseQueryParams();
  
  const filtered = filterDocuments(documents, params);
  const sorted = sortDocuments(filtered, defaultSort);
  
  renderLibraryRows(sorted);
}

function renderLibraryRows(documents) {
  const container = document.getElementById('library');
  
  documents.forEach(doc => {
    const row = createLibraryRow(doc);
    container.appendChild(row);
  });
}

function createLibraryRow(doc) {
  const row = document.createElement('div');
  row.className = 'library-row';
  row.dataset.name = doc.title;
  row.dataset.version = doc.version;
  row.dataset.date = doc.date;
  row.dataset.item = doc.item;
  row.dataset.institution = doc.institution;
  row.dataset.jurisdiction = doc.jurisdiction;
  
  // Create child elements
  // ...
  
  return row;
}
```

### Phase 3: Enhanced Metadata Management

#### Step 3.1: Metadata Validation
```javascript
// validator.js
export function validateDocument(doc) {
  const required = ['id', 'filename', 'title', 'item', 'institution', 
                    'jurisdiction', 'version', 'date'];
  
  for (const field of required) {
    if (!doc[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Validate date format
  if (!isValidDate(doc.date)) {
    throw new Error(`Invalid date format: ${doc.date}`);
  }
  
  // Validate version is number
  if (!Number.isInteger(doc.version)) {
    throw new Error(`Version must be integer: ${doc.version}`);
  }
  
  return true;
}
```

#### Step 3.2: Add Metadata to Documents
For each HTML document, add consistent metadata section:

```html
<!-- Standardized metadata block -->
<div class="document-metadata" data-document-id="book1">
  <p><strong>Institution:</strong> <span data-field="institution">Ummah Cabinet</span></p>
  <p><strong>Jurisdiction:</strong> <span data-field="jurisdiction">Ummah Cabinet Members [Profession]</span></p>
  <p><strong>Version:</strong> <span data-field="version">2</span></p>
  <p><strong>Date:</strong> <span data-field="date">25/01/2026 | 06:00</span></p>
</div>
```

### Phase 4: Code Organization

#### Step 4.1: Module Structure
```
/js
├── config/
│   └── documents-config.json
├── modules/
│   ├── document-loader.js    # Fetch and parse documents
│   ├── metadata-extractor.js # Extract metadata
│   ├── registry-builder.js   # Build index registries
│   ├── library-generator.js  # Generate library table
│   ├── filter-manager.js     # Handle filtering
│   ├── sort-manager.js       # Handle sorting
│   └── validator.js          # Validate metadata
├── utils/
│   ├── dom-helpers.js        # DOM manipulation
│   ├── date-helpers.js       # Date formatting
│   └── url-helpers.js        # Query params
├── index.js                  # Entry point for index page
└── library.js                # Entry point for library page
```

#### Step 4.2: Main Entry Points
```javascript
// index.js
import { loadDocumentsConfig } from './modules/document-loader.js';
import { buildRegistries } from './modules/registry-builder.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const documents = await loadDocumentsConfig();
    await buildRegistries(documents);
  } catch (error) {
    console.error('Failed to load documents:', error);
    showError('Unable to load document registry');
  }
});
```

```javascript
// library.js
import { loadDocumentsConfig } from './modules/document-loader.js';
import { generateLibraryTable } from './modules/library-generator.js';
import { initializeFilters } from './modules/filter-manager.js';
import { initializeSorting } from './modules/sort-manager.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const documents = await loadDocumentsConfig();
    await generateLibraryTable(documents);
    initializeFilters(documents);
    initializeSorting();
  } catch (error) {
    console.error('Failed to load library:', error);
    showError('Unable to load document library');
  }
});
```

### Phase 5: Advanced Features

#### Step 5.1: Search Functionality
```javascript
// search-manager.js
export function initializeSearch(documents) {
  const searchInput = document.getElementById('search-input');
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = documents.filter(doc => 
      doc.title.toLowerCase().includes(query) ||
      doc.institution.toLowerCase().includes(query) ||
      doc.jurisdiction.toLowerCase().includes(query)
    );
    
    renderSearchResults(filtered);
  });
}
```

#### Step 5.2: Versioning System
```javascript
// version-manager.js
export function getLatestVersions(documents) {
  const grouped = documents.reduce((acc, doc) => {
    const baseTitle = doc.title.split('—')[0].trim();
    if (!acc[baseTitle] || doc.version > acc[baseTitle].version) {
      acc[baseTitle] = doc;
    }
    return acc;
  }, {});
  
  return Object.values(grouped);
}

export function getVersionHistory(documents, documentId) {
  const baseId = documentId.replace(/v\d+$/, '');
  return documents
    .filter(doc => doc.id.startsWith(baseId))
    .sort((a, b) => b.version - a.version);
}
```

#### Step 5.3: Export Functionality
```javascript
// export-manager.js
export function exportToCSV(documents) {
  const headers = ['Title', 'Item', 'Institution', 'Jurisdiction', 'Version', 'Date'];
  const rows = documents.map(doc => [
    doc.title,
    doc.item,
    doc.institution,
    doc.jurisdiction,
    doc.version,
    doc.date
  ]);
  
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  downloadFile('documents.csv', csv, 'text/csv');
}
```

## Testing Strategy

### Unit Tests
```javascript
// tests/metadata-extractor.test.js
import { extractMetadata } from '../modules/metadata-extractor.js';

describe('Metadata Extractor', () => {
  it('should extract institution from paragraph', () => {
    const html = '<p>Institution : Ummah Cabinet</p>';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const metadata = extractMetadata(doc);
    expect(metadata.institution).toBe('Ummah Cabinet');
  });
  
  // More tests...
});
```

### Integration Tests
```javascript
// tests/library.integration.test.js
describe('Library Page', () => {
  it('should load and display all documents', async () => {
    const documents = await loadDocumentsConfig();
    await generateLibraryTable(documents);
    
    const rows = document.querySelectorAll('.library-row:not(.library-header)');
    expect(rows.length).toBe(documents.length);
  });
  
  it('should filter by institution', async () => {
    const documents = await loadDocumentsConfig();
    await generateLibraryTable(documents);
    
    applyFilter('institution', 'Ummah Cabinet');
    
    const visibleRows = document.querySelectorAll('.library-row:not([style*="display: none"])');
    expect(visibleRows.length).toBeLessThan(documents.length);
  });
});
```

## Migration Path

### Step-by-Step Migration
1. **Backup** - Create backup of all files
2. **Character Encoding** - Fix all â€" → — issues
3. **Create Config** - Build documents-config.json from existing data
4. **Extract Scripts** - Move inline scripts to separate files
5. **Test** - Verify existing functionality works
6. **Dynamic Generation** - Implement config-based rendering
7. **Test** - Verify parity with old system
8. **Remove Hardcoding** - Delete hardcoded library rows
9. **Test** - Full integration testing
10. **Deploy** - Replace old files with new system

### Rollback Plan
Keep old files as `.bak` for easy rollback if issues arise.

## Documentation Updates Needed

1. **README.md** - Project overview and setup
2. **CONTRIBUTING.md** - How to add new documents
3. **documents-config-schema.json** - JSON schema for validation
4. **API.md** - If adding API endpoints later
5. **CHANGELOG.md** - Track all changes

## Performance Considerations

### Current Performance
- All documents loaded on page load (wasteful)
- No caching
- Multiple DOM manipulations

### Optimizations
1. **Lazy Loading** - Load documents on demand
2. **Caching** - Cache parsed metadata
3. **Virtual Scrolling** - For large document lists
4. **Web Workers** - Parse documents in background
5. **Service Worker** - Offline support and caching

## Security Considerations

1. **Input Validation** - Sanitize all query parameters
2. **XSS Prevention** - Escape all user-provided content
3. **Content Security Policy** - Add CSP headers
4. **HTTPS Only** - Enforce secure connections

## Accessibility Improvements

1. **Semantic HTML** - Use proper heading hierarchy
2. **ARIA Labels** - Add labels to interactive elements
3. **Keyboard Navigation** - Ensure full keyboard access
4. **Screen Reader** - Test with screen readers
5. **Focus Management** - Proper focus indicators

## Example: Complete Refactored Structure

```javascript
// documents-config.json
{
  "version": "1.0.0",
  "lastUpdated": "2026-01-29",
  "documents": [
    {
      "id": "book0",
      "filename": "book0.html",
      "title": "Book 0 — How to Read Revelation and History",
      "item": "Book",
      "institution": "Ummah Cabinet",
      "jurisdiction": "Ummah Cabinet Members [Profession]",
      "version": 1,
      "date": "2026-01-28T09:00:00",
      "dateFormatted": "28 Jan 2026 | 09:00",
      "visible": true,
      "tags": ["revelation", "history", "methodology"]
    }
    // ... all other documents
  ],
  "metadata": {
    "items": ["Book", "Policy", "Decision"],
    "institutions": [
      "Ummah Cabinet",
      "Ummah Governance",
      "Ummah Federal Government",
      "Ummah Personal Counselor"
    ],
    "jurisdictions": [
      "Ummah Cabinet Members [Profession]",
      "General Public [Community]",
      "Ummah Governance Members [Profession]",
      "Ummah Federal Government Members [Profession]",
      "Fathan T. Husna [Individual]"
    ]
  }
}
```

## Next Steps After Refactoring

1. **Backend Integration** - Add API for document management
2. **CMS** - Admin interface for editing documents
3. **Version Control** - Track document changes over time
4. **Search Engine** - Full-text search across all documents
5. **PDF Generation** - Export documents as PDF
6. **Multi-language** - Support multiple languages
7. **Mobile App** - Native mobile application
8. **Analytics** - Track document usage and engagement

## Questions to Answer Before Starting

1. **Deployment environment?** - Static hosting, server, CDN?
2. **Browser support?** - Modern browsers only, or legacy support?
3. **Build process?** - Willing to add Node.js/npm build step?
4. **Team size?** - Solo developer or team collaboration?
5. **Update frequency?** - How often are documents added/modified?
6. **Future features?** - What features are planned for later?

## Recommended Approach for This Project

Based on the current codebase, I recommend:

**Phase 1 (Week 1):**
- Create `documents-config.json`
- Extract inline scripts to `library.js`
- Fix character encoding issues
- Test that nothing breaks

**Phase 2 (Week 2):**
- Implement dynamic library generation from config
- Remove hardcoded library rows
- Add validation
- Thorough testing

**Phase 3 (Week 3):**
- Modularize code into separate files
- Add search functionality
- Improve error handling
- Documentation

**Phase 4 (Future):**
- Advanced features as needed
- Performance optimization
- Additional document types

This approach provides immediate benefits while allowing for incremental improvement without disrupting the existing system.

---

## Conclusion

This refactoring will:
✅ Eliminate data duplication  
✅ Make the system maintainable  
✅ Enable easy addition of new documents  
✅ Improve code quality and organization  
✅ Provide foundation for future features  

The key is starting with a single source of truth (documents-config.json) and building everything else from that foundation.
