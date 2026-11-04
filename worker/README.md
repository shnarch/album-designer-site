# Feedback relay

The website's feedback box posts here; this makes an issue in the private `shnarch/flowalbum-app` repo
with the label `bug`, `feat` or `question`, plus `from-website`. Free on Cloudflare's Workers plan.

## One-time setup (about 10 minutes)

1. **A GitHub token that can only write issues in one repo.** GitHub › Settings › Developer settings ›
   Fine-grained tokens › Generate new token. Resource owner: you. Repository access: **Only select
   repositories › flowalbum-app**. Permissions: **Issues: Read and write** (nothing else). Copy the token.
2. **A free Cloudflare account** at cloudflare.com (no domain needed).
3. In a terminal (needs Node.js):
   ```bash
   cd worker
   npx wrangler login
   npx wrangler secret put GITHUB_TOKEN      # paste the token from step 1
   npx wrangler deploy
   ```
   `deploy` prints an address like `https://flowalbum-feedback.<you>.workers.dev`.
4. Put that address in `config.js` as `FEEDBACK_URL`, commit and push. The feedback box is now live.

### Without a terminal or Node.js

In the Cloudflare dashboard: **Workers & Pages › Create › Create Worker**, name it `flowalbum-feedback`, deploy,
then **Edit code**, paste the whole of `index.js` over the sample and deploy again. Under **Settings › Variables
and Secrets** add: `GITHUB_REPO` = `shnarch/flowalbum-app`, `ALLOWED_ORIGINS` = `https://shnarch.github.io`
(both as text) and `GITHUB_TOKEN` = the token from step 1 (as a secret). The worker's address is shown at the
top of its page: use it as in step 4.

## Optional hardening

- **Bot check (Cloudflare Turnstile, free):** Cloudflare dashboard › Turnstile › add a widget for
  `shnarch.github.io`. Put the **site key** in `config.js` as `TURNSTILE_SITEKEY`, and run
  `npx wrangler secret put TURNSTILE_SECRET` with the **secret key**.
- **Limit per visitor:** `npx wrangler kv namespace create RATE`, then paste the id into the commented
  `[[kv_namespaces]]` block of `wrangler.toml` and deploy again.

The hidden field in the form and the length checks already stop most junk without these.
Issues land in the private repo, so nobody but you sees them or the email address people leave.
