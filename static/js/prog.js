// ============================================================
// skalor.js
// Centrale JavaScript voor het volledige Skalor platform.
//
// Gebruik op elke SKILTREE pagina:
//   <script>const VAK_NAAM = 'Biologie';</script>
//   <script src="../static/js/skalor.js"></script>
//
// Gebruik op de PROGRESSIEBORD pagina:
//   <script src="../static/js/skalor.js"></script>
// ============================================================


// ============================================================
// DEEL 1 — LOCALSTORAGE
// ============================================================

// Haalt alle vakken op uit localStorage.
// Geeft lege array terug als er nog niets opgeslagen is.
function getVakken() {
    return JSON.parse(localStorage.getItem('skalor_vakken') || '[]');
}

// Slaat de volledige vakken-array op in localStorage.
function saveVakken(vakken) {
    localStorage.setItem('skalor_vakken', JSON.stringify(vakken));
}


// ============================================================
// DEEL 2 — SKILL TRACKER (skiltree pagina's)
// ============================================================

// ─── VAK INITIALISEREN ───────────────────────────────────────
// Wordt aangeroepen bij het laden van een skiltree pagina.
//
// Drie scenario's:
//
//   1. VAK BESTAAT NIET → nieuw vak aanmaken, alles op 0
//      (leerling bezoekt dit vak voor de eerste keer)
//
//   2. VAK BESTAAT, ZELFDE SKILLS → voortgang bewaren
//      (leerling opent dezelfde tree opnieuw)
//
//   3. VAK BESTAAT, ANDERE SKILLS → reset naar 0 met nieuwe skills
//      (leerkracht heeft de tree aangepast)
//      Dit is het geval dat de leerkracht nieuwe leerstof inlaadt.
//
// Zo kan de leerkracht de TREE aanpassen en worden de skills
// automatisch bijgewerkt zonder dat de leerling iets merkt.
function initVak() {
    if (typeof TREE === 'undefined') {
        console.error('[skalor] TREE is niet beschikbaar.');
        return;
    }

    // Lees de branch labels uit de TREE als skill namen
    // Alleen branches tellen als skills, geen leaf of quiz nodes
    const skillsUitTree = TREE.children
        .filter(child => child.type === 'branch')
        .map(child => child.label);

    if (skillsUitTree.length === 0) {
        console.warn('[skalor] Geen branches gevonden in TREE voor:', VAK_NAAM);
        return;
    }

    const vakken        = getVakken();
    const bestaandIndex = vakken.findIndex(v => v.naam === VAK_NAAM);

    if (bestaandIndex === -1) {
        // ── SCENARIO 1: Nieuw vak ──────────────────────────
        // Vak bestaat nog niet → aanmaken met alles op 0
        vakken.push({
            naam:     VAK_NAAM,
            skills:   skillsUitTree,
            gedaan:   0,
            progress: 0,
        });
        console.log('[skalor] Nieuw vak aangemaakt:', VAK_NAAM, '| Skills:', skillsUitTree);

    } else {
        const bestaandVak    = vakken[bestaandIndex];
        const skillsOpgeslagen = JSON.stringify(bestaandVak.skills);
        const skillsNieuw      = JSON.stringify(skillsUitTree);

        if (skillsOpgeslagen === skillsNieuw) {
            // ── SCENARIO 2: Zelfde tree ────────────────────
            // Skills zijn niet veranderd → voortgang bewaren
            console.log('[skalor] Vak ongewijzigd, voortgang bewaard:', VAK_NAAM);
            return; // Niets opslaan, leerling behoudt voortgang

        } else {
            // ── SCENARIO 3: Tree gewijzigd door leerkracht ─
            // Skills zijn veranderd → reset naar 0 met nieuwe skills
            vakken[bestaandIndex] = {
                naam:     VAK_NAAM,
                skills:   skillsUitTree,
                gedaan:   0,
                progress: 0,
            };
            console.log('[skalor] Tree gewijzigd door leerkracht, vak gereset naar 0:', VAK_NAAM, '| Nieuwe skills:', skillsUitTree);
        }
    }

    saveVakken(vakken);
}

// ─── SKILL AFRONDEN ──────────────────────────────────────────
// Markeert een branch als afgerond voor het huidige vak.
// Geeft TRUE terug als succesvol, anders FALSE.
//
// Gebruik: skillAfronden('Fotosynthese');
function skillAfronden(skillNaam) {
    const vakken = getVakken();
    const vak    = vakken.find(v => v.naam === VAK_NAAM);

    if (!vak) {
        console.warn('[skalor] Vak niet gevonden:', VAK_NAAM);
        return false;
    }

    const index = vak.skills.indexOf(skillNaam);

    // Skill bestaat én is nog niet afgerond
    if (index !== -1 && index >= vak.gedaan) {
        vak.gedaan++;
        // Herbereken voortgang: bv. 2 van 5 = 40%
        vak.progress = Math.round((vak.gedaan / vak.skills.length) * 100);
        saveVakken(vakken);
        console.log('[skalor] Skill afgerond:', skillNaam, '| Progress:', vak.progress + '%');
        return true;
    }

    console.log('[skalor] Skill al afgerond of niet gevonden:', skillNaam);
    return false;
}

// ─── SKILL STATUS CONTROLEREN ────────────────────────────────
// Controleert of een skill al afgerond is voor het huidige vak.
// Geeft TRUE terug als afgerond, anders FALSE.
//
// Gebruik: if (isSkillAfgerond('Fotosynthese')) { ... }
function isSkillAfgerond(skillNaam) {
    const vakken = getVakken();
    const vak    = vakken.find(v => v.naam === VAK_NAAM);
    if (!vak) return false;
    // Index kleiner dan gedaan = afgerond
    // Voorbeeld: gedaan=2 → index 0 en 1 zijn afgerond
    return vak.skills.indexOf(skillNaam) < vak.gedaan;
}

// ─── QUIZ KNOP HANDLER ───────────────────────────────────────
// Wordt aangeroepen via onclick="quizAfronden()" op de quiz knop.
// Rondt de actieve branch af en past de knop en node visueel aan.
function quizAfronden() {
    const panel    = document.getElementById('info-panel');
    const label    = panel.dataset.nodeLabel;
    const nodeType = panel.dataset.nodeType;

    // Alleen branches tellen als een volwaardige skill
    if (nodeType !== 'branch') return;

    const afgerond = skillAfronden(label);

    if (afgerond) {
        // Knop aanpassen naar "Afgerond"
        const btn            = document.querySelector('.btn-pp');
        btn.innerHTML        = '<i class="fa-solid fa-check"></i> Afgerond!';
        btn.style.background = 'rgba(0,200,100,0.25)';
        btn.style.boxShadow  = 'none';
        btn.style.border     = '1px solid rgba(0,200,100,0.4)';
        btn.disabled         = true;

        // Node groen maken in de SVG zonder volledige herrender
        if (typeof layout !== 'undefined') {
            const NS        = 'http://www.w3.org/2000/svg';
            const svg       = document.getElementById('tree-svg');
            const node      = layout.nodes.find(n => n.label === label);
            const nodeGroup = node ? svg.querySelector(`[data-id="${node.id}"]`) : null;

            if (nodeGroup) {
                // Cirkel groen kleuren
                const circle = nodeGroup.querySelector('circle:not(.glow-ring)');
                if (circle) {
                    circle.setAttribute('fill',   'rgba(0,200,100,0.25)');
                    circle.setAttribute('stroke', '#00c864');
                }
                // Vinkje toevoegen in het midden
                const NS2  = 'http://www.w3.org/2000/svg';
                const check = document.createElementNS(NS2, 'text');
                check.setAttribute('x',                 node.x);
                check.setAttribute('y',                 node.y);
                check.setAttribute('text-anchor',       'middle');
                check.setAttribute('dominant-baseline', 'middle');
                check.setAttribute('font-size',         18);
                check.setAttribute('fill',              '#00c864');
                check.setAttribute('pointer-events',    'none');
                check.textContent = '✓';
                nodeGroup.appendChild(check);

                // Label ook groen maken
                const labelEl = nodeGroup.querySelector('text:last-of-type');
                if (labelEl) labelEl.setAttribute('fill', '#00c864');
            }
        }
    }
}

// ─── PANEL TRACKER ───────────────────────────────────────────
// Roep aan vanuit showPanel() in de skiltree pagina.
// Slaat node data op en past de quiz knop aan op basis
// van of de skill al afgerond is of niet.
//
// Voeg toe in showPanel():
//   showPanelTracker(node);
function showPanelTracker(node) {
    const panel = document.getElementById('info-panel');
    panel.dataset.nodeLabel = node.label;
    panel.dataset.nodeType  = node.type;

    const btn = document.querySelector('.btn-pp');

    if (node.type === 'branch' && isSkillAfgerond(node.label)) {
        // Al afgerond → groene knop
        btn.innerHTML        = '<i class="fa-solid fa-check"></i> Afgerond';
        btn.style.background = 'rgba(0,200,100,0.25)';
        btn.style.boxShadow  = 'none';
        btn.style.border     = '1px solid rgba(0,200,100,0.4)';
        btn.disabled         = true;
    } else {
        // Nog open → normale knop
        btn.innerHTML        = '<i class="fa-solid fa-play"></i> Start quiz';
        btn.style.background = '';
        btn.style.boxShadow  = '';
        btn.style.border     = '';
        btn.disabled         = false;
    }
}


// ============================================================
// DEEL 3 — PROGRESSIEBORD
// Alleen actief als 'vakken-grid' op de pagina staat.
// ============================================================

// ─── KLEUR EN ICON MAP ───────────────────────────────────────
// Vaste kleuren en iconen per vaknaam.
// Voeg hier rijen toe voor nieuwe vakken die de leerkracht aanmaakt.
// Als een vak niet in de lijst staat krijgt het de 'default' kleur.
const kleurMap = {
    'Wiskunde':     { bg: 'rgba(0,200,255,0.1)',   text: '#00c8ff' },
    'Nederlands':   { bg: 'rgba(26,143,255,0.1)',  text: '#5aaeff' },
    'Geschiedenis': { bg: 'rgba(245,166,35,0.1)',  text: '#f5a623' },
    'Biologie':     { bg: 'rgba(0,220,120,0.1)',   text: '#00dc78' },
    'Informatica':  { bg: 'rgba(160,100,255,0.1)', text: '#a064ff' },
    'Fysica':       { bg: 'rgba(255,100,80,0.1)',  text: '#ff6050' },
    'Chemie':       { bg: 'rgba(255,180,0,0.1)',   text: '#ffb400' },
    'default':      { bg: 'rgba(150,150,150,0.1)', text: '#aaaaaa' },
};

const iconMap = {
    'Wiskunde':     '∑',
    'Nederlands':   'A',
    'Geschiedenis': '⌛',
    'Biologie':     '🌿',
    'Informatica':  '</>',
    'Fysica':       '⚡',
    'Chemie':       '⚗️',
    'default':      '📚',
};

// ─── COINS BEREKENEN ─────────────────────────────────────────
// Leest de coins uit de centrale skalor_user_stats store.
// Zo start elke nieuwe gebruiker altijd op 0.
function calcCoins() {
    try {
        const raw = localStorage.getItem('skalor_user_stats');
        if (!raw) return 0;
        return JSON.parse(raw).coins || 0;
    } catch (_) { return 0; }
}

// ─── COINS ANIMATIE ──────────────────────────────────────────
// Laat het coin getal vloeiend oplopen naar de doelwaarde.
let animatedCoins = 0;
let animFrame     = null;

function animateCoins(target) {
    if (animFrame) cancelAnimationFrame(animFrame);
    const start = animatedCoins;
    const diff  = target - start;
    if (!diff) return;
    const t0 = performance.now();
    (function step(now) {
        const t = Math.min((now - t0) / 700, 1);
        const e = 1 - Math.pow(1 - t, 3);
        animatedCoins = Math.round(start + diff * e);
        document.getElementById('stat-coins').textContent = '🪙 ' + animatedCoins;
        if (t < 1) animFrame = requestAnimationFrame(step);
        else animatedCoins = target;
    })(t0);
}

// ─── STATISTIEKEN BIJWERKEN ──────────────────────────────────
// Toont totale stats bovenaan het progressiebord.
function updateStats(vakken) {
    const total = vakken.reduce((s, v) => s + v.gedaan, 0);
    const avg   = vakken.length
        ? Math.round(vakken.reduce((s, v) => s + v.progress, 0) / vakken.length)
        : 0;
    const coins = calcCoins();
    const level = Math.max(1, Math.floor(coins / 100) + 1);

    document.getElementById('stat-done').textContent    = total;
    document.getElementById('stat-avg').textContent     = avg + '%';
    document.getElementById('player-level').textContent = level;
    animateCoins(coins);

    const msgs = [
        'Welkom terug. Rond een skill af om progressie te maken.',
        'Goed bezig! Blijf zo doorgaan.',
        'Je bent op dreef! Probeer een nieuw vak te starten.',
        'Indrukwekkend! Jij bent een echte leerling.',
        'Waanzinnig! Je coins groeien razendsnel.'
    ];
    document.getElementById('coach-text').textContent = msgs[Math.min(Math.floor(coins / 150), msgs.length - 1)];
}

// ─── VAKKEN RENDEREN ─────────────────────────────────────────
// Maakt voor elk vak een kaart aan op het progressiebord.
// Laadt data dynamisch uit localStorage.
function render() {
    const grid = document.getElementById('vakken-grid');
    if (!grid) return; // Niet op de progressiebord pagina

    const vakken = getVakken();
    grid.innerHTML = '';

    // Geen vakken → toon melding
    if (vakken.length === 0) {
        grid.innerHTML = `
            <p style="color:var(--muted);font-size:13px;grid-column:1/-1;text-align:center;padding:2rem 0;">
                Nog geen vakken geladen. Bezoek een skill tree pagina om te starten.
            </p>
        `;
        updateStats([]);
        return;
    }

    vakken.forEach((vak, i) => {
        const kleur = kleurMap[vak.naam] || kleurMap['default'];
        const icon  = iconMap[vak.naam]  || iconMap['default'];
        const coins = calcCoins();

        const card = document.createElement('div');
        card.className = 'vak-card';
        card.style.animationDelay = (i * 0.07) + 's';

        card.innerHTML = `
            <div class="vak-header">
                <div class="vak-title">
                    <span class="vak-icon" style="background:${kleur.bg};color:${kleur.text};">${icon}</span>
                    <span class="vak-naam">${vak.naam}</span>
                </div>
                <span class="vak-coins">🪙 ${coins}</span>
            </div>
            <div class="progress-header">
                <span class="progress-label">Voortgang</span>
                <span class="progress-pct">${vak.progress}%</span>
            </div>
            <div class="progress-track">
                <div class="progress-bar" style="width:${vak.progress}%;"></div>
            </div>
            <div class="skills">
                ${vak.skills.map((s, j) => `
                    <span class="skill-badge${j < vak.gedaan ? ' done' : ''}">${s}</span>
                `).join('')}
            </div>
        `;

        grid.appendChild(card);
    });

    updateStats(vakken);
}

// ─── AUTOMATISCH HERLADEN ────────────────────────────────────
// Herlaadt het bord als localStorage gewijzigd wordt vanuit
// een ander tabblad (bv. leerling rondt skill af in skiltree).
window.addEventListener('storage', (event) => {
    if (event.key === 'skalor_vakken') {
        render();
    }
});


// ============================================================
// OPSTARTEN
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
    // Op skiltree pagina's: VAK_NAAM is ingesteld
    if (typeof VAK_NAAM !== 'undefined') {
        setTimeout(() => {
            initVak(); // Vak initialiseren of bijwerken
        }, 0);
    }

    // Op progressiebord pagina: vakken-grid bestaat
    if (document.getElementById('vakken-grid')) {
        render();
    }
});
    render();

    
  const _btn  = document.getElementById('hamburger-btn');
  const _menu = document.getElementById('mobile-menu');
  _btn.addEventListener('click', () => {
    const open = _menu.classList.toggle('open');
    _btn.classList.toggle('open', open);
    _btn.setAttribute('aria-expanded', open);
  });

  // Markeer actieve pagina automatisch
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
    const href = link.getAttribute('href');
    const active = href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);
    if (active) link.classList.add('active');
  });
