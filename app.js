// Egg Clicker — app.js (single-page game logic)
// Put this file next to index.html and style.css

const STATE_KEY = 'egg_clicker_repo_v1';

// --- initial data --- //
const NUM_UPGRADES = 60;
const NUM_SHOP = 60;

const ADJ = ['Golden','Mossy','Shimmer','Lunar','Cosmic','Silent','Breezy','Velvet','Neon','Crystal','Aurora','Twilight','Solar','Nimbus','Echo','Radiant','Verdant','Opal','Coral','Ivory'];
const NOUN = ['Meadow','Dawn','Synth','Haven','Vista','Grove','Skyscape','Portal','Cascade','Plume','Arcade','Harbor','Isle','Prairie','Field'];

function uniqueName(prefix, i) {
  return `${ADJ[i % ADJ.length]} ${NOUN[i % NOUN.length]} ${prefix}`;
}

const upgrades = Array.from({length:NUM_UPGRADES}).map((_,i)=>{
  const types = ['click','passive','multi'];
  const type = types[i % types.length];
  const base = Math.round(10 * Math.pow(1.5, i % 12) * (1 + Math.floor(i/12)));
  const value = type === 'click' ? Math.max(1, Math.round(Math.pow(1.35, i%10))) :
                type === 'passive' ? Math.max(0.2, Math.round(10 * Math.pow(1.18, i%10)) / 10) :
                1.08 + (i%5)*0.12;
  return {id:`u${i}`, name: uniqueName('Upgrade', i+1), desc: type==='click'?`+${value} EPC`: type==='passive'? `+${value} EPS` : `x${value.toFixed(2)} multiplier`, type, basePrice: base, value};
});

const shopItems = Array.from({length:NUM_SHOP}).map((_,i)=>{
  const type = i < 40 ? 'theme' : 'decor';
  return {id:`s${i}`, name: uniqueName(type.charAt(0).toUpperCase()+type.slice(1), i), price: Math.round(80 * Math.pow(1.18, i)), type, effect: { index: i }};
});

const bgThemes = Array.from({length:40}).map((_,i)=> {
  const h1 = (i*31)%360, h2 = (i*73+40)%360;
  return { id:i, css: `linear-gradient(135deg,hsl(${h1} 60% 55%), hsl(${h2} 65% 48%))` };
});

const chickenPool = [
  {id:'c1',name:'Clucky',emoji:'🐔',rarity:'common',effect:{epc:0.2}},
  {id:'c2',name:'Peep',emoji:'🐣',rarity:'common',effect:{eps:0.2}},
  {id:'c3',name:'Sunny',emoji:'🐥',rarity:'rare',effect:{epc:1}},
  {id:'c4',name:'Bolt',emoji:'⚡️',rarity:'rare',effect:{eps:1}},
  {id:'c5',name:'Aurora',emoji:'🪶',rarity:'epic',effect:{epc:3,eps:0.5}},
  {id:'c6',name:'Goldcrest',emoji:'🥇',rarity:'legend',effect:{epc:10}},
  {id:'c7',name:'Nimbus',emoji:'☁️',rarity:'epic',effect:{eps:3}},
  {id:'c8',name:'Echo',emoji:'🔔',rarity:'rare',effect:{clickBonus:2}},
  {id:'c9',name:'Sable',emoji:'🖤',rarity:'common',effect:{epc:0.5}},
  {id:'c10',name:'Comet',emoji:'☄️',rarity:'legend',effect:{eps:10,epc:5}},
  {id:'c11',name:'Twinkle',emoji:'✨',rarity:'epic',effect:{eps:2,epc:2}},
  {id:'c12',name:'Voyager',emoji:'🚀',rarity:'rare',effect:{eps:3,epc:1}}
];

const achievements = [
  {id:'a1',name:'First Crack',desc:'Earn 100 eggs'},
  {id:'a2',name:'Hatchling',desc:'Buy 1 chicken'},
  {id:'a3',name:'Collector',desc:'Own 5 chickens'},
  {id:'a4',name:'Upgrader',desc:'Buy 10 upgrades'},
  {id:'a5',name:'Idle Farmer',desc:'Gain 1,000 eggs while offline'},
  {id:'a6',name:'Legend Hunter',desc:'Obtain a legendary chicken'},
  {id:'a7',name:'Theme Hoarder',desc:'Own 10 themes'},
  {id:'a8',name:'Million Egg',desc:'Earn 1,000,000 eggs'}
];

// --- game state --- //
let state = {
  eggs: 0,
  epc: 1,
  eps: 0,
  upgrades: {},
  shop: {},
  ownedChickens: {},
  inventoryThemes: [],
  equippedTheme: null,
  achievements: {},
  lastTick: Date.now()
};

// set defaults
upgrades.forEach(u => state.upgrades[u.id] = 0);
shopItems.forEach(s => state.shop[s.id] = false);
chickenPool.forEach(c => state.ownedChickens[c.id] = 0);
achievements.forEach(a => state.achievements[a.id] = false);

// --- helpers --- //
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const fmt = n => {
  if (n >= 1e9) return (n/1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n/1e6).toFixed(2) + 'M';
  if (n >= 1000) return (n/1000).toFixed(2) + 'k';
  return Math.floor(n);
};
const f2 = n => (n < 10 ? Number(n.toFixed(2)) : fmt(n));

// --- persistence --- //
function save() {
  state.lastTick = Date.now();
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); flashSave(); } catch(e) { console.warn('save failed', e); }
}
function load() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(state, parsed);
      // ensure required keys exist
      upgrades.forEach(u => { if (state.upgrades[u.id] === undefined) state.upgrades[u.id] = 0; });
      shopItems.forEach(s => { if (state.shop[s.id] === undefined) state.shop[s.id] = false; });
      chickenPool.forEach(c => { if (state.ownedChickens[c.id] === undefined) state.ownedChickens[c.id] = 0; });
      if (!state.inventoryThemes) state.inventoryThemes = [];
      if (state.equippedTheme === undefined) state.equippedTheme = null;
      if (!state.achievements) state.achievements = {};
      achievements.forEach(a => { if (state.achievements[a.id] === undefined) state.achievements[a.id] = false; });
    }
  } catch(e){ console.warn('load err', e); }
}
function reset() {
  if (!confirm('Reset all progress?')) return;
  localStorage.removeItem(STATE_KEY);
  location.reload();
}
function flashSave() {
  const btn = $('#saveBtn');
  if (!btn) return;
  const prev = btn.textContent;
  btn.textContent = 'Saved';
  setTimeout(()=> btn.textContent = prev, 700);
}

// --- offline earnings --- //
function handleOffline() {
  const now = Date.now();
  const last = state.lastTick || now;
  const secs = Math.floor((now - last)/1000);
  if (secs <= 0) return;
  const earned = state.eps * secs;
  if (earned > 0.001) {
    state.eggs += earned;
    showModal(`
      <div style="font-weight:700">Welcome back!</div>
      <div style="margin-top:8px">You were away for <strong>${secs}s</strong> and earned <strong>${f2(earned)}</strong> eggs while offline.</div>
      <div style="margin-top:10px"><button id="closeModal" class="small">Close</button></div>
    `);
    // close handler
    document.getElementById('modalRoot').addEventListener('click', function onClose(e){
      if (e.target && e.target.id === 'closeModal') {
        this.innerHTML = '';
        this.removeEventListener('click', onClose);
      }
    });
    // achievement progress
    if (earned >= 1000) unlock('a5');
  }
}

// --- apply saved quantities --- //
function recalc() {
  state.epc = 1;
  state.eps = 0;
  Object.keys(state.upgrades).forEach(id => {
    const count = state.upgrades[id] || 0;
    const u = upgrades.find(x=>x.id===id);
    if (u) {
      for (let i=0;i<count;i++) applyUpgrade(u);
    }
  });
  Object.keys(state.ownedChickens).forEach(cid => {
    const count = state.ownedChickens[cid] || 0;
    const c = chickenPool.find(x=>x.id===cid);
    if (c) {
      for (let i=0;i<count;i++) applyChickenEffect(c);
    }
  });
}

// --- game effects --- //
function applyUpgrade(u) {
  if (u.type === 'click') state.epc += u.value;
  else if (u.type === 'passive') state.eps += u.value;
  else if (u.type === 'multi') { state.epc *= u.value; state.eps *= u.value; }
}
function applyChickenEffect(c) {
  if (c.effect.epc) state.epc += c.effect.epc;
  if (c.effect.eps) state.eps += c.effect.eps;
  if (c.effect.clickBonus) state.epc += c.effect.clickBonus;
}

// --- buy logic --- //
function priceForUpgrade(id) {
  const u = upgrades.find(x=>x.id===id);
  const own = state.upgrades[id]||0;
  return Math.round(u.basePrice * Math.pow(1.12, own));
}
function buyUpgrade(id) {
  const u = upgrades.find(x=>x.id===id);
  const price = priceForUpgrade(id);
  if (state.eggs < price) return showToast('Not enough eggs');
  state.eggs -= price;
  state.upgrades[id] = (state.upgrades[id]||0) + 1;
  applyUpgrade(u);
  showToast(`Bought ${u.name}`);
  playPurchase();
  renderAll();
  save();
  checkAchievements();
}
function buyShop(id) {
  const s = shopItems.find(x=>x.id===id);
  if (!s) return;
  if (state.shop[id]) return showToast('Already owned');
  if (state.eggs < s.price) return showToast('Not enough eggs');
  state.eggs -= s.price;
  state.shop[id] = true;
  if (s.type === 'theme') {
    state.inventoryThemes.push(s.effect.index);
    if (state.equippedTheme === null) {
      applyTheme(s.effect.index);
    }
  }
  showToast(`Purchased ${s.name}`);
  playPurchase();
  renderAll();
  save();
  checkAchievements();
}
function buyChicken(id) {
  const c = chickenPool.find(x=>x.id===id);
  const price = Math.round(180 * (c.rarity==='common'?1:c.rarity==='rare'?6:c.rarity==='epic'?30:150));
  if (state.eggs < price) return showToast('Not enough eggs');
  state.eggs -= price;
  state.ownedChickens[id] = (state.ownedChickens[id]||0) + 1;
  applyChickenEffect(c);
  showToast(`You got ${c.name}!`);
  spawnConfetti();
  playPurchase();
  renderAll();
  save();
  checkAchievements();
}

// --- UI rendering --- //
function countOwnedUpgrades() {
  return Object.values(state.upgrades).reduce((a,b)=>a+b,0);
}

function renderTab(tab='upgrades') {
  const c = $('#tabContent');
  c.innerHTML = '';
  if (tab === 'upgrades') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong>Upgrades</strong><small style="color:var(--muted)">Owned ${countOwnedUpgrades()}</small></div>`;
    const grid = document.createElement('div'); grid.className='grid';
    upgrades.forEach(u=>{
      const owned = state.upgrades[u.id]||0;
      const price = priceForUpgrade(u.id);
      const el = document.createElement('div'); el.className='item';
      el.innerHTML = `<div style="flex:1"><div style="font-weight:700">${u.name} ${owned?`(x${owned})`:''}</div><div style="font-size:12px;color:var(--muted)">${u.desc}</div></div><div style="text-align:right"><div style="font-weight:800">${fmt(price)}</div><button class="buy" data-type="upgrade" data-id="${u.id}">Buy</button></div>`;
      grid.appendChild(el);
    });
    wrapper.appendChild(grid);
    c.appendChild(wrapper);
  } else if (tab === 'shop') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div style="font-weight:700;margin-bottom:8px">Shop</div>`;
    const grid = document.createElement('div'); grid.className='grid';
    shopItems.forEach(s=>{
      const owned = state.shop[s.id];
      const btn = owned ? `<button class="buy" disabled>Owned</button>` : `<button class="buy" data-type="shop" data-id="${s.id}">Buy</button>`;
      const el = document.createElement('div'); el.className='item';
      el.innerHTML = `<div style="flex:1"><div style="font-weight:700">${s.name}</div><div style="font-size:12px;color:var(--muted)">${s.type}</div></div><div style="text-align:right"><div style="font-weight:800">${fmt(s.price)}</div>${btn}</div>`;
      grid.appendChild(el);
    });
    wrapper.appendChild(grid);
    c.appendChild(wrapper);
  } else if (tab === 'chickens') {
    const wrapper = document.createElement('div'); wrapper.innerHTML = `<div style="font-weight:700;margin-bottom:8px">Chickens</div>`;
    const grid = document.createElement('div'); grid.className='grid';
    chickenPool.forEach(ch=>{
      const owned = state.ownedChickens[ch.id]||0;
      const price = Math.round(180 * (ch.rarity==='common'?1:ch.rarity==='rare'?6:ch.rarity==='epic'?30:150));
      const rarityClass = ch.rarity==='legend' ? 'rarity-rainbow' : `rarity-${ch.rarity}`;
      const el = document.createElement('div'); el.className = 'item ' + rarityClass;
      el.innerHTML = `<div style="display:flex;gap:10px;align-items:center"><div style="font-size:22px">${ch.emoji}</div><div><div style="font-weight:700">${ch.name}</div><div style="font-size:12px;color:var(--muted)">Rarity: ${ch.rarity}</div></div></div><div style="text-align:right"><div style="font-weight:800">${fmt(price)}</div><button class="buy" data-type="chicken" data-id="${ch.id}">${owned?'Owned':'Buy'}</button></div>`;
      grid.appendChild(el);
    });
    wrapper.appendChild(grid); c.appendChild(wrapper);
  } else if (tab === 'inventory') {
    const wrapper = document.createElement('div'); wrapper.innerHTML = `<div style="font-weight:700;margin-bottom:8px">Inventory - Themes</div>`;
    const grid = document.createElement('div'); grid.className='grid';
    if (!state.inventoryThemes || state.inventoryThemes.length === 0) {
      grid.innerHTML = `<div style="color:var(--muted)">No themes owned. Buy them in Shop.</div>`;
    } else {
      state.inventoryThemes.forEach(idx => {
        const theme = bgThemes[idx];
        const active = (state.equippedTheme === idx);
        const btn = active ? `<button class="small" disabled>Equipped</button>` : `<button class="small" data-equip="${idx}">Equip</button>`;
        const el = document.createElement('div'); el.className='item';
        el.innerHTML = `<div style="display:flex;gap:10px;align-items:center"><div style="width:56px;height:36px;border-radius:6px;background:${theme.css}"></div><div style="flex:1"><div style="font-weight:700">Theme ${idx+1}</div><div style="font-size:12px;color:var(--muted)">${active? 'Equipped' : 'Owned'}</div></div></div><div style="text-align:right">${btn}</div>`;
        grid.appendChild(el);
      });
    }
    wrapper.appendChild(grid); c.appendChild(wrapper);
  } else if (tab === 'achievements') {
    const wrapper = document.createElement('div'); wrapper.innerHTML = `<div style="font-weight:700;margin-bottom:8px">Achievements</div>`;
    const grid = document.createElement('div'); grid.className='grid';
    achievements.forEach(a=>{
      const unlocked = !!state.achievements[a.id];
      const el = document.createElement('div'); el.className='item';
      el.innerHTML = `<div style="flex:1"><div style="font-weight:700">${a.name} ${unlocked?'<small style="color:var(--muted)"> — Unlocked</small>':''}</div><div style="font-size:12px;color:var(--muted)">${a.desc}</div></div><div style="text-align:right">${unlocked?'<div style="color:var(--accent);font-weight:800">✓</div>':'<div style="color:var(--muted)">Locked</div>'}</div>`;
      grid.appendChild(el);
    });
    wrapper.appendChild(grid); c.appendChild(wrapper);
  }
}

function renderAll() {
  $('#eggCount').textContent = f2(state.eggs);
  $('#eps').textContent = f2(state.eps);
  $('#epc').textContent = f2(state.epc);
  $('#chickCount').textContent = Object.values(state.ownedChickens).reduce((a,b)=>a+b,0);
  renderTab(getActiveTab());
  renderOwnedChickens();
}

function renderOwnedChickens() {
  const target = document.querySelector('.owned-chickens');
  if(!target) return;
  target.innerHTML = '';
  chickenPool.forEach(c=>{
    const count = state.ownedChickens[c.id]||0;
    if (count > 0) {
      const el = document.createElement('div'); el.className='owned-chick';
      el.innerHTML = `<div style="font-size:20px">${c.emoji}</div><div style="font-weight:700">${c.name} x${count}</div><div style="font-size:12px;color:var(--muted)">+${c.effect.epc||0} EPC, +${c.effect.eps||0} EPS</div>`;
      target.appendChild(el);
    }
  });
}

// --- events --- //
document.addEventListener('DOMContentLoaded', ()=> {
  // load + offline + recalc
  load();
  handleOffline();
  recalc();
  // starter eggs if new
  if (!localStorage.getItem(STATE_KEY)) {
    state.eggs = 20;
    save();
  }

  // attach tab click handlers
  $$('#tabs .tab').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#tabs .tab').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      renderTab(btn.dataset.tab);
    });
  });

  // delegated click handler for dynamic buttons
  document.body.addEventListener('click', (e) => {
    const buyBtn = e.target.closest('button.buy');
    if (buyBtn) {
      const type = buyBtn.dataset.type;
      const id = buyBtn.dataset.id;
      if (type === 'upgrade') buyUpgrade(id);
      else if (type === 'shop') buyShop(id);
      else if (type === 'chicken') buyChicken(id);
      return;
    }
    const equip = e.target.closest('[data-equip]');
    if (equip) {
      const idx = Number(equip.dataset.equip);
      if (state.inventoryThemes.includes(idx)) {
        applyTheme(idx);
        renderTab('inventory');
      }
      return;
    }
    // save/reset
    if (e.target && e.target.id === 'saveBtn') {
      save(); showToast('Saved'); playPurchase();
    }
    if (e.target && e.target.id === 'resetBtn') {
      reset();
    }
    // modal close
    if (e.target && e.target.id === 'closeModal') {
      $('#modalRoot').innerHTML = '';
    }
  });

  // egg click
  const eggEl = $('#egg');
  eggEl.addEventListener('click', (ev) => {
    clickEgg(ev.clientX, ev.clientY);
  });
  eggEl.addEventListener('keydown', (ev) => {
    if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault();
      clickEgg(window.innerWidth/2, window.innerHeight/2);
    }
  });

  // keyboard save
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault(); save(); showToast('Saved'); playPurchase();
    }
  });

  // start rendering
  renderAll();
  renderTab('upgrades');
  // start tick
  setInterval(tick, 1000);
  // autosave
  setInterval(save, 5000);
  // background canvas
  initBgCanvas();
});

// --- egg logic --- //
function clickEgg(cx, cy) {
  const amt = state.epc;
  state.eggs += amt;
  spawnParticles(cx, cy, Math.max(4, Math.round(amt/2)));
  showFloat(`+${f2(amt)}`);
  renderAll();
  save();
  playClick();
  checkAchievements();
}

// particles
function spawnParticles(cx, cy, count=6) {
  const farm = document.querySelector('.farm');
  for (let i=0;i<count;i++){
    const p = document.createElement('div');
    p.className = Math.random() > 0.6 ? 'particle' : 'spark';
    farm.appendChild(p);
    const rect = farm.getBoundingClientRect();
    const sx = rect.left + rect.width/2 + (Math.random()-0.5)*140;
    const sy = rect.top + rect.height/2 + (Math.random()-0.5)*80;
    p.style.left = (sx - rect.left) + 'px';
    p.style.top = (sy - rect.top) + 'px';
    const dur = 1200 + Math.random()*2200;
    const endX = Math.random() * rect.width;
    const endY = rect.height + 60 + Math.random()*180;
    p.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${endX-(sx-rect.left)}px,${endY}px) scale(.8)`,opacity:0}],{duration:dur,easing:'cubic-bezier(.2,.9,.2,1)'}).onfinish = ()=> p.remove();
  }
}
function spawnConfetti() {
  for (let i=0;i<24;i++){
    const p = document.createElement('div');
    p.style.position='absolute';
    p.style.left = (50 + (Math.random()-0.5)*40) + '%';
    p.style.top = '20%';
    p.style.width = '8px';
    p.style.height = '12px';
    p.style.background = ['#ffd54f','#ffb74d','#ff8a65','#81c784'][Math.floor(Math.random()*4)];
    p.style.transform = 'rotate(' + Math.random()*360 + 'deg)';
    p.style.zIndex = 9999;
    document.body.appendChild(p);
    p.animate([{transform:'translateY(0) rotate(0)',opacity:1},{transform:`translateY(${400+Math.random()*200}px) rotate(${Math.random()*720-360}deg)`,opacity:0}],{duration:1200+Math.random()*800}).onfinish = ()=> p.remove();
  }
}
function showFloat(txt) {
  const farm = document.querySelector('.farm');
  const d = document.createElement('div');
  d.textContent = txt;
  d.style.position = 'absolute';
  d.style.left = '50%';
  d.style.top = '35%';
  d.style.transform = 'translateX(-50%)';
  d.style.fontWeight = '800';
  d.style.color = 'var(--accent)';
  d.style.zIndex = 5;
  farm.appendChild(d);
  d.animate([{opacity:1,transform:'translateX(-50%) translateY(0)'},{opacity:0,transform:'translateX(-50%) translateY(-80px)'}],{duration:1100}).onfinish=()=>d.remove();
}

// --- achievements --- //
function checkAchievements() {
  if (state.eggs >= 100 && !state.achievements['a1']) unlock('a1');
  if (Object.values(state.ownedChickens).reduce((a,b)=>a+b,0) >= 1 && !state.achievements['a2']) unlock('a2');
  if (Object.values(state.ownedChickens).reduce((a,b)=>a+b,0) >= 5 && !state.achievements['a3']) unlock('a3');
  if (countOwnedUpgrades() >= 10 && !state.achievements['a4']) unlock('a4');
  if (state.eggs >= 1e6 && !state.achievements['a8']) unlock('a8');
}
function unlock(id) {
  state.achievements[id] = true;
  const a = achievements.find(x=>x.id===id);
  showToast('Achievement: ' + a.name);
  save();
  renderTab(getActiveTab());
}

// --- sounds --- //
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playClick() {
  try {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type='sine'; o.frequency.value = 500 + Math.random()*300;
    g.gain.value = 0.06;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.06);
  } catch(e){}
}
function playPurchase() {
  try {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type='triangle'; o.frequency.value=400; g.gain.value=0.04;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    o.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.12);
    o.stop(audioCtx.currentTime + 0.14);
  } catch(e){}
}

// --- background canvas --- //
let bgCanvas, bgCtx, orbs = [];
function initBgCanvas() {
  bgCanvas = $('#bgCanvas'); bgCtx = bgCanvas.getContext('2d');
  function resize() { bgCanvas.width = document.querySelector('.farm').clientWidth; bgCanvas.height = document.querySelector('.farm').clientHeight; }
  window.addEventListener('resize', resize); resize();
  orbs = [];
  for (let i=0;i<60;i++) orbs.push({x:Math.random()*bgCanvas.width,y:Math.random()*bgCanvas.height,rad:10+Math.random()*80,vy:0.02+Math.random()*0.6,ax:Math.random()*0.4-0.2,alpha:0.02+Math.random()*0.06});
  (function draw(){
    bgCtx.clearRect(0,0,bgCanvas.width,bgCanvas.height);
    const g = bgCtx.createLinearGradient(0,0,0,bgCanvas.height);
    g.addColorStop(0,'rgba(255,255,255,0.02)'); g.addColorStop(1,'rgba(0,0,0,0)');
    bgCtx.fillStyle = g; bgCtx.fillRect(0,0,bgCanvas.width,bgCanvas.height);
    orbs.forEach(o=>{
      o.y -= o.vy; o.x += o.ax;
      if (o.y < -o.rad) o.y = bgCanvas.height + o.rad;
      if (o.x < -o.rad) o.x = bgCanvas.width + o.rad;
      if (o.x > bgCanvas.width + o.rad) o.x = -o.rad;
      const rg = bgCtx.createRadialGradient(o.x,o.y,o.rad*0.2,o.x,o.y,o.rad);
      rg.addColorStop(0, `rgba(255,235,170,${o.alpha})`);
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      bgCtx.fillStyle = rg;
      bgCtx.beginPath(); bgCtx.arc(o.x,o.y,o.rad,0,Math.PI*2); bgCtx.fill();
    });
    requestAnimationFrame(draw);
  })();
}

// --- utilities --- //
function getActiveTab() {
  const active = $$('.tab').find(t => t.classList.contains('active'));
  return active ? active.dataset.tab : 'upgrades';
}

function showToast(msg, ms=1400) {
  const t = document.createElement('div'); t.className='toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(()=>{ t.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(24px)'}],{duration:600}).onfinish=()=>t.remove(); }, ms);
}
function showModal(html) {
  const root = $('#modalRoot'); root.innerHTML = `<div class="modal">${html}</div>`;
}

// --- tick (passive) --- //
function tick() {
  const now = Date.now();
  const dt = (now - (state.lastTick || now)) / 1000;
  state.lastTick = now;
  state.eggs += state.eps * dt;
  renderAll();
}

// --- achievement & misc helpers --- //
function countOwnedUpgrades(){ return Object.values(state.upgrades).reduce((a,b)=>a+b,0); }
function checkAchievements(){ /* already called periodically */ }

// --- initial boot --- //
load(); handleOffline(); recalc(); renderAll();

// --- expose some helpers for console debugging if needed --- //
window._eggGame = { state, save, load, reset };

// End of app.js
