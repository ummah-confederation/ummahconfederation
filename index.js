const documents = [
  "book1.html",
  "book2.html",
  "book3.html",
  "book4.html",
  "policy1.html",
  "decision1.html",
  "book5.html",
  "book0.html",
  "policy3.html",
  "book6.html",
];

const items = new Set();
const institutions = new Set();
const jurisdictions = new Set();

/* -----------------------------
   Helpers
------------------------------ */

function extractMetadata(doc) {
  // ---
  const title = doc.querySelector("h2")?.textContent?.trim();
  if (title) {
    const item = title.split(/\s+/)[0];
    if (item) items.add(item);
  }

  // --- Metadata paragraphs ---
  doc.querySelectorAll("p").forEach((p) => {
    const text = p.textContent.trim();

    if (text.startsWith("Institution :")) {
      institutions.add(text.replace("Institution :", "").trim());
    }

    if (text.startsWith("Jurisdiction :")) {
      jurisdictions.add(text.replace("Jurisdiction :", "").trim());
    }
  });
}

function renderList(containerId, values, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  if (options.includeAll) {
    const row = document.createElement("div");
    row.className = "registry-row";

    const link = document.createElement("a");
    link.href = "library.html";
    link.textContent = "ALL";

    row.appendChild(link);
    container.appendChild(row);
  }

  [...values]
    .sort((a, b) => a.localeCompare(b))
    .forEach((value) => {
      const row = document.createElement("div");
      row.className = "registry-row";

      const link = document.createElement("a");
      link.textContent = value;

      // 🔑 key logic
      if (containerId === "item-list") {
        link.href = `library.html?item=${encodeURIComponent(value)}`;
      } else if (containerId === "institution-list") {
        link.href = `library.html?institution=${encodeURIComponent(value)}`;
      } else if (containerId === "jurisdiction-list") {
        link.href = `library.html?jurisdiction=${encodeURIComponent(value)}`;
      }

      row.appendChild(link);
      container.appendChild(row);
    });
}

/* -----------------------------
   Main loader
------------------------------ */

async function loadDocuments() {
  for (const file of documents) {
    try {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`Failed to load ${file}`);

      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, "text/html");

      extractMetadata(doc);
    } catch (err) {
      console.warn(err.message);
    }
  }

  // Render after all documents are processed
  renderList("item-list", items, { includeAll: true });
  renderList("institution-list", institutions);
  renderList("jurisdiction-list", jurisdictions);
}

/* -----------------------------
   Init
------------------------------ */

document.addEventListener("DOMContentLoaded", loadDocuments);
