/* ============================================================
   app.js — Frontend Logic
   ============================================================ */

const API_BASE = '';

// ────────────────────────────────────────────────────────────
// SCROLL TO TOP BUTTON
// ────────────────────────────────────────────────────────────
const scrollTopBtn = document.getElementById('scrollTopBtn');

window.addEventListener('scroll', () => {
  scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
});

scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ────────────────────────────────────────────────────────────
// 1. NAV — scrolled class + mobile toggle
// ────────────────────────────────────────────────────────────
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 30);
});

navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});

// Close mobile menu when a link is tapped
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// ────────────────────────────────────────────────────────────
// 2. SMOOTH SCROLL for all in-page anchors
// ────────────────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = document.getElementById('nav').offsetHeight;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - offset,
      behavior: 'smooth'
    });
  });
});

// ────────────────────────────────────────────────────────────
// 3. SCROLL-REVEAL — animate sections on entry
// ────────────────────────────────────────────────────────────
const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  }),
  { threshold: 0.12 }
);

// Add reveal class to key elements
const revealSelectors = [
  '.section-label', '.section-title', '.about-text p',
  '.about-stats', '.skill-card', '.project-item',
  '.guestbook-intro', '.form-wrap', '.messages-feed'
];

revealSelectors.forEach(sel => {
  document.querySelectorAll(sel).forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${i * 0.07}s`;
    revealObserver.observe(el);
  });
});

// ────────────────────────────────────────────────────────────
// 4. FORM VALIDATION + SUBMIT
// ────────────────────────────────────────────────────────────
const form        = document.getElementById('contactForm');
const nameInput   = document.getElementById('name');
const emailInput  = document.getElementById('email');
const msgInput    = document.getElementById('message');
const submitBtn   = document.getElementById('submitBtn');
const formSuccess = document.getElementById('formSuccess');
const formErrGlob = document.getElementById('formErrorGlobal');

/** Show an error message under a field */
function showError(inputEl, errorId, msg) {
  inputEl.classList.add('error');
  document.getElementById(errorId).textContent = msg;
}

/** Clear a single field's error */
function clearError(inputEl, errorId) {
  inputEl.classList.remove('error');
  document.getElementById(errorId).textContent = '';
}

// Live clear-on-type
[nameInput, emailInput, msgInput].forEach(input => {
  input.addEventListener('input', () => {
    clearError(input, input.id + 'Error');
    formSuccess.hidden = true;
    formErrGlob.hidden = true;
  });
});

/** Validate all fields; returns true if valid */
function validateForm() {
  let valid = true;

  const name = nameInput.value.trim();
  if (!name) {
    showError(nameInput, 'nameError', 'Name is required.');
    valid = false;
  } else if (name.length < 2) {
    showError(nameInput, 'nameError', 'Name must be at least 2 characters.');
    valid = false;
  }

  const email = emailInput.value.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError(emailInput, 'emailError', 'Please enter a valid email address.');
    valid = false;
  }

  const message = msgInput.value.trim();
  if (!message) {
    showError(msgInput, 'messageError', 'Message is required.');
    valid = false;
  } else if (message.length < 5) {
    showError(msgInput, 'messageError', 'Message must be at least 5 characters.');
    valid = false;
  }

  return valid;
}

/** Set the submit button loading state */
function setSubmitLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.querySelector('.btn-label').hidden = loading;
  submitBtn.querySelector('.btn-loading').hidden = !loading;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formSuccess.hidden = true;
  formErrGlob.hidden = true;

  if (!validateForm()) return;

  setSubmitLoading(true);

  try {
    const payload = {
      name:    nameInput.value.trim(),
      email:   emailInput.value.trim(),
      message: msgInput.value.trim()
    };

    const res = await fetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${res.status}`);
    }

    // Success
    form.reset();
    formSuccess.hidden = false;
    await loadMessages();          // refresh the feed immediately

  } catch (err) {
    console.error('Submit error:', err);
    formErrGlob.textContent =
      err.message.includes('fetch')
        ? 'Cannot reach server. Make sure server.js is running on port 3000.'
        : err.message;
    formErrGlob.hidden = false;
  } finally {
    setSubmitLoading(false);
  }
});

// ────────────────────────────────────────────────────────────
// 5. LOAD & DISPLAY MESSAGES
// ────────────────────────────────────────────────────────────
const messagesList = document.getElementById('messagesList');
const feedCount    = document.getElementById('feedCount');

/** Format an ISO timestamp to "May 14, 2025 · 3:42 PM" */
function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Escape HTML to prevent XSS */
function escHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

/** Build a message card DOM element */
function buildMessageCard(msg, delay = 0) {
  const card = document.createElement('div');
  card.className = 'message-card';
  card.style.animationDelay = `${delay}s`;
  card.innerHTML = `
    <div class="message-header">
      <span class="message-name">${escHtml(msg.name)}</span>
      <span class="message-time">${formatDate(msg.created_at)}</span>
    </div>
    ${msg.email ? `<div class="message-email">${escHtml(msg.email)}</div>` : ''}
    <p class="message-body">${escHtml(msg.message)}</p>
  `;
  return card;
}

async function loadMessages() {
  // Show loading state only on first load (when spinner is present)
  const isFirstLoad = !!document.getElementById('messagesLoading');

  if (!isFirstLoad) {
    // subsequent refresh: just clear and reload silently
    messagesList.innerHTML = '';
  }

  try {
    const res  = await fetch(`${API_BASE}/api/messages`);
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();

    messagesList.innerHTML = '';

    if (!data.length) {
      const empty = document.createElement('div');
      empty.className = 'messages-empty';
      empty.textContent = 'No messages yet. Be the first to sign the guestbook!';
      messagesList.appendChild(empty);
      feedCount.textContent = '0 messages';
      return;
    }

    feedCount.textContent = `${data.length} message${data.length !== 1 ? 's' : ''}`;
    data.forEach((msg, i) => {
      messagesList.appendChild(buildMessageCard(msg, i * 0.05));
    });

  } catch (err) {
    console.error('Load messages error:', err);
    messagesList.innerHTML = `
      <div class="messages-empty" style="color: var(--red); border-color: rgba(255,95,95,0.3);">
        Could not load messages.<br>
        <small style="opacity:0.7">Is the server running? Run: <code>node server.js</code></small>
      </div>`;
    feedCount.textContent = '—';
  }
}

// Initial load
loadMessages();
