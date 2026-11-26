window.oppInfo = { name: 'RIVAL', rp: 0, lbRank: null, isBot: true };

function startRankedQueue() {
  showScreen('ranked');
  let sec = 15;
  document.getElementById('q-rank').textContent = getRankName(save.rp);
  document.getElementById('ranked-status').textContent = `Searching for real opponent... (${sec}s until Ranked Rival)`;
  clearInterval(window.queueInt); clearTimeout(queueTimer);
  window.queueInt = setInterval(() => {
    sec--;
    if (sec > 0) document.getElementById('ranked-status').textContent = `Searching for real opponent... (${sec}s until Ranked Rival)`;
  }, 1000);

  if (typeof Peer === 'undefined') { queueTimer = setTimeout(launchRankedRival, 15000); return; }
  try {
    peer = new Peer();
    peer.on('open', () => {
      const tc = peer.connect('dinger_ranked_lobby_1'); let ok = false;
      tc.on('open', () => { ok = true; clearInterval(window.queueInt); conn = tc; isHost = false; setupConn('ranked_online'); });
      setTimeout(() => {
        if (!ok) {
          try { tc.close(); peer.destroy(); } catch (e) {}
          peer = new Peer('dinger_ranked_lobby_1'); isHost = true;
          peer.on('connection', c => { clearTimeout(queueTimer); clearInterval(window.queueInt); conn = c; setupConn('ranked_online'); });
          queueTimer = setTimeout(launchRankedRival, 13500);
        }
      }, 1500);
    });
    peer.on('error', () => { queueTimer = setTimeout(launchRankedRival, 15000); });
  } catch (e) { queueTimer = setTimeout(launchRankedRival, 15000); }
}

function launchRankedRival() {
  clearTimeout(queueTimer); clearInterval(window.queueInt);
  if (peer) { try { peer.destroy(); } catch (e) {} peer = null; conn = null; }
  const rivals = [
    { name: 'RIVAL ACE', rp: 40, equip: { jerseys: 'jer_red', hats: 'hat_red', drip: 'drip_shades', bats: 'bat_alum' } },
    { name: 'RIVAL SLUGGER', rp: 280, equip: { jerseys: 'jer_black', hats: 'hat_black', drip: 'drip_chain', bats: 'bat_gold' } },
    { name: 'RIVAL DEMON', rp: 650, equip: { jerseys: 'jer_gold', hats: 'hat_crown', drip: 'drip_combo', bats: 'bat_bolt' } }
  ];
  const pick = rivals[Math.min(2, Math.floor(save.rp / 250))];
  friendEquip = pick.equip;
  window.oppInfo = { name: pick.name, rp: pick.rp, lbRank: null, isBot: true };
  beginMatchFlow('ranked_bot', pick.name);
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
  conn.on('open', () => {
    const coinFlipHostBatsFirst = Math.random() < 0.5;
    conn.send({ type: 'hello', equipped: save.equipped, name: save.name, rp: save.rp, lbRank: getTop25Rank(save.playerId), hostBatsFirst: coinFlipHostBatsFirst });
    if (isHost) window.coinHostBatsFirst = coinFlipHostBatsFirst;
    beginMatchFlow(mode, 'PLAYER');
  });
  conn.on('data', d => {
    if (d.type === 'hello') {
      friendEquip = d.equipped;
      window.oppInfo = { name: d.name || 'PLAYER', rp: d.rp || 0, lbRank: d.lbRank || null, isBot: false };
      if (!isHost && typeof d.hostBatsFirst === 'boolean') window.coinHostBatsFirst = d.hostBatsFirst;
      renderVSCards();
    }
    if (d.type === 'pitch') receiveOnlinePitch(d.pitch);
    if (d.type === 'result') applyTurnResult(d.outcome, d.basesHit, d.msg);
  });
}
