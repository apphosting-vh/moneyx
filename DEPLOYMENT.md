# ₹ Money Manager — Deployment Guide
## GitHub Pages + PWABuilder Android APK

---

## Overview

This guide walks you through:
1. Setting up your repository
2. Generating app icons
3. Deploying to GitHub Pages
4. Building an Android APK with PWABuilder

---

## Step 1 — Prepare Your File Structure

Create a folder on your computer with this exact structure:

```
money-manager/
├── index.html          ← rename money-manager-v28.html to this
├── manifest.json
├── sw.js
├── generate_icons.py   ← optional, for icon generation
├── icons/
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png    ← also used as Apple touch icon
│   ├── icon-384.png
│   └── icon-512.png
└── screenshots/        ← optional but improves PWABuilder output
    ├── desktop.png     ← 1280×720 screenshot of the app
    └── mobile.png      ← 390×844 screenshot of the app
```

> **Important:** Rename `money-manager-v28.html` → `index.html`

---

## Step 2 — Generate Icons

You need a square PNG logo (at least 512×512 px) for your icons.

### Option A — Use the Python script (recommended)

```bash
pip install Pillow
python generate_icons.py your_logo.png
```

This creates the `icons/` folder with all 8 required sizes automatically.

### Option B — Use an online tool

Go to **https://www.pwabuilder.com/imageGenerator**
- Upload your 512×512 logo
- Download the zip and extract into your `icons/` folder

### Option C — Use any image editor

Create 8 copies of your logo resized to: `72, 96, 128, 144, 152, 192, 384, 512` px square.
Name them `icon-{size}.png` and place in the `icons/` folder.

> **Maskable icon tip:** For `icon-192.png` and `icon-512.png`, ensure your design
> has ~10% padding on all sides so it looks correct as an Android adaptive icon.
> Use **https://maskable.app/editor** to preview and adjust.

---

## Step 3 — Create a GitHub Repository

1. Go to **https://github.com** and sign in (or create a free account)
2. Click **New repository** (green button, top-right)
3. Set:
   - **Repository name:** `money-manager` (or any name you like)
   - **Visibility:** Public ← **required** for free GitHub Pages
   - Leave all other settings as default
4. Click **Create repository**

---

## Step 4 — Upload Files to GitHub

### Option A — Web upload (no Git required)

1. Open your new repository on GitHub
2. Click **Add file → Upload files**
3. Drag and drop ALL files and folders:
   - `index.html`
   - `manifest.json`
   - `sw.js`
   - The entire `icons/` folder
   - The `screenshots/` folder (optional)
4. Scroll down, add a commit message like `Initial deployment`
5. Click **Commit changes**

### Option B — Git command line

```bash
cd money-manager/
git init
git add .
git commit -m "Initial deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/money-manager.git
git push -u origin main
```

---

## Step 5 — Enable GitHub Pages

1. In your repository, click **Settings** (tab at the top)
2. In the left sidebar, click **Pages**
3. Under **Source**, select:
   - Branch: **main**
   - Folder: **/ (root)**
4. Click **Save**
5. Wait 1–3 minutes. GitHub will show a banner:
   > *"Your site is live at https://YOUR_USERNAME.github.io/money-manager/"*

6. **Test it:** Open that URL in Chrome on your phone or desktop.
   - You should see the app load fully
   - In Chrome on Android, you'll see an **"Add to Home Screen"** banner
   - On desktop Chrome, look for the install icon (⊕) in the address bar

> **Troubleshooting:**
> - If the page shows a 404, wait a few more minutes and hard-refresh
> - If the app loads but shows a blank screen, open DevTools → Console and check for errors
> - Ensure `index.html` is lowercase and in the root of the repository

---

## Step 6 — Verify PWA Compliance

Before building the APK, verify your PWA passes all checks:

1. Open your GitHub Pages URL in **Chrome on desktop**
2. Open DevTools (`F12`) → **Lighthouse** tab
3. Check **Progressive Web App** and click **Analyze page load**
4. Aim for all green checkmarks in the PWA section

Also check in DevTools → **Application** tab:
- **Manifest** — should show all icons and metadata loaded correctly
- **Service Workers** — should show `sw.js` as active
- **Cache Storage** — should show `mm-v1.8.6-shell`, `mm-v1.8.6-cdn`, etc.

---

## Step 7 — Build Android APK with PWABuilder

1. Go to **https://www.pwabuilder.com**
2. Enter your GitHub Pages URL:
   ```
   https://YOUR_USERNAME.github.io/money-manager/
   ```
3. Click **Start** and wait for the analysis to complete
4. You should see a score report. Address any warnings if shown.
5. Click **Package for stores**
6. Under **Android**, click **Generate Package**
7. Configure the Android options:

   | Field | Recommended Value |
   |-------|------------------|
   | Package ID | `com.yourname.moneymanager` |
   | App name | `Money Manager` |
   | App version | `1.8.6` |
   | Version code | `186` |
   | Display | `standalone` |
   | Status bar | `black-translucent` |
   | Nav bar color | `#05080f` |
   | Splash screen | `#05080f` |
   | Enable notifications | Yes (optional) |
   | Signing | Use PWABuilder's free signing (for testing) or provide your own keystore |

8. Click **Download Package**
9. You'll receive a `.zip` containing:
   - `app-release-signed.apk` — installable directly on Android (sideloading)
   - `app-release.aab` — Android App Bundle for Google Play Store submission
   - Signing key details

---

## Step 8 — Install the APK on Android

### Direct install (sideloading — for personal use / testing):

1. Transfer `app-release-signed.apk` to your Android phone
2. On your phone: **Settings → Security → Install unknown apps** → allow your file manager
3. Open the APK file and tap **Install**
4. The app will appear in your app drawer as **Money Manager**

### Google Play Store submission (optional):

1. Create a Google Play Developer account at **https://play.google.com/console** ($25 one-time fee)
2. Create a new app
3. Upload the `.aab` file (not the APK) in the **Production** or **Internal testing** track
4. Fill in store listing: title, description, screenshots, content rating
5. Submit for review (typically 1–3 days)

---

## Updating the App

When you release a new version:

1. Increment `CACHE_VERSION` in `sw.js`:
   ```js
   const CACHE_VERSION = 'mm-v1.8.7';  // bump this
   ```
2. Update `APP_VERSION` in `index.html` (already done in the app code)
3. Replace `index.html` and `sw.js` in your GitHub repository
4. GitHub Pages will auto-deploy within minutes
5. Existing installed users will get the update automatically the next time they open the app (the service worker updates in the background)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank screen on load | Check browser console for JS errors. Ensure all CDN scripts are reachable. |
| Service worker not registering | Must be served over HTTPS. GitHub Pages provides this automatically. |
| Icons not showing in PWABuilder | Verify `icons/` folder is uploaded and paths in `manifest.json` match exactly |
| APK crashes on launch | Ensure your GitHub Pages URL is publicly accessible and HTTPS |
| "Add to Home Screen" not appearing | Open in Chrome (not Firefox/Safari). Must pass PWA installability checks. |
| App data lost after update | Data is in `localStorage` under `mm_state_v8` — it persists across updates |
| PWABuilder score < 100 | Add `screenshots/` folder with desktop + mobile screenshots |

---

## File Reference

| File | Purpose |
|------|---------|
| `index.html` | The entire app (renamed from money-manager-v28.html) |
| `manifest.json` | PWA metadata — name, icons, theme, display mode |
| `sw.js` | Service worker — offline caching, background sync |
| `icons/icon-*.png` | App icons for all platforms and sizes |
| `screenshots/*.png` | Optional store screenshots for PWABuilder |
| `generate_icons.py` | Helper script to generate icons from a single source image |

---

*Money Manager v1.8.6 — Offline-first PWA for Personal Finance India*
