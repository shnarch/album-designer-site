// Feedback relay: the website's feedback form posts here, and this makes an issue in the private
// Album Designer repo. The GitHub token lives only here (as a secret), never in the website.
// Setup: worker/README.md.

const TYPES = {
  bug: { label: "bug", name: "Bug" },
  feature: { label: "feat", name: "Idea" },
  question: { label: "question", name: "Question" },
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return reply(405, { error: "POST only" });
    if (allowed.length && !allowed.includes(origin)) return reply(403, { error: "not allowed from here" });

    let d;
    try { d = await request.json(); } catch { return reply(400, { error: "bad request" }); }
    if (d.website) return reply(200, { ok: true });                       // the hidden field: a bot filled it, pretend it worked

    const type = TYPES[d.type] || TYPES.bug;
    const message = String(d.message || "").trim().slice(0, 4000);
    if (message.length < 10) return reply(400, { error: "message too short" });
    const email = String(d.email || "").trim().slice(0, 200);

    if (env.TURNSTILE_SECRET) {                                             // optional bot check
      const form = new FormData();
      form.append("secret", env.TURNSTILE_SECRET); form.append("response", String(d.token || ""));
      const ok = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form }).then((r) => r.json()).catch(() => ({}));
      if (!ok.success) return reply(403, { error: "bot check failed" });
    }

    if (env.RATE) {                                                         // optional: 5 messages per hour per visitor (KV namespace RATE)
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const key = `rate:${ip}:${new Date().toISOString().slice(0, 13)}`;
      const n = parseInt((await env.RATE.get(key)) || "0", 10);
      if (n >= 5) return reply(429, { error: "too many messages, try later" });
      await env.RATE.put(key, String(n + 1), { expirationTtl: 3700 });
    }

    const firstLine = message.split("\n")[0].replace(/\s+/g, " ").slice(0, 80);
    const body = [
      message, "", "---",
      `Type: ${type.name}`,
      `App/site version: ${String(d.version || "unknown").slice(0, 20)}`,
      `Language: ${d.lang === "he" ? "Hebrew" : "English"}`,
      email ? `Reply to: ${email}` : "Reply to: (not given)",
      "Sent from the website's feedback box.",
    ].join("\n");

    const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "album-designer-feedback",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ title: `[Website] ${firstLine}`, body, labels: [type.label, "from-website"] }),
    });
    if (!res.ok) return reply(502, { error: "couldn't log it" });
    return reply(200, { ok: true });
  },
};
