function openLocker(cat, tabBtn) {
  showScreen('locker');
  if (tabBtn) { document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); tabBtn.classList.add('active'); }
  const grid = document.getElementById('locker-grid'); grid.innerHTML = '';
  ITEMS[cat].forEach(item => {
    const owned = save.owned.includes(item.id), eq = save.equipped[cat] === item.id;
    const div = document.createElement('div'); div.className = 'card';
    div.innerHTML = `<h3>${item.name}</h3><p>${item.perk || item.desc || 'Cosmetic Drip'}</p>` +
      (eq ? `<button class="btn-green" disabled>EQUIPPED ✓</button>` : owned ? `<button class="btn-blue" onclick="equipItem('${cat}','${item.id}')">EQUIP</button>` : `<button class="btn-dark" disabled>LOCKED 🔒</button>`);
    grid.appendChild(div);
  });
}
function equipItem(cat, id) { save.equipped[cat] = id; persist(); openLocker(cat); }

function openShop() {
  showScreen('shop');
  const grid = document.getElementById('daily-shop-grid'); grid.innerHTML = '';
  const daySeed = Math.floor(Date.now() / 86400000);
  const pool = [...ITEMS.bats.slice(1).map(x => ({ ...x, cat: 'bats' })), ...ITEMS.hats.slice(1, 4).map(x => ({ ...x, cat: 'hats' })), ...ITEMS.drip.slice(1).map(x => ({ ...x, cat: 'drip' })), ...ITEMS.jerseys.slice(1).map(x => ({ ...x, cat: 'jerseys' })), ...ITEMS.abilities.slice(1).map(x => ({ ...x, cat: 'abilities' }))];
  for (let i = 0; i < 3; i++) {
    const item = pool[(daySeed + i * 3) % pool.length], owned = save.owned.includes(item.id);
    const div = document.createElement('div'); div.className = 'card';
    div.innerHTML = `<h3>${item.name}</h3><p>${item.perk || item.desc || 'Daily Drip'}</p>` +
      (owned ? `<button class="btn-dark" disabled>OWNED ✓</button>` : `<button class="btn-gold" onclick="buyShopItem('${item.cat}','${item.id}',${item.price})">BUY (${item.price} 💰)</button>`);
    grid.appendChild(div);
  }
}

function buyShopItem(cat, id, price) {
  if (save.coins < price) return showModal('NEED COINS', 'Play matches to earn more coins!');
  save.coins -= price; save.owned.push(id); save.equipped[cat] = id; persist(); openShop();
  showModal('UNLOCKED!', `Equipped ${getItem(cat, id).name}!`);
}

function buyPack(tier, cost) {
  if (save.coins < cost) return showModal('NEED COINS', `Need ${cost} coins!`);
  save.coins -= cost;
  const locked = [...ITEMS.bats.slice(1), ...ITEMS.hats.slice(1, 4), ...ITEMS.drip.slice(1), ...ITEMS.jerseys.slice(1), ...ITEMS.abilities.slice(1)].filter(x => !save.owned.includes(x.id));
  if (!locked.length) { save.coins += Math.floor(cost * 0.8); persist(); return showModal('ALL OWNED!', 'Refunded 80% coins.'); }
  const pick = locked[Math.floor(Math.random() * locked.length)]; save.owned.push(pick.id); persist();
  showModal(`🎉 ${tier.toUpperCase()} PACK!`, `You pulled: ${pick.name}!`);
}

const SEASON_TIERS = Array.from({ length: 20 }, (_, i) => ({
  tier: i + 1,
  free: (i + 1) % 5 === 0 ? { label: '+150 💰 Bonus', type: 'coins', val: 150 } : { label: `+${(i + 1) * 25} Coins`, type: 'coins', val: (i + 1) * 25 },
  vip: i + 1 === 20 ? { label: '👑 Royal Crown', type: 'item', id: 'hat_crown' } : i + 1 === 10 ? { label: '⚡ Lightning Bat', type: 'item', id: 'bat_bolt' } : i + 1 === 5 ? { label: '🧲 Magnet Bat', type: 'item', id: 'ab_magnet' } : { label: `+${(i + 1) * 50} VIP Coins`, type: 'coins', val: (i + 1) * 50 }
}));

function openSeason() {
  showScreen('season');
  const lvl = Math.min(20, Math.floor(save.xp / 100) + 1);
  document.getElementById('sp-lvl').textContent = lvl;
  document.getElementById('sp-bar').style.width = (lvl === 20 ? 100 : (save.xp % 100)) + '%';
  document.getElementById('vip-buy-btn').style.display = save.vip ? 'none' : 'inline-block';
  const list = document.getElementById('tier-list'); list.innerHTML = '';
  SEASON_TIERS.forEach(st => {
    const unl = lvl >= st.tier, fc = save.claimedFree.includes(st.tier), vc = save.claimedVip.includes(st.tier);
    const row = document.createElement('div'); row.className = 'tier-row' + (unl ? ' unlocked' : '');
    row.innerHTML = `<div><b>TIER ${st.tier}</b></div><div>FREE: ${st.free.label}<br>${fc ? '✓' : unl ? `<button class="btn-green" style="padding:3px 8px;font-size:11px;" onclick="claimTier(${st.tier},false)">CLAIM</button>` : '🔒'}</div><div>VIP: ${st.vip.label}<br>${!save.vip ? 'Locked' : vc ? '✓' : unl ? `<button class="btn-gold" style="padding:3px 8px;font-size:11px;" onclick="claimTier(${st.tier},true)">CLAIM</button>` : '🔒'}</div>`;
    list.appendChild(row);
  });
}

function buyVIP() { if (save.coins < 600) return showModal('NEED 600 COINS', 'Keep playing!'); save.coins -= 600; save.vip = true; persist(); openSeason(); }
function claimTier(t, vip) {
  const r = vip ? SEASON_TIERS[t - 1].vip : SEASON_TIERS[t - 1].free;
  if (vip) save.claimedVip.push(t); else save.claimedFree.push(t);
  if (r.type === 'coins') save.coins += r.val; else if (!save.owned.includes(r.id)) save.owned.push(r.id);
  persist(); openSeason(); showModal('CLAIMED!', r.label);
}
function redeemCode() {
  const c = document.getElementById('code-input').value.trim().toUpperCase(), v = { LAUNCH: 200, BUCKETS: 300, VIP2026: 500 };
  if (!v[c] || save.codes.includes(c)) return showModal('CODE ERROR', 'Invalid or already used.');
  save.codes.push(c); save.coins += v[c]; persist(); showModal('REDEEMED!', `+${v[c]} Coins!`);
}
const BOT_LB = [
  ['KING_DINGER', 1420], ['YARD_GOAT', 1290], ['BOMB_SQUAD', 1180], ['VELO_99', 1095], ['MOONSHOT_X', 1020],
  ['ACE_SLIDER', 940], ['BARREL_GOD', 880], ['WALKOFF_KID', 810], ['CLUTCH_24', 750], ['GRAND_SLAM', 690],
  ['NITRO_BAT', 630], ['CURVE_KING', 580], ['HEATER_105', 520], ['SLUG_FEST', 470], ['DIAMOND_J', 420],
  ['FASTBALL_Z', 375], ['PINPOINT_P', 330], ['RALLY_CAP', 290], ['SOUTHPAW', 250], ['CLEANUP_4', 210],
  ['TRIPLE_ALLEY', 175], ['BUNT_CHEESE', 140], ['ROOKIE_STAR', 105], ['DUGOUT_DAN', 70], ['BAT_BOY', 35]
];

function openLeaderboard() {
  showScreen('lb');
  const all = [...BOT_LB.map(([n, rp]) => ({ n, rp, me: false })), { n: save.name + ' (YOU)', rp: save.rp, me: true }];
  all.sort((a, b) => b.rp - a.rp);
  const list = document.getElementById('lb-list'); list.innerHTML = '';
  all.slice(0, 25).forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'tier-row' + (p.me ? ' unlocked' : '');
    row.innerHTML = `<div><b>#${i + 1}</b></div><div><b>${p.n}</b></div><div style="text-align:right;color:#f472b6;"><b>${p.rp} RP</b> (${getRankName(p.rp)})</div>`;
    list.appendChild(row);
  });
}
