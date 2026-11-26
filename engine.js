if (!save.playerId) { save.playerId = 'P_' + Math.random().toString(36).slice(2, 9); persist(); }
const canvas = document.getElementById('c'), ctx = canvas.getContext('2d'), controls = document.getElementById('game-controls'), banner = document.getElementById('banner');
let pci = { x: 0, y: 0 }, keys = {};

function tone(f, t, d, v = 0.2) { try { const AC = window.AudioContext || window.webkitAudioContext; if (!window._ac) window._ac = new AC(); if (window._ac.state === 'suspended') window._ac.resume(); const o = window._ac.createOscillator(), gn = window._ac.createGain(); o.type = t; o.frequency.setValueAtTime(f, window._ac.currentTime); gn.gain.setValueAtTime(v, window._ac.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, window._ac.currentTime + d); o.connect(gn); gn.connect(window._ac.destination); o.start(); o.stop(window._ac.currentTime + d); } catch (e) {} }
function resizeCanvas() { canvas.width = Math.max(300, canvas.parentElement.clientWidth || window.innerWidth); canvas.height = Math.max(300, canvas.parentElement.clientHeight || window.innerHeight); }
window.addEventListener('resize', resizeCanvas);
function showBanner(txt, clr = '#fbbf24') { banner.textContent = txt; banner.style.color = clr; banner.style.opacity = '1'; clearTimeout(banner._t); banner._t = setTimeout(() => banner.style.opacity = '0', 1300); }

function movePCI(cx, cy) { const r = canvas.getBoundingClientRect(); pci.x = Math.max(-54, Math.min(54, (cx - r.left) - canvas.width * 0.5)); pci.y = Math.max(-58, Math.min(58, (cy - r.top) - canvas.height * 0.66)); }
canvas.addEventListener('pointermove', e => { if (isUserBatting()) movePCI(e.clientX, e.clientY); });
canvas.addEventListener('pointerdown', e => { if (isUserBatting()) movePCI(e.clientX, e.clientY); });
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup', e => { keys[e.code] = false; });

function renderVSCards() {
  const myLb = getTop25Rank(save.playerId);
  const opp = window.oppInfo || { name: 'RIVAL', rp: 0, lbRank: null };
  document.getElementById('vs-cards').innerHTML = `
    <div class="card" style="min-width:170px;"><h3>👤 ${save.name}</h3><p style="color:#f472b6;">🏆 ${getRankName(save.rp)} (${save.rp} RP)</p><p style="color:#fbbf24;">${myLb ? `📊 #${myLb} ON TOP 25` : 'Unranked on Top 25'}</p></div>
    <div style="font-size:26px;font-weight:900;color:#ef4444;">VS</div>
    <div class="card" style="min-width:170px;"><h3>🎯 ${opp.name}</h3><p style="color:#f472b6;">🏆 ${getRankName(opp.rp)} (${opp.rp} RP)</p><p style="color:#fbbf24;">${opp.lbRank ? `📊 #${opp.lbRank} ON TOP 25` : 'Not on Top 25'}</p></div>`;
}

function beginMatchFlow(mode, oppName) {
  if (mode === 'derby') return startMatch('derby', 'DERBY', true);
  showScreen('vs'); renderVSCards();
  const flipBox = document.getElementById('coin-flip-box');
  flipBox.textContent = '🪙 FLIPPING COIN...';
  const userBatsFirst = (mode === 'ranked_online' || mode === 'friendly_online')
    ? (isHost ? window.coinHostBatsFirst : !window.coinHostBatsFirst)
    : (Math.random() < 0.5);
  setTimeout(() => { flipBox.textContent = userBatsFirst ? '🪙 HEADS! YOU BAT FIRST (TOP 1)!' : '🪙 TAILS! YOU PITCH FIRST (TOP 1)!'; }, 1200);
  setTimeout(() => { startMatch(mode, oppName, userBatsFirst); }, 2700);
}

function startMatch(mode, oppName = 'CPU', userBatsFirst = true) {
  showScreen('game'); resizeCanvas(); pci = { x: 0, y: 0 };
  g = { mode, oppName, userBatsFirst, active: true, inning: 1, half: 'TOP', outs: 0, balls: 0, strikes: 0, p1Score: 0, p2Score: 0, bases: [false, false, false], pitch: null, hitBall: null, swingAnim: 0, abilityUsedThisInning: false, abilityActive: null };
  updateGameHUD(); setupTurn();
}

function isOnlineMode() { return g.mode === 'ranked_online' || g.mode === 'friendly_online'; }
function isRankedMode() { return g.mode === 'ranked_bot' || g.mode === 'ranked_online'; }
function isUserBatting() {
  if (g.mode === 'derby') return true;
  if (!isOnlineMode()) return g.userBatsFirst ? g.half === 'TOP' : g.half === 'BOT';
  const hostBats = window.coinHostBatsFirst !== false;
  return isHost ? (hostBats ? g.half === 'TOP' : g.half === 'BOT') : (hostBats ? g.half === 'BOT' : g.half === 'TOP');
}

function updateGameHUD() {
  if (g.mode === 'derby') { document.getElementById('hud-inning').textContent = `DERBY · ${10 - g.outs} OUTS LEFT`; document.getElementById('hud-score').textContent = `${save.name}: ${g.p1Score} HRs`; document.getElementById('hud-count').textContent = `OUTS: ${g.outs}/10`; }
  else { document.getElementById('hud-inning').textContent = `${isRankedMode() ? '🏆 ' : '🤝 '}${g.half} ${g.inning}`; document.getElementById('hud-score').textContent = `${save.name} ${g.p1Score} - ${g.p2Score} ${window.oppInfo.name}`; document.getElementById('hud-count').textContent = `${g.balls}-${g.strikes} | ${g.outs} OUT`; }
  ['b1', 'b2', 'b3'].forEach((id, i) => document.getElementById(id).classList.toggle('on', g.bases[i]));
}

function setupTurn() {
  controls.innerHTML = ''; g.pitch = null; g.hitBall = null; g.abilityActive = null; if (!g.active) return;
  const ab = getItem('abilities', save.equipped.abilities);
  if (isUserBatting()) {
    const sw = document.createElement('button'); sw.id = 'swing-btn'; sw.textContent = 'AIM PCI + SWING'; sw.onpointerdown = () => triggerSwing(); controls.appendChild(sw);
    if (ab.id !== 'ab_none' && !g.abilityUsedThisInning && ['ab_fire', 'ab_freeze', 'ab_magnet'].includes(ab.id)) {
      const b = document.createElement('button'); b.id = 'ability-btn'; b.textContent = `USE ${ab.name}`;
      b.onclick = () => { g.abilityUsedThisInning = true; g.abilityActive = ab.id; b.disabled = true; showBanner(`${ab.name} ON!`, '#c084fc'); if (g.pitch && ab.id === 'ab_freeze') g.pitch.speed *= 0.65; };
      controls.appendChild(b);
    }
    if (!isOnlineMode()) setTimeout(throwCpuPitch, 1000); else showBanner('WAITING FOR PITCH...', '#93c5fd');
  } else {
    [{ name: '🔥 FASTBALL', speed: 0.021, curve: 0 }, { name: '🌀 CURVE', speed: 0.015, curve: 52 }, { name: '⚡ SLIDER', speed: 0.018, curve: -46 }, { name: '🐢 CHANGE', speed: 0.013, curve: 14 }].forEach(p => {
      const b = document.createElement('button'); b.className = 'pitch-btn'; b.textContent = p.name; b.onclick = () => throwUserPitch(p); controls.appendChild(b);
    });
    if (ab.id === 'ab_gas' && !g.abilityUsedThisInning) {
      const b = document.createElement('button'); b.id = 'ability-btn'; b.textContent = '⚡ 105 GAS';
      b.onclick = () => { g.abilityUsedThisInning = true; b.disabled = true; throwUserPitch({ speed: 0.032, curve: 0 }); }; controls.appendChild(b);
    }
  }
}

function throwCpuPitch() {
  if (!g.active || !isUserBatting()) return;
  const pick = [{ speed: 0.019, curve: 0 }, { speed: 0.014, curve: 48 }, { speed: 0.017, curve: -44 }][Math.floor(Math.random() * 3)];
  const isS = g.mode === 'derby' ? true : Math.random() < 0.72; const side = Math.random() > 0.5 ? 1 : -1;
  g.pitch = { t: 0, speed: g.abilityActive === 'ab_freeze' ? pick.speed * 0.65 : pick.speed, curve: pick.curve, tx: isS ? (Math.random() * 76 - 38) : side * (78 + Math.random() * 25), ty: isS ? (Math.random() * 82 - 41) : (Math.random() > 0.5 ? 82 : -82), isStrike: isS, swung: false };
}
function throwUserPitch(p) {
  if (g.pitch) return; controls.innerHTML = ''; const isS = Math.random() < 0.78;
  g.pitch = { t: 0, speed: p.speed, curve: p.curve, tx: isS ? (Math.random() * 70 - 35) : 85, ty: isS ? (Math.random() * 75 - 37) : 78, isStrike: isS, swung: false };
  if (isOnlineMode() && conn) conn.send({ type: 'pitch', pitch: g.pitch });
}
function receiveOnlinePitch(p) { g.pitch = { ...p, t: 0, swung: false }; if (g.abilityActive === 'ab_freeze') g.pitch.speed *= 0.65; }
