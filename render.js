function triggerSwing() {
  if (!isUserBatting() || g.swingAnim > 0) return;
  g.swingAnim = 1; tone(190, 'triangle', 0.12); if (!g.pitch || g.pitch.swung) return; g.pitch.swung = true;
  const batB = { bat_wood: 0, bat_alum: 0.008, bat_gold: 0.015, bat_neon: 0.02, bat_bolt: 0.025 }[save.equipped.bats] || 0;
  const win = 0.055 + batB + (g.abilityActive === 'ab_fire' ? 0.045 : 0), diff = Math.abs(g.pitch.t - 0.92);
  if (diff < win || (diff < 0.13 && g.abilityActive === 'ab_magnet')) { tone(540, 'square', 0.35, 0.25); launchBall(true); finishSwing('hit', 4, `💥 HOME RUN! ${Math.floor(395 + Math.random() * 95)} FT!`); }
  else if (diff < 0.135 && g.mode !== 'derby') { const bh = Math.random() < 0.35 ? 2 : 1; tone(340, 'triangle', 0.2); launchBall(false); finishSwing('hit', bh, bh === 2 ? '🔥 DOUBLE!' : '⚾ BASE HIT!'); }
  else finishSwing('strike', 0, 'SWING & MISS!');
}
function finishSwing(o, b, m) { if (isOnlineMode() && conn) conn.send({ type: 'result', outcome: o, basesHit: b, msg: m }); applyTurnResult(o, b, m); }

function applyTurnResult(o, bh, msg) {
  g.pitch = null;
  if (g.mode === 'derby') {
    if (o === 'hit' && bh === 4) { g.p1Score++; save.coins += 15; save.xp += 15; persist(); showBanner(`${msg} (+15 💰)`, '#10b981'); }
    else { g.outs++; tone(130, 'sawtooth', 0.2); showBanner(`OUT! (${10 - g.outs} LEFT)`, '#ef4444'); }
    updateGameHUD(); return g.outs >= 10 ? endMatch() : setTimeout(setupTurn, 1200);
  }
  if (o === 'hit') {
    g.balls = 0; g.strikes = 0; let runs = 0, nb = [false, false, false];
    for (let i = 2; i >= 0; i--) if (g.bases[i]) { if (i + bh >= 3) runs++; else nb[i + bh] = true; }
    if (bh >= 4) runs++; else nb[bh - 1] = true; g.bases = nb;
    if (g.half === 'TOP') g.p1Score += runs; else g.p2Score += runs;
    if (isUserBatting()) { save.coins += bh === 4 ? 25 : 8; save.xp += bh === 4 ? 25 : 10; persist(); }
    showBanner(msg, bh === 4 ? '#10b981' : '#fbbf24'); updateGameHUD(); setTimeout(setupTurn, 1300);
  } else if (o === 'strike') {
    g.strikes++; tone(130, 'sawtooth', 0.2);
    if (g.strikes >= 3) { showBanner('⚾ STRIKEOUT!', '#ef4444'); if (!isUserBatting()) { save.coins += 10; save.xp += 15; persist(); } recordOut(); }
    else { showBanner(`${msg} (${g.balls}-${g.strikes})`, '#f87171'); updateGameHUD(); setTimeout(setupTurn, 1000); }
  } else { g.balls++; if (g.balls >= 4) { showBanner('🚶 WALK!', '#60a5fa'); applyTurnResult('hit', 1, 'WALK'); } else { showBanner(`BALL (${g.balls}-${g.strikes})`, '#93c5fd'); updateGameHUD(); setTimeout(setupTurn, 1000); } }
}

function recordOut() {
  g.balls = 0; g.strikes = 0; g.outs++;
  if (g.outs >= 3) {
    g.outs = 0; g.bases = [false, false, false]; g.abilityUsedThisInning = false;
    if (g.half === 'TOP') { g.half = 'BOT'; showBanner('🔄 SWITCH SIDES!', '#fbbf24'); }
    else { if (g.inning >= 3 && g.p1Score !== g.p2Score) return endMatch(); g.inning++; g.half = 'TOP'; showBanner(`⚾ INNING ${g.inning}!`, '#fbbf24'); }
  }
  updateGameHUD(); setTimeout(setupTurn, 1350);
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

function launchBall(hr) { g.hitBall = { x: canvas.width / 2, y: canvas.height * 0.72, vx: (Math.random() - 0.5) * 6, vy: hr ? -14 : -9, size: 10 }; }
window.addEventListener('keydown', e => { if (e.code === 'Space' && document.getElementById('screen-game').classList.contains('active')) { e.preventDefault(); triggerSwing(); } });

function drawPlayer(x, y, s, eq, ang = 0) {
  const jer = getItem('jerseys', eq.jerseys), hat = getItem('hats', eq.hats), drip = getItem('drip', eq.drip), bat = getItem('bats', eq.bats);
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = jer.color; ctx.fillRect(-15, -55, 30, 62);
  if (drip.chain) { ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -48, 9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(0, -68, 12, 0, Math.PI * 2); ctx.fill();
  if (drip.shades) { ctx.fillStyle = '#06b6d4'; ctx.fillRect(-10, -72, 20, 6); }
  if (hat.id === 'hat_crown') { ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.moveTo(-11, -78); ctx.lineTo(-11, -88); ctx.lineTo(0, -90); ctx.lineTo(11, -88); ctx.lineTo(11, -78); ctx.fill(); }
  else if (hat.color) { ctx.fillStyle = hat.color; ctx.fillRect(-12, -82, 24, 8); ctx.fillRect(-12, -77, 30, 3); }
  if (ang !== null) { ctx.save(); ctx.translate(10, -35); ctx.rotate(ang); if (bat.trail && g.swingAnim > 0.2) { ctx.fillStyle = bat.trail; ctx.globalAlpha = 0.35; ctx.fillRect(0, -14, 72, 24); ctx.globalAlpha = 1; } ctx.fillStyle = bat.color; ctx.fillRect(0, -5, 70, 8); ctx.restore(); }
  ctx.restore();
}

function loop() {
  const w = canvas.width, h = canvas.height; ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, w, h * 0.42); ctx.fillStyle = '#1e3a8a'; ctx.fillRect(0, h * 0.34, w, h * 0.08);
  ctx.fillStyle = '#15803d'; ctx.fillRect(0, h * 0.42, w, h * 0.58); ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.moveTo(w * 0.14, h); ctx.lineTo(w * 0.5, h * 0.48); ctx.lineTo(w * 0.86, h); ctx.fill();
  ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.54, 48, 16, 0, 0, Math.PI * 2); ctx.fill();
  const opp = { jerseys: 'jer_red', hats: 'hat_red', drip: 'drip_none', bats: 'bat_wood' };
  drawPlayer(w * 0.5, h * 0.53, 0.58, isUserBatting() ? (friendEquip || opp) : save.equipped, null);
  if (g.swingAnim > 0) g.swingAnim = Math.max(0, g.swingAnim - 0.08);
  drawPlayer(w * 0.5 - 88, h * 0.78, 1.05, isUserBatting() ? save.equipped : (friendEquip || opp), -0.65 + (1 - g.swingAnim) * 2.15);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.strokeRect(w * 0.5 - 56, h * 0.66 - 61, 112, 122);
  if (g.pitch) {
    const p = g.pitch; p.t += p.speed;
    ctx.fillStyle = p.speed > 0.028 ? '#f97316' : '#fff'; ctx.beginPath(); ctx.arc(w * 0.5 + p.tx * p.t + Math.sin(p.t * Math.PI) * p.curve, h * 0.47 + (h * 0.66 + p.ty - h * 0.47) * p.t, 4 + p.t * 11, 0, Math.PI * 2); ctx.fill();
    if (!isOnlineMode() && !isUserBatting() && p.t >= 0.92 && !p.swung) { p.swung = true; if (p.isStrike && p.speed < 0.028 && Math.random() < 0.24) { launchBall(false); applyTurnResult('hit', 1, 'RIVAL HIT!'); } else if (p.isStrike) applyTurnResult('strike', 0, 'STRIKE!'); else applyTurnResult('ball', 0, 'BALL'); }
    if (isUserBatting() && p.t >= 1.05 && !p.swung) finishSwing(p.isStrike ? 'strike' : 'ball', 0, p.isStrike ? 'CALLED STRIKE!' : 'BALL');
  }
  if (g.hitBall) { const hb = g.hitBall; hb.x += hb.vx; hb.y += hb.vy; hb.size = Math.max(2, hb.size - 0.15); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hb.x, hb.y, hb.size, 0, Math.PI * 2); ctx.fill(); }
  requestAnimationFrame(loop);
}
updateTopBar(); loop();
