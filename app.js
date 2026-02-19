const ROUTES = {
  LANDING: '#/',
  APP: '#/app'
};
const DEMO_MODE = new URLSearchParams(window.location.search).get('demo') === '1';
const MOBILE_BREAKPOINT = 768;
const ONBOARDING_STORAGE_KEY = "focusflow_onboarding_complete_v1";
const CUSTOMIZE_TIP_STORAGE_KEY = "focusflow_customize_tip_seen_v1";

const APPT_KEY = "focusflow_appts_widget_v1";

function apptLoad() {
  try {
    const raw = localStorage.getItem(APPT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (_e) {
    return [];
  }
}

function apptSave(list) {
  try {
    localStorage.setItem(APPT_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Appointment save failed", e);
  }
}

function apptSortValue(a) {
  const t = Date.parse(`${a.date}T${a.time}:00`);
  return Number.isFinite(t) ? t : 0;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function apptGetContainer() {
  return document.getElementById("appointments-root") || document.getElementById("section-appointments") || null;
}

function apptRender() {
  const root = apptGetContainer();
  if (!root) return;

  const list = apptLoad().slice().sort((a, b) => apptSortValue(a) - apptSortValue(b));

  const itemsHtml = list.length
    ? list.map((a) => {
        const when = `${escapeHtml(a.date)} ${escapeHtml(a.time)}`;
        const loc = a.location ? ` • ${escapeHtml(a.location)}` : "";
        const notes = a.notes ? `<div class="appt-meta">${escapeHtml(a.notes)}</div>` : "";
        return `
          <div class="appt-item">
            <div class="appt-left">
              <div class="appt-title">${escapeHtml(a.title)}</div>
              <div class="appt-when">${when}${loc}</div>
              ${notes}
            </div>
            <button type="button" class="appt-del" data-appt-del="${escapeHtml(a.id)}">Delete</button>
          </div>
        `;
      }).join("")
    : '<div class="appt-empty">No appointments yet.</div>';

  root.innerHTML = `
    <div class="appt-wrap">
      <div class="appt-head">
        <div class="appt-h1">Appointments</div>
        <div class="appt-sub">Add date, time, and location. Saved on this device.</div>
      </div>

      <form class="appt-form" id="appt-form">
        <div class="appt-row">
          <label class="appt-label">Title *</label>
          <input class="appt-input" name="title" type="text" required placeholder="e.g., Dentist" />
        </div>

        <div class="appt-grid">
          <div class="appt-row">
            <label class="appt-label">Date *</label>
            <input class="appt-input" name="date" type="date" required />
          </div>
          <div class="appt-row">
            <label class="appt-label">Time *</label>
            <input class="appt-input" name="time" type="time" required />
          </div>
        </div>

        <div class="appt-row">
          <label class="appt-label">Location</label>
          <input class="appt-input" name="location" type="text" placeholder="e.g., Main Office" />
        </div>

        <div class="appt-row">
          <label class="appt-label">Notes</label>
          <textarea class="appt-input" name="notes" placeholder="Optional"></textarea>
        </div>

        <button class="appt-submit" type="submit">Add Appointment</button>
      </form>

      <div class="appt-list">${itemsHtml}</div>
    </div>
  `;

  const form = root.querySelector('#appt-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const values = new FormData(form);
      const title = String(values.get('title') || '').trim();
      const date = String(values.get('date') || '').trim();
      const time = String(values.get('time') || '').trim();
      const location = String(values.get('location') || '').trim();
      const notes = String(values.get('notes') || '').trim();

      if (!title || !date || !time) {
        alert('Please enter Title, Date, and Time.');
        return;
      }

      const appts = apptLoad();
      appts.push({
        id: 'appt_' + Math.random().toString(36).slice(2) + '_' + Date.now(),
        title,
        date,
        time,
        location,
        notes,
        createdAt: Date.now()
      });

      appts.sort((a, b) => apptSortValue(a) - apptSortValue(b));
      apptSave(appts);

      try { form.reset(); } catch (_e) {}
      apptRender();
    });
  }

  if (!root.dataset.apptClickBound) {
    root.addEventListener('click', function (e) {
      const btn = e.target && e.target.closest ? e.target.closest('[data-appt-del]') : null;
      if (!btn) return;

      const id = btn.getAttribute('data-appt-del');
      const appts = apptLoad().filter((a) => a.id !== id);
      apptSave(appts);
      apptRender();
    });
    root.dataset.apptClickBound = '1';
  }
}

window.apptRender = apptRender;
window.__apptRender = apptRender;

// ---- Safari polyfills ----
if (!Element.prototype.closest) {
  Element.prototype.closest = function (s) {
    let el = this;
    if (!document.documentElement.contains(el)) return null;
    do {
      if (el.matches && el.matches(s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}
if (!Element.prototype.matches) {
  Element.prototype.matches =
    Element.prototype.msMatchesSelector ||
    Element.prototype.webkitMatchesSelector ||
    function (s) {
      const matches = (this.document || this.ownerDocument).querySelectorAll(s);
      let i = matches.length;
      while (--i >= 0 && matches.item(i) !== this) {}
      return i > -1;
    };
}

let landingPreviewMode = 'desktop';

function setLandingPreviewMode(mode) {
  if (mode !== 'desktop' && mode !== 'mobile') return;
  landingPreviewMode = mode;

  const wrap = document.getElementById('previewEmbedWrap');
  const pill = document.getElementById('previewModePill');
  const desktopBtn = document.getElementById('desktopPreviewModeBtn');
  const mobileBtn = document.getElementById('mobilePreviewModeBtn');

  if (wrap) wrap.classList.toggle('preview-mode-mobile', mode === 'mobile');
  if (pill) pill.textContent = mode === 'mobile' ? 'Mobile Preview' : 'Desktop Preview';
  if (desktopBtn) desktopBtn.setAttribute('aria-pressed', String(mode === 'desktop'));
  if (mobileBtn) mobileBtn.setAttribute('aria-pressed', String(mode === 'mobile'));
}

function setupLandingPreview() {
  const desktopBtn = document.getElementById('desktopPreviewModeBtn');
  const mobileBtn = document.getElementById('mobilePreviewModeBtn');
  const previewEmbed = document.getElementById('previewEmbed');
  if (!desktopBtn || !mobileBtn || !previewEmbed) return;

  previewEmbed.src = './index.html?demo=1#/app';
  desktopBtn.addEventListener('click', () => setLandingPreviewMode('desktop'));
  mobileBtn.addEventListener('click', () => setLandingPreviewMode('mobile'));
  setLandingPreviewMode('desktop');
}

function normalizedHash() {
  const hash = window.location.hash || '';
  if (hash === '' || hash === '#') return ROUTES.LANDING;
  return hash;
}

function sanitizedRouteHash() {
  const hash = normalizedHash();
  if (hash === ROUTES.LANDING || hash === ROUTES.APP) return hash;
  return ROUTES.APP;
}

function isLandingRoute() {
  return sanitizedRouteHash() !== ROUTES.APP;
}

function enterApp() {
  try {
    sessionStorage.setItem('focusflow-mobile-entered-app', '1');
  } catch (_) {}
  window.location.hash = ROUTES.APP;
}

function goToLanding() {
  window.location.hash = ROUTES.LANDING;
}

function shouldForceMobileLanding() {
  if (DEMO_MODE) return false;
  if (!window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches) return false;
  if (normalizedHash() !== ROUTES.APP) return false;

  try {
    return sessionStorage.getItem('focusflow-mobile-entered-app') !== '1';
  } catch (_) {
    return true;
  }
}

function scrollToPreview(event) {
  if (event) event.preventDefault();
  document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateRouteView() {
  const landing = document.getElementById('landingRoot');
  const app = document.getElementById('appRoot');
  const inLanding = isLandingRoute() && !DEMO_MODE;
  if (landing) landing.style.display = inLanding ? 'block' : 'none';
  if (app) app.style.display = inLanding ? 'none' : 'block';
}

function setupDemoModeGuards() {
  if (!DEMO_MODE) return;
  document.body.classList.add('demo-mode');

  const pill = document.createElement('div');
  pill.className = 'demo-mode-pill';
  pill.textContent = "Preview Mode";
  document.body.appendChild(pill);

  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;
    event.preventDefault();
  }, true);
}

// ==================== SAFE STORAGE ====================
const memoryStore = {};

const STORAGE = {
  available: (() => {
    try {
      const key = '__agenda_storage_test__';
      localStorage.setItem(key, '1');
      localStorage.removeItem(key);
      return true;
    } catch (_) {
      return false;
    }
  })(),
  getItem(key) {
    if (this.available) return localStorage.getItem(key);
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
  },
  setItem(key, value) {
    if (DEMO_MODE) return;
    if (this.available) {
      localStorage.setItem(key, value);
      return;
    }
    memoryStore[key] = value;
  },
  removeItem(key) {
    if (DEMO_MODE) return;
    if (this.available) {
      localStorage.removeItem(key);
      return;
    }
    delete memoryStore[key];
  },
  clear() {
    if (DEMO_MODE) return;
    if (this.available) {
      localStorage.clear();
      return;
    }
    for (const key of Object.keys(memoryStore)) delete memoryStore[key];
  }
};

function readJSON(key, fallback) {
  try {
    const raw = STORAGE.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

// ==================== DATA STORE ====================
const DB = {
  tasks: readJSON('agenda_tasks', []),
  schedule: readJSON('agenda_schedule', []),
  scheduleSettings: readJSON('agenda_scheduleSettings', { dayStyle: 'letter', dayCount: 2 }),
  notes: readJSON('agenda_notes', []),
  links: readJSON('agenda_links', []),
  uploads: readJSON('agenda_uploads', []),
  focusSessions: readJSON('agenda_focusSessions', []),
  pomodoroSettings: readJSON('agenda_pomodoroSettings', { focusMinutes: 25, breakMinutes: 5 }),
  syncMetadata: readJSON('agenda_syncMetadata', { provider: 'local-only', lastSyncedAt: null, cloudSyncEnabled: false }),
  points: parseInt(STORAGE.getItem('agenda_points') || '0', 10) || 0,
  save(key) { if (DEMO_MODE) return; STORAGE.setItem('agenda_' + key, JSON.stringify(this[key])); },
  savePoints() { if (DEMO_MODE) return; STORAGE.setItem('agenda_points', String(this.points)); }
};

// Default links if empty
if (DB.links.length === 0) {
  DB.links = [
    { id: Date.now(), name: 'Google Classroom', url: 'https://classroom.google.com', icon: 'graduation', category: 'school', order: 0 },
    { id: Date.now()+1, name: 'Gmail', url: 'https://mail.google.com', icon: 'mail', category: 'communication', order: 1 },
    { id: Date.now()+2, name: 'Infinite Campus', url: 'https://websterny.infinitecampus.org/campus/portal/students/webster.jsp', icon: 'chart', category: 'school', order: 2 },
    { id: Date.now()+3, name: 'Wayground', url: 'https://wayground.com/', icon: 'map', category: 'study', order: 3 },
  ];
  DB.save('links');
}

// ==================== CONFIRM DIALOG ====================
let pendingConfirmAction = null;

function showConfirm(title, msg, btnLabel, action, icon) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmBtn').textContent = btnLabel || 'Delete';
  document.getElementById('confirmIcon').textContent = icon || '⚠️';
  pendingConfirmAction = action;
  document.getElementById('confirmOverlay').classList.add('active');
}

function dismissConfirm() {
  document.getElementById('confirmOverlay').classList.remove('active');
  pendingConfirmAction = null;
}

function executeConfirm() {
  if (pendingConfirmAction) pendingConfirmAction();
  dismissConfirm();
}

let currentFilter = 'all';
let currentSubjectFilter = null;
let currentDay = 'A';
let editingNoteId = null;
let editingTaskId = null;
let pomodoroInterval = null;
let pomodoroTimeLeft = 25 * 60;
let pomodoroRunning = false;
let pomodoroMode = 'focus';
let audioCtx = null;
let noiseNode = null;
let noiseGain = null;
let rainDropInterval = null;
let hasRequestedNotificationPermission = false;
let hasPrimedAudio = false;
let fallbackAlarmClip = null;

const SUBJECT_COLORS = {
  'Math':    { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  'English': { bg: '#fce7f3', text: '#9d174d', border: '#ec4899' },
  'Science': { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
  'History': { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  'Spanish': { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
  'Art':     { bg: '#ede9fe', text: '#5b21b6', border: '#8b5cf6' },
  'PE':      { bg: '#ffedd5', text: '#9a3412', border: '#f97316' },
  'Music':   { bg: '#e0e7ff', text: '#3730a3', border: '#6366f1' },
  'Tech':    { bg: '#ccfbf1', text: '#115e59', border: '#14b8a6' },
  'Other':   { bg: '#f1f5f9', text: '#475569', border: '#94a3b8' },
};

function getSubjectColor(subject) {
  return SUBJECT_COLORS[subject] || SUBJECT_COLORS['Other'];
}

const ICON_SVG = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5"/></svg>',
  'check-square': '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
  analytics: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16"/><path d="M7 15l3-3 3 2 4-5"/><circle cx="7" cy="15" r="1"/><circle cx="10" cy="12" r="1"/><circle cx="13" cy="14" r="1"/><circle cx="17" cy="9" r="1"/></svg>',
  note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l5 5v13H6z"/><path d="M15 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14l-1.5 1.5a3.5 3.5 0 01-5-5L7 7a3.5 3.5 0 015 5L10.5 13"/><path d="M14 10l1.5-1.5a3.5 3.5 0 015 5L17 17a3.5 3.5 0 01-5-5l1.5-1.5"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1 2.3 2.5.7 2-1.5 2 3.4-1.8 1.7.3 2.6 2.2 1.5-2 3.4-2.4-.9-2.2 1.5-.4 2.5h-4l-.4-2.5-2.2-1.5-2.4.9-2-3.4 2.2-1.5.3-2.6L2.5 7.9l2-3.4 2 1.5 2.5-.7z"/><circle cx="12" cy="12" r="3"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4.5-1L19 8.5 15.5 5 5 15.5z"/><path d="M13.5 6.5l3 3"/></svg>',
  file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l5 5v13H6z"/><path d="M15 3v5h5"/></svg>',
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h4l1.4-2h5.2L16 8h4v12H4z"/><circle cx="12" cy="14" r="3.5"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3a8.5 8.5 0 108 11.5A9 9 0 0114 3z"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0114 0"/></svg>',
  graduation: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l9-4 9 4-9 4z"/><path d="M7 11v4c0 1.5 2.2 3 5 3s5-1.5 5-3v-4"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h6a3 3 0 013 3v13H8a3 3 0 00-3 3z"/><path d="M19 4h-6a3 3 0 00-3 3v13h6a3 3 0 013 3z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16"/><path d="M7 16v-5M12 16V8M17 16v-8"/></svg>',
  map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  laptop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 18h18"/></svg>',
  gamepad: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10h10a4 4 0 013.7 5.5l-1 2.3a2.5 2.5 0 01-3.4 1.2L13 17H11l-3.3 2a2.5 2.5 0 01-3.4-1.2l-1-2.3A4 4 0 017 10z"/><path d="M8 13h3M9.5 11.5v3"/><circle cx="15.5" cy="12.5" r="1"/><circle cx="17.5" cy="14.5" r="1"/></svg>',
  bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a4 4 0 00-4 4v2.5c0 .9-.3 1.8-.9 2.5L5.5 15h13l-1.6-2c-.6-.7-.9-1.6-.9-2.5V8a4 4 0 00-4-4z"/><path d="M10 18a2 2 0 004 0"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};

function icon(name) {
  return ICON_SVG[name] || ICON_SVG.link;
}

function normalizeLinkIcon(rawIcon) {
  const map = {
    '🔗': 'link', '🎓': 'graduation', '📚': 'book', '✉️': 'mail',
    '📊': 'chart', '🗺️': 'map', '💻': 'laptop', '🎮': 'gamepad'
  };
  const normalized = String(rawIcon || '').trim().replace(/\uFE0F/g, '');
  return map[normalized] || normalized || 'link';
}


function setTaskStep(step) {
  const safeStep = Math.min(Math.max(parseInt(step, 10) || 1, 1), 3);
  document.querySelectorAll('.task-step-dot').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.taskStep, 10) === safeStep);
  });
  document.querySelectorAll('.task-step-pane').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.taskPane, 10) === safeStep);
  });
}

function setTaskSubject(subject) {
  const field = document.getElementById('taskSubject');
  if (!field) return;
  field.value = subject;
  setTaskStep(2);
}

function selectTaskPriority(priority) {
  const safePriority = ['high', 'medium', 'low'].includes(priority) ? priority : 'medium';
  const select = document.getElementById('taskPriority');
  if (select) select.value = safePriority;
  document.querySelectorAll('.priority-option-chip').forEach(chip => {
    const selected = chip.dataset.priority === safePriority;
    chip.classList.toggle('selected', selected);
    chip.setAttribute('aria-checked', selected ? 'true' : 'false');
    const radio = chip.querySelector('input[type="radio"]');
    if (radio) radio.checked = selected;
  });
}

function syncTaskDueDates(sourceId) {
  const homeworkDue = document.getElementById('homeworkDue');
  const taskDue = document.getElementById('taskDue');
  if (!homeworkDue || !taskDue) return;
  if (sourceId === 'homeworkDue' && homeworkDue.value && !taskDue.value) taskDue.value = homeworkDue.value;
  if (sourceId === 'taskDue' && taskDue.value && !homeworkDue.value) homeworkDue.value = taskDue.value;
}

function initializeTaskFormControls() {
  document.querySelectorAll('.priority-option-chip').forEach(chip => {
    chip.addEventListener('click', () => selectTaskPriority(chip.dataset.priority || 'medium'));
    chip.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        selectTaskPriority(chip.dataset.priority || 'medium');
      }
    });
  });

  const homeworkDue = document.getElementById('homeworkDue');
  const taskDue = document.getElementById('taskDue');
  if (homeworkDue) homeworkDue.addEventListener('change', () => syncTaskDueDates('homeworkDue'));
  if (taskDue) taskDue.addEventListener('change', () => syncTaskDueDates('taskDue'));
}

function applyScheduleTemplate() {
  if (DB.schedule.length > 0) {
    showConfirm('Replace Existing Schedule?', 'This will add an editable sample schedule. Continue?', 'Use Template', () => seedScheduleTemplate());
    return;
  }
  seedScheduleTemplate();
}

function seedScheduleTemplate() {
  const labels = getScheduleDayLabels();
  const classes = [
    { period: '1', className: 'Algebra', start: '08:00', end: '08:45', room: '201', teacher: 'Ms. Lee' },
    { period: '2', className: 'English', start: '08:50', end: '09:35', room: '114', teacher: 'Mr. Hall' },
    { period: '3', className: 'Science', start: '09:40', end: '10:25', room: '310', teacher: 'Dr. Singh' }
  ];
  DB.schedule = labels.flatMap(day => classes.map((c, i) => ({ ...c, id: Date.now() + Math.floor(Math.random()*1000) + i, day })));
  DB.save('schedule');
  renderSchedule();
}

let onboardingStep = 1;
function renderOnboardingStep() {
  const steps = document.querySelectorAll('.onboarding-step');
  steps.forEach((el, idx) => el.classList.toggle('active', idx + 1 === onboardingStep));
  const progress = document.getElementById('onboardingProgress');
  if (progress) progress.textContent = `Step ${onboardingStep} of ${steps.length}`;
  const nextBtn = document.getElementById('onboardingNextBtn');
  if (nextBtn) nextBtn.textContent = onboardingStep >= steps.length ? 'Start using FocusFlex' : 'Next';
  const backBtn = document.getElementById('onboardingBackBtn');
  if (backBtn) backBtn.disabled = onboardingStep === 1;
}

function advanceOnboarding(direction) {
  const total = document.querySelectorAll('.onboarding-step').length;
  if (direction > 0 && onboardingStep === total) {
    STORAGE.setItem(ONBOARDING_STORAGE_KEY, 'true');
    document.getElementById('onboardingOverlay')?.classList.remove('active');
    return;
  }
  onboardingStep = Math.min(Math.max(onboardingStep + direction, 1), total);
  renderOnboardingStep();
}

function maybeShowOnboarding() {
  if (DEMO_MODE) return;
  if (STORAGE.getItem(ONBOARDING_STORAGE_KEY) === 'true') return;
  if (normalizedHash() !== ROUTES.APP) return;
  onboardingStep = 1;
  renderOnboardingStep();
  document.getElementById('onboardingOverlay')?.classList.add('active');
  document.getElementById('onboardingCard')?.focus();
}

function maybeShowCustomizeTip() {
  if (STORAGE.getItem(CUSTOMIZE_TIP_STORAGE_KEY) === 'true') return;
  const tip = document.getElementById('customizeFirstTip');
  if (!tip) return;
  tip.style.display = 'block';
}

// ==================== TASKS ====================
function toggleTaskForm() {
  const f = document.getElementById('taskForm');
  if (f.style.display !== 'none') {
    f.style.display = 'none';
    editingTaskId = null;
    document.getElementById('taskFormTitle').textContent = 'Add Task';
    document.getElementById('taskFormSaveBtn').textContent = 'Save Task';
  } else {
    f.style.display = 'block';
    setTaskStep(1);
    selectTaskPriority(document.getElementById('taskPriority')?.value || 'medium');
    syncTaskDueDates('taskDue');
  }
}

function editTask(id) {
  const t = DB.tasks.find(x => x.id === id);
  if (!t) return;
  editingTaskId = id;
  document.getElementById('taskTitle').value = t.title;
  document.getElementById('taskSubject').value = t.subject || '';
  document.getElementById('taskPriority').value = t.priority || 'medium';
  document.getElementById('taskDue').value = t.due || '';
  document.getElementById('homeworkDue').value = t.due || '';
  document.getElementById('taskAssignedDate').value = t.assignedDate || '';
  document.getElementById('taskNotes').value = t.notes || '';
  document.getElementById('taskFormTitle').textContent = 'Edit Task';
  document.getElementById('taskFormSaveBtn').textContent = 'Update Task';
  document.getElementById('taskForm').style.display = 'block';
  selectTaskPriority((t.priority || 'medium').toLowerCase());
  document.getElementById('taskTitle').focus();
}

function addTask() {
  let title = document.getElementById('taskTitle').value.trim();
  const naturalText = document.getElementById('taskNaturalInput').value.trim();
  const dueInput = document.getElementById('taskDue');
  const homeworkDueInput = document.getElementById('homeworkDue');
  const priorityInput = document.getElementById('taskPriority');
  let due = dueInput.value || homeworkDueInput.value;
  let priority = (priorityInput.value || 'medium').toLowerCase();

  if (!title && naturalText) {
    parseNaturalTaskInput();
    title = document.getElementById('taskTitle').value.trim();
    due = dueInput.value || homeworkDueInput.value;
    priority = (priorityInput.value || 'medium').toLowerCase();
  }

  if (!title) return alert('Please enter a task title');
  if (!due) return alert('Please select a due date');
  if (!priority) priority = 'medium';
  if (!['high', 'medium', 'low'].includes(priority)) priority = 'medium';

  if (editingTaskId) {
    const t = DB.tasks.find(x => x.id === editingTaskId);
    if (t) {
      t.title = title;
      t.subject = document.getElementById('taskSubject').value;
      t.priority = priority;
      t.due = due;
      t.assignedDate = document.getElementById('taskAssignedDate').value;
      t.notes = document.getElementById('taskNotes').value;
    }
    editingTaskId = null;
    document.getElementById('taskFormTitle').textContent = 'Add Task';
    document.getElementById('taskFormSaveBtn').textContent = 'Save Task';
  } else {
    const task = {
      id: Date.now(),
      title,
      subject: document.getElementById('taskSubject').value,
      priority,
      due,
      assignedDate: document.getElementById('taskAssignedDate').value,
      notes: document.getElementById('taskNotes').value,
      completed: false,
      createdAt: new Date().toISOString()
    };
    DB.tasks.unshift(task);
  }

  DB.save('tasks');
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskSubject').value = '';
  document.getElementById('taskPriority').value = 'medium';
  selectTaskPriority('medium');
  document.getElementById('taskDue').valueAsDate = new Date(Date.now() + 86400000);
  document.getElementById('homeworkDue').valueAsDate = new Date(Date.now() + 86400000);
  document.getElementById('taskAssignedDate').value = '';
  document.getElementById('taskNotes').value = '';
  document.getElementById('taskNaturalInput').value = '';
  document.getElementById('taskAssignedDate').valueAsDate = new Date();
  setTaskStep(1);
  toggleTaskForm();
  renderTasks();
  updateDashboard();
  updateAnalytics();
}

function toggleTask(id) {
  const t = DB.tasks.find(x => x.id === id);
  if (t) { t.completed = !t.completed; t.completedAt = t.completed ? new Date().toISOString() : null; }
  DB.save('tasks');
  renderTasks();
  updateDashboard();
  updateAnalytics();
}

function deleteTask(id) {
  const task = DB.tasks.find(x => x.id === id);
  const name = task ? task.title : 'this task';
  showConfirm('Delete Task?', 'Are you sure you want to delete "' + name + '"? This cannot be undone.', 'Delete', () => {
    DB.tasks = DB.tasks.filter(x => x.id !== id);
    DB.save('tasks');
    renderTasks();
    updateDashboard();
    updateAnalytics();
  });
}

function filterTasks(filter, el) {
  currentFilter = filter;
  currentSubjectFilter = null;
  document.querySelectorAll('.filter-bar .filter-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderTasks();
}

function filterBySubject(subject, el) {
  if (currentSubjectFilter === subject) {
    currentSubjectFilter = null;
    el.classList.remove('active');
  } else {
    currentSubjectFilter = subject;
    document.querySelectorAll('#subjectFilters .filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
  }
  renderTasks();
}

function renderSubjectFilters() {
  const subjects = [...new Set(DB.tasks.map(t => t.subject).filter(Boolean))];
  const container = document.getElementById('subjectFilters');
  if (subjects.length === 0) { container.innerHTML = ''; container.style.display = 'none'; return; }
  container.style.display = 'flex';
  container.innerHTML = subjects.map(s => {
    const sc = getSubjectColor(s);
    const isActive = currentSubjectFilter === s;
    return `<button class="filter-chip ${isActive ? 'active' : ''}" 
      style="${isActive ? 'background:' + sc.border + ';color:white;border-color:' + sc.border : 'border-color:' + sc.border + ';color:' + sc.text}"
      onclick="filterBySubject('${s}', this)">
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${isActive ? 'white' : sc.border};margin-right:4px;"></span>${s}
    </button>`;
  }).join('');
}

function renderTasks() {
  const list = document.getElementById('taskList');
  const today = new Date().toISOString().split('T')[0];
  let tasks = [...DB.tasks];

  if (currentFilter === 'open') tasks = tasks.filter(t => !t.completed);
  else if (currentFilter === 'completed') tasks = tasks.filter(t => t.completed);
  else if (currentFilter === 'overdue') tasks = tasks.filter(t => !t.completed && t.due && t.due < today);

  if (currentSubjectFilter) tasks = tasks.filter(t => t.subject === currentSubjectFilter);

  const query = (document.getElementById('taskSearch')?.value || '').trim().toLowerCase();
  if (query) {
    tasks = tasks.filter(t => (`${t.title} ${t.subject || ''} ${t.notes || ''}`).toLowerCase().includes(query));
  }

  const open = DB.tasks.filter(t => !t.completed).length;
  const done = DB.tasks.filter(t => t.completed).length;
  const overdue = DB.tasks.filter(t => !t.completed && t.due && t.due < today).length;
  document.getElementById('statOpen').textContent = open;
  document.getElementById('statDone').textContent = done;
  document.getElementById('statOverdue').textContent = overdue;

  renderSubjectFilters();

  if (tasks.length === 0) {
    list.innerHTML = '<div class="empty-msg">No tasks yet. Click "+ Add Task" to get started!</div>';
    return;
  }

  list.innerHTML = tasks.map(t => {
    const priority = ['high', 'medium', 'low'].includes((t.priority || '').toLowerCase()) ? t.priority.toLowerCase() : 'medium';
    const isOverdue = !t.completed && t.due && t.due < today;
    const assignedDateStr = t.assignedDate ? new Date(t.assignedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const dueStr = t.due ? new Date(t.due + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const dueMeta = dueStr ? 'Due: ' + dueStr + (isOverdue ? ' (overdue)' : '') : 'No due date';
    const sc = getSubjectColor(t.subject);
    const borderColor = t.subject ? sc.border : 'var(--lux-border)';
    const subjectBadge = t.subject ? `<span class="subject-badge" style="background:${sc.bg};color:${sc.text};">${t.subject}</span>` : '';
    const completionLabel = t.completed ? 'Mark task as not completed' : 'Mark task as completed';

    return `<div class="task-item ${t.completed ? 'completed' : ''}" style="border-left-color:${borderColor};">
      <button class="task-checkbox ${t.completed ? 'checked' : ''}" onclick="toggleTask(${t.id})" aria-label="${completionLabel}" title="${completionLabel}"></button>
      <div class="task-body">
        <div class="task-title"><span class="priority-dot priority-${priority}"></span>${t.title}</div>
        <div class="task-meta">
          ${subjectBadge}
          ${assignedDateStr ? '<span><span class="ui-icon" aria-hidden="true">' + icon('calendar') + '</span> Assigned: ' + assignedDateStr + '</span>' : ''}
          <span${isOverdue ? ' style="color:var(--lux-danger);font-weight:700"' : ''}><span class="ui-icon" aria-hidden="true">${icon('calendar')}</span> ${dueMeta}</span>
          <span class="priority-label priority-${priority}">${priority.charAt(0).toUpperCase() + priority.slice(1)}</span>
          ${t.notes ? '<span><span class="ui-icon" aria-hidden="true">' + icon('note') + '</span> ' + t.notes + '</span>' : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="edit-btn" onclick="editTask(${t.id})" title="Edit task" aria-label="Edit ${t.title}"><span class="ui-icon" aria-hidden="true">${icon('edit')}</span><span>Edit</span></button>
        <button class="danger-btn" onclick="deleteTask(${t.id})" title="Delete task" aria-label="Delete ${t.title}"><span class="ui-icon" aria-hidden="true">${icon('close')}</span><span>Delete</span></button>
      </div>
    </div>`;
  }).join('');
}

function parseNaturalTaskInput() {
  const input = document.getElementById('taskNaturalInput');
  const raw = (input.value || '').trim();
  if (!raw) return alert('Type a natural-language task first.');

  const parsed = parseTaskFromNaturalLanguage(raw);
  document.getElementById('taskTitle').value = parsed.title;
  document.getElementById('taskSubject').value = parsed.subject;
  document.getElementById('taskPriority').value = parsed.priority;
  document.getElementById('taskDue').value = parsed.due;
  document.getElementById('homeworkDue').value = parsed.due;
  document.getElementById('taskAssignedDate').valueAsDate = new Date();
  document.getElementById('taskNotes').value = parsed.notes;
}

function parseTaskFromNaturalLanguage(text) {
  const lower = text.toLowerCase();
  const subjects = ['Math', 'English', 'Science', 'History', 'Spanish', 'Art', 'PE', 'Music', 'Tech'];
  const foundSubject = subjects.find(s => lower.includes(s.toLowerCase())) || '';

  let dueDate = '';
  const now = new Date();
  const dayMap = { sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6 };
  const dayMatch = lower.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (dayMatch) {
    const target = dayMap[dayMatch[1]];
    const d = new Date(now);
    let delta = (target - d.getDay() + 7) % 7;
    if (delta === 0) delta = 7;
    d.setDate(d.getDate() + delta);
    dueDate = d.toISOString().split('T')[0];
  }

  const priority = /\burgent|asap|important|exam\b/.test(lower) ? 'high' : (/\bquick|easy|later\b/.test(lower) ? 'low' : 'medium');
  const cleaned = text
    .replace(/\bdue\b.*$/i, '')
    .replace(/\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/i, '')
    .replace(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const notes = dueDate && /\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/i.test(lower)
    ? 'Time noted in original entry'
    : '';

  return {
    title: cleaned || text,
    subject: foundSubject,
    priority,
    due: dueDate,
    notes
  };
}

function formatSeconds(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return m + ':' + s;
}

function setPomodoroDisplay() {
  document.getElementById('pomodoroTimer').textContent = formatSeconds(pomodoroTimeLeft);
  document.getElementById('pomodoroMode').textContent = pomodoroMode === 'focus' ? 'Focus Session' : 'Break Session';
  document.getElementById('pomodoroStartBtn').textContent = pomodoroRunning ? 'Pause' : 'Start';
}

function resetPomodoro() {
  clearInterval(pomodoroInterval);
  pomodoroRunning = false;
  pomodoroMode = 'focus';
  const focusMinutes = parseInt(document.getElementById('focusMinutes').value || DB.pomodoroSettings.focusMinutes, 10);
  pomodoroTimeLeft = Math.max(1, focusMinutes) * 60;
  setPomodoroDisplay();
}

function completeFocusSession(secondsWorked) {
  const today = new Date().toISOString().split('T')[0];
  DB.focusSessions.unshift({ id: Date.now(), date: today, seconds: secondsWorked });
  DB.focusSessions = DB.focusSessions.slice(0, 600);
  DB.points += 10;
  DB.save('focusSessions');
  DB.savePoints();
  updateFocusStats();
  updateDashboard();
  updateAnalytics();
}

function togglePomodoro() {
  if (pomodoroRunning) {
    pomodoroRunning = false;
    clearInterval(pomodoroInterval);
    setPomodoroDisplay();
    return;
  }

  const selectedNoise = document.getElementById('noiseSelect')?.value;
  if (selectedNoise && !noiseNode) {
    playNoise();
  }

  const focusMinutes = Math.max(1, parseInt(document.getElementById('focusMinutes').value || '25', 10));
  const breakMinutes = Math.max(1, parseInt(document.getElementById('breakMinutes').value || '5', 10));
  requestNotificationPermission();
  DB.pomodoroSettings.focusMinutes = focusMinutes;
  DB.pomodoroSettings.breakMinutes = breakMinutes;
  DB.save('pomodoroSettings');

  if (!pomodoroTimeLeft || pomodoroTimeLeft < 1) {
    pomodoroTimeLeft = (pomodoroMode === 'focus' ? focusMinutes : breakMinutes) * 60;
  }

  pomodoroRunning = true;
  setPomodoroDisplay();

  pomodoroInterval = setInterval(() => {
    pomodoroTimeLeft -= 1;
    if (pomodoroTimeLeft <= 0) {
      clearInterval(pomodoroInterval);
      pomodoroRunning = false;
      if (pomodoroMode === 'focus') {
        completeFocusSession(focusMinutes * 60);
        handlePomodoroPhaseChange('focus');
        pomodoroMode = 'break';
        pomodoroTimeLeft = breakMinutes * 60;
      } else {
        handlePomodoroPhaseChange('break');
        pomodoroMode = 'focus';
        pomodoroTimeLeft = focusMinutes * 60;
      }
      setPomodoroDisplay();
      return;
    }
    setPomodoroDisplay();
  }, 1000);
}

function createNoiseBuffer(color, seconds = 2) {
  const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * seconds, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (color === 'brown') {
      lastOut = (lastOut + (0.02 * white)) / 1.02;
      data[i] = lastOut * 3.5;
    } else if (color === 'pink') {
      data[i] = (0.7 * lastOut) + (0.3 * white);
      lastOut = data[i];
    } else if (color === 'rain') {
      const rumble = (Math.sin(i / 250) + Math.sin(i / 500)) * 0.05;
      data[i] = (white * 0.2) + rumble;
    } else {
      data[i] = white * 0.6;
    }
  }
  return buffer;
}

function requestNotificationPermission() {
  if (hasRequestedNotificationPermission || !('Notification' in window)) return;
  hasRequestedNotificationPermission = true;
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

function showPomodoroCompletionPopup(completedMode) {
  const message = completedMode === 'focus'
    ? 'Focus session complete. Time for a break.'
    : 'Break complete. Time to focus again.';

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('FocusFlex', { body: message });
  }

  setTimeout(() => {
    alert(message);
  }, 100);
}

function setFocusAlarmStatus(message, level = '') {
  const statusEl = document.getElementById('focusAlarmStatus');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `focus-status${level ? ` ${level}` : ''}`;
}

async function primeAudio(reason = 'manual') {
  try {
    const ctx = ensureAudioContext();
    const silentGain = ctx.createGain();
    const osc = ctx.createOscillator();
    silentGain.gain.value = 0.00001;
    osc.connect(silentGain).connect(ctx.destination);
    const t = ctx.currentTime;
    osc.start(t);
    osc.stop(t + 0.02);
    hasPrimedAudio = true;
    if (reason === 'manual') {
      setFocusAlarmStatus('Audio primed. Alarm playback should now be more reliable.', 'good');
    }
    return true;
  } catch (_) {
    setFocusAlarmStatus('Audio priming was blocked. Tap or click again, then retry Test Alarm.', 'warn');
    return false;
  }
}

function primeAudioOnFirstInteraction() {
  if (hasPrimedAudio) return;
  const oncePrime = () => {
    primeAudio('auto').finally(() => {
      document.removeEventListener('pointerdown', oncePrime);
      document.removeEventListener('keydown', oncePrime);
    });
  };
  document.addEventListener('pointerdown', oncePrime, { once: true });
  document.addEventListener('keydown', oncePrime, { once: true });
}

function getFallbackAlarmClip() {
  if (!fallbackAlarmClip) {
    fallbackAlarmClip = new Audio('data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTAAAAAAgICAgICAgICAgICAf39/f39/f39/f39/gICAgICAgICAgICAgH9/f39/f39/f39/f4CAgICAgICAgICAgIB/f39/f39/f39/f3+AgICAgICAgICAgICA');
    fallbackAlarmClip.preload = 'auto';
  }
  return fallbackAlarmClip;
}

function handlePomodoroPhaseChange(completedMode) {
  playAlarmTone();
  showPomodoroCompletionPopup(completedMode);
}

function playRainDrop() {
  if (!audioCtx || !noiseGain) return;
  const drop = audioCtx.createOscillator();
  const dropGain = audioCtx.createGain();
  const start = audioCtx.currentTime;
  drop.type = 'triangle';
  drop.frequency.setValueAtTime(850 + (Math.random() * 500), start);
  drop.frequency.exponentialRampToValueAtTime(420, start + 0.08);
  dropGain.gain.setValueAtTime(0.0001, start);
  dropGain.gain.exponentialRampToValueAtTime(0.035, start + 0.01);
  dropGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.1);
  drop.connect(dropGain).connect(noiseGain);
  drop.start(start);
  drop.stop(start + 0.11);
}

function ensureAudioContext() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playAlarmTone() {
  try {
    const ctx = ensureAudioContext();
    if (ctx.state !== 'running') throw new Error('AudioContext not running');
    const start = ctx.currentTime + 0.02;
    const notes = [880, 660, 880];

    notes.forEach((freq, i) => {
      const t = start + (i * 0.22);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });

    setFocusAlarmStatus('Alarm played through Web Audio.', 'good');
    return Promise.resolve(true);
  } catch (_) {
    const clip = getFallbackAlarmClip();
    clip.currentTime = 0;
    return clip.play()
      .then(() => {
        setFocusAlarmStatus('Alarm played using fallback audio clip.', 'warn');
        return true;
      })
      .catch(() => {
        setFocusAlarmStatus('Alarm playback was blocked by browser policy. Use Test Alarm again after interacting with the page.', 'bad');
        return false;
      });
  }
}

function testAlarmFlow() {
  requestNotificationPermission();
  primeAudio().finally(() => {
    handlePomodoroPhaseChange('focus');
  });
}

function stopNoise(clearSelection = true) {
  if (rainDropInterval) {
    clearInterval(rainDropInterval);
    rainDropInterval = null;
  }
  if (noiseNode) {
    try { noiseNode.stop(); } catch (_) {}
    noiseNode.disconnect();
    noiseNode = null;
  }
  if (noiseGain) {
    noiseGain.disconnect();
    noiseGain = null;
  }
  const noiseSelect = document.getElementById('noiseSelect');
  if (clearSelection && noiseSelect) noiseSelect.value = '';
}

function playNoise() {
  const color = document.getElementById('noiseSelect').value;
  stopNoise(false);
  if (!color) return;

  ensureAudioContext();
  noiseNode = audioCtx.createBufferSource();
  noiseNode.buffer = createNoiseBuffer(color, 2);
  noiseNode.loop = true;
  noiseGain = audioCtx.createGain();
  noiseGain.gain.value = color === 'rain' ? 0.06 : 0.08;
  noiseNode.connect(noiseGain).connect(audioCtx.destination);
  noiseNode.start();

  if (color === 'rain') {
    rainDropInterval = setInterval(() => {
      const drops = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < drops; i++) playRainDrop();
    }, 280 + Math.floor(Math.random() * 220));
  }
}

function getAudioDebugStatus() {
  return {
    hasAudioContext: !!audioCtx,
    audioContextState: audioCtx ? audioCtx.state : 'none',
    hasPrimedAudio,
    whiteNoiseActive: !!noiseNode,
    selectedNoise: document.getElementById('noiseSelect')?.value || ''
  };
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function updateFocusStats() {
  const today = todayKey();
  const focusTodayCount = DB.focusSessions.filter(s => s.date === today).length;
  const sevenDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    sevenDays.push(d.toISOString().split('T')[0]);
  }
  const weekSeconds = DB.focusSessions
    .filter(s => sevenDays.includes(s.date))
    .reduce((sum, s) => sum + s.seconds, 0);

  const weekMins = Math.round(weekSeconds / 60);
  const avgMins = Math.round(weekMins / 7);

  const elToday = document.getElementById('focusToday');
  if (elToday) elToday.textContent = String(focusTodayCount);
  const elWeek = document.getElementById('focusMinutesWeek');
  if (elWeek) elWeek.textContent = weekMins + ' mins';
  const elAvg = document.getElementById('focusAvgDay');
  if (elAvg) elAvg.textContent = avgMins + ' mins';
}

function getScheduleDayLabels() {
  const maxDays = ['1', '2', '3', '4', '5'];
  const maxLetters = ['A', 'B', 'C', 'D', 'E'];
  const style = DB.scheduleSettings.dayStyle === 'number' ? 'number' : 'letter';
  const rawCount = parseInt(DB.scheduleSettings.dayCount, 10);
  const count = Number.isFinite(rawCount) ? Math.min(Math.max(rawCount, 2), 5) : 2;
  const source = style === 'number' ? maxDays : maxLetters;
  return source.slice(0, count);
}

function normalizeScheduleDay(day) {
  const labels = getScheduleDayLabels();
  if (labels.includes(day)) return day;
  return labels[0] || 'A';
}

function dayDisplayLabel(day) {
  return 'Day ' + day;
}

function renderScheduleTabs() {
  const dayTabs = document.getElementById('dayTabs');
  if (!dayTabs) return;

  const labels = getScheduleDayLabels();
  currentDay = normalizeScheduleDay(currentDay);

  dayTabs.innerHTML = labels.map(day => {
    const active = day === currentDay ? ' active' : '';
    return `<button class="section-tab${active}" onclick="switchDay('${day}', this)">${dayDisplayLabel(day)}</button>`;
  }).join('');
}

function updateScheduleSettings() {
  const styleSelect = document.getElementById('scheduleDayStyle');
  const countSelect = document.getElementById('scheduleDayCount');
  if (!styleSelect || !countSelect) return;

  DB.scheduleSettings.dayStyle = styleSelect.value === 'number' ? 'number' : 'letter';
  DB.scheduleSettings.dayCount = Math.min(Math.max(parseInt(countSelect.value, 10) || 2, 2), 5);
  DB.save('scheduleSettings');

  currentDay = normalizeScheduleDay(currentDay);
  renderScheduleTabs();
  renderSchedule();
}

function initializeScheduleSettingsUI() {
  const styleSelect = document.getElementById('scheduleDayStyle');
  const countSelect = document.getElementById('scheduleDayCount');
  if (!styleSelect || !countSelect) return;

  styleSelect.value = DB.scheduleSettings.dayStyle === 'number' ? 'number' : 'letter';
  const rawCount = parseInt(DB.scheduleSettings.dayCount, 10);
  countSelect.value = String(Number.isFinite(rawCount) ? Math.min(Math.max(rawCount, 2), 5) : 2);

  renderScheduleTabs();
}

// ==================== SCHEDULE ====================
function toggleScheduleForm() {
  const f = document.getElementById('scheduleForm');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

function addScheduleBlock() {
  const cls = document.getElementById('schedClass').value.trim();
  if (!cls) return alert('Please enter a class name');
  const block = {
    id: Date.now(),
    period: document.getElementById('schedPeriod').value,
    className: cls,
    start: document.getElementById('schedStart').value,
    end: document.getElementById('schedEnd').value,
    room: document.getElementById('schedRoom').value,
    teacher: document.getElementById('schedTeacher').value,
    day: currentDay
  };
  DB.schedule.push(block);
  DB.save('schedule');
  document.getElementById('schedPeriod').value = '';
  document.getElementById('schedClass').value = '';
  document.getElementById('schedStart').value = '';
  document.getElementById('schedEnd').value = '';
  document.getElementById('schedRoom').value = '';
  document.getElementById('schedTeacher').value = '';
  toggleScheduleForm();
  renderSchedule();
}

function deleteScheduleBlock(id) {
  const block = DB.schedule.find(x => x.id === id);
  const name = block ? block.className : 'this period';
  showConfirm('Delete Period?', 'Are you sure you want to remove "' + name + '" from your schedule?', 'Delete', () => {
    DB.schedule = DB.schedule.filter(x => x.id !== id);
    DB.save('schedule');
    renderSchedule();
  });
}

function switchDay(day, el) {
  currentDay = normalizeScheduleDay(day);
  document.querySelectorAll('#dayTabs .section-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderSchedule();
}

function renderSchedule() {
  currentDay = normalizeScheduleDay(currentDay);
  const list = document.getElementById('scheduleList');
  const blocks = DB.schedule.filter(b => b.day === currentDay).sort((a, b) => (a.start || '').localeCompare(b.start || '') || (a.period || '').localeCompare(b.period || ''));

  if (blocks.length === 0) {
    list.innerHTML = '<div class="empty-msg">No classes for ' + dayDisplayLabel(currentDay) + '. Tap "Load Example Template" for a starter schedule or add your first class above.</div>';
    return;
  }

  list.innerHTML = blocks.map(b => {
    const time = (b.start && b.end) ? formatTime(b.start) + ' – ' + formatTime(b.end) : '';
    return `<div class="schedule-block">
      <div>
        <div class="schedule-period">Period ${b.period || '?'}</div>
        <div class="schedule-class">${b.className}</div>
        ${time ? '<div class="schedule-time">' + time + '</div>' : ''}
        ${b.teacher ? '<div class="schedule-time"><span class="ui-icon" aria-hidden="true">' + icon('user') + '</span> ' + b.teacher + '</div>' : ''}
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        ${b.room ? '<span class="schedule-room">' + b.room + '</span>' : ''}
        <button class="danger-btn" onclick="deleteScheduleBlock(${b.id})">✕</button>
      </div>
    </div>`;
  }).join('');
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return (hr > 12 ? hr - 12 : hr || 12) + ':' + m + (hr >= 12 ? ' PM' : ' AM');
}

function handleScheduleUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  // Check file size - limit to 5MB for localStorage
  if (file.size > 5 * 1024 * 1024) {
    alert('File is too large. Please use an image under 5MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const upload = { id: Date.now(), name: file.name, type: file.type, data: ev.target.result };
      DB.uploads.push(upload);
      DB.save('uploads');
      renderUploads();
    } catch (err) {
      alert('File too large to save locally. Try a smaller image or screenshot.');
      console.error(err);
    }
  };
  reader.onerror = function() {
    alert('Could not read file. Please try again.');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function deleteUpload(id) {
  const upload = DB.uploads.find(x => x.id === id);
  const name = upload ? upload.name : 'this file';
  showConfirm('Delete Upload?', 'Are you sure you want to delete "' + name + '"?', 'Delete', () => {
    DB.uploads = DB.uploads.filter(x => x.id !== id);
    DB.save('uploads');
    renderUploads();
  });
}

function renderUploads() {
  const c = document.getElementById('uploadedSchedules');
  if (DB.uploads.length === 0) { c.innerHTML = ''; return; }
  c.innerHTML = DB.uploads.map(u => {
    const isImage = u.type && u.type.startsWith('image/');
    return `<div style="border:1px solid var(--lux-border);border-radius:10px;margin-bottom:10px;overflow:hidden;background:var(--lux-card);">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--lux-border);">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="link-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l5 5v13H6z"/><path d="M15 3v5h5"/></svg></span><span style="font-size:13px;font-weight:600;color:var(--lux-text-main);">${u.name}</span>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="ghost-btn" style="padding:4px 10px;font-size:10px;" onclick="toggleUploadPreview(${u.id})">Show/Hide</button>
          <button class="danger-btn" onclick="deleteUpload(${u.id})">✕</button>
        </div>
      </div>
      <div id="upload-preview-${u.id}" style="display:none;padding:10px;text-align:center;max-height:500px;overflow:auto;">
        ${isImage 
          ? '<img src="' + u.data + '" style="max-width:100%;height:auto;border-radius:6px;" alt="' + u.name + '" />'
          : '<div style="padding:20px;color:var(--lux-text-sub);font-size:13px;">PDF preview not available in this viewer.<br>The file is saved and will work when opened in a browser.</div>'
        }
      </div>
    </div>`;
  }).join('');
}

function toggleUploadPreview(id) {
  const el = document.getElementById('upload-preview-' + id);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// ==================== NOTES ====================
function noteTaskLabel(task) {
  const due = task.due ? ` · Due ${task.due}` : '';
  return `${task.title}${due}`;
}

function noteScheduleLabel(block) {
  const time = (block.start && block.end) ? ` (${formatTime(block.start)}-${formatTime(block.end)})` : '';
  return `${dayDisplayLabel(block.day || currentDay)} · ${block.className}${time}`;
}

function refreshNoteEditorSelectors(selectedTaskId, selectedScheduleId) {
  const taskSelect = document.getElementById('noteLinkedTask');
  const schedSelect = document.getElementById('noteLinkedSchedule');
  if (taskSelect) {
    taskSelect.innerHTML = '<option value="">Link to task (optional)</option>' + DB.tasks.map(t => `<option value="${t.id}">${noteTaskLabel(t)}</option>`).join('');
    taskSelect.value = selectedTaskId ? String(selectedTaskId) : '';
  }
  if (schedSelect) {
    const sortedSchedule = [...DB.schedule].sort((a,b) => (a.day || '').localeCompare(b.day || '') || (a.start || '').localeCompare(b.start || ''));
    schedSelect.innerHTML = '<option value="">Link to class/schedule (optional)</option>' + sortedSchedule.map(b => `<option value="${b.id}">${noteScheduleLabel(b)}</option>`).join('');
    schedSelect.value = selectedScheduleId ? String(selectedScheduleId) : '';
  }
}

function renderNotesFolderFilter() {
  const folderFilter = document.getElementById('notesFolderFilter');
  if (!folderFilter) return;
  const current = folderFilter.value || 'all';
  const folders = [...new Set(DB.notes.map(n => (n.folder || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  folderFilter.innerHTML = '<option value="all">All folders</option>' + folders.map(f => `<option value="${f}">${f}</option>`).join('');
  folderFilter.value = folders.includes(current) ? current : 'all';
}

let noteDraftAttachments = [];

function renderNoteAttachmentDraft() {
  const list = document.getElementById('noteAttachmentList');
  if (!list) return;
  if (!noteDraftAttachments.length) {
    list.innerHTML = '';
    return;
  }
  list.innerHTML = noteDraftAttachments.map((a, idx) => `<div class="attachment-item"><span>${a.name}</span><button class="danger-btn" style="padding:4px 8px;font-size:10px;" onclick="removeDraftAttachment(${idx})">✕</button></div>`).join('');
}

function removeDraftAttachment(index) {
  noteDraftAttachments.splice(index, 1);
  renderNoteAttachmentDraft();
}

function handleNoteAttachment(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  const tooLarge = files.find(file => file.size > 2 * 1024 * 1024);
  if (tooLarge) {
    alert(`"${tooLarge.name}" is too large. Keep note attachments under 2MB each.`);
    event.target.value = '';
    return;
  }

  Promise.all(files.map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ id: Date.now() + Math.random(), name: file.name, type: file.type, data: reader.result });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  }))).then(results => {
    noteDraftAttachments = noteDraftAttachments.concat(results);
    renderNoteAttachmentDraft();
  }).catch(() => alert('Unable to read one of the attachments. Please try again.'));

  event.target.value = '';
}

function newNote() {
  editingNoteId = null;
  noteDraftAttachments = [];
  document.getElementById('noteTitle').value = '';
  document.getElementById('noteFolder').value = '';
  document.getElementById('noteContent').value = '';
  updateNoteInsights();
  refreshNoteEditorSelectors('', '');
  renderNoteAttachmentDraft();
  document.getElementById('noteEditor').style.display = 'block';
}

function saveNote() {
  const title = document.getElementById('noteTitle').value.trim() || 'Untitled Note';
  const folder = document.getElementById('noteFolder').value.trim();
  const content = document.getElementById('noteContent').value;
  const linkedTaskId = document.getElementById('noteLinkedTask').value ? Number(document.getElementById('noteLinkedTask').value) : null;
  const linkedScheduleId = document.getElementById('noteLinkedSchedule').value ? Number(document.getElementById('noteLinkedSchedule').value) : null;

  if (editingNoteId) {
    const n = DB.notes.find(x => x.id === editingNoteId);
    if (n) {
      n.title = title;
      n.folder = folder;
      n.content = content;
      delete n.tags;
      n.linkedTaskId = linkedTaskId;
      n.linkedScheduleId = linkedScheduleId;
      n.attachments = noteDraftAttachments;
      n.updatedAt = new Date().toISOString();
    }
  } else {
    DB.notes.unshift({
      id: Date.now(),
      title,
      folder,
      content,
      linkedTaskId,
      linkedScheduleId,
      attachments: noteDraftAttachments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  DB.save('notes');
  renderNotesFolderFilter();
  cancelNote();
  renderNotes();
}

function cancelNote() {
  document.getElementById('noteEditor').style.display = 'none';
  editingNoteId = null;
  noteDraftAttachments = [];
}

function editNote(id) {
  const n = DB.notes.find(x => x.id === id);
  if (!n) return;
  editingNoteId = id;
  noteDraftAttachments = Array.isArray(n.attachments) ? [...n.attachments] : [];
  document.getElementById('noteTitle').value = n.title;
  document.getElementById('noteFolder').value = n.folder || '';
  document.getElementById('noteContent').value = n.content;
  updateNoteInsights();
  refreshNoteEditorSelectors(n.linkedTaskId, n.linkedScheduleId);
  renderNoteAttachmentDraft();
  document.getElementById('noteEditor').style.display = 'block';
}

function deleteNote(id) {
  const note = DB.notes.find(x => x.id === id);
  const name = note ? note.title : 'this note';
  showConfirm('Delete Note?', 'Are you sure you want to delete "' + name + '"? This cannot be undone.', 'Delete', () => {
    DB.notes = DB.notes.filter(x => x.id !== id);
    DB.save('notes');
    renderNotesFolderFilter();
    renderNotes();
  });
}

function renderNotes() {
  const list = document.getElementById('notesList');
  const query = (document.getElementById('notesSearch')?.value || '').trim().toLowerCase();
  const folderFilter = document.getElementById('notesFolderFilter')?.value || 'all';

  const visibleNotes = DB.notes.filter(n => {
    const searchBlob = `${n.title} ${n.content} ${n.folder || ''}`.toLowerCase();
    const folderOK = folderFilter === 'all' || (n.folder || '') === folderFilter;
    const queryOK = !query || searchBlob.includes(query);
    return folderOK && queryOK;
  });

  if (visibleNotes.length === 0) {
    list.innerHTML = '<div class="empty-msg">No matching notes yet. Try another filter or create a new note.</div>';
    return;
  }

  list.innerHTML = visibleNotes.map(n => {
    const date = new Date(n.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const linkedTask = n.linkedTaskId ? DB.tasks.find(t => t.id === n.linkedTaskId) : null;
    const linkedSchedule = n.linkedScheduleId ? DB.schedule.find(b => b.id === n.linkedScheduleId) : null;
    const linkedPills = [
      n.folder ? `<span class="pill">📁 ${n.folder}</span>` : '',
      linkedTask ? `<span class="pill">✅ ${linkedTask.title}</span>` : '',
      linkedSchedule ? `<span class="pill">🗓️ ${linkedSchedule.className}</span>` : '',
      n.attachments?.length ? `<span class="pill">📎 ${n.attachments.length} attachment${n.attachments.length > 1 ? 's' : ''}</span>` : ''
    ].filter(Boolean).join('');
    const attachmentHtml = (n.attachments || []).map(a => `<div class="attachment-item" onclick="event.stopPropagation();"><span>${a.name}</span><a class="attachment-link" href="${a.data}" download="${a.name}">Download</a></div>`).join('');

    return `<div class="note-card" onclick="editNote(${n.id})">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
        <div class="note-card-title">${n.title}</div>
        <button class="danger-btn" onclick="event.stopPropagation();deleteNote(${n.id})" style="flex-shrink:0;">✕</button>
      </div>
      <div class="pill-row">${linkedPills}</div>
      <div class="note-card-preview">${n.content || 'Empty note...'}</div>
      ${attachmentHtml ? `<div class="attachment-list" style="margin-top:8px;">${attachmentHtml}</div>` : ''}
      <div class="note-card-date">${date}</div>
    </div>`;
  }).join('');
}

function updateNoteInsights() {
  const content = document.getElementById('noteContent')?.value || '';
  const stat = document.getElementById('noteContentStats');
  if (!stat) return;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  stat.textContent = `${words} words · ${content.length} chars`;
}

function insertNoteTemplate(type) {
  const editor = document.getElementById('noteContent');
  if (!editor) return;
  const templates = {
    class: 'Summary:\n- \n\nKey ideas:\n- \n\nQuestions:\n- \n\nAction items:\n- ',
    checklist: '- [ ] First task\n- [ ] Next task\n- [ ] Final task'
  };
  if (editor.value.trim()) editor.value += '\n\n';
  editor.value += templates[type] || '';
  editor.focus();
  updateNoteInsights();
}

function scrollNoteEditor(position) {
  const editor = document.getElementById('noteContent');
  if (!editor) return;
  editor.scrollTop = position === 'top' ? 0 : editor.scrollHeight;
  editor.focus();
}

// ==================== LINKS ====================
function toggleLinkForm() {
  const f = document.getElementById('linkForm');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}

function inferCategoryFromUrl(url) {
  const clean = String(url || '').toLowerCase();
  if (/classroom|canvas|blackboard|school|campus/.test(clean)) return 'school';
  if (/docs|notion|calendar|drive|trello/.test(clean)) return 'productivity';
  if (/mail|teams|slack|discord/.test(clean)) return 'communication';
  if (/khan|quizlet|coursera|study|wikipedia/.test(clean)) return 'study';
  if (/figma|github|replit|codepen|stackoverflow/.test(clean)) return 'tools';
  if (/youtube|twitch|netflix|spotify|game/.test(clean)) return 'fun';
  return 'other';
}

function categoryLabel(cat) {
  const labels = { school: 'School', study: 'Study', communication: 'Communication', productivity: 'Productivity', tools: 'Tools', fun: 'Fun', other: 'Other' };
  return labels[cat] || 'Other';
}

function getFaviconUrl(url) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  } catch (_) {
    return '';
  }
}

let linkDragId = null;

function addLink() {
  const name = document.getElementById('linkName').value.trim();
  let url = document.getElementById('linkUrl').value.trim();
  if (!name || !url) return alert('Please enter a name and URL');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const explicitCategory = document.getElementById('linkCategory').value;
  const category = explicitCategory || inferCategoryFromUrl(url);

  DB.links.push({
    id: Date.now(),
    name,
    url,
    category,
    icon: normalizeLinkIcon(document.getElementById('linkIcon')?.value || 'link'),
    favicon: getFaviconUrl(url),
    order: DB.links.length
  });
  DB.save('links');
  document.getElementById('linkName').value = '';
  document.getElementById('linkUrl').value = '';
  document.getElementById('linkCategory').value = 'school';
  toggleLinkForm();
  renderLinks();
}

function deleteLink(id) {
  const link = DB.links.find(x => x.id === id);
  const name = link ? link.name : 'this link';
  showConfirm('Delete Link?', 'Are you sure you want to delete "' + name + '"? This cannot be undone.', 'Delete', () => {
    DB.links = DB.links.filter(x => x.id !== id).map((linkItem, index) => ({ ...linkItem, order: index }));
    DB.save('links');
    renderLinks();
  });
}

function onLinkDragStart(id) {
  linkDragId = id;
}

function onLinkDragOver(event) {
  event.preventDefault();
}

function onLinkDrop(targetId) {
  if (!linkDragId || linkDragId === targetId) return;
  const sorted = [...DB.links].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const from = sorted.findIndex(l => l.id === linkDragId);
  const to = sorted.findIndex(l => l.id === targetId);
  if (from < 0 || to < 0) return;
  const [moved] = sorted.splice(from, 1);
  sorted.splice(to, 0, moved);
  DB.links = sorted.map((l, index) => ({ ...l, order: index }));
  DB.save('links');
  renderLinks();
}

function renderLinks() {
  const list = document.getElementById('linksList');
  const filter = document.getElementById('linkCategoryFilter')?.value || 'all';
  const sorted = [...DB.links]
    .map((l, index) => ({ ...l, category: l.category || inferCategoryFromUrl(l.url), favicon: l.favicon || getFaviconUrl(l.url), order: Number.isFinite(l.order) ? l.order : index }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (sorted.length !== DB.links.length || sorted.some((l, i) => l.id !== DB.links[i]?.id || l.category !== DB.links[i]?.category || l.favicon !== DB.links[i]?.favicon || l.order !== DB.links[i]?.order)) {
    DB.links = sorted;
    DB.save('links');
  }

  const visible = sorted.filter(l => filter === 'all' || l.category === filter);

  if (visible.length === 0) {
    list.innerHTML = '<div class="empty-msg">No links yet for this category. Add one above!</div>';
    return;
  }

  const grouped = visible.reduce((acc, link) => {
    const key = link.category || 'other';
    acc[key] = acc[key] || [];
    acc[key].push(link);
    return acc;
  }, {});

  const categoryOrder = ['school', 'study', 'communication', 'productivity', 'tools', 'fun', 'other'];
  list.innerHTML = categoryOrder.filter(cat => grouped[cat]?.length).map(cat => {
    const items = grouped[cat].map(l => {
      const domain = l.url.replace(/https?:\/\//, '').split('/')[0];
      const fallbackIcon = icon(normalizeLinkIcon(l.icon));
      return `<div class="link-item" draggable="true" ondragstart="onLinkDragStart(${l.id})" ondragover="onLinkDragOver(event)" ondrop="onLinkDrop(${l.id})">
        <a href="${l.url}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit;flex:1;min-width:0;">
          ${l.favicon ? `<img class="link-favicon" src="${l.favicon}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex';" />` : ''}
          <span class="link-icon" style="display:${l.favicon ? 'none' : 'inline-flex'};">${fallbackIcon}</span>
          <div class="link-info">
            <div class="link-name">${l.name}</div>
            <div class="link-url">${domain}</div>
          </div>
          <span class="link-arrow">↕</span>
        </a>
        <button class="danger-btn" onclick="deleteLink(${l.id})" style="flex-shrink:0;">✕</button>
      </div>`;
    }).join('');

    return `<div class="link-category-block"><div class="link-category-header">${categoryLabel(cat)}</div>${items}</div>`;
  }).join('');
}

// ==================== ANALYTICS ====================
function updateAnalytics() {
  const total = DB.tasks.length;
  const completed = DB.tasks.filter(t => t.completed).length;
  const rate = total ? Math.round((completed / total) * 100) : 0;
  document.getElementById('anTotal').textContent = total;
  document.getElementById('anCompleted').textContent = completed;
  document.getElementById('anRate').textContent = rate + '%';

  // Subject chart
  const subjects = {};
  DB.tasks.forEach(t => { const s = t.subject || 'Other'; subjects[s] = (subjects[s] || 0) + 1; });
  const chart = document.getElementById('subjectChart');
  const maxCount = Math.max(...Object.values(subjects), 1);
  chart.innerHTML = Object.entries(subjects).map(([name, count]) => {
    const pct = (count / maxCount) * 100;
    const sc = getSubjectColor(name);
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <div style="width:70px;font-size:11px;font-weight:600;color:var(--lux-text-sub);text-align:right;">${name}</div>
      <div style="flex:1;height:24px;background:var(--lux-hover);border-radius:6px;overflow:hidden;border:1px solid var(--lux-border);">
        <div style="width:${pct}%;height:100%;background:${sc.border};border-radius:6px;transition:width 0.3s;"></div>
      </div>
      <div style="width:24px;font-size:12px;font-weight:700;color:var(--lux-text-main);">${count}</div>
    </div>`;
  }).join('') || '<div class="empty-msg">Add tasks to see subject breakdown</div>';

  // Week chart
  const week = document.getElementById('weekChart');
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const count = DB.tasks.filter(t => t.createdAt && t.createdAt.startsWith(ds)).length;
    days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), count });
  }
  const maxDay = Math.max(...days.map(d => d.count), 1);
  week.innerHTML = days.map(d => {
    const h = Math.max(4, (d.count / maxDay) * 100);
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="font-size:10px;font-weight:700;color:var(--lux-text-main);">${d.count}</div>
      <div style="width:100%;height:${h}%;background:var(--titan-primary);border-radius:4px;min-height:4px;transition:height 0.3s;"></div>
      <div style="font-size:9px;color:var(--lux-text-sub);font-weight:600;">${d.label}</div>
    </div>`;
  }).join('');

  const focusChart = document.getElementById('focusPatternChart');
  if (focusChart) {
    const focusDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const mins = Math.round(DB.focusSessions.filter(s => s.date === key).reduce((sum, s) => sum + s.seconds, 0) / 60);
      focusDays.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), mins });
    }
    const maxFocus = Math.max(...focusDays.map(d => d.mins), 1);
    focusChart.innerHTML = focusDays.map(d => {
      const h = Math.max(4, (d.mins / maxFocus) * 100);
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="font-size:10px;font-weight:700;color:var(--lux-text-main);">${d.mins}</div>
        <div style="width:100%;height:${h}%;background:var(--lux-success);border-radius:4px;min-height:4px;transition:height 0.3s;opacity:${d.mins ? 0.95 : 0.25};"></div>
        <div style="font-size:9px;color:var(--lux-text-sub);font-weight:600;">${d.label}</div>
      </div>`;
    }).join('');
  }
}

function updateDashboard() {
  const open = DB.tasks.filter(t => !t.completed).length;
  const done = DB.tasks.filter(t => t.completed).length;
  document.getElementById('dashOpenTasks').textContent = open;
  document.getElementById('dashCompletedTasks').textContent = done;
  updateFocusStats();
  renderDueThisWeek();
}

function renderDueThisWeek() {
  const container = document.getElementById('dueThisWeek');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  const todayStr = today.toISOString().split('T')[0];
  const endStr = endOfWeek.toISOString().split('T')[0];

  const upcoming = DB.tasks
    .filter(t => !t.completed && t.due && t.due >= todayStr && t.due <= endStr)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5);

  const overdue = DB.tasks
    .filter(t => !t.completed && t.due && t.due < todayStr)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 3);

  const items = [...overdue, ...upcoming];

  if (items.length === 0) {
    container.innerHTML = '<div style="padding: 18px; text-align: center; color: var(--lux-text-sub); font-size: 13px; background: var(--lux-hover); border-radius: 10px; border: 1px solid var(--lux-border);">No upcoming deadlines this week. You\'re all caught up!</div>';
    return;
  }

  container.innerHTML = items.map(t => {
    const isOverdue = t.due < todayStr;
    const dueDate = new Date(t.due + 'T00:00:00');
    const diffDays = Math.ceil((dueDate - today) / 86400000);
    let dueLabel = '';
    if (isOverdue) dueLabel = Math.abs(diffDays) + ' day' + (Math.abs(diffDays) !== 1 ? 's' : '') + ' overdue';
    else if (diffDays === 0) dueLabel = 'Due today';
    else if (diffDays === 1) dueLabel = 'Due tomorrow';
    else dueLabel = 'Due ' + dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const sc = getSubjectColor(t.subject);
    const borderColor = t.subject ? sc.border : 'var(--lux-border)';
    const subjectBadge = t.subject ? '<span style="display:inline-flex;align-items:center;gap:3px;padding:1px 8px;border-radius:10px;font-size:10px;font-weight:700;background:' + sc.bg + ';color:' + sc.text + ';">' + t.subject + '</span>' : '';

    return '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid var(--lux-border);border-radius:8px;background:var(--lux-hover);margin-bottom:6px;border-left:3px solid ' + borderColor + ';cursor:pointer;transition:all 0.2s;" onclick="switchSection(\'agenda\')">' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:13px;font-weight:600;color:var(--lux-text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
          '<span class="priority-dot priority-' + t.priority + '"></span>' + t.title +
        '</div>' +
        '<div style="font-size:11px;color:' + (isOverdue ? 'var(--lux-danger)' : 'var(--lux-text-sub)') + ';font-weight:' + (isOverdue ? '700' : '500') + ';margin-top:2px;display:flex;align-items:center;gap:8px;">' +
          (isOverdue ? '⚠️ ' : '📅 ') + dueLabel +
          ' ' + subjectBadge +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ==================== NAVIGATION ====================
const sectionMeta = {
  profile: { label: 'Dashboard' },
  agenda: { label: 'Log Homework' },
  schedule: { label: 'Schedule' },
  heatmap: { label: 'Analytics' },
  notes: { label: 'Notes' },
  links: { label: 'Quick Links' }
};
let sectionHistory = ['profile'];
let isBackNavigation = false;
let lastFocusedBeforePanel = null;

function updateBreadcrumb(sectionId) {
  const crumb = document.getElementById('breadcrumbCurrent');
  if (!crumb) return;
  crumb.textContent = sectionMeta[sectionId]?.label || 'Section';
}

function navigateBack() {
  if (sectionHistory.length <= 1) {
    switchSection('profile');
    return;
  }
  sectionHistory.pop();
  const previous = sectionHistory[sectionHistory.length - 1] || 'profile';
  isBackNavigation = true;
  switchSection(previous);
}

function performGlobalSearch() {
  const query = (document.getElementById('globalSearch')?.value || '').trim();
  if (!query) return;
  switchSection('agenda');
  const taskSearch = document.getElementById('taskSearch');
  if (taskSearch) {
    taskSearch.value = query;
    renderTasks();
  }
  const notesSearch = document.getElementById('notesSearch');
  if (notesSearch) {
    notesSearch.value = query;
    renderNotes();
  }
}

function switchSection(sectionId) {
  document.querySelectorAll('.section-wrapper').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById('section-' + sectionId);
  if (sec) sec.classList.add('active');
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-section="${sectionId}"]`);
  if (btn) btn.classList.add('active');
  updateBreadcrumb(sectionId);
  if (!isBackNavigation && sectionHistory[sectionHistory.length - 1] !== sectionId) {
    sectionHistory.push(sectionId);
  }
  isBackNavigation = false;
  closeMobileSidebar();
  if (sectionId === 'heatmap') updateAnalytics();
  if (sectionId === 'schedule') renderSchedule();
  if (sectionId === 'appointments') apptRender();

}

function toggleMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('mobileSidebarBackdrop');
  const hamburger = document.getElementById('hamburgerBtn');
  if (!sidebar || !backdrop || !hamburger) return;
  const open = !sidebar.classList.contains('mobile-open');
  sidebar.classList.toggle('mobile-open', open);
  backdrop.classList.toggle('active', open);
  hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function closeMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('mobileSidebarBackdrop');
  const hamburger = document.getElementById('hamburgerBtn');
  if (!sidebar || !backdrop || !hamburger) return;
  sidebar.classList.remove('mobile-open');
  backdrop.classList.remove('active');
  hamburger.setAttribute('aria-expanded', 'false');
}

function toggleSettingsPanel(forceOpen) {
  const p = document.getElementById('settingsPanel');
  const open = typeof forceOpen === 'boolean' ? forceOpen : !p.classList.contains('open');
  p.classList.toggle('open', open);
  p.setAttribute('aria-hidden', open ? 'false' : 'true');
  const backdrop = document.getElementById('settingsPanelBackdrop');
  backdrop.style.opacity = open ? '1' : '0';
  backdrop.style.pointerEvents = open ? 'auto' : 'none';
  const toggle = document.getElementById('settingsToggle');
  if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) {
    STORAGE.setItem(CUSTOMIZE_TIP_STORAGE_KEY, 'true');
    const tip = document.getElementById('customizeFirstTip');
    if (tip) tip.style.display = 'none';
    lastFocusedBeforePanel = document.activeElement;
    p.focus();
  } else if (lastFocusedBeforePanel && typeof lastFocusedBeforePanel.focus === 'function') {
    lastFocusedBeforePanel.focus();
  }
}

// ==================== THEMES ====================
let currentTheme = 'deep-ocean';
const themePresets = {
  "midnight-edge": { primary: "#0d0d0d", accent: "#f8f8f8", name: "Midnight Edge" },
  "carbon-volt": { primary: "#1f1f1f", accent: "#ccff00", name: "Carbon Volt" },
  "slate-pulse": { primary: "#2a2d3a", accent: "#ff4081", name: "Slate Pulse" },
  "deep-ocean": { primary: "#0a1628", accent: "#00d9ff", name: "Deep Ocean" },
  "crimson-steel": { primary: "#1a0f0f", accent: "#ff6b35", name: "Crimson Steel" },
  "emerald-night": { primary: "#0d1f1d", accent: "#2ecc71", name: "Emerald Night" },
  "purple-eclipse": { primary: "#1a0a2e", accent: "#b366ff", name: "Purple Eclipse" },
  "gold-noir": { primary: "#0f0a05", accent: "#ffd700", name: "Gold Noir" },
  "neon-pulse": { primary: "#0a0e27", accent: "#ff00ff", name: "Neon Pulse" },
  "arctic-clear": { primary: "#0f1419", accent: "#64e0ff", name: "Arctic Clear" }
};

function shadeColor(c, p) {
  const n = parseInt(c.replace("#",""), 16), a = Math.round(2.55 * p);
  const R = Math.min(255, Math.max(0, (n >> 16) + a));
  const G = Math.min(255, Math.max(0, (n >> 8 & 0xFF) + a));
  const B = Math.min(255, Math.max(0, (n & 0xFF) + a));
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function applyColorTheme(name) {
  const t = themePresets[name]; const r = document.documentElement;
  r.style.setProperty('--titan-primary', t.primary);
  r.style.setProperty('--titan-accent', t.accent);
  r.style.setProperty('--sidebar-gradient', `linear-gradient(180deg, ${t.primary} 0%, ${shadeColor(t.primary, -15)} 100%)`);
  document.getElementById('appBg').style.background = `linear-gradient(180deg, ${shadeColor(t.primary, 92)} 0%, ${shadeColor(t.primary, 84)} 100%)`;
  STORAGE.setItem('currentTheme', name); currentTheme = name; renderThemeGrid();
}

function renderThemeGrid() {
  const g = document.getElementById('themeGrid'); g.innerHTML = '';
  Object.entries(themePresets).forEach(([k, t]) => {
    const s = document.createElement('div');
    s.className = `color-swatch ${k === currentTheme ? 'active' : ''}`;
    s.style.background = `linear-gradient(135deg, ${shadeColor(t.primary, 95)} 0%, ${shadeColor(t.primary, 85)} 40%, ${t.accent} 100%)`;
    s.textContent = t.name;
    s.onclick = () => applyColorTheme(k);
    g.appendChild(s);
  });
}

// ==================== BRANDING ====================
const COMPANY_LOGO = 'assets/main-logo.svg';
const DEFAULT_DASHBOARD_LOGO = COMPANY_LOGO;
const DASHBOARD_LOGO_STORAGE_KEY = 'dashboard_logo';
const DEFAULT_NAME = 'My Agenda';
const DEFAULT_SUBTITLE = '2025-2026 Digital Agenda';
const DEFAULT_TAGLINE = 'Elite Athlete Dashboard';

function applyDashboardLogo(src = DEFAULT_DASHBOARD_LOGO) {
  const dashLogo = document.getElementById('dashboardLogoImg');
  if (dashLogo) dashLogo.src = src;
  const previewImg = document.getElementById('logoPreviewImg');
  if (previewImg) previewImg.src = src;
}

function updateDashboardLogo(file) {
  if (!file || !file.type || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    const logo = typeof reader.result === 'string' ? reader.result : DEFAULT_DASHBOARD_LOGO;
    STORAGE.setItem(DASHBOARD_LOGO_STORAGE_KEY, logo);
    applyDashboardLogo(logo);
  };
  reader.readAsDataURL(file);
}

function handleDashboardLogoUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  updateDashboardLogo(file);
  input.value = '';
}

function resetDashboardLogo() {
  STORAGE.removeItem(DASHBOARD_LOGO_STORAGE_KEY);
  applyDashboardLogo(DEFAULT_DASHBOARD_LOGO);
}


function applyLogo() {
  document.querySelectorAll('.sidebar-logo-img').forEach(img => img.src = COMPANY_LOGO);
  document.querySelectorAll('.header-logo, .landing-brand-logo').forEach(img => img.src = COMPANY_LOGO);

  const customDashboardLogo = STORAGE.getItem(DASHBOARD_LOGO_STORAGE_KEY);
  applyDashboardLogo(customDashboardLogo || DEFAULT_DASHBOARD_LOGO);
}

function updateBrandName(val) {
  const name = val.trim() || DEFAULT_NAME;
  STORAGE.setItem('brand_name', val.trim());
  document.querySelectorAll('.dashboard-title-section .brand-app-name').forEach(el => el.textContent = name);
}

function updateBrandSubtitle(val) {
  const sub = val.trim() || DEFAULT_SUBTITLE;
  STORAGE.setItem('brand_subtitle', val.trim());
  document.querySelectorAll('.brand-subtitle').forEach(el => el.textContent = sub);
}

function updateBrandTagline(val) {
  const tag = val.trim() || DEFAULT_TAGLINE;
  STORAGE.setItem('brand_tagline', val.trim());
  document.querySelectorAll('.brand-tagline').forEach(el => el.textContent = tag);
}

function resetBranding() {
  resetDashboardLogo();
  STORAGE.removeItem('brand_name');
  STORAGE.removeItem('brand_subtitle');
  STORAGE.removeItem('brand_tagline');
  applyLogo();
  document.querySelectorAll('.dashboard-title-section .brand-app-name').forEach(el => el.textContent = DEFAULT_NAME);
  document.querySelectorAll('.brand-subtitle').forEach(el => el.textContent = DEFAULT_SUBTITLE);
  document.querySelectorAll('.brand-tagline').forEach(el => el.textContent = DEFAULT_TAGLINE);
  document.getElementById('brandName').value = '';
  document.getElementById('brandSubtitle').value = '';
  document.getElementById('brandTagline').value = '';
}


function loadBranding() {
  applyLogo();

  const name = STORAGE.getItem('brand_name');
  if (name) {
    document.getElementById('brandName').value = name;
    document.querySelectorAll('.dashboard-title-section .brand-app-name').forEach(el => el.textContent = name);
  }

  const subtitle = STORAGE.getItem('brand_subtitle');
  if (subtitle) {
    document.getElementById('brandSubtitle').value = subtitle;
    document.querySelectorAll('.brand-subtitle').forEach(el => el.textContent = subtitle);
  }

  const tagline = STORAGE.getItem('brand_tagline');
  if (tagline) {
    document.getElementById('brandTagline').value = tagline;
    document.querySelectorAll('.brand-tagline').forEach(el => el.textContent = tagline);
  }
}

// ==================== QUOTES ====================
const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "Small progress is still progress.", author: "Unknown" },
  { text: "Dream big. Work hard. Stay focused.", author: "Unknown" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Unknown" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { text: "Your limitation—it's only your imagination.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "A champion is defined not by their wins but by how they can recover when they fall.", author: "Serena Williams" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { text: "Don't limit your challenges. Challenge your limits.", author: "Unknown" },
  { text: "Be stronger than your excuses.", author: "Unknown" },
];

let currentQuoteIndex = -1;

function nextQuote() {
  const textEl = document.getElementById('quoteText');
  const authorEl = document.getElementById('quoteAuthor');

  // Fade out
  textEl.style.opacity = '0';
  authorEl.style.opacity = '0';

  setTimeout(() => {
    // Pick a new random quote (different from current)
    let idx;
    do { idx = Math.floor(Math.random() * QUOTES.length); } while (idx === currentQuoteIndex && QUOTES.length > 1);
    currentQuoteIndex = idx;
    const q = QUOTES[idx];

    textEl.textContent = '"' + q.text + '"';
    authorEl.textContent = '— ' + q.author;

    // Fade in
    textEl.style.opacity = '1';
    authorEl.style.opacity = '1';
  }, 300);
}

function initQuote() {
  // Use a daily seed so the quote changes each day but stays consistent during the day
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  currentQuoteIndex = dayOfYear % QUOTES.length;
  const q = QUOTES[currentQuoteIndex];
  document.getElementById('quoteText').textContent = '"' + q.text + '"';
  document.getElementById('quoteAuthor').textContent = '— ' + q.author;
}


let deferredInstallPrompt = null;

function setupPWAInstall() {
  const installBtn = document.getElementById('installBtn');
  if (!installBtn) return;

  const setInstallVisibility = (visible) => {
    installBtn.style.display = visible ? 'inline-flex' : 'none';
    installBtn.setAttribute('aria-hidden', visible ? 'false' : 'true');
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    setInstallVisibility(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    setInstallVisibility(false);
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    setInstallVisibility(false);
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

async function cleanupLegacyServiceWorkers() {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch (error) {
    console.warn('Legacy service worker cleanup failed:', error);
  }

  try {
    const keys = await caches.keys();
    const agendaKeys = keys.filter((key) => key.startsWith('digital-student-agenda-'));
    await Promise.all(agendaKeys.map((key) => caches.delete(key)));
  } catch (error) {
    console.warn('Legacy cache cleanup failed:', error);
  }
}

function monitorWebVitals() {
  if (!('PerformanceObserver' in window)) return;

  const thresholds = {
    lcp: 2500,
    cls: 0.1,
    inp: 200
  };
  const vitals = { cls: 0, inp: 0 };

  const logVital = (metric, value, threshold) => {
    const state = value <= threshold ? 'PASS' : 'WARN';
    console.info(`[CWV] ${metric}: ${value} (${state}, target <= ${threshold})`);
  };

  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lcp = entries[entries.length - 1];
      if (lcp) logVital('LCP(ms)', Math.round(lcp.startTime), thresholds.lcp);
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) vitals.cls += entry.value;
      }
      logVital('CLS', Number(vitals.cls.toFixed(3)), thresholds.cls);
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    const eventObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.interactionId) {
          vitals.inp = Math.max(vitals.inp, Math.round(entry.duration));
        }
      }
      if (vitals.inp) logVital('INP(ms)', vitals.inp, thresholds.inp);
    });
    eventObserver.observe({ type: 'event', durationThreshold: 40, buffered: true });

    const fidObserver = new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0];
      if (!firstInput) return;
      const fid = Math.round(firstInput.processingStart - firstInput.startTime);
      logVital('FID(ms)', fid, 100);
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch (err) {
    console.warn('PerformanceObserver setup failed:', err);
  }
}

function renderApp({ demoMode = false } = {}) {
  if (demoMode) {
    document.body.classList.add('demo-mode');
  }

  initializeScheduleSettingsUI();
  renderNotesFolderFilter();
  refreshNoteEditorSelectors('', '');
  renderTasks();
  renderSchedule();
  renderUploads();
  renderNotes();
  renderLinks();
  updateDashboard();
  updateAnalytics();
  initQuote();
  loadBranding();
  DB.syncMetadata.lastSyncedAt = new Date().toISOString();
  DB.save('syncMetadata');
  switchSection('profile');
  apptRender();
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {

  cleanupLegacyServiceWorkers();

  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = ROUTES.LANDING;
  } else if (sanitizedRouteHash() !== normalizedHash()) {
    window.location.hash = ROUTES.APP;
  } else if (shouldForceMobileLanding()) {
    window.location.hash = ROUTES.LANDING;
  }
  setupDemoModeGuards();
  setupLandingPreview();
  updateRouteView();
  window.addEventListener('hashchange', () => { updateRouteView(); maybeShowOnboarding(); });

  // Load preferences
  if (STORAGE.getItem('dyslexia') === 'true') document.body.classList.add('font-dyslexic');
  if (STORAGE.getItem('theme') === 'dark') document.body.classList.add('dark-mode');
  applyColorTheme(STORAGE.getItem('currentTheme') || 'deep-ocean');
  document.getElementById('hamburgerBtn')?.setAttribute('aria-expanded', 'false');
  setupPWAInstall();
  // Service worker intentionally disabled to avoid stale cached builds.
  monitorWebVitals();

  // Event listeners
  document.getElementById('settingsToggle').addEventListener('click', toggleSettingsPanel);
  document.getElementById('closeSettings').addEventListener('click', toggleSettingsPanel);
  document.getElementById('settingsPanelBackdrop').addEventListener('click', toggleSettingsPanel);
  document.getElementById('mobileSidebarBackdrop').addEventListener('click', closeMobileSidebar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileSidebar();
      const panelOpen = document.getElementById('settingsPanel')?.classList.contains('open');
      if (panelOpen) toggleSettingsPanel(false);
    }
  });
  document.getElementById('darkModeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    STORAGE.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
  });
  document.getElementById('dyslexiaToggle').addEventListener('click', () => {
    document.body.classList.toggle('font-dyslexic');
    STORAGE.setItem('dyslexia', document.body.classList.contains('font-dyslexic') ? 'true' : 'false');
  });
  document.getElementById('resetSettingsBtn').addEventListener('click', () => {
    showConfirm('Reset Everything?', 'This will erase all your tasks, notes, links, schedule, and settings. This cannot be undone.', 'Reset All', () => { STORAGE.clear(); location.reload(); }, '🗑️');
  });
  document.getElementById('pageBackBtn')?.addEventListener('click', navigateBack);
  document.getElementById('globalSearch')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performGlobalSearch();
    }
  });
  document.getElementById('globalSearch')?.addEventListener('search', performGlobalSearch);

  // Date & countdown
  const today = new Date();
  document.getElementById('dateDisplay').textContent = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const summer = new Date(today.getFullYear(), 5, 15);
  if (today > summer) summer.setFullYear(summer.getFullYear() + 1);
  document.getElementById('schoolCountdown').textContent = Math.ceil((summer - today) / 86400000) + ' days';

  // Set default date for task form
  document.getElementById('taskDue').valueAsDate = new Date(Date.now() + 86400000);
  document.getElementById('homeworkDue').valueAsDate = new Date(Date.now() + 86400000);
  document.getElementById('taskAssignedDate').valueAsDate = new Date();
  initializeTaskFormControls();
  selectTaskPriority('medium');

  const focusInput = document.getElementById('focusMinutes');
  const breakInput = document.getElementById('breakMinutes');
  if (focusInput) focusInput.value = DB.pomodoroSettings.focusMinutes || 25;
  if (breakInput) breakInput.value = DB.pomodoroSettings.breakMinutes || 5;
  primeAudioOnFirstInteraction();
  resetPomodoro();

  const naturalInput = document.getElementById('taskNaturalInput');
  if (naturalInput) {
    naturalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        parseNaturalTaskInput();
      }
    });
  }

  const noteContent = document.getElementById('noteContent');
  if (noteContent) {
    noteContent.addEventListener('input', updateNoteInsights);
  }
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      const editorOpen = document.getElementById('noteEditor')?.style.display !== 'none';
      if (editorOpen) {
        e.preventDefault();
        saveNote();
      }
    }
  });

  renderApp({ demoMode: DEMO_MODE });


  maybeShowCustomizeTip();
  maybeShowOnboarding();
});
