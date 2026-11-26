const ITEMS = {
  bats: [
    { id: 'bat_wood', name: 'Classic Wood', color: '#d97706', trail: null, perk: 'Standard PCI & timing', price: 0 },
    { id: 'bat_alum', name: 'Pro Aluminum', color: '#94a3b8', trail: '#e2e8f0', perk: '+5% PCI & timing', price: 150 },
    { id: 'bat_gold', name: '24K Gold Slugger', color: '#fbbf24', trail: '#fde047', perk: '+10% PCI & timing', price: 350 },
    { id: 'bat_neon', name: 'Cyber Neon Bat', color: '#22d3ee', trail: '#06b6d4', perk: '+12% PCI & timing', price: 500 },
    { id: 'bat_bolt', name: 'Lightning Fury', color: '#a855f7', trail: '#c084fc', perk: '+15% PCI & timing', price: 750 }
  ],
  hats: [
    { id: 'hat_none', name: 'No Cap', color: null, price: 0 },
    { id: 'hat_red', name: 'Crimson Fitted', color: '#ef4444', price: 120 },
    { id: 'hat_blue', name: 'Royal Helmet', color: '#2563eb', price: 180 },
    { id: 'hat_black', name: 'Stealth Black Cap', color: '#1f2937', price: 250 },
    { id: 'hat_crown', name: 'Tier 20 Royal Crown', color: '#fbbf24', price: 9999 }
  ],
  drip: [
    { id: 'drip_none', name: 'Clean Look', shades: false, chain: false, price: 0 },
    { id: 'drip_shades', name: 'Pit Viper Shades', shades: true, chain: false, price: 200 },
    { id: 'drip_chain', name: 'VVS Ice Chain', shades: false, chain: true, price: 300 },
    { id: 'drip_combo', name: 'Vipers + Ice Chain', shades: true, chain: true, price: 550 }
  ],
  jerseys: [
    { id: 'jer_blue', name: 'Electric Blue', color: '#2563eb', price: 0 },
    { id: 'jer_red', name: 'Heat Red', color: '#dc2626', price: 120 },
    { id: 'jer_black', name: 'Midnight Blackout', color: '#18181b', price: 220 },
    { id: 'jer_emerald', name: 'Money Green', color: '#059669', price: 280 },
    { id: 'jer_gold', name: 'Championship Gold', color: '#d97706', price: 450 }
  ],
  abilities: [
    { id: 'ab_none', name: 'No Ability', desc: 'Pure skill mode.', price: 0 },
    { id: 'ab_fire', name: '🔥 On Fire', desc: 'Huge PCI & green timing window!', price: 250 },
    { id: 'ab_gas', name: '⚡ 105 MPH Gas', desc: 'Unhittable blazing fastball!', price: 300 },
    { id: 'ab_freeze', name: '❄️ Freeze Pitch', desc: 'Slows pitch by 35%!', price: 350 },
    { id: 'ab_magnet', name: '🧲 Magnet Bat', desc: 'Good hits become Home Runs!', price: 450 }
  ]
};

let save = JSON.parse(localStorage.getItem('dinger_save_v3') || 'null') || {
  name: 'SLUGGER_' + Math.floor(100 + Math.random() * 899),
  coins: 250, xp: 0, rp: 0, vip: false, claimedFree: [], claimedVip: [], codes: [],
  owned: ['bat_wood', 'hat_none', 'drip_none', 'jer_blue', 'ab_none'],
  equipped: { bats: 'bat_wood', hats: 'hat_none', drip: 'drip_none', jerseys: 'jer_blue', abilities: 'ab_none' }
};
let peer = null, conn = null, isHost = false, friendEquip = null, friendName = 'RIVAL', queueTimer = null, queueInt = null, g = { active: false };

function getRankName(rp) { return rp >= 1000 ? 'HALL OF FAME' : rp >= 600 ? 'DIAMOND' : rp >= 350 ? 'GOLD' : rp >= 150 ? 'SILVER' : rp >= 50 ? 'BRONZE' : 'ROOKIE'; }
function getItem(cat, id) { return ITEMS[cat].find(x => x.id === id) || ITEMS[cat]; }
function persist() { localStorage.setItem('dinger_save_v3', JSON.stringify(save)); updateTopBar(); }
function showModal(t, m) { document.getElementById('modal-title').textContent = t; document.getElementById('modal-msg').textContent = m; document.getElementById('modal').style.display = 'flex'; }
function closeModal() { document.getElementById('modal').style.display = 'none'; }
function showScreen(n) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById('screen-' + n).classList.add('active'); if (n === 'game') resizeCanvas(); }
function leaveToMenu() { clearTimeout(queueTimer); clearInterval(queueInt); if (peer) { try { peer.destroy(); } catch (e) {} peer = null; conn = null; } g.active = false; showScreen('menu'); }
function changeName() { const n = prompt('Enter your player name (max 14 chars):', save.name); if (n && n.trim()) { save.name = n.trim().toUpperCase().slice(0, 14); persist(); } }

function updateTopBar() {
  document.getElementById('top-name').textContent = save.name;
  document.getElementById('top-coins').textContent = save.coins;
  document.getElementById('top-lvl').textContent = Math.min(20, Math.floor(save.xp / 100) + 1);
  document.getElementById('top-rp').textContent = save.rp;
  document.getElementById('top-rank').textContent = getRankName(save.rp);
  document.getElementById('equipped-summary').textContent = `${getItem('bats', save.equipped.bats).name} · ${getItem('jerseys', save.equipped.jerseys).name} · ${getItem('abilities', save.equipped.abilities).name}`;
}
