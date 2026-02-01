**Project Context:**

Please don't create a plan file before I ask you to do so. We need to discuss first. This website is already functionally complete, and we want to add a frontend layer. (The index logic, library logic, and document view are all already implemented.)

**1. Mode Switcher Implementation**

Create a toggle button above the paper element labeled "Switch to UI Mode". The current view should be preserved as "Lite Mode". When in UI Mode, display a button above the paper labeled "Switch to Lite Mode" to return to the original view. This mode switcher should persist across both views.

**2. UI Mode View Specifications**

**2.1. Index Layout - Tab Navigation**

Replace the current single-column, three-row layout (which displays headers "Items", "Institutions", "Jurisdictions" with their respective content) with a tabbed interface containing three clickable tabs. 

Tab behavior:
- Clicking "Content" tab displays items
- Clicking "Account" tab displays institutions  
- Clicking "Space" tab displays jurisdictions

Label mapping:
- "Items" → "Content"
- "Institutions" → "Account"
- "Jurisdictions" → "Space"

**2.2. Content Tab**

Display existing "items" data in a gallery view styled like iOS/macOS application menus (grid of app icons with squircle shapes). Each squircle should display:
- [Icon use placeholder]
- Item name [use the existing data from documents-config.json, like book, policy, decision]

on the matter of the reference, see the ui-plan/content-squircles.png (ignore the pill button on the bottom of the screen for now)


**2.3. Account Tab**

Display existing "institutions" data in a card-based gallery layout. Each card should be a squircle (rounded rectangle, not square) designed like an ID card with the following elements:
- Avatar image [use placeholder]
- Cover image [use placeholder]
- Name (displaying the institution name from existing data)
- Two labels below the name:
  - First label: A custom label that we define, (you can save the data somewhere coz i think i havent implemented it in our codebase)
  - Second label: Document count formatted as "X contributions" (where X is the number of documents the institution has)

on the matter of the reference, see the ui-plan/account-card.png (ignore the pill button on the bottom of the screen for now)

**2.4. Space Tab**

Display existing "jurisdictions" data in a card-based gallery layout using the same card design as the Account tab, with the following elements:
- Avatar image
- Cover image
- Name (displaying the jurisdiction name from existing data)
- Two labels below the name:
  - First label: A custom label that we define (you can save the data somewhere coz i think i havent implemented it in our codebase)
  - Second label: Contributor count formatted as "X contributors" (where X is the number of institutions that have posted in this jurisdiction)

on the matter of the reference, see the ui-plan/space-card.png (ignore the pill button on the bottom of the screen for now)

**Important Implementation Notes:**

**Paper Constraint:**
The UI Mode must use the existing "paper" setup from the current implementation. All UI elements must remain within the `.paper-sheet` container dimensions. The UI Mode should respect the same max-width (850px-900px), padding, and responsive breakpoints as the current Lite Mode.

**Gallery Layout:**
For the gallery displays in sections 2.2, 2.3, and 2.4:
- Determine the optimal number of squircles/ID cards per row that best fits within the paper width while maintaining visual balance
- The layout must adapt responsively following the current paper setup's breakpoint system (matching the existing mobile, tablet, and desktop responsive behavior)
- Maintain consistent spacing and margins as defined in the current `.paper-sheet` styling

