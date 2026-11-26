let shake = 0, hitStop = 0;

function triggerSwing() {
  if (!isUserBatting() || g.swingAnim > 0) return;
  g.swingAnim = 1; tone(190, 'triangle', 0.12); if (!g.pitch || g.pitch.swung) return; g.pitch.swung = true;
  const p = g.pitch, batB = { bat_wood: 0, bat_alum: 0.01, bat_gold: 0.018, bat_neon: 0.022, bat_bolt: 0.028 }[save.equipped.bats] || 0;
  const perfWin = 0.075 + batB + (g.abilityActive === 'ab_fire' ? 0.05 : 0), diff = p.t - 0.92, absDiff = Math.abs(diff);
  const pciRadius = 28 + batB * 350 + (g.abilityActive === 'ab_fire' ? 14 : 0);
  const pciDist = Math.hypot(p.tx - pci.x, p.ty - pci.y);

  if (!p.isStrike) return finishSwing('strike', 0, 'CHASED A BAD PITCH!');
  if (pciDist > pciRadius) return finishSwing('strike', 0, 'MISSED WITH PCI!');

  if (absDiff <= perfWin && pciDist <= pciRadius * 0.65 || (absDiff <= 0.16 && g.abilityActive === 'ab_magnet')) {
    shake = 15; hitStop = 6; tone(580, 'square', 0.35, 0.25); launchBall(true);
    finishSwing('hit', 4, `💥 PERFECT BARREL! ${Math.floor(410 + Math.random() * 90)} FT!`);
  } else if (absDiff <= 0.165 && g.mode !== 'derby') {
    const bh = Math.random() < 0.35 ? 2 : 1; shake = 6; hitStop = 3; tone(360, 'triangle', 0.2); launchBall(false);
    finishSwing('hit', bh, bh === 2 ? '🔥 GAP DOUBLE!' : '⚾ BASE HIT!');
  } else finishSwing('strike', 0, diff < 0 ? 'TOO EARLY!' : 'TOO LATE!');
}
function finishSwing(o, b, m) { if (isOnlineMode() && conn) conn.send({ type: 'result', outcome: o, basesHit: b, msg: m }); applyTurnResult(o, b, m); }

function applyTurnResult(o, bh, msg) {
  g.pitch = null;
  if (g.mode === 'derby') {
    if (o === 'hit' && bh === 4) { g.p1Score++; save.coins += 15; save.xp += 15; persist(); showBanner(`${msg} (+15 💰)`, '#10b981'); }
    else { g.outs++; tone(130, 'sawtooth', 0.2); showBanner(`${msg} (${10 - g.outs} LEFT)`, '#ef4444'); }
    updateGameHUD(); return g.outs >= 10 ? endMatch() : setTimeout(setupTurn, 1100);
  }
  if (o === 'hit') {
    g.balls = 0; g.strikes = 0; let runs = 0, nb = [false, false, false];
    for (let i = 2; i >= 0; i--) if (g.bases[i]) { if (i + bh >= 3) runs++; else nb[i + bh] = true; }
    if (bh >= 4) runs++; else nb[bh - 1] = true; g.bases = nb;
    if (g.half === 'TOP') g.p1Score += runs; else g.p2Score += runs;
    if (isUserBatting()) { save.coins += bh === 4 ? 25 : 8; save.xp += bh === 4 ? 25 : 10; persist(); }
    showBanner(msg, bh === 4 ? '#10b981' : '#fbbf24'); updateGameHUD(); setTimeout(setupTurn, 1200);
  } else if (o === 'strike') {
    g.strikes++; tone(130, 'sawtooth', 0.2);
    if (g.strikes >= 3) { showBanner('⚾ STRIKEOUT!', '#ef4444'); if (!isUserBatting()) { save.coins += 10; save.xp += 15; persist(); } recordOut(); }
    else { showBanner(`${msg} (${g.balls}-${g.strikes})`, '#f87171'); updateGameHUD(); setTimeout(setupTurn, 950); }
  } else { g.balls++; if (g.balls >= 4) { showBanner('🚶 WALK!', '#60a5fa'); applyTurnResult('hit', 1, 'WALK'); } else { showBanner(`BALL (${g.balls}-${g.strikes})`, '#93c5fd'); updateGameHUD(); setTimeout(setupTurn, 950); } }
}

function recordOut() {
  g.balls = 0; g.strikes = 0; g.outs++;
  if (g.outs >= 3) {
    g.outs = 0; g.bases = [false, false, false]; g.abilityUsedThisInning = false;
    if (g.half === 'TOP') { g.half = 'BOT'; showBanner('🔄 SWITCH SIDES!', '#fbbf24'); }
    else { if (g.inning >= 3 && g.p1Score !== g.p2Score) return endMatch(); g.inning++; g.half = 'TOP'; showBanner(`⚾ INNING ${g.inning}!`, '#fbbf24'); }
  }
  updateGameHUD(); setTimeout(setupTurn, 1250);
}

function endMatch() {
  g.active = false;
  if (g.mode === 'derby') { const b = g.p1Score * 10; save.coins += b; save.xp += g.p1Score * 15; persist(); showScreen('menu'); return showModal('🔥 DERBY OVER!', `${g.p1Score} HRs (+${b} 💰)`); }
  const won = isOnlineMode() ? (isHost ? g.p1Score > g.p2Score : g.p2Score > g.p1Score) : g.p1Score > g.p2Score;
  let rpTxt = '';
  if (isRankedMode()) { const d = won ? 25 : -12; save.rp = Math.max(0, save.rp + d); rpTxt = `\nRP: ${d > 0 ? '+' + d : d} (${getRankName(save.rp)})`; }
  save.coins += won ? 60 : 15; save.xp += won ? 60 : 20; persist(); leaveToMenu();
  showModal(won ? '🏆 VICTORY! (+60 💰)' : '⚾ GOOD GAME! (+15 💰)', `Score: ${g.p1Score} - ${g.p2Score}${rpTxt}`);
}

function launchBall(hr) { g.hitBall = { x: canvas.width / 2, y: canvas.height * 0.66, vx: (Math.random() - 0.5) * 7, vy: hr ? -16 : -10, size: 12 }; }
window.addEventListener('keydown', e => { if (e.code === 'Space' && document.getElementById('screen-game').classList.contains('active')) { e.preventDefault(); triggerSwing(); } });

function drawPlayer(x, y, s, eq, ang = 0) {
  const jer = getItem('jerseys', eq.jerseys), hat = getItem('hats', eq.hats), drip = getItem('drip', eq.drip), bat = getItem('bats', eq.bats);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 8, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = jer.color; ctx.fillRect(-15, -55, 30, 62);
  if (drip.chain) { ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -48, 9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(0, -68, 12, 0, Math.PI * 2); ctx.fill();
  if (drip.shades) { ctx.fillStyle = '#06b6d4'; ctx.fillRect(-10, -72, 20, 6); }
  if (hat.id === 'hat_crown') { ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.moveTo(-11, -78); ctx.lineTo(-11, -88); ctx.lineTo(0, -90); ctx.lineTo(11, -88); ctx.lineTo(11, -78); ctx.fill(); }
  else if (hat.color) { ctx.fillStyle = hat.color; ctx.fillRect(-12, -82, 24, 8); ctx.fillRect(-12, -77, 30, 3); }
  if (ang !== null) { ctx.save(); ctx.translate(10, -35); ctx.rotate(ang); if (bat.trail && g.swingAnim > 0.15) { ctx.fillStyle = bat.trail; ctx.globalAlpha = 0.4; ctx.fillRect(0, -16, 76, 28); ctx.globalAlpha = 1; } ctx.fillStyle = bat.color; ctx.fillRect(0, -5, 74, 8); ctx.restore(); }
  ctx.restore();
}

function loop() {
  if (hitStop > 0) { hitStop--; return requestAnimationFrame(loop); }
  if (keys['KeyA'] || keys['ArrowLeft']) pci.x = Math.max(-54, pci.x - 4);
  if (keys['KeyD'] || keys['ArrowRight']) pci.x = Math.min(54, pci.x + 4);
  if (keys['KeyW'] || keys['ArrowUp']) pci.y = Math.max(-58, pci.y - 4);
  if (keys['KeyS'] || keys['ArrowDown']) pci.y = Math.min(58, pci.y + 4);

  const w = canvas.width, h = canvas.height; ctx.save();
  if (shake > 0) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= 0.85; if (shake < 0.5) shake = 0; }
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.42); sky.addColorStop(0, '#020617'); sky.addColorStop(1, '#1e3a8a'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h * 0.42);
  ctx.fillStyle = 'rgba(255,255,220,0.9)'; ctx.fillRect(w * 0.15 - 18, h * 0.1, 36, 16); ctx.fillRect(w * 0.85 - 18, h * 0.1, 36, 16);
  ctx.fillStyle = '#0f172a'; ctx.fillRect(0, h * 0.28, w, h * 0.07); ctx.fillStyle = '#1d4ed8'; ctx.fillRect(0, h * 0.35, w, h * 0.07); ctx.fillStyle = '#fbbf24'; ctx.fillRect(0, h * 0.35, w, 3);
  const grass = ctx.createLinearGradient(0, h * 0.42, 0, h); grass.addColorStop(0, '#166534'); grass.addColorStop(1, '#15803d'); ctx.fillStyle = grass; ctx.fillRect(0, h * 0.42, w, h * 0.58);
  ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.moveTo(w * 0.1, h); ctx.lineTo(w * 0.5, h * 0.48); ctx.lineTo(w * 0.9, h); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(w * 0.1, h); ctx.lineTo(w * 0.5, h * 0.48); ctx.lineTo(w * 0.9, h); ctx.stroke();
  ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.54, 52, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(w * 0.5 - 12, h * 0.53, 24, 4); ctx.beginPath(); ctx.moveTo(w * 0.5 - 24, h * 0.84); ctx.lineTo(w * 0.5 + 24, h * 0.84); ctx.lineTo(w * 0.5 + 24, h * 0.87); ctx.lineTo(w * 0.5, h * 0.9); ctx.lineTo(w * 0.5 - 24, h * 0.87); ctx.fill();

  const opp = { jerseys: 'jer_red', hats: 'hat_red', drip: 'drip_none', bats: 'bat_wood' };
  drawPlayer(w * 0.5, h * 0.53, 0.58, isUserBatting() ? (friendEquip || opp) : save.equipped, null);
  if (g.swingAnim > 0) g.swingAnim = Math.max(0, g.swingAnim - 0.09);
  drawPlayer(w * 0.5 - 92, h * 0.78, 1.05, isUserBatting() ? save.equipped : (friendEquip || opp), -0.85 + (1 - Math.pow(g.swingAnim, 3)) * 2.5);

  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2.5; ctx.strokeRect(w * 0.5 - 56, h * 0.66 - 61, 112, 122);
  if (isUserBatting()) { ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(w * 0.5 + pci.x, h * 0.66 + pci.y, 28, 22, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(w * 0.5 + pci.x, h * 0.66 + pci.y, 12, 9, 0, 0, Math.PI * 2); ctx.stroke(); }

  if (g.pitch) {
    const p = g.pitch; p.t += p.speed;
    const bx = w * 0.5 + p.tx * p.t + Math.sin(p.t * Math.PI) * p.curve, by = h * 0.47 + (h * 0.66 + p.ty - h * 0.47) * p.t, r = 4 + p.t * 11;
    const inGreen = Math.abs(p.t - 0.92) <= 0.085;
    if (isUserBatting() && p.t < 1.02) { ctx.strokeStyle = inGreen ? '#10b981' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = inGreen ? 4 : 2; ctx.beginPath(); ctx.arc(bx, by, r + Math.max(0, (0.92 - p.t) * 48), 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = p.speed > 0.028 ? '#f97316' : '#fff'; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, by, r * 0.7, 0.2, 2.2); ctx.stroke();
    if (!isOnlineMode() && !isUserBatting() && p.t >= 0.92 && !p.swung) { p.swung = true; if (p.isStrike && p.speed < 0.028 && Math.random() < 0.24) { launchBall(false); applyTurnResult('hit', 1, 'RIVAL HIT!'); } else if (p.isStrike) applyTurnResult('strike', 0, 'STRIKE!'); else applyTurnResult('ball', 0, 'BALL'); }
if (isUserBatting() && p.t >= 1.06 && !p.swung) finishSwing(p.isStrike ? 'strike' : 'ball', 0, p.isStrike ? 'CALLED STRIKE!' : 'BALL');
}
if (g.hitBall) { const hb = g.hitBall; hb.x += hb.vx; hb.y += hb.vy; hb.size = Math.max(2, hb.size - 0.15); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hb.x, hb.y, hb.size, 0, Math.PI * 2); ctx.fill(); }
ctx.restore(); requestAnimationFrame(loop);
}
updateTopBar(); loop();
