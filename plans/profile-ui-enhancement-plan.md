# Profile UI Enhancement Implementation Plan

## Overview
This plan outlines the implementation of enhanced profile UI features for `js/profile-ui.js` to add contact information display for institutions and contributor lists for jurisdictions, along with removing the burger menu button.

## Current State Analysis

### Existing Components
- **Profile Button (`.profile-button`)**: Blue button with text "Button" (line 216 in profile-ui.js)
- **Burger Menu Button (`.profile-menu-btn`)**: Shows "⋮" icon (line 217 in profile-ui.js)
- **Profile Container**: Located in `library.html` with `profile-header` and `profile-filters` sections

### Data Sources
- **Institution Config**: `config/institution-config.json` - contains avatar, cover, bio, feed_config
- **Jurisdiction Config**: `config/jurisdiction-config.json` - contains avatar, cover, bio, feed_config
- **Documents Config**: `config/documents-config.json` - contains documents with institution and jurisdiction relationships

### Key Findings
1. No existing modal/popup mechanism in the codebase
2. Institution config lacks contact information fields (email, phone, address, website)
3. Contributor data exists in documents-config.json (institutions that have documents in a jurisdiction)
4. Profile button styling exists in `src/styles/_components.css` (lines 810-829)

---

## Implementation Tasks

### Task 1: Add Contact Information Fields to Institution Config
**File**: `config/institution-config.json`

**Description**: Add contact information fields to each institution entry.

**New Fields to Add**:
```json
"contact": {
  "email": "contact@example.com",
  "phone": "+1 234 567 8900",
  "address": "123 Main Street, City, Country",
  "website": "https://example.com"
}
```

**Example Entry**:
```json
"Ummah Cabinet [Non-Profit • Private]": {
  "avatar": "./images/institutions/ummah-cabinet.png",
  "cover": "./images/covers/default-cover.webp",
  "bio": "Peace be upon you.",
  "contact": {
    "email": "cabinet@ummah.org",
    "phone": "+62 21 1234 5678",
    "address": "Jakarta, Indonesia",
    "website": "https://ummah.org/cabinet"
  },
  "feed_config": { ... }
}
```

---

### Task 2: Create Modal/Popup Component Styles
**File**: `src/styles/_components.css`

**Description**: Add CSS styles for a modal/popup component to display contact cards and contributor lists.

**New CSS Classes**:
```css
/* Modal Overlay */
.profile-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}

.profile-modal-overlay.active {
  opacity: 1;
  visibility: visible;
}

/* Modal Container */
.profile-modal {
  background: var(--color-white);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card-hover);
  max-width: 400px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  transform: scale(0.95);
  transition: transform 0.2s;
}

.profile-modal-overlay.active .profile-modal {
  transform: scale(1);
}

.dark .profile-modal {
  background: #1f2937;
}

/* Modal Header */
.profile-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border-light);
}

.dark .profile-modal-header {
  border-bottom-color: #374151;
}

.profile-modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-gray-900);
}

.dark .profile-modal-title {
  color: #f9fafb;
}

.profile-modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-gray-600);
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  transition: color 0.2s;
}

.profile-modal-close:hover {
  color: var(--color-gray-900);
}

.dark .profile-modal-close {
  color: #9ca3af;
}

.dark .profile-modal-close:hover {
  color: #f9fafb;
}

/* Modal Content */
.profile-modal-content {
  padding: 1.25rem;
}

/* Contact Card Styles */
.contact-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.contact-card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border-light);
}

.dark .contact-card-header {
  border-bottom-color: #374151;
}

.contact-card-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: contain;
  background: var(--color-white);
}

.dark .contact-card-avatar {
  background: #1f2937;
}

.contact-card-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-gray-900);
}

.dark .contact-card-name {
  color: #f9fafb;
}

.contact-card-label {
  font-size: 0.875rem;
  color: var(--color-gray-600);
}

.dark .contact-card-label {
  color: #9ca3af;
}

.contact-info-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.contact-info-icon {
  font-size: 1.125rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.contact-info-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-gray-600);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.dark .contact-info-label {
  color: #9ca3af;
}

.contact-info-value {
  font-size: 0.875rem;
  color: var(--color-gray-900);
  word-break: break-word;
}

.dark .contact-info-value {
  color: #e5e7eb;
}

.contact-info-value a {
  color: var(--profile-accent);
  text-decoration: none;
}

.contact-info-value a:hover {
  text-decoration: underline;
}

/* Contributor List Styles */
.contributor-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.contributor-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: var(--radius-card);
  background: var(--color-gray-50);
  transition: background 0.2s;
}

.dark .contributor-item {
  background: #374151;
}

.contributor-item:hover {
  background: var(--color-gray-100);
}

.dark .contributor-item:hover {
  background: #4b5563;
}

.contributor-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: contain;
  background: var(--color-white);
  flex-shrink: 0;
}

.dark .contributor-avatar {
  background: #1f2937;
}

.contributor-info {
  flex: 1;
  min-width: 0;
}

.contributor-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-gray-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark .contributor-name {
  color: #f9fafb;
}

.contributor-count {
  font-size: 0.75rem;
  color: var(--color-gray-600);
}

.dark .contributor-count {
  color: #9ca3af;
}

.contributor-link {
  color: var(--profile-accent);
  text-decoration: none;
  font-size: 0.875rem;
  white-space: nowrap;
}

.contributor-link:hover {
  text-decoration: underline;
}
```

---

### Task 3: Add Modal Container to Library HTML
**File**: `library.html`

**Description**: Add a modal container element to the HTML structure.

**Location**: Add after the `profile-container` div (after line 46)

**New HTML**:
```html
<!-- Profile Modal (hidden by default) -->
<div id="profile-modal-overlay" class="profile-modal-overlay">
  <div class="profile-modal">
    <div class="profile-modal-header">
      <h3 class="profile-modal-title" id="modal-title">Title</h3>
      <button class="profile-modal-close" id="modal-close">&times;</button>
    </div>
    <div class="profile-modal-content" id="modal-content">
      <!-- Content will be dynamically populated -->
    </div>
  </div>
</div>
```

---

### Task 4: Update Profile UI JavaScript
**File**: `js/profile-ui.js`

**Description**: Modify the profile UI to implement the new functionality.

#### 4.1: Remove Burger Button from Profile Header
**Location**: `renderProfile()` function (lines 176-228)

**Change**: Remove the `.profile-menu-btn` button from the HTML template.

**Before** (lines 215-218):
```javascript
<div class="profile-actions">
  <button class="profile-button">Button</button>
  <button class="profile-menu-btn">⋮</button>
</div>
```

**After**:
```javascript
<div class="profile-actions">
  <button class="profile-button" id="profile-action-btn">Button</button>
</div>
```

#### 4.2: Update Button Text Based on Profile Type
**Location**: `renderProfile()` function

**Change**: Set button text dynamically based on profile type.

**Updated Code**:
```javascript
const buttonText = profileState.profileType === "institution" ? "Contact" : "Contributors";

container.innerHTML = `
  <div class="profile-cover">
    <img src="${escapeHtml(coverUrl)}" alt="Cover" />
  </div>
  <div class="profile-info">
    <div class="profile-header-row">
      <div class="profile-avatar">
        <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}" />
      </div>
      <div class="profile-actions">
        <button class="profile-button" id="profile-action-btn">${escapeHtml(buttonText)}</button>
      </div>
    </div>
    <!-- rest of the template -->
  </div>
`;

// Add click handler for the action button
const actionBtn = document.getElementById("profile-action-btn");
if (actionBtn) {
  actionBtn.addEventListener("click", handleActionButtonClick);
}
```

#### 4.3: Add New Functions to profile-ui.js

**Add after line 341 (end of file)**:

```javascript
/**
 * Handle action button click
 * Shows contact card for institutions or contributor list for jurisdictions
 */
function handleActionButtonClick() {
  if (profileState.profileType === "institution") {
    showContactCard();
  } else {
    showContributorList();
  }
}

/**
 * Show contact card modal for institution
 */
async function showContactCard() {
  const metadata = profileState.profileData || {};
  const { name, label } = extractLabel(profileState.profileName);
  const contact = metadata.contact || {};

  const modalOverlay = document.getElementById("profile-modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalContent = document.getElementById("modal-content");

  if (!modalOverlay || !modalTitle || !modalContent) {
    console.error("Modal elements not found");
    return;
  }

  modalTitle.textContent = "Contact Information";

  const avatarUrl = metadata.avatar || "./images/default-avatar.jpg";

  modalContent.innerHTML = `
    <div class="contact-card">
      <div class="contact-card-header">
        <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}" class="contact-card-avatar" />
        <div>
          <div class="contact-card-name">${escapeHtml(name)}</div>
          ${label ? `<div class="contact-card-label">${escapeHtml(label)}</div>` : ""}
        </div>
      </div>
      ${contact.email ? `
        <div class="contact-info-item">
          <span class="contact-info-icon">📧</span>
          <div>
            <div class="contact-info-label">Email</div>
            <div class="contact-info-value">
              <a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a>
            </div>
          </div>
        </div>
      ` : ""}
      ${contact.phone ? `
        <div class="contact-info-item">
          <span class="contact-info-icon">📱</span>
          <div>
            <div class="contact-info-label">Phone</div>
            <div class="contact-info-value">
              <a href="tel:${escapeHtml(contact.phone.replace(/\s/g, ''))}">${escapeHtml(contact.phone)}</a>
            </div>
          </div>
        </div>
      ` : ""}
      ${contact.address ? `
        <div class="contact-info-item">
          <span class="contact-info-icon">📍</span>
          <div>
            <div class="contact-info-label">Address</div>
            <div class="contact-info-value">${escapeHtml(contact.address)}</div>
          </div>
        </div>
      ` : ""}
      ${contact.website ? `
        <div class="contact-info-item">
          <span class="contact-info-icon">🌐</span>
          <div>
            <div class="contact-info-label">Website</div>
            <div class="contact-info-value">
              <a href="${escapeHtml(contact.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(contact.website)}</a>
            </div>
          </div>
        </div>
      ` : ""}
      ${!contact.email && !contact.phone && !contact.address && !contact.website ? `
        <div class="contact-info-item">
          <span class="contact-info-icon">ℹ️</span>
          <div class="contact-info-value">No contact information available</div>
        </div>
      ` : ""}
    </div>
  `;

  modalOverlay.classList.add("active");
}

/**
 * Show contributor list modal for jurisdiction
 */
async function showContributorList() {
  const { name, label } = extractLabel(profileState.profileName);

  const modalOverlay = document.getElementById("profile-modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalContent = document.getElementById("modal-content");

  if (!modalOverlay || !modalTitle || !modalContent) {
    console.error("Modal elements not found");
    return;
  }

  modalTitle.textContent = "Contributors";

  // Get unique institutions that have documents in this jurisdiction
  const contributors = getJurisdictionContributors(profileState.profileName);

  if (contributors.length === 0) {
    modalContent.innerHTML = `
      <div class="contact-info-item">
        <span class="contact-info-icon">ℹ️</span>
        <div class="contact-info-value">No contributors found</div>
      </div>
    `;
  } else {
    const contributorItems = await Promise.all(
      contributors.map(async (contributor) => {
        const metadata = await getInstitutionMetadata(contributor.name);
        const avatarUrl = metadata?.avatar || "./images/default-avatar.jpg";
        const { name: instName, label: instLabel } = extractLabel(contributor.name);

        return `
          <div class="contributor-item">
            <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(instName)}" class="contributor-avatar" />
            <div class="contributor-info">
              <div class="contributor-name">${escapeHtml(instName)}</div>
              <div class="contributor-count">${contributor.count} contribution${contributor.count !== 1 ? 's' : ''}</div>
            </div>
            <a href="?institution=${encodeURIComponent(contributor.name)}" class="contributor-link">View</a>
          </div>
        `;
      })
    );

    modalContent.innerHTML = `
      <div class="contributor-list">
        ${contributorItems.join("")}
      </div>
    `;
  }

  modalOverlay.classList.add("active");
}

/**
 * Get contributors (institutions) for a jurisdiction
 * @param {string} jurisdictionName - Jurisdiction name
 * @returns {Array} Array of { name, count } objects
 */
function getJurisdictionContributors(jurisdictionName) {
  const contributorMap = new Map();

  profileState.documents.forEach((doc) => {
    if (doc.jurisdiction === jurisdictionName) {
      const institution = doc.institution;
      contributorMap.set(institution, (contributorMap.get(institution) || 0) + 1);
    }
  });

  return Array.from(contributorMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Close the modal
 */
function closeModal() {
  const modalOverlay = document.getElementById("profile-modal-overlay");
  if (modalOverlay) {
    modalOverlay.classList.remove("active");
  }
}

/**
 * Initialize modal event listeners
 */
function initializeModalListeners() {
  const modalOverlay = document.getElementById("profile-modal-overlay");
  const modalClose = document.getElementById("modal-close");

  // Close button
  if (modalClose) {
    modalClose.addEventListener("click", closeModal);
  }

  // Click outside modal to close
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
  }

  // Escape key to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  });
}

// Initialize modal listeners when module loads
initializeModalListeners();
```

#### 4.4: Update initializeProfileUI to call modal initialization
**Location**: `initializeProfileUI()` function (lines 112-151)

**Change**: Ensure modal listeners are initialized when profile UI is initialized.

**Note**: The `initializeModalListeners()` function is called at module load time, so no changes needed to `initializeProfileUI()`.

---

## Summary of Changes

### Files Modified
1. **`config/institution-config.json`** - Add contact information fields to each institution
2. **`src/styles/_components.css`** - Add modal/popup component styles
3. **`library.html`** - Add modal container HTML
4. **`js/profile-ui.js`** - Update profile UI logic

### Key Features Implemented
1. **Institution Contact Button**: Shows a business card modal with email, phone, address, and website
2. **Jurisdiction Contributors Button**: Shows a list of institutions that contribute to the jurisdiction
3. **Burger Button Removal**: The "⋮" menu button is removed from both profile types
4. **Modal System**: Reusable modal component with overlay, close button, click-outside-to-close, and escape key support

### User Flow
1. User navigates to an institution profile (e.g., `?institution=Ummah+Cabinet`)
2. Blue button shows "Contact"
3. Clicking "Contact" opens a modal with the institution's contact information
4. User navigates to a jurisdiction profile (e.g., `?jurisdiction=General+Public`)
5. Blue button shows "Contributors"
6. Clicking "Contributors" opens a modal listing all institutions with documents in that jurisdiction
7. Each contributor has a "View" link to navigate to their profile

---

## Testing Checklist
- [ ] Institution profile shows "Contact" button
- [ ] Jurisdiction profile shows "Contributors" button
- [ ] Burger button is removed from both profile types
- [ ] Contact modal displays correctly for institutions with contact info
- [ ] Contact modal shows "No contact information available" for institutions without contact info
- [ ] Contributor list modal displays correctly for jurisdictions
- [ ] Contributor list shows "No contributors found" for jurisdictions with no documents
- [ ] Modal closes when clicking the X button
- [ ] Modal closes when clicking outside the modal
- [ ] Modal closes when pressing Escape key
- [ ] Contact email links work (mailto:)
- [ ] Contact phone links work (tel:)
- [ ] Contact website links open in new tab
- [ ] Contributor "View" links navigate to institution profile
- [ ] Modal is responsive on mobile devices
- [ ] Dark mode styling works correctly
