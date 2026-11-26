function startRankedQueue() {
  showScreen('ranked');
  document.getElementById('q-rank').textContent = getRankName(save.rp);
  if (typeof Peer === 'undefined') { queueTimer = setTimeout(launchRankedRival, 1500); return; }
  peer = new Peer();
  peer.on('open', () => {
    const tc = peer.connect('dinger_ranked_lobby_1'); let ok = false;
    tc.on('open', () => { ok = true; conn = tc; isHost = false; setupConn('ranked_online'); });
    setTimeout(() => {
      if (!ok) {
        try { tc.close(); peer.destroy(); } catch (e) {}
        peer = new Peer('dinger_ranked_lobby_1'); isHost = true;
        peer.on('connection', c => { clearTimeout(queueTimer); conn = c; setupConn('ranked_online'); });
        queueTimer = setTimeout(launchRankedRival, 4500);
      }
    }, 1500);
  });
  peer.on('error', () => { queueTimer = setTimeout(launchRankedRival, 1000); });
}

function launchRankedRival() {
  clearTimeout(queueTimer);
  if (peer) { try { peer.destroy(); } catch (e) {} peer = null; conn = null; }
  const rivals = [
    { name: 'RIVAL ACE', equip: { jerseys: 'jer_red', hats: 'hat_red', drip: 'drip_shades', bats: 'bat_alum' } },
    { name: 'RIVAL SLUGGER', equip: { jerseys: 'jer_black', hats: 'hat_black', drip: 'drip_chain', bats: 'bat_gold' } },
    { name: 'RIVAL DEMON', equip: { jerseys: 'jer_gold', hats: 'hat_crown', drip: 'drip_combo', bats: 'bat_bolt' } }
  ];
  const pick = rivals[Math.min(2, Math.floor(save.rp / 250))];
  friendEquip = pick.equip; startMatch('ranked_bot', pick.name);
}

function hostFriendly() {
  if (typeof Peer === 'undefined') return;
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  document.getElementById('host-status').textContent = `CODE: ${code} (Waiting...)`;
  isHost = true; peer = new Peer('dinger_friend_' + code);
  peer.on('connection', c => { conn = c; setupConn('friendly_online'); });
}

function joinFriendly() {
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  if (code.length !== 4 || typeof Peer === 'undefined') return;
  document.getElementById('join-status').textContent = 'Connecting...';
  isHost = false; peer = new Peer();
  peer.on('open', () => { conn = peer.connect('dinger_friend_' + code); setupConn('friendly_online'); });
}

function setupConn(mode) {
  conn.on('open', () => { conn.send({ type: 'hello', equipped: save.equipped }); startMatch(mode, 'FRIEND'); });
  conn.on('data', d => {
    if (d.type === 'hello') friendEquip = d.equipped;
    if (d.type === 'pitch') receiveOnlinePitch(d.pitch);
    if (d.type === 'result') applyTurnResult(d.outcome, d.basesHit, d.msg);
  });
}
