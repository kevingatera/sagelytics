# UI pass findings

Source: the 28 screenshots in this folder (14 routes, desktop 1440px and mobile 390px), `console.json`, and a Playwright probe against `next start -p 3100` with a fresh user.

Severity:
- **blocker**: the page is broken or tells the user something false.
- **bad**: clearly wrong, but the page still works.
- **polish**: cosmetic.

Status is `planned` until Phase B lands. After that it reads `fixed` or `left for later`, with the reason.

| # | Route | Screenshot | Severity | Problem | Fix | Status |
|---|-------|------------|----------|---------|-----|--------|
| 1 | `/` | home-desktop | blocker | Hero image `/dashboard-preview.png` is a 0-byte file, so the hero shows a broken image | Remove the image block; keep the copy | planned |
| 2 | `/` | home-desktop, home-mobile | blocker | Features claim "Track prices across Amazon, eBay, Walmart" — no marketplace integration exists (onboarding rejects marketplace URLs) | Drop the marketplace card; describe direct website monitoring only | planned |
| 3 | `/` | home-desktop | blocker | Pricing section invents $49/$99/$199 plans with SMS, API access, white-label; no billing exists | Remove the pricing section and its nav link | planned |
| 4 | `/` | home-desktop, home-mobile | bad | "Start Free Trial" implies a paid product with a trial | Rename to "Get Started" | planned |
| 5 | `/` | home-desktop | bad | "advanced encryption technology" and "real-time" claims are unbacked | Reword to what the app does (scheduled checks, account-scoped data) | planned |
| 6 | `/` | home-mobile | bad | Header overflows at 390px; "Sign Up" is cut off | Hide "Log In" text button below `sm`, tighten gaps | planned |
| 7 | all app routes | dashboard-desktop etc. | blocker | Sidebar brand reads "PriceWhisperer" | "Sagelytics" with the landing-page LineChart icon | planned |
| 8 | all app routes | dashboard-desktop etc. | blocker | Sidebar card promises "increase revenue by 23% with AI suggestions" | Replace with a neutral pointer to Insights, no number | planned |
| 9 | all app routes | dashboard-desktop etc. | polish | Sidebar "View Insights" button is not a link | Wrap in `Link href="/insights"` | planned |
| 10 | all app routes | dashboard-desktop, settings-desktop | bad | Two primary colours: purple `brand-*` in the sidebar, blue `--primary` elsewhere; dark mode switches `--primary` to purple | Retune `--brand-*` to hue 221 and set dark `--primary`/`--ring` to blue | planned |
| 11 | `/login`, `/register`, `/forgot-password`, `/reset-password` | login-*, register-*, forgot-password-*, reset-password-* | bad | Logo uses `/owl-logo.png`, which does not exist; broken image and a 400 from `/_next/image` in the console | Use the LineChart icon the landing page uses | planned |
| 12 | `/login` | login-desktop | polish | Login form logs the session object to the console | Remove the debug log | planned |
| 13 | `/forgot-password` | forgot-password-desktop | bad | With SMTP unset, the 503 "not configured" reply shows as a generic "Failed to request password reset" toast | Show an inline, honest message that email reset is not set up | planned |
| 14 | `/dashboard` | dashboard-desktop, dashboard-mobile | blocker | Data Quality shows "100% Great data quality!" with no data | Show "--" and "No data yet" when there are no products | planned |
| 15 | `/dashboard` | dashboard-desktop | blocker | Market Strength shows "0/100 Room for improvement" with no comparisons | Show "--" and "No comparisons yet" | planned |
| 16 | `/dashboard` | dashboard-desktop | bad | Price Analysis shows a green "0.0% vs competitors" with no matches | Show "No matched products yet" when there are none | planned |
| 17 | `/dashboard` | dashboard-desktop | polish | Summary error state titles every card "Error" | Keep the real card titles in the error state | planned |
| 18 | `/dashboard` | — | bad | Anonymous visitors get a bare "Unauthorized" page instead of a redirect | `redirect('/login')` | planned |
| 19 | `/dashboard` | dashboard-mobile | polish | Onboarding banner text and link wrap awkwardly on mobile | Stack on small screens | planned |
| 20 | `/dashboard` | dashboard-desktop | polish | Pricing Trends shows Log/Filter/range controls while empty | left as is | left for later: the controls are harmless, and hiding them changes the chart component |
| 21 | `/insights` | insights-desktop, insights-mobile | blocker | Shows a hardcoded insight ("prices 12% below market", "competitors +8%") to a user with no data | Replace with an honest empty state that links to competitors | planned |
| 22 | `/settings` | settings-desktop | blocker | Billing tab is fabricated: Pro plan, Visa 4242, invoices. No billing exists | Remove the Billing tab and its navbar menu item | planned |
| 23 | `/settings` | settings-desktop | bad | Avatar falls back to `/placeholder-avatar.jpg`, which 404s | Use the initials fallback only | planned |
| 24 | `/settings` | settings-desktop | bad | "Change Avatar" uploads nothing and shows an "Avatar updated (mock)" toast | Remove the mock upload button; keep the Avatar URL field | planned |
| 25 | `/settings` | settings-mobile | polish | Tab list overflows at 390px | Let the tab list scroll horizontally | planned |
| 26 | `/settings` | — | polish | Theme and dev-mode storage keys still say `pricewhisperer-*` | Rename to `sagelytics-*` | planned |
| 27 | `/settings/data` | settings-data-mobile | polish | Tab list clips on mobile | Let the tab list scroll horizontally | planned |
| 28 | `/settings/data` | settings-data-desktop | polish | No issues beyond #27 | — | n/a |
| 29 | `/competitors` | competitors-desktop | bad | Subtitle says "across marketplaces" | "Monitor and analyze competitor websites" | planned |
| 30 | `/competitors` | competitors-desktop | bad | "Avg Match Score 0%" with no competitors | Show "--" when there are no competitors | planned |
| 31 | `/products` | products-mobile | polish | Header and actions wrap badly on mobile | Stack the header on small screens | planned |
| 32 | `/products` | products-desktop | polish | Empty states read correctly | — | n/a |
| 33 | `/monitoring` | monitoring-mobile | polish | Title and "Refresh All" crowd each other at 390px | Stack the header on small screens | planned |
| 34 | `/monitoring` | monitoring-desktop | polish | Empty states read correctly | — | n/a |
| 35 | `/onboarding` | onboarding-desktop, onboarding-mobile | polish | No problems found; the marketplace guard works | — | n/a |
| 36 | `/register` | register-desktop, register-mobile | polish | Only the logo issue (#11) | — | n/a |
| 37 | `/reset-password` | reset-password-desktop, reset-password-mobile | polish | Without a token it shows "Invalid reset link" with no brand header | left as is | left for later: low traffic, and the card already links back to login |
| 38 | `/missing-ui-pass` (404) | missing-ui-pass-desktop, missing-ui-pass-mobile | polish | 404 page logs `console.error` on every view and has no brand | Drop the console.error | planned |
| 39 | navbar | dashboard-desktop | polish | Bell button does nothing | Remove it until notifications have an inbox | planned |
| 40 | `/dashboard`, `/products` | dashboard-desktop | polish | Page metadata says "across marketplaces" | Reword | planned |
