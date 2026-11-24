/* Academic portfolio — renders every page from the JSON files in /data.
   Content is edited from /admin, so this file never needs changing for updates. */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Allow only http(s), mailto, and site-relative paths.
  function safeUrl(u) {
    u = String(u ?? "").trim();
    if (!u) return "";
    if (/^(https?:\/\/|mailto:)/i.test(u)) return u;
    if (/^[\w\-./%]+$/.test(u) && !/^\/\//.test(u)) return u;
    return "";
  }
  const ext = (u) => (/^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : "");

  // Cache-bust once per minute so edits appear quickly while still using the CDN.
  async function getJSON(name) {
    const v = Math.floor(Date.now() / 60000);
    const r = await fetch(`data/${name}.json?v=${v}`);
    if (!r.ok) throw new Error(`Could not load ${name}.json`);
    return r.json();
  }

  function paragraphs(text) {
    return String(text || "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${linkify(esc(p)).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }
  function linkify(escaped) {
    return escaped.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
  }

  function parseDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function fmtDate(s) {
    const d = parseDate(s);
    return d ? d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : esc(s);
  }

  const ICONS = {
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    googleScholar: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 1 9.5l4 2.4V17h2v-3.9l5 3 11-6.6L12 3Zm-5 11.7v2.8C8.5 19 10.1 20 12 20s3.5-1 5-2.5v-2.8l-5 3-5-3Z"/></svg>',
    orcid: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8.3 17.2H6.9V8.6h1.4v8.6Zm-.7-9.8a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Zm3 9.8V8.6h3.2c3 0 4.4 2.1 4.4 4.3 0 2.4-1.9 4.3-4.4 4.3h-3.2Zm1.4-1.3h1.7c2.4 0 3-1.8 3-3 0-1.9-1.2-3-3-3H12v6Z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.8v1.6h.06c.53-1 1.84-2.05 3.78-2.05 4.05 0 4.8 2.66 4.8 6.12V21h-4v-4.9c0-1.17-.02-2.68-1.63-2.68-1.64 0-1.89 1.28-1.89 2.6V21h-4V9.75Z"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>',
    researchgate: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3Zm9.6 13.9c-.9-.2-1.6-1-2.4-2.4l-.8-1.4h-.8v2.7c0 .6.2.8.9.8v.4H6.4v-.4c.6 0 .8-.2.8-.8V9.6c0-.6-.2-.8-.8-.8v-.4h3.2c1.8 0 2.8.8 2.8 2.2 0 1-.6 1.7-1.6 2l1 1.6c.7 1.1 1.2 1.6 1.8 1.7v.6h-1v.4ZM8.6 12.6h.6c1.2 0 1.8-.5 1.8-1.6s-.6-1.6-1.6-1.6h-.8v3.2Zm8.1-2.6c-1 0-1.6-.6-1.6-1.6V7.2c0-1 .6-1.6 1.6-1.6s1.5.5 1.5 1.3h-.6c0-.5-.3-.8-.9-.8s-.9.4-.9 1v1.4c0 .6.3 1 .9 1s.9-.3.9-.8v-.5h-.9v-.5h1.5v1c0 .9-.5 1.3-1.5 1.3Z"/></svg>',
    cv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M12 12v6m-3-3 3 3 3-3"/></svg>',
    doi: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  };
  const LINK_LABELS = { googleScholar: "Google Scholar", orcid: "ORCID", linkedin: "LinkedIn", github: "GitHub", researchgate: "ResearchGate", cv: "Download CV" };

  /* ---------- Header photo slideshow: crossfade with a slow zoom ---------- */
  function heroSlideshow(photos, hero) {
    const box = document.createElement("div");
    box.className = "hero-slides"; box.setAttribute("aria-hidden", "true");
    // start on a different photo per page so the site feels varied
    let i = Math.floor(Math.random() * photos.length);
    const slides = photos.map((src) => {
      const d = document.createElement("div");
      d.className = "hero-slide"; d.style.backgroundImage = `url("${src.replace(/"/g, "%22")}")`;
      box.appendChild(d); return d;
    });
    hero.insertBefore(box, hero.firstChild); hero.classList.add("has-slides");
    const show = (k) => {
      slides.forEach((sl) => sl.classList.remove("active"));
      void slides[k].offsetWidth; // restart the zoom animation
      slides[k].classList.add("active");
    };
    const first = new Image();
    first.onload = first.onerror = () => show(i);
    first.src = photos[i];
    const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (photos.length > 1 && !reduced) {
      setInterval(() => { if (!document.hidden) { i = (i + 1) % photos.length; show(i); } }, 6000);
    }
  }

  /* ---------- Shared chrome ---------- */
  function initChrome(profile) {
    const page = document.body.dataset.page;
    document.querySelectorAll(".nav-links a").forEach((a) => {
      if (a.dataset.page === page) a.setAttribute("aria-current", "page");
    });
    const btn = $(".nav-toggle"), links = $(".nav-links");
    if (btn) {
      btn.addEventListener("click", () => {
        const open = links.classList.toggle("open");
        btn.setAttribute("aria-expanded", String(open));
      });
      links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => {
        links.classList.remove("open"); btn.setAttribute("aria-expanded", "false");
      }));
    }
    const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
    if (!profile) return;
    document.querySelectorAll("[data-name]").forEach((el) => (el.textContent = profile.name));

    // Background photo slideshow in the header band (photos added in the dashboard under About Me)
    const photos = (profile.heroImages || []).map((im) => safeUrl(im && im.src)).filter(Boolean);
    if (!photos.length && safeUrl(profile.heroImage)) photos.push(safeUrl(profile.heroImage));
    if (photos.length) document.querySelectorAll("[data-hero]").forEach(heroSlideshow.bind(null, photos));

    // Footer
    const fa = $("#footer-about");
    if (fa) fa.innerHTML = [profile.position, profile.department, profile.university].filter(Boolean).map(esc).join("<br>");
    const fc = $("#footer-contact");
    if (fc) {
      const items = [];
      if (profile.email) items.push(`<li><a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a></li>`);
      if (profile.location) items.push(`<li>${esc(profile.location)}</li>`);
      for (const [k, label] of Object.entries(LINK_LABELS)) {
        const u = safeUrl(profile.links && profile.links[k]);
        if (u && k !== "cv") items.push(`<li><a href="${esc(u)}"${ext(u)}>${label}</a></li>`);
      }
      fc.innerHTML = items.join("");
    }
  }

  /* ---------- Carousel: slides one card at a time, loops, pauses on hover ---------- */
  function initCarousel(root) {
    if (!root) return;
    const track = root.querySelector(".carousel-track");
    const originals = [...track.children];
    const n = originals.length;
    originals.forEach((it) => { const c = it.cloneNode(true); c.setAttribute("aria-hidden", "true"); c.tabIndex = -1; track.appendChild(c); });
    const dots = [...root.querySelectorAll(".carousel-dot")];
    let i = 0, timer = null, paused = false;
    const stepPx = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      return track.children[0].getBoundingClientRect().width + gap;
    };
    const place = (k, animate) => {
      i = k;
      track.style.transition = animate ? "" : "none";
      track.style.transform = `translateX(${-i * stepPx()}px)`;
      const active = ((i % n) + n) % n;
      dots.forEach((d, j) => d.setAttribute("aria-current", String(j === active)));
      if (!animate) void track.offsetWidth; // apply instantly before the next animated move
    };
    const move = (d) => {
      if (i + d < 0) place(i + n, false);
      if (i + d > n) place(i - n, false);
      place(i + d, true);
    };
    track.addEventListener("transitionend", () => { if (i >= n) place(i - n, false); });
    root.querySelectorAll(".carousel-btn").forEach((b) => b.addEventListener("click", () => { move(+b.dataset.dir); restart(); }));
    dots.forEach((d) => d.addEventListener("click", () => { place(+d.dataset.i, true); restart(); }));
    const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const restart = () => {
      clearInterval(timer);
      if (!reduced && !paused) timer = setInterval(() => { if (!document.hidden) move(1); }, 3500);
    };
    root.addEventListener("mouseenter", () => { paused = true; clearInterval(timer); });
    root.addEventListener("mouseleave", () => { paused = false; restart(); });
    root.addEventListener("focusin", () => { paused = true; clearInterval(timer); });
    root.addEventListener("focusout", () => { paused = false; restart(); });
    // swipe on touch screens
    let x0 = null;
    root.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { move(dx < 0 ? 1 : -1); restart(); }
    });
    window.addEventListener("resize", () => place(i, false));
    place(0, false); restart();
  }

  /* ---------- About ---------- */
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  async function renderAbout(p) {
    const links = [];
    if (p.email) links.push(`<a class="chip-link" href="mailto:${esc(p.email)}">${ICONS.email}Email</a>`);
    for (const [k, label] of Object.entries(LINK_LABELS)) {
      const u = safeUrl(p.links && p.links[k]);
      if (u) links.push(`<a class="chip-link" href="${esc(u)}"${ext(u)}>${ICONS[k]}${label}</a>`);
    }
    const photo = safeUrl(p.photo);
    $("#about-hero").innerHTML = `
      ${photo ? `<img class="hero-photo fade-in" src="${esc(photo)}" alt="Portrait of ${esc(p.name)}" width="168" height="168">` : ""}
      <span class="eyebrow fade-in">${esc(p.university || "")}</span>
      <h1 class="fade-in">${esc(p.name)}</h1>
      ${p.position ? `<p class="lead fade-in">${esc(p.position)}</p>` : ""}
      ${p.department || p.location ? `<div class="hero-affil fade-in">${[p.department, p.location].filter(Boolean).map(esc).join(" · ")}</div>` : ""}
      ${links.length ? `<div class="hero-links fade-in">${links.join("")}</div>` : ""}`;

    // Counts for the overview cards (each file is optional)
    const load = (n) => getJSON(n).catch(() => []);
    const [edu, exp, proj, pubs, awards, news] = await Promise.all(["education", "experience", "projects", "publications", "awards", "news"].map(load));
    const latest = news.map((n) => n.date).filter(Boolean).sort().pop();
    const cards = [
      ["education.html", "Education", "Degrees and academic background", plural(edu.length, "degree", "degrees")],
      ["experience.html", "Experience", "Research, teaching, service and leadership", plural(exp.length, "entry", "entries")],
      ["research.html", "Research Projects", "Current and past research projects", plural(proj.length, "project", "projects")],
      ["publications.html", "Publications", "Journal articles, conference papers and preprints", plural(pubs.length, "publication", "publications")],
      ["awards.html", "Awards & Scholarships", "Honors, awards and scholarships", plural(awards.length, "award", "awards")],
      ["news.html", "News & Updates", "Conferences, presentations and milestones", news.length ? `Latest: ${fmtDate(latest)}` : "Coming soon"],
    ];

    $("#about").innerHTML = `
      <section class="section">
        <div class="wrap">
          <div class="about-grid">
            <div class="card fade-in">
              <span class="card-label">About</span>
              <div class="bio">${paragraphs(p.bio)}</div>
            </div>
            ${p.interests && p.interests.length ? `
            <div class="card fade-in">
              <span class="card-label">Research Interests</span>
              <div class="tags">${p.interests.filter(Boolean).map((i) => `<span class="tag">${esc(i)}</span>`).join("")}</div>
            </div>` : ""}
          </div>
        </div>
      </section>
      <section class="section">
        <div class="wrap">
          <div class="carousel fade-in" aria-roledescription="carousel" aria-label="Site sections">
            <div class="carousel-viewport">
              <div class="carousel-track link-cards">
                ${cards.map(([href, title, desc, count]) => `
                  <a class="card link-card" href="${href}">
                    <h3>${esc(title)}</h3>
                    <p>${esc(desc)}</p>
                    <div class="foot"><span class="count">${esc(count)}</span></div>
                  </a>`).join("")}
              </div>
            </div>
            <div class="carousel-controls">
              <button type="button" class="carousel-btn" data-dir="-1" aria-label="Previous">&#8249;</button>
              <div class="carousel-dots">${cards.map((c, i) => `<button type="button" class="carousel-dot" data-i="${i}" aria-label="Show ${esc(c[1])}"></button>`).join("")}</div>
              <button type="button" class="carousel-btn" data-dir="1" aria-label="Next">&#8250;</button>
            </div>
          </div>
        </div>
      </section>
      ${p.sections && p.sections.filter((s) => s.items && s.items.length).length ? `
      <section class="section">
        <div class="wrap cv-grid">
          ${p.sections.filter((s) => s.items && s.items.length).map((s) => `
            <div class="card cv-section fade-in">
              <h2>${esc(s.heading)}</h2>
              <ul class="cv-list">${s.items.map((it) => `
                <li><div class="cv-title">${esc(it.title)}</div>${it.org ? `<div class="cv-org">${esc(it.org)}</div>` : ""}${it.period ? `<div class="cv-period">${esc(it.period)}</div>` : ""}</li>`).join("")}
              </ul>
            </div>`).join("")}
        </div>
      </section>` : ""}`;

    initCarousel($("#about .carousel"));

    const ld = {
      "@context": "https://schema.org", "@type": "Person", name: p.name, jobTitle: p.position,
      affiliation: { "@type": "CollegeOrUniversity", name: p.university },
      email: p.email ? `mailto:${p.email}` : undefined, image: photo ? new URL(photo, location.href).href : undefined,
      knowsAbout: p.interests, sameAs: Object.values(p.links || {}).filter((u) => /^https?:/.test(u || "")),
    };
    const sc = document.createElement("script"); sc.type = "application/ld+json"; sc.textContent = JSON.stringify(ld);
    document.head.appendChild(sc);
  }

  /* ---------- Research ---------- */
  function renderProjects(list) {
    const el = $("#projects");
    if (!list.length) { el.innerHTML = '<div class="empty">Research projects will appear here.</div>'; return; }
    el.innerHTML = list.map((p) => {
      const link = safeUrl(p.link), img = safeUrl(p.image);
      const title = link ? `<a href="${esc(link)}"${ext(link)}>${esc(p.title)}</a>` : esc(p.title);
      return `
        <article class="card project fade-in${img ? " has-image" : ""}">
          ${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ""}
          <div>
            ${p.label ? `<span class="project-label">${esc(p.label)}</span>` : ""}
            <h2>${title}</h2>
            ${p.period ? `<div class="project-period">${esc(p.period)}</div>` : ""}
            ${p.description ? `<div class="project-desc">${esc(p.description)}</div>` : ""}
          </div>
        </article>`;
    }).join("");
  }

  /* ---------- Education / Experience / Awards ---------- */
  function renderEntries(list, emptyText) {
    const el = $("#entries");
    list = (list || []).filter((it) => it && (it.title || it.org));
    if (!list.length) { el.innerHTML = `<div class="empty">${esc(emptyText)}</div>`; return; }
    const entry = (it, tag) => {
      const link = safeUrl(it.link);
      const title = link ? `<a href="${esc(link)}"${ext(link)}>${esc(it.title)}</a>` : esc(it.title);
      return `
        <li class="entry fade-in">
          <div class="entry-period">${esc(it.period)}</div>
          <div class="entry-body">
            <${tag}>${title}</${tag}>
            ${it.org ? `<div class="entry-org">${esc(it.org)}</div>` : ""}
            ${it.description ? `<div class="entry-desc">${paragraphs(it.description)}</div>` : ""}
          </div>
        </li>`;
    };
    // Entries with a "section" are grouped under headings, in order of first appearance.
    const groups = [];
    list.forEach((it) => {
      const name = (it.section || "").trim();
      let g = groups.find((x) => x.name === name);
      if (!g) groups.push((g = { name, items: [] }));
      g.items.push(it);
    });
    if (groups.length === 1 && !groups[0].name) {
      el.innerHTML = `<ol class="entries">${list.map((it) => entry(it, "h2")).join("")}</ol>`;
      return;
    }
    el.innerHTML = groups.map((g) => `
      <section class="entry-group">
        ${g.name ? `<h2 class="entry-group-title fade-in">${esc(g.name)}</h2>` : ""}
        <ol class="entries">${g.items.map((it) => entry(it, "h3")).join("")}</ol>
      </section>`).join("");
  }

  /* ---------- Publications ---------- */
  const PUB_GROUPS = [
    { key: "journal", label: "Journal Articles", prefix: "J" },
    { key: "conference", label: "Conference Papers", prefix: "C" },
    { key: "preprint", label: "Preprints & Other Publications", prefix: "P" },
    { key: "manuscript", label: "Under Review & In Preparation", prefix: "R" },
  ];
  function highlight(authors, names) {
    const out = esc(authors);
    const pats = [...(names || [])].filter(Boolean).sort((a, b) => b.length - a.length)
      .map((n) => esc(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return pats.length ? out.replace(new RegExp(pats.join("|"), "g"), (m) => `<strong>${m}</strong>`) : out;
  }
  function pubItem(p, num, names) {
    const href = p.doi ? `https://doi.org/${p.doi}` : safeUrl(p.url);
    const title = href ? `<a class="pub-title" href="${esc(href)}" target="_blank" rel="noopener">${esc(p.title)}</a>` : `<span class="pub-title">${esc(p.title)}</span>`;
    const venue = [p.venue ? `<em>${esc(p.venue)}</em>` : "", esc(p.details), esc(p.year)].filter(Boolean).join(", ");
    const st = (p.status || "").toLowerCase();
    const badge = !p.status || st === "published" ? "" :
      `<span class="badge ${st === "accepted" ? "accepted" : /review|preparation|submitted/.test(st) ? "review" : ""}">${esc(p.status)}</span>`;
    const links = [];
    if (p.doi) links.push(`<a class="pub-link" href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">DOI: ${esc(p.doi)} ${ICONS.doi}</a>`);
    if (p.url && safeUrl(p.url)) links.push(`<a class="pub-link" href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener">View online ${ICONS.doi}</a>`);
    return `
      <li class="pub">
        <span class="pub-num">[${num}]</span>
        <div>
          ${title}
          <div class="pub-authors">${highlight(p.authors, names)}</div>
          ${venue ? `<div class="pub-venue">${venue}</div>` : ""}
          ${badge || links.length ? `<div class="pub-meta">${badge}${links.join("")}</div>` : ""}
        </div>
      </li>`;
  }
  function renderPublications(pubs, profile) {
    const names = profile.authorHighlight || [profile.name];
    const groups = PUB_GROUPS.map((g) => {
      const items = pubs.map((p, i) => ({ p, i })).filter(({ p }) => (p.type || "journal") === g.key)
        .sort((a, b) => (parseInt(b.p.year) || 0) - (parseInt(a.p.year) || 0) || a.i - b.i)
        .map(({ p }) => p);
      return { ...g, items };
    }).filter((g) => g.items.length);

    const filters = $("#pub-filters");
    filters.innerHTML = `<button class="filter" aria-pressed="true" data-k="all">All<span class="count">${pubs.length}</span></button>` +
      groups.map((g) => `<button class="filter" aria-pressed="false" data-k="${g.key}">${g.label}<span class="count">${g.items.length}</span></button>`).join("");

    $("#publications").innerHTML = groups.map((g) => `
      <section class="pub-group fade-in" data-group="${g.key}">
        <h2>${g.label} <small>${g.items.length}</small></h2>
        <ol class="pub-list">${g.items.map((p, i) => pubItem(p, g.prefix + (g.items.length - i), names)).join("")}</ol>
      </section>`).join("") || '<div class="empty">Publications will appear here.</div>';

    filters.addEventListener("click", (e) => {
      const b = e.target.closest(".filter"); if (!b) return;
      filters.querySelectorAll(".filter").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      document.querySelectorAll(".pub-group").forEach((s) => (s.hidden = b.dataset.k !== "all" && s.dataset.group !== b.dataset.k));
    });
  }

  /* ---------- News ---------- */
  let lbImages = [], lbIndex = 0;
  function renderNews(posts) {
    const el = $("#news");
    posts = posts.slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    if (!posts.length) { el.innerHTML = '<div class="empty">No updates yet — check back soon.</div>'; return; }

    const cats = [...new Set(posts.map((p) => p.category).filter(Boolean))];
    const filters = $("#news-filters");
    if (cats.length > 1) {
      filters.innerHTML = `<button class="filter" aria-pressed="true" data-k="">All</button>` +
        cats.map((c) => `<button class="filter" aria-pressed="false" data-k="${esc(c)}">${esc(c)}</button>`).join("");
      filters.addEventListener("click", (e) => {
        const b = e.target.closest(".filter"); if (!b) return;
        filters.querySelectorAll(".filter").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        document.querySelectorAll(".post").forEach((p) => (p.hidden = !!b.dataset.k && p.dataset.cat !== b.dataset.k));
      });
    }

    el.innerHTML = `<ol class="timeline">${posts.map((p, pi) => {
      const imgs = (p.images || []).filter((im) => safeUrl(im && im.src));
      const shown = imgs.slice(0, 6);
      const n = shown.length;
      const gallery = n ? `<div class="gallery n${Math.min(n, 4)}">${shown.map((im, i) => `
          <button type="button" data-post="${pi}" data-i="${i}" aria-label="Open photo ${i + 1}${im.caption ? ": " + esc(im.caption) : ""}">
            <img src="${esc(im.src)}" alt="${esc(im.caption || p.title)}" loading="lazy">
            ${i === 5 && imgs.length > 6 ? `<span class="more">+${imgs.length - 6}</span>` : ""}
          </button>`).join("")}</div>` : "";
      const links = (p.links || []).filter((l) => safeUrl(l && l.url)).map((l) => {
        const u = safeUrl(l.url);
        return `<a class="pub-link" href="${esc(u)}"${ext(u)}>${esc(l.label || "Link")} ${ICONS.doi}</a>`;
      }).join("");
      const id = p.id || `post-${pi}`;
      return `
        <li class="post fade-in" id="${esc(id)}" data-cat="${esc(p.category || "")}">
          <article class="post-card">
            <div class="post-meta">
              <time class="post-date" datetime="${esc(p.date)}">${fmtDate(p.date)}</time>
              ${p.category ? `<span class="badge accepted">${esc(p.category)}</span>` : ""}
            </div>
            <h2><a href="#${esc(id)}">${esc(p.title)}</a></h2>
            ${p.description ? `<div class="post-body">${paragraphs(p.description)}</div>` : ""}
            ${gallery}
            ${links ? `<div class="post-links">${links}</div>` : ""}
          </article>
        </li>`;
    }).join("")}</ol>`;

    // Lightbox
    const lb = $("#lightbox"), lbImg = $("#lb-img"), lbCap = $("#lb-cap");
    const show = () => {
      const im = lbImages[lbIndex];
      lbImg.src = im.src; lbImg.alt = im.caption || "";
      lbCap.textContent = (im.caption ? im.caption + "  ·  " : "") + `${lbIndex + 1} / ${lbImages.length}`;
      $(".lb-prev").hidden = $(".lb-next").hidden = lbImages.length < 2;
    };
    const close = () => { lb.classList.remove("open"); document.body.style.overflow = ""; };
    el.addEventListener("click", (e) => {
      const b = e.target.closest(".gallery button"); if (!b) return;
      lbImages = (posts[+b.dataset.post].images || []).filter((im) => safeUrl(im && im.src));
      lbIndex = +b.dataset.i; show();
      lb.classList.add("open"); document.body.style.overflow = "hidden"; $(".lb-close").focus();
    });
    $(".lb-close").onclick = close;
    $(".lb-prev").onclick = () => { lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length; show(); };
    $(".lb-next").onclick = () => { lbIndex = (lbIndex + 1) % lbImages.length; show(); };
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") $(".lb-prev").click();
      if (e.key === "ArrowRight") $(".lb-next").click();
    });
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView(), 50); }
  }

  /* ---------- Boot ---------- */
  async function boot() {
    const page = document.body.dataset.page;
    try {
      const profile = await getJSON("profile");
      initChrome(profile);
      if (page === "about") await renderAbout(profile);
      if (page === "research") renderProjects(await getJSON("projects"));
      if (page === "education") renderEntries(await getJSON("education"), "Education will appear here.");
      if (page === "experience") renderEntries(await getJSON("experience"), "Experience will appear here.");
      if (page === "awards") renderEntries(await getJSON("awards"), "Awards and scholarships will appear here.");
      if (page === "publications") renderPublications(await getJSON("publications"), profile);
      if (page === "news") renderNews(await getJSON("news"));
    } catch (err) {
      initChrome(null);
      const target = document.querySelector("[data-content]");
      if (target) target.innerHTML = `<div class="empty">Content could not be loaded. ${location.protocol === "file:" ? "Open this site through GitHub Pages or a local web server, not by double-clicking the file." : esc(err.message)}</div>`;
      console.error(err);
    }
  }
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", boot) : boot();
})();
