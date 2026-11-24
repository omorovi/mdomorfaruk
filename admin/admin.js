/* Admin dashboard for the academic portfolio.
   Every change is saved as a commit to your GitHub repository through the GitHub API,
   so GitHub Pages republishes the site automatically (usually within a minute).
   Your GitHub access token is encrypted with your admin password and kept only in this browser. */
(function () {
  "use strict";

  const API = "https://api.github.com";
  const LS_KEY = "academic-cms-v1";
  const DATA_FILES = ["profile", "projects", "publications", "news"];
  const S = { owner: "", repo: "", branch: "main", token: "", files: {} };

  /* ================= Utilities ================= */
  const $ = (s, r = document) => r.querySelector(s);
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "value") el.value = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  }
  const clone = (o) => JSON.parse(JSON.stringify(o ?? null));
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const slug = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 50);
  const rand = () => Math.random().toString(36).slice(2, 6);
  function fmtDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : s || "";
  }
  function getPath(o, path) { return path.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o); }
  function setPath(o, path, v) {
    const ks = path.split("."); let cur = o;
    ks.slice(0, -1).forEach((k) => { if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {}; cur = cur[k]; });
    cur[ks[ks.length - 1]] = v;
  }
  const rawUrl = (p) => (/^https?:/i.test(p) ? p : `https://raw.githubusercontent.com/${S.owner}/${S.repo}/${S.branch}/${p}`);

  function toast(msg, type = "", ms = 4500) {
    const t = h("div", { class: `toast ${type}` }, msg);
    $("#toasts").append(t); setTimeout(() => t.remove(), ms);
  }
  function busy(msg) {
    const b = $("#busy");
    if (msg === false) { b.hidden = true; return; }
    $("#busy-msg").textContent = msg || "Working…"; b.hidden = false;
  }

  /* ================= Base64 & crypto ================= */
  function b64FromBytes(bytes) {
    let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  const bytesFromB64 = (b64) => Uint8Array.from(atob(String(b64).replace(/\s/g, "")), (c) => c.charCodeAt(0));
  const utf8ToB64 = (str) => b64FromBytes(new TextEncoder().encode(str));
  const b64ToUtf8 = (b64) => new TextDecoder().decode(bytesFromB64(b64));

  async function deriveKey(pw, salt) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function encryptToken(token, pw) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await deriveKey(pw, salt), new TextEncoder().encode(token)));
    return { salt: b64FromBytes(salt), iv: b64FromBytes(iv), ct: b64FromBytes(ct) };
  }
  async function decryptToken(rec, pw) {
    const key = await deriveKey(pw, bytesFromB64(rec.salt));
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytesFromB64(rec.iv) }, key, bytesFromB64(rec.ct)));
  }

  /* ================= GitHub API ================= */
  async function gh(path, opts = {}) {
    const r = await fetch(API + path, {
      ...opts, cache: "no-store",
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${S.token}`, "X-GitHub-Api-Version": "2022-11-28", ...(opts.body ? { "Content-Type": "application/json" } : {}) },
    });
    if (!r.ok) {
      let msg = `GitHub error ${r.status}`;
      try { msg = (await r.json()).message || msg; } catch (_) { /* ignore */ }
      if (r.status === 401) msg = "GitHub rejected the access token. It may have expired — sign in again with a new token.";
      if (r.status === 403 && /rate limit/i.test(msg)) msg = "GitHub rate limit reached. Please wait a few minutes and try again.";
      const e = new Error(msg); e.status = r.status; throw e;
    }
    return r.status === 204 ? null : r.json();
  }
  const contentsPath = (p) => `/repos/${S.owner}/${S.repo}/contents/${p.split("/").map(encodeURIComponent).join("/")}`;
  const ghGet = (p) => gh(`${contentsPath(p)}?ref=${encodeURIComponent(S.branch)}`);
  async function ghPut(p, b64, message, sha) {
    const body = { message, content: b64, branch: S.branch };
    if (sha) body.sha = sha;
    return (await gh(contentsPath(p), { method: "PUT", body: JSON.stringify(body) })).content.sha;
  }
  async function ghDelete(p, message) {
    try {
      const j = await ghGet(p);
      await gh(contentsPath(p), { method: "DELETE", body: JSON.stringify({ message, sha: j.sha, branch: S.branch }) });
    } catch (e) { if (e.status !== 404) console.warn("Could not delete", p, e); }
  }

  async function loadData(name) {
    const j = await ghGet(`data/${name}.json`);
    S.files[name] = { data: JSON.parse(b64ToUtf8(j.content)), sha: j.sha };
    return S.files[name].data;
  }
  async function saveData(name, data, message) {
    try {
      const sha = await ghPut(`data/${name}.json`, utf8ToB64(JSON.stringify(data, null, 2) + "\n"), message, S.files[name] && S.files[name].sha);
      S.files[name] = { data, sha };
    } catch (e) {
      if (e.status === 409 || (e.status === 422 && /sha/i.test(e.message))) {
        await loadData(name);
        throw new Error("This content was changed elsewhere since you opened it. The latest version has been loaded — please make your change again.");
      }
      throw e;
    }
  }

  /* ================= Files & images ================= */
  async function pendingImage(file, dir, maxDim = 1800) {
    if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image.`);
    const base = file.name.replace(/\.[^.]+$/, "");
    if (file.type === "image/gif" || file.type === "image/svg+xml") {
      const ext = file.type === "image/gif" ? "gif" : "svg";
      return { _pending: true, b64: b64FromBytes(new Uint8Array(await file.arrayBuffer())), ext, base, dir, preview: URL.createObjectURL(file) };
    }
    let src;
    try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (_) {
      src = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(`Could not read ${file.name}. Try saving it as JPG or PNG.`)); i.src = URL.createObjectURL(file); });
    }
    const w0 = src.width, h0 = src.height, scale = Math.min(1, maxDim / Math.max(w0, h0));
    const c = document.createElement("canvas"); c.width = Math.round(w0 * scale); c.height = Math.round(h0 * scale);
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(src, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
    return { _pending: true, b64: b64FromBytes(new Uint8Array(await blob.arrayBuffer())), ext: "jpg", base, dir, preview: URL.createObjectURL(blob) };
  }
  async function pendingFile(file, dir) {
    if (file.size > 20 * 1024 * 1024) throw new Error("Files must be smaller than 20 MB.");
    const m = /\.([a-z0-9]+)$/i.exec(file.name);
    return { _pending: true, b64: b64FromBytes(new Uint8Array(await file.arrayBuffer())), ext: m ? m[1].toLowerCase() : "bin", base: file.name.replace(/\.[^.]+$/, ""), dir, preview: URL.createObjectURL(file) };
  }

  function walk(o, fn) {
    if (Array.isArray(o)) o.forEach((v, i) => { fn(o, i, v); if (v && typeof v === "object" && !v._pending) walk(v, fn); });
    else if (o && typeof o === "object") Object.keys(o).forEach((k) => { const v = o[k]; fn(o, k, v); if (v && typeof v === "object" && !v._pending) walk(v, fn); });
  }
  async function uploadPending(obj) {
    const tasks = [];
    walk(obj, (parent, key, val) => { if (val && typeof val === "object" && val._pending) tasks.push({ parent, key, val }); });
    for (let i = 0; i < tasks.length; i++) {
      const { parent, key, val } = tasks[i];
      busy(`Uploading ${i + 1} of ${tasks.length}…`);
      const path = `${val.dir}/${today()}-${slug(val.base) || "file"}-${rand()}.${val.ext}`;
      await ghPut(path, val.b64, `Upload ${path.split("/").pop()}`);
      parent[key] = path;
    }
  }
  // Only files uploaded through the dashboard are ever deleted automatically.
  function uploadedPaths(o) {
    const out = new Set();
    walk(o, (_p, _k, v) => { if (typeof v === "string" && /^(images\/(news|uploads)|files)\/[^/]+$/.test(v)) out.add(v); });
    return out;
  }
  async function deleteRemoved(before, after) {
    const keep = uploadedPaths(after);
    for (const p of uploadedPaths(before)) if (!keep.has(p)) await ghDelete(p, `Remove ${p.split("/").pop()}`);
  }

  /* ================= Content definitions ================= */
  const NEWS_CATEGORIES = ["", "Publication", "Paper Acceptance", "Conference", "Poster Presentation", "Talk / Presentation", "Award", "Academic Milestone", "Workshop / Seminar", "Other"];
  const PUB_TYPES = [["journal", "Journal Article"], ["conference", "Conference Paper"], ["preprint", "Preprint / Other"], ["manuscript", "Under Review / In Preparation"]];
  const PUB_TYPE_LABEL = Object.fromEntries(PUB_TYPES);
  const PUB_STATUS = [["Published", "Published"], ["Accepted", "Accepted"], ["Under Review", "Under Review"], ["Submitted", "Submitted"], ["In Preparation", "In Preparation"], ["Preprint", "Preprint"], ["", "— None —"]];

  const COLLECTIONS = {
    news: {
      file: "news", title: "News & Updates", noun: "news post",
      intro: "Share conferences, presentations, accepted papers, awards and milestones. Posts appear newest first.",
      blank: () => ({ title: "", date: today(), category: "", description: "", images: [], links: [] }),
      summary: (it) => ({ t: it.title || "(untitled)", m: [fmtDate(it.date), it.category, it.images && it.images.length ? `${it.images.length} photo${it.images.length > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · "), thumb: it.images && it.images[0] && it.images[0].src }),
      order: (list) => list.map((_, i) => i).sort((a, b) => String(list[b].date || "").localeCompare(String(list[a].date || ""))),
      beforeSave: (it) => { if (!it.id) it.id = `${slug(it.date + "-" + it.title)}`.slice(0, 60) || `post-${Date.now()}`; },
      fields: [
        { key: "title", label: "Headline", type: "text", required: true, wide: true, placeholder: "e.g. Presented a poster at the ASABE Annual International Meeting" },
        { key: "date", label: "Date", type: "date", required: true, help: "Event or announcement date." },
        { key: "category", label: "Category", type: "select", options: NEWS_CATEGORIES.map((c) => [c, c || "— None —"]) },
        { key: "description", label: "Description", type: "textarea", rows: 7, help: "Leave an empty line between paragraphs. Web addresses become clickable automatically." },
        { key: "images", label: "Photos", type: "images", dir: "images/news", help: "Add as many as you like — they're resized automatically. Use the arrows to reorder; the first photo is shown first." },
        { key: "links", label: "Links (optional)", type: "repeater", addLabel: "+ Add link", fields: [
          { key: "label", label: "Button text", type: "text", placeholder: "e.g. Read the paper" },
          { key: "url", label: "Web address", type: "url", placeholder: "https://" },
        ] },
      ],
    },
    publications: {
      file: "publications", title: "Publications", noun: "publication",
      intro: "Add new papers or update the status of existing ones (for example, from Under Review to Accepted). The site groups and sorts them automatically.",
      blank: () => ({ type: "journal", status: "Published", authors: "", title: "", venue: "", details: "", year: String(new Date().getFullYear()), doi: "", url: "" }),
      summary: (it) => ({ t: it.title || "(untitled)", m: [it.venue, it.year, it.status].filter(Boolean).join(" · ") }),
      groupBy: (it) => PUB_TYPE_LABEL[it.type] || "Other",
      order: (list) => {
        const rank = Object.fromEntries(PUB_TYPES.map(([k], i) => [k, i]));
        return list.map((_, i) => i).sort((a, b) => (rank[list[a].type] ?? 9) - (rank[list[b].type] ?? 9) || (parseInt(list[b].year) || 0) - (parseInt(list[a].year) || 0) || a - b);
      },
      beforeSave: (it) => { it.doi = String(it.doi || "").replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "").trim(); },
      fields: [
        { key: "title", label: "Title", type: "text", required: true, wide: true },
        { key: "authors", label: "Authors", type: "textarea", rows: 2, required: true, help: "Exactly as they should appear. Your name is bolded automatically (configure under About Me → Author name variants)." },
        { key: "type", label: "Category", type: "select", options: PUB_TYPES },
        { key: "status", label: "Status", type: "select", options: PUB_STATUS },
        { key: "venue", label: "Journal / conference", type: "text", wide: true, placeholder: "e.g. Computers and Electronics in Agriculture" },
        { key: "details", label: "Volume, issue, pages, location", type: "text", placeholder: "e.g. vol. 45, no. 2, pp. 213-225" },
        { key: "year", label: "Year", type: "text", placeholder: "2026" },
        { key: "doi", label: "DOI", type: "text", placeholder: "10.1109/NAPS66256.2025.11272432", help: "Just the DOI — the link is created automatically." },
        { key: "url", label: "Other link (optional)", type: "url", placeholder: "https://", help: "Used when there's no DOI (e.g. ResearchGate, arXiv, PDF)." },
      ],
    },
    projects: {
      file: "projects", title: "Research Projects", noun: "project", reorderable: true,
      intro: "Projects are shown in this order. Only the fields you fill in are displayed.",
      blank: () => ({ title: "", label: "", period: "", description: "", link: "", image: "" }),
      summary: (it) => ({ t: it.title || "(untitled)", m: [it.label, it.period].filter(Boolean).join(" · "), thumb: it.image }),
      fields: [
        { key: "title", label: "Project title", type: "text", required: true, wide: true },
        { key: "label", label: "Label (optional)", type: "text", placeholder: "e.g. Current Research, Ph.D. Dissertation, Completed" },
        { key: "period", label: "Period (optional)", type: "text", placeholder: "e.g. 2023 – Present" },
        { key: "description", label: "Description (optional)", type: "textarea", rows: 4, help: "Leave empty to show only the title." },
        { key: "link", label: "Link (optional)", type: "url", placeholder: "https://" },
        { key: "image", label: "Image (optional)", type: "image", dir: "images/uploads" },
      ],
    },
  };

  const PROFILE_FIELDS = [
    { key: "name", label: "Full name", type: "text", required: true },
    { key: "position", label: "Position", type: "text" },
    { key: "department", label: "Department", type: "text" },
    { key: "university", label: "University", type: "text" },
    { key: "location", label: "Location", type: "text" },
    { key: "email", label: "Email", type: "email" },
    { key: "photo", label: "Profile photo", type: "image", dir: "images/uploads", wide: true, help: "A square photo works best." },
    { key: "bio", label: "Introduction", type: "textarea", rows: 8, help: "Leave an empty line between paragraphs." },
    { key: "interests", label: "Research interests", type: "lines", rows: 6, help: "One per line." },
    { key: "links.googleScholar", label: "Google Scholar URL", type: "url", placeholder: "https://scholar.google.com/citations?user=…" },
    { key: "links.orcid", label: "ORCID URL", type: "url", placeholder: "https://orcid.org/0000-…" },
    { key: "links.linkedin", label: "LinkedIn URL", type: "url", placeholder: "https://www.linkedin.com/in/…" },
    { key: "links.github", label: "GitHub URL", type: "url", placeholder: "https://github.com/…" },
    { key: "links.researchgate", label: "ResearchGate URL", type: "url", placeholder: "https://www.researchgate.net/profile/…" },
    { key: "links.cv", label: "CV (PDF, optional)", type: "file", accept: "application/pdf", dir: "files", help: "Adds a “Download CV” button. Leave empty to hide it." },
    { key: "authorHighlight", label: "Author name variants to bold in publications", type: "lines", rows: 5, wide: true, help: "One per line, exactly as they appear in author lists (e.g. M. O. Faruk)." },
    { key: "sections", label: "CV sections (Education, Experience, Awards …)", type: "repeater", addLabel: "+ Add section", fields: [
      { key: "heading", label: "Section heading", type: "text", wide: true },
      { key: "items", label: "Entries", type: "repeater", addLabel: "+ Add entry", fields: [
        { key: "title", label: "Title", type: "text" },
        { key: "org", label: "Organization / details", type: "text" },
        { key: "period", label: "Period", type: "text" },
      ] },
    ] },
  ];

  /* ================= Form builder ================= */
  function buildField(f, value) {
    const id = "f" + rand() + rand();
    const wide = f.wide || ["textarea", "lines", "images", "repeater", "image", "file"].includes(f.type);
    const wrap = h("div", { class: "field" + (wide ? " field-wide" : "") });
    if (f.label) wrap.append(h("label", { class: "lbl", for: id }, f.label, f.required ? h("span", { class: "req" }, " *") : null));
    let get;

    if (f.type === "textarea" || f.type === "lines") {
      const t = h("textarea", { id, rows: f.rows || 4, placeholder: f.placeholder });
      t.value = f.type === "lines" ? (value || []).join("\n") : value ?? "";
      wrap.append(t);
      get = f.type === "lines" ? () => t.value.split("\n").map((s) => s.trim()).filter(Boolean) : () => t.value.trim();
    } else if (f.type === "select") {
      const s = h("select", { id }, f.options.map(([v, l]) => h("option", { value: v }, l)));
      s.value = value ?? f.options[0][0];
      if (s.value !== (value ?? f.options[0][0]) && value) s.append(h("option", { value }, value)), (s.value = value);
      wrap.append(s); get = () => s.value;
    } else if (f.type === "image" || f.type === "file") {
      let cur = value || "";
      const box = h("div", { class: "single" });
      const input = h("input", { type: "file", class: "hidden-file", id, accept: f.type === "image" ? "image/*" : f.accept || "" });
      const render = () => {
        box.innerHTML = "";
        if (cur) {
          const src = cur._pending ? cur.preview : rawUrl(cur);
          box.append(f.type === "image" ? h("img", { src, alt: "" }) : h("a", { href: src, target: "_blank", rel: "noopener" }, cur._pending ? `${cur.base}.${cur.ext} (new)` : cur.split("/").pop()));
        } else box.append(h("span", { class: "muted" }, "None"));
        box.append(
          h("button", { type: "button", class: "btn btn-sm", onclick: () => input.click() }, cur ? "Replace…" : "Upload…"),
          cur ? h("button", { type: "button", class: "btn btn-sm btn-danger", onclick: () => { cur = ""; render(); } }, "Remove") : null,
          input,
        );
      };
      input.addEventListener("change", async () => {
        const file = input.files[0]; if (!file) return;
        try { busy("Preparing file…"); cur = f.type === "image" ? await pendingImage(file, f.dir, 1200) : await pendingFile(file, f.dir); }
        catch (e) { toast(e.message, "err"); } finally { busy(false); input.value = ""; render(); }
      });
      render(); wrap.append(box); get = () => cur;
    } else if (f.type === "images") {
      const items = (value || []).map((x) => ({ src: x.src, caption: x.caption || "" }));
      const grid = h("div", { class: "img-grid" });
      const input = h("input", { type: "file", class: "hidden-file", id, accept: "image/*", multiple: true });
      const drop = h("div", { class: "dropzone", role: "button", tabindex: "0", onclick: () => input.click(), onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } } },
        h("strong", null, "Click to add photos"), " or drag them here");
      const move = (i, d) => { const j = i + d; if (j < 0 || j >= items.length) return; [items[i], items[j]] = [items[j], items[i]]; render(); };
      const render = () => {
        grid.innerHTML = "";
        items.forEach((it, i) => {
          const cap = h("input", { type: "text", placeholder: "Caption (optional)", value: it.caption });
          cap.addEventListener("input", () => (it.caption = cap.value));
          grid.append(h("div", { class: "img-item" },
            h("div", { class: "img-tools" },
              h("span", null,
                h("button", { type: "button", class: "btn btn-ghost btn-sm btn-icon", title: "Move left", onclick: () => move(i, -1) }, "←"),
                h("button", { type: "button", class: "btn btn-ghost btn-sm btn-icon", title: "Move right", onclick: () => move(i, 1) }, "→")),
              it.src._pending ? h("span", { class: "new" }, "NEW") : null,
              h("button", { type: "button", class: "btn btn-ghost btn-sm btn-icon btn-danger", title: "Remove photo", onclick: () => { items.splice(i, 1); render(); } }, "✕")),
            h("img", { src: it.src._pending ? it.src.preview : rawUrl(it.src), alt: "", loading: "lazy" }),
            cap));
        });
      };
      const addFiles = async (files) => {
        const list = [...files].filter((f2) => f2.type.startsWith("image/"));
        for (let i = 0; i < list.length; i++) {
          busy(`Preparing photo ${i + 1} of ${list.length}…`);
          try { items.push({ src: await pendingImage(list[i], f.dir), caption: "" }); } catch (e) { toast(e.message, "err"); }
        }
        busy(false); render();
      };
      input.addEventListener("change", () => { addFiles(input.files).then(() => (input.value = "")); });
      drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
      drop.addEventListener("dragleave", () => drop.classList.remove("over"));
      drop.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("over"); addFiles(e.dataTransfer.files); });
      render(); wrap.append(drop, input, grid);
      get = () => items.map((it) => ({ src: it.src, caption: it.caption.trim() }));
    } else if (f.type === "repeater") {
      const rows = [];
      const list = h("div", { class: "rep-list" });
      const redraw = () => { list.innerHTML = ""; rows.forEach((r) => list.append(r.el)); };
      const addRow = (v) => {
        const parts = f.fields.map((sf) => ({ sf, ...buildField(sf, getPath(v || {}, sf.key)) }));
        const row = { parts };
        const mv = (d) => { const i = rows.indexOf(row), j = i + d; if (j < 0 || j >= rows.length) return; [rows[i], rows[j]] = [rows[j], rows[i]]; redraw(); };
        row.el = h("div", { class: "rep-row" },
          h("div", { class: "rep-fields" }, parts.map((p) => p.el)),
          h("div", { class: "rep-tools" },
            h("button", { type: "button", class: "btn btn-ghost btn-sm btn-icon", title: "Move up", onclick: () => mv(-1) }, "↑"),
            h("button", { type: "button", class: "btn btn-ghost btn-sm btn-icon", title: "Move down", onclick: () => mv(1) }, "↓"),
            h("button", { type: "button", class: "btn btn-ghost btn-sm btn-icon btn-danger", title: "Remove", onclick: () => { rows.splice(rows.indexOf(row), 1); redraw(); } }, "✕")));
        rows.push(row); list.append(row.el);
      };
      (value || []).forEach(addRow);
      wrap.append(list, h("button", { type: "button", class: "btn btn-sm rep-add", onclick: () => addRow({}) }, f.addLabel || "+ Add"));
      get = () => rows.map((r) => { const o = {}; r.parts.forEach((p) => setPath(o, p.sf.key, p.get())); return o; })
        .filter((o) => Object.values(o).some((v) => (Array.isArray(v) ? v.length : v)));
    } else {
      const i = h("input", { id, type: f.type || "text", placeholder: f.placeholder });
      i.value = value ?? ""; wrap.append(i); get = () => i.value.trim();
    }
    if (f.help) wrap.append(h("div", { class: "help" }, f.help));
    return { el: wrap, get };
  }

  function buildForm(fields, data) {
    const parts = fields.map((f) => ({ f, ...buildField(f, getPath(data || {}, f.key)) }));
    return {
      el: h("div", { class: "form-grid" }, parts.map((p) => p.el)),
      get() { const out = clone(data) || {}; parts.forEach((p) => setPath(out, p.f.key, p.get())); return out; },
      missing() { const p = parts.find((x) => x.f.required && !x.get()); return p && p.f.label; },
    };
  }

  function openEditor({ title, fields, data, onSave }) {
    const form = buildForm(fields, data);
    let dirty = false;
    const back = h("div", { class: "modal-back" });
    const close = (force) => {
      if (!force && dirty && !confirm("Discard your unsaved changes?")) return;
      back.remove(); document.removeEventListener("keydown", onKey);
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    const save = h("button", { type: "button", class: "btn btn-primary" }, "Save & publish");
    save.addEventListener("click", async () => {
      const miss = form.missing();
      if (miss) { toast(`Please fill in “${miss}”.`, "err"); return; }
      save.disabled = true;
      try { await onSave(form.get()); close(true); }
      catch (e) { toast(e.message, "err", 8000); console.error(e); }
      finally { save.disabled = false; busy(false); }
    });
    const modal = h("div", { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": title },
      h("div", { class: "modal-head" }, h("h2", null, title), h("button", { type: "button", class: "btn btn-ghost btn-icon", "aria-label": "Close", onclick: () => close() }, "✕")),
      h("div", { class: "modal-body" }, form.el),
      h("div", { class: "modal-foot" }, h("button", { type: "button", class: "btn", onclick: () => close() }, "Cancel"), save));
    modal.addEventListener("input", () => (dirty = true));
    modal.addEventListener("click", (e) => { if (e.target.closest(".rep-add, .btn-danger, .dropzone")) dirty = true; });
    back.addEventListener("mousedown", (e) => { if (e.target === back) close(); });
    back.append(modal); document.body.append(back); document.addEventListener("keydown", onKey);
    const first = modal.querySelector("input:not([type=file]), textarea, select"); if (first) first.focus();
  }

  const published = () => toast("Saved! Your website will update in about a minute.", "ok");

  /* ================= Views ================= */
  function renderCollection(key) {
    const C = COLLECTIONS[key];
    const list = S.files[C.file].data;
    const order = C.order ? C.order(list) : list.map((_, i) => i);

    const editItem = (i) => openEditor({
      title: i == null ? `New ${C.noun}` : `Edit ${C.noun}`,
      fields: C.fields, data: i == null ? C.blank() : list[i],
      onSave: async (item) => {
        if (C.beforeSave) C.beforeSave(item);
        await uploadPending(item);
        busy("Publishing…");
        const next = list.slice();
        if (i == null) next.push(item); else next[i] = item;
        await saveData(C.file, next, `${i == null ? "Add" : "Update"} ${C.noun}: ${item.title}`);
        if (i != null) await deleteRemoved(list[i], item);
        busy(false); published(); route();
      },
    });
    const del = async (i) => {
      if (!confirm(`Delete “${list[i].title}”? This cannot be undone.`)) return;
      try {
        busy("Deleting…");
        const next = list.filter((_, j) => j !== i);
        await saveData(C.file, next, `Delete ${C.noun}: ${list[i].title}`);
        await deleteRemoved(list[i], null);
        published(); route();
      } catch (e) { toast(e.message, "err", 8000); } finally { busy(false); }
    };
    const move = async (i, d) => {
      const j = i + d; if (j < 0 || j >= list.length) return;
      try {
        busy("Reordering…");
        const next = list.slice(); [next[i], next[j]] = [next[j], next[i]];
        await saveData(C.file, next, `Reorder ${C.noun}s`);
        published(); route();
      } catch (e) { toast(e.message, "err", 8000); } finally { busy(false); }
    };

    const rows = []; let lastGroup = null;
    order.forEach((i) => {
      const it = list[i], s = C.summary(it);
      if (C.groupBy) { const g = C.groupBy(it); if (g !== lastGroup) { rows.push(h("div", { class: "group-label" }, g)); lastGroup = g; } }
      rows.push(h("div", { class: "item" },
        s.thumb !== undefined ? (s.thumb ? h("img", { class: "thumb", src: rawUrl(s.thumb), alt: "", loading: "lazy" }) : h("div", { class: "thumb" })) : null,
        h("div", { class: "main" }, h("div", { class: "t" }, s.t), s.m ? h("div", { class: "m" }, s.m) : null),
        h("div", { class: "tools" },
          C.reorderable ? [
            h("button", { class: "btn btn-ghost btn-sm btn-icon", title: "Move up", onclick: () => move(i, -1) }, "↑"),
            h("button", { class: "btn btn-ghost btn-sm btn-icon", title: "Move down", onclick: () => move(i, 1) }, "↓")] : null,
          h("button", { class: "btn btn-sm", onclick: () => editItem(i) }, "Edit"),
          h("button", { class: "btn btn-sm btn-danger", onclick: () => del(i) }, "Delete"))));
    });

    return h("div", null,
      h("div", { class: "panel-head" },
        h("div", null, h("h2", null, C.title), h("p", null, C.intro)),
        h("button", { class: "btn btn-primary", onclick: () => editItem(null) }, `+ Add ${C.noun}`)),
      h("div", { class: "items" }, rows.length ? rows : h("div", { class: "empty" }, `No ${C.noun}s yet. Click “Add ${C.noun}” to create the first one.`)));
  }

  function renderProfile() {
    const before = S.files.profile.data;
    const form = buildForm(PROFILE_FIELDS, before);
    const save = h("button", { class: "btn btn-primary" }, "Save & publish");
    save.addEventListener("click", async () => {
      const miss = form.missing(); if (miss) { toast(`Please fill in “${miss}”.`, "err"); return; }
      save.disabled = true;
      try {
        const data = form.get();
        await uploadPending(data);
        busy("Publishing…");
        await saveData("profile", data, "Update About Me");
        await deleteRemoved(before, data);
        published(); route();
      } catch (e) { toast(e.message, "err", 8000); } finally { save.disabled = false; busy(false); }
    });
    return h("div", null,
      h("div", { class: "panel-head" }, h("div", null, h("h2", null, "About Me"), h("p", null, "Your introduction, photo, profile links and CV sections. Empty links are hidden on the site."))),
      h("div", { class: "card" }, form.el, h("div", { class: "form-actions" }, save)));
  }

  function renderSettings() {
    const pw1 = h("input", { type: "password", autocomplete: "new-password" }), pw2 = h("input", { type: "password", autocomplete: "new-password" });
    const err = h("p", { class: "error" });
    return h("div", null,
      h("div", { class: "panel-head" }, h("div", null, h("h2", null, "Settings"))),
      h("div", { class: "card" },
        h("h3", null, "Connected repository"),
        h("p", null, h("a", { href: `https://github.com/${S.owner}/${S.repo}`, target: "_blank", rel: "noopener" }, `${S.owner}/${S.repo}`), ` · branch `, h("code", null, S.branch)),
        h("p", { class: "muted" }, "Every save creates a commit in this repository; GitHub Pages then republishes the site. You can see the full history of changes under the repository's Commits page.")),
      h("div", { class: "card" },
        h("h3", null, "Change admin password"),
        h("form", { onsubmit: async (e) => {
          e.preventDefault(); err.textContent = "";
          if (pw1.value.length < 8) { err.textContent = "Use at least 8 characters."; return; }
          if (pw1.value !== pw2.value) { err.textContent = "Passwords don't match."; return; }
          const rec = JSON.parse(localStorage.getItem(LS_KEY));
          Object.assign(rec, await encryptToken(S.token, pw1.value));
          localStorage.setItem(LS_KEY, JSON.stringify(rec)); pw1.value = pw2.value = ""; toast("Password changed.", "ok");
        } },
          h("div", { class: "row2" }, h("label", { class: "field" }, h("span", { class: "lbl" }, "New password"), pw1), h("label", { class: "field" }, h("span", { class: "lbl" }, "Confirm"), pw2)),
          err, h("div", { class: "form-actions" }, h("button", { class: "btn btn-primary", type: "submit" }, "Change password")))),
      h("div", { class: "card" },
        h("h3", null, "This browser"),
        h("p", { class: "muted" }, "Your GitHub token is stored encrypted in this browser only. Remove it if this is a shared computer."),
        h("button", { class: "btn btn-danger", onclick: () => {
          if (!confirm("Remove the saved login from this browser? You'll need your GitHub token to sign in again.")) return;
          localStorage.removeItem(LS_KEY); S.token = ""; showLogin();
        } }, "Remove saved login")));
  }

  /* ================= App shell & routing ================= */
  const TABS = [["news", "News & Updates"], ["publications", "Publications"], ["projects", "Research Projects"], ["profile", "About Me"], ["settings", "Settings"]];
  function route() {
    if (!S.token) return;
    const tab = (location.hash.slice(1) || "news");
    const key = TABS.some(([k]) => k === tab) ? tab : "news";
    document.querySelectorAll(".side a").forEach((a) => a.classList.toggle("active", a.dataset.k === key));
    document.querySelectorAll(".side .count").forEach((c) => { const f = S.files[c.dataset.k]; c.textContent = f && Array.isArray(f.data) ? f.data.length : ""; });
    const view = key === "profile" ? renderProfile() : key === "settings" ? renderSettings() : renderCollection(key);
    const content = $(".content"); content.innerHTML = ""; content.append(view); window.scrollTo(0, 0);
  }
  async function enterApp() {
    busy("Loading your content…");
    try { await Promise.all(DATA_FILES.map(loadData)); }
    catch (e) {
      busy(false);
      if (e.status === 404) toast("Couldn't find the data files in this repository. Make sure you uploaded the whole website folder (including /data) to the repository and branch you entered.", "err", 12000);
      else toast(e.message, "err", 8000);
      S.token = ""; showLogin(); return;
    }
    busy(false);
    const siteUrl = new URL("../", location.href).href;
    $("#root").innerHTML = "";
    $("#root").append(
      h("header", { class: "topbar" },
        h("div", { class: "title" }, "Site Admin", h("small", null, `${S.owner}/${S.repo}`)),
        h("div", { class: "actions" },
          h("a", { class: "btn btn-sm", href: siteUrl, target: "_blank", rel: "noopener" }, "View site ↗"),
          h("button", { class: "btn btn-sm", onclick: () => { S.token = ""; S.files = {}; showLogin(); } }, "Lock"))),
      h("div", { class: "shell" },
        h("nav", { class: "side" }, TABS.map(([k, l]) => h("a", { href: `#${k}`, "data-k": k }, l, h("span", { class: "count", "data-k": k })))),
        h("main", { class: "content" })));
    route();
  }
  window.addEventListener("hashchange", route);

  /* ================= Login ================= */
  async function verifyRepo() {
    const j = await gh(`/repos/${S.owner}/${S.repo}`).catch((e) => {
      if (e.status === 404) throw new Error(`Repository “${S.owner}/${S.repo}” wasn't found, or the token can't access it.`);
      throw e;
    });
    if (j.permissions && j.permissions.push === false) throw new Error("This token can read but not write to the repository. Give it “Contents: Read and write” permission.");
  }

  function guessRepo() {
    const host = location.hostname;
    if (!host.endsWith(".github.io")) return { owner: "", repo: "" };
    const owner = host.split(".")[0];
    const seg = location.pathname.split("/").filter(Boolean);
    return { owner, repo: seg.length > 1 && seg[0] !== "admin" ? seg[0] : host };
  }

  function showLogin() {
    const rec = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    $("#root").innerHTML = "";
    $("#root").append(rec ? unlockView(rec) : setupView());
    const f = $("#root input"); if (f) f.focus();
  }

  function unlockView(rec) {
    const pw = h("input", { type: "password", autocomplete: "current-password", required: true });
    const err = h("p", { class: "error" });
    return h("div", { class: "auth" }, h("div", { class: "auth-card" },
      h("h1", null, "Welcome back"),
      h("p", null, `Enter your admin password to manage ${rec.owner}/${rec.repo}.`),
      h("form", { onsubmit: async (e) => {
        e.preventDefault(); err.textContent = "";
        busy("Signing in…");
        try {
          let token;
          try { token = await decryptToken(rec, pw.value); } catch (_) { throw new Error("Incorrect password."); }
          Object.assign(S, { owner: rec.owner, repo: rec.repo, branch: rec.branch, token });
          await verifyRepo();
          busy(false); enterApp();
        } catch (ex) { busy(false); S.token = ""; err.textContent = ex.message; pw.select(); }
      } },
        h("label", { class: "field" }, h("span", { class: "lbl" }, "Admin password"), pw),
        err,
        h("button", { class: "btn btn-primary", type: "submit" }, "Unlock")),
      h("p", { style: "margin:18px 0 0;font-size:.88rem", class: "muted" }, "Forgot your password? ",
        h("button", { class: "linkish", onclick: () => {
          if (confirm("Reset sign-in on this browser? You'll need to enter a GitHub token again.")) { localStorage.removeItem(LS_KEY); showLogin(); }
        } }, "Reset and sign in with a token"))));
  }

  function setupView() {
    const g = guessRepo();
    const owner = h("input", { type: "text", required: true, value: g.owner, placeholder: "your-github-username", autocomplete: "username" });
    const repo = h("input", { type: "text", required: true, value: g.repo, placeholder: "username.github.io" });
    const branch = h("input", { type: "text", required: true, value: "main" });
    const token = h("input", { type: "password", required: true, placeholder: "github_pat_…", autocomplete: "off" });
    const pw1 = h("input", { type: "password", required: true, autocomplete: "new-password", minlength: "8" });
    const pw2 = h("input", { type: "password", required: true, autocomplete: "new-password" });
    const err = h("p", { class: "error" });
    const lab = (t, el) => h("label", { class: "field" }, h("span", { class: "lbl" }, t), el);
    return h("div", { class: "auth" }, h("div", { class: "auth-card" },
      h("h1", null, "Set up your admin"),
      h("p", null, "One-time setup on each browser you use. Your token never leaves this browser except to talk to GitHub."),
      h("ol", { class: "steps" },
        h("li", null, "Open ", h("a", { href: "https://github.com/settings/personal-access-tokens/new", target: "_blank", rel: "noopener" }, "GitHub → New fine-grained token"), "."),
        h("li", null, "Repository access: ", h("b", null, "Only select repositories"), " → choose your website repo."),
        h("li", null, "Permissions → Repository → ", h("b", null, "Contents: Read and write"), "."),
        h("li", null, "Generate the token, copy it, and paste it below.")),
      h("form", { onsubmit: async (e) => {
        e.preventDefault(); err.textContent = "";
        if (pw1.value.length < 8) { err.textContent = "Choose a password with at least 8 characters."; return; }
        if (pw1.value !== pw2.value) { err.textContent = "Passwords don't match."; return; }
        Object.assign(S, { owner: owner.value.trim(), repo: repo.value.trim(), branch: branch.value.trim() || "main", token: token.value.trim() });
        busy("Checking access…");
        try {
          await verifyRepo();
          const enc = await encryptToken(S.token, pw1.value);
          localStorage.setItem(LS_KEY, JSON.stringify({ owner: S.owner, repo: S.repo, branch: S.branch, ...enc }));
          busy(false); enterApp();
        } catch (ex) { busy(false); S.token = ""; err.textContent = ex.message; }
      } },
        h("div", { class: "row2" }, lab("GitHub username", owner), lab("Branch", branch)),
        lab("Repository name", repo),
        lab("GitHub access token", token),
        h("div", { class: "row2" }, lab("Choose an admin password", pw1), lab("Confirm password", pw2)),
        err,
        h("button", { class: "btn btn-primary", type: "submit" }, "Connect"))));
  }

  if (!window.crypto || !crypto.subtle) {
    $("#root").innerHTML = '<p class="boot">This page must be opened over https (for example, https://yourname.github.io/admin/).</p>';
  } else showLogin();
})();
