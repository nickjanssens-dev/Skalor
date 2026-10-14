// ─── HELPERS ──────────────────────────────────────────────────
function getOwned() {
    try { return JSON.parse(localStorage.getItem('skalor_owned') || '[]'); }
    catch(_) { return []; }
}

function setOwned(arr) {
    localStorage.setItem('skalor_owned', JSON.stringify(arr));
}

function getEquipped() {
    try { return JSON.parse(localStorage.getItem('skalor_equipped') || '{}'); }
    catch(_) { return {}; }
}

function setEquipped(obj) {
    localStorage.setItem('skalor_equipped', JSON.stringify(obj));
}

// ─── SHOP ITEMS ────────────────────────────────────────────────
const ITEMS = [
    // AVATARS
    { id:'av1', category:'avatar', name:'Robot Explorer',    desc:'Een futuristische robot-avatar voor echte tech-liefhebbers.', icon:'🤖', price:150,  rarity:'common'    },
    { id:'av2', category:'avatar', name:'Neon Vos',          desc:'Een mysterieuze vos omgeven door neon licht.', icon:'🦊', price:300,  rarity:'rare'      },
    { id:'av3', category:'avatar', name:'Ruimte Astronaut',  desc:'Verken het universum met deze exclusieve ruimte-avatar.', icon:'👨‍🚀', price:500,  rarity:'epic'      },
    { id:'av4', category:'avatar', name:'Draken Lord',       desc:'Enige en onherhaalbare drakenridder avatar.', icon:'🐉', price:1000, rarity:'legendary' },

    // BADGES
    { id:'ba1', category:'badge',  name:'Ster Leerling',     desc:'Toon de wereld dat jij een gemotiveerde leerling bent.', icon:'⭐', price:100,  rarity:'common'    },
    { id:'ba2', category:'badge',  name:'Briljant',          desc:'Voor degenen die consistent uitblinken.', icon:'💎', price:250,  rarity:'rare'      },
    { id:'ba3', category:'badge',  name:'Meester Codeur',    desc:'Badge voor echte informatica-meesters.', icon:'💻', price:400,  rarity:'epic'      },
    { id:'ba4', category:'badge',  name:'Gouden Pen',        desc:'Uiterst zeldzame badge voor de allerbeste leerlingen.', icon:'🖊️', price:800,  rarity:'legendary' },

    // THEMA'S
    { id:'th1', category:'theme',  name:'Nacht Modus',       desc:'Paarse accenten door de hele interface.', icon:'🌙', price:200,  rarity:'common'    },
    { id:'th2', category:'theme',  name:'Oceaan Blauw',      desc:'Fris oceaan-geïnspireerd thema met blauwe gloed.', icon:'🌊', price:350,  rarity:'rare'      },
    { id:'th3', category:'theme',  name:'Vulkaan Rood',      desc:'Intens rood thema voor echte doorzetter.', icon:'🌋', price:600,  rarity:'epic'      },
    { id:'th4', category:'theme',  name:'Aurora',            desc:'Legendarisch thema met cyclerende noorderlicht-kleuren.', icon:'🌌', price:1200, rarity:'legendary' },

    // EFFECTEN
    { id:'ef1', category:'effect', name:'Confetti Regen',    desc:'Confetti-animatie bij het afronden van een skill.', icon:'🎊', price:150,  rarity:'common'    },
    { id:'ef2', category:'effect', name:'Bliksem Flits',     desc:'Spectaculaire bliksemanimatie bij skill-beloning.', icon:'⚡', price:280,  rarity:'rare'      },
    { id:'ef3', category:'effect', name:'Vuur Explosie',     desc:'Vuurdeeltjes schieten omhoog bij elke skill.', icon:'🔥', price:450,  rarity:'epic'      },
    { id:'ef4', category:'effect', name:'Galactisch Portaal',desc:'Open een galactisch portaal bij elk achievement.', icon:'🌀', price:900,  rarity:'legendary' },

    // FRAMES
    { id:'fr1', category:'frame',  name:'Simpel Zilver',     desc:'Strak zilveren frame rondom je avatar.', icon:'🔲', price:120,  rarity:'common'    },
    { id:'fr2', category:'frame',  name:'Neon Outline',      desc:'Knipperende neon rand met cyaan gloed.', icon:'📺', price:270,  rarity:'rare'      },
    { id:'fr3', category:'frame',  name:'Kristal Frame',     desc:'Doorzichtig kristallen frame met prisma-effect.', icon:'💠', price:550,  rarity:'epic'      },
    { id:'fr4', category:'frame',  name:'Drakenschub',       desc:'Legendarisch frame bekleed met drakenscubben.', icon:'🛡️', price:1100, rarity:'legendary' },
];

// ─── STATE ────────────────────────────────────────────────────
let currentCategory = 'all';

// ─── RENDER SHOP ──────────────────────────────────────────────
function renderShop() {
    const grid  = document.getElementById('shop-grid');
    const empty = document.getElementById('empty-state');
    if (!grid) return;

    const owned    = getOwned();
    const equipped = getEquipped();
    const coins    = window.SkalorStats ? window.SkalorStats.get().coins : 0;

    const filtered = currentCategory === 'all'
        ? ITEMS
        : ITEMS.filter(i => i.category === currentCategory);

    grid.innerHTML = '';

    if (filtered.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    filtered.forEach((item, idx) => {
        const isOwned    = owned.includes(item.id);
        const isEquipped = equipped[item.category] === item.id;
        const canAfford  = coins >= item.price;

        let actionBtn;
        if (isOwned) {
            if (isEquipped) {
                actionBtn = `<button class="buy-btn equipped-btn" onclick="unequipItem('${item.category}')">
                    <i class="fa-solid fa-toggle-on"></i> Uitgerust
                </button>`;
            } else {
                actionBtn = `<button class="buy-btn equip-btn" onclick="equipItem('${item.id}')">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Uitrusten
                </button>`;
            }
        } else {
            actionBtn = `<button class="buy-btn ${canAfford ? '' : 'unaffordable'}" ${canAfford ? '' : 'disabled'} onclick="buyItem('${item.id}')">
                ${canAfford ? '<i class="fa-solid fa-coins"></i> Kopen' : 'Te duur'}
            </button>`;
        }

        const card = document.createElement('div');
        card.className = `item-card ${item.rarity} ${isOwned ? 'owned' : ''} ${isEquipped ? 'is-equipped' : ''}`;
        card.style.animationDelay = (idx * 0.05) + 's';

        card.innerHTML = `
            <div class="item-preview">
                <div class="preview-bg ${item.category}"></div>
                <span class="preview-icon">${item.icon}</span>
                <span class="rarity-badge ${item.rarity}">${item.rarity}</span>
                ${isOwned ? '<span class="owned-badge"><i class="fa-solid fa-check"></i> In bezit</span>' : ''}
                ${isEquipped ? '<span class="equipped-indicator"><i class="fa-solid fa-star"></i> Actief</span>' : ''}
            </div>
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-desc">${item.desc}</div>
                <div class="item-footer">
                    <span class="item-price">
                        <i class="fa-solid fa-coins" style="font-size:11px;"></i>
                        ${item.price.toLocaleString()}
                    </span>
                    ${actionBtn}
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

// ─── BUY ITEM ─────────────────────────────────────────────────
function buyItem(itemId) {
    const item  = ITEMS.find(i => i.id === itemId);
    const owned = getOwned();

    if (!item || owned.includes(itemId)) return;

    const coins = window.SkalorStats ? window.SkalorStats.get().coins : 0;

    if (coins < item.price) {
        showToast('error', `❌ Niet genoeg coins! Je hebt ${coins} coins.`);
        return;
    }

    // Deduct coins via SkalorStats (triggers updateUI + ProgressSync.save internally)
    if (window.SkalorStats) window.SkalorStats.addCoins(-item.price);

    // Mark item as owned and sync to server
    owned.push(itemId);
    setOwned(owned);
    if (window.ProgressSync) window.ProgressSync.save();

    // Bump animation on coin badge
    const badge = document.querySelector('.coin-badge');
    if (badge) {
        badge.classList.remove('bump');
        void badge.offsetWidth;
        badge.classList.add('bump');
        setTimeout(() => badge.classList.remove('bump'), 300);
    }

    renderShop();
    showToast('success', `✅ ${item.icon} ${item.name} gekocht!`);
}

// ─── EQUIP / UNEQUIP ──────────────────────────────────────────
function equipItem(itemId) {
    const item = ITEMS.find(i => i.id === itemId);
    if (!item) return;

    const equipped = getEquipped();
    equipped[item.category] = itemId;
    setEquipped(equipped);

    if (window.ProgressSync) window.ProgressSync.save();
    if (window.SkalorCosmetics) window.SkalorCosmetics.apply();

    renderShop();
    showToast('success', `✨ ${item.icon} ${item.name} uitgerust!`);
}

function unequipItem(category) {
    const equipped = getEquipped();
    const prevId   = equipped[category];
    delete equipped[category];
    setEquipped(equipped);

    if (window.ProgressSync) window.ProgressSync.save();
    if (window.SkalorCosmetics) window.SkalorCosmetics.apply();

    renderShop();
    showToast('success', `🔄 Cosmetica verwijderd.`);
}

// ─── FILTER CATEGORY ──────────────────────────────────────────
function filterCategory(cat, btn) {
    currentCategory = cat;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderShop();
}

// ─── TOAST ────────────────────────────────────────────────────
let toastTimer = null;
function showToast(type, message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className   = 'show ' + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.className = ''; }, 2800);
}

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // ProgressSync.init() is called automatically by stats.js on every page.
    // Give it a moment to load server data, then render so coin count is fresh.
    setTimeout(renderShop, 300);
});

// Reload when another tab updates coins or owned items
window.addEventListener('storage', (e) => {
    if (e.key === 'skalor_user_stats' || e.key === 'skalor_owned' || e.key === 'skalor_equipped') {
        renderShop();
    }
});
