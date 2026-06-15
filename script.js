// ══════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function dateStr(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function hexToRgb(hex) { const r = parseInt(hex.slice(1,3),16); const g = parseInt(hex.slice(3,5),16); const b = parseInt(hex.slice(5,7),16); return r+','+g+','+b; }
function toast(msg, ms = 2200) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
}
function showModal(html) {
  $('#modal-content').innerHTML = html;
  $('#modal-bg').classList.add('open');
}
function hideModal() { $('#modal-bg').classList.remove('open'); }
$('#modal-bg').addEventListener('click', e => { if (e.target.id === 'modal-bg') hideModal(); });

// ══════════════════════════════════════════════
//  BOTTOM NAVIGATION TAB LOGIC
// ══════════════════════════════════════════════
const navBtns = $$('.nav-btn');
const tabPanes = $$('.tab-pane');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.remove('active'));
    
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    $(`#${tabId}`).classList.add('active');
    
    if(tabId === 'tab-dash') {
       const scrollContainer = $('#heatmap-scroll');
       if(scrollContainer) scrollContainer.scrollLeft = scrollContainer.scrollWidth;
       renderDashboard();
    }
    if(tabId === 'tab-cal') renderCalendar();
    if(tabId === 'tab-goals') renderHabits();
    if(tabId === 'tab-log') renderQuickLog();
    if(tabId === 'tab-plan') renderWeeklyReview();
    if(tabId === 'tab-search') { $('#search-input').focus(); }
  });
});

// ══════════════════════════════════════════════
//  THEME ENGINE
// ══════════════════════════════════════════════
const THEMES = ['dark', 'light', 'midnight', 'forest', 'rose'];
let currentThemeIndex = THEMES.indexOf(localStorage.getItem('dp-theme') || 'dark');
if(currentThemeIndex === -1) currentThemeIndex = 0;

function applyTheme() {
  const t = THEMES[currentThemeIndex];
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('dp-theme', t);
  let metaColor = '#0f0f14';
  if(t === 'light') metaColor = '#f4f3fb';
  if(t === 'midnight') metaColor = '#0b0f19';
  if(t === 'forest') metaColor = '#0f1712';
  if(t === 'rose') metaColor = '#1f1316';
  $('#theme-meta').content = metaColor;
}

$('#theme-cycle-btn').addEventListener('click', () => {
  currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
  applyTheme();
});
applyTheme();

// ══════════════════════════════════════════════
//  UI COLLAPSE LOGIC
// ══════════════════════════════════════════════
function setupCollapsible(headId, bodyId, toggleId, storageKey, defaultOpen) {
  const head = $(`#${headId}`);
  const body = $(`#${bodyId}`);
  const toggle = $(`#${toggleId}`);
  let isOpen = JSON.parse(localStorage.getItem(storageKey));
  if (isOpen === null) isOpen = defaultOpen;

  function updateUI() {
    if (isOpen) {
      body.classList.add('open');
      body.style.display = bodyId === 'pomo-body' ? 'flex' : 'block';
      toggle.classList.add('open');
    } else {
      body.classList.remove('open');
      body.style.display = 'none';
      toggle.classList.remove('open');
    }
  }
  updateUI();

  head.addEventListener('click', () => {
    isOpen = !isOpen;
    localStorage.setItem(storageKey, JSON.stringify(isOpen));
    updateUI();
  });
}
setupCollapsible('streak-head', 'streak-body', 'streak-toggle', 'ui-streak-open', true);
setupCollapsible('pomo-head', 'pomo-body', 'pomo-toggle', 'ui-pomo-open', true);
setupCollapsible('tt-head', 'tt-body', 'tt-toggle', 'ui-tt-open', true);

// ══════════════════════════════════════════════
//  TRANSLATIONS & STATE
// ══════════════════════════════════════════════
const T = {
  en: { title:'Date Progress', start:'Start date', end:'End date', elapsed:'Elapsed', remaining:'Remaining', total:'Total', addTracker:'Add another tracker', label:'Label', pickDates:'pick dates', notStarted:'Not started yet', complete:'✓ Complete', almostDone:'Almost done', pastHalf:'Past halfway', inProgress:'In progress', waitDates:'Waiting for dates', endBeforeStart:'End must be after start', days:'d', share:'Share', screenshot:'Screenshot', weekBreak:'Monthly breakdown', reminder:'Remind at', remindNone:'Off', remindBefore7:'7 days left', remindBefore14:'14 days left', remindBefore30:'30 days left', remindActive:'⚠ Deadline soon!', themeToggle:'theme' }
};

const COLORS = ['#7c6af5','#f05252','#48c78e','#f0a030','#3b9eff','#f06292','#26c6da','#ff7043','#ab47bc'];
const SUB_COLORS = COLORS;
const CIRC = 2 * Math.PI * 72;

let lang = localStorage.getItem('dp-lang') || 'en';
let trackers = JSON.parse(localStorage.getItem('dp-trackers') || 'null') || [
  { id: 1, label: '', start: '', end: '', color: '#7c6af5', reminder: 'none', tags: [] }
];
let nextId = Math.max(...trackers.map(t => t.id)) + 1;
let confettiFired = new Set(JSON.parse(localStorage.getItem('dp-confetti') || '[]'));

let pomoData = JSON.parse(localStorage.getItem('pomo-data')) || { work: 45, break: 10, quietStart: '23:00', quietEnd: '07:00' };
let focusLog = JSON.parse(localStorage.getItem('focus-log') || '{}'); 

let habits = JSON.parse(localStorage.getItem('habits-data') || 'null') || [];
let quickLog = JSON.parse(localStorage.getItem('quick-log') || 'null') || { water: {}, sleep: {}, mood: {} };

let calCursor = new Date(); 

let currentDeckIndex = -1;
let currentReviewQueue = [];

function save() {
  localStorage.setItem('dp-trackers', JSON.stringify(trackers));
  localStorage.setItem('dp-lang', lang);
  localStorage.setItem('habits-data', JSON.stringify(habits));
  localStorage.setItem('quick-log', JSON.stringify(quickLog));
  localStorage.setItem('focus-log', JSON.stringify(focusLog));
}

function t(key) { return (T[lang] || T.en)[key] || key; }
function applyLang() {
  $('#app-title').textContent = '📅 ' + t('title');
  $('#add-label').textContent = t('addTracker');
  $('#lang-select').value = lang;
  renderAll();
}
$('#lang-select').addEventListener('change', e => {
  lang = e.target.value; save(); applyLang();
});

// ══════════════════════════════════════════════
//  BACKUP & RESTORE
// ══════════════════════════════════════════════
$('#export-btn').addEventListener('click', () => {
  const data = {
    theme: localStorage.getItem('dp-theme'), lang: localStorage.getItem('dp-lang'),
    trackers: localStorage.getItem('dp-trackers'), topics: localStorage.getItem('tp-data'),
    pomo: localStorage.getItem('pomo-data'), streak: localStorage.getItem('streak-data'),
    tt: localStorage.getItem('tt-data'), cl: localStorage.getItem('cl-data'), fc: localStorage.getItem('fc-data'),
    habits: localStorage.getItem('habits-data'), quicklog: localStorage.getItem('quick-log'), focuslog: localStorage.getItem('focus-log')
  };
  const blob = new Blob([JSON.stringify(data)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'date-progress-backup.json';
  a.click(); URL.revokeObjectURL(url); toast('Backup downloaded');
});
$('#import-btn').addEventListener('click', () => { $('#import-file').click(); });
$('#import-file').addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if(data.theme) localStorage.setItem('dp-theme', data.theme);
      if(data.lang) localStorage.setItem('dp-lang', data.lang);
      if(data.trackers) localStorage.setItem('dp-trackers', data.trackers);
      if(data.topics) localStorage.setItem('tp-data', data.topics);
      if(data.pomo) localStorage.setItem('pomo-data', data.pomo);
      if(data.streak) localStorage.setItem('streak-data', data.streak);
      if(data.tt) localStorage.setItem('tt-data', data.tt);
      if(data.cl) localStorage.setItem('cl-data', data.cl);
      if(data.fc) localStorage.setItem('fc-data', data.fc);
      if(data.habits) localStorage.setItem('habits-data', data.habits);
      if(data.quicklog) localStorage.setItem('quick-log', data.quicklog);
      if(data.focuslog) localStorage.setItem('focus-log', data.focuslog);
      alert('Data restored successfully! The page will now reload.'); location.reload();
    } catch(err) { alert('Invalid backup file.'); }
  };
  reader.readAsText(file);
});

// ══════════════════════════════════════════════
//  POMODORO TIMER (with quiet hours)
// ══════════════════════════════════════════════
let pomoTimeLeft = pomoData.work * 60; 
let isWorkSession = true; 
let isPomoRunning = false;
let sessionStartTs = null;

const pomoDisplay = $('#pomo-display');
const pomoStatus = $('#pomo-status');
const pomoBtnStart = $('#pomo-start');
const pomoBtnReset = $('#pomo-reset');

$('#pomo-work-in').value = pomoData.work; $('#pomo-break-in').value = pomoData.break;
$('#pomo-quiet-start').value = pomoData.quietStart || '23:00'; $('#pomo-quiet-end').value = pomoData.quietEnd || '07:00';

$('#pomo-settings-toggle').addEventListener('click', () => { $('#pomo-settings').classList.toggle('open'); });

function savePomoSettings() {
  pomoData = {
    work: parseInt($('#pomo-work-in').value)||25, break: parseInt($('#pomo-break-in').value)||5,
    quietStart: $('#pomo-quiet-start').value || '23:00', quietEnd: $('#pomo-quiet-end').value || '07:00'
  };
  localStorage.setItem('pomo-data', JSON.stringify(pomoData));
}
[$('#pomo-work-in'), $('#pomo-break-in'), $('#pomo-quiet-start'), $('#pomo-quiet-end')].forEach(inp => {
  inp.addEventListener('change', () => { savePomoSettings(); if(!isPomoRunning) resetPomo(); });
});

function isInQuietHours() {
  if (!pomoData.quietStart || !pomoData.quietEnd) return false;
  const now = new Date(); const cur = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = (pomoData.quietStart || '23:00').split(':').map(Number);
  const [eh, em] = (pomoData.quietEnd || '07:00').split(':').map(Number);
  const start = sh * 60 + sm, end = eh * 60 + em;
  if (start <= end) return cur >= start && cur < end;
  return cur >= start || cur < end;
}

function updatePomoDisplay() {
  const m = Math.floor(pomoTimeLeft / 60).toString().padStart(2, '0');
  const s = (pomoTimeLeft % 60).toString().padStart(2, '0');
  pomoDisplay.textContent = `${m}:${s}`; document.title = `${m}:${s} - Date Progress`;
}

function logFocusMinutes(mins) {
  const d = todayStr(); focusLog[d] = (focusLog[d] || 0) + mins; save();
}

function resetPomo() {
  clearInterval(window.pomoTimer); isPomoRunning = false; isWorkSession = true;
  pomoTimeLeft = pomoData.work * 60; pomoStatus.textContent = "Ready to Study";
  pomoStatus.style.color = "var(--accent)"; pomoBtnStart.textContent = "Start";
  updatePomoDisplay(); document.title = "Date Progress Tracker";
  if (sessionStartTs) { logFocusMinutes(Math.floor((Date.now() - sessionStartTs) / 60000)); sessionStartTs = null; }
}

pomoBtnStart.addEventListener('click', () => {
  if (isPomoRunning) { 
    clearInterval(window.pomoTimer); isPomoRunning = false; pomoBtnStart.textContent = "Resume";
    if (sessionStartTs) { logFocusMinutes(Math.max(1, Math.floor((Date.now() - sessionStartTs) / 60000))); sessionStartTs = null; }
  } else {
    if (isInQuietHours()) { toast('🌙 Quiet hours — auto-pausing', 2500); return; }
    isPomoRunning = true; pomoBtnStart.textContent = "Pause";
    pomoStatus.textContent = isWorkSession ? "Focusing..." : "Taking a Break!";
    sessionStartTs = Date.now();
    window.pomoTimer = setInterval(() => {
      if (isInQuietHours() && isWorkSession) {
        clearInterval(window.pomoTimer); isPomoRunning = false; pomoBtnStart.textContent = "Start";
        pomoStatus.textContent = "🌙 Paused (quiet hours)"; pomoStatus.style.color = "var(--muted)";
        if (sessionStartTs) { logFocusMinutes(Math.max(1, Math.floor((Date.now() - sessionStartTs)/60000))); sessionStartTs = null; }
        return toast('🌙 Quiet hours started', 2500);
      }
      pomoTimeLeft--; updatePomoDisplay();
      if (pomoTimeLeft <= 0) {
        clearInterval(window.pomoTimer); isPomoRunning = false;
        if (sessionStartTs) { logFocusMinutes(Math.max(1, Math.floor((Date.now() - sessionStartTs)/60000))); sessionStartTs = null; }
        const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); 
        osc.type = 'sine'; osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.5);
        sendNotification('Focus session complete!', { body: isWorkSession ? 'Time for a break 🎉' : 'Back to work 💪', icon: '⏱️' });
        isWorkSession = !isWorkSession; 
        pomoTimeLeft = (isWorkSession ? pomoData.work : pomoData.break) * 60;
        pomoStatus.textContent = isWorkSession ? "Ready to Focus" : "Time for a Break!";
        pomoStatus.style.color = isWorkSession ? "var(--accent)" : "#48c78e";
        pomoBtnStart.textContent = "Start " + (isWorkSession ? "Work" : "Break"); 
        updatePomoDisplay();
      }
    }, 1000);
  }
});
pomoBtnReset.addEventListener('click', resetPomo); 
updatePomoDisplay();

// ══════════════════════════════════════════════
//  TIMETABLE LOGIC
// ══════════════════════════════════════════════
function loadTTData() {
  let data = JSON.parse(localStorage.getItem('tt-data'));
  if (!data || data.length === 0) data = [ { id: Date.now()+1, start: "06:20", end: "07:30", label: "Wake up & Morning Routine", color: "#f0a030" } ];
  return data;
}

function renderTimeTable() {
  const data = loadTTData(); const list = $('#tt-list'); list.innerHTML = '';
  data.sort((a,b) => a.start.localeCompare(b.start)).forEach((block, index) => {
    const row = document.createElement('div'); row.className = 'tt-row';
    const dotWrap = document.createElement('div'); dotWrap.style.position = 'relative';
    const dot = document.createElement('div'); dot.className = 'tt-color'; dot.style.background = block.color;
    
    const popup = document.createElement('div'); popup.className = 'color-popup';
    COLORS.forEach(c => {
      const sw = document.createElement('div'); sw.className = 'cp-swatch'; sw.style.background = c;
      if(c === block.color) sw.classList.add('selected');
      sw.addEventListener('click', (e) => {
        e.stopPropagation(); block.color = c; localStorage.setItem('tt-data', JSON.stringify(data)); renderTimeTable();
      });
      popup.appendChild(sw);
    });
    dot.addEventListener('click', e => { e.stopPropagation(); popup.classList.toggle('open'); });
    document.addEventListener('click', () => popup.classList.remove('open'));
    dotWrap.append(dot, popup);

    const startIn = document.createElement('input'); startIn.type = 'time'; startIn.className = 'tt-time-input'; startIn.value = block.start;
    startIn.addEventListener('change', () => { block.start = startIn.value; localStorage.setItem('tt-data', JSON.stringify(data)); renderTimeTable(); });
    const span = document.createElement('span'); span.textContent = '-'; span.style.color = 'var(--muted)';
    const endIn = document.createElement('input'); endIn.type = 'time'; endIn.className = 'tt-time-input'; endIn.value = block.end;
    endIn.addEventListener('change', () => { block.end = endIn.value; localStorage.setItem('tt-data', JSON.stringify(data)); renderTimeTable(); });
    const lblIn = document.createElement('input'); lblIn.type = 'text'; lblIn.className = 'tt-label-input'; lblIn.value = block.label; lblIn.placeholder = "Activity name...";
    lblIn.addEventListener('input', () => { block.label = lblIn.value; localStorage.setItem('tt-data', JSON.stringify(data)); });
    const delBtn = document.createElement('button'); delBtn.className = 'tt-del-btn'; delBtn.textContent = '×';
    delBtn.addEventListener('click', () => { data.splice(index, 1); localStorage.setItem('tt-data', JSON.stringify(data)); renderTimeTable(); });
    row.append(dotWrap, startIn, span, endIn, lblIn, delBtn); list.appendChild(row);
  });
}
$('#tt-add-btn').addEventListener('click', () => {
  const data = loadTTData(); data.push({ id: Date.now(), start: "18:00", end: "19:00", label: "", color: COLORS[data.length % COLORS.length] });
  localStorage.setItem('tt-data', JSON.stringify(data)); renderTimeTable();
});
renderTimeTable();

// ══════════════════════════════════════════════
//  DAILY CHECKLIST LOGIC
// ══════════════════════════════════════════════
function loadCLData() {
  let data = JSON.parse(localStorage.getItem('cl-data')) || { date: '', tasks: [] };
  const today = todayStr();
  if (data.date !== today) { data.date = today; data.tasks.forEach(t => t.done = false); localStorage.setItem('cl-data', JSON.stringify(data)); }
  return data;
}

function renderChecklist() {
  const data = loadCLData(); $('#cl-date-display').textContent = new Date().toLocaleDateString(undefined, { weekday:'long', month:'short', day:'numeric' });
  const list = $('#cl-list'); list.innerHTML = '';
  data.tasks.forEach((task, index) => {
    const item = document.createElement('div'); item.className = 'cl-item';
    const chk = document.createElement('div'); chk.className = 'cl-check' + (task.done ? ' checked' : '');
    const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'cl-text' + (task.done ? ' done' : ''); inp.value = task.text;
    inp.addEventListener('input', () => { task.text = inp.value; localStorage.setItem('cl-data', JSON.stringify(data)); });
    chk.addEventListener('click', () => {
      task.done = !task.done; chk.classList.toggle('checked', task.done); inp.classList.toggle('done', task.done);
      localStorage.setItem('cl-data', JSON.stringify(data));
    });
    const del = document.createElement('button'); del.className = 'cl-del'; del.innerHTML = '×';
    del.addEventListener('click', () => { data.tasks.splice(index, 1); localStorage.setItem('cl-data', JSON.stringify(data)); renderChecklist(); });
    item.append(chk, inp, del); list.appendChild(item);
  });
}

$('#cl-add-btn').addEventListener('click', addClTask);
$('#cl-input').addEventListener('keydown', e => { if (e.key === 'Enter') addClTask(); });

function addClTask() {
  const inp = $('#cl-input'); const text = inp.value.trim(); if (!text) return;
  const data = loadCLData(); data.tasks.push({ text: text, done: false });
  localStorage.setItem('cl-data', JSON.stringify(data)); inp.value = ''; renderChecklist();
}
renderChecklist();

// ══════════════════════════════════════════════
//  HEATMAP STREAK LOGIC
// ══════════════════════════════════════════════
function renderHeatmap() {
  const streakData = JSON.parse(localStorage.getItem('streak-data') || '{}');
  const grid = $('#heatmap-grid'); grid.innerHTML = '';
  const today = new Date();
  for(let i=69; i>=0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i); const dStr = dateStr(d);
    const cell = document.createElement('div'); cell.className = 'heatmap-cell' + (streakData[dStr] ? ' done' : '');
    cell.title = dStr + (streakData[dStr] ? ' (Goal Met)' : ''); grid.appendChild(cell);
  }
}
setTimeout(renderHeatmap, 100);

// ══════════════════════════════════════════════
//  FLASHCARD LOGIC (SM-2 spaced repetition)
// ══════════════════════════════════════════════
function loadFCData() { return JSON.parse(localStorage.getItem('fc-data')) || []; }
function saveFCData(data) { localStorage.setItem('fc-data', JSON.stringify(data)); }

function sm2Init(card) {
  card.ef = 2.5; card.interval = 0; card.reps = 0; card.lapses = 0; card.nextReview = 0; return card;
}
function sm2Review(card, quality) {
  if (quality === 0) { card.lapses = (card.lapses || 0) + 1; card.reps = 0; card.interval = 1; } 
  else {
    card.reps = (card.reps || 0) + 1;
    if (card.reps === 1) card.interval = 1;
    else if (card.reps === 2) card.interval = 6;
    else card.interval = Math.round((card.interval || 1) * (card.ef || 2.5));
    if (quality === 1) card.interval = Math.max(1, Math.round(card.interval * 0.8));
    if (quality === 3) card.interval = Math.round(card.interval * 1.3);
  }
  const newEf = (card.ef || 2.5) + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
  card.ef = Math.max(1.3, newEf); card.nextReview = Date.now() + card.interval * 86400000;
  return card;
}

function renderFCDecks() {
  const data = loadFCData(); const list = $('#fc-decks-list'); list.innerHTML = '';
  data.forEach((deck, i) => {
    const now = Date.now(); const dueCount = deck.cards.filter(c => c.nextReview <= now).length;
    const row = document.createElement('div'); row.className = 'fc-deck-row';
    const info = document.createElement('div'); info.className = 'fc-deck-info';
    info.innerHTML = `<h4>${escapeHtml(deck.name)}</h4><span>${deck.cards.length} cards · <b style="color:${dueCount>0?'var(--hard)':'var(--easy)'}">${dueCount} due</b></span>`;
    
    const actions = document.createElement('div');
    const addBtn = document.createElement('button'); addBtn.className = 'fc-review-btn'; addBtn.style.background = 'var(--surface2)'; addBtn.style.border = '1px solid var(--border)'; addBtn.style.color = 'var(--text)'; addBtn.style.marginRight = '5px'; addBtn.textContent = '+ Add'; addBtn.onclick = (e) => { e.stopPropagation(); openFCEditor(i); };
    const revBtn = document.createElement('button'); revBtn.className = 'fc-review-btn'; revBtn.textContent = 'Review';
    if(dueCount === 0) { revBtn.style.opacity = '0.5'; revBtn.textContent = 'Done'; }
    revBtn.onclick = (e) => { e.stopPropagation(); startReview(i); };
    const delBtn = document.createElement('button'); delBtn.className = 'fc-del-deck'; delBtn.innerHTML = '×';
    delBtn.onclick = (e) => { e.stopPropagation(); if(confirm('Delete deck?')) { data.splice(i,1); saveFCData(data); renderFCDecks(); } };

    actions.append(addBtn, revBtn, delBtn); row.append(info, actions); list.appendChild(row);
  });
}

$('#fc-add-deck-btn').onclick = () => { $('#fc-new-deck-row').style.display = $('#fc-new-deck-row').style.display === 'none' ? 'flex' : 'none'; };
$('#fc-save-deck-btn').onclick = () => {
  const inp = $('#fc-new-deck-in'); if(!inp.value.trim()) return;
  const data = loadFCData(); data.push({ name: inp.value.trim(), cards: [] }); saveFCData(data);
  inp.value = ''; $('#fc-new-deck-row').style.display = 'none'; renderFCDecks();
};

function openFCEditor(deckIndex) { currentDeckIndex = deckIndex; $('#fc-editor-title').textContent = "Adding to: " + loadFCData()[deckIndex].name; $('#fc-editor').classList.add('open'); }
$('#fc-close-editor-btn').onclick = () => { $('#fc-editor').classList.remove('open'); renderFCDecks(); };
$('#fc-save-card-btn').onclick = () => {
  const qIn = $('#fc-q-in'), aIn = $('#fc-a-in'); if(!qIn.value.trim() || !aIn.value.trim()) return;
  const data = loadFCData(); data[currentDeckIndex].cards.push(sm2Init({ q: qIn.value.trim(), a: aIn.value.trim() }));
  saveFCData(data); qIn.value = ''; aIn.value = ''; qIn.focus(); toast('Card added');
};

function startReview(deckIndex) {
  const data = loadFCData(); const now = Date.now(); currentDeckIndex = deckIndex;
  currentReviewQueue = data[deckIndex].cards.map((c, idx) => ({ card: c, idx })).filter(o => o.card.nextReview <= now);
  if(currentReviewQueue.length === 0) return toast('No cards due right now!');
  $('#fc-decks-list').style.display = 'none'; $('#fc-add-deck-btn').style.display = 'none'; $('#fc-flip-container').style.display = 'block'; $('#fc-end-review-btn').style.display = 'block';
  showNextCard();
}

function showNextCard() {
  if(currentReviewQueue.length === 0) { endReview(); return; }
  const { card } = currentReviewQueue[0];
  $('#fc-front-text').textContent = card.q; $('#fc-back-text').textContent = card.a;
  $('#fc-flip-container').classList.remove('flipped'); $('#fc-review-controls').style.display = 'none';
  $('#fc-meta').textContent = `Interval: ${card.interval || 0}d · Ease: ${(card.ef || 2.5).toFixed(2)} · Reps: ${card.reps || 0}`;
}

$('#fc-flip-container').onclick = function() {
  if(currentReviewQueue.length === 0) return;
  this.classList.toggle('flipped');
  $('#fc-review-controls').style.display = this.classList.contains('flipped') ? 'flex' : 'none';
};

$$('.fc-btn[data-q]').forEach(btn => {
  btn.addEventListener('click', () => {
    const q = parseInt(btn.dataset.q); if (currentReviewQueue.length === 0) return;
    const item = currentReviewQueue.shift(); const data = loadFCData();
    const realCard = data[currentDeckIndex].cards[item.idx];
    if (realCard) { sm2Review(realCard, q); saveFCData(data); }
    showNextCard();
  });
});

function endReview() {
  $('#fc-decks-list').style.display = 'block'; $('#fc-add-deck-btn').style.display = 'block';
  $('#fc-flip-container').style.display = 'none'; $('#fc-review-controls').style.display = 'none'; $('#fc-end-review-btn').style.display = 'none';
  $('#fc-meta').textContent = ''; renderFCDecks(); toast('Review complete 🎉');
}
$('#fc-end-review-btn').onclick = endReview;

renderFCDecks();

// ══════════════════════════════════════════════
//  HABITS / GOALS
// ══════════════════════════════════════════════
const HABIT_EMOJIS = ['💪','📚','🏃','🧘','💧','🥗','😴','✍️','🎨','🎵','🧹','🌱','🧠','☀️','🌙'];
function computeHabitStreak(history) {
  let streak = 0; const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i); const ds = dateStr(d);
    if (history[ds]) streak++; else if (i > 0) break; else continue;
  } return streak;
}
function renderHabits() {
  const list = $('#habits-list'); const empty = $('#habit-empty-msg'); list.innerHTML = '';
  if (habits.length === 0) { empty.style.display = 'block'; return; }
  empty.style.display = 'none'; const today = todayStr();
  habits.forEach((h, hi) => {
    const streak = computeHabitStreak(h.history || {}); const doneToday = !!(h.history && h.history[today]);
    const card = document.createElement('div'); card.className = 'habit-card';
    card.innerHTML = `
      <div class="habit-row">
        <div class="habit-emoji">${h.emoji || '⭐'}</div>
        <div class="habit-info">
          <input class="habit-name-input" type="text" value="${escapeHtml(h.name || '')}" placeholder="Habit name…">
          <div class="habit-streak">🔥 <b>${streak}</b> day${streak !== 1 ? 's' : ''} · ${Object.keys(h.history || {}).length} total</div>
        </div>
        <button class="habit-check-btn ${doneToday ? 'done' : ''}" data-hi="${hi}"></button>
        <button class="habit-del-btn" data-di="${hi}">×</button>
      </div>
      <div class="habit-week">
        ${(() => {
          let html = ''; const todayDate = new Date();
          for (let i = 6; i >= 0; i--) {
            const d = new Date(todayDate); d.setDate(d.getDate() - i); const ds = dateStr(d);
            const dn = d.toLocaleDateString(undefined, { weekday: 'narrow' }); const isToday = (i === 0);
            html += `<div class="habit-week-day${isToday ? ' today' : ''}"><div class="habit-week-cell${(h.history && h.history[ds]) ? ' done' : ''}"></div>${dn}</div>`;
          }
          return html;
        })()}
      </div>`;
    list.appendChild(card);
  });
  list.querySelectorAll('.habit-name-input').forEach((inp, i) => { inp.addEventListener('input', () => { habits[i].name = inp.value; save(); }); });
  list.querySelectorAll('.habit-check-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.hi); habits[i].history = habits[i].history || {};
      if (habits[i].history[today]) delete habits[i].history[today]; else habits[i].history[today] = true;
      save(); renderHabits();
    });
  });
  list.querySelectorAll('.habit-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.di); if (confirm('Delete this habit?')) { habits.splice(i, 1); save(); renderHabits(); }
    });
  });
}
$('#habit-add-btn').addEventListener('click', () => {
  showModal(`
    <h3>Add a new habit</h3>
    <div style="font-size:0.7rem; color:var(--muted); margin-bottom:0.4rem;">Pick an emoji</div>
    <div id="emoji-picker" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:0.75rem;">
      ${HABIT_EMOJIS.map(e => `<button class="log-btn" data-e="${e}" style="flex:0 0 auto; font-size:1.4rem; padding:6px 10px;">${e}</button>`).join('')}
    </div>
    <input type="text" id="habit-name-modal" class="fc-input" placeholder="e.g. Read 20 mins">
    <div class="modal-row"><button class="modal-btn" id="habit-cancel">Cancel</button><button class="modal-btn primary" id="habit-save">Save</button></div>
  `);
  let chosen = HABIT_EMOJIS[0];
  $$('#emoji-picker .log-btn').forEach(b => {
    b.addEventListener('click', () => { $$('#emoji-picker .log-btn').forEach(x => x.style.borderColor = 'var(--border)'); b.style.borderColor = 'var(--accent)'; chosen = b.dataset.e; });
  });
  $('#habit-cancel').addEventListener('click', hideModal);
  $('#habit-save').addEventListener('click', () => {
    const name = $('#habit-name-modal').value.trim(); if (!name) return;
    habits.push({ name, emoji: chosen, history: {}, created: todayStr() }); save(); renderHabits(); hideModal(); toast('Habit added');
  });
});

// ══════════════════════════════════════════════
//  QUICK LOG (water, sleep, mood)
// ══════════════════════════════════════════════
function renderQuickLog() {
  const today = todayStr();
  const w = (quickLog.water && quickLog.water[today]) || 0; $('#log-water-num').textContent = w; $('#log-water-fill').style.width = Math.min(100, (w / 8) * 100) + '%';
  const s = (quickLog.sleep && quickLog.sleep[today]) || 0; $('#log-sleep-num').textContent = s.toFixed(1); $('#log-sleep-fill').style.width = Math.min(100, (s / 8) * 100) + '%';
  const m = (quickLog.mood && quickLog.mood[today]) || 0; $$('#mood-row .mood-btn').forEach(b => b.classList.toggle('selected', parseInt(b.dataset.mood) === m));
  
  const weekMoods = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); const mv = (quickLog.mood && quickLog.mood[dateStr(d)]); if (mv) weekMoods.push(mv);
  }
  $('#mood-week-note').textContent = weekMoods.length > 0 ? `7-day average: ${(weekMoods.reduce((a, b) => a + b, 0) / weekMoods.length).toFixed(1)} / 5` : '';
  renderQuickLogChart();
}
function renderQuickLogChart() {
  const wrap = $('#chart-quicklog'); if (!wrap) return;
  const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push({ date: d, ds: dateStr(d) }); }
  const W = 460, H = 140, padL = 30, padB = 22, padT = 8, padR = 8; const innerW = W - padL - padR, innerH = H - padT - padB; const colW = innerW / days.length;
  const waterVals = days.map(d => (quickLog.water && quickLog.water[d.ds]) || 0); const sleepVals = days.map(d => (quickLog.sleep && quickLog.sleep[d.ds]) || 0);
  let bars = '';
  days.forEach((d, i) => {
    const x = padL + i * colW, wv = Math.min(1, waterVals[i] / 8), sv = Math.min(1, sleepVals[i] / 12);
    const bw = Math.max(2, colW * 0.32), wH = wv * innerH, sH = sv * innerH;
    const wX = x + (colW - 2*bw - 2) / 2, sX = wX + bw + 2;
    bars += `<rect class="chart-bar" x="${wX}" y="${padT + innerH - wH}" width="${bw}" height="${wH}" rx="2" fill="#3b9eff" opacity="0.85"><title>Water: ${waterVals[i]} cups</title></rect>`;
    bars += `<rect class="chart-bar" x="${sX}" y="${padT + innerH - sH}" width="${bw}" height="${sH}" rx="2" fill="#ab47bc" opacity="0.85"><title>Sleep: ${sleepVals[i].toFixed(1)}h</title></rect>`;
    bars += `<text class="chart-axis" x="${x + colW/2}" y="${H - 6}" text-anchor="middle">${d.date.toLocaleDateString(undefined, { weekday: 'narrow' })}</text>`;
  });
  wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto;">
    <line class="chart-grid" x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+innerH}"/><line class="chart-grid" x1="${padL}" y1="${padT+innerH/2}" x2="${W-padR}" y2="${padT+innerH/2}"/><line class="chart-grid" x1="${padL}" y1="${padT+innerH}" x2="${W-padR}" y2="${padT+innerH}"/>
    ${bars}<g transform="translate(${padL-2},${padT+8})"><rect width="8" height="8" fill="#3b9eff" rx="2"/><text class="chart-axis" x="12" y="8">Water</text><rect x="58" width="8" height="8" fill="#ab47bc" rx="2"/><text class="chart-axis" x="70" y="8">Sleep</text></g></svg>`;
}

$('#log-water-plus').addEventListener('click', () => { const t = todayStr(); quickLog.water = quickLog.water || {}; quickLog.water[t] = Math.min(20, (quickLog.water[t] || 0) + 1); save(); renderQuickLog(); });
$('#log-water-minus').addEventListener('click', () => { const t = todayStr(); quickLog.water = quickLog.water || {}; quickLog.water[t] = Math.max(0, (quickLog.water[t] || 0) - 1); save(); renderQuickLog(); });
$('#log-water-reset').addEventListener('click', () => { const t = todayStr(); if (quickLog.water) quickLog.water[t] = 0; save(); renderQuickLog(); });
$('#log-sleep-plus').addEventListener('click', () => { const t = todayStr(); quickLog.sleep = quickLog.sleep || {}; quickLog.sleep[t] = Math.min(16, ((quickLog.sleep[t] || 0) + 0.5)); save(); renderQuickLog(); });
$('#log-sleep-minus').addEventListener('click', () => { const t = todayStr(); quickLog.sleep = quickLog.sleep || {}; quickLog.sleep[t] = Math.max(0, ((quickLog.sleep[t] || 0) - 0.5)); save(); renderQuickLog(); });
$$('#mood-row .mood-btn').forEach(b => { b.addEventListener('click', () => { const t = todayStr(); quickLog.mood = quickLog.mood || {}; const m = parseInt(b.dataset.mood); quickLog.mood[t] = (quickLog.mood[t] === m) ? 0 : m; save(); renderQuickLog(); }); });

// ══════════════════════════════════════════════
//  SVG CHART HELPERS
// ══════════════════════════════════════════════
function renderLineChart(container, data, options = {}) {
  const W = 460, H = 140, padL = 30, padB = 22, padT = 12, padR = 8;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(1, ...data.map(d => d.value));
  const accent = options.color || '#7c6af5';
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  let pts = []; data.forEach((d, i) => { pts.push([padL + (data.length === 1 ? innerW/2 : i * stepX), padT + innerH - (d.value / max) * innerH]); });
  const linePath = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
  const areaPath = pts.length > 0 ? `${linePath} L ${pts[pts.length-1][0]} ${padT+innerH} L ${pts[0][0]} ${padT+innerH} Z` : '';
  const circles = pts.map((p, i) => `<circle class="chart-point" cx="${p[0]}" cy="${p[1]}" r="3.5"><title>${data[i].label}: ${data[i].value}</title></circle>`).join('');
  const labels = data.map((d, i) => `<text class="chart-axis" x="${padL + (data.length === 1 ? innerW/2 : i * stepX)}" y="${H - 6}" text-anchor="middle">${d.label}</text>`).join('');
  const grid = `<line class="chart-grid" x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+innerH}"/><line class="chart-grid" x1="${padL}" y1="${padT+innerH/2}" x2="${W-padR}" y2="${padT+innerH/2}"/><line class="chart-grid" x1="${padL}" y1="${padT+innerH}" x2="${W-padR}" y2="${padT+innerH}"/><text class="chart-axis" x="${padL-4}" y="${padT+innerH+3}" text-anchor="end">0</text><text class="chart-axis" x="${padL-4}" y="${padT+innerH/2+3}" text-anchor="end">${Math.round(max/2)}</text><text class="chart-axis" x="${padL-4}" y="${padT+5}" text-anchor="end">${max}</text>`;
  container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto;">${grid}<path class="chart-area" d="${areaPath}"/><path class="chart-line" d="${linePath}" stroke="${accent}"/>${circles}${labels}</svg>`;
}
function renderBarChart(container, data, options = {}) {
  const W = 460, H = 140, padL = 30, padB = 22, padT = 12, padR = 8;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(1, ...data.map(d => d.value));
  const color = options.color || '#7c6af5';
  const colW = innerW / Math.max(1, data.length); const bw = Math.max(4, colW * 0.55);
  let bars = '';
  data.forEach((d, i) => {
    const x = padL + i * colW + (colW - bw) / 2; const h = (d.value / max) * innerH;
    bars += `<rect class="chart-bar" x="${x}" y="${padT + innerH - h}" width="${bw}" height="${h}" rx="3" fill="${color}"><title>${d.label}: ${d.value}</title></rect><text class="chart-axis" x="${x + bw/2}" y="${H - 6}" text-anchor="middle">${d.label}</text>`;
  });
  container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto;"><line class="chart-grid" x1="${padL}" y1="${padT+innerH}" x2="${W-padR}" y2="${padT+innerH}"/><line class="chart-grid" x1="${padL}" y1="${padT+innerH/2}" x2="${W-padR}" y2="${padT+innerH/2}"/><line class="chart-grid" x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+innerH}"/>${bars}</svg>`;
}

// ══════════════════════════════════════════════
//  DASHBOARD (stats + charts + share card)
// ══════════════════════════════════════════════
function getTrackerPct(tracker) {
  if (!tracker.start || !tracker.end) return 0;
  const s = new Date(tracker.start), e = new Date(tracker.end); if (e <= s) return 0;
  const now = new Date(); now.setHours(0,0,0,0); const total = Math.round((e - s) / 86400000);
  const elapsed = Math.max(0, Math.min(total, Math.round((now - s) / 86400000)));
  return Math.round((elapsed / total) * 100);
}
function getStreakDays() {
  const streakData = JSON.parse(localStorage.getItem('streak-data') || '{}');
  let s = 0; const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    if (streakData[dateStr(d)]) s++; else if (i > 0) break;
  } return s;
}
function getTopicsDoneLast7Days() {
  const tp = JSON.parse(localStorage.getItem('tp-data') || 'null') || { subjects: [] };
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); const ds = dateStr(d);
    if (ds === (tp.lastReset || '')) { let c = 0; tp.subjects.forEach(sub => sub.topics.forEach(t => { if (t.checked) c++; })); days.push(c); } 
    else days.push(0);
  } return days;
}
function renderDashboard() {
  const today = todayStr();
  const streak = getStreakDays();
  const tp = JSON.parse(localStorage.getItem('tp-data') || 'null') || { goal: 3, subjects: [] };
  const doneToday = (() => { let n = 0; tp.subjects.forEach(sub => sub.topics.forEach(t => { if (t.checked) n++; })); return n; })();
  const goalPct = Math.min(100, Math.round((doneToday / Math.max(1, tp.goal)) * 100));
  const fc = JSON.parse(localStorage.getItem('fc-data') || '[]');
  const dueCards = fc.reduce((sum, deck) => sum + deck.cards.filter(c => c.nextReview <= Date.now()).length, 0);
  const todayFocus = focusLog[today] || 0;
  
  $('#dash-stats').innerHTML = `
    <div class="dash-card"><div class="dash-num">🔥 ${streak}</div><div class="dash-label">Day streak</div></div>
    <div class="dash-card"><div class="dash-num">${doneToday}/${tp.goal}</div><div class="dash-label">Topics today</div><div class="dash-sub">${goalPct}% to goal</div></div>
    <div class="dash-card"><div class="dash-num">⏱️ ${todayFocus}m</div><div class="dash-label">Focus today</div></div>
    <div class="dash-card"><div class="dash-num">📇 ${dueCards}</div><div class="dash-label">Cards due</div></div>`;

  const weekData = getTopicsDoneLast7Days().map((v, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return { value: v, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }) }; });
  renderLineChart($('#chart-weekly'), weekData, { color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() });

  const focusData = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); focusData.push({ value: focusLog[dateStr(d)] || 0, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }) }); }
  renderBarChart($('#chart-focus'), focusData, { color: '#48c78e' });

  const trackerBars = trackers.filter(t => t.start && t.end).map(t => ({ value: getTrackerPct(t), label: (t.label || 'Tracker').slice(0, 10) }));
  if (trackerBars.length > 0) renderBarChart($('#chart-tracker'), trackerBars, { color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() });
  else $('#chart-tracker').innerHTML = '<div style="text-align:center; color:var(--muted); font-size:0.8rem; padding:1rem 0;">No active trackers yet</div>';

  $('#share-streak').textContent = `🔥 ${streak} day streak`;
  $('#share-num').textContent = `${goalPct}%`;
  $('#share-sub').textContent = `${doneToday}/${tp.goal} topics today`;
  $('#share-row').innerHTML = `<div class="share-card-mini"><div class="share-card-mini-num">${todayFocus}m</div><div class="share-card-mini-name">Focus</div></div><div class="share-card-mini"><div class="share-card-mini-num">${doneToday}</div><div class="share-card-mini-name">Topics</div></div><div class="share-card-mini"><div class="share-card-mini-num">${habits.filter(h => h.history && h.history[today]).length}</div><div class="share-card-mini-name">Habits</div></div>`;
}

$('#share-png-btn').addEventListener('click', async () => {
  if (typeof html2canvas === 'undefined') return toast('Screenshot library not loaded');
  const canvas = await html2canvas($('#share-card-preview'), { backgroundColor: null, scale: 2 });
  const link = document.createElement('a'); link.download = 'date-progress.png'; link.href = canvas.toDataURL(); link.click(); toast('PNG saved');
});
$('#share-text-btn').addEventListener('click', () => {
  const t = todayStr(); const tp = JSON.parse(localStorage.getItem('tp-data') || 'null') || { goal: 3, subjects: [] };
  const doneToday = (() => { let n = 0; tp.subjects.forEach(sub => sub.topics.forEach(t => { if (t.checked) n++; })); return n; })();
  const txt = `📅 Date Progress — ${todayStr()}\n🔥 ${getStreakDays()} day streak\n📚 ${doneToday}/${tp.goal} topics today\n⏱️ ${focusLog[t]||0}m focus\n🎯 ${habits.filter(h => h.history && h.history[todayStr()]).length} habits done`;
  if (navigator.share) navigator.share({ text: txt }); else { navigator.clipboard.writeText(txt).then(() => toast('Copied to clipboard')); }
});

// ══════════════════════════════════════════════
//  CALENDAR VIEW
// ══════════════════════════════════════════════
function renderCalendar() {
  const y = calCursor.getFullYear(), m = calCursor.getMonth();
  $('#cal-month-title').textContent = calCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  $('#cal-weekdays').innerHTML = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="cal-weekday">${d}</div>`).join('');
  const startOffset = new Date(y, m, 1).getDay(); const totalDays = new Date(y, m+1, 0).getDate();
  const todayD = todayStr(); const grid = $('#cal-grid'); grid.innerHTML = '';
  for (let i = 0; i < startOffset; i++) { const e = document.createElement('div'); e.className = 'cal-day empty'; grid.appendChild(e); }
  const streakData = JSON.parse(localStorage.getItem('streak-data') || '{}');
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(y, m, day); const ds = dateStr(d);
    const cell = document.createElement('div'); cell.className = 'cal-day' + (ds === todayD ? ' today' : '');
    cell.innerHTML = `<div class="cal-day-num">${day}</div><div class="cal-day-dots" id="cal-dots-${ds}"></div>`;
    if (streakData[ds]) { const h = document.createElement('div'); h.className = 'cal-day-heat'; h.style.background = '#48c78e'; cell.appendChild(h); }
    const dots = cell.querySelector('.cal-day-dots'); const deadlines = trackers.filter(t => t.end === ds);
    deadlines.slice(0, 3).forEach(t => { const dot = document.createElement('div'); dot.className = 'cal-day-dot'; dot.style.background = t.color || '#f05252'; dot.title = 'Deadline: ' + (t.label || 'Tracker'); dots.appendChild(dot); });
    if (deadlines.length > 3) { const more = document.createElement('div'); more.className = 'cal-day-dot'; more.style.background = 'var(--muted)'; dots.appendChild(more); }
    if (streakData[ds] && deadlines.length === 0) { const dot = document.createElement('div'); dot.className = 'cal-day-dot'; dot.style.background = '#48c78e'; dot.title = 'Topics done'; dots.appendChild(dot); }
    cell.addEventListener('click', () => showCalDayDetail(ds, d)); grid.appendChild(cell);
  }
}
$('#cal-prev').addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth() - 1); renderCalendar(); });
$('#cal-next').addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth() + 1); renderCalendar(); });

function showCalDayDetail(ds, d) {
  const wrap = $('#cal-day-detail'); const dn = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const streakData = JSON.parse(localStorage.getItem('streak-data') || '{}'); const items = [];
  trackers.forEach(t => {
    if (t.start === ds) items.push({ color: t.color, text: 'Tracker started: ' + (t.label || 'Untitled') });
    if (t.end === ds) items.push({ color: t.color, text: 'Tracker ends: ' + (t.label || 'Untitled') });
  });
  if (streakData[ds]) items.push({ color: '#48c78e', text: 'Daily goal met' });
  const w = (quickLog.water && quickLog.water[ds]) || 0; const sl = (quickLog.sleep && quickLog.sleep[ds]) || 0; const md = (quickLog.mood && quickLog.mood[ds]) || 0;
  if (w) items.push({ color: '#3b9eff', text: `Water: ${w} cups` }); if (sl) items.push({ color: '#ab47bc', text: `Sleep: ${sl}h` }); if (md) items.push({ color: 'var(--easy)', text: `Mood: ${['—','😞','😐','🙂','😄','🤩'][md]}` });
  const focus = focusLog[ds] || 0; if (focus) items.push({ color: 'var(--accent)', text: `Focus: ${focus} minutes` });
  
  if (items.length === 0) wrap.innerHTML = `<h4>${dn}</h4><div style="font-size:0.8rem; color:var(--muted);">No data for this day</div>`;
  else wrap.innerHTML = `<h4>${dn}</h4><ul>${items.map(it => `<li><span class="cal-li-dot" style="background:${it.color};"></span>${escapeHtml(it.text)}</li>`).join('')}</ul>`;
  wrap.style.display = 'block';
}

// ══════════════════════════════════════════════
//  WEEKLY REVIEW
// ══════════════════════════════════════════════
function renderWeeklyReview() {
  const wrap = $('#weekly-review-content'); if (!wrap) return;
  let topicsTotal = 0, focusTotal = 0, daysWithGoal = 0, daysWithWater = 0, moodSum = 0, moodCount = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); const ds = dateStr(d);
    const c = (getTopicsDoneLast7Days()[6 - i]) || 0; topicsTotal += c;
    focusTotal += (focusLog[ds] || 0);
    const w = (quickLog.water && quickLog.water[ds]) || 0; if (w >= 4) daysWithWater++;
    const m = (quickLog.mood && quickLog.mood[ds]) || 0; if (m) { moodSum += m; moodCount++; }
    if (JSON.parse(localStorage.getItem('streak-data') || '{}')[ds]) daysWithGoal++;
  }
  const avgMood = moodCount ? (moodSum / moodCount).toFixed(1) : '—';
  const habitsThisWeek = (() => { let c = 0; habits.forEach(h => { for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (h.history && h.history[dateStr(d)]) c++; } }); return c; })();
  
  let highlight = '';
  if (daysWithGoal >= 5) highlight = `🎉 You hit your daily goal on ${daysWithGoal}/7 days this week — fantastic consistency!`;
  else if (daysWithGoal >= 3) highlight = `💪 Solid week — ${daysWithGoal}/7 days with goal met. Keep the rhythm going.`;
  else if (topicsTotal > 0) highlight = `🌱 You showed up ${daysWithGoal}/7 days. Small steps compound — try one more tomorrow.`;
  else highlight = `📝 Fresh start. Pick 1 small goal and crush it tomorrow.`;

  wrap.innerHTML = `
    <div class="review-stat-grid"><div class="review-stat"><div class="review-stat-num">${topicsTotal}</div><div class="review-stat-name">Topics (7d)</div></div><div class="review-stat"><div class="review-stat-num">${focusTotal}m</div><div class="review-stat-name">Focus (7d)</div></div><div class="review-stat"><div class="review-stat-num">${daysWithGoal}/7</div><div class="review-stat-name">Goal days</div></div><div class="review-stat"><div class="review-stat-num">${avgMood}</div><div class="review-stat-name">Avg mood</div></div><div class="review-stat"><div class="review-stat-num">${habitsThisWeek}</div><div class="review-stat-name">Habit hits</div></div><div class="review-stat"><div class="review-stat-num">${(topicsTotal / 7).toFixed(1)}</div><div class="review-stat-name">Avg topics/day</div></div></div>
    <div class="review-highlight"><h4>✨ This week</h4><p>${highlight}</p></div>
    <div style="margin-top: 0.75rem; padding: 0.5rem 0;"><div class="review-bullet"><div class="review-bullet-dot" style="background:#3b9eff;"></div> Hydrated well on ${daysWithWater}/7 days</div><div class="review-bullet"><div class="review-bullet-dot" style="background:var(--accent);"></div> Focused for ${Math.round(focusTotal/60 * 10)/10} hours total</div><div class="review-bullet"><div class="review-bullet-dot" style="background:var(--easy);"></div> Active habits: ${habits.length} (${habitsThisWeek} completions)</div></div>
  `;
}

// ══════════════════════════════════════════════
//  SEARCH
// ══════════════════════════════════════════════
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function highlight(s, q) {
  if (!q) return escapeHtml(s);
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
  return escapeHtml(s).replace(re, '<mark>$1</mark>');
}
function performSearch() {
  const q = $('#search-input').value.trim(); const results = $('#search-results');
  $('#search-clear').classList.toggle('show', !!q);
  if (!q) { results.innerHTML = '<div class="search-empty">Type to search across trackers, topics, and flashcards.</div>'; return; }
  const ql = q.toLowerCase(); const matches = { trackers: [], topics: [], cards: [], checklist: [], habits: [] };
  
  trackers.forEach(t => { if ((t.label || '').toLowerCase().includes(ql) || (t.tags || []).some(tag => tag.toLowerCase().includes(ql))) matches.trackers.push(t); });
  const tp = JSON.parse(localStorage.getItem('tp-data') || 'null') || { subjects: [] };
  tp.subjects.forEach(sub => {
    if ((sub.name || '').toLowerCase().includes(ql)) matches.topics.push({ name: sub.name, sub: 'Subject' });
    sub.topics.forEach(t => { if ((t.name || '').toLowerCase().includes(ql)) matches.topics.push({ name: t.name, sub: sub.name || 'Untitled subject' }); });
  });
  JSON.parse(localStorage.getItem('fc-data') || '[]').forEach(deck => { deck.cards.forEach(c => { if ((c.q || '').toLowerCase().includes(ql) || (c.a || '').toLowerCase().includes(ql)) matches.cards.push({ q: c.q, a: c.a, deck: deck.name }); }); });
  (JSON.parse(localStorage.getItem('cl-data')) || { tasks: [] }).tasks.forEach(t => { if ((t.text || '').toLowerCase().includes(ql)) matches.checklist.push(t); });
  habits.forEach(h => { if ((h.name || '').toLowerCase().includes(ql)) matches.habits.push(h); });

  let html = '';
  if (matches.trackers.length) html += `<div class="search-section"><h4>📅 Trackers (${matches.trackers.length})</h4>${matches.trackers.slice(0, 10).map(t => `<div class="search-result" data-tab="tab-dash"><span class="search-result-icon">📅</span><div class="search-result-text"><strong>${highlight(t.label || 'Untitled', q)}</strong><span>${t.start || '—'} → ${t.end || '—'}</span></div></div>`).join('')}</div>`;
  if (matches.topics.length) html += `<div class="search-section"><h4>📚 Topics (${matches.topics.length})</h4>${matches.topics.slice(0, 10).map(o => `<div class="search-result" data-tab="tab-topics"><span class="search-result-icon">📚</span><div class="search-result-text"><strong>${highlight(o.name, q)}</strong><span>in ${escapeHtml(o.sub)}</span></div></div>`).join('')}</div>`;
  if (matches.cards.length) html += `<div class="search-section"><h4>📇 Flashcards (${matches.cards.length})</h4>${matches.cards.slice(0, 10).map(o => `<div class="search-result" data-tab="tab-topics"><span class="search-result-icon">📇</span><div class="search-result-text"><strong>${highlight(o.q, q)}</strong><span>${highlight(o.a.slice(0,60), q)}${o.a.length>60?'…':''} · ${escapeHtml(o.deck)}</span></div></div>`).join('')}</div>`;
  if (matches.habits.length) html += `<div class="search-section"><h4>🎯 Habits (${matches.habits.length})</h4>${matches.habits.slice(0, 10).map(h => `<div class="search-result" data-tab="tab-goals"><span class="search-result-icon">${h.emoji || '🎯'}</span><div class="search-result-text"><strong>${highlight(h.name, q)}</strong><span>${computeHabitStreak(h.history || {})} day streak</span></div></div>`).join('')}</div>`;
  if (matches.checklist.length) html += `<div class="search-section"><h4>✅ Checklist (${matches.checklist.length})</h4>${matches.checklist.slice(0, 10).map(t => `<div class="search-result" data-tab="tab-plan"><span class="search-result-icon">✅</span><div class="search-result-text"><strong>${highlight(t.text, q)}</strong><span>${t.done ? 'Done' : 'Pending'}</span></div></div>`).join('')}</div>`;
  
  if (!html) results.innerHTML = `<div class="search-empty">No matches for "${escapeHtml(q)}"</div>`;
  else {
    results.innerHTML = html;
    results.querySelectorAll('.search-result').forEach(el => {
      el.addEventListener('click', () => { const tab = el.dataset.tab; const target = navBtns.find(b => b.dataset.tab === tab); if (target) target.click(); });
    });
  }
}
$('#search-input').addEventListener('input', performSearch);
$('#search-clear').addEventListener('click', () => { $('#search-input').value = ''; performSearch(); });

// ══════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════
let notifPermission = 'default';
async function sendNotification(title, opts = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg) reg.showNotification(title, { badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="80" font-size="80">⏰</text></svg>', icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="100" fill="%231a1a24"/><circle cx="256" cy="256" r="160" fill="none" stroke="%237c6af5" stroke-width="32"/></svg>', ...opts });
    else new Notification(title, opts);
  } catch(e) { try { new Notification(title, opts); } catch(_) {} }
}

if ('Notification' in window) {
  notifPermission = Notification.permission;
  if (notifPermission === 'default' && !localStorage.getItem('notif-dismissed')) setTimeout(() => $('#notif-banner').classList.add('show'), 2500);
}
$('#notif-btn').addEventListener('click', async () => {
  if (!('Notification' in window)) return toast('Not supported');
  const r = await Notification.requestPermission(); notifPermission = r; $('#notif-banner').classList.remove('show');
  if (r === 'granted') { toast('Notifications enabled'); sendNotification('🔔 Notifications work!', { body: 'You will get reminders here.' }); }
});
$('#notif-close').addEventListener('click', () => { $('#notif-banner').classList.remove('show'); localStorage.setItem('notif-dismissed', '1'); });

// ══════════════════════════════════════════════
//  SERVICE WORKER
// ══════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  const swCode = `const CACHE='dp-v3';self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./'])));self.skipWaiting();});self.addEventListener('activate',e=>{self.clients.claim();});self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window'}).then(clients=>{if(clients.length>0)return clients[0].focus();return self.clients.openWindow('./');}));});`;
  const swBlob = new Blob([swCode], { type: 'text/javascript' });
  navigator.serviceWorker.register(URL.createObjectURL(swBlob)).catch(() => {});
}

function checkDeadlines() {
  const today = new Date(); today.setHours(0,0,0,0); const remindKey = 'dp-deadline-checked-' + dateStr(today);
  if (localStorage.getItem(remindKey)) return;
  const dueSoon = trackers.filter(t => { if (!t.end) return false; const end = new Date(t.end); const daysLeft = Math.round((end - today) / 86400000); return daysLeft >= 0 && daysLeft <= 7; });
  if (dueSoon.length > 0) setTimeout(() => { sendNotification('⚠ Deadlines approaching', { body: dueSoon.map(t => t.label || 'Tracker').slice(0,3).join(', ') }); }, 4000);
  localStorage.setItem(remindKey, '1');
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; $('#install-banner').classList.add('show'); });
$('#install-btn').addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $('#install-banner').classList.remove('show'); });
$('#banner-close').addEventListener('click', () => { $('#install-banner').classList.remove('show'); });
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
if (isIOS && !navigator.standalone) setTimeout(() => $('#ios-hint').classList.add('show'), 1500);
$('#close-ios').addEventListener('click', () => { $('#ios-hint').classList.remove('show'); });

applyLang(); renderDashboard(); renderHabits(); renderQuickLog(); setTimeout(checkDeadlines, 5000);
