# ₹ finsight — Personal Finance India

> **Financial Management Simplified!**
> A fully offline-capable, privacy-first personal finance manager built for Indian users.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Highlights](#key-highlights)
3. [Tech Stack](#tech-stack)
4. [File Structure](#file-structure)
5. [Getting Started](#getting-started)
6. [Feature Guide](#feature-guide)
   - [Dashboard](#dashboard)
   - [Bank Accounts](#bank-accounts)
   - [Credit Cards](#credit-cards)
   - [Cash](#cash)
   - [Loans](#loans)
   - [Investments](#investments)
   - [Scheduled Transactions](#scheduled-transactions)
   - [Unified Ledger](#unified-ledger)
   - [Calendar View](#calendar-view)
   - [Goals](#goals)
   - [Insights & FIRE Calculator](#insights--fire-calculator)
   - [Tax Estimator](#tax-estimator)
   - [Reports](#reports)
   - [Notes & Calculator](#notes--calculator)
7. [Data & Privacy](#data--privacy)
8. [Backup & Restore](#backup--restore)
9. [Security — PIN Lock](#security--pin-lock)
10. [PWA Installation](#pwa-installation)
11. [Themes & Appearance](#themes--appearance)
12. [Settings Reference](#settings-reference)
13. [Auto-Update Mechanism](#auto-update-mechanism)
14. [Developer Notes](#developer-notes)
15. [Versioning & Changelog](#versioning--changelog)
16. [Copyright & Licence](#copyright--licence)

---

## Overview

**finsight** is a single-file, zero-backend personal finance application built specifically for Indian users. Everything runs in the browser — no sign-up, no server, no cloud dependency. All financial data is stored exclusively in the browser's `localStorage`, which means your data never leaves your device.

The app covers the full personal finance spectrum: everyday transactions across bank accounts, credit cards, and cash; long-term investments in mutual funds, equities, fixed deposits, real estate, and provident funds; active loan tracking with EMI schedules; tax estimation under both the old and new Indian tax regimes; a FIRE (Financial Independence, Retire Early) calculator; and rich visual reports aligned to the Indian Financial Year (April–March).

| Attribute | Detail |
|---|---|
| **App name** | finsight — Personal Finance India |
| **Developer** | Vivek Hegde Hulimane |
| **Version** | 3.48.0 (31 March 2026) |
| **Platform** | Progressive Web App (PWA) · Offline-first · Single-file |
| **Target audience** | Indian individuals managing personal finances |
| **Data residency** | 100% on-device (browser localStorage) |

---

## Key Highlights

- **100% offline** — works without an internet connection after the first load
- **Zero accounts** — no sign-up, no login, no cloud account required
- **Privacy-first** — no analytics, no tracking, no telemetry of any kind
- **Indian-context aware** — Indian Financial Year (Apr–Mar), INR formatting, Indian payees & categories pre-loaded, Indian tax regime support (old vs new), live MF NAV & NSE/BSE stock prices
- **Installable PWA** — installs as a native-like app on Android, iOS, Windows, and macOS
- **Rich investment tracking** — Mutual Funds (live NAV via mfapi.in), Stocks (live prices), Fixed Deposits with compound interest, Real Estate, Goals, and Provident Funds (PPF, EPF, VPF, NPS, GPF)
- **XIRR calculation** — accurate annualised return computation for investment portfolios
- **17 themes** — dark, light, and coloured accent variants
- **Export everything** — JSON backup, Excel (.xlsx), PDF reports, HTML reports
- **Google Drive backup** — optional cloud backup to your own Drive
- **PIN lock** — optional 4-digit PIN with session unlock
- **Undo support** — 6-second undo toast for all destructive actions
- **Global search** — instant cross-account transaction search
- **Quick-Add FAB** — floating action button to add transactions from any screen
- **SMS parsing** — paste SMS text to auto-parse transaction details
- **URL hash routing** — every section is deep-linkable (e.g. `#/dashboard`, `#/inv_mf`)
- **Tab management** — show/hide any navigation tab to personalise the sidebar

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 18 (loaded via CDN, no build step) |
| JSX transpilation | Babel standalone (in-browser) |
| Spreadsheet export | SheetJS (xlsx) |
| Fonts | Google Fonts — Sora, DM Sans, DM Mono, Nunito |
| Offline support | Service Worker (Cache API) |
| Data storage | Browser `localStorage` |
| Live MF prices | [mfapi.in](https://mfapi.in) — free public API |
| Live share prices | Stooq.com via CORS proxy layers |
| PDF generation | Client-side HTML→PDF via browser print |
| Build tooling | None — vanilla HTML + JS, served as static files |

> **No Node.js, no npm, no build step required.** The app is a collection of static files served by any web server.

---

## File Structure

```
finsight/
├── index.html              # App shell, CSS, splash screen, SW registration
├── sw.js                   # Service Worker — offline caching strategy
├── manifest.json           # PWA manifest (icons, theme colour, display mode)
├── serve.sh                # Quick-start script for macOS/Linux
├── serve.bat               # Quick-start script for Windows
├── icons/
│   ├── icon-192.png        # PWA icon (Android home screen)
│   └── icon-512.png        # PWA icon (splash screen)
└── js/
    ├── app-utils.js         # Shared helpers — formatting, date utils, XIRR, crypto
    ├── app-state.js         # App state, reducer, localStorage persistence, INIT data
    ├── app-ui-base.js       # Base UI components — Modal, Card, Btn, Field, Icon, etc.
    ├── app-transactions.js  # Transaction management — add/edit/delete, split, SMS parse
    ├── app-dashboard.js     # Dashboard, global search, payee analytics, share summary
    ├── app-accounts.js      # Bank accounts and credit card sections
    ├── app-invest.js        # Investments — MF, Shares, FD, Real Estate, Goals, PF
    ├── app-loans.js         # Loans section — EMI tracker, amortisation
    ├── app-reports.js       # Reports — all chart and table views
    ├── app-settings.js      # Settings, calculator, notes, scheduled transactions
    ├── app-sections.js      # Calendar, unified ledger, goals, insights sections
    └── app-main.js          # Root App component, nav, tax estimator, info page
```

### Module responsibilities at a glance

| File | Responsibility |
|---|---|
| `app-state.js` | Single source of truth — `INIT()` default data, `reducer()`, `loadState()` / `saveState()` with localStorage, all `dispatch` action types |
| `app-ui-base.js` | Shared design system — `Modal`, `Card`, `Btn`, `Field`, `Icon` (70+ SVG icons), `TxModal`, `StatCard`, `SectionTab`, theme CSS variables |
| `app-transactions.js` | Per-account transaction lists, bulk operations, CSV/SMS import, reconciliation, split transactions, attachment support |
| `app-dashboard.js` | KPI widgets, net worth breakdown, payee analytics modal, share price summary, global search modal |
| `app-accounts.js` | Bank account cards (balance, transaction list, charts), credit card cards (limit, utilisation, billing cycle) |
| `app-invest.js` | Mutual fund tracker (live NAV), stock portfolio (live prices), FD calculator, real estate, financial goals, provident funds |
| `app-loans.js` | Loan cards (outstanding, EMI, rate), amortisation schedule, prepayment calculator |
| `app-reports.js` | 15+ report views — category breakdowns, cash flow, income vs expenses, net worth trend, investment portfolio, reconciliation, forecast |
| `app-sections.js` | Calendar heatmap, unified ledger (all-account view), goals progress tracker, insights / FIRE planner |
| `app-settings.js` | Appearance (17 themes), security (PIN), notifications, auto-categorise rules, file storage, cloud backup (Google Drive), account management, data export/restore |
| `app-main.js` | Root `<App>` component, sidebar nav, tab routing, tax estimator, info/copyright page, update banner, undo toast |

---

## Getting Started

### Prerequisites

- A modern browser (Chrome, Firefox, Safari, Edge — any version from 2022 onwards)
- Python 3 (for the included local dev server) **or** any static file server

### Running locally

**macOS / Linux:**
```bash
chmod +x serve.sh
./serve.sh
```

**Windows:**
```bat
serve.bat
```

Then open **http://localhost:8080** in your browser.

Alternatively, use any static server of your choice:
```bash
# Node.js
npx serve .

# Python 3
python3 -m http.server 8080

# VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

> **Important:** The app must be served over HTTP/HTTPS — it cannot be opened directly as a `file://` URL due to Service Worker and module restrictions.

### First launch

On first launch, finsight loads with **sample Indian data** — two bank accounts (HDFC, SBI), two credit cards, a cash wallet, sample mutual funds, stocks, FDs, real estate holdings, and loans. This lets you explore all features immediately.

To start fresh with your own data, go to **Settings → Data & Backup → Reset All Data**.

---

## Feature Guide

### Dashboard

The dashboard is the app's home screen and provides a real-time snapshot of your financial health.

**KPI Cards (top row):**
- **Net Worth** — total assets minus total liabilities, with a trend vs last month
- **Total Balance** — sum of all bank account and cash balances
- **Card Outstanding** — total credit card dues across all cards
- **Monthly Cash Flow** — net of income minus expenses for the current month

**Widgets (customisable):**
- Net Worth breakdown (banks, cash, investments, real estate, loans)
- Monthly income vs expense bar chart
- Category-wise spend pie chart
- Recent transactions list
- Top payees (ranked by spend)
- Loan EMI calendar
- Investment portfolio summary
- Goal progress bars

**Payee Analytics** — click any payee to open a detailed modal showing total spend, transaction count, average transaction, monthly sparklines, and a full transaction history for that payee.

**Global Search** — press the search icon (or use the keyboard shortcut) to search across all accounts, all transactions, investments, and loans simultaneously.

**Quick-Add FAB** — the `+` floating button in the bottom-right corner opens the transaction add modal, pre-selecting the most recently used account.

---

### Bank Accounts

Supports multiple bank account types: **Savings**, **Current**, **Salary**, and **NRE**.

Each account card shows:
- Current balance (live, updated with every transaction)
- Bank name, account type badge
- Transaction list with debit/credit indicators, categories, payees, status, and attachments
- Per-account income vs expense chart
- Balance trend sparkline

**Transactions:**
- Add with date, description, amount, type (credit/debit), category, sub-category, payee, status (pending/cleared/reconciled), and notes
- **Split transactions** — divide one transaction into multiple categories with individual amounts
- **SMS parse** — paste a bank SMS and the app extracts date, amount, and description automatically
- **Bulk delete** with multi-select
- **File attachments** — attach receipts or PDFs to individual transactions (stored as base64 in localStorage)
- **Transfers** — move money between any two accounts (bank↔bank, bank↔cash, bank↔card payment)

**Reconciliation** — mark transactions as Reconciled to track which entries have been verified against your official bank statement.

---

### Credit Cards

Tracks multiple credit cards with credit limit, outstanding balance, billing cycle day, and payment due day.

Each card displays:
- Credit utilisation bar (outstanding / limit)
- Available credit
- Billing cycle and payment due date
- Transaction list (purchases are debits; bill payments are credits)
- Monthly spend trend

Card transactions support all the same features as bank transactions (split, SMS parse, attachments, etc.).

---

### Cash

A single cash wallet tracking physical currency. Supports cash credits (ATM withdrawals, cash received) and debits (any cash payment). The balance updates automatically with every entry.

---

### Loans

Tracks all active loans with full amortisation detail.

**Supported loan types:** Home, Vehicle, Personal, Education, Business, Other.

Each loan card shows:
- Outstanding balance and principal
- EMI amount and interest rate (% p.a.)
- Loan tenure (start → end date)
- Progress bar (repayment percentage)
- Months remaining
- Total interest payable
- Amortisation schedule (monthly breakdown of principal vs interest)

**Prepayment calculator** — enter a lump-sum prepayment amount to see how it reduces tenure and total interest.

Loan EMI payments can be linked directly to bank/card transactions (dispatches a `LOAN_EMI_TX` action that updates outstanding balance automatically).

---

### Investments

The investments section is split into six sub-tabs:

#### Mutual Funds
- Add MF holdings with scheme code, units, average NAV, and invested amount
- **Live NAV fetch** — pulls current NAV from [mfapi.in](https://mfapi.in) (free, no API key required)
- Shows current value, absolute gain/loss, percentage return, and XIRR
- Scheme search by name or AMFI code
- Transaction history per fund (SIP entries with date, units, NAV)
- Per-fund notes (folio number, SIP date, nominee, etc.)

#### Shares / Stocks
- Add equity holdings with ticker symbol, quantity, buy price, and buy date
- **Live price fetch** — pulls NSE/BSE prices via Stooq through a CORS proxy
- Shows current value, unrealised P&L, percentage return, and XIRR per holding
- End-of-day price caching (prices stored in `eodPrices` and `eodNavs` localStorage keys)
- Portfolio summary card with total invested, current value, and overall return

#### Fixed Deposits
- Track FDs across multiple banks with principal, interest rate, start date, and maturity date
- **Compound interest calculator** — auto-computes maturity amount
- Shows days to maturity and interest earned so far
- Supports quarterly compounding (standard for Indian bank FDs)

#### Real Estate
- Log property holdings with acquisition cost, acquisition date, current estimated value, and notes
- Shows unrealised appreciation in absolute and percentage terms

#### Goals
- Create savings goals with target amount, target date, icon, and linked allocation
- Tracks amount allocated and amount remaining
- Shows goal completion percentage
- Goals can be linked to specific accounts or investment folios

#### Provident Funds
- Supports **PPF**, **EPF**, **VPF**, **NPS**, **GPF**, and Other
- Fields: account/UAN/PRAN number, holder name, employer name, current balance, annual employee and employer contributions, interest rate, account opening date, PPF maturity date
- Reference rates displayed in UI (PPF 7.1% Q1 FY25-26, EPF 8.25% FY2023-24)
- Per-account notes (UAN, PRAN, nominee, branch, linked bank)
- Stat row: total PF balance, total contributions, estimated interest earned

---

### Scheduled Transactions

Create recurring transaction templates for regular expenses and income:
- Salary credits, rent, SIP debits, EMIs, utility bills, subscriptions
- Set frequency (monthly, weekly, custom) and next-due date
- One-click "Post" to add the transaction to the target account
- Upcoming scheduled items appear on the Dashboard calendar widget

---

### Unified Ledger

A single chronological view of **all** transactions across all bank accounts, credit cards, and cash — in one filterable, sortable list.

**Filters:**
- Date range (with presets: This Month, 3 Months, 6 Months, This Year, Previous Year / Indian FY)
- Account
- Category and sub-category
- Transaction type (credit / debit / transfer)
- Reconciliation status
- Amount range
- Payee

**Bulk operations:** multi-select rows for bulk delete, bulk categorise, or bulk reconciliation status change.

Clicking any row jumps to that transaction in its source account, preserving scroll position.

---

### Calendar View

A month-grid calendar where each day shows:
- Net cash flow for that day (green = net positive, red = net negative)
- Dot density indicating transaction volume
- Click any day to expand a panel listing all transactions for that date

Navigate month by month. Filter by account. Summary row at the top shows total income and total expenses for the displayed month.

---

### Goals

*(See [Investments → Goals](#goals) above for the goals tracking UI.)*

The Goals section in the sidebar provides the standalone goals dashboard with progress cards, allocation controls, and timeline projections.

---

### Insights & FIRE Calculator

A configurable personal finance insights panel that computes:

**FIRE (Financial Independence, Retire Early):**
- Current age and target retirement age
- Estimated FIRE corpus required (based on current expenses and 4% withdrawal rate, or custom)
- Current net worth vs FIRE number — shows how close you are
- Years to FIRE at current savings rate
- Configurable: annual return assumption, withdrawal rate, expense source (auto-derived or manual)

**Other Insights:**
- Savings rate (income minus expenses as % of income)
- Discretionary spend percentage
- Emergency fund adequacy (months of expenses covered by liquid assets)
- Monthly budget vs actual for each category
- Spending leak detector (transactions below a configurable threshold that add up)
- Pay-yourself-first target (% of income saved before spending)
- Benchmark return comparison (portfolio XIRR vs a configurable market benchmark)

---

### Tax Estimator

An Indian income tax calculator supporting both regimes:

**Old Regime:**
- Standard deduction (₹50,000)
- Section 80C deductions (EPF, PPF, ELSS, LIC, home loan principal, NSC — up to ₹1.5L)
- Section 80D (health insurance premiums)
- HRA exemption
- Home loan interest (Section 24b — up to ₹2L)
- NPS additional deduction (Section 80CCD(1B) — up to ₹50,000)

**New Regime (FY 2024-25 onwards):**
- Revised slabs per Budget 2024
- Standard deduction of ₹75,000
- Rebate under Section 87A (up to ₹25,000 for income ≤ ₹7L)

Displays: gross income, total deductions, taxable income, tax before cess, education cess (4%), and net tax payable — with a side-by-side comparison of both regimes.

Tax data is persisted across sessions in the `taxData` state field.

---

### Reports

15+ report views, all filterable by date range with Indian FY presets:

| Report | Description |
|---|---|
| **Category Summary** | Spend per category for the selected period |
| **Monthly Breakdown** | Category spend across months in a grid |
| **Quarterly Breakdown** | Category spend across quarters |
| **Yearly Breakdown** | Category spend across years |
| **Cash Flow** | Month-by-month income, expense, and net flow |
| **Classification** | Income / Expense / Transfer / Investment totals |
| **Income vs Expenses** | Dual-bar chart comparison by month |
| **Account Summary** | Balance and transaction count per account |
| **Payees Report** | Top payees ranked by total spend |
| **Investment Portfolio** | Current value, invested amount, P&L, XIRR per asset |
| **Net Worth Trend** | Net worth over time (uses saved NW snapshots) |
| **Reconciliation Report** | Cleared vs uncleared transactions |
| **Forecast** | Projected spend and savings based on recent averages |
| **Budget vs Actual** | Configured budget targets vs real spend |
| **Loan Summary** | All loans with outstanding, EMI, rate, tenure |

All reports can be exported as **PDF** (via browser print), **Excel (.xlsx)**, or **HTML**.

---

### Notes & Calculator

**Notes** — a freeform sticky-note pad for financial memos, reminders, or calculations. Notes are saved to `localStorage`.

**Calculator** — a standard calculator widget accessible from the sidebar, useful while entering transactions.

---

## Data & Privacy

finsight is designed with a strict **data sovereignty** principle:

- **All data lives in `localStorage`** — no data is ever sent to any server by the application itself.
- **No analytics** — there are no Google Analytics, Mixpanel, Hotjar, Clarity, or any other tracking scripts.
- **No telemetry** — the app does not phone home.
- **No accounts** — there is no user registration, authentication server, or identity provider.
- **Cross-origin requests are limited** — the Service Worker explicitly allows only live-price API calls (mfapi.in, Stooq, Yahoo Finance CORS proxies) and Google Fonts to go cross-origin. These calls carry no personal data.

**localStorage keys used:**

| Key | Contents |
|---|---|
| `mm_state_v3` | All app data (accounts, transactions, investments, loans, settings) |
| `mm_eod_prices` | Cached end-of-day share prices |
| `mm_eod_navs` | Cached end-of-day mutual fund NAVs |
| `mm_theme` | Selected theme ID |
| `mm_pin_hash` | SHA-256 hash of your PIN (never the PIN itself) |
| `mm_tax_data` | Tax estimator inputs |

> **Storage warning:** The app monitors `localStorage` usage and displays a banner if you approach the browser's storage limit (typically 5–10 MB per origin). Regularly exporting JSON backups is recommended.

---

## Backup & Restore

### Export (Backup)

Go to **Settings → Data & Backup**.

| Format | Use case |
|---|---|
| **JSON** | Full backup — restores 100% of all data, including settings and theme |
| **Excel (.xlsx)** | Shareable transaction register; useful for accountants or external analysis |
| **PDF** | Printable financial summary report |
| **HTML** | Portable self-contained report for archiving |

JSON backups can optionally be **password-encrypted** (AES-256-GCM via the Web Crypto API). Encrypted backups prompt for a password on restore.

### Google Drive Backup

If you connect Google Drive (via the **File Storage** tab in Settings), the app can save JSON backups directly to a dedicated `finsight Backups` folder in your Drive. This provides automatic cloud redundancy without any third-party sync service.

### Restore

Choose a previously exported `.json` backup file from the **Restore Data** section. The app validates the file structure before overwriting any data. If the backup is encrypted, you will be prompted for the password.

> **Warning:** Restoring overwrites all current data. Always download a fresh backup before restoring.

### Reset

**Settings → Data & Backup → Reset All Data** wipes everything — all accounts, transactions, investments, settings, and PIN — returning the app to its factory default state with the sample data loaded.

---

## Security — PIN Lock

finsight supports an optional 4-digit PIN to prevent casual access.

- **Setup:** Settings → Security → Set PIN
- The PIN is stored as a **SHA-256 hash** in `localStorage` — the plain PIN is never stored
- Once set, the app displays a PIN entry screen on every page load (and after a configurable idle timeout)
- Session unlock: once the correct PIN is entered, the session remains unlocked until the tab is closed or the idle timeout expires
- **Forgot PIN:** Reset requires clearing `localStorage` (Settings → Reset All, or clearing site data from the browser's DevTools)

**Anti-embedding protection:** The app detects if it is being loaded inside an `<iframe>` and breaks out of the frame to prevent click-jacking or re-hosting.

---

## PWA Installation

finsight is a fully compliant Progressive Web App and can be installed as a native-like application.

### Android (Chrome)
1. Open the app URL in Chrome
2. Tap the **"Add to Home Screen"** prompt, or use the Chrome menu → **Install app**
3. The app installs with its own icon, splash screen, and runs in standalone mode (no browser chrome)

### iOS (Safari)
1. Open the app URL in Safari
2. Tap the **Share** button → **Add to Home Screen**
3. The app runs as a standalone web app with a black-translucent status bar

### Desktop (Chrome / Edge)
1. Open the app URL
2. Click the install icon in the address bar, or use the browser menu → **Install finsight**

Once installed, the app works **fully offline** — all JS, CSS, and fonts are pre-cached by the Service Worker on first load.

---

## Themes & Appearance

finsight ships with **17 built-in themes** selectable from **Settings → Appearance**:

| Category | Themes |
|---|---|
| Dark | Midnight Blue (default), Charcoal, Deep Ocean, Forest Night, Crimson Dark, Slate |
| Light | Clean Light, Warm Paper, Soft Mint |
| Accent variants | Electric Cyan, Violet Storm, Amber Glow, Rose Gold, Teal Breeze, Emerald, Cobalt, Sunset |

All themes use CSS custom properties (`var(--accent)`, `var(--bg)`, `var(--card)`, etc.) applied at the `:root` level, so the entire app repaints with a single variable change.

The app respects the system `prefers-color-scheme` for the PWA status bar (dark `#05080f` / light `#f0f7ff`).

---

## Settings Reference

| Tab | Features |
|---|---|
| **Appearance** | Theme picker (17 themes), font size |
| **Security** | PIN lock — set, change, remove; idle timeout |
| **Notifications** | In-app alerts for upcoming scheduled transactions and due FDs |
| **Auto-Categorise** | Rules engine — auto-assign categories to new transactions based on description keywords or payee name |
| **File Storage** | Google Drive integration for cloud backups |
| **Cloud Backup** | Manual and scheduled backup to Google Drive |
| **Bank Accounts** | Add, edit, delete bank accounts; view all accounts in a table |
| **Credit Cards** | Add, edit, delete credit cards; billing cycle and due date config |
| **Cash Account** | Edit opening cash balance |
| **Loan Accounts** | Add, edit, delete loans |
| **Investments** | Summary tables for MF, shares, FD, RE, PF; delete entries |
| **Categories** | Add, edit, delete categories and sub-categories; custom colours |
| **Payees** | Add, edit, delete payees (merchant/vendor names) |
| **Insights Config** | FIRE parameters — current age, retirement age, return assumptions, withdrawal rate, expense inputs |
| **Tab Management** | Show or hide any sidebar navigation tab |
| **Data & Backup** | JSON export, Excel export, PDF/HTML report export, restore from backup, reset all data |

---

## Auto-Update Mechanism

The app uses a **three-layer update detection system** to ensure users always run the latest version when online:

**Layer 1 — HTTP headers:** The `index.html` meta tags (`Cache-Control: no-cache, no-store, must-revalidate`) instruct browsers and proxies never to serve a stale HTML copy.

**Layer 2 — Service Worker:** The SW uses a network-first strategy for the HTML document and fires an update check on every page load, every tab focus, every `online` event, and every 10 minutes for long-running sessions.

**Layer 3 — Self-version fetch:** On load (and on tab focus / reconnect), the app fetches its own URL with `cache: 'reload'` and compares the `APP_VERSION` string in the response against the running version. If they differ, an **"Update available"** banner appears at the top of the screen.

Clicking the update banner sends a `SKIP_WAITING` message to the waiting Service Worker, which activates it immediately and triggers a page reload to load the new version.

---

## Developer Notes

### Adding a new section / tab

1. Add the tab ID to `VALID_TABS` in `app-state.js`
2. Add a nav entry to the `NAV` array and a colour to `NAV_COLORS` in `app-main.js`
3. Add a `NavIcon` case for the new tab's icon in `app-ui-base.js`
4. Add the tab's state field (if any) to `INIT()` and `EMPTY_STATE()` in `app-state.js`
5. Add reducer cases for any new actions
6. Create the section React component in the appropriate `app-*.js` file
7. Mount the component in `App()` in `app-main.js` with a `display: tab === "your_tab" ? "contents" : "none"` guard
8. Bump `CACHE_NAME` in `sw.js` and add the new JS file to `PRECACHE_URLS`

### State management

All state is managed by a single `useReducer` hook in `App()`. The reducer is defined in `app-state.js` and handles ~80+ action types. State is persisted to `localStorage` on every dispatch via a `useEffect` that calls `saveState(state)`.

### Performance

- React `memo` is used on all major section components to prevent unnecessary re-renders when an unrelated tab's state changes
- `useMemo` is used extensively for expensive computations (portfolio totals, category aggregations, report tables)
- `useDeferredValue` is used for search inputs to keep the UI responsive while filtering large transaction lists
- Section components are mounted once but hidden with `display: none` (not unmounted) to preserve scroll position and avoid re-renders on tab switch

### Extending investment APIs

Live prices are fetched in `app-invest.js`. To add a new price source:
- MF NAVs: the app calls `https://api.mfapi.in/mf/{schemeCode}` — no key required
- Shares: the app calls Stooq via one of several CORS proxy URLs (tried in sequence with fallback)
- Results are cached in `eodPrices` / `eodNavs` state with a timestamp; prices older than 4 hours trigger a re-fetch

---

## Versioning & Changelog

The app follows **semantic versioning** (`MAJOR.MINOR.PATCH`). The current version is embedded as `APP_VERSION` in `index.html` and displayed in **Settings → Info**.

The full changelog is available in `js/changelog.js` (lazy-loaded; not part of the initial bundle). It is displayed in the app under **Info → What's New**.

Selected recent versions:

| Version | Date | Highlight |
|---|---|---|
| 3.48.0 | 2026-03-31 | App rebranded from ArthaStack to **finsight** |
| 3.45.0 | 2026-03-30 | New **Provident Funds** tab (PPF, EPF, VPF, NPS, GPF) |
| 3.43.9 | 2026-03-30 | Fixed report table header rendering bug |
| 3.43.5 | 2026-03-29 | Unified selection signature system (accent borders, glow) |
| 3.41.0 | 2026-03-27 | Full SVG icon library refresh (70+ Lucide-inspired icons) |
| 3.39.0 | 2026-03-27 | All emoji replaced with minimalist SVG icons |
| 3.38.4 | 2026-03-26 | Previous Year (Indian FY) filter in Reports and Ledger |

---

## Copyright & Licence

```
© 2026 Vivek Hegde Hulimane. All Rights Reserved.
finsight — Personal Finance India
```

This application is made available for **personal, non-commercial use only**.

### Permitted
- Using the app to track and manage your own personal finances
- Installing the app on your personal devices as a PWA
- Taking personal backups of your own exported data (JSON / Excel)
- Referring to the app's design or features for personal learning, with clear attribution

### Prohibited
- Copying, cloning, re-hosting, or redistributing the application or any portion of its source code without the explicit written permission of the copyright holder
- Creating derivative works, modified versions, or forks and presenting them as your own
- Using the application or any portion of its code, design, or logic for commercial purposes (resale, SaaS, paid products) without a written commercial licence
- Reverse-engineering, decompiling, or extracting source code or financial algorithms for use in competing or third-party products
- Embedding, iframing, or re-hosting the application on any external domain without written authorisation

> Violation of these terms may result in civil and/or criminal liability under applicable copyright, intellectual property, and computer fraud laws.

---

*For queries or licensing enquiries, contact the developer: **Vivek Hegde Hulimane**.*
