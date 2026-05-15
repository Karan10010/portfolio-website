// ============================================================
//  server.js — Portfolio Backend
//  Node.js + Express + SQLite (sql.js — pure JS, no C++ needed)
// ============================================================

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const initSqlJs = require('sql.js');

// ── Configuration ──────────────────────────────────────────
const PORT    = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'guestbook.db');

// ── Rate Limiter (no external package needed) ───────────────
// Allows max 5 POST requests per IP per 10 minutes
const rateLimitMap = new Map();
function rateLimit(req, res, next) {
  const ip  = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;  // 10 minutes
  const max = 5;

  const entry = rateLimitMap.get(ip) || { count: 0, start: now };

  if (now - entry.start > windowMs) {
    // Window expired — reset
    rateLimitMap.set(ip, { count: 1, start: now });
    return next();
  }

  if (entry.count >= max) {
    return res.status(429).json({ error: 'Too many messages. Please wait a few minutes.' });
  }

  entry.count++;
  rateLimitMap.set(ip, entry);
  next();
}

// Clean up old entries every 15 minutes to prevent memory leak
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [ip, entry] of rateLimitMap) {
    if (entry.start < cutoff) rateLimitMap.delete(ip);
  }
}, 15 * 60 * 1000);

// ── Database Setup ──────────────────────────────────────────
let db;   // will hold the sql.js Database instance

/** Save the in-memory DB to disk so data survives restarts */
function saveToDisk() {
  try {
    const data = db.export();          // Uint8Array
    fs.writeFileSync(DB_FILE, Buffer.from(data));
  } catch (err) {
    console.error('DB save error:', err.message);
  }
}

/** Boot: load from disk if file exists, otherwise create fresh */
async function initDB() {
  const SQL = await initSqlJs();       // load the WASM module

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
    console.log(`✓ Loaded existing database from ${DB_FILE}`);
  } else {
    db = new SQL.Database();
    console.log(`✓ Created new database at ${DB_FILE}`);
  }

  // Create table if it doesn't already exist
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      email      TEXT    DEFAULT '',
      message    TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
  `);

  saveToDisk();   // persist immediately so the file exists on disk
}

// ── Helper: run a SELECT and return rows as plain objects ───
function queryAll(sql, params = []) {
  const stmt   = db.prepare(sql);
  stmt.bind(params);
  const rows   = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// ── Express App ─────────────────────────────────────────────
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));   // serves index.html, style.css, app.js

// ── Routes ───────────────────────────────────────────────────

/**
 * GET /api/messages
 * Returns all messages ordered newest-first.
 */
app.get('/api/messages', (req, res) => {
  try {
    const rows = queryAll(
      'SELECT id, name, email, message, created_at FROM messages ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/messages error:', err.message);
    res.status(500).json({ error: 'Database error while fetching messages.' });
  }
});

/**
 * POST /api/messages
 * Saves a new visitor message.
 * Body: { name: string, email?: string, message: string }
 */
app.post('/api/messages', rateLimit, (req, res) => {
  try {
    const { name, email = '', message } = req.body;

    // ── Server-side Validation ──────────────────────────────
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }
    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return res.status(400).json({ error: 'Message must be at least 5 characters.' });
    }
    const emailVal = (email || '').trim();
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    // ── Insert ───────────────────────────────────────────────
    db.run(
      'INSERT INTO messages (name, email, message) VALUES (?, ?, ?)',
      [name.trim(), emailVal, message.trim()]
    );

    saveToDisk();   // persist after every write

    // Return the newly inserted row
    const rows = queryAll(
      'SELECT * FROM messages ORDER BY id DESC LIMIT 1'
    );

    res.status(201).json({ success: true, message: rows[0] });

  } catch (err) {
    console.error('POST /api/messages error:', err.message);
    res.status(500).json({ error: 'Database error while saving message.' });
  }
});

// Catch-all → serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Auto-open browser ────────────────────────────────────────
function openBrowser(url) {
  const { exec } = require('child_process');
  const cmd =
    process.platform === 'win32'  ? `start ""  "${url}"` :
    process.platform === 'darwin' ? `open      "${url}"` :
                                    `xdg-open  "${url}"`;
  exec(cmd, (err) => {
    if (err) console.log(`   Could not auto-open browser. Visit: ${url}`);
  });
}

// ── Boot ─────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n🚀  Portfolio server running!`);
    console.log(`   Open → ${url}\n`);
    openBrowser(url);
  });
}).catch(err => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});