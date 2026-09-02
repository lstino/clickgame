const gameDuration = 30;
const targetLifetime = 1400; // ms before a target disappears on its own
const spawnInterval = 900;   // ms between spawns
const maxTargets = 3;
const api = '/api/scores';

const arena = document.getElementById('arena');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const bestEl = document.getElementById('best');
const startScreen = document.getElementById('start-screen');
const endScreen = document.getElementById('end-screen');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const saveBtn = document.getElementById('save-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const playerNameInput = document.getElementById('player-name');
const leaderboardBody = document.getElementById('leaderboard-body');

let score = 0;
let timeLeft = gameDuration;
let running = false;
let countdownInterval = null;
let spawnTimer = null;
let targetTimers = [];

// ── Leaderboard (API) ─────────────────────────────────────────────────────────

async function fetchScores() {
  try {
    const res = await fetch(api);
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

async function saveScore(name, value) {
  const res = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim() || 'Anonymous', score: value }),
  });
  return res.ok ? res.json() : [];
}

async function renderLeaderboard() {
  const scores = await fetchScores();
  if (!scores.length) {
    leaderboardBody.innerHTML = '<tr class="empty-row"><td colspan="3" class="text-center text-secondary py-3">No scores yet — be the first!</td></tr>';
    return;
  }
  leaderboardBody.innerHTML = scores.map((entry, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(entry.name)}</td>
      <td>${entry.score}</td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

async function getBest() {
  const scores = await fetchScores();
  return scores.length ? scores[0].score : 0;
}

// ── Game flow ─────────────────────────────────────────────────────────────────

function startGame() {
  score = 0;
  timeLeft = gameDuration;
  running = true;

  scoreEl.textContent = 0;
  timerEl.textContent = gameDuration;
  timerEl.classList.remove('urgent');
  getBest().then(b => { bestEl.textContent = b; });

  startScreen.classList.add('hidden');
  endScreen.classList.add('hidden');
  clearTargets();

  countdownInterval = setInterval(tick, 1000);
  spawnTimer = setInterval(spawnTarget, spawnInterval);
  spawnTarget(); // immediate first target
}

function tick() {
  timeLeft--;
  timerEl.textContent = timeLeft;
  if (timeLeft <= 5) timerEl.classList.add('urgent');
  if (timeLeft <= 0) endGame();
}

async function endGame() {
  running = false;
  clearInterval(countdownInterval);
  clearInterval(spawnTimer);
  targetTimers.forEach(clearTimeout);
  targetTimers = [];
  clearTargets();

  finalScoreEl.textContent = score;
  playerNameInput.value = '';
  saveBtn.disabled = false;
  endScreen.classList.remove('hidden');
  await renderLeaderboard();
}

// ── Targets ───────────────────────────────────────────────────────────────────

function spawnTarget() {
  if (!running) return;
  const existingTargets = arena.querySelectorAll('.target');
  if (existingTargets.length >= maxTargets) return;

  const target = document.createElement('div');
  target.className = 'target';

  const padding = 30;
  const x = padding + Math.random() * (arena.clientWidth  - padding * 2);
  const y = padding + Math.random() * (arena.clientHeight - padding * 2);
  target.style.left = x + 'px';
  target.style.top  = y + 'px';

  target.addEventListener('click', (e) => {
    e.stopPropagation();
    hitTarget(target, x, y);
  });

  arena.appendChild(target);

  const id = setTimeout(() => {
    if (target.parentNode) target.remove();
  }, targetLifetime);
  targetTimers.push(id);
}

function hitTarget(target, x, y) {
  if (!running) return;
  target.remove();

  score++;
  scoreEl.textContent = score;

  // Ring flash
  const ring = document.createElement('div');
  ring.className = 'hit-flash';
  ring.style.left = x + 'px';
  ring.style.top  = y + 'px';
  arena.appendChild(ring);
  ring.addEventListener('animationend', () => ring.remove());

  // +1 label
  const pop = document.createElement('div');
  pop.className = 'score-pop';
  pop.textContent = '+1';
  pop.style.left = x + 'px';
  pop.style.top  = y + 'px';
  arena.appendChild(pop);
  pop.addEventListener('animationend', () => pop.remove());
}

function clearTargets() {
  arena.querySelectorAll('.target, .hit-flash, .score-pop').forEach(el => el.remove());
}

// ── UI events ─────────────────────────────────────────────────────────────────

startBtn.addEventListener('click', startGame);

playAgainBtn.addEventListener('click', startGame);

saveBtn.addEventListener('click', async () => {
  saveBtn.disabled = true;
  await saveScore(playerNameInput.value, score);
  await renderLeaderboard();
  getBest().then(b => { bestEl.textContent = b; });
});

playerNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});

// ── Init ──────────────────────────────────────────────────────────────────────

getBest().then(b => { bestEl.textContent = b; });
renderLeaderboard();