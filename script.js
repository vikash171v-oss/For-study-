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
//  GLOBAL DATA STATE
// ══════════════════════════════════════════════
let lang = localStorage.getItem('dp-lang') || 'en';
let trackers = JSON.parse(localStorage.getItem('dp-trackers') || 'null') || [{ id: 1, label: '', start: '', end: '', color: '#7c6af5', reminder: 'none', tags: [] }];
let pomoData = JSON.parse(localStorage.getItem('pomo-data')) || { work: 45, break: 10, quietStart: '23:00', quietEnd: '07:00' };
let focusLog = JSON.parse(localStorage.getItem('focus-log') || '{}'); 
let habits = JSON.parse(localStorage.getItem('habits-data') || 'null') || [];
let quickLog = JSON.parse(localStorage.getItem('quick-log') || 'null') || { water: {}, sleep: {}, mood: {} };
let calCursor = new Date(); 

function save() {
  localStorage.setItem('dp-trackers', JSON.stringify(trackers));
  localStorage.setItem('habits-data', JSON.stringify(habits));
  localStorage.setItem('quick-log', JSON.stringify(quickLog));
  localStorage.setItem('focus-log', JSON.stringify(focusLog));
}

// ══════════════════════════════════════════════
//  FEATURE 1: RPG GAMIFICATION (XP SYSTEM)
// ══════════════════════════════════════════════
let currentXP = parseInt(localStorage.getItem('dp-xp') || '0');

function addXP(amount) {
  currentXP += amount;
  localStorage.setItem('dp-xp', currentXP);
  updateXPUI();
}

function updateXPUI() {
  const xpLevelText = $('#xp-level-text');
  const xpFill = $('#xp-fill');
  if (!xpLevelText || !xpFill) return;

  // Level formula: Level = Math.floor(sqrt(XP / 50)) + 1
  const level = Math.floor(Math.sqrt(currentXP / 50)) + 1;
  const currentLevelXP = Math.pow(level - 1, 2) * 50;
  const nextLevelXP = Math.pow(level, 2) * 50;
  
  const progressPct = ((currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  xpLevelText.textContent = `Lvl ${level}`;
  xpFill.style.width = `${progressPct}%`;
}

// ══════════════════════════════════════════════
//  FEATURE 2: ZEN MODE (AMBIENT SOUNDSCAPES)
// ══════════════════════════════════════════════
const ambientAudio = {
  rain: new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3'),
  cafe: new Audio('https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3'),
  noise: new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3')
};

Object.values(ambientAudio).forEach(audio => {
  audio.loop = true;
  audio.volume = 0;
});

['rain', 'cafe', 'noise'].forEach(type => {
  const slider = $(`#zen-${type}`);
  if(slider) {
    slider.addEventListener('input', (e) => {
      const vol = e.target.value / 100;
      ambientAudio[type].volume = vol;
      
      if (vol > 0 && ambientAudio[type].paused) {
        ambientAudio[type].play().catch(()=>console.log("Audio play blocked by browser."));
      } else if (vol === 0) {
        ambientAudio[type].pause();
      }
    });
  }
});

// ══════════════════════════════════════════════
//  FEATURE 3: EXPORT TO CSV
// ══════════════════════════════════════════════
$('#export-csv-btn')?.addEventListener('click', () => {
  let csvContent = "Date,Topics Met Goal,Focus Minutes,Water Cups,Sleep Hours,Mood Score\n";
  const streakData = JSON.parse(localStorage.getItem('streak-data') || '{}');
  
  // Get last 30 days
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
  link.setAttribute("href", url);
  link.setAttribute("download", "date_progress_stats.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast('CSV Exported!');
});

// ══════════════════════════════════════════════
//  FEATURE 4: FLUID DRAG AND DROP LOGIC
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
        // Reorder Array
        let dataArray = JSON.parse(localStorage.getItem(arrayName));
        const [movedItem] = dataArray.splice(dragSourceIndex, 1);
        dataArray.splice(dropIndex, 0, movedItem);
        localStorage.setItem(arrayName, JSON.stringify(dataArray));
        renderCallback();
      }
    }
    dragSourceIndex = null;
    dragContainerId = null;
  });
}

// ══════════════════════════════════════════════
//  TIMETABLE & CHECKLIST LOGIC (UPDATED FOR DND)
// ══════════════════════════════════════════════
function renderTimeTable() {
  const data = JSON.parse(localStorage.getItem('tt-data')) || [];
  const list = $('#tt-list'); if(!list) return;
  list.innerHTML = '';
  
  data.forEach((block, index) => {
    const row = document.createElement('div'); 
    row.className = 'tt-row dnd-item'; 
    row.draggable = true;
    
    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.textContent = '⋮⋮';
    dragHandle.style.cursor = 'grab';
    dragHandle.style.color = 'var(--muted)';
    dragHandle.style.marginRight = '8px';

    const dot = document.createElement('div'); dot.className = 'tt-color'; dot.style.background = block.color;
    const startIn = document.createElement('input'); startIn.type = 'time'; startIn.className = 'tt-time-input'; startIn.value = block.start;
    startIn.addEventListener('change', () => { block.start = startIn.value; localStorage.setItem('tt-data', JSON.stringify(data)); });
    const endIn = document.createElement('input'); endIn.type = 'time'; endIn.className = 'tt-time-input'; endIn.value = block.end;
    endIn.addEventListener('change', () => { block.end = endIn.value; localStorage.setItem('tt-data', JSON.stringify(data)); });
    const lblIn = document.createElement('input'); lblIn.type = 'text'; lblIn.className = 'tt-label-input'; lblIn.value = block.label;
    lblIn.addEventListener('input', () => { block.label = lblIn.value; localStorage.setItem('tt-data', JSON.stringify(data)); });
    
    const delBtn = document.createElement('button'); delBtn.className = 'tt-del-btn'; delBtn.textContent = '×';
    delBtn.addEventListener('click', () => { data.splice(index, 1); localStorage.setItem('tt-data', JSON.stringify(data)); renderTimeTable(); });

    row.append(dragHandle, dot, startIn, endIn, lblIn, delBtn); 
    list.appendChild(row);
  });
}

function renderChecklist() {
  const data = JSON.parse(localStorage.getItem('cl-data')) || { date: todayStr(), tasks: [] };
  const list = $('#cl-list'); if(!list) return;
  list.innerHTML = '';

  data.tasks.forEach((task, index) => {
    const item = document.createElement('div'); 
    item.className = 'cl-item dnd-item';
    item.draggable = true;
    
    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.textContent = '⋮⋮';
    dragHandle.style.marginRight = '8px';

    const chk = document.createElement('div'); chk.className = 'cl-check' + (task.done ? ' checked' : '');
    const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'cl-text' + (task.done ? ' done' : ''); inp.value = task.text;
    
    chk.addEventListener('click', () => {
      task.done = !task.done; 
      chk.classList.toggle('checked', task.done); inp.classList.toggle('done', task.done);
      localStorage.setItem('cl-data', JSON.stringify(data));
      if(task.done) addXP(10); // GAMIFICATION: +10 XP for habits
    });

    const del = document.createElement('button'); del.className = 'cl-del'; del.innerHTML = '×';
    del.addEventListener('click', () => { data.tasks.splice(index, 1); localStorage.setItem('cl-data', JSON.stringify(data)); renderChecklist(); });
    
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
//  POMODORO TIMER (WITH XP SYSTEM)
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

$('#pomo-start')?.addEventListener('click', () => {
  if (isPomoRunning) { 
    clearInterval(window.pomoTimer); isPomoRunning = false; $('#pomo-start').textContent = "Resume";
  } else {
    isPomoRunning = true; $('#pomo-start').textContent = "Pause";
    window.pomoTimer = setInterval(() => {
      pomoTimeLeft--; updatePomoDisplay();
      if (pomoTimeLeft <= 0) {
        clearInterval(window.pomoTimer); isPomoRunning = false;
        
        if (isWorkSession) {
           addXP(50); // GAMIFICATION: +50 XP for completing a Pomodoro
           toast('+50 XP! Focus Complete 🎉');
           const d = todayStr(); focusLog[d] = (focusLog[d] || 0) + pomoData.work; save();
        }

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
//  FEATURE 5: CRAM MODE (FLASHCARDS)
// ══════════════════════════════════════════════
let isCramMode = false;
let cramQueue = [];

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
    
    const cramBtn = document.createElement('button'); cramBtn.className = 'fc-review-btn'; cramBtn.textContent = '⚡ Cram';
    cramBtn.style.background = '#f0a030'; cramBtn.style.marginRight = '5px';
    cramBtn.onclick = () => { isCramMode = true; startCramMode(i); };

    actions.append(cramBtn, revBtn); row.append(actions); list.appendChild(row);
  });
}

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

function startCramMode(deckIndex) {
  const data = JSON.parse(localStorage.getItem('fc-data')) || []; 
  currentDeckIndex = deckIndex;
  // Shuffle all cards for cramming
  cramQueue = [...data[deckIndex].cards].sort(() => Math.random() - 0.5);
  if(cramQueue.length === 0) return toast('Deck is empty!');
  
  $('#fc-decks-list').style.display = 'none'; 
  $('#fc-flip-container').style.display = 'block'; 
  $('#fc-review-controls').style.display = 'none';
  
  showNextCramCard();
}

function showNextCard() {
  if(currentReviewQueue.length === 0) { return endReview(); }
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
     $('#fc-cram-controls').style.display = this.classList.contains('flipped') ? 'flex' : 'none';
  } else {
     $('#fc-review-controls').style.display = this.classList.contains('flipped') ? 'flex' : 'none';
  }
});

// Cram Next Button
$('#cram-next-btn')?.addEventListener('click', () => {
  cramQueue.shift(); // Remove card, don't save stats
  showNextCramCard();
});

// Standard SM-2 Buttons
$$('.fc-btn[data-q]').forEach(btn => {
  btn.addEventListener('click', () => {
    const q = parseInt(btn.dataset.q); 
    const item = currentReviewQueue.shift(); 
    const data = JSON.parse(localStorage.getItem('fc-data'));
    const realCard = data[currentDeckIndex].cards[item.idx];
    
    // Simple SM-2 math
    realCard.reps = (realCard.reps || 0) + 1;
    realCard.interval = (q === 0) ? 1 : (realCard.interval || 1) * 2;
    realCard.nextReview = Date.now() + realCard.interval * 86400000;
    
    localStorage.setItem('fc-data', JSON.stringify(data));
    addXP(5); // GAMIFICATION: +5 XP for flashcard review
    showNextCard();
  });
});

function endReview() {
  $('#fc-decks-list').style.display = 'block'; 
  $('#fc-flip-container').style.display = 'none'; 
  $('#fc-review-controls').style.display = 'none'; 
  $('#fc-cram-controls').style.display = 'none'; 
  renderFCDecks();
}

// ══════════════════════════════════════════════
//  FEATURE 6: YEAR IN PIXELS
// ══════════════════════════════════════════════
function renderYearInPixels() {
  const yipGrid = $('#year-in-pixels');
  if(!yipGrid) return;
  yipGrid.innerHTML = '';
  
  const today = new Date();
  const streakData = JSON.parse(localStorage.getItem('streak-data') || '{}');
  
  // Render 365 days
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
    $(`#${btn.dataset.tab}`).classList.add('active');
    
    if(btn.dataset.tab === 'tab-dash') { renderYearInPixels(); }
  });
});

// INITIALIZE APP
updateXPUI();
renderTimeTable();
renderChecklist();
renderFCDecks();
renderYearInPixels();
if($('#pomo-display')) updatePomoDisplay();

