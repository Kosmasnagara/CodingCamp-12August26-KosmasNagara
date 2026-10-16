/**
 * Life Dashboard — app.js
 * ========================
 * Sections:
 *   1.  State & Storage helpers
 *   2.  Clock & Greeting
 *   3.  Focus Timer
 *   4.  To-Do List
 *   5.  Quick Links
 *   6.  Settings (name)
 *   7.  Theme (light / dark)
 *   8.  Modals
 *   9.  Toast
 *  10.  Init
 */

'use strict';

/* ────────────────────────────────────────────
   1. STATE & STORAGE HELPERS
──────────────────────────────────────────── */
const LS_KEYS = {
  tasks:      'dashboard_tasks',
  links:      'dashboard_links',
  theme:      'dashboard_theme',
  name:       'dashboard_name',
  workMin:    'dashboard_work_min',
  breakMin:   'dashboard_break_min',
};

function lsGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ────────────────────────────────────────────
   2. CLOCK & GREETING
──────────────────────────────────────────── */
function initClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const now  = new Date();
  const h    = String(now.getHours()).padStart(2, '0');
  const m    = String(now.getMinutes()).padStart(2, '0');
  const s    = String(now.getSeconds()).padStart(2, '0');

  document.getElementById('clock').textContent = `${h}:${m}:${s}`;

  document.getElementById('dateDisplay').textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  updateGreeting(now.getHours());
}

function updateGreeting(hour) {
  const el = document.getElementById('greetingText');
  let text;
  if      (hour >= 5  && hour < 12) text = 'Good morning! ☀️';
  else if (hour >= 12 && hour < 17) text = 'Good afternoon! 🌤️';
  else if (hour >= 17 && hour < 21) text = 'Good evening! 🌆';
  else                              text = 'Good night! 🌙';
  el.textContent = text;
}

function loadName() {
  const name = lsGet(LS_KEYS.name, 'Friend');
  document.getElementById('userName').textContent = name;
  document.getElementById('nameInput').value = name;
}

/* ────────────────────────────────────────────
   3. FOCUS TIMER
──────────────────────────────────────────── */
const CIRCUMFERENCE = 2 * Math.PI * 52; // 326.73

let timerState = {
  running:      false,
  isWork:       true,
  sessionCount: 1,
  remaining:    0,     // seconds
  total:        0,     // seconds (for progress ring)
  interval:     null,
};

function getWorkSeconds()  { return (parseInt(document.getElementById('workMinutes').value)  || 25) * 60; }
function getBreakSeconds() { return (parseInt(document.getElementById('breakMinutes').value) || 5)  * 60; }

function timerInit(resetSession = false) {
  if (resetSession) {
    timerState.isWork       = true;
    timerState.sessionCount = 1;
  }
  timerState.remaining = timerState.isWork ? getWorkSeconds() : getBreakSeconds();
  timerState.total     = timerState.remaining;
  timerRender();
}

function timerStart() {
  if (timerState.running) return;
  if (timerState.remaining <= 0) timerInit();
  timerState.running = true;
  timerState.interval = setInterval(timerTick, 1000);
  timerBtnSync();
}

function timerPause() {
  clearInterval(timerState.interval);
  timerState.running = false;
  timerBtnSync();
}

function timerReset() {
  timerPause();
  timerInit(true);
  timerBtnSync();
}

function timerTick() {
  timerState.remaining--;
  timerRender();
  if (timerState.remaining <= 0) timerComplete();
}

function timerComplete() {
  timerPause();
  const wasWork = timerState.isWork;
  timerState.isWork = !wasWork;
  if (!wasWork) timerState.sessionCount++;
  timerInit();
  showToast(wasWork ? '✅ Focus done! Take a break.' : '🍅 Break over! Back to work.');
  playBeep();
}

function timerRender() {
  const { remaining, total } = timerState;
  const min = String(Math.floor(remaining / 60)).padStart(2, '0');
  const sec = String(remaining % 60).padStart(2, '0');
  document.getElementById('timerDisplay').textContent = `${min}:${sec}`;

  // Ring progress
  const progress  = total > 0 ? remaining / total : 1;
  const offset    = CIRCUMFERENCE * (1 - progress);
  document.getElementById('timerProgress').style.strokeDashoffset = offset;

  // Session info
  document.getElementById('sessionCount').textContent = timerState.sessionCount;
  document.getElementById('sessionType').textContent  = timerState.isWork ? 'Work' : 'Break';
  document.getElementById('timerLabel').textContent   = timerState.isWork ? 'Focus Session' : 'Break Time';

  // Ring color: red when < 10% remaining
  const ring = document.getElementById('timerProgress');
  ring.style.stroke = progress < 0.1 ? '#ef4444' : '';
}

function timerBtnSync() {
  document.getElementById('timerStart').disabled = timerState.running;
  document.getElementById('timerPause').disabled = !timerState.running;
}

function playBeep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch {}
}

function initTimer() {
  // Restore saved durations
  const savedWork  = lsGet(LS_KEYS.workMin,  25);
  const savedBreak = lsGet(LS_KEYS.breakMin, 5);
  document.getElementById('workMinutes').value  = savedWork;
  document.getElementById('breakMinutes').value = savedBreak;

  timerInit(true);

  document.getElementById('timerStart').addEventListener('click', timerStart);
  document.getElementById('timerPause').addEventListener('click', timerPause);
  document.getElementById('timerReset').addEventListener('click', timerReset);

  // Save & re-init on duration change
  ['workMinutes', 'breakMinutes'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      lsSet(LS_KEYS.workMin,  parseInt(document.getElementById('workMinutes').value)  || 25);
      lsSet(LS_KEYS.breakMin, parseInt(document.getElementById('breakMinutes').value) || 5);
      if (!timerState.running) timerInit(true);
    });
  });
}

/* ────────────────────────────────────────────
   4. TO-DO LIST
──────────────────────────────────────────── */
let tasks        = [];
let currentFilter = 'all';
let editingId    = null;

function tasksLoad()  { tasks = lsGet(LS_KEYS.tasks, []); }
function tasksSave()  { lsSet(LS_KEYS.tasks, tasks); }
function genId()      { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function taskAdd(text) {
  text = text.trim();
  if (!text) return;
  tasks.unshift({ id: genId(), text, done: false, createdAt: Date.now() });
  tasksSave();
  todoRender();
  showToast('Task added!');
}

function taskToggle(id) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; tasksSave(); todoRender(); }
}

function taskDelete(id) {
  tasks = tasks.filter(t => t.id !== id);
  tasksSave();
  todoRender();
  showToast('Task deleted.');
}

function taskEdit(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  editingId = id;
  document.getElementById('editTaskInput').value = t.text;
  openModal('editTaskModal');
}

function taskSaveEdit() {
  const text = document.getElementById('editTaskInput').value.trim();
  if (!text || !editingId) return;
  const t = tasks.find(t => t.id === editingId);
  if (t) { t.text = text; tasksSave(); todoRender(); }
  editingId = null;
  closeModal('editTaskModal');
  showToast('Task updated!');
}

function clearDoneTasks() {
  tasks = tasks.filter(t => !t.done);
  tasksSave();
  todoRender();
  showToast('Done tasks cleared.');
}

function todoRender() {
  const list = document.getElementById('todoList');
  list.innerHTML = '';

  const filtered = tasks.filter(t => {
    if (currentFilter === 'active') return !t.done;
    if (currentFilter === 'done')   return  t.done;
    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = '<li class="todo-empty">Nothing here yet 🎉</li>';
  } else {
    filtered.forEach(t => list.appendChild(buildTaskEl(t)));
  }

  const remaining = tasks.filter(t => !t.done).length;
  document.getElementById('taskCount').textContent =
    `${remaining} task${remaining !== 1 ? 's' : ''} left`;
}

function buildTaskEl(task) {
  const li   = document.createElement('li');
  li.className = `todo-item${task.done ? ' done' : ''}`;
  li.dataset.id = task.id;

  // Checkbox
  const check = document.createElement('button');
  check.className = 'todo-item__check';
  check.setAttribute('aria-label', task.done ? 'Mark as not done' : 'Mark as done');
  check.setAttribute('title', task.done ? 'Mark as not done' : 'Mark as done');
  if (task.done) check.textContent = '✓';
  check.addEventListener('click', () => taskToggle(task.id));

  // Text
  const span = document.createElement('span');
  span.className = 'todo-item__text';
  span.textContent = task.text;

  // Actions
  const actions = document.createElement('div');
  actions.className = 'todo-item__actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'todo-item__btn';
  editBtn.setAttribute('aria-label', 'Edit task');
  editBtn.title = 'Edit';
  editBtn.textContent = '✏️';
  editBtn.addEventListener('click', () => taskEdit(task.id));

  const delBtn = document.createElement('button');
  delBtn.className = 'todo-item__btn todo-item__btn--delete';
  delBtn.setAttribute('aria-label', 'Delete task');
  delBtn.title = 'Delete';
  delBtn.textContent = '🗑';
  delBtn.addEventListener('click', () => taskDelete(task.id));

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  li.appendChild(check);
  li.appendChild(span);
  li.appendChild(actions);
  return li;
}

function initTodo() {
  tasksLoad();
  todoRender();

  // Add task form
  document.getElementById('todoForm').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('todoInput');
    taskAdd(input.value);
    input.value = '';
    input.focus();
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      todoRender();
    });
  });

  document.getElementById('clearDone').addEventListener('click', clearDoneTasks);
  document.getElementById('saveEditTask').addEventListener('click', taskSaveEdit);

  document.getElementById('editTaskInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') taskSaveEdit();
  });
}

/* ────────────────────────────────────────────
   5. QUICK LINKS
──────────────────────────────────────────── */
let links       = [];
let editingLinkId = null;

const DEFAULT_LINKS = [
  { id: 'l1', label: 'Google',   url: 'https://google.com',   emoji: '🔍' },
  { id: 'l2', label: 'YouTube',  url: 'https://youtube.com',  emoji: '▶️' },
  { id: 'l3', label: 'GitHub',   url: 'https://github.com',   emoji: '🐙' },
  { id: 'l4', label: 'Wikipedia',url: 'https://wikipedia.org',emoji: '📖' },
];

function linksLoad()  { links = lsGet(LS_KEYS.links, DEFAULT_LINKS); }
function linksSave()  { lsSet(LS_KEYS.links, links); }

function linkAdd(label, url, emoji) {
  label = label.trim();
  url   = url.trim();
  emoji = (emoji || '🌐').trim();
  if (!label || !url) return false;
  if (!url.startsWith('http')) url = 'https://' + url;
  links.push({ id: genId(), label, url, emoji });
  linksSave();
  linksRender();
  return true;
}

function linkDelete(id) {
  links = links.filter(l => l.id !== id);
  linksSave();
  linksRender();
  showToast('Link removed.');
}

function linkEdit(id) {
  const l = links.find(l => l.id === id);
  if (!l) return;
  editingLinkId = id;
  document.getElementById('linkLabel').value = l.label;
  document.getElementById('linkUrl').value   = l.url;
  document.getElementById('linkEmoji').value = l.emoji;
  document.getElementById('linkModalTitle').textContent = '✏️ Edit Link';
  openModal('linkModal');
}

function linkSave() {
  const label = document.getElementById('linkLabel').value.trim();
  const url   = document.getElementById('linkUrl').value.trim();
  const emoji = (document.getElementById('linkEmoji').value || '🌐').trim();

  if (!label || !url) { showToast('Please fill in label and URL.'); return; }

  let finalUrl = url;
  if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;

  if (editingLinkId) {
    const l = links.find(l => l.id === editingLinkId);
    if (l) { l.label = label; l.url = finalUrl; l.emoji = emoji; }
    editingLinkId = null;
  } else {
    links.push({ id: genId(), label, url: finalUrl, emoji });
  }

  linksSave();
  linksRender();
  closeModal('linkModal');
  showToast('Link saved!');
}

function linksRender() {
  const list  = document.getElementById('linksList');
  const empty = document.getElementById('linksEmpty');
  list.innerHTML = '';

  if (links.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  links.forEach(l => list.appendChild(buildLinkEl(l)));
}

function buildLinkEl(link) {
  const li = document.createElement('li');
  li.className  = 'link-item';
  li.setAttribute('role', 'listitem');

  // The anchor that actually navigates
  const anchor = document.createElement('a');
  anchor.href   = link.url;
  anchor.target = '_blank';
  anchor.rel    = 'noopener noreferrer';
  anchor.setAttribute('aria-label', `Open ${link.label}`);

  const emoji = document.createElement('span');
  emoji.className   = 'link-item__emoji';
  emoji.textContent = link.emoji || '🌐';

  const label = document.createElement('span');
  label.textContent = link.label;

  anchor.appendChild(emoji);
  anchor.appendChild(label);

  // Edit / Delete buttons
  const actions = document.createElement('div');
  actions.className = 'link-item__actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'link-item__btn';
  editBtn.title = 'Edit';
  editBtn.setAttribute('aria-label', `Edit ${link.label}`);
  editBtn.textContent = '✏️';
  editBtn.addEventListener('click', e => { e.stopPropagation(); linkEdit(link.id); });

  const delBtn = document.createElement('button');
  delBtn.className = 'link-item__btn link-item__btn--delete';
  delBtn.title = 'Remove';
  delBtn.setAttribute('aria-label', `Remove ${link.label}`);
  delBtn.textContent = '✕';
  delBtn.addEventListener('click', e => { e.stopPropagation(); linkDelete(link.id); });

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  li.appendChild(anchor);
  li.appendChild(actions);
  return li;
}

function initLinks() {
  linksLoad();
  linksRender();

  document.getElementById('addLinkBtn').addEventListener('click', () => {
    editingLinkId = null;
    document.getElementById('linkLabel').value = '';
    document.getElementById('linkUrl').value   = '';
    document.getElementById('linkEmoji').value = '';
    document.getElementById('linkModalTitle').textContent = '＋ Add Link';
    openModal('linkModal');
  });

  document.getElementById('saveLinkBtn').addEventListener('click', linkSave);
}

/* ────────────────────────────────────────────
   6. SETTINGS — NAME
──────────────────────────────────────────── */
function initSettings() {
  loadName();

  document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('nameInput').value = lsGet(LS_KEYS.name, 'Friend');
    openModal('settingsModal');
  });

  document.getElementById('saveName').addEventListener('click', () => {
    const name = document.getElementById('nameInput').value.trim() || 'Friend';
    lsSet(LS_KEYS.name, name);
    document.getElementById('userName').textContent = name;
    closeModal('settingsModal');
    showToast(`Welcome, ${name}!`);
  });

  document.getElementById('nameInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('saveName').click();
  });
}

/* ────────────────────────────────────────────
   7. THEME
──────────────────────────────────────────── */
function initTheme() {
  const saved = lsGet(LS_KEYS.theme, 'light');
  applyTheme(saved);

  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.dataset.theme;
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  lsSet(LS_KEYS.theme, theme);
  document.querySelector('.theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
}

/* ────────────────────────────────────────────
   8. MODALS
──────────────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = false;
  // Focus first input if any
  const first = el.querySelector('input, button');
  if (first) first.focus();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}

function initModals() {
  // Close buttons (data-close="modalId")
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  // Click overlay to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not([hidden])').forEach(m => closeModal(m.id));
    }
  });
}

/* ────────────────────────────────────────────
   9. TOAST
──────────────────────────────────────────── */
let toastTimer;
function showToast(msg, duration = 2400) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

/* ────────────────────────────────────────────
   10. INIT
──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initClock();
  initSettings();
  initTimer();
  initTodo();
  initLinks();
  initModals();
});
