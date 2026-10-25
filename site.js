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
    $$("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    document.title = lang === "he" ? "Album Designer - מעצבים אלבום תמונות" : "Album Designer";
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
    const notes = $("[data-notes]");
    if (notes && latest?.notes) notes.innerHTML = latest.notes.map((n) => `<li>${n.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</li>`).join("");
  }
  fetch("latest.json", { cache: "no-store" }).then((r) => r.json()).then((j) => { latest = j; renderVersion(); }).catch(() => {});

  // ------------------------------------------------------------ personas ----
  function showPersona(p) {
    p = p === "pro" ? "pro" : "quick";
    $$("[data-persona]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.persona === p)));
    $("#guide-quick").hidden = p !== "quick";
    $("#guide-pro").hidden = p !== "pro";
  }
  $$("[data-persona]").forEach((b) => b.addEventListener("click", () => { showPersona(b.dataset.persona); history.replaceState(null, "", "#" + b.dataset.persona); }));
  function fromHash() {
    const h = location.hash.slice(1);
    if (h === "quick" || h === "pro") { showPersona(h); $("#guides").scrollIntoView(); }
  }
  window.addEventListener("hashchange", fromHash);

  // -------------------------------------------------------------- videos ----
  fetch("videos.json").then((r) => r.json()).then((j) => { videos = j; renderVideos(); }).catch(() => {});
  function renderVideos() {
    const cats = [...new Set(videos.map((v) => v.category))];
    const label = (c) => (lang === "he" ? window.HE["c_" + c.replace(/ /g, "_")] : null) || c;
    $("#vfilters").innerHTML = [["", t("v_all")], ...cats.map((c) => [c, label(c)])]
      .map(([c, text]) => `<button type="button" aria-pressed="${vCat === c}" data-cat="${c}">${text}</button>`).join("");
    $$("#vfilters button").forEach((b) => b.addEventListener("click", () => { vCat = b.dataset.cat; renderVideos(); }));
    $("#vgrid").innerHTML = videos.filter((v) => !vCat || v.category === vCat).map((v) => {
      const title = (v.title[lang] || v.title.en).replace(/</g, "&lt;");
      const tag = v.persona === "pro" ? (lang === "he" ? window.HE.p_pro_tag : "Professional design") : (lang === "he" ? window.HE.p_quick_tag : "Quick album");
      const media = v.youtube
        ? `<a class="ph vthumb" href="https://www.youtube-nocookie.com/embed/${v.youtube}" target="_blank" rel="noopener"><span class="play">▶</span></a>`
        : `<div class="ph vthumb" aria-hidden="true"><span class="play">▶</span><small>${t("v_soon")}</small></div>`;
      return `<article class="vcard">${media}<h3>${title}</h3><p class="fine">${label(v.category)} · ${tag}</p></article>`;
    }).join("");
  }

  // ------------------------------------------------------------ feedback ----
  const form = $("#fb"), status = $("#fb-status");
  let tsToken = "";
  if (CFG.TURNSTILE_SITEKEY) {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"; s.async = true;
    s.onload = () => window.turnstile && window.turnstile.render("#ts", { sitekey: CFG.TURNSTILE_SITEKEY, callback: (tok) => (tsToken = tok) });
    document.head.appendChild(s);
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const say = (key, ok) => { status.textContent = t(key); status.className = ok ? "ok" : "bad"; };
    const data = new FormData(form);
    const message = String(data.get("message") || "").trim();
    if (message.length < 10) return say("f_short", false);
    if (!CFG.FEEDBACK_URL) return say("f_off", false);
    say("f_sending", true);
    form.querySelector("button[type=submit]").disabled = true;
    try {
      const res = await fetch(CFG.FEEDBACK_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: data.get("type"), message, email: String(data.get("email") || "").trim(),
          website: data.get("website") || "", token: tsToken, lang, version: latest?.version || "", page: location.href.split("#")[0] }),
      });
      if (!res.ok) throw new Error(res.status);
      form.reset(); say("f_ok", true);
      if (window.turnstile) window.turnstile.reset();
    } catch { say("f_err", false); }
    form.querySelector("button[type=submit]").disabled = false;
  });

  // ---------------------------------------------------------------- start ----
  let saved = null; try { saved = localStorage.getItem("lang"); } catch {}
  setLang(saved || ((navigator.language || "").startsWith("he") ? "he" : "en"), false);
  fromHash();
})();
