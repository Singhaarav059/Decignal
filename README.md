# Decignal

Marketing site for Decignal, decision intelligence for enterprises across India and Africa. Decignal reads the systems a business already runs (ERP, CRM, MES, WMS, suppliers, external feeds) and turns what it sees into decisions people approve.

The home page is one scroll-driven 3D story: a connected world of islands that follows a single shortage from signal to decision. After the story come the applications explorer, outcomes, how it works, FAQ and the free AI audit form. Service pages live under `/solutions/{slug}`.

Live: https://decignal.up.railway.app

## Stack

- Next.js 16.3 App Router (Turbopack), React 19, TypeScript
- three.js r186 with @react-three/fiber and drei for both canvases (the story stage and the applications explorer)
- GSAP and Lenis for scroll, Tailwind CSS v4 with tokens in `app/styles/tokens.css`
- Fonts: Bricolage Grotesque (headlines, numerals, labels) and Figtree (text), self-hosted from `app/fonts` through `next/font/local` (variable woff2, OFL licences beside them), so neither the build nor the page fetches a font from anywhere else; `public/fonts/*.woff` are the static cuts the 3D labels use

## Getting started

Node 24 (see `.nvmrc`; Next 16 needs at least 20.9).

```bash
npm ci
npm run dev        # http://localhost:3000
```

In development, `window.__goto(g)` jumps the story to a position.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build |
| `npm start` | Serve the build (reads `PORT`) |
| `npm run lint` | ESLint over the repo (`.claude/` and `references/` are ignored) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run rules` | Design-rule gate in warn mode (`scripts/rules-check.mjs`): em dashes, warm colours, gradients, blur, backdrop filters, ink colour-mix, `100vw` in `calc`, soft shadows |
| `npm run check` | typecheck, lint, rules, then build. Run before pushing |

`node scripts/rules-check.mjs --strict` fails on any finding; use it as the release gate.

## Environment

Copy `.env.example` to `.env.local`. Every variable is optional.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public origin for canonical URLs, sitemap, robots and social images. Read at build time. Defaults to `https://decignal.up.railway.app`. Set it when the custom domain goes live |
| `AUDIT_WEBHOOK_URL` | Audit requests are POSTed here as JSON |
| `RESEND_API_KEY`, `AUDIT_TO_EMAIL`, `AUDIT_FROM_EMAIL` | Audit requests are emailed through Resend (all three needed) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Shows a contact mailto in the footer, error page, privacy notice and the audit form fallback |

With no delivery channel configured, `/api/audit` answers 503 and the form offers the downloadable brief instead, so nothing is silently lost.

## Deploy (Railway)

`main` deploys to Railway. `railway.json` sets the build (`npm run build`), the start command (`npm start`), a health check on `/api/health` and restart on failure. Railway's Railpack builder takes the Node version from `engines` in `package.json` (24.x).

- Turn on "Wait for CI" in the Railway service so a red CI run does not deploy.
- Railway marks config as code (`railway.json`) as deprecated in favour of Infrastructure as Code (`.railway/railway.ts`, applied with the Railway CLI). Existing files keep working until 2026-12-01; migrate before then or move these settings into the service dashboard.
- When the custom domain is ready, set `NEXT_PUBLIC_SITE_URL` and redeploy.

Production responses carry a Content Security Policy, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and COOP (see `next.config.ts`). The CSP applies only to production builds so `next dev` keeps working. Verify any change to it against a production build with a full scroll: a wrong directive blanks the 3D silently.

## CI

`.github/workflows/ci.yml` runs on pushes and pull requests to `main`: `npm ci`, typecheck, lint, rules (warn) and build.

## Project layout

- `app/`: routes, metadata files (icons, manifest, robots, sitemap, OG image), error pages, `api/health` and `api/audit`
- `app/styles/`: CSS split by area (tokens, base, primitives, story, explorer, editorial, audit, chrome, infra, service), imported in order by `app/globals.css`
- `components/story/`: the scroll story DOM; `components/three/`: the 3D world; `components/sections/`: editorial sections
- `lib/`: story timeline and store, the copy deck (`lib/copy.ts`), content and areas, the site constants (`lib/site.ts`: origin, metadata words from the copy deck, brand hexes mirrored from the tokens)
- `DESIGN.md`: design rules

## Owner review

Before launch the owner confirms or supplies each item below. Until then the site states only what it does today.

- [ ] **Audit format.** `AUDIT.facts` in `lib/copy.ts` says "Video call". Confirm it, or change it.
- [ ] **Summary turnaround.** The site promises no turnaround ("In writing, after the call"). "Within 2 working days" was removed because it was never confirmed. Put a turnaround back only once you can commit to it.
- [ ] **Audit delivery.** Set `AUDIT_WEBHOOK_URL`, or `RESEND_API_KEY` with `AUDIT_TO_EMAIL` and `AUDIT_FROM_EMAIL`. Until one is set, every request ends in the 503 download fallback and nobody receives it. Each delivered request carries `source`, the page it came from (for example `/solutions/finance-and-risk`).
- [ ] **Contact email.** Set `NEXT_PUBLIC_CONTACT_EMAIL`. Without it there is no contact address in the footer, the error page or the privacy notice, and the audit form offers no email fallback.
- [ ] **Legal entity.** The registered company name and address. The footer reads "© 2026 Decignal" until then (`FOOTER.copyright`).
- [ ] **Privacy and terms review.** `/privacy` and `/terms` are drafts (`PAGES.privacy`, `PAGES.terms` in `lib/copy.ts`) and stay `noindex`. They still need the legal entity, the registered address, a grievance contact under India's DPDP Act, the retention period and the delivery services in use (webhook target, Resend). Have them reviewed, then remove `robots: { index: false }` from both pages.
- [ ] **Production domain.** Set `NEXT_PUBLIC_SITE_URL` and redeploy.
