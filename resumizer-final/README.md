# ⚡ Resumizer — AI Resume Optimizer

A Chrome side panel extension that reads any job posting and instantly analyzes your resume against it.  
Powered by Claude AI. No API key needed for users — 5 free analyses per day.

---

## 📁 Folder Structure

```
resumizer-final/
├── extension/          ← Chrome Extension (load this in Chrome)
│   ├── manifest.json
│   ├── sidepanel/
│   │   ├── sidepanel.html
│   │   └── sidepanel.js
│   ├── background/
│   │   └── background.js
│   ├── content/
│   │   └── content.js
│   └── icons/
└── backend/            ← Node.js server (deploy to Render)
    ├── server.js
    ├── package.json
    ├── render.yaml
    └── .env.example
```

---

## 🚀 Step 1 — Deploy the Backend to Render

> This is where your Anthropic API key lives. Users never see it.

1. Go to [render.com](https://render.com) and sign up (free)
2. Click **New → Web Service** and connect your GitHub repository
   - Push only the `/backend` folder to a GitHub repo, OR
   - Use the full repo with `/backend` as root directory
3. Configure your service:
   - **Name**: `resumizer-backend`
   - **Runtime**: Node.js
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `backend` (if using full repo)
4. In your Render service, go to **Environment** and add:
   ```
   ANTHROPIC_API_KEY = sk-ant-YOUR-KEY-HERE
   NODE_ENV = production
   ```
5. Render will build and deploy automatically.
6. Copy your URL — it looks like:  
   `https://resumizer-backend.onrender.com`

---

## 🔧 Step 2 — Connect Extension to Your Backend

Open `extension/background/background.js` and update line 4:

```js
// BEFORE
const BACKEND_URL = 'https://YOUR-APP.up.railway.app';

// AFTER (your actual Render URL)
const BACKEND_URL = 'https://resumizer-backend.onrender.com';
```

Save the file.

---

## 🧩 Step 3 — Load the Extension in Chrome

1. Open Chrome → go to `chrome://extensions/`
2. Toggle **Developer mode** ON (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. The ⚡ Resumizer icon appears in your toolbar

---

## ✅ Step 4 — First Use

1. Click the ⚡ icon in your Chrome toolbar → side panel opens
2. Upload your resume (PDF or TXT) — stored locally on your device
3. Navigate to any job posting (LinkedIn, Indeed, Glassdoor, etc.)
4. Click **Analyze My Resume**
5. Get your match score, missing keywords, AI suggestions, and a full optimized resume

---

## 🎯 Features

| Feature | Details |
|--------|---------|
| 🔍 Auto JD Detection | Reads job descriptions from LinkedIn, Indeed, Glassdoor, Lever, Greenhouse, Workday + more |
| 📊 Match Score | 0–100% ATS compatibility score with ring animation |
| 🟢 Keyword Analysis | Matched vs missing keywords, color-coded chips |
| ✏ AI Suggestions | Before/after bullet rewrites with one-click Apply |
| ⭐ Optimized Resume | Full resume rewritten for the role — copy or download |
| 🕐 History | Last 20 analyses saved locally |
| 📈 Stats | Total analyses, average score, daily usage |
| 🔒 Privacy | Resume stored in chrome.storage.local only |
| ⚡ Rate Limiting | 5 free analyses per IP per day |

---

## 🌐 Supported Job Sites

Works automatically on:
- LinkedIn
- Indeed  
- Glassdoor
- Lever
- Greenhouse
- Workday
- Ashby
- Wellfound / AngelList
- ZipRecruiter
- SimplyHired
- Any other job page (via manual paste fallback)

---

## 🔒 Privacy & Data

- **Resume** — stored in `chrome.storage.local` on your device only
- **Job description** — read from the page, sent to your backend for analysis, not stored
- **Analysis results** — stored locally in `chrome.storage.local`
- **No user accounts** — no sign-up required
- **Rate limiting** — enforced by IP on your backend

---

## 💰 Costs

| | Cost |
|--|--|
| Render Starter plan | ~$7/month (covers ~thousands of analyses) |
| Claude API | ~$0.003 per analysis (Sonnet 4) |
| 100 users × 5/day | ~$1.50/day in API costs |

---

## 🛠 Local Development

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
npm install
npm run dev
# Runs on http://localhost:3000

# Extension
# Change BACKEND_URL in background.js to http://localhost:3000
# Load unpacked in Chrome as above
```

---

## 📦 Sharing with Others

Once deployed:
1. Zip your `extension/` folder
2. Share it — users install via Load Unpacked
3. Or submit to the Chrome Web Store for public distribution

---

Built with ⚡ Claude AI + Express + Chrome Extensions MV3
