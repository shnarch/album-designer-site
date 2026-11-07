(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CFG = window.SITE_CONFIG || {};
  const PH = { en: "Example: I click Lay out album with 50 photos and nothing happens.", he: "לדוגמה: לחצתי על Lay out album עם 50 תמונות ושום דבר לא קרה." };
  let lang = "en";
  let latest = null, videos = [], vCat = "";

  // ------------------------------------------------------------ language ----
  function t(key) { return (lang === "he" ? window.HE[key] : window.EN[key]) ?? window.EN[key] ?? key; }
  function setLang(l, remember = true) {
    lang = l === "he" ? "he" : "en";
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    $$("[data-i18n], [data-i18n-html]").forEach((el) => {
      const key = el.dataset.i18n || el.dataset.i18nHtml, html = el.dataset.i18nHtml !== undefined;
      if (el.dataset.en === undefined) el.dataset.en = html ? el.innerHTML : el.textContent;
      const text = lang === "he" ? window.HE[key] : null;
      if (html) el.innerHTML = text ?? el.dataset.en; else el.textContent = text ?? el.dataset.en;
    });
    $$("[data-i18n-ph]").forEach((el) => (el.placeholder = PH[lang]));
    $$("[data-i18n-alt]").forEach((el) => (el.alt = (lang === "he" ? window.HE[el.dataset.i18nAlt] : window.EN_ALT[el.dataset.i18nAlt]) || ""));
    $$("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    document.title = lang === "he" ? "FlowAlbum - הסיפורים שלכם, מעוצבים מחדש בלחיצה" : "FlowAlbum: your stories, redesigned in a click";
    if (remember) try { localStorage.setItem("lang", lang); } catch {}
    renderVersion(); renderVideos();
  }
  $$("[data-lang]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));

  // ------------------------------------------------------------- version ----
  function renderVersion() {
    const v = latest?.version;
    $$("[data-version]").forEach((el) => (el.textContent = v ? `v${v}` : t("v_beta")));
    $$("[data-version-short]").forEach((el) => (el.textContent = v ? `v${v}` : ""));
    $$("[data-released]").forEach((el) => (el.textContent = latest?.released ? `· ${t("v_released")} ${latest.released}` : ""));
    if (latest?.windows) $$("[data-dl-windows]").forEach((a) => { if (a.tagName === "A" && !a.getAttribute("href").startsWith("#")) a.href = latest.windows; });
    if (latest?.mac) $$("[data-dl-mac]").forEach((a) => (a.href = latest.mac));
    if (latest?.mac_intel) $$("[data-dl-mac-intel]").forEach((a) => (a.href = latest.mac_intel));
    const notes = $("[data-notes]");
    if (notes && latest?.notes) notes.innerHTML = latest.notes.map((n) => `<li>${n.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</li>`).join("");
  }
  // a click on a download button is counted as a "download" event in Google Analytics (the buttons lead to GitHub, which Google cannot see)
  document.addEventListener("click", (e) => {
    const a = e.target.closest?.("a[data-dl-windows], a[data-dl-mac], a[data-dl-mac-intel], a[href*='/releases/download/']");
    if (!a || typeof gtag !== "function") return;
    const platform = a.hasAttribute("data-dl-windows") ? "windows" : a.hasAttribute("data-dl-mac-intel") ? "mac_intel" : a.hasAttribute("data-dl-mac") ? "mac_apple_silicon" : "other";
    gtag("event", "download", { platform, version: latest?.version || "", file_name: (a.href.split("/").pop() || "").slice(0, 80) });
  });
  fetch("latest.json", { cache: "no-store" }).then((r) => r.json()).then((j) => { latest = j; renderVersion(); }).catch(() => {});

  // ------------------------------------------- Windows or Mac install steps ----
  function showOs(os, remember = false) {
    os = os === "mac" ? "mac" : "win";
    $$("[data-os-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.osTab === os)));
    const root = $("[data-os-root]"); if (root) root.dataset.os = os;
    if (remember) try { localStorage.setItem("os", os); } catch {}
  }
  $$("[data-os-tab]").forEach((b) => b.addEventListener("click", () => showOs(b.dataset.osTab, true)));
  let savedOs = null; try { savedOs = localStorage.getItem("os"); } catch {}
  showOs(savedOs || (/Mac/.test(navigator.platform || "") && !/iPhone|iPad/.test(navigator.userAgent) ? "mac" : "win"));

  // ------------------------------------------------------------ personas ----
  function showPersona(p) {                      // "" = neither: both guides closed
    p = p === "pro" || p === "quick" ? p : "";
    $$("[data-persona]").forEach((b) => b.setAttribute("aria-expanded", String(b.dataset.persona === p)));
    $("#guide-quick").hidden = p !== "quick";
    $("#guide-pro").hidden = p !== "pro";
  }
  $$("[data-persona]").forEach((b) => b.addEventListener("click", () => {
    const p = b.getAttribute("aria-expanded") === "true" ? "" : b.dataset.persona;       // clicking the open one closes it
    showPersona(p);
    if (p) $("#guides").scrollIntoView();                                                  // the question stays on top, the guide opens below it
  }));
  // Nothing in the address bar: the page always starts with both guides closed, until the visitor picks one.

  // -------------------------------------------------------------- videos ----
  fetch("videos.json").then((r) => r.json()).then((j) => { videos = j; renderVideos(); videoFromAddress(); }).catch(() => {});
  function renderVideos() {
    const cats = [...new Set(videos.map((v) => v.category))];
    const label = (c) => (lang === "he" ? window.HE["c_" + c.replace(/ /g, "_")] : null) || c;
    $("#vfilters").innerHTML = [["", t("v_all")], ...cats.map((c) => [c, label(c)])]
      .map(([c, text]) => `<button type="button" aria-pressed="${vCat === c}" data-cat="${c}">${text}</button>`).join("");
    $$("#vfilters button").forEach((b) => b.addEventListener("click", () => { vCat = b.dataset.cat; renderVideos(); }));
    $("#vgrid").innerHTML = videos.filter((v) => !vCat || v.category === vCat || (v.also || []).includes(vCat)).map((v) => {
      const title = (v.title[lang] || v.title.en).replace(/</g, "&lt;");
      const tag = v.persona === "pro" ? (lang === "he" ? window.HE.p_pro_tag : "Professional design") : (lang === "he" ? window.HE.p_quick_tag : "Quick album");
      // a video with a file: its picture and a play button; a click opens it large in the page (the lightbox below) and plays it at once
      const media = v.file
        ? `<button type="button" class="vbtn" aria-label="${t("v_play")}: ${title}"><img src="media/${v.file}.webp" alt="" width="1280" height="800" loading="lazy" decoding="async"><span class="play" aria-hidden="true">▶</span></button>`
        : v.youtube
        ? `<a class="ph vthumb" href="https://www.youtube-nocookie.com/embed/${v.youtube}" target="_blank" rel="noopener"><span class="play">▶</span></a>`
        : `<div class="ph vthumb" aria-hidden="true"><span class="play">▶</span><small>${t("v_soon")}</small></div>`;
      return `<article class="vcard"${v.file ? ` data-video="${v.id}"` : ""}>${media}<p class="fine vmeta"><span>${label(v.category)} · ${tag}</span>${v.file ? `<button type="button" class="vlink" data-copy="${v.id}" title="${t("lb_copy")}" aria-label="${t("lb_copy")}: ${title}">🔗</button>` : ""}</p></article>`;
    }).join("");
  }

  // ------------------------------------------------------------ lightbox ----
  // Screenshots, and the two Claude set-up videos linked from the install steps, open in a window inside the page:
  // Esc, a click outside, or the ✕ closes it, and the visitor is still on the same page (no new tab, no history entry).
  const lb = document.createElement("dialog");
  lb.className = "lightbox";
  lb.innerHTML = '<button type="button" class="lb-close" data-lb="close">✕</button><button type="button" class="lb-nav lb-prev" data-lb="prev">‹</button>' +
    '<div class="lb-stage"></div><p class="lb-cap"></p><button type="button" class="lb-copy" data-lb="copy" hidden></button><button type="button" class="lb-nav lb-next" data-lb="next">›</button>';
  document.body.appendChild(lb);
  let lbList = [], lbAt = 0, lbVideoId = "";
  const lbStage = lb.querySelector(".lb-stage"), lbCap = lb.querySelector(".lb-cap"), lbCopy = lb.querySelector(".lb-copy");
  function lbLabels(title) {
    lb.setAttribute("aria-label", title || "");
    lb.querySelector(".lb-close").setAttribute("aria-label", t("lb_close")); lb.querySelector(".lb-close").title = t("lb_close");
    lb.querySelector(".lb-prev").setAttribute("aria-label", t("lb_prev")); lb.querySelector(".lb-next").setAttribute("aria-label", t("lb_next"));
  }
  function lbOpen() { if (!lb.open) { lb.showModal(); document.documentElement.classList.add("lb-open"); } }
  function lbShow(i) {
    lbAt = (i + lbList.length) % lbList.length; lbCopy.hidden = true;
    const a = lbList[lbAt], img = a.querySelector("img"), alt = (img && img.alt) || "";
    lbStage.innerHTML = ""; const big = document.createElement("img"); big.src = a.getAttribute("href"); big.alt = alt; lbStage.appendChild(big);
    lbCap.textContent = alt; lbLabels(alt);
    lb.querySelectorAll(".lb-nav").forEach((b) => (b.hidden = lbList.length < 2));
    lbOpen();
  }
  function lbVideo(id) {
    const v = videos.find((x) => x.id === id), file = (v && v.file) || id, title = v ? (v.title[lang] || v.title.en) : "";
    lbList = [];
    lbStage.innerHTML = `<video controls autoplay playsinline poster="media/${file}.webp"><source src="media/${file}.mp4" type="video/mp4"></video>`;
    lbCap.textContent = title; lbLabels(title);
    lb.querySelectorAll(".lb-nav").forEach((b) => (b.hidden = true));
    lbVideoId = id; lbCopy.hidden = false; lbCopy.textContent = "🔗 " + t("lb_copy");
    try { history.replaceState(null, "", "#video=" + encodeURIComponent(id)); } catch {}      // the address bar is now a link to this video
    lbOpen();
  }
  function copyVideoLink(id, done) {
    const url = location.origin + location.pathname + "#video=" + encodeURIComponent(id);
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(done, () => { prompt(t("lb_copy"), url); });
  }
  // A link such as .../#video=photos-groups opens that video (and a visitor can copy the link from the window).
  function videoFromAddress() {
    const m = /^#video=([\w-]+)$/.exec(location.hash), v = m && videos.find((x) => x.id === m[1] && x.file);
    if (v) lbVideo(v.id);
  }
  lb.addEventListener("close", () => {
    if (lbVideoId) { try { history.replaceState(null, "", "#guides"); } catch {} lbVideoId = ""; }
    lbStage.innerHTML = ""; document.documentElement.classList.remove("lb-open");
  });   // also stops a playing video
  lb.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lb]");
    if (b && b.dataset.lb === "copy") {
      copyVideoLink(lbVideoId, () => { lbCopy.textContent = "🔗 " + t("lb_copied"); setTimeout(() => (lbCopy.textContent = "🔗 " + t("lb_copy")), 2000); });
      return;
    }
    if (b) { if (b.dataset.lb === "close") lb.close(); else lbShow(lbAt + (b.dataset.lb === "next" ? 1 : -1)); return; }
    if (e.target === lb || e.target.closest(".lb-stage img")) lb.close();       // the dark area or the picture itself
  });
  lb.addEventListener("keydown", (e) => {
    if (lbList.length > 1 && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { e.preventDefault(); lbShow(lbAt + (e.key === "ArrowRight" ? 1 : -1)); }
  });
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // a new tab on purpose: let the browser do it
    const cp = e.target.closest("[data-copy]");           // the 🔗 under a thumbnail: copy the link, don't play
    if (cp) {
      e.preventDefault(); e.stopPropagation();
      copyVideoLink(cp.dataset.copy, () => { cp.textContent = "✓"; cp.title = t("lb_copied"); setTimeout(() => { cp.textContent = "🔗"; cp.title = t("lb_copy"); }, 2000); });
      return;
    }
    const vl = e.target.closest("[data-video]");
    if (vl) { e.preventDefault(); lbVideo(vl.dataset.video); return; }
    const shot = e.target.closest(".shot a");
    if (shot) {
      e.preventDefault();
      lbList = $$(".shot a", shot.closest("ol") || document).filter((a) => a.offsetParent !== null);      // the visible screenshots of this list
      lbShow(Math.max(0, lbList.indexOf(shot)));
    }
  });

  // ------------------------------------------------------------ feedback ----
  const form = $("#fb"), status = $("#fb-status");
  let tsToken = "";
  if (CFG.TURNSTILE_SITEKEY) {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"; s.async = true;
    s.onload = () => window.turnstile && window.turnstile.render("#ts", { sitekey: CFG.TURNSTILE_SITEKEY,
      callback: (tok) => (tsToken = tok), "expired-callback": () => (tsToken = ""), "error-callback": () => (tsToken = "") });
    document.head.appendChild(s);
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const say = (key, ok) => { status.textContent = t(key); status.className = ok ? "ok" : "bad"; };
    const data = new FormData(form);
    const message = String(data.get("message") || "").trim();
    if (message.length < 10) return say("f_short", false);
    if (!CFG.FEEDBACK_URL) return say("f_off", false);
    if (CFG.TURNSTILE_SITEKEY && !tsToken) return say("f_human", false);        // the human check has to be ticked for every message
    say("f_sending", true);
    form.querySelector("button[type=submit]").disabled = true;
    try {
      const res = await fetch(CFG.FEEDBACK_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: data.get("type"), message, email: String(data.get("email") || "").trim(),
          token: tsToken, lang, version: latest?.version || "", page: location.href.split("#")[0] }),
      });
      if (!res.ok) throw new Error(res.status);
      form.reset(); say("f_ok", true);
    } catch (err) { say(String(err.message) === "403" ? "f_human" : String(err.message) === "429" ? "f_many" : "f_err", false); }
    tsToken = ""; if (window.turnstile) window.turnstile.reset();             // a token works once: the next message needs a fresh check
    form.querySelector("button[type=submit]").disabled = false;
  });

  // ---------------------------------------------------------------- start ----
  let saved = null; try { saved = localStorage.getItem("lang"); } catch {}
  setLang(saved || ((navigator.language || "").startsWith("he") ? "he" : "en"), false);
})();
