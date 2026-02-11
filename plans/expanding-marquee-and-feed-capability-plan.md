

**Can you create a development plan based on the following requirements?**

## Overview

Each **Institution** and **Jurisdiction** should have its own configuration that determines:

* What appears in the **Marquee**
* What appears in the **Feed**

The Feed can display:

1. A **Widget** (with an `<h3>` header, similar to the current implementation).

   * Currently, only the **Prayer Time Widget** is available.
2. A **Carousel** (also with an `<h3>` header).

   * Maximum of 5 images
   * Same size as the Prayer Time widget
   * Each image has its own caption
   * Captions appear on the image, positioned at the bottom-left

---

# 1. Institution Configuration

Each institution should have its own config file.

### A. Widget Settings

* `enabled`: Yes or No
* `widget_type`: String (determines which widget to use)

  * Currently available: `"prayer_time"`
* If `enabled = No`, skip the widget and display the carousel next.

### B. Carousel Settings

* `carousel_title`: String (editable)
* `images`: Maximum of 5

  * Each image includes:

    * `image_url`
    * `caption` (displayed bottom-left over the image)
* `post_to_jurisdictions`: List of jurisdictions where this carousel should appear

### Feed Display Rules (Institution Feed)

* Show widget (if enabled)
* Show carousel
* Next to the carousel `<h3>` title, display:

  ```
  Posted in (Jurisdiction Name)
  ```

---

# 2. Jurisdiction Configuration

Each jurisdiction should also have its own config file.

### A. Widget Settings

* `enabled`: Yes or No
* `widget_type`: String (same structure as Institution config)

### B. Carousel Display

* The jurisdiction does NOT create its own carousel.
* It pulls carousels from institutions that explicitly list this jurisdiction in their `post_to_jurisdictions`.

### Feed Display Rules (Jurisdiction Feed)

* Show widget (if enabled)
* Show carousel(s) from institutions
* Next to the carousel `<h3>` title, display:

  ```
  Posted by (Institution Name)
  ```
* The carousel title comes from the Institution config.

---

# 3. Optional: Separate Carousel Configuration

If needed for better structure, create a separate **Carousel Config** file.

This would:

* Store carousel content (title, images, captions)
* Be referenced by Institution config
* Allow reuse and cleaner separation of concerns

---

# Final Structure

You may need to create **three configuration files**:

1. `institution.config`
2. `jurisdiction.config`
3. `carousel.config` (optional but recommended for scalability)

