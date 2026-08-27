const themeStorageKey = "scratchpad-theme";
const notesStorageKey = "scratchpad-thought-dashboard";

const serifFontsLoaded = {};
function loadSerifFonts(themeName) {
  const serifMap = {
    "forest-quiet": null,
    "ink-paper": "family=Libre+Baskerville:wght@400;700",
    "moonlit-library": "family=Cormorant+Garamond:wght@500;600;700",
  };
  const fam = serifMap[themeName];
  if (!fam || serifFontsLoaded[themeName]) return;
  serifFontsLoaded[themeName] = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${fam}&display=swap`;
  document.head.appendChild(link);
}

const themePicker = document.getElementById("themePicker");
const themeButton = document.getElementById("themeButton");
const themeMenu = document.getElementById("themeMenu");
const themeValue = document.getElementById("themeValue");
const notesCount = document.getElementById("notesCount");
const clearBtn = document.getElementById("clearBtn");
const lastSaved = document.getElementById("lastSaved");
const searchNotes = document.getElementById("searchNotes");
const noteForm = document.getElementById("noteForm");
const noteTitle = document.getElementById("noteTitle");
const noteSection = document.getElementById("noteSection");
const sectionPicker = document.getElementById("sectionPicker");
const sectionOptions = document.getElementById("sectionOptions");
const noteTags = document.getElementById("noteTags");
const noteContent = document.getElementById("noteContent");
const notePinned = document.getElementById("notePinned");
const dashboardSections = document.getElementById("dashboardSections");

const themes = [
  {
    value: "midnight-studio",
    label: "Midnight Studio",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c-2.8 0-5.1 2.3-5.1 5.1 0 1.1.4 2.2 1.1 3.1L8 12.4a5.4 5.4 0 0 0-1.4 3.7c0 2.9 2.4 5.3 5.3 5.3 2.9 0 5.3-2.4 5.3-5.3 0-1.4-.6-2.7-1.5-3.6l-.5-.6c.7-.9 1.1-2 1.1-3.1C17.1 5.3 14.8 3 12 3Z" fill="currentColor"/></svg>',
    swatch: ["#6ec5ff", "#4cc9f0"],
  },
  {
    value: "forest-quiet",
    label: "Forest Quiet",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 7 11h2l-3 6h4v3h4v-3h4l-3-6h2L12 4Z" fill="currentColor"/></svg>',
    swatch: ["#4f6f4a", "#7c8f5a"],
  },
  {
    value: "ink-paper",
    label: "Ink & Paper",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H9l-3-3V6a3 3 0 0 1 3-3Zm2 4v2h6V7H9Zm0 4v2h4v-2H9Z" fill="currentColor"/></svg>',
    swatch: ["#4b433b", "#8b6c4c"],
  },
  {
    value: "moonlit-library",
    label: "Moonlit Library",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 3v8h6V7H7Zm8 0h2v8h-2V7Z" fill="currentColor"/></svg>',
    swatch: ["#c7a4ff", "#8f7ce8"],
  },
  {
    value: "minimal-zen",
    label: "Minimal Zen",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a8 8 0 1 0 8 8 8 8 0 0 0-8-8Zm0 2a6 6 0 0 1 4.1 10.2 1 1 0 0 0-.2-.1l-3.9-2.8a1 1 0 0 0-1.2 0L8.1 16.1a1 1 0 0 0-.2.1A6 6 0 0 1 12 6Z" fill="currentColor"/></svg>',
    swatch: ["#6d8b6d", "#8aa487"],
  },
  {
    value: "retro-typewriter",
    label: "Retro Typewriter",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12a2 2 0 0 1 2 2v2H4V6a2 2 0 0 1 2-2Zm-2 6h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Zm3 2v2h4v-2H7Zm6 0v2h4v-2h-4Z" fill="currentColor"/></svg>',
    swatch: ["#6a5b3c", "#8a7450"],
  },
  {
    value: "solar-desk",
    label: "Solar Desk",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1Zm7.1 4.9a1 1 0 0 1 1.4 0l1.4 1.4a1 1 0 1 1-1.4 1.4l-1.4-1.4a1 1 0 0 1 0-1.4ZM4.5 7.9a1 1 0 0 1 1.4 0l1.4 1.4a1 1 0 0 1-1.4 1.4L4.5 9.3a1 1 0 0 1 0-1.4ZM12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4Zm8 7a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Zm-16 0a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Zm14.1 4.9a1 1 0 0 1 0 1.4l-1.4 1.4a1 1 0 0 1-1.4-1.4l1.4-1.4a1 1 0 0 1 1.4 0Zm-12.2 0a1 1 0 0 1 0 1.4L8.5 20.6a1 1 0 0 1-1.4-1.4l1.4-1.4a1 1 0 0 1 1.4 0Z" fill="currentColor"/></svg>',
    swatch: ["#bf7a20", "#d99a37"],
  },
  {
    value: "cosmic-notes",
    label: "Cosmic Notes",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-4 4V5a2 2 0 0 1 2-2Zm2 4v2h6V7H9Zm0 4v2h4v-2H9Z" fill="currentColor"/></svg>',
    swatch: ["#7c4dff", "#00d4ff"],
  },
];

const sectionConfig = [
  {
    value: "Quick Notes",
    title: "Quick Notes",
    description: "Fast captures and reminders",
  },
  {
    value: "Ideas",
    title: "Ideas",
    description: "Project sparks and possibilities",
  },
  {
    value: "Journal",
    title: "Journal",
    description: "Reflections and progress",
  },
];

let activeTheme = "midnight-studio";
let notes = loadNotes();
let undoStack = [];
let redoStack = [];
let cachedForestPattern = null;

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");

function closeThemeMenu() {
  if (!themePicker) return;
  themePicker.classList.remove("is-open");
  if (themeButton) {
    themeButton.setAttribute("aria-expanded", "false");
  }
}

function openThemeMenu() {
  if (!themePicker) return;
  themePicker.classList.add("is-open");
  if (themeButton) {
    themeButton.setAttribute("aria-expanded", "true");
  }
}

function renderThemeMenu() {
  if (!themeMenu) return;

  themeMenu.innerHTML = themes
    .map(
      (theme) => `
        <button
          class="theme-option ${theme.value === activeTheme ? "is-active" : ""}"
          type="button"
          data-theme="${theme.value}"
          role="menuitem"
        >
          <span class="theme-option__left">
            <span class="theme-option__icon" aria-hidden="true">${theme.icon}</span>
            <span class="theme-option__text">
              <span class="theme-option__name">${theme.label}</span>
            </span>
          </span>
          <span class="theme-option__meta">
            <span class="theme-option__swatch" style="--swatch-a:${theme.swatch[0]}; --swatch-b:${theme.swatch[1]};"></span>
          </span>
          <span class="theme-option__check">✓</span>
        </button>
      `,
    )
    .join("");

  themeMenu.querySelectorAll(".theme-option").forEach((option) => {
    option.addEventListener("click", () => {
      applyTheme(option.dataset.theme);
      closeThemeMenu();
    });
  });
}

function applyTheme(themeName) {
  activeTheme = themeName;
  document.body.setAttribute("data-theme", themeName);

  const themeColorMap = {
    "midnight-studio": "#020712",
    "forest-quiet": "#f3ebd9",
    "ink-paper": "#f3e2ce",
    "moonlit-library": "#180a20",
    "minimal-zen": "#fbfaf5",
    "retro-typewriter": "#f7efe0",
    "solar-desk": "#fff6e4",
    "cosmic-notes": "#020712",
  };
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = themeColorMap[themeName] || "#07111f";
  // Use the preferred pine SVG for the forest theme (pine1 only).
  // Generate a randomized SVG pattern so trees don't line up in a grid.
  if (themeName === "forest-quiet") {
    try {
      if (!cachedForestPattern) {
        const area = window.innerWidth * window.innerHeight;
        const rawCount = Math.round(area / 12000);
        const count = Math.max(60, Math.min(400, rawCount));

        const urls = new Array(count).fill('url("images/pine1.svg")').join(", ");
        const positions = new Array(count)
          .fill(0)
          .map(() => {
            const px = Math.round(Math.pow(Math.random(), 0.9) * 100);
            const py = Math.round(Math.pow(Math.random(), 0.95) * 100);
            return `${Math.max(2, Math.min(98, px))}% ${Math.max(2, Math.min(98, py))}%`;
          })
          .join(", ");
        const sizes = new Array(count)
          .fill(0)
          .map(() => `${Math.round(40 + Math.random() * 70)}px`)
          .join(", ");

        cachedForestPattern = { urls, positions, sizes };
      }
      document.body.style.setProperty("--forest-svg", cachedForestPattern.urls);
      document.body.style.setProperty("--forest-positions", cachedForestPattern.positions);
      document.body.style.setProperty("--forest-sizes", cachedForestPattern.sizes);
      document.body.style.setProperty("--forest-repeat", "no-repeat");
    } catch (e) {
      document.body.style.removeProperty("--forest-svg");
    }
  } else {
    document.body.style.removeProperty("--forest-svg");
  }
  if (themeValue) {
    const selectedTheme = themes.find((theme) => theme.value === themeName);
    themeValue.textContent = selectedTheme ? selectedTheme.label : themeName;
  }
  loadSerifFonts(themeName);
  renderThemeMenu();
  localStorage.setItem(themeStorageKey, themeName);
}

function loadTheme() {
  const savedTheme = localStorage.getItem(themeStorageKey);
  const initialTheme =
    savedTheme && themes.some((theme) => theme.value === savedTheme)
      ? savedTheme
      : "midnight-studio";
  applyTheme(initialTheme);
}

function loadNotes() {
  try {
    const savedNotes = localStorage.getItem(notesStorageKey);
    return savedNotes ? JSON.parse(savedNotes) : [];
  } catch (error) {
    console.error("Unable to load notes", error);
    return [];
  }
}

function saveNotes() {
  localStorage.setItem(notesStorageKey, JSON.stringify(notes));
  if (lastSaved) {
    const time = new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    lastSaved.textContent = `Saved at ${time}`;
  }
}

function updateUndoRedoButtons() {
  if (undoBtn) undoBtn.disabled = undoStack.length === 0;
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

function pushHistory(state) {
  undoStack.push(JSON.stringify(state));
  redoStack = [];
  updateUndoRedoButtons();
}

function restoreHistory(stackFrom, stackTo) {
  if (!stackFrom.length) return;
  stackTo.push(JSON.stringify(notes));
  notes = JSON.parse(stackFrom.pop());
  saveNotes();
  renderNotes();
  updateUndoRedoButtons();
}

function undo() {
  restoreHistory(undoStack, redoStack);
}

function redo() {
  restoreHistory(redoStack, undoStack);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || isNaN(date.getTime())) return "";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getVisibleNotes() {
  const query = searchNotes?.value.trim().toLowerCase() || "";

  return [...notes]
    .filter((note) => {
      if (!query) return true;
      const searchable =
        `${note.title} ${note.content} ${(note.tags || []).join(" ")} ${note.section}`.toLowerCase();
      return searchable.includes(query);
    })
    .sort((a, b) => {
      return (
        Number(b.pinned) - Number(a.pinned) ||
        new Date(b.createdAt) - new Date(a.createdAt)
      );
    });
}

function renderNotes() {
  if (!dashboardSections) return;

  const visibleNotes = getVisibleNotes();
  const visibleCount = visibleNotes.length;

  dashboardSections.innerHTML = sectionConfig
    .map((section) => {
      const sectionNotes = visibleNotes.filter(
        (note) => note.section === section.value,
      );
      const cards = sectionNotes.length
        ? `<div class="notes-grid">${sectionNotes.map((note) => renderNoteCard(note)).join("")}</div>`
        : `<div class="empty-state"><svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg><p>No ${section.value.toLowerCase()} yet.</p><span>Capture your next thought.</span></div>`;

      return `
        <section class="dashboard-section">
          <div class="section-header">
            <div>
              <h3>${escapeHtml(section.title)}</h3>
              <p>${escapeHtml(section.description)}</p>
            </div>
            <span class="section-pill">${sectionNotes.length}</span>
          </div>
          ${cards}
        </section>
      `;
    })
    .join("");

  if (notesCount) {
    notesCount.textContent = `${visibleCount} ${visibleCount === 1 ? "note" : "notes"}`;
  }
}

function renderNoteCard(note) {
  const tags = (note.tags || []).length
    ? `<div class="note-tags">${note.tags.map((tag) => `<span class="note-tag">${escapeHtml(tag)}</span>`).join("")}</div>`
    : "";

  return `
    <article class="note-card ${note.pinned ? "is-pinned" : ""}">
      <div class="note-card__top">
        <div>
          <div class="note-card__title-row">
            <h4>${escapeHtml(note.title || "Untitled thought")}</h4>
            ${note.pinned ? '<span class="pin-badge">Pinned</span>' : ""}
          </div>
          <p class="note-card__meta">${escapeHtml(note.section)} • ${formatDate(note.createdAt)}</p>
        </div>
        <button class="icon-button" type="button" data-action="toggle-pin" data-id="${note.id}">
          ${note.pinned ? "Unpin" : "Pin"}
        </button>
      </div>
      <p class="note-card__content">${escapeHtml(note.content || "")}</p>
      ${tags}
      <div class="note-card__footer">
        <button class="icon-button danger" type="button" data-action="delete" data-id="${note.id}">Delete</button>
      </div>
    </article>
  `;
}

function createNoteFromForm() {
  if (!noteTitle || !noteSection || !noteContent) return null;

  const title = noteTitle.value.trim();
  const content = noteContent.value.trim();

  if (!title && !content) return null;

  const tags =
    noteTags?.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean) || [];

  return {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `note-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: title || "Untitled thought",
    content: content || "No details yet.",
    section: noteSection.value,
    tags,
    pinned: Boolean(notePinned?.checked),
    createdAt: new Date().toISOString(),
  };
}

function addNote(event) {
  event.preventDefault();
  const newNote = createNoteFromForm();

  if (!newNote) return;

  pushHistory(notes);
  notes = [newNote, ...notes];
  saveNotes();
  renderNotes();

  const firstCard = dashboardSections?.querySelector(".note-card");
  if (firstCard) {
    firstCard.classList.add("is-new");
    firstCard.addEventListener("animationend", () => firstCard.classList.remove("is-new"), { once: true });
  }

  noteForm.reset();
  notePinned.checked = false;
  noteSection.value = "Quick Notes";
  const selectedLabel = sectionPicker?.querySelector(
    ".custom-section-picker__title",
  );
  if (selectedLabel) selectedLabel.textContent = "Quick Notes";
  sectionOptions
    ?.querySelectorAll(".custom-section-option")
    .forEach((option) => {
      option.classList.toggle(
        "is-selected",
        option.dataset.value === "Quick Notes",
      );
    });
  sectionPicker?.parentElement?.classList.remove("menu-open");
  sectionPicker?.setAttribute("aria-expanded", "false");
  noteTitle.focus();
}

function togglePin(noteId) {
  pushHistory(notes);
  notes = notes.map((note) =>
    note.id === noteId ? { ...note, pinned: !note.pinned } : note,
  );
  saveNotes();
  renderNotes();
}

function deleteNote(noteId) {
  pushHistory(notes);
  notes = notes.filter((note) => note.id !== noteId);
  saveNotes();
  renderNotes();
}

if (themeButton) {
  themeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (themePicker?.classList.contains("is-open")) {
      closeThemeMenu();
    } else {
      openThemeMenu();
    }
  });
}

document.addEventListener("click", (event) => {
  if (themePicker && !themePicker.contains(event.target)) {
    closeThemeMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeThemeMenu();
    if (sectionPicker && sectionPicker.parentElement) {
      sectionPicker.parentElement.classList.remove("menu-open");
      sectionPicker.setAttribute("aria-expanded", "false");
    }
  }
});

if (sectionPicker && sectionOptions && noteSection) {
  sectionPicker.addEventListener("click", (event) => {
    event.stopPropagation();
    const wrapper = sectionPicker.parentElement;
    const isOpen = wrapper?.classList.contains("menu-open");
    wrapper?.classList.toggle("menu-open", !isOpen);
    sectionPicker.setAttribute("aria-expanded", String(!isOpen));
  });

  sectionOptions.addEventListener("click", (event) => {
    const option = event.target.closest("button.custom-section-option");
    if (!option) return;

    const value = option.dataset.value;
    const selectedLabel = sectionPicker.querySelector(
      ".custom-section-picker__title",
    );
    selectedLabel.textContent = value;
    noteSection.value = value;

    sectionOptions
      .querySelectorAll(".custom-section-option")
      .forEach((optionButton) => {
        optionButton.classList.toggle("is-selected", optionButton === option);
      });

    const wrapper = sectionPicker.parentElement;
    wrapper?.classList.remove("menu-open");
    sectionPicker.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("click", (event) => {
    if (
      sectionPicker &&
      !sectionPicker.contains(event.target) &&
      !sectionOptions.contains(event.target)
    ) {
      const wrapper = sectionPicker.parentElement;
      wrapper?.classList.remove("menu-open");
      sectionPicker.setAttribute("aria-expanded", "false");
    }
  });
}

if (noteForm) {
  noteForm.addEventListener("submit", addNote);
}

if (noteContent) {
  noteContent.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      noteForm.requestSubmit();
    }
  });
}

if (dashboardSections) {
  dashboardSections.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const noteId = button.getAttribute("data-id");
    if (button.dataset.action === "toggle-pin") {
      togglePin(noteId);
    }

    if (button.dataset.action === "delete") {
      deleteNote(noteId);
    }
  });
}

if (searchNotes) {
  searchNotes.addEventListener("input", renderNotes);
}

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    const existing = document.querySelector(".confirm-dialog");
    if (existing) { existing.remove(); return; }

    const dialog = document.createElement("div");
    dialog.className = "confirm-dialog";
    dialog.style.cssText =
      "position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);";
    dialog.innerHTML =
      '<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:16px;padding:24px;max-width:320px;width:90%;text-align:center;">' +
      '<p style="margin:0 0 16px;color:var(--text);font-weight:600;">Clear all notes?</p>' +
      '<div style="display:flex;gap:10px;justify-content:center;">' +
      '<button class="confirm-yes" style="padding:10px 20px;border-radius:999px;border:none;background:var(--accent);color:#fff;font-weight:700;cursor:pointer;">Yes, clear</button>' +
      '<button class="confirm-no" style="padding:10px 20px;border-radius:999px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-weight:700;cursor:pointer;">Cancel</button>' +
      '</div></div>';
    document.body.appendChild(dialog);

    dialog.querySelector(".confirm-yes").addEventListener("click", () => {
      pushHistory(notes);
      notes = [];
      saveNotes();
      renderNotes();
      dialog.remove();
    });
    dialog.querySelector(".confirm-no").addEventListener("click", () => dialog.remove());
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.remove(); });
  });
}

if (undoBtn) {
  undoBtn.addEventListener("click", undo);
}

if (redoBtn) {
  redoBtn.addEventListener("click", redo);
}

updateUndoRedoButtons();

loadTheme();
renderNotes();
