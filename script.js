document.getElementById("start-btn").addEventListener("click", startGame);
// Variables to control game state
let gameRunning = false; // Keeps track of whether game is active or not
let dropMaker; // Will store our timer that creates drops/cans regularly
let gameTimer; // Countdown timer
let timeLeft = 30; // seconds
let score = 0;

const gameContainer = document.getElementById('game-container');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const feedbackLayer = document.getElementById('feedback-layer');
const startBtn = document.getElementById('start-btn');

startBtn.addEventListener('click', startGame);
// adjust layout so the game container always fits in the window
function adjustLayout(){
  const container = document.getElementById('game-container');
  const scorePanel = document.querySelector('.score-panel');
  // compute bottom of header (score panel) relative to viewport
  const panelRect = scorePanel ? scorePanel.getBoundingClientRect() : { bottom: 0 };
  const reservedBottom = 12; // small gap between panel and container bottom
  const available = Math.max(180, window.innerHeight - panelRect.bottom - reservedBottom);
  container.style.height = `${available}px`;
}
window.addEventListener('resize', adjustLayout);
window.addEventListener('load', adjustLayout);
// modal buttons
document.addEventListener('DOMContentLoaded', () => {
  const replay = document.getElementById('replay-btn');
  const close = document.getElementById('close-btn');
  const modal = document.getElementById('end-modal');
  const howBtn = document.getElementById('how-btn');
  const howModal = document.getElementById('how-modal');
  const howClose = document.getElementById('how-close');
  if (replay) replay.addEventListener('click', () => {
    modal.setAttribute('aria-hidden','true');
    startGame();
  });
  if (close) close.addEventListener('click', () => {
    modal.setAttribute('aria-hidden','true');
  });
  if (howBtn && howModal) howBtn.addEventListener('click', ()=> howModal.setAttribute('aria-hidden','false'));
  if (howClose && howModal) howClose.addEventListener('click', ()=> howModal.setAttribute('aria-hidden','true'));
  // close how modal with Esc
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape'){ if (howModal) howModal.setAttribute('aria-hidden','true'); if (modal) modal.setAttribute('aria-hidden','true'); }});
  // ensure audio can play after a user gesture
  document.addEventListener('click', function once(){
    try{ ensureAudio(); if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }catch(e){}
    document.removeEventListener('click', once);
  });
});

function startGame() {
  if (gameRunning) return;
  // Reset state
  gameRunning = true;
  timeLeft = 30;
  score = 0;
  updateScore(0, false);
  timeEl.textContent = timeLeft;

  // Remove any existing cans/drops
  clearGameElements();

  // Spawn a can every 900ms
  dropMaker = setInterval(createCan, 900);

  // Countdown timer
  gameTimer = setInterval(() => {
    timeLeft--;
    timeEl.textContent = timeLeft;
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  gameRunning = false;
  clearInterval(dropMaker);
  clearInterval(gameTimer);
  // Show end modal
  const modal = document.getElementById('end-modal');
  const finalScore = document.getElementById('final-score');
  if (modal && finalScore){
    finalScore.textContent = score;
    // check high score
    try{
      const prev = parseInt(localStorage.getItem('wd_highscore')||'0',10);
      if (score > prev){
        localStorage.setItem('wd_highscore', String(score));
        // show confetti for new high score
        launchConfetti();
        // small message
        const msg = document.getElementById('game-message');
        if (msg) msg.textContent = 'New High Score!';
      }
    }catch(e){}
    modal.setAttribute('aria-hidden','false');
  } else {
    alert(`Game over! Your score: ${score}`);
  }
}

// --- Confetti ---
function launchConfetti(){
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.classList.add('confetti-canvas');
  const ctx = canvas.getContext('2d');
  const pieces = [];
  const colors = ['#2E9DF7','#4FCB53','#FFC907','#FF902A','#F5402C'];
  for (let i=0;i<120;i++){
    pieces.push({
      x: Math.random()*canvas.width,
      y: Math.random()*-canvas.height,
      size: 6 + Math.random()*8,
      color: colors[Math.floor(Math.random()*colors.length)],
      rot: Math.random()*360,
      speed: 2 + Math.random()*4,
      swing: Math.random()*0.06 + 0.02
    });
  }

  let t0 = performance.now();
  function frame(t){
    const dt = (t - t0) / 16.666;
    t0 = t;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for (let p of pieces){
      p.y += p.speed * dt;
      p.x += Math.sin(p.y * p.swing) * 1.5;
      p.rot += 6 * dt;
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(p.rot * Math.PI/180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);
      ctx.restore();
    }
    // stop when all pieces gone off-screen
    if (pieces.every(p=>p.y > canvas.height+50)){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      canvas.classList.remove('confetti-canvas');
      return;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function clearGameElements(){
  // remove all .can elements
  document.querySelectorAll('.can').forEach(n => n.remove());
  // clear feedbacks
  feedbackLayer.innerHTML = '';
}

function createCan() {
  // Create a falling drop using inline SVG for crisp visuals
  const wrapper = document.createElement('div');
  wrapper.className = 'water-drop';

  // Decide type
  const isDirty = Math.random() < 0.22; // ~22% of drops are dirty
  const type = isDirty ? 'dirty' : 'good';
  wrapper.dataset.type = type;

  // SVG for teardrop (simple path) - tinted via fill
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox','0 0 64 80');
  svg.setAttribute('width','52');
  svg.setAttribute('height','64');
  svg.innerHTML = `
    <defs>
      <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="%STOP1%" />
        <stop offset="100%" stop-color="%STOP2%" />
      </linearGradient>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#0b4f86" flood-opacity="0.12"/>
      </filter>
    </defs>
    <path d="M32 0 C20 18 6 30 6 44 C6 60 18 76 32 76 C46 76 58 60 58 44 C58 30 44 18 32 0 Z" fill="url(#g1)" filter="url(#shadow)"/>
    <ellipse cx="22" cy="22" rx="6" ry="4" fill="rgba(255,255,255,0.9)" opacity="0.9" />
  `;

  // Replace gradient colors based on type
  if (type === 'dirty'){
    svg.innerHTML = svg.innerHTML.replace('%STOP1%','#FFC907').replace('%STOP2%','#E6A500');
  } else {
    svg.innerHTML = svg.innerHTML.replace('%STOP1%','#2E9DF7').replace('%STOP2%','#1B7FD9');
  }

  wrapper.appendChild(svg);

  // Random X position across the top
  const rect = gameContainer.getBoundingClientRect();
  const x = Math.random() * Math.max(0, rect.width - 52);
  wrapper.style.left = `${x}px`;
  wrapper.style.top = `-90px`;

  // Randomize fall duration slightly
  const fallDur = 2800 + Math.random() * 2200; // ~2.8-5s
  wrapper.style.animationDuration = `${fallDur}ms`;

  // handlers
  wrapper.addEventListener('click', (e) => collectDrop(wrapper, e));
  wrapper.addEventListener('touchstart', (e) => { e.preventDefault(); collectDrop(wrapper, e); }, { passive: false });

  wrapper.addEventListener('animationend', () => wrapper.remove());

  gameContainer.appendChild(wrapper);
}

function collectDrop(drop, event){
  if (!gameRunning) return;
  if (drop.classList.contains('collected')) return;
  drop.classList.add('collected');

  const type = drop.dataset.type;
  const rect = gameContainer.getBoundingClientRect();
  const x = (event.clientX || (event.touches && event.touches[0].clientX)) - rect.left;
  const y = (event.clientY || (event.touches && event.touches[0].clientY)) - rect.top;

  if (type === 'good'){
    updateScore(score + 1, true);
    showPop(x, y, '+1', 'good');
    try{ playGood(); }catch(e){}
  } else {
    // Penalty: lose a point and reduce time by 2 seconds
    updateScore(Math.max(0, score - 1), true);
    timeLeft = Math.max(0, timeLeft - 2);
    timeEl.textContent = timeLeft;
    // flash message and penalty animation
    showPop(x, y, '-1', 'bad');
    const msg = document.getElementById('game-message');
    if (msg){
      msg.textContent = 'Oops — dirty water! -1 point, -2s';
      msg.classList.add('penalty');
      setTimeout(() => { msg.classList.remove('penalty'); msg.textContent = ''; }, 1200);
    }
    // flash the score red to indicate penalty
    const scoreWrapper = document.querySelector('.score');
    if (scoreWrapper){
      scoreWrapper.classList.add('penalty');
      setTimeout(() => scoreWrapper.classList.remove('penalty'), 450);
    }
    try{ playBad(); }catch(e){}
  }

  // Remove the drop after small animation (collected)
  setTimeout(() => drop.remove(), 220);
}

function showPop(x, y, text, kind='good'){
  const pop = document.createElement('div');
  pop.className = 'pop';
  pop.textContent = text;
  pop.style.left = `${x}px`;
  pop.style.top = `${y}px`;
  if (kind === 'bad') pop.style.color = '#F5402C';
  feedbackLayer.appendChild(pop);
  // remove after animation
  setTimeout(() => pop.remove(), 900);
}

// --- Audio setup (small WebAudio synths) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
function ensureAudio(){
  if (!audioCtx) audioCtx = new AudioContext();
}

function playGood(){
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine'; o.frequency.value = 880;
  g.gain.value = 0.06;
  o.connect(g); g.connect(audioCtx.destination);
  o.start();
  o.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
  setTimeout(() => o.stop(), 260);
}

function playBad(){
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sawtooth'; o.frequency.value = 220;
  g.gain.value = 0.08;
  o.connect(g); g.connect(audioCtx.destination);
  o.start();
  o.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.18);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
  setTimeout(() => o.stop(), 360);
}


function updateScore(newScore, flash = true){
  score = newScore;
  scoreEl.textContent = score;
  const scoreWrapper = document.querySelector('.score');
  if (flash){
    scoreWrapper.classList.add('flash');
    setTimeout(() => scoreWrapper.classList.remove('flash'), 400);
  }
}
