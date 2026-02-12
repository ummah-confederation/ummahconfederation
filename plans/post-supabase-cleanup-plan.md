# Post-Supabase Migration Cleanup Plan

## Overview

Now that the Supabase migration is complete and working, this plan identifies all files and code that can be safely removed. The migration has moved data from local JSON files and HTML pages to Supabase (PostgreSQL database + Storage).

---

## Files to Delete

### 1. Config JSON Files (Now in Supabase Database)

These JSON configuration files have been migrated to Supabase tables:

| File | Migrated To |
|------|-------------|
| [`config/documents-config.json`](config/documents-config.json) | `documents` table |
| [`config/institution-config.json`](config/institution-config.json) | `institutions` table |
| [`config/jurisdiction-config.json`](config/jurisdiction-config.json) | `jurisdictions` table |
| [`config/squircle-icons-config.json`](config/squircle-icons-config.json) | `squircle_icons` table |

**Action:** Delete entire `config/` directory

### 2. Static HTML Document Pages (Now in Supabase Database)

Document content is now stored in the `documents` table and served via [`document-viewer.html`](document-viewer.html):

| Directory | Files |
|-----------|-------|
| `pages/books/` | `book0.html` through `book6.html` (7 files) |
| `pages/decisions/` | `decision1.html` through `decision5.html` (5 files) |
| `pages/guidelines/` | `guideline1.html`, `guideline2.html` (2 files) |
| `pages/notes/` | `note1.html` (1 file) |
| `pages/policies/` | `policy1.html` through `policy4.html` (4 files) |
| `pages/verdicts/` | `verdict1.html` (1 file) |

**Action:** Delete all document HTML files (keep `pages/test-css.html` if still needed for testing)

### 3. Local Images (Now in Supabase Storage)

All images have been uploaded to the `ummah-images` storage bucket:

| Directory | Contents |
|-----------|----------|
| `images/institutions/` | Institution avatar images |
| `images/jurisdictions/` | Jurisdiction avatar images |
| `images/covers/` | Cover images |
| `images/carousel/` | Carousel images |
| `images/` (root) | Misc images: `admin-seal.webp`, `army-flag.webp`, `diplomatic-flag-*.webp`, `national-flag.webp`, `protected-sign.webp`, `favicon.png` |

**Action:** Delete entire `images/` directory

### 4. Migration Script (One-time Use)

| File | Purpose |
|------|---------|
| [`scripts/migrate-to-supabase.mjs`](scripts/migrate-to-supabase.mjs) | One-time migration script |

**Action:** Delete the migration script (migration is complete)

### 5. Example Credentials File

| File | Purpose |
|------|---------|
| [`js/supabase-credentials.example.js`](js/supabase-credentials.example.js) | Template file for credentials |

**Action:** Delete (credentials are now handled via [`js/supabase-config.js`](js/supabase-config.js) and environment variables)

### 6. Migration Plan Document

| File | Purpose |
|------|---------|
| [`plans/supabase-migration-plan.md`](plans/supabase-migration-plan.md) | Planning document for migration |

**Action:** Delete or archive (migration is complete)

---

## Code to Clean Up

### 1. Remove Fallback Code in [`js/config.js`](js/config.js)

The file currently has fallback logic to local JSON files when `USE_SUPABASE` is false. Since Supabase is now the only data source, this can be simplified:

**Remove:**
- `USE_SUPABASE` feature flag check
- `localConfigCache`, `localInstitutionConfigCache`, `localJurisdictionConfigCache`, `localSquircleIconsConfigCache` variables
- Fallback `fetch()` calls to local JSON files
- `clearConfigCache()` function (no longer needed)

**Keep:**
- All Supabase API calls via [`js/supabase-client.js`](js/supabase-client.js)
- Data transformation logic
- Utility functions like `formatDate()`

### 2. Remove `window.USE_SUPABASE` Flag

The feature flag is no longer needed:

**In [`js/config.js`](js/config.js:29):**
```javascript
// Remove this line:
const USE_SUPABASE = typeof window !== 'undefined' && window.USE_SUPABASE === false ? false : true;
```

**In [`js/supabase-credentials.example.js`](js/supabase-credentials.example.js:20):**
```javascript
// Remove this line:
window.USE_SUPABASE = true;
```

---

## Files to Keep

These files are still needed for the Supabase integration:

| File | Purpose |
|------|---------|
| [`js/supabase-client.js`](js/supabase-client.js) | Supabase client and helper functions |
| [`js/supabase-config.js`](js/supabase-config.js) | Supabase configuration (URL and anon key) |
| [`document-viewer.html`](document-viewer.html) | Dynamic document viewer page |
| [`js/document-viewer.js`](js/document-viewer.js) | Document viewer script |
| [`supabase/schema.sql`](supabase/schema.sql) | Database schema reference |
| [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) | Setup documentation |

---

## Summary

### Delete List

```
config/                              # Entire directory
images/                              # Entire directory
pages/books/                         # All HTML files
pages/decisions/     # All HTML files
pages/guidelines/    # All HTML files
pages/notes/                        # All HTML files
pages/policies/                      # All HTML files
pages/verdicts/                      # All HTML files
scripts/migrate-to-supabase.mjs      # Migration script
js/supabase-credentials.example.js   # Example file
plans/supabase-migration-plan.md     # Migration plan
```

### Code Cleanup

1. Simplify [`js/config.js`](js/config.js) - remove fallback logic
2. Remove `USE_SUPABASE` feature flag

### Estimated Space Savings

- **Config files:** ~20 KB
- **HTML pages:** ~120 KB
- **Images:** ~1.2 MB
- **Migration script:** ~14 KB

**Total:** ~1.35 MB

---

## Execution Order

1. Delete `config/` directory
2. Delete `images/` directory
3. Delete HTML files in `pages/` subdirectories
4. Delete `scripts/migrate-to-supabase.mjs`
5. Delete `js/supabase-credentials.example.js`
6. Delete `plans/supabase-migration-plan.md`
7. Clean up code in `js/config.js`
8. Test the application to ensure everything works

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Data loss | All data is safely in Supabase - verify before deletion |
| Broken links | Document URLs now use `document-viewer.html?doc=xxx` format |
| Missing images | All images are in Supabase Storage with public URLs |
| Cache issues | Users may need to clear browser cache |

---

## Next Steps

1. **Review this plan** - Confirm all items are correct
2. **Verify Supabase data** - Ensure all data is properly migrated
3. **Execute cleanup** - Delete files and clean up code
4. **Test thoroughly** - Verify all functionality works
5. **Deploy** - Push changes to production

---

Do you want to proceed with this cleanup plan? Let me know if you'd like to:
- Add or remove any items
- Keep certain files for backup purposes
- Modify the execution order
