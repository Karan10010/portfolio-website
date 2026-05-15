# 🖥️ Personal Portfolio Website
**Web Engineering Course Project** — Full-stack with Node.js, Express & SQLite

---

## 📁 File Structure

```
portfolio/
├── index.html       ← Single-page UI (all sections)
├── style.css        ← Complete responsive styles (dark mode)
├── app.js           ← Frontend JS: scroll, validation, Fetch API calls
├── server.js        ← Node.js/Express backend + SQLite database logic
├── package.json     ← Project dependencies
├── guestbook.db     ← SQLite database file (auto-created on first run)
└── README.md        ← This file
```

---

## ⚡ Quick Start

### 1. Install Node.js (if you haven't already)
Download from [https://nodejs.org](https://nodejs.org) — use the **LTS** version (v18+).

Verify it's installed:
```bash
node --version   # should print v18.x.x or higher
npm --version
```

### 2. Install Dependencies
Open a terminal inside the `portfolio/` folder and run:
```bash
npm install
```
This installs:
- `express` — web server framework
- `better-sqlite3` — fast, synchronous SQLite driver
- `cors` — allows the browser to call the API
- `nodemon` (dev) — auto-restarts server on file changes

### 3. Start the Server
```bash
npm start
# or for auto-reload during development:
npm run dev
```

You should see:
```
✓ SQLite database ready at .../guestbook.db
🚀  Portfolio server running!
   Open → http://localhost:3000
```

### 4. Open the Portfolio
Visit **http://localhost:3000** in your browser.

---

## 🗄️ Database Details

The SQLite database file `guestbook.db` is **created automatically** on first run.

**Table: `messages`**
| Column       | Type    | Description                  |
|--------------|---------|------------------------------|
| `id`         | INTEGER | Auto-increment primary key   |
| `name`       | TEXT    | Visitor's name (required)    |
| `email`      | TEXT    | Visitor's email (optional)   |
| `message`    | TEXT    | Message body (required)      |
| `created_at` | TEXT    | ISO timestamp (auto-set)     |

---

## 🔌 API Endpoints

| Method | Endpoint        | Description                        |
|--------|-----------------|------------------------------------|
| GET    | `/api/messages` | Returns all messages (newest first)|
| POST   | `/api/messages` | Creates a new message              |

### POST Body (JSON):
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "message": "Love this portfolio!"
}
```

### GET Response (JSON array):
```json
[
  {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "message": "Love this portfolio!",
    "created_at": "2025-05-14 10:32:00"
  }
]
```

---

## 🎨 Features

- **Dark-mode UI** with lime-green accent, dot-grid hero, and noise texture
- **Sticky nav** with mobile hamburger menu
- **Smooth scrolling** for all anchor links
- **Scroll-reveal animations** on section entry (IntersectionObserver)
- **Client-side form validation** (name ≥ 2 chars, valid email, message ≥ 5 chars)
- **Server-side validation** mirrors client rules
- **Live guestbook feed** — posts appear instantly after submission
- **No page reload** — all data via Fetch API

---

## 🛠️ Tech Stack

| Layer     | Technology                      |
|-----------|---------------------------------|
| Frontend  | HTML5, CSS3 (custom), Vanilla JS |
| Backend   | Node.js + Express.js            |
| Database  | SQLite via `better-sqlite3`     |
| Fonts     | DM Serif Display + DM Sans + DM Mono (Google Fonts) |

---

## 🐛 Troubleshooting

**"Cannot reach server" error on the page:**
- Make sure `node server.js` (or `npm start`) is running in a terminal.
- Check that port 3000 is free: `lsof -i :3000` (Mac/Linux).

**`npm install` fails on better-sqlite3:**
- Ensure you have Python and a C++ compiler (node-gyp requirement).
- On Windows: run `npm install --global windows-build-tools` first.
- On Mac: run `xcode-select --install` if prompted.

**Port already in use:**
```bash
# Change port — add this before `node server.js`:
PORT=4000 node server.js
# Then update API_BASE in app.js to 'http://localhost:4000'
```

---

*Built for Web Engineering course project.*
