(() => {
  "use strict";

  const OFFICIAL_PUBLICATION_NAME = "The East-Washington Times";
  const CATEGORIES = [
    "News",
    "Features",
    "Editorial",
    "Opinion",
    "Sports",
    "Science & Technology",
    "Campus Life",
    "Photojournalism",
  ];
  const CATEGORY_HASHES = {
    News: "news",
    Features: "features",
    Editorial: "editorial",
    Opinion: "opinion",
    Sports: "sports",
    "Science & Technology": "science",
    "Campus Life": "campus",
    Photojournalism: "photojournalism",
  };
  const DEFAULT_SETTINGS = {
    publication_name: "The East-Washington Times",
    school_name: "Bagumbayan-East Washington National High School",
    school_abbreviation: "BEWNHS",
    tagline: "Student journalism. Campus voices. Stories that matter.",
    publication_history: "",
    mission: "",
    vision: "",
  };
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const config = window.EWT_CONFIG || {};
  const configured =
    /^https:\/\/.+\.supabase\.co$/i.test(config.SUPABASE_URL || "") &&
    config.SUPABASE_PUBLISHABLE_KEY &&
    !config.SUPABASE_PUBLISHABLE_KEY.includes("YOUR_");
  const db =
    configured && window.supabase
      ? window.supabase.createClient(
          config.SUPABASE_URL,
          config.SUPABASE_PUBLISHABLE_KEY,
        )
      : null;

  const state = {
    articles: [],
    staff: [],
    achievements: [],
    gallery: [],
    settings: { ...DEFAULT_SETTINGS },
    currentCategory: "",
    adminArticles: [],
    adminStaff: [],
    adminAchievements: [],
    currentUser: null,
    currentRole: "",
    isEditor: false,
    isAdmin: false,
    usingDemo: !db,
  };
  let coverObjectUrl = "";
  let articlePhotoDraft = [];
  let articlePhotoOriginalIds = new Set();
  let authPending = false;
  let operationBusy = false;
  let openingComplete = false;
  let startupDataReady = false;
  const SECTION_NAV_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
  let sectionNavExpiryTimer = null;

  const demoArticles = [
    {
      id: "demo-1",
      title: "Headline Placeholder: Your Lead Campus Story",
      dek: "Use this lead space for the most important verified story from The East-Washington Times newsroom.",
      body: "This is demo content. Replace it with an original, verified article written and edited by your student publication.",
      category: "News",
      author_name: "The East-Washington Times",
      published_at: "2026-09-16T08:00:00+08:00",
      cover_image_path: "assets/hero-placeholder.svg",
      is_featured: true,
      is_breaking: true,
      status: "published",
      demo: true,
    },
    {
      id: "demo-2",
      title: "Feature Placeholder: Tell a Student Story With Depth",
      dek: "Profiles, human-interest stories, and narratives can live here.",
      body: "This demo feature shows how a student profile or human-interest story can appear.",
      category: "Features",
      author_name: "Features Desk",
      published_at: "2026-09-15T10:00:00+08:00",
      cover_image_path: "assets/campus-placeholder.svg",
      status: "published",
      demo: true,
    },
    {
      id: "demo-3",
      title: "Editorial Placeholder: A Clear Institutional Position",
      dek: "Use the editorial label for the publication’s collective editorial voice.",
      body: "This is a placeholder editorial.",
      category: "Editorial",
      author_name: "Editorial Board",
      published_at: "2026-09-14T09:00:00+08:00",
      cover_image_path: "assets/editorial-placeholder.svg",
      status: "published",
      demo: true,
    },
    {
      id: "demo-4",
      title: "Opinion Placeholder: A Student Column With a Point of View",
      dek: "Opinion pieces should identify the writer and remain clearly labeled.",
      body: "This demo entry shows the Opinion section.",
      category: "Opinion",
      author_name: "Student Columnist",
      published_at: "2026-09-13T12:00:00+08:00",
      cover_image_path: "assets/editorial-placeholder.svg",
      status: "published",
      demo: true,
    },
    {
      id: "demo-5",
      title: "Sports Placeholder: Cover the Match Beyond the Score",
      dek: "Highlight student athletes, context, turning points, and verified results.",
      body: "This is demo sports content.",
      category: "Sports",
      author_name: "Sports Desk",
      published_at: "2026-09-12T16:00:00+08:00",
      cover_image_path: "assets/sports-placeholder.svg",
      status: "published",
      demo: true,
    },
    {
      id: "demo-6",
      title: "Science & Tech Placeholder: Explain an Idea Clearly",
      dek: "A section for research, student innovation, science, and technology coverage.",
      body: "This is demo science and technology content.",
      category: "Science & Technology",
      author_name: "Science & Tech Desk",
      published_at: "2026-09-11T13:00:00+08:00",
      cover_image_path: "assets/science-placeholder.svg",
      status: "published",
      demo: true,
    },
    {
      id: "demo-7",
      title: "Campus Life Placeholder: Capture What Students Experience",
      dek: "Organizations, events, activities, and everyday school stories belong here.",
      body: "This is demo campus-life content.",
      category: "Campus Life",
      author_name: "Campus Desk",
      published_at: "2026-09-10T14:00:00+08:00",
      cover_image_path: "assets/campus-placeholder.svg",
      status: "published",
      demo: true,
    },
    {
      id: "demo-8",
      title: "Photojournalism Placeholder: Let the Frame Carry the Story",
      dek: "Strong captions should answer who, what, when, where, and why the moment matters.",
      body: "This placeholder demonstrates the photojournalism presentation.",
      category: "Photojournalism",
      author_name: "Photojournalism Team",
      published_at: "2026-09-09T15:00:00+08:00",
      cover_image_path: "assets/photo-placeholder.svg",
      status: "published",
      demo: true,
    },
  ];
  const demoStaff = [
    ["Add Editor-in-Chief", "Editor-in-Chief", "editorial_board"],
    ["Add Associate Editor", "Associate Editor", "editorial_board"],
    ["Add Managing Editor", "Managing Editor", "editorial_board"],
    ["Add News Editor", "News Editor", "editorial_board"],
    ["Add Feature Editor", "Feature Editor", "editorial_board"],
    ["Add Editorial Editor", "Editorial Editor", "editorial_board"],
    ["Add Sports Editor", "Sports Editor", "editorial_board"],
    [
      "Add Science & Technology Editor",
      "Science & Technology Editor",
      "editorial_board",
    ],
    ["Add Photojournalist", "Photojournalist", "staff"],
    ["Add Layout Artist", "Layout Artist", "staff"],
    ["Add Cartoonist", "Cartoonist", "staff"],
    ["Add Staff Writer", "Staff Writer", "staff"],
    ["Add School Paper Adviser", "School Paper Adviser", "adviser"],
  ].map((x, i) => ({
    id: `staff-${i}`,
    full_name: x[0],
    position: x[1],
    group_type: x[2],
    bio: "Replace this placeholder with the member’s short introduction.",
    photo_path: "",
    sort_order: i,
    demo: true,
  }));
  const demoAchievements = [
    {
      id: "a1",
      title: "Add Journalism Achievement",
      competition_name: "Competition / Recognition",
      award: "Award or placement",
      description: "Add verified achievement details here.",
      demo: true,
    },
    {
      id: "a2",
      title: "Add Team Recognition",
      competition_name: "Division / Regional / National Event",
      award: "Recognition",
      description: "Use the admin CMS to add real records.",
      demo: true,
    },
    {
      id: "a3",
      title: "Add Individual Recognition",
      competition_name: "Journalism Event",
      award: "Award",
      description: "Do not publish unverified achievements.",
      demo: true,
    },
  ];

  function escapeHtml(value = "") {
    return String(value).replace(
      /[&<>'"]/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#039;",
          '"': "&quot;",
        })[c],
    );
  }
  function clamp(n, min, max) {
    n = Number(n);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
  }
  function formatDate(
    value,
    options = { month: "long", day: "numeric", year: "numeric" },
  ) {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? ""
      : new Intl.DateTimeFormat("en-PH", options).format(d);
  }
  function formatRelativeTime(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";

    const diffMs = Date.now() - d.getTime();
    if (diffMs < 0) return "Just now";

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes === 1 ? "A minute ago" : `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours === 1 ? "An hour ago" : `${hours} hours ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return days === 1 ? "A day ago" : `${days} days ago`;

    const weeks = Math.floor(days / 7);
    if (days < 30) return weeks === 1 ? "A week ago" : `${weeks} weeks ago`;

    const months = Math.floor(days / 30);
    if (days < 365) return months === 1 ? "A month ago" : `${months} months ago`;

    const years = Math.floor(days / 365);
    return years === 1 ? "A year ago" : `${years} years ago`;
  }

  function relativeTimeHtml(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const iso = d.toISOString();
    const exact = formatDate(value, {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return `<time class="relative-time" datetime="${escapeHtml(iso)}" data-relative-time="${escapeHtml(iso)}" title="${escapeHtml(exact)}">${escapeHtml(formatRelativeTime(value))}</time>`;
  }

  function refreshRelativeTimes() {
    document.querySelectorAll("[data-relative-time]").forEach((el) => {
      const value = el.getAttribute("data-relative-time");
      el.textContent = formatRelativeTime(value);
    });
  }
  function initials(name = "") {
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => x[0])
        .join("")
        .toUpperCase() || "EWT"
    );
  }
  function slugify(s = "") {
    return (
      s
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 80) || "story"
    );
  }
  function showToast(text) {
    const el = $("#toast");
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => el.classList.remove("show"), 2400);
  }
  function showNotice(title, text, type = "success", autoClose = true) {
    const popup = $("#noticePopup"),
      icon = $("#noticeIcon"),
      titleEl = $("#noticeTitle"),
      textEl = $("#noticeText");
    if (!popup || !icon || !titleEl || !textEl) return;
    titleEl.textContent = title;
    textEl.textContent = text;
    icon.textContent = type === "error" ? "!" : "✓";
    popup.classList.toggle("error", type === "error");
    popup.classList.add("show");
    popup.setAttribute("aria-hidden", "false");
    clearTimeout(showNotice.t);
    if (autoClose)
      showNotice.t = setTimeout(() => {
        popup.classList.remove("show");
        popup.setAttribute("aria-hidden", "true");
      }, 3600);
  }
  function hideNotice() {
    const popup = $("#noticePopup");
    if (!popup) return;
    popup.classList.remove("show");
    popup.setAttribute("aria-hidden", "true");
    clearTimeout(showNotice.t);
  }
  function enterSite() {
    const gate = $("#startupGate");
    if (!gate || gate.classList.contains("is-leaving")) return;
    lockOpening(false);
    gate.classList.add("is-leaving");
    document.body.classList.remove("intro-locked");
    setTimeout(() => {
      gate.hidden = true;
      openingComplete = true;
      openRequestedPage();
      $("#mainContent")?.focus?.({ preventScroll: true });
    }, 520);
  }
  function syncOverlayLock() {
    const modalOpen = !!document.querySelector("dialog[open]");
    document.body.classList.toggle("modal-open", modalOpen);
  }
  function openLockedDialog(dialog) {
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    syncOverlayLock();
  }
  function closeLockedDialog(dialog) {
    if (!dialog) return;
    if (dialog.open) dialog.close();
    requestAnimationFrame(syncOverlayLock);
  }
  function setMenuOpen(open) {
    const nav = $("#mainNav");
    const toggle = $("#menuToggle");
    if (!nav || !toggle) return;
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close sections menu" : "Open sections menu");
    document.body.classList.toggle("menu-open", open);
    if (open && window.innerWidth <= 700) {
      syncActiveNav(location.hash || "#home");
    }
  }

  function normalizeNavHash(value = "") {
    const raw = String(value || "#home").trim();
    const hash = (raw.includes("#") ? raw.slice(raw.indexOf("#") + 1) : raw)
      .split("?")[0]
      .replace(/^#/, "")
      .trim()
      .toLowerCase();
    return hash || "home";
  }

  function syncActiveNav(hashValue = location.hash) {
    // V12: this extra URL-to-highlight synchronization is MOBILE ONLY.
    // Desktop keeps the site's original navigation behavior.
    if (window.innerWidth > 700) {
      $$(".main-nav a[aria-current='page']").forEach((link) =>
        link.removeAttribute("aria-current"),
      );
      return;
    }

    const hash = normalizeNavHash(hashValue);
    $$(".main-nav a[href^='#']").forEach((link) => {
      const linkHash = normalizeNavHash(link.getAttribute("href"));
      const isActive = !link.hidden && linkHash === hash;
      link.classList.toggle("active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function navigateToHash(target) {
    const clean = normalizeNavHash(target);
    const nextHash = `#${clean}`;

    // Close the mobile drawer and render the selected section immediately.
    setMenuOpen(false);
    if (location.hash !== nextHash) {
      history.pushState(null, "", nextHash);
    }
    applyCurrentHash();
  }

  function showAuthFeedback(title, text, isError = false) {
    const dialog = $("#authFeedback");
    $("#authFeedbackTitle").textContent = title;
    $("#authFeedbackText").textContent = text;
    $("#authFeedbackSymbol").textContent = isError ? "!" : "✓";
    dialog.classList.toggle("is-error", isError);
    $("#authFeedbackClose").textContent = isError ? "Try again" : "Continue";
    if (!dialog.open) dialog.showModal();
  }

  // Keep the opening screen keyboard-accessible until the reader enters.
  function lockOpening(locked) {
    for (const el of document.body.children) {
      if (el.id !== "startupGate" && !["SCRIPT", "DIALOG"].includes(el.tagName))
        el.inert = locked;
    }
  }

  function setButtonBusy(btn, busy, busyText = "Working…") {
    if (!btn) return;
    if (busy) {
      if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
      btn.textContent = busyText;
      btn.disabled = true;
      btn.classList.add("is-busy");
      btn.setAttribute("aria-busy", "true");
    } else {
      btn.textContent = btn.dataset.originalText || btn.textContent;
      btn.disabled = false;
      btn.classList.remove("is-busy");
      btn.removeAttribute("aria-busy");
      delete btn.dataset.originalText;
    }
  }
  function setGlobalBusy(busy, text = "Working…") {
    const box = $("#globalBusy"),
      label = $("#globalBusyText");
    if (!box || !label) return;
    operationBusy = busy;
    label.textContent = text;
    box.classList.toggle("hidden", !busy);
    $("#adminAuthPane").inert = busy;
    $("#adminDashboard").inert = busy;
    $("[data-close-dialog=adminDialog]").disabled = busy;
    $("#adminDialog").setAttribute("aria-busy", String(busy));
  }

  async function subscribeNewsletter(email, website = "") {
    if (!db) throw new Error("Email alerts are not connected yet.");
    const { data, error } = await db.functions.invoke("newsletter-subscribe", {
      body: { email, website, source: "website" },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data || { ok: true };
  }

  async function notifyNewsletter(articleId) {
    if (!db || !articleId) return { skipped: true };
    const { data, error } = await db.functions.invoke("newsletter-notify", {
      body: { article_id: articleId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data || { ok: true };
  }

  function openStoryFromUrl() {
    const storyId = new URLSearchParams(location.search).get("story");
    if (!storyId) return;
    const exists = state.articles.some((a) => String(a.id) === String(storyId));
    if (exists) setTimeout(() => openArticle(storyId), 70);
  }

  function normalizeCategory(value = "") {
    const raw = String(value).trim();
    const key = raw.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ");
    const aliases = {
      news: "News",
      features: "Features",
      feature: "Features",
      editorial: "Editorial",
      opinion: "Opinion",
      sports: "Sports",
      sport: "Sports",
      "science and technology": "Science & Technology",
      "science and tech": "Science & Technology",
      "science technology": "Science & Technology",
      "sci-tech": "Science & Technology",
      "sci tech": "Science & Technology",
      "campus life": "Campus Life",
      campus: "Campus Life",
      photojournalism: "Photojournalism",
      "photo journalism": "Photojournalism",
    };
    return aliases[key] || raw;
  }
  function isRecentDate(value, days = 7) {
    const t = new Date(value).getTime(),
      now = Date.now();
    return Number.isFinite(t) && t <= now && t >= now - days * 86400000;
  }
  function mediaUrl(path) {
    if (!path) return "assets/hero-placeholder.svg";
    if (/^(https?:|data:|blob:)/.test(path) || path.startsWith("assets/"))
      return path;
    if (!db) return "assets/hero-placeholder.svg";
    return db.storage.from("journalism-media").getPublicUrl(path).data
      .publicUrl;
  }
  function coverSettings(a = {}) {
    const frame = ["landscape", "portrait", "square", "auto"].includes(
      a.cover_frame,
    )
      ? a.cover_frame
      : "auto";
    return {
      zoom: clamp(a.cover_zoom ?? 1, 0.5, 3),
      x: clamp(a.cover_offset_x ?? 0, -50, 50),
      y: clamp(a.cover_offset_y ?? 0, -50, 50),
      rotation: clamp(a.cover_rotation ?? 0, -180, 180),
      frame,
    };
  }
  function coverStyle(a = {}) {
    const s = coverSettings(a);
    return `--cover-zoom:${s.zoom};--cover-x:${s.x}%;--cover-y:${s.y}%;--cover-rotation:${s.rotation}deg;`;
  }
  function frameClass(a = {}) {
    return `frame-${coverSettings(a).frame}`;
  }
  function coverHtml(a, wrapper = "image-wrap", loading = "lazy") {
    return `<div class="${wrapper} media-frame ${frameClass(a)}" style="${coverStyle(a)}"><img src="${escapeHtml(mediaUrl(a.cover_image_path))}" alt="" ${loading ? `loading="${loading}"` : ""}></div>`;
  }

  async function loadPublicData() {
    if (!db) {
      state.articles = demoArticles.map((a) => ({
        ...a,
        category: normalizeCategory(a.category),
      }));
      state.staff = demoStaff;
      state.achievements = demoAchievements;
      state.settings = {
        ...DEFAULT_SETTINGS,
        publication_name: OFFICIAL_PUBLICATION_NAME,
      };
      state.gallery = [];
      state.usingDemo = true;
      renderAll();
      return;
    }
    const [articlesRes, staffRes, achievementsRes, galleryRes, settingsRes] =
      await Promise.all([
        db
          .from("articles")
          .select("*")
          .eq("status", "published")
          .order("published_at", { ascending: false }),
        db
          .from("staff_members")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        db
          .from("achievements")
          .select("*")
          .eq("is_published", true)
          .order("achievement_date", { ascending: false }),
        db
          .from("gallery_images")
          .select("*")
          .eq("is_published", true)
          .order("taken_at", { ascending: false }),
        db.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
    const results = [
      articlesRes,
      staffRes,
      achievementsRes,
      galleryRes,
      settingsRes,
    ];
    if (results.some((r) => r.error))
      console.warn(
        "Some Supabase public data could not be loaded.",
        results.map((r) => r.error).filter(Boolean),
      );
    state.articles = (articlesRes.data || []).map((a) => ({
      ...a,
      category: normalizeCategory(a.category),
    }));
    state.staff = staffRes.data || [];
    state.achievements = achievementsRes.data || [];
    state.gallery = galleryRes.data || [];
    state.settings = {
      ...DEFAULT_SETTINGS,
      ...(settingsRes.data || {}),
      publication_name: OFFICIAL_PUBLICATION_NAME,
    };
    state.usingDemo = false;
    renderAll();
  }

  function storyMeta(a) {
    return `${escapeHtml(a.author_name || state.settings.publication_name)} · ${relativeTimeHtml(a.published_at)}${a.demo ? ' · <span class="demo-badge">DEMO</span>' : ""}`;
  }
  function cardHtml(a) {
    return `<article class="article-card"><button type="button" data-article-id="${escapeHtml(a.id)}">${coverHtml(a)}<span class="section-kicker">${escapeHtml(normalizeCategory(a.category))}</span><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.dek || "")}</p><div class="card-meta">${storyMeta(a)}</div></button></article>`;
  }
  function getPhotojournalismItems() {
    const articleItems = state.articles
      .filter((a) => normalizeCategory(a.category) === "Photojournalism")
      .map((a) => ({
        kind: "article",
        id: `article-${a.id}`,
        article_id: a.id,
        title: a.title,
        caption: a.dek,
        photographer: a.author_name,
        image_path: a.cover_image_path,
        taken_at: a.published_at,
        article: a,
        demo: a.demo,
      }));
    const galleryItems = state.gallery.map((p) => ({
      kind: "gallery",
      ...p,
      taken_at: p.taken_at || p.created_at,
    }));
    return [...articleItems, ...galleryItems].sort(
      (a, b) => new Date(b.taken_at || 0) - new Date(a.taken_at || 0),
    );
  }
  function photoTileHtml(p) {
    const media =
      p.kind === "article"
        ? `<div class="photo-media media-frame ${frameClass(p.article)}" style="${coverStyle(p.article)}"><img src="${escapeHtml(mediaUrl(p.image_path))}" alt="${escapeHtml(p.title || "Photojournalism image")}" loading="lazy"></div>`
        : `<img src="${escapeHtml(mediaUrl(p.image_path))}" alt="${escapeHtml(p.title || "Photojournalism image")}" loading="lazy">`;
    const action =
      p.kind === "article"
        ? `<button data-article-id="${escapeHtml(p.article_id)}" aria-label="Read ${escapeHtml(p.title || "photojournalism story")}"></button>`
        : `<button data-photo-id="${escapeHtml(p.id)}" aria-label="View ${escapeHtml(p.title || "photo")}"></button>`;
    return `<figure class="photo-tile">${media}${action}<figcaption class="photo-caption"><strong>${escapeHtml(p.title || "Photojournalism")}</strong><span>${escapeHtml(p.photographer || OFFICIAL_PUBLICATION_NAME)}</span>${p.demo ? '<span class="demo-badge"> DEMO</span>' : ""}</figcaption></figure>`;
  }
  function galleryItemHtml(p) {
    if (p.kind === "article") {
      return `<figure class="gallery-item"><button data-article-id="${escapeHtml(p.article_id)}"><div class="gallery-media media-frame ${frameClass(p.article)}" style="${coverStyle(p.article)}"><img src="${escapeHtml(mediaUrl(p.image_path))}" alt="${escapeHtml(p.title || "Photojournalism story")}" loading="lazy"></div><figcaption><strong>${escapeHtml(p.title || "Photojournalism")}</strong><br><span>${escapeHtml(p.caption || "")}</span><br><small>Read visual story →</small></figcaption></button></figure>`;
    }
    return `<figure class="gallery-item"><button data-photo-id="${escapeHtml(p.id)}"><img src="${escapeHtml(mediaUrl(p.image_path))}" alt="${escapeHtml(p.title || "Photojournalism image")}" loading="lazy"><figcaption><strong>${escapeHtml(p.title || "Photojournalism")}</strong><br><span>${escapeHtml(p.caption || "")}</span></figcaption></button></figure>`;
  }
  function renderHome() {
    const sorted = [...state.articles].sort(
      (a, b) => new Date(b.published_at) - new Date(a.published_at),
    );
    const featured = sorted.filter((a) => a.is_featured);
    const lead = featured[0] || sorted[0];
    if (lead) {
      const leadCredit = String(lead.image_credit || "").trim();
      const leadEl = $("#leadStory");
      leadEl.className = `lead-story ${frameClass(lead)}`;
      leadEl.innerHTML =
        `<div class="lead-media media-frame ${frameClass(lead)}" style="${coverStyle(lead)}"><img src="${escapeHtml(mediaUrl(lead.cover_image_path))}" alt="" fetchpriority="high"></div><div class="lead-overlay"><span class="story-tag">${escapeHtml(lead.category)}</span><h2>${escapeHtml(lead.title)}</h2><p>${escapeHtml(lead.dek || "")}</p><div class="story-meta">${storyMeta(lead)}</div><span class="lead-read">Read the full story <span aria-hidden="true">↗</span></span></div>${leadCredit ? `<span class="lead-image-credit">${escapeHtml(leadCredit)}</span>` : ""}<button class="story-button" aria-label="Read ${escapeHtml(lead.title)}" data-article-id="${escapeHtml(lead.id)}"></button>`;
    } else {
      $("#leadStory").className = "lead-story";
      $("#leadStory").innerHTML =
        '<div class="empty-hero"><span class="section-kicker light">Newsroom</span><h2>No published stories yet.</h2><p>Authorized staff can publish the first story from the CMS.</p></div>';
    }
    const top = sorted.filter((a) => a.id !== lead?.id).slice(0, 4);
    $("#topStoriesList").innerHTML =
      top
        .map(
          (a) =>
            `<article class="top-story"><button data-article-id="${escapeHtml(a.id)}">${coverHtml(a, "top-story-media")}<div class="top-story-copy"><span class="section-kicker">${escapeHtml(a.category)}</span><h3>${escapeHtml(a.title)}</h3><p>${relativeTimeHtml(a.published_at)}</p></div></button></article>`,
        )
        .join("") || '<p class="muted">No additional stories yet.</p>';
    $("#latestGrid").innerHTML =
      sorted
        .filter((a) => a.id !== lead?.id)
        .slice(0, 6)
        .map(cardHtml)
        .join("") ||
      '<p class="muted">No additional published stories yet.</p>';

    const editorial =
      sorted.find((a) => a.category === "Editorial") ||
      sorted.find((a) => a.category === "Opinion");
    $("#homeEditorialSection").classList.toggle("hidden", !editorial);
    $("#editorialFeature").innerHTML = editorial
      ? `<button data-article-id="${escapeHtml(editorial.id)}"><span class="section-kicker light">${escapeHtml(editorial.category)}</span><h3>${escapeHtml(editorial.title)}</h3><p>${escapeHtml(editorial.dek || "")}</p><span>Read piece →</span></button>`
      : "";

    const campus = sorted
      .filter((a) => a.category === "Campus Life")
      .slice(0, 3);
    const sports = sorted.filter((a) => a.category === "Sports").slice(0, 3);
    $("#campusPanel").classList.toggle("hidden", !campus.length);
    $("#sportsPanel").classList.toggle("hidden", !sports.length);
    $("#campusSportsSection").classList.toggle(
      "hidden",
      !(campus.length || sports.length),
    );
    renderStacked("#campusList", campus);
    renderStacked("#sportsList", sports);

    const photos = getPhotojournalismItems();
    $("#homePhotoSection").classList.toggle("hidden", !photos.length);
    renderPhotoStrip(photos);

    const board = state.staff.filter((s) => s.group_type === "editorial_board");
    $("#homeBoardSection").classList.toggle(
      "hidden",
      !board.length && !state.usingDemo,
    );
    renderBoard(board);
  }
  function renderStacked(sel, arr) {
    $(sel).innerHTML = arr.length
      ? arr
          .map(
            (a) =>
              `<article class="stacked-story">${coverHtml(a, "stacked-media")}<button data-article-id="${escapeHtml(a.id)}"><span class="section-kicker">${escapeHtml(a.category)}</span><h3>${escapeHtml(a.title)}</h3><small>${relativeTimeHtml(a.published_at)}</small></button></article>`,
          )
          .join("")
      : "";
  }
  function renderPhotoStrip(items = getPhotojournalismItems()) {
    const photos = items.slice(0, 5);
    $("#photoStrip").innerHTML = photos.map(photoTileHtml).join("");
  }
  function renderBoard(prefetched) {
    const board =
      prefetched ||
      state.staff.filter((s) => s.group_type === "editorial_board").slice(0, 8);
    const arr = board.length
      ? board
      : state.usingDemo
        ? demoStaff.slice(0, 8)
        : [];
    $("#boardGrid").innerHTML = arr.map(staffCardHtml).join("");
  }
  function staffCardHtml(s) {
    const avatar = s.photo_path
      ? `<img src="${escapeHtml(mediaUrl(s.photo_path))}" alt="${escapeHtml(s.full_name)}">`
      : escapeHtml(initials(s.full_name));
    return `<article class="staff-card"><div class="staff-avatar">${avatar}</div><div class="staff-copy"><h3>${escapeHtml(s.full_name)}</h3><div class="staff-role">${escapeHtml(s.position)}</div>${s.bio ? `<p>${escapeHtml(s.bio)}</p>` : ""}${s.demo ? '<span class="demo-badge">DEMO</span>' : ""}</div></article>`;
  }
  function renderPhotosPage() {
    const items = getPhotojournalismItems();
    $("#photoGallery").innerHTML = items.length
      ? items.map(galleryItemHtml).join("")
      : "<p>No photojournalism stories have been published yet.</p>";
  }
  function renderBranding() {
    state.settings.publication_name = OFFICIAL_PUBLICATION_NAME;
    const s = state.settings;
    document.title = `${OFFICIAL_PUBLICATION_NAME} | ${s.school_abbreviation}`;
    const pairs = [
      ["#publicationNameMasthead", OFFICIAL_PUBLICATION_NAME],
      ["#schoolNameMasthead", s.school_name],
      ["#publicationTaglineMasthead", s.tagline],
      ["#aboutPagePublicationName", OFFICIAL_PUBLICATION_NAME],
      ["#aboutSchoolAbbreviation", s.school_abbreviation],
      ["#aboutSchoolName", s.school_name],
      ["#aboutPublicationName", OFFICIAL_PUBLICATION_NAME],
      ["#aboutPublicationTagline", s.tagline],
      ["#footerPublicationName", OFFICIAL_PUBLICATION_NAME],
      ["#footerSchoolName", s.school_name],
      ["#footerPublicationInline", OFFICIAL_PUBLICATION_NAME],
      ["#footerSchoolAbbreviation", s.school_abbreviation],
    ];
    pairs.forEach(([sel, val]) => {
      const el = $(sel);
      if (el) el.textContent = val || "";
    });
    const intro = $("#aboutPageIntro");
    if (intro)
      intro.textContent = `The student publication of ${s.school_name} (${s.school_abbreviation}).`;
    const searchLabel = $('label[for="globalSearch"]');
    if (searchLabel)
      searchLabel.textContent = `Search ${OFFICIAL_PUBLICATION_NAME}`;
  }
  function renderAbout() {
    renderBranding();
    const s = state.settings;
    $("#aboutHistory").textContent =
      s.publication_history ||
      `This site is the digital home of ${s.publication_name}. An administrator can add the verified publication history from the CMS.`;
    [
      ["#aboutMissionWrap", "#aboutMission", s.mission],
      ["#aboutVisionWrap", "#aboutVision", s.vision],
    ].forEach(([wrapSel, textSel, val]) => {
      const wrap = $(wrapSel),
        text = $(textSel);
      if (val) {
        text.textContent = val;
        wrap.classList.remove("hidden");
      } else {
        wrap.classList.add("hidden");
        text.textContent = "";
      }
    });
    $("#achievementGrid").innerHTML = state.achievements.length
      ? state.achievements
          .map(
            (a) =>
              `<article class="achievement-card">${a.image_path ? `<img class="achievement-image" src="${escapeHtml(mediaUrl(a.image_path))}" alt="">` : ""}<span class="mini-label">${escapeHtml(a.competition_name || "Achievement")}</span><h3>${escapeHtml(a.title || a.award || "Recognition")}</h3>${a.award ? `<p><strong>${escapeHtml(a.award)}</strong></p>` : ""}${a.level ? `<p>${escapeHtml(a.level)}</p>` : ""}${a.achievement_date ? `<p>${escapeHtml(formatDate(a.achievement_date))}</p>` : ""}<p>${escapeHtml(a.description || "")}</p>${a.demo ? '<span class="demo-badge">DEMO</span>' : ""}</article>`,
          )
          .join("")
      : '<p class="muted">No journalism achievements have been added yet.</p>';
    const order = { editorial_board: 0, staff: 1, adviser: 2 };
    const staff = [...state.staff].sort(
      (a, b) =>
        (order[a.group_type] ?? 9) - (order[b.group_type] ?? 9) ||
        (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    $("#fullStaffGrid").innerHTML = staff.length
      ? staff.map(staffCardHtml).join("")
      : '<p class="muted">Staff information has not been added yet.</p>';
  }
  function renderArchives() {
    const categories = [
      ...new Set(state.articles.map((a) => normalizeCategory(a.category))),
    ].sort();
    const years = [
      ...new Set(
        state.articles
          .map((a) => new Date(a.published_at).getFullYear())
          .filter(Boolean),
      ),
    ].sort((a, b) => b - a);
    $("#archiveCategory").innerHTML =
      '<option value="">All categories</option>' +
      categories.map((c) => `<option>${escapeHtml(c)}</option>`).join("");
    $("#archiveYear").innerHTML =
      '<option value="">All years</option>' +
      years.map((y) => `<option>${y}</option>`).join("");
    filterArchives();
  }
  function filterArchives() {
    const q = ($("#archiveSearch").value || "").trim().toLowerCase(),
      c = normalizeCategory($("#archiveCategory").value),
      y = $("#archiveYear").value;
    const arr = state.articles.filter(
      (a) =>
        (!c || normalizeCategory(a.category) === c) &&
        (!y || String(new Date(a.published_at).getFullYear()) === y) &&
        (!q ||
          [a.title, a.dek, a.author_name, normalizeCategory(a.category)].some(
            (v) =>
              String(v || "")
                .toLowerCase()
                .includes(q),
          )),
    );
    $("#archiveGrid").innerHTML =
      arr
        .map(
          (a) =>
            `<article class="archive-row"><div class="archive-date">${escapeHtml(formatDate(a.published_at))}</div><button data-article-id="${escapeHtml(a.id)}"><span class="section-kicker">${escapeHtml(a.category)}</span><h3>${escapeHtml(a.title)}</h3><small>${escapeHtml(a.author_name || "")}</small></button><button class="text-btn" data-article-id="${escapeHtml(a.id)}">Read →</button></article>`,
        )
        .join("") || "<p>No matching stories.</p>";
  }
  function renderCategory(category) {
    category = normalizeCategory(category);
    state.currentCategory = category;
    $("#categoryTitle").textContent = category;
    const arr = state.articles.filter(
      (a) => normalizeCategory(a.category) === category,
    );
    $("#categoryGrid").innerHTML = arr.length
      ? arr.map(cardHtml).join("")
      : "<p>No published stories in this section yet.</p>";
  }
  function renderBreaking() {
    const now = Date.now();
    const BREAKING_DURATION_MS = 24 * 60 * 60 * 1000;

    // Breaking News is temporary: only show a published breaking article
    // during the first 24 hours after its published_at time.
    const breaking = state.articles.find((a) => {
      if (!a.is_breaking || !a.published_at) return false;
      const publishedAt = new Date(a.published_at).getTime();
      if (!Number.isFinite(publishedAt)) return false;
      const age = now - publishedAt;
      return age >= 0 && age < BREAKING_DURATION_MS;
    });

    if (!breaking) {
      $("#breakingBar").classList.add("hidden");
      $("#breakingHeadline").textContent = "";
      delete $("#breakingHeadline").dataset.articleId;
      return;
    }

    $("#breakingHeadline").textContent = breaking.title;
    $("#breakingHeadline").dataset.articleId = breaking.id;
    $("#breakingBar").classList.remove("hidden");
  }
  function getRecentSectionExpiry(category, now = Date.now()) {
    const cat = normalizeCategory(category);
    const timestamps = state.articles
      .filter(
        (a) =>
          !a.demo &&
          normalizeCategory(a.category) === cat &&
          a.published_at,
      )
      .map((a) => new Date(a.published_at).getTime())
      .filter((t) => Number.isFinite(t) && t <= now);

    // A newly published photojournalism gallery item can also wake the
    // Photojournalism section for seven days.
    if (cat === "Photojournalism") {
      state.gallery
        .filter((item) => !item.demo)
        .forEach((item) => {
          const value = item.created_at || item.taken_at;
          const t = new Date(value || "").getTime();
          if (Number.isFinite(t) && t <= now) timestamps.push(t);
        });
    }

    if (!timestamps.length) return 0;
    const latestPublished = Math.max(...timestamps);
    const expiresAt = latestPublished + SECTION_NAV_LIFETIME_MS;
    return expiresAt > now ? expiresAt : 0;
  }

  function renderDynamicNav() {
    const now = Date.now();
    const activeExpiries = [];

    $$("[data-recent-category]").forEach((link) => {
      const cat = normalizeCategory(link.dataset.recentCategory);
      const expiresAt = getRecentSectionExpiry(cat, now);
      const isVisible = expiresAt > now;

      // Home, Archives and About do not use data-recent-category, so they
      // always remain visible. Every newsroom category uses the exact same
      // seven-day rule on both desktop and mobile.
      link.hidden = !isVisible;
      link.setAttribute("aria-hidden", String(!isVisible));
      link.toggleAttribute("inert", !isVisible);
      if (!isVisible) {
        link.classList.remove("active");
        link.removeAttribute("aria-current");
      }
      if (isVisible) activeExpiries.push(expiresAt);
    });

    // Keep the seven-day window accurate even when the page remains open.
    if (sectionNavExpiryTimer) {
      clearTimeout(sectionNavExpiryTimer);
      sectionNavExpiryTimer = null;
    }
    if (activeExpiries.length) {
      const nextExpiry = Math.min(...activeExpiries);
      const delay = Math.max(1000, nextExpiry - now + 250);
      sectionNavExpiryTimer = window.setTimeout(renderDynamicNav, delay);
    }
    syncActiveNav(location.hash || "#home");
  }
  function renderAll() {
    renderBranding();
    renderHome();
    renderPhotosPage();
    renderAbout();
    renderArchives();
    renderBreaking();
    renderDynamicNav();
    applyCurrentHash();
    refreshRelativeTimes();
  }

  async function openArticle(id) {
    const a =
      state.articles.find((x) => String(x.id) === String(id)) ||
      state.adminArticles.find((x) => String(x.id) === String(id));
    if (!a) return;

    const rawBody = String(a.body || "").trim();
    const articlePhotos = a.demo ? [] : await fetchArticlePhotos(a.id);
    const storyContent = articleBodyWithPhotos(rawBody, articlePhotos);

    const isDeveloping = rawBody.length < 140;
    const developingNote = `<aside class="developing-note" aria-label="Story status"><span>Developing story</span><p>This report is still being completed by The East-Washington Times. Additional verified details, context, and updates will be added as the newsroom confirms them.</p></aside>`;
    const bodyHtml = rawBody
      ? `${storyContent}${isDeveloping ? developingNote : ""}`
      : `${storyContent}${developingNote}<p class="reader-placeholder">The full article has not been added yet. Please check back for the completed report.</p>`;

    const coverPath = String(a.cover_image_path || "").trim();
    const fallbackCoverByCategory = {
      Editorial: "assets/editorial-placeholder.svg",
      Opinion: "assets/editorial-placeholder.svg",
      Sports: "assets/sports-placeholder.svg",
      "Science & Technology": "assets/science-placeholder.svg",
      "Campus Life": "assets/campus-placeholder.svg",
      Photojournalism: "assets/photo-placeholder.svg",
      News: "assets/hero-placeholder.svg",
    };
    const readerCoverPath =
      coverPath ||
      fallbackCoverByCategory[normalizeCategory(a.category)] ||
      "assets/hero-placeholder.svg";
    const imageCredit = String(a.image_credit || "").trim();
    // Use the exact same saved frame/zoom/position/rotation as the CMS preview.
    // The source image file itself is still never changed.
    const coverHtml = `<figure class="reader-cover-frame media-frame ${frameClass(a)}" style="${coverStyle(a)}"><img src="${escapeHtml(mediaUrl(readerCoverPath))}" alt="${escapeHtml(a.title || "Article image")}" loading="eager"><figcaption>${imageCredit ? escapeHtml(imageCredit) : "Story image · The East-Washington Times"}</figcaption></figure>`;

    $("#articleReader").innerHTML =
      `<header class="reader-header"><span class="story-tag">${escapeHtml(normalizeCategory(a.category))}</span><h1>${escapeHtml(a.title)}</h1><p class="reader-dek">${escapeHtml(a.dek || "")}</p><div class="reader-meta"><span>By ${escapeHtml(a.author_name || state.settings.publication_name)}</span><span>${escapeHtml(formatDate(a.published_at))}</span>${isDeveloping ? '<span class="reader-status">Developing</span>' : ""}${a.demo ? '<span>Demo</span>' : ""}</div></header>${coverHtml}<div class="reader-body ${isDeveloping ? "is-developing" : ""}">${bodyHtml}</div><footer class="reader-footer"><strong>${escapeHtml(state.settings.publication_name || OFFICIAL_PUBLICATION_NAME)}</strong><span>Student journalism from ${escapeHtml(state.settings.school_name || DEFAULT_SETTINGS.school_name)}</span></footer>`;
    openLockedDialog($("#articleDialog"));
  }
  function openPhoto(id) {
    const p = state.gallery.find((x) => String(x.id) === String(id));
    if (!p) return;
    $("#photoViewer").className = "photo-viewer";
    $("#photoViewer").innerHTML =
      `<img src="${escapeHtml(mediaUrl(p.image_path))}" alt="${escapeHtml(p.title || "Photojournalism image")}"><div class="photo-detail"><span class="section-kicker light">Photojournalism</span><h2>${escapeHtml(p.title || "Untitled")}</h2><p>${escapeHtml(p.caption || "")}</p><p><strong>Photo:</strong> ${escapeHtml(p.photographer || state.settings.publication_name)}</p><p>${escapeHtml(formatDate(p.taken_at))}</p>${p.demo ? '<span class="demo-badge">DEMO</span>' : ""}</div>`;
    openLockedDialog($("#photoDialog"));
  }
  function openView(route, category = "") {
    $$(".view").forEach((v) => v.classList.remove("active-view"));
    $$(".main-nav a").forEach((a) => a.classList.remove("active"));
    if (category) {
      renderCategory(category);
      $("#categoryView").classList.add("active-view");
      $(
        `.main-nav a[data-category="${CSS.escape(normalizeCategory(category))}"]`,
      )?.classList.add("active");
    } else {
      const map = {
        home: "#homeView",
        photojournalism: "#photoView",
        archives: "#archivesView",
        about: "#aboutView",
      };
      $(map[route] || "#homeView").classList.add("active-view");
      $(`.main-nav a[data-route="${route}"]`)?.classList.add("active");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function applyCurrentHash() {
    const hash = location.hash.replace("#", "") || "home";
    const reverse = Object.fromEntries(
      Object.entries(CATEGORY_HASHES)
        .filter(([c]) => c !== "Photojournalism")
        .map(([c, h]) => [h, c]),
    );

    if (reverse[hash]) openView("", reverse[hash]);
    else if (["photojournalism", "archives", "about"].includes(hash))
      openView(hash);
    else openView("home");

    // openView handles the view itself; this final sync guarantees that the
    // visual highlight is based on the URL/hash for every route, including
    // Home, Archives, About and all timed category sections.
    syncActiveNav(`#${hash}`);
  }
  function runSearch() {
    const q = $("#globalSearch").value.trim().toLowerCase(),
      out = $("#searchResults");
    if (!q) {
      out.innerHTML = "";
      return;
    }
    const results = state.articles
      .filter((a) =>
        [
          a.title,
          a.dek,
          a.body,
          a.author_name,
          normalizeCategory(a.category),
        ].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(q),
        ),
      )
      .slice(0, 8);
    out.innerHTML = results.length
      ? results
          .map(
            (a) =>
              `<button class="search-result" data-article-id="${escapeHtml(a.id)}"><span><strong>${escapeHtml(a.title)}</strong><br><small>${escapeHtml(normalizeCategory(a.category))} · ${escapeHtml(a.author_name || "")}</small></span><span>→</span></button>`,
          )
          .join("")
      : "<p>No matching stories.</p>";
  }

  async function uploadMedia(file, folder) {
    if (!db || !file) return "";
    const ext = (file.name.split(".").pop() || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage
      .from("journalism-media")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
    if (error) throw error;
    return path;
  }
  function clearArticlePhotoDraft() {
    articlePhotoDraft.forEach((item) => {
      if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
    });
    articlePhotoDraft = [];
    articlePhotoOriginalIds = new Set();
    const input = $("#articleImages");
    if (input) input.value = "";
    renderArticlePhotoManager();
  }

  function articlePhotoPreviewUrl(item) {
    if (item.objectUrl) return item.objectUrl;
    return mediaUrl(item.image_path || "");
  }

  function renderArticlePhotoManager() {
    const list = $("#articleImageList");
    if (!list) return;

    const visible = articlePhotoDraft.filter((item) => !item.removed);
    if (!visible.length) {
      list.innerHTML =
        '<p class="muted article-image-empty">No additional photos yet.</p>';
      return;
    }

    list.innerHTML = visible
      .map((item, index) => {
        const key = escapeHtml(item.key);
        const preview = escapeHtml(articlePhotoPreviewUrl(item));
        const caption = escapeHtml(item.caption || "");
        const credit = escapeHtml(item.credit || "");
        return `<div class="article-image-item" data-photo-key="${key}">
          <img class="article-image-thumb" src="${preview}" alt="Article photo ${index + 1}">
          <div class="article-image-fields">
            <strong>Photo ${index + 1}</strong>
            <label>
              <span>Caption <small>(optional)</small></span>
              <input
                type="text"
                maxlength="240"
                value="${caption}"
                placeholder="What is happening in this photo?"
                data-photo-caption="${key}"
              >
            </label>
            <label>
              <span>Credit / creator <small>(optional)</small></span>
              <input
                type="text"
                maxlength="180"
                value="${credit}"
                placeholder="Photo by… / Illustration by…"
                data-photo-credit="${key}"
              >
            </label>
          </div>
          <div class="article-image-actions" aria-label="Photo controls">
            <button type="button" class="btn btn-ghost compact-btn" data-photo-move="up" data-photo-key="${key}" ${index === 0 ? "disabled" : ""}>↑</button>
            <button type="button" class="btn btn-ghost compact-btn" data-photo-move="down" data-photo-key="${key}" ${index === visible.length - 1 ? "disabled" : ""}>↓</button>
            <button type="button" class="btn btn-ghost compact-btn danger-text" data-photo-remove="${key}">Remove</button>
          </div>
        </div>`;
      })
      .join("");
  }

  function addArticlePhotoFiles(files) {
    [...(files || [])].forEach((file) => {
      if (!file || !file.type?.startsWith("image/")) return;
      articlePhotoDraft.push({
        key: `new-${crypto.randomUUID()}`,
        id: null,
        image_path: "",
        caption: "",
        credit: "",
        file,
        objectUrl: URL.createObjectURL(file),
        removed: false,
        isNew: true,
      });
    });
    renderArticlePhotoManager();
    const input = $("#articleImages");
    if (input) input.value = "";
  }

  function moveArticlePhoto(key, direction) {
    const visible = articlePhotoDraft.filter((item) => !item.removed);
    const current = visible.findIndex((item) => item.key === key);
    if (current < 0) return;
    const target = direction === "up" ? current - 1 : current + 1;
    if (target < 0 || target >= visible.length) return;

    const currentItem = visible[current];
    const targetItem = visible[target];
    const currentIndex = articlePhotoDraft.indexOf(currentItem);
    const targetIndex = articlePhotoDraft.indexOf(targetItem);
    articlePhotoDraft[currentIndex] = targetItem;
    articlePhotoDraft[targetIndex] = currentItem;
    renderArticlePhotoManager();
  }

  function removeArticlePhoto(key) {
    const item = articlePhotoDraft.find((photo) => photo.key === key);
    if (!item) return;

    if (item.isNew) {
      if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
      articlePhotoDraft = articlePhotoDraft.filter((photo) => photo.key !== key);
    } else {
      item.removed = true;
    }
    renderArticlePhotoManager();
  }

  async function loadArticlePhotosForEdit(articleId) {
    clearArticlePhotoDraft();
    if (!db || !articleId) return;

    const list = $("#articleImageList");
    if (list)
      list.innerHTML =
        '<p class="muted article-image-empty">Loading article photos…</p>';

    const { data, error } = await db
      .from("article_images")
      .select("*")
      .eq("article_id", articleId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Could not load article photos.", error);
      if (list)
        list.innerHTML =
          '<p class="form-message error-text">Additional photos could not be loaded. Run the V24 Supabase SQL if you have not done so yet.</p>';
      return;
    }

    articlePhotoDraft = (data || []).map((photo) => ({
      ...photo,
      key: `existing-${photo.id}`,
      file: null,
      objectUrl: "",
      removed: false,
      isNew: false,
    }));
    articlePhotoOriginalIds = new Set(
      articlePhotoDraft.map((photo) => String(photo.id)),
    );
    renderArticlePhotoManager();
  }

  async function syncArticlePhotos(articleId) {
    if (!db || !articleId) return;

    const active = articlePhotoDraft.filter((item) => !item.removed);
    const removedExisting = articlePhotoDraft.filter(
      (item) => item.removed && !item.isNew && item.id,
    );

    // Upload newly selected files first.
    for (const item of active) {
      if (item.isNew && item.file && !item.image_path) {
        item.image_path = await uploadMedia(
          item.file,
          `articles/${articleId}/inline`,
        );
      }
    }

    // Remove photos deleted in the editor.
    if (removedExisting.length) {
      const removedIds = removedExisting.map((item) => item.id);
      const { error: deleteError } = await db
        .from("article_images")
        .delete()
        .in("id", removedIds);
      if (deleteError) throw deleteError;

      const storagePaths = removedExisting
        .map((item) => item.image_path)
        .filter(Boolean);
      if (storagePaths.length) {
        const { error: storageDeleteError } = await db.storage
          .from("journalism-media")
          .remove(storagePaths);
        if (storageDeleteError)
          console.warn(
            "Article image rows were removed, but some Storage files could not be deleted.",
            storageDeleteError,
          );
      }
    }

    // Update existing rows and insert new rows in the order shown in the editor.
    for (let index = 0; index < active.length; index += 1) {
      const item = active[index];
      const payload = {
        article_id: articleId,
        image_path: item.image_path,
        caption: String(item.caption || "").trim(),
        credit: String(item.credit || "").trim(),
        sort_order: (index + 1) * 10,
        updated_at: new Date().toISOString(),
      };

      if (item.isNew) {
        const { data, error } = await db
          .from("article_images")
          .insert({
            ...payload,
            created_by: state.currentUser.id,
          })
          .select("*")
          .single();
        if (error) throw error;
        item.id = data.id;
        item.key = `existing-${data.id}`;
        item.isNew = false;
        if (item.objectUrl) {
          URL.revokeObjectURL(item.objectUrl);
          item.objectUrl = "";
        }
      } else {
        const { error } = await db
          .from("article_images")
          .update(payload)
          .eq("id", item.id);
        if (error) throw error;
      }
    }

    articlePhotoDraft = active;
    articlePhotoOriginalIds = new Set(
      articlePhotoDraft.filter((item) => item.id).map((item) => String(item.id)),
    );
  }

  async function fetchArticlePhotos(articleId) {
    if (!db || !articleId) return [];
    const { data, error } = await db
      .from("article_images")
      .select("id,article_id,image_path,caption,credit,sort_order,created_at")
      .eq("article_id", articleId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Could not load inline article photos.", error);
      return [];
    }
    return data || [];
  }

  function inlineArticlePhotoHtml(photo, index) {
    const caption = String(photo.caption || "").trim();
    const credit = String(photo.credit || "").trim();
    const captionBits = [caption, credit].filter(Boolean);
    return `<figure class="reader-inline-photo">
      <img src="${escapeHtml(mediaUrl(photo.image_path))}" alt="${escapeHtml(caption || `Article photo ${index + 1}`)}" loading="lazy">
      ${captionBits.length ? `<figcaption>${captionBits.map((bit) => escapeHtml(bit)).join(" · ")}</figcaption>` : ""}
    </figure>`;
  }

  function articleBodyWithPhotos(rawBody, photos) {
    const paragraphs = String(rawBody || "")
      .trim()
      .split(/\n{2,}/)
      .filter(Boolean);

    if (!paragraphs.length) {
      return (photos || []).map(inlineArticlePhotoHtml).join("");
    }

    if (!photos?.length) {
      return paragraphs
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
        .join("");
    }

    const photoBuckets = new Map();
    photos.forEach((photo, index) => {
      const position = Math.max(
        1,
        Math.min(
          paragraphs.length,
          Math.round(((index + 1) * paragraphs.length) / (photos.length + 1)),
        ),
      );
      if (!photoBuckets.has(position)) photoBuckets.set(position, []);
      photoBuckets.get(position).push({ photo, index });
    });

    const parts = [];
    paragraphs.forEach((paragraph, index) => {
      parts.push(`<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`);
      const afterParagraph = index + 1;
      const bucket = photoBuckets.get(afterParagraph) || [];
      bucket.forEach(({ photo, index: photoIndex }) => {
        parts.push(inlineArticlePhotoHtml(photo, photoIndex));
      });
    });

    return parts.join("");
  }

  async function refreshAdminUser() {
    if (!db) {
      state.currentUser = null;
      state.currentRole = "";
      state.isEditor = false;
      state.isAdmin = false;
      return;
    }
    const {
      data: { user },
    } = await db.auth.getUser();
    state.currentUser = user || null;
    state.currentRole = "";
    state.isEditor = false;
    state.isAdmin = false;
    if (user) {
      const { data, error } = await db
        .from("profiles")
        .select("role,display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (!error) {
        state.currentRole = data?.role || "";
        state.isEditor = ["editor", "admin"].includes(state.currentRole);
        state.isAdmin = state.currentRole === "admin";
      }
    }
    updateAdminPane();
  }
  function updateAdminPane() {
    const authPane = $("#adminAuthPane"),
      dash = $("#adminDashboard"),
      topAccess = $("#adminToggle"),
      footerAccess = $("#cmsAccessLink");
    if (state.currentUser && state.isEditor) {
      const roleLabel = state.isAdmin ? "ADMIN" : "EDITOR";
      authPane.classList.add("hidden");
      dash.classList.remove("hidden");
      $("#signedInRole").textContent = roleLabel;
      if (topAccess) {
        topAccess.textContent = `${roleLabel} CMS`;
        topAccess.classList.remove("hidden");
      }
      if (footerAccess) footerAccess.textContent = `Open ${roleLabel} CMS`;
      $$("[data-admin-only]").forEach((el) =>
        el.classList.toggle("hidden", !state.isAdmin),
      );
      if (!state.isAdmin && $(".admin-tab.active[data-admin-only]"))
        switchAdminTab("articles");
      loadAdminData();
    } else {
      authPane.classList.remove("hidden");
      dash.classList.add("hidden");
      if (topAccess) {
        topAccess.textContent = "CMS";
        topAccess.classList.add("hidden");
      }
      if (footerAccess) footerAccess.textContent = "Editorial access";
    }
  }
  async function loadAdminData() {
    if (!db || !state.isEditor) return;
    const promises = [
      db.from("articles").select("*").order("updated_at", { ascending: false }),
      db
        .from("staff_members")
        .select("*")
        .order("sort_order", { ascending: true }),
    ];
    if (state.isAdmin) {
      promises.push(
        db
          .from("achievements")
          .select("*")
          .order("achievement_date", { ascending: false }),
      );
      promises.push(
        db.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      );
    }
    const results = await Promise.all(promises);
    state.adminArticles = (results[0].data || []).map((a) => ({
      ...a,
      category: normalizeCategory(a.category),
    }));
    state.adminStaff = results[1].data || [];
    if (state.isAdmin) {
      state.adminAchievements = results[2].data || [];
      state.settings = {
        ...DEFAULT_SETTINGS,
        ...(results[3].data || state.settings),
        publication_name: OFFICIAL_PUBLICATION_NAME,
      };
      populatePublicationForm();
    }
    renderAdminLists();
  }
  function sortedAdminArticles() {
    const mode = $("#articleLibrarySort")?.value || "newest";
    const list = [...state.adminArticles];
    const publishedTime = (a) => {
      const t = new Date(a.published_at || a.created_at || a.updated_at || 0).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    const updatedTime = (a) => {
      const t = new Date(a.updated_at || a.published_at || a.created_at || 0).getTime();
      return Number.isFinite(t) ? t : 0;
    };
    if (mode === "oldest") return list.sort((a, b) => publishedTime(a) - publishedTime(b));
    if (mode === "updated") return list.sort((a, b) => updatedTime(b) - updatedTime(a));
    if (mode === "title") return list.sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "en", { sensitivity: "base" }));
    return list.sort((a, b) => publishedTime(b) - publishedTime(a));
  }

  function renderAdminLists() {
    const count = state.adminArticles.length;
    const countEl = $("#articleCount");
    if (countEl)
      countEl.textContent = `${count} ${count === 1 ? "story" : "stories"}`;
    $("#adminArticleList").innerHTML =
      sortedAdminArticles()
        .map(
          (a) =>
            `<div class="admin-row"><div><h4>${escapeHtml(a.title)}</h4><small>${escapeHtml(normalizeCategory(a.category))} · ${escapeHtml(a.status)} · ${escapeHtml(formatDate(a.published_at))}</small></div><div class="row-actions"><button data-edit-article="${escapeHtml(a.id)}">Edit</button><button class="danger" data-delete-article="${escapeHtml(a.id)}">Delete</button></div></div>`,
        )
        .join("") || '<p class="muted">No articles yet.</p>';
    $("#adminStaffList").innerHTML =
      state.adminStaff
        .map(
          (s) =>
            `<div class="admin-row"><div><h4>${escapeHtml(s.full_name)}</h4><small>${escapeHtml(s.position)} · ${escapeHtml(s.group_type)}</small></div><div class="row-actions"><button data-edit-staff="${escapeHtml(s.id)}">Edit</button><button class="danger" data-delete-staff="${escapeHtml(s.id)}">Delete</button></div></div>`,
        )
        .join("") || "<p>No staff members yet.</p>";
    if (state.isAdmin)
      $("#adminAchievementList").innerHTML =
        state.adminAchievements
          .map(
            (a) =>
              `<div class="admin-row"><div><h4>${escapeHtml(a.title)}</h4><small>${escapeHtml(a.competition_name || "Achievement")}${a.achievement_date ? " · " + escapeHtml(formatDate(a.achievement_date)) : ""}</small></div><div class="row-actions"><button data-edit-achievement="${escapeHtml(a.id)}">Edit</button><button class="danger" data-delete-achievement="${escapeHtml(a.id)}">Delete</button></div></div>`,
          )
          .join("") || "<p>No achievements yet.</p>";
  }
  function switchAdminTab(name) {
    const target = $(`.admin-tab[data-admin-tab="${name}"]`);
    if (!target || target.hidden || target.classList.contains("hidden")) return;
    $$(".admin-tab").forEach((b) => b.classList.remove("active"));
    $$(".admin-tab-panel").forEach((p) => p.classList.remove("active"));
    target.classList.add("active");
    const id = "#admin" + name[0].toUpperCase() + name.slice(1);
    $(id)?.classList.add("active");
  }

  function setCoverControls(values = {}) {
    const s = coverSettings(values);
    $("#coverZoom").value = s.zoom;
    $("#coverX").value = s.x;
    $("#coverY").value = s.y;
    $("#coverRotation").value = s.rotation;
    $("#coverFrame").value = s.frame;
    updateCoverPreview();
  }
  function getCoverControls() {
    return {
      cover_zoom: Number($("#coverZoom").value),
      cover_offset_x: Number($("#coverX").value),
      cover_offset_y: Number($("#coverY").value),
      cover_rotation: Number($("#coverRotation").value),
      cover_frame: $("#coverFrame").value,
    };
  }
  function updateCoverPreview() {
    const vals = getCoverControls(),
      s = coverSettings(vals),
      frame = $("#coverPreviewFrame"),
      img = $("#articleCoverPreview");
    frame.className = `cover-preview media-frame frame-${s.frame}`;
    frame.setAttribute("style", coverStyle(vals));
    $("#coverZoomValue").textContent = `${s.zoom.toFixed(2)}×`;
    $("#coverXValue").textContent = String(s.x);
    $("#coverYValue").textContent = String(s.y);
    $("#coverRotationValue").textContent = `${s.rotation}°`;
    img.style.transform = "";
  }
  function resetArticleForm() {
    if (coverObjectUrl) {
      URL.revokeObjectURL(coverObjectUrl);
      coverObjectUrl = "";
    }
    $("#articleForm").reset();
    $("#articleId").value = "";
    $("#articleDate").value = "";
    $("#articleFormMessage").textContent = "";
    $("#articleCoverPreview").src = "assets/hero-placeholder.svg";
    clearArticlePhotoDraft();
    setCoverControls({
      cover_zoom: 1,
      cover_offset_x: 0,
      cover_offset_y: 0,
      cover_rotation: 0,
      cover_frame: "auto",
    });
  }
  async function editArticle(id) {
    const a = state.adminArticles.find((x) => String(x.id) === String(id));
    if (!a) return;
    $("#articleId").value = a.id;
    $("#articleTitle").value = a.title || "";
    $("#articleCategory").value = normalizeCategory(a.category) || "News";
    $("#articleAuthor").value = a.author_name || "";
    $("#articleImageCredit").value = a.image_credit || "";
    $("#articleDek").value = a.dek || "";
    $("#articleBody").value = a.body || "";
    $("#articleFeatured").checked = !!a.is_featured;
    $("#articleBreaking").checked = !!a.is_breaking;
    $("#articleStatus").value = a.status || "draft";
    $("#articleCoverPreview").src = mediaUrl(a.cover_image_path);
    setCoverControls(a);
    if (a.published_at) {
      const d = new Date(a.published_at),
        local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      $("#articleDate").value = local.toISOString().slice(0, 16);
    }
    switchAdminTab("articles");
    $("#articleForm").scrollIntoView({ behavior: "smooth", block: "start" });
    await loadArticlePhotosForEdit(a.id);
  }
  async function handleArticleSubmit(e) {
    e.preventDefault();
    if (!db || !state.isEditor) return;
    const btn = e.submitter;
    $("#articleFormMessage").textContent = "";
    setButtonBusy(btn, true, "Preparing…");
    setGlobalBusy(true, "Preparing article…");
    try {
      const id = $("#articleId").value,
        existing = id
          ? state.adminArticles.find((a) => String(a.id) === String(id))
          : null;
      let cover = existing?.cover_image_path || "";
      const file = $("#articleCover").files[0];
      if (file) {
        setButtonBusy(btn, true, "Uploading image…");
        setGlobalBusy(true, "Uploading cover image…");
        cover = await uploadMedia(file, "articles");
      }
      const title = $("#articleTitle").value.trim(),
        status = $("#articleStatus").value;
      const shouldNotify =
        status === "published" && existing?.status !== "published";
      setButtonBusy(
        btn,
        true,
        status === "published" ? "Publishing…" : "Saving draft…",
      );
      setGlobalBusy(
        true,
        status === "published"
          ? "Publishing article…"
          : "Saving article draft…",
      );
      const payload = {
        title,
        slug: existing?.slug || `${slugify(title)}-${Date.now().toString(36)}`,
        category: normalizeCategory($("#articleCategory").value),
        author_name: $("#articleAuthor").value.trim(),
        image_credit: $("#articleImageCredit").value.trim(),
        dek: $("#articleDek").value.trim(),
        body: $("#articleBody").value.trim(),
        cover_image_path: cover,
        published_at: $("#articleDate").value
          ? new Date($("#articleDate").value).toISOString()
          : new Date().toISOString(),
        is_featured: $("#articleFeatured").checked,
        is_breaking: $("#articleBreaking").checked,
        status,
        updated_by: state.currentUser.id,
        ...getCoverControls(),
      };
      const res = id
        ? await db
            .from("articles")
            .update(payload)
            .eq("id", id)
            .select("id")
            .single()
        : await db
            .from("articles")
            .insert({ ...payload, created_by: state.currentUser.id })
            .select("id")
            .single();
      if (res.error) throw res.error;
      const savedArticleId = res.data?.id || id;

      setButtonBusy(btn, true, "Saving photos…");
      setGlobalBusy(true, "Saving article photos…");
      await syncArticlePhotos(savedArticleId);

      let alertNote = "";
      if (shouldNotify && savedArticleId) {
        setButtonBusy(btn, true, "Sending alerts…");
        setGlobalBusy(true, "Sending subscriber alerts…");
        try {
          const alertResult = await notifyNewsletter(savedArticleId);
          if (alertResult?.sent_count > 0)
            alertNote = ` Subscriber alert sent to ${alertResult.sent_count} reader${alertResult.sent_count === 1 ? "" : "s"}.`;
          else if (alertResult?.already_sent)
            alertNote = " Subscriber alert was already sent.";
          else alertNote = " No active subscribers yet.";
        } catch (alertErr) {
          console.warn("Newsletter alert could not be sent.", alertErr);
          alertNote =
            " Article is live, but the subscriber email alert could not be sent.";
        }
      }
      $("#articleFormMessage").textContent =
        (status === "published" ? "Article published." : "Draft saved.") +
        alertNote;
      resetArticleForm();
      setGlobalBusy(true, "Refreshing front page…");
      await Promise.all([loadAdminData(), loadPublicData()]);
      showToast(status === "published" ? "Article published" : "Draft saved");
    } catch (err) {
      console.error(err);
      $("#articleFormMessage").textContent =
        err.message || "Could not save article.";
    } finally {
      setButtonBusy(btn, false);
      setGlobalBusy(false);
    }
  }
  function resetStaffForm() {
    $("#staffForm").reset();
    $("#staffId").value = "";
    $("#staffFormMessage").textContent = "";
    $("#staffSubmitButton").textContent = "Add Member";
    $("#staffCancelEdit").classList.add("hidden");
  }

  function editStaff(id) {
    const member = state.adminStaff.find(
      (item) => String(item.id) === String(id),
    );
    if (!member) return;

    $("#staffId").value = member.id;
    $("#staffName").value = member.full_name || "";
    $("#staffRole").value = member.position || "";
    $("#staffGroup").value = member.group_type || "staff";
    $("#staffBio").value = member.bio || "";
    $("#staffPhoto").value = "";
    $("#staffFormMessage").textContent =
      "Editing this staff member. Choose a new photo only if you want to replace the current one.";
    $("#staffSubmitButton").textContent = "Save Changes";
    $("#staffCancelEdit").classList.remove("hidden");

    switchAdminTab("staff");
    $("#staffForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleStaffSubmit(e) {
    e.preventDefault();
    if (!db || !state.isEditor) return;

    const btn = e.submitter;
    const id = $("#staffId").value;
    const existing = id
      ? state.adminStaff.find((item) => String(item.id) === String(id))
      : null;
    const editing = !!existing;

    setButtonBusy(btn, true, editing ? "Saving…" : "Adding…");
    setGlobalBusy(
      true,
      editing ? "Saving staff changes…" : "Adding team member…",
    );

    try {
      let photo = existing?.photo_path || "";
      const file = $("#staffPhoto").files[0];

      if (file) {
        setButtonBusy(btn, true, "Uploading photo…");
        setGlobalBusy(true, "Uploading staff photo…");
        photo = await uploadMedia(file, "staff");
      }

      const payload = {
        full_name: $("#staffName").value.trim(),
        position: $("#staffRole").value.trim(),
        group_type: $("#staffGroup").value,
        bio: $("#staffBio").value.trim(),
        photo_path: photo,
        is_active: existing?.is_active ?? true,
        sort_order:
          existing?.sort_order ??
          ((state.adminStaff.at(-1)?.sort_order ?? 0) + 10),
      };

      const result = editing
        ? await db.from("staff_members").update(payload).eq("id", id)
        : await db
            .from("staff_members")
            .insert({ ...payload, created_by: state.currentUser.id });

      if (result.error) throw result.error;

      $("#staffFormMessage").textContent = editing
        ? "Staff member updated."
        : "Member added.";

      resetStaffForm();
      await Promise.all([loadAdminData(), loadPublicData()]);
      showToast(editing ? "Staff member updated" : "Editorial board updated");
    } catch (err) {
      console.error(err);
      $("#staffFormMessage").textContent =
        err.message ||
        (editing ? "Could not update member." : "Could not add member.");
    } finally {
      setButtonBusy(btn, false);
      setGlobalBusy(false);
    }
  }

  function populatePublicationForm() {
    if (!state.isAdmin) return;
    const s = state.settings;
    $("#settingPublicationName").value = OFFICIAL_PUBLICATION_NAME;
    $("#settingTagline").value = s.tagline || "";
    $("#settingSchoolName").value =
      s.school_name || DEFAULT_SETTINGS.school_name;
    $("#settingSchoolAbbreviation").value =
      s.school_abbreviation || DEFAULT_SETTINGS.school_abbreviation;
    $("#settingHistory").value = s.publication_history || "";
    $("#settingMission").value = s.mission || "";
    $("#settingVision").value = s.vision || "";
  }
  async function handlePublicationSubmit(e) {
    e.preventDefault();
    if (!db || !state.isAdmin) return;
    const btn = e.submitter;
    setButtonBusy(btn, true, "Saving…");
    try {
      const payload = {
        publication_name: OFFICIAL_PUBLICATION_NAME,
        tagline: $("#settingTagline").value.trim(),
        school_name: $("#settingSchoolName").value.trim(),
        school_abbreviation: $("#settingSchoolAbbreviation").value.trim(),
        publication_history: $("#settingHistory").value.trim(),
        mission: $("#settingMission").value.trim(),
        vision: $("#settingVision").value.trim(),
      };
      const { error } = await db
        .from("site_settings")
        .update(payload)
        .eq("id", 1);
      if (error) throw error;
      state.settings = { ...state.settings, ...payload };
      $("#publicationFormMessage").textContent = "Publication details saved.";
      renderAbout();
      showToast("Publication details updated");
    } catch (err) {
      console.error(err);
      $("#publicationFormMessage").textContent =
        err.message || "Could not save publication details.";
    } finally {
      setButtonBusy(btn, false);
    }
  }
  function resetAchievementForm() {
    $("#achievementForm").reset();
    $("#achievementId").value = "";
    $("#achievementPublished").checked = true;
    $("#achievementFormMessage").textContent = "";
  }
  function editAchievement(id) {
    if (!state.isAdmin) return;
    const a = state.adminAchievements.find((x) => String(x.id) === String(id));
    if (!a) return;
    $("#achievementId").value = a.id;
    $("#achievementTitle").value = a.title || "";
    $("#achievementCompetition").value = a.competition_name || "";
    $("#achievementAward").value = a.award || "";
    $("#achievementLevel").value = a.level || "";
    $("#achievementDate").value = a.achievement_date || "";
    $("#achievementDescription").value = a.description || "";
    $("#achievementPublished").checked = !!a.is_published;
    switchAdminTab("achievements");
    $("#achievementForm").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
  async function handleAchievementSubmit(e) {
    e.preventDefault();
    if (!db || !state.isAdmin) return;
    const btn = e.submitter;
    setButtonBusy(btn, true, "Saving…");
    setGlobalBusy(true, "Saving achievement…");
    try {
      const id = $("#achievementId").value,
        existing = id
          ? state.adminAchievements.find((a) => String(a.id) === String(id))
          : null;
      let image = existing?.image_path || "";
      const file = $("#achievementImage").files[0];
      if (file) {
        setButtonBusy(btn, true, "Uploading image…");
        setGlobalBusy(true, "Uploading achievement image…");
        image = await uploadMedia(file, "achievements");
      }
      const payload = {
        title: $("#achievementTitle").value.trim(),
        competition_name: $("#achievementCompetition").value.trim(),
        award: $("#achievementAward").value.trim(),
        level: $("#achievementLevel").value.trim(),
        achievement_date: $("#achievementDate").value || null,
        description: $("#achievementDescription").value.trim(),
        image_path: image,
        is_published: $("#achievementPublished").checked,
      };
      const res = id
        ? await db.from("achievements").update(payload).eq("id", id)
        : await db
            .from("achievements")
            .insert({ ...payload, created_by: state.currentUser.id });
      if (res.error) throw res.error;
      resetAchievementForm();
      await Promise.all([loadAdminData(), loadPublicData()]);
      showToast("Achievement saved");
    } catch (err) {
      console.error(err);
      $("#achievementFormMessage").textContent =
        err.message || "Could not save achievement.";
    } finally {
      setButtonBusy(btn, false);
      setGlobalBusy(false);
    }
  }

  async function openCmsDialog() {
    if (!db) {
      $("#loginMessage").textContent =
        "Supabase is not configured yet. Add your Project URL and publishable key to config.js first.";
    } else await refreshAdminUser();
    openLockedDialog($("#adminDialog"));
  }

  function bindEvents() {
    document.addEventListener("click", async (e) => {
      const articleBtn = e.target.closest("[data-article-id]");
      if (articleBtn) {
        openArticle(articleBtn.dataset.articleId);
        return;
      }
      const photoBtn = e.target.closest("[data-photo-id]");
      if (photoBtn) {
        openPhoto(photoBtn.dataset.photoId);
        return;
      }
      const routeBtn = e.target.closest("[data-open-route]");
      if (routeBtn) {
        navigateToHash(routeBtn.dataset.openRoute);
        return;
      }
      const navLink = e.target.closest(".main-nav a[href^='#']");
      if (navLink) {
        e.preventDefault();
        e.stopPropagation();
        if (!navLink.hidden && !navLink.hasAttribute("inert")) {
          if (window.innerWidth <= 700) {
            // V15 MOBILE FIX:
            // Render the tapped section FIRST, then update the URL/highlight,
            // and only then close the drawer. This prevents the menu-close
            // state from interrupting navigation.
            const href = navLink.getAttribute("href") || "#home";
            const nextHash = `#${normalizeNavHash(href)}`;
            const route = navLink.dataset.route || "";
            const category = navLink.dataset.category || "";

            if (category) openView("", category);
            else openView(route || "home");

            if (location.hash !== nextHash) {
              history.pushState(null, "", nextHash);
            }
            syncActiveNav(nextHash);
            setMenuOpen(false);
          } else {
            // Desktop behavior is unchanged.
            navigateToHash(navLink.getAttribute("href"));
          }
        }
        return;
      }
      const brandRoute = e.target.closest(".brand[data-route]");
      if (brandRoute) {
        e.preventDefault();
        navigateToHash(brandRoute.getAttribute("href") || "#home");
        return;
      }
      const close = e.target.closest("[data-close-dialog]");
      if (close) {
        closeLockedDialog($("#" + close.dataset.closeDialog));
        return;
      }
      const moveArticlePhotoButton = e.target.closest("[data-photo-move]");
      if (moveArticlePhotoButton) {
        moveArticlePhoto(
          moveArticlePhotoButton.dataset.photoKey,
          moveArticlePhotoButton.dataset.photoMove,
        );
        return;
      }
      const removeArticlePhotoButton = e.target.closest("[data-photo-remove]");
      if (removeArticlePhotoButton) {
        removeArticlePhoto(removeArticlePhotoButton.dataset.photoRemove);
        return;
      }
      const edit = e.target.closest("[data-edit-article]");
      if (edit) {
        editArticle(edit.dataset.editArticle);
        return;
      }
      const del = e.target.closest("[data-delete-article]");
      if (del) {
        if (!confirm("Delete this article?")) return;
        setButtonBusy(del, true, "Deleting…");
        setGlobalBusy(true, "Deleting article…");
        try {
          const { error } = await db
            .from("articles")
            .delete()
            .eq("id", del.dataset.deleteArticle);
          if (error) throw error;
          setGlobalBusy(true, "Refreshing article library…");
          await Promise.all([loadAdminData(), loadPublicData()]);
          showToast("Article deleted");
        } catch (err) {
          console.error(err);
          showNotice(
            "Delete failed",
            err.message || "Could not delete the article.",
            "error",
          );
        } finally {
          setButtonBusy(del, false);
          setGlobalBusy(false);
        }
        return;
      }
      const es = e.target.closest("[data-edit-staff]");
      if (es) {
        editStaff(es.dataset.editStaff);
        return;
      }
      const ds = e.target.closest("[data-delete-staff]");
      if (ds) {
        if (!confirm("Remove this staff member?")) return;
        const { error } = await db
          .from("staff_members")
          .delete()
          .eq("id", ds.dataset.deleteStaff);
        if (error) showToast(error.message);
        else {
          if (String($("#staffId").value) === String(ds.dataset.deleteStaff)) {
            resetStaffForm();
          }
          await Promise.all([loadAdminData(), loadPublicData()]);
          showToast("Staff member removed");
        }
        return;
      }
      const ea = e.target.closest("[data-edit-achievement]");
      if (ea) {
        editAchievement(ea.dataset.editAchievement);
        return;
      }
      const da = e.target.closest("[data-delete-achievement]");
      if (da) {
        if (!state.isAdmin || !confirm("Delete this achievement?")) return;
        const { error } = await db
          .from("achievements")
          .delete()
          .eq("id", da.dataset.deleteAchievement);
        if (error) showToast(error.message);
        else {
          await Promise.all([loadAdminData(), loadPublicData()]);
          showToast("Achievement deleted");
        }
        return;
      }
      const rotate = e.target.closest("[data-rotate-cover]");
      if (rotate) {
        let v =
          Number($("#coverRotation").value) +
          Number(rotate.dataset.rotateCover);
        while (v > 180) v -= 360;
        while (v < -180) v += 360;
        $("#coverRotation").value = v;
        updateCoverPreview();
        return;
      }
    });
    $("#menuToggle").addEventListener("click", () => {
      setMenuOpen(!$("#mainNav").classList.contains("open"));
    });
    $("#menuScrim")?.addEventListener("click", (event) => {
      // V15: outside taps do NOT close the mobile sections drawer.
      // The scrim only blocks interaction with the page underneath.
      event.preventDefault();
      event.stopPropagation();
    });
    $("#searchToggle").addEventListener("click", () => {
      $("#searchPanel").classList.add("open");
      $("#searchPanel").setAttribute("aria-hidden", "false");
      setTimeout(() => $("#globalSearch").focus(), 20);
    });
    $("#searchClose").addEventListener("click", () => {
      $("#searchPanel").classList.remove("open");
      $("#searchPanel").setAttribute("aria-hidden", "true");
    });
    $("#globalSearch").addEventListener("input", runSearch);
    $("#archiveSearch").addEventListener("input", filterArchives);
    $("#archiveCategory").addEventListener("change", filterArchives);
    $("#archiveYear").addEventListener("change", filterArchives);
    $("#articleLibrarySort").addEventListener("change", renderAdminLists);
    $("#adminToggle").addEventListener("click", openCmsDialog);
    $("#cmsAccessLink").addEventListener("click", openCmsDialog);
    $("#newsletterForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget,
        btn = form.querySelector('button[type="submit"]'),
        msg = $("#newsletterMessage");
      const email = $("#newsletterEmail").value.trim(),
        website = $("#newsletterWebsite").value.trim();
      msg.textContent = "";
      setButtonBusy(btn, true, "Subscribing…");
      try {
        await subscribeNewsletter(email, website);
        form.reset();
        msg.textContent = "Subscription successful.";
        showNotice(
          "You’re subscribed",
          "We’ll send a short alert when The East-Washington Times publishes a new article.",
        );
      } catch (err) {
        console.error(err);
        const message =
          err.message || "Could not subscribe right now. Please try again.";
        msg.textContent = message;
        showNotice("Subscription failed", message, "error");
      } finally {
        setButtonBusy(btn, false);
      }
    });
    $("#authFeedbackClose").addEventListener("click", () =>
      closeLockedDialog($("#authFeedback")),
    );
    ["#authFeedback", "#articleDialog", "#photoDialog", "#adminDialog"].forEach((selector) => {
      $(selector)?.addEventListener("cancel", (event) => event.preventDefault());
    });
    $("#noticeClose").addEventListener("click", hideNotice);
    $("#enterSiteBtn").addEventListener("click", enterSite);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
        // V15: keep the drawer open. Close it only with the Close button
        // or by selecting another section.
        e.preventDefault();
        return;
      }
      const gate = $("#startupGate");
      if (
        e.key === "Tab" &&
        gate &&
        !gate.hidden &&
        !gate.classList.contains("is-leaving")
      ) {
        e.preventDefault();
        $("#enterSiteBtn").focus();
      }
      if (
        e.key === "Enter" &&
        gate &&
        !gate.hidden &&
        !gate.classList.contains("is-leaving")
      ) {
        e.preventDefault();
        enterSite();
      }
    });
    $("#loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (authPending) return;
      if (!db) {
        showAuthFeedback(
          "Unable to connect",
          "The sign-in service is not connected. Please try again later.",
          true,
        );
        return;
      }
      authPending = true;
      const btn = e.submitter || $("#loginForm button[type=submit]");
      setButtonBusy(btn, true, "Signing in…");
      setGlobalBusy(true, "Opening your newsroom…");
      $("#loginMessage").textContent = "";
      let feedback;
      try {
        const { error } = await db.auth.signInWithPassword({
          email: $("#loginEmail").value.trim(),
          password: $("#loginPassword").value,
        });
        if (error) throw error;
        await refreshAdminUser();
        if (!state.isEditor) {
          const { error: signOutError } = await db.auth.signOut();
          if (signOutError) throw signOutError;
          await refreshAdminUser();
          throw new Error(
            "This account does not have editor or admin access. Please contact your publication adviser.",
          );
        }
        $("#loginPassword").value = "";
        feedback = [
          "You’re signed in.",
          `Welcome back. Your ${state.isAdmin ? "admin" : "editor"} workspace is ready.`,
        ];
      } catch (err) {
        const message = err.message || "Sign-in failed. Please try again.";
        $("#loginMessage").textContent = message;
        feedback = ["Couldn’t sign in", message, true];
      } finally {
        setButtonBusy(btn, false);
        setGlobalBusy(false);
        authPending = false;
      }
      showAuthFeedback(...feedback);
    });
    $("#signOutBtn").addEventListener("click", async (e) => {
      if (authPending || !db) return;
      authPending = true;
      const btn = e.currentTarget;
      setButtonBusy(btn, true, "Signing out…");
      setGlobalBusy(true, "Closing your session…");
      let feedback;
      try {
        const { error } = await db.auth.signOut();
        if (error) throw error;
        state.currentUser = null;
        state.currentRole = "";
        state.isEditor = false;
        state.isAdmin = false;
        state.adminArticles = [];
        state.adminStaff = [];
        state.adminAchievements = [];
        updateAdminPane();
        feedback = [
          "You’re signed out.",
          "Your session has ended. You can continue reading the publication.",
        ];
      } catch (err) {
        feedback = [
          "Couldn’t sign out",
          err.message || "Please check your connection and try again.",
          true,
        ];
      } finally {
        setButtonBusy(btn, false);
        setGlobalBusy(false);
        authPending = false;
      }
      showAuthFeedback(...feedback);
    });
    $("#articleForm").addEventListener("submit", handleArticleSubmit);
    $("#articleImages").addEventListener("change", (e) => {
      addArticlePhotoFiles(e.target.files);
    });
    $("#articleImageList").addEventListener("input", (e) => {
      const captionInput = e.target.closest("[data-photo-caption]");
      if (captionInput) {
        const item = articlePhotoDraft.find(
          (photo) => photo.key === captionInput.dataset.photoCaption,
        );
        if (item) item.caption = captionInput.value;
        return;
      }
      const creditInput = e.target.closest("[data-photo-credit]");
      if (creditInput) {
        const item = articlePhotoDraft.find(
          (photo) => photo.key === creditInput.dataset.photoCredit,
        );
        if (item) item.credit = creditInput.value;
      }
    });
    $("#staffForm").addEventListener("submit", handleStaffSubmit);
    $("#staffCancelEdit").addEventListener("click", resetStaffForm);
    $("#publicationForm").addEventListener("submit", handlePublicationSubmit);
    $("#achievementForm").addEventListener("submit", handleAchievementSubmit);
    $("#articleReset").addEventListener("click", resetArticleForm);
    $("#achievementReset").addEventListener("click", resetAchievementForm);
    const fitOriginalCover = () =>
      setCoverControls({
        cover_zoom: 1,
        cover_offset_x: 0,
        cover_offset_y: 0,
        cover_rotation: 0,
        cover_frame: "auto",
      });

    $("#coverFitOriginal").addEventListener("click", fitOriginalCover);
    $("#coverEditorReset").addEventListener("click", fitOriginalCover);
    [
      "#coverZoom",
      "#coverX",
      "#coverY",
      "#coverRotation",
      "#coverFrame",
    ].forEach((sel) => $(sel).addEventListener("input", updateCoverPreview));
    $("#articleCover").addEventListener("change", () => {
      const file = $("#articleCover").files[0];
      if (!file) return;
      if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl);
      coverObjectUrl = URL.createObjectURL(file);
      $("#articleCoverPreview").src = coverObjectUrl;

      // Every newly selected image begins uncropped.
      // The editor can then intentionally zoom, move, rotate, or choose a crop frame.
      setCoverControls({
        cover_zoom: 1,
        cover_offset_x: 0,
        cover_offset_y: 0,
        cover_rotation: 0,
        cover_frame: "auto",
      });
    });
    $$(".admin-tab").forEach((btn) =>
      btn.addEventListener("click", () => switchAdminTab(btn.dataset.adminTab)),
    );
    window.addEventListener("hashchange", () => {
      applyCurrentHash();
      if (location.hash === "#cms") openCmsDialog().catch(console.error);
    });
    window.addEventListener("popstate", () => {
      applyCurrentHash();
    });
    window.addEventListener("resize", () => {
      renderDynamicNav();
      if (window.innerWidth > 700) setMenuOpen(false);
    });
    $$("dialog").forEach((d) =>
      d.addEventListener("close", () => requestAnimationFrame(syncOverlayLock)),
    );
  }
  function initFormOptions() {
    $("#articleCategory").innerHTML = CATEGORIES.map(
      (c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`,
    ).join("");
    const now = new Date();
    $("#footerYear").textContent = now.getFullYear();
    const weekday = new Intl.DateTimeFormat("en-PH", {
      weekday: "long",
    }).format(now);
    const rest = new Intl.DateTimeFormat("en-PH", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(now);
    const full = `${weekday}, ${rest}`;
    $("#todayLabel").innerHTML =
      `<span class="date-weekday">${escapeHtml(weekday)}</span><span class="date-rest">${escapeHtml(rest)}</span>`;
    $("#todayLabel").setAttribute("aria-label", full);
    resetArticleForm();
  }
  async function init() {
    initFormOptions();
    bindEvents();
    lockOpening(true);
    $("#enterSiteBtn").focus({ preventScroll: true });
    await loadPublicData();
    startupDataReady = true;
    openRequestedPage();
    if (db) {
      db.auth.onAuthStateChange(() => {
        if (!authPending)
          setTimeout(() => refreshAdminUser().catch(console.error), 0);
      });
      setTimeout(() => refreshAdminUser().catch(console.error), 0);
    }

    // Keep homepage timestamps current while the page stays open.
    window.setInterval(() => {
      refreshRelativeTimes();
      renderBreaking();
    }, 60000);
  }
  function openRequestedPage() {
    if (!openingComplete || !startupDataReady) return;
    const wantsCms =
      new URLSearchParams(location.search).get("cms") === "1" ||
      location.hash === "#cms";
    if (wantsCms) openCmsDialog().catch(console.error);
    else openStoryFromUrl();
  }

  init().catch((err) => {
    console.error(err);
    showToast("The site loaded with an error. Check the browser console.");
  });
})();
