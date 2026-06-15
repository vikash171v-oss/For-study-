// ══════════════════════════════════════════════
//  UTILITIES & SETUP
// ══════════════════════════════════════════════
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function dateStr(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function hexToRgb(hex) { const r = parseInt(hex.slice(1,3),16); const g = parseInt(hex.slice(3,5),16); const b = parseInt(hex.slice(5,7),16); return r+','+g+','+b; }
function toast(msg, ms = 2200) {
  const t = $('#toast'); if(!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
}
function showModal(html) { $('#modal-content').innerHTML = html; $('#modal-bg').classList.add('open'); }
function hideModal() { $('#modal-bg').classList.remove('open'); }
$('#modal-bg')?.addEventListener('click', e => { if (e.target.id === 'modal-bg') hideModal(); });

// ══════════════════════════════════════════════
//  GLOBAL DATA STATE (Fixes Bug #2)
// ══════════════════════════════════════════════
let lang = localStorage.getItem('dp-lang') || 'en';
let trackers = JSON.parse(localStorage.getItem('dp-trackers') || 'null') || [{ id: 1, label: '', start: '', end: '', color: '#7c6af5', reminder: 'none', tags: [] }];
let pomoData = JSON.parse(localStorage.getItem('pomo-data')) || { work: 45, break: 10, quietStart: '23:00', quietEnd: '07:00' };
let focusLog = JSON.parse(localStorage.getItem('focus-log') || '{}'); 
let habits = JSON.parse(localStorage.getItem('habits-data') || 'null') || [];
let quickLog = JSON.parse(localStorage.getItem('quick-log') || 'null') || { water: {}, sleep: {}, mood: {} };
let calCursor = new Date(); 

let currentDeckIndex = -1; // Explicitly declared
let currentReviewQueue = []; // Explicitly declared
let isCramMode = false;
let cramQueue = [];

function save() {
  localStorage.setItem('dp-trackers', JSON.stringify(trackers));
  localStorage.setItem('habits-data', JSON.stringify(habits));
  localStorage.setItem('quick-log', JSON.stringify(quickLog));
  localStorage.setItem('focus-log', JSON.stringify(focusLog));
  localStorage.setItem('pomo-data', JSON.stringify(pomoData)); // Fixes Bug #21
}

// ══════════════════════════════════════════════
//  TRANSLATIONS & STATE (Fixes Bug #4)
// ══════════════════════════════════════════════
const T = {
  en: { title:'Date Progress', addTracker:'Add another tracker'},
  hi: { title:'दिनांक प्रगति', addTracker:'और ट्रैकर जोड़ें'},
  es: { title:'Progreso de fecha', addTracker:'Añadir seguimiento'}
};

function t(key) { return (T[lang] || T.en)[key] || key; }
function applyLang() {
  const titleEl = $('#app-title');
  const addLbl = $('#add-label');
  if(titleEl) titleEl.textContent = '📅 ' + t('title');
  if(addLbl) addLbl.textContent = t('addTracker');
  if($('#lang-select')) $('#lang-select').value = lang;
}

$('#lang-select')?.addEventListener('change', e => {
  lang = e.target.value; 
  localStorage.setItem('dp-lang', lang);
  applyLang();
});

// ══════════════════════════════════════════════
//  THEME ENGINE (Fixes Bug #5)
// ══════════════════════════════════════════════
const THEMES = ['dark', 'light', 'midnight', 'forest', 'rose'];
let currentThemeIndex = THEMES.indexOf(localStorage.getItem('dp-theme') || 'dark');
if(currentThemeIndex === -1) currentThemeIndex = 0;

function applyTheme() {
  const theme = THEMES[currentThemeIndex];
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('dp-theme', theme);
  
  let metaColor = '#0f0f14';
  if(theme === 'light') metaColor = '#f4f3fb';
  if(theme === 'midnight') metaColor = '#0b0f19';
  if(theme === 'forest') metaColor = '#0f1712';
  if(theme === 'rose') metaColor = '#1f1316';
  if($('#theme-meta')) $('#theme-meta').content = metaColor;
}

$('#theme-cycle-btn')?.addEventListener('click', () => {
  currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
  applyTheme();
});
applyTheme();

// ══════════════════════════════════════════════
//  BACKUP & RESTORE (Fixes Bug #6)
// ══════════════════════════════════════════════
$('#export-btn')?.addEventListener('click', () => {
  const data = {
    theme: localStorage.getItem('dp-theme'), 
    lang: localStorage.getItem('dp-lang'),
    trackers: localStorage.getItem('dp-trackers'), 
    topics: localStorage.getItem('tp-data'),
    pomo: localStorage.getItem('pomo-data'), 
    streak: localStorage.getItem('streak-data'),
    tt: localStorage.getItem('tt-data'), 
    cl: localStorage.getItem('cl-data'),
    fc: localStorage.getItem('fc-data'),
    habits: localStorage.getItem('habits-data'),
    quicklog: localStorage.getItem('quick-log'),
    focuslog: localStorage.getItem('focus-log')
  };
  const blob = new Blob([JSON.stringify(data)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); 
  a.href = url; a.download = 'date-progress-backup.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Backup Downloaded!');
});

$('#import-btn')?.addEventListener('click', () => { $('#import-file')?.click(); });

$('#import-file')?.addEventListener('change', (e) => {
  const file = e.target.files[0]; 
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if(data.theme) localStorage.setItem('dp-theme', data.theme);
      if(data.trackers) localStorage.setItem('dp-trackers', data.trackers);
      if(data.topics) localStorage.setItem('tp-data', data.topics);
      if(data.pomo) localStorage.setItem('pomo-data', data.pomo);
      if(data.streak) localStorage.setItem('streak-data', data.streak);
      if(data.tt) localStorage.setItem('tt-data', data.tt);
      if(data.cl) localStorage.setItem('cl-data', data.cl);
      if(data.fc) localStorage.setItem('fc-data', data.fc);
      if(data.habits) localStorage.setItem('habits-data', data.habits);
      alert('Data restored successfully! The page will now reload.'); 
      location.reload();
    } catch(err) { alert('Invalid backup file.'); }
  };
  reader.readAsText(file);
});

// ══════════════════════════════════════════════
//  EXPORT CSV (Fixes Bug #18)
// ══════════════════════════════════════════════
$('#export-csv-btn')?.addEventListener('click', () => {
  let csvContent = "Date,Topics Met Goal,Focus Minutes,Water Cups,Sleep Hours,Mood Score\n";
  const streakData = JSON.parse(localStorage.getItem('streak-data') || '{}');
  
  for(let i=0; i<30; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = dateStr(d);
    
    const goalMet = streakData[ds] ? "Yes" : "No";
    const focusMins = focusLog[ds] || 0;
    const water = (quickLog.water && quickLog.water[ds]) || 0;
    const sleep = (quickLog.sleep && quickLog.sleep[ds]) || 0;
    const mood = (quickLog.mood && quickLog.mood[ds]) || 0;
    
    csvContent += `${ds},${goalMet},${focusMins},${water},${sleep},${mood}\n`;
  }
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url); link.setAttribute("download", "date_progress_stats.csv");
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url); // Memory leak fixed
  toast('CSV Exported!');
});

// ══════════════════════════════════════════════
//  COLLAPSIBLE PANELS (Fixes Bug #13, #14)
// ══════════════════════════════════════════════
function setupCollapsible(headId, bodyId, toggleId, storageKey, defaultOpen) {
  const head = $(`#${headId}`); const body = $(`#${bodyId}`); const toggle = $(`#${toggleId}`);
  if(!head || !body) return;
  let isOpen = JSON.parse(localStorage.getItem(storageKey));
  if (isOpen === null) isOpen = defaultOpen;

  function updateUI() {
    if (isOpen) {
      body.classList.add('open');
      body.style.display = bodyId === 'pomo-settings' ? 'flex' : (bodyId === 'pomo-body' ? 'flex' : 'block');
      if(toggle) toggle.classList.add('open');
    } else {
      body.classList.remove('open'); body.style.display = 'none';
      if(toggle) toggle.classList.remove('open');
    }
  }
  updateUI();
  head.addEventListener('click', () => {
    isOpen = !isOpen; localStorage.setItem(storageKey, JSON.stringify(isOpen)); updateUI();
  });
}
setupCollapsible('streak-head', 'streak-body', 'streak-toggle', 'ui-streak-open', true);
setupCollapsible('tt-head', 'tt-body', 'tt-toggle', 'ui-tt-open', true);
setupCollapsible('pomo-settings-toggle', 'pomo-settings', null, 'ui-pomo-settings-open', false);

// ══════════════════════════════════════════════
//  RPG GAMIFICATION (Fixes Bug #8)
// ══════════════════════════════════════════════
let currentXP = parseInt(localStorage.getItem('dp-xp') || '0');
function addXP(amount) {
  currentXP += amount; localStorage.setItem('dp-xp', currentXP); updateXPUI();
}
function updateXPUI() {
  const xpContainer = $('.xp-container');
  const xpLevelText = $('#xp-level-text');
  const xpFill = $('#xp-fill');
  if (!xpContainer || !xpLevelText || !xpFill) return;

  xpContainer.style.display = 'flex';
  const level = Math.floor(Math.sqrt(currentXP / 50)) + 1;
  const currentLevelXP = Math.pow(level - 1, 2) * 50;
  const nextLevelXP = Math.pow(level, 2) * 50;
  const progressPct = ((currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  xpLevelText.textContent = `Lvl ${level}`;
  xpFill.style.width = `${progressPct}%`;
}

// ══════════════════════════════════════════════
//  ZEN MODE (Fixes Bug #19 - Lazy load audio)
// ══════════════════════════════════════════════
const ambientAudioUrls = {
  rain: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3',
  cafe: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
  noise: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3'
};
const audioInstances = {};

['rain', 'cafe', 'noise'].forEach(type => {
  const slider = $(`#zen-${type}`);
  if(slider) {
    slider.addEventListener('input', (e) => {
      const vol = e.target.value / 100;
      
      // Lazy load the audio object ONLY when slider is dragged above 0
      if (!audioInstances[type]) {
        audioInstances[type] = new Audio(ambientAudioUrls[type]);
        audioInstances[type].loop = true;
      }
      
      audioInstances[type].volume = vol;
      
      if (vol > 0 && audioInstances[type].paused) {
        audioInstances[type].play().catch(()=>console.log("Audio play blocked by browser."));
      } else if (vol === 0) {
        audioInstances[type].pause();
      }
    });
  }
});

// ══════════════════════════════════════════════
//  FLUID DRAG AND DROP LOGIC (Fixes Bug #12)
// ══════════════════════════════════════════════
let dragSourceIndex = null;
let dragContainerId = null;

function setupDragAndDrop(listElement, arrayName, renderCallback) {
  if(!listElement) return;

  listElement.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.dnd-item');
    if(!item) return;
    dragSourceIndex = Array.from(listElement.children).indexOf(item);
    dragContainerId = arrayName;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  listElement.addEventListener('dragover', (e) => {
    e.preventDefault();
    if(dragContainerId !== arrayName) return;
    const draggingItem = listElement.querySelector('.dragging');
    if(!draggingItem) return;

    const siblings = [...listElement.querySelectorAll('.dnd-item:not(.dragging)')];
    const nextSibling = siblings.find(sibling => {
      return e.clientY <= sibling.getBoundingClientRect().top + sibling.offsetHeight / 2;
    });
    
    if(nextSibling) { listElement.insertBefore(draggingItem, nextSibling); } 
    else { listElement.appendChild(draggingItem); }
  });

  listElement.addEventListener('dragend', (e) => {
    const item = e.target.closest('.dnd-item');
    if(!item) return;
    item.classList.remove('dragging');
    
    if(dragContainerId === arrayName) {
      const dropIndex = Array.from(listElement.children).indexOf(item);
      if(dragSourceIndex !== dropIndex && dragSourceIndex !== null) {
        
        let rawData = JSON.parse(localStorage.getItem(arrayName));
        // FIX: Handle both Arrays (tt-data) and Objects (cl-data.tasks) safely
        let isObjectWrapper = (arrayName === 'cl-data');
        let targetArray = isObjectWrapper ? rawData.tasks : rawData;
        
        const [movedItem] = targetArray.splice(dragSourceIndex, 1);
        targetArray.splice(dropIndex, 0, movedItem);
        
        if(isObjectWrapper) { rawData.tasks = targetArray; } 
        else { rawData = targetArray; }
        
        localStorage.setItem(arrayName, JSON.stringify(rawData));
        renderCallback();
      }
    }
    dragSourceIndex = null; dragContainerId = null;
  });
}

// ══════════════════════════════════════════════
//  TIMETABLE & CHECKLIST (Fixes Bug #16, #17)
// ══════════════════════════════════════════════
function renderTimeTable() {
  const data = JSON.parse(localStorage.getItem('tt-data')) || [];
  const list = $('#tt-list'); if(!list) return;
  list.innerHTML = '';
  
  data.forEach((block) => {
    const row = document.createElement('div'); row.className = 'tt-row dnd-item'; row.draggable = true;
    const dragHandle = document.createElement('span'); dragHandle.className = 'drag-handle'; dragHandle.textContent = '⋮⋮'; dragHandle.style.marginRight = '8px';

    const dot = document.createElement('div'); dot.className = 'tt-color'; dot.style.background = block.color;
    const startIn = document.createElement('input'); startIn.type = 'time'; startIn.className = 'tt-time-input'; startIn.value = block.start;
    startIn.addEventListener('change', () => { block.start = startIn.value; localStorage.setItem('tt-data', JSON.stringify(data)); });
    
    const endIn = document.createElement('input'); endIn.type = 'time'; endIn.className = 'tt-time-input'; endIn.value = block.end;
    endIn.addEventListener('change', () => { block.end = endIn.value; localStorage.setItem('tt-data', JSON.stringify(data)); });
    
    const lblIn = document.createElement('input'); lblIn.type = 'text'; lblIn.className = 'tt-label-input'; lblIn.value = block.label;
    lblIn.addEventListener('input', () => { block.label = lblIn.value; localStorage.setItem('tt-data', JSON.stringify(data)); });
    
    const delBtn = document.createElement('button'); delBtn.className = 'tt-del-btn'; delBtn.textContent = '×';
    // FIX: Dynamically find index by object reference, ignoring visual dom changes
    delBtn.addEventListener('click', () => { 
      const currentIdx = data.indexOf(block);
      if(currentIdx > -1) { data.splice(currentIdx, 1); localStorage.setItem('tt-data', JSON.stringify(data)); renderTimeTable(); }
    });

    row.append(dragHandle, dot, startIn, endIn, lblIn, delBtn); list.appendChild(row);
  });
}

function renderChecklist() {
  const data = JSON.parse(localStorage.getItem('cl-data')) || { date: todayStr(), tasks: [] };
  const list = $('#cl-list'); if(!list) return;
  list.innerHTML = '';

  data.tasks.forEach((task) => {
    const item = document.createElement('div'); item.className = 'cl-item dnd-item'; item.draggable = true;
    const dragHandle = document.createElement('span'); dragHandle.className = 'drag-handle'; dragHandle.textContent = '⋮⋮'; dragHandle.style.marginRight = '8px';

    const chk = document.createElement('div'); chk.className = 'cl-check' + (task.done ? ' checked' : '');
    const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'cl-text' + (task.done ? ' done' : ''); inp.value = task.text;
    
    // FIX: Make text edits persistent
    inp.addEventListener('input', () => {
      task.text = inp.value;
      localStorage.setItem('cl-data', JSON.stringify(data));
    });

    chk.addEventListener('click', () => {
      task.done = !task.done; 
      chk.classList.toggle('checked', task.done); inp.classList.toggle('done', task.done);
      localStorage.setItem('cl-data', JSON.stringify(data));
      if(task.done) addXP(10); 
    });

    const del = document.createElement('button'); del.className = 'cl-del'; del.innerHTML = '×';
    del.addEventListener('click', () => { 
      const currentIdx = data.tasks.indexOf(task);
      if(currentIdx > -1) { data.tasks.splice(currentIdx, 1); localStorage.setItem('cl-data', JSON.stringify(data)); renderChecklist(); }
    });
    
    item.append(dragHandle, chk, inp, del); list.appendChild(item);
  });
}

setupDragAndDrop($('#tt-list'), 'tt-data', renderTimeTable);
setupDragAndDrop($('#cl-list'), 'cl-data', renderChecklist);

$('#tt-add-btn')?.addEventListener('click', () => {
  const data = JSON.parse(localStorage.getItem('tt-data')) || []; 
  data.push({ id: Date.now(), start: "18:00", end: "19:00", label: "New Task", color: '#7c6af5' });
  localStorage.setItem('tt-data', JSON.stringify(data)); renderTimeTable();
});

$('#cl-add-btn')?.addEventListener('click', () => {
  const inp = $('#cl-input'); const text = inp.value.trim(); if (!text) return;
  const data = JSON.parse(localStorage.getItem('cl-data')) || { date: todayStr(), tasks: [] };
  data.tasks.push({ text: text, done: false }); localStorage.setItem('cl-data', JSON.stringify(data)); 
  inp.value = ''; renderChecklist();
});

// ══════════════════════════════════════════════
//  POMODORO TIMER (Fixes Bug #3)
// ══════════════════════════════════════════════
let pomoTimeLeft = pomoData.work * 60; 
let isWorkSession = true; 
let isPomoRunning = false;

function updatePomoDisplay() {
  if(!$('#pomo-display')) return;
  const m = Math.floor(pomoTimeLeft / 60).toString().padStart(2, '0');
  const s = (pomoTimeLeft % 60).toString().padStart(2, '0');
  $('#pomo-display').textContent = `${m}:${s}`; document.title = `${m}:${s} - Focus`;
}

// FIX: Wire inputs correctly
const pomoWorkIn = $('#pomo-work-in');
const pomoBreakIn = $('#pomo-break-in');
const pomoQuietStart = $('#pomo-quiet-start');
const pomoQuietEnd = $('#pomo-quiet-end');

if (pomoWorkIn) pomoWorkIn.value = pomoData.work;
if (pomoBreakIn) pomoBreakIn.value = pomoData.break;
if (pomoQuietStart) pomoQuietStart.value = pomoData.quietStart || '23:00';
if (pomoQuietEnd) pomoQuietEnd.value = pomoData.quietEnd || '07:00';

[pomoWorkIn, pomoBreakIn, pomoQuietStart, pomoQuietEnd].forEach(inp => {
  if(inp) {
    inp.addEventListener('change', () => {
      pomoData.work = parseInt(pomoWorkIn.value) || 25;
      pomoData.break = parseInt(pomoBreakIn.value) || 5;
      pomoData.quietStart = pomoQuietStart.value || '23:00';
      pomoData.quietEnd = pomoQuietEnd.value || '07:00';
      save();
      if(!isPomoRunning) {
        pomoTimeLeft = pomoData.work * 60;
        updatePomoDisplay();
      }
    });
  }
});

$('#pomo-start')?.addEventListener('click', () => {
  if (isPomoRunning) { 
    clearInterval(window.pomoTimer); isPomoRunning = false; $('#pomo-start').textContent = "Resume";
  } else {
    isPomoRunning = true; $('#pomo-start').textContent = "Pause";
    window.pomoTimer = setInterval(() => {
      pomoTimeLeft--; updatePomoDisplay();
      if (pomoTimeLeft <= 0) {
        clearInterval(window.pomoTimer); isPomoRunning = false;
        if (isWorkSession) { addXP(50); toast('+50 XP! Focus Complete 🎉'); const d = todayStr(); focusLog[d] = (focusLog[d] || 0) + pomoData.work; save(); }
        isWorkSession = !isWorkSession; 
        pomoTimeLeft = (isWorkSession ? pomoData.work : pomoData.break) * 60;
        $('#pomo-status').textContent = isWorkSession ? "Ready to Focus" : "Time for a Break!";
        $('#pomo-start').textContent = "Start " + (isWorkSession ? "Work" : "Break"); 
        updatePomoDisplay();
      }
    }, 1000);
  }
});
$('#pomo-reset')?.addEventListener('click', () => {
  clearInterval(window.pomoTimer); isPomoRunning = false; isWorkSession = true;
  pomoTimeLeft = pomoData.work * 60; $('#pomo-status').textContent = "Ready to Study";
  $('#pomo-start').textContent = "Start"; updatePomoDisplay();
});

// ══════════════════════════════════════════════
//  FLASHCARDS & CRAM MODE (Fixes Bug #22, #10)
// ══════════════════════════════════════════════
function sm2Init(card) { card.ef = 2.5; card.interval = 0; card.reps = 0; card.nextReview = 0; return card; }

function renderFCDecks() {
  const data = JSON.parse(localStorage.getItem('fc-data')) || []; 
  const list = $('#fc-decks-list'); if(!list) return;
  list.innerHTML = '';
  
  data.forEach((deck, i) => {
    const dueCount = deck.cards.filter(c => c.nextReview <= Date.now()).length;
    const row = document.createElement('div'); row.className = 'fc-deck-row';
    row.innerHTML = `<div class="fc-deck-info"><h4>${deck.name}</h4><span>${deck.cards.length} cards · <b style="color:${dueCount>0?'var(--hard)':'var(--easy)'}">${dueCount} due</b></span></div>`;
    
    const actions = document.createElement('div');
    const revBtn = document.createElement('button'); revBtn.className = 'fc-review-btn'; revBtn.textContent = 'Review';
    revBtn.onclick = () => { isCramMode = false; startReview(i); };
    
    actions.append(revBtn); row.append(actions); list.appendChild(row);
  });
}

$('#fc-cram-btn')?.addEventListener('click', () => {
  isCramMode = true;
  const data = JSON.parse(localStorage.getItem('fc-data')) || []; 
  cramQueue = [];
  data.forEach(d => cramQueue.push(...d.cards));
  cramQueue = cramQueue.sort(() => Math.random() - 0.5);
  
  if(cramQueue.length === 0) return toast('No cards to cram!');
  
  $('#fc-decks-list').style.display = 'none'; 
  $('#fc-flip-container').style.display = 'block'; 
  $('#fc-review-controls').style.display = 'none';
  $('#fc-cram-controls').style.display = 'none';
  
  showNextCramCard();
});

function startReview(deckIndex) {
  const data = JSON.parse(localStorage.getItem('fc-data')) || []; 
  currentDeckIndex = deckIndex;
  currentReviewQueue = data[deckIndex].cards.map((c, idx) => ({ card: c, idx })).filter(o => o.card.nextReview <= Date.now());
  if(currentReviewQueue.length === 0) return toast('No cards due right now!');
  
  $('#fc-decks-list').style.display = 'none'; 
  $('#fc-flip-container').style.display = 'block'; 
  $('#fc-cram-controls').style.display = 'none';
  showNextCard();
}

function showNextCard() {
  if(currentReviewQueue.length === 0) return endReview();
  $('#fc-front-text').textContent = currentReviewQueue[0].card.q; 
  $('#fc-back-text').textContent = currentReviewQueue[0].card.a;
  $('#fc-flip-container').classList.remove('flipped'); 
  $('#fc-review-controls').style.display = 'none';
}

function showNextCramCard() {
  if(cramQueue.length === 0) { toast('Cram session complete!'); return endReview(); }
  $('#fc-front-text').textContent = cramQueue[0].q; 
  $('#fc-back-text').textContent = cramQueue[0].a;
  $('#fc-flip-container').classList.remove('flipped'); 
  $('#fc-cram-controls').style.display = 'none';
}

$('#fc-flip-container')?.addEventListener('click', function() {
  this.classList.toggle('flipped');
  if(isCramMode) {
     if($('#fc-cram-controls')) $('#fc-cram-controls').style.display = this.classList.contains('flipped') ? 'flex' : 'none';
  } else {
     if($('#fc-review-controls')) $('#fc-review-controls').style.display = this.classList.contains('flipped') ? 'flex' : 'none';
  }
});

$('#cram-next-btn')?.addEventListener('click', () => { cramQueue.shift(); showNextCramCard(); });

$$('.fc-btn[data-q]').forEach(btn => {
  btn.addEventListener('click', () => {
    const q = parseInt(btn.dataset.q); 
    const item = currentReviewQueue.shift(); 
    const data = JSON.parse(localStorage.getItem('fc-data'));
    const realCard = data[currentDeckIndex].cards[item.idx];
    
    // FIX: Proper SM-2 Logic Implementation
    if (q === 0) {
      realCard.reps = 0; realCard.interval = 1;
    } else {
      realCard.reps = (realCard.reps || 0) + 1;
      if (realCard.reps === 1) realCard.interval = 1;
      else if (realCard.reps === 2) realCard.interval = 6;
      else realCard.interval = Math.round((realCard.interval || 1) * (realCard.ef || 2.5));
    }
    const newEf = (realCard.ef || 2.5) + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02));
    realCard.ef = Math.max(1.3, newEf);
    realCard.nextReview = Date.now() + realCard.interval * 86400000;
    
    localStorage.setItem('fc-data', JSON.stringify(data));
    addXP(5); showNextCard();
  });
});

function endReview() {
  if($('#fc-decks-list')) $('#fc-decks-list').style.display = 'block'; 
  if($('#fc-flip-container')) $('#fc-flip-container').style.display = 'none'; 
  if($('#fc-review-controls')) $('#fc-review-controls').style.display = 'none'; 
  if($('#fc-cram-controls')) $('#fc-cram-controls').style.display = 'none'; 
  renderFCDecks();
}

// ══════════════════════════════════════════════
//  YEAR IN PIXELS & SHARE CARD (Fixes Bug #9, #7)
// ══════════════════════════════════════════════
function renderYearInPixels() {
  const yipGrid = $('#year-in-pixels');
  if(!yipGrid) return;
  yipGrid.innerHTML = '';
  
  const today = new Date();
  const streakData = JSON.parse(localStorage.getItem('streak-data') || '{}');
  
  for(let i=364; i>=0; i--) {
    const d = new Date(); d.setDate(today.getDate() - i);
    const ds = dateStr(d);
    
    let activityLevel = 0;
    if(streakData[ds]) activityLevel += 2;
    if(focusLog[ds] > 30) activityLevel += 2;
    else if(focusLog[ds] > 0) activityLevel += 1;
    activityLevel = Math.min(4, activityLevel);
    
    const cell = document.createElement('div');
    cell.className = `yip-cell lvl-${activityLevel}`;
    cell.title = `${ds} - Activity Score: ${activityLevel}`;
    yipGrid.appendChild(cell);
  }
}

function updateShareCard() {
  const t = todayStr();
  const streakData = JSON.parse(localStorage.getItem('streak-data') || '{}');
  let streak = 0; 
  for(let i=0; i<365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if(streakData[dateStr(d)]) streak++; else if(i>0) break;
  }
  
  const tp = JSON.parse(localStorage.getItem('tp-data') || 'null') || { goal: 3, subjects: [] };
  let doneToday = 0; 
  tp.subjects.forEach(sub => sub.topics.forEach(t => { if(t.checked) doneToday++; }));
  const goalPct = Math.min(100, Math.round((doneToday / Math.max(1, tp.goal)) * 100));

  if($('#share-streak')) $('#share-streak').textContent = `🔥 ${streak} day streak`;
  if($('#share-num')) $('#share-num').textContent = `${goalPct}%`;
  if($('#share-row')) {
    $('#share-row').innerHTML = `
      <div class="share-card-mini"><div class="share-card-mini-num">${focusLog[t]||0}m</div><div class="share-card-mini-name">Focus</div></div>
      <div class="share-card-mini"><div class="share-card-mini-num">${doneToday}</div><div class="share-card-mini-name">Topics</div></div>
      <div class="share-card-mini"><div class="share-card-mini-num">${habits.filter(h => h.history && h.history[t]).length}</div><div class="share-card-mini-name">Habits</div></div>
    `;
  }
}

// ══════════════════════════════════════════════
//  HABITS (Fixes Bug #15)
// ══════════════════════════════════════════════
function renderHabits() {
  const list = $('#habits-list'); const empty = $('#habit-empty-msg'); 
  if(!list) return;
  list.innerHTML = '';
  
  if (habits.length === 0) { 
    if(empty) empty.style.display = 'block'; 
    return; 
  }
  if(empty) empty.style.display = 'none'; 
  
  const today = todayStr();
  habits.forEach((h, hi) => {
    let streak = 0; for(let i=0; i<365; i++) { const d=new Date(); d.setDate(d.getDate()-i); if(h.history && h.history[dateStr(d)]) streak++; else if(i>0) break; }
    const card = document.createElement('div'); card.className = 'habit-card';
    card.innerHTML = `<div class="habit-row"><div class="habit-emoji">${h.emoji||'⭐'}</div><div class="habit-info"><div class="habit-name">${h.name}</div><div class="habit-streak">🔥 <b>${streak}</b> streak</div></div><button class="habit-check-btn ${h.history&&h.history[today]?'done':''}" data-hi="${hi}"></button></div>`;
    list.appendChild(card);
  });
  list.querySelectorAll('.habit-check-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.hi); habits[i].history = habits[i].history || {};
      if (habits[i].history[today]) delete habits[i].history[today]; else { habits[i].history[today] = true; addXP(10); }
      save(); renderHabits();
    });
  });
}

// ══════════════════════════════════════════════
//  TAB LOGIC RE-BINDING & INIT
// ══════════════════════════════════════════════
const navBtnsArray = $$('.nav-btn');
const tabPanesArray = $$('.tab-pane');

navBtnsArray.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtnsArray.forEach(b => b.classList.remove('active'));
    tabPanesArray.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    if($(`#${btn.dataset.tab}`)) $(`#${btn.dataset.tab}`).classList.add('active');
    
    if(btn.dataset.tab === 'tab-dash') { 
      renderYearInPixels(); 
      updateShareCard();
    }
  });
});

// INITIALIZE APP
applyLang();
updateXPUI();
renderTimeTable();
renderChecklist();
renderFCDecks();
renderYearInPixels();
updateShareCard();
renderHabits();
if($('#pomo-display')) updatePomoDisplay();
