# UI pass findings

Source: the 28 screenshots in this folder (14 routes, desktop 1440px and mobile 390px), `console.json`, and a Playwright probe against `next start -p 3100` with a fresh user.

Severity:
- **blocker**: the page is broken or tells the user something false.
- **bad**: clearly wrong, but the page still works.
- **polish**: cosmetic.

Status reads `fixed` (with file:line) or `left for later` (with the reason). `n/a` rows are screenshots with nothing to fix.

After the fixes, `console.json` shows no console errors or failed requests on any route except the deliberate 404 at `/missing-ui-pass`. The "before" screenshots are in git history at 9737187.

| # | Route | Screenshot | Severity | Problem | Fix | Status |
|---|-------|------------|----------|---------|-----|--------|
| 1 | `/` | home-desktop | blocker | Hero image `/dashboard-preview.png` is a 0-byte file, so the hero shows a broken image | Remove the image block; keep the copy | fixed: hero image block removed, empty file deleted (`src/components/landing-page.tsx:34-60`) |
| 2 | `/` | home-desktop, home-mobile | blocker | Features claim "Track prices across Amazon, eBay, Walmart" — no marketplace integration exists (onboarding rejects marketplace URLs) | Drop the marketplace card; describe direct website monitoring only | fixed: marketplace card replaced with discovery and website tracking (`src/components/landing-page.tsx:74-83`) |
| 3 | `/` | home-desktop | blocker | Pricing section invents $49/$99/$199 plans with SMS, API access, white-label; no billing exists | Remove the pricing section and its nav link | fixed: pricing section and nav link removed (`src/components/landing-page.tsx:10-20`, section deleted) |
| 4 | `/` | home-desktop, home-mobile | bad | "Start Free Trial" implies a paid product with a trial | Rename to "Get Started" | fixed: "Get Started" (`src/components/landing-page.tsx:49`) |
| 5 | `/` | home-desktop | bad | "advanced encryption technology" and "real-time" claims are unbacked | Reword to what the app does (scheduled checks, account-scoped data) | fixed: copy reworded (`src/components/landing-page.tsx:44,101`) |
| 6 | `/` | home-mobile | bad | Header overflows at 390px; "Sign Up" is cut off | Hide "Log In" text button below `sm`, tighten gaps | fixed: smaller buttons and padding below `sm` (`src/components/landing-page.tsx:10-28`) |
| 7 | all app routes | dashboard-desktop etc. | blocker | Sidebar brand reads "PriceWhisperer" | "Sagelytics" with the landing-page LineChart icon | fixed (`src/components/layout/Sidebar.tsx:112-113`) |
| 8 | all app routes | dashboard-desktop etc. | blocker | Sidebar card promises "increase revenue by 23% with AI suggestions" | Replace with a neutral pointer to Insights, no number | fixed (`src/components/layout/Sidebar.tsx:151-154`) |
| 9 | all app routes | dashboard-desktop etc. | polish | Sidebar "View Insights" button is not a link | Wrap in `Link href="/insights"` | fixed (`src/components/layout/Sidebar.tsx:156-158`) |
| 10 | all app routes | dashboard-desktop, settings-desktop | bad | Two primary colours: purple `brand-*` in the sidebar, blue `--primary` elsewhere; dark mode switches `--primary` to purple | Retune `--brand-*` to hue 221 and set dark `--primary`/`--ring` to blue | fixed (`src/styles/globals.css:40-49,62,79,84-93`) |
| 11 | `/login`, `/register`, `/forgot-password`, `/reset-password` | login-*, register-*, forgot-password-*, reset-password-* | bad | Logo uses `/owl-logo.png`, which does not exist; broken image and a 400 from `/_next/image` in the console | Use the LineChart icon the landing page uses | fixed (`src/app/login/page.tsx:26`, `src/app/register/page.tsx:88`, `src/app/forgot-password/page.tsx:64`, `src/app/reset-password/page.tsx:142`) |
| 12 | `/login` | login-desktop | polish | Login form logs the session object to the console | Remove the debug log | fixed (`src/app/login/page.tsx:15-19`, the effect no longer logs) |
| 13 | `/forgot-password` | forgot-password-desktop | bad | With SMTP unset, the 503 "not configured" reply shows as a generic "Failed to request password reset" toast | Show an inline, honest message that email reset is not set up | fixed: inline "not configured" message (`src/app/forgot-password/page.tsx:34-37,79-89`) |
| 14 | `/dashboard` | dashboard-desktop, dashboard-mobile | blocker | Data Quality shows "100% Great data quality!" with no data | Show "--" and "No data yet" when there are no products | fixed (`src/components/dashboard/SummaryCards.tsx:205-207`) |
| 15 | `/dashboard` | dashboard-desktop | blocker | Market Strength shows "0/100 Room for improvement" with no comparisons | Show "--" and "No comparisons yet" | fixed (`src/components/dashboard/SummaryCards.tsx:224-226`) |
| 16 | `/dashboard` | dashboard-desktop | bad | Price Analysis shows a green "0.0% vs competitors" with no matches | Show "No matched products yet" when there are none | fixed (`src/components/dashboard/SummaryCards.tsx:177-192`) |
| 17 | `/dashboard` | dashboard-desktop | polish | Summary error state titles every card "Error" | Keep the real card titles in the error state | fixed (`src/components/dashboard/SummaryCards.tsx:43-46`) |
| 18 | `/dashboard` | — | bad | Anonymous visitors get a bare "Unauthorized" page instead of a redirect | `redirect('/login')` | fixed (`src/app/dashboard/page.tsx:21`) |
| 19 | `/dashboard` | dashboard-mobile | polish | Onboarding banner text and link wrap awkwardly on mobile | Stack on small screens | fixed (`src/app/dashboard/page.tsx:31`) |
| 20 | `/dashboard` | dashboard-desktop | polish | Pricing Trends shows Log/Filter/range controls while empty | left as is | left for later: the controls are harmless, and hiding them changes the chart component |
| 21 | `/insights` | insights-desktop, insights-mobile | blocker | Shows a hardcoded insight ("prices 12% below market", "competitors +8%") to a user with no data | Replace with an honest empty state that links to competitors | fixed (`src/app/insights/page.tsx:25-39`) |
| 22 | `/settings` | settings-desktop | blocker | Billing tab is fabricated: Pro plan, Visa 4242, invoices. No billing exists | Remove the Billing tab and its navbar menu item | fixed: tab, navbar link and `SettingsBilling.tsx` removed (`src/app/settings/page.tsx:50-55`, `src/components/layout/Navbar.tsx`) |
| 23 | `/settings` | settings-desktop | bad | Avatar falls back to `/placeholder-avatar.jpg`, which 404s | Use the initials fallback only | fixed (`src/components/settings/SettingsProfile.tsx:131-133`) |
| 24 | `/settings` | settings-desktop | bad | "Change Avatar" uploads nothing and shows an "Avatar updated (mock)" toast | Remove the mock upload button; keep the Avatar URL field | fixed (`src/components/settings/SettingsProfile.tsx:134-136`) |
| 25 | `/settings` | settings-mobile | polish | Tab list overflows at 390px | Let the tab list scroll horizontally | fixed (`src/app/settings/page.tsx:50`) |
| 26 | `/settings` | — | polish | Theme and dev-mode storage keys still say `pricewhisperer-*` | Rename to `sagelytics-*` | fixed (`src/app/layout.tsx:37`, `src/components/layout/DevModeToggle.tsx:7`). Saved theme choices under the old key reset once |
| 27 | `/settings/data` | settings-data-mobile | polish | Tab list clips on mobile | Let the tab list scroll horizontally | fixed: icons hidden and smaller text below `sm` (`src/components/settings/DataImportExportClient.tsx:179-190`) |
| 28 | `/settings/data` | settings-data-desktop | polish | No issues beyond #27 | — | n/a |
| 29 | `/competitors` | competitors-desktop | bad | Subtitle says "across marketplaces" | "Monitor and analyze competitor websites" | fixed (`src/app/competitors/page.tsx:8,23`) |
| 30 | `/competitors` | competitors-desktop | bad | "Avg Match Score 0%" with no competitors | Show "--" when there are no competitors | fixed (`src/app/competitors/CompetitorsClient.tsx:24-26,49`) |
| 31 | `/products` | products-mobile | polish | Header and actions wrap badly on mobile | Stack the header on small screens | fixed (`src/components/products/ProductPageClient.tsx:219,232,392`) |
| 32 | `/products` | products-desktop | polish | Empty states read correctly | — | n/a |
| 33 | `/monitoring` | monitoring-mobile | polish | Title and "Refresh All" crowd each other at 390px | Stack the header on small screens | fixed: the no-op "Refresh All" removed; the tasks panel keeps its working Refresh (`src/app/monitoring/page.tsx:15`) |
| 34 | `/monitoring` | monitoring-desktop | polish | Empty states read correctly | — | n/a |
| 35 | `/onboarding` | onboarding-desktop, onboarding-mobile | polish | No problems found; the marketplace guard works | — | n/a |
| 36 | `/register` | register-desktop, register-mobile | polish | Only the logo issue (#11) | — | n/a |
| 37 | `/reset-password` | reset-password-desktop, reset-password-mobile | polish | Without a token it shows "Invalid reset link" with no brand header | left as is | left for later: low traffic, and the card already links back to login |
| 38 | `/missing-ui-pass` (404) | missing-ui-pass-desktop, missing-ui-pass-mobile | polish | 404 page logs `console.error` on every view and has no brand | Drop the console.error | fixed (`src/app/not-found.tsx:5`). Brand header left for later: cosmetic |
| 39 | navbar | dashboard-desktop | polish | Bell button does nothing | Remove it until notifications have an inbox | fixed (`src/components/layout/Navbar.tsx`) |
| 40 | `/dashboard`, `/products` | dashboard-desktop | polish | Page metadata says "across marketplaces" | Reword | fixed (`src/app/dashboard/page.tsx:16`); `/products` metadata was already accurate |
| 41 | `/login` | login-desktop | bad | "Continue with GitHub" button, but only Google and credentials providers are configured | Remove the button | fixed (`src/components/login-form.tsx:157-176`) |
