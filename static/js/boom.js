// ─── SUBJECTS ────────────────────────────────────────────────────────────────
const SUBJECTS = [
  { id:'biologie',    label:'Biologie',    icon:'\u{1F9EC}', route:'./biologie.html',    color:'#4ade80', json:'biology.json'      },
  { id:'chemie',      label:'Chemie',      icon:'⚗️',  route:'./chemie.html',      color:'#facc15', json:'chemie.json'       },
  { id:'fysica',      label:'Fysica',      icon:'⚡',   route:'./fysica.html',      color:'#fb923c', json:'fysica.json'       },
  { id:'nederlands',  label:'Nederlands',  icon:'✍️',  route:'./nederlands.html',  color:'#f472b6', json:'nederlands.json'   },
  { id:'informatica', label:'Informatica', icon:'\u{1F4BB}',  route:'./informatica.html', color:'#22d3ee', json:'informatica.json'  },
  { id:'wiskunde',    label:'Wiskunde',    icon:'\u{1F4D0}',  route:'./wiskunde.html',    color:'#60a5fa', json:'wiskunde.json'     },
];

// ─── CANVAS CONSTANTS ────────────────────────────────────────────────────────
const VW = 1400, VH = 1000;
const CX = VW / 2, CY = VH / 2;
const ROOT_R   = 58;
const BRANCH_R = 46;
const ORBIT    = 300;

// Expansion constants
const EXP_BRANCHES    = 3;
const EXP_BRANCH_LEN  = 175;
const EXP_BRANCH_SPR  = 1.05;
const EXP_LEAF_COUNT  = 4;
const EXP_LEAF_LEN    = 88;
const EXP_LEAF_SPR    = 0.72;

// ─── STATE ────────────────────────────────────────────────────────────────────
const NS   = 'http://www.w3.org/2000/svg';
const svg  = document.getElementById('tree-svg');
const wrap = document.getElementById('canvas-wrap');
const hint = document.getElementById('hint');

let scale = 1, tx = 0, ty = 0;
let previewLayer  = null;
let expansionGrp  = null;
let clearTimer    = null;
let edgeEls       = {};
const jsonCache   = {};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function hexToRgb(hex) {
  const c = hex.replace('#', '');
  return { r: parseInt(c.slice(0,2),16), g: parseInt(c.slice(2,4),16), b: parseInt(c.slice(4,6),16) };
}

// ─── TRANSFORM ───────────────────────────────────────────────────────────────
function applyTransform(anim) {
  wrap.style.transition = anim ? 'transform 0.55s cubic-bezier(0.4,0,0.2,1)' : 'none';
  wrap.style.transform  = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
}

function getSize() {
  const c = document.getElementById('tree-container');
  return { w: c ? c.clientWidth : window.innerWidth,
           h: c ? c.clientHeight : window.innerHeight - 72 };
}

function fitToScreen() {
  const { w, h } = getSize();
  scale = Math.min((w * 0.88) / VW, (h * 0.88) / VH);
  tx = 0; ty = 0;
  applyTransform(false);
}

function zoomToPoint(x, y, s) {
  tx = s * (VW / 2 - x);
  ty = s * (VH / 2 - y);
  scale = s;
  applyTransform(true);
}

// ─── JSON LOADER ─────────────────────────────────────────────────────────────
async function loadSubjectJSON(subject) {
  if (jsonCache[subject.id]) return jsonCache[subject.id];
  const paths = [
    '../static/data/' + subject.json,
    '/static/data/'   + subject.json,
    'static/data/'    + subject.json,
  ];
  for (const path of paths) {
    try {
      const r = await fetch(path);
      if (r.ok) { const d = await r.json(); jsonCache[subject.id] = d; return d; }
    } catch (_) {}
  }
  return null;
}

// ─── EXPANSION HOVER ─────────────────────────────────────────────────────────
function clearExpansion() {
  if (!expansionGrp) return;
  const grp = expansionGrp;
  expansionGrp = null;
  grp.style.transition = 'transform 0.20s ease, opacity 0.20s ease';
  grp.style.opacity    = '0';
  setTimeout(function() { grp.style.transform = 'scale(0.08)'; }, 10);
  clearTimeout(clearTimer);
  clearTimer = setTimeout(function() {
    // Only wipe if no new expansion has been started since
    if (!expansionGrp && previewLayer) previewLayer.innerHTML = '';
  }, 230);
}

function drawExpansion(subject, nodeX, nodeY, nodeAngle) {
  clearTimeout(clearTimer);  // cancel any in-flight wipe
  if (!previewLayer) return;
  previewLayer.innerHTML = '';
  expansionGrp = null;

  const { r, g, b } = hexToRgb(subject.color);
  const rgba = function(a) { return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; };

  const grp = el('g');
  previewLayer.appendChild(grp);
  expansionGrp = grp;

  for (let i = 0; i < EXP_BRANCHES; i++) {
    const t = i / (EXP_BRANCHES - 1);
    const branchAngle = nodeAngle + (t - 0.5) * EXP_BRANCH_SPR;
    const bx = nodeX + Math.cos(branchAngle) * EXP_BRANCH_LEN;
    const by = nodeY + Math.sin(branchAngle) * EXP_BRANCH_LEN;

    grp.appendChild(el('line', {
      x1: nodeX, y1: nodeY, x2: bx, y2: by,
      stroke: rgba(0.52), 'stroke-width': 2.2, 'stroke-linecap': 'round'
    }));
    grp.appendChild(el('circle', {
      cx: bx, cy: by, r: 17,
      fill: rgba(0.16), stroke: rgba(0.55), 'stroke-width': 1.8
    }));

    for (let j = 0; j < EXP_LEAF_COUNT; j++) {
      const lt = j / (EXP_LEAF_COUNT - 1);
      const leafAngle = branchAngle + (lt - 0.5) * EXP_LEAF_SPR;
      const lx = bx + Math.cos(leafAngle) * EXP_LEAF_LEN;
      const ly = by + Math.sin(leafAngle) * EXP_LEAF_LEN;

      grp.appendChild(el('line', {
        x1: bx, y1: by, x2: lx, y2: ly,
        stroke: rgba(0.28), 'stroke-width': 1.3, 'stroke-linecap': 'round'
      }));
      grp.appendChild(el('circle', {
        cx: lx, cy: ly, r: 10,
        fill: rgba(0.10), stroke: rgba(0.38), 'stroke-width': 1.2
      }));
    }
  }

  grp.style.transformOrigin = nodeX + 'px ' + nodeY + 'px';
  grp.style.transform = 'scale(0.05)';
  grp.style.opacity   = '0';

  requestAnimationFrame(function() { requestAnimationFrame(function() {
    grp.style.transition = 'transform 0.42s cubic-bezier(0.34,1.56,0.64,1), opacity 0.16s ease';
    grp.style.transform  = 'scale(1)';
    grp.style.opacity    = '1';
  }); });
}

// ─── EDGE HIGHLIGHT ───────────────────────────────────────────────────────────
function highlightEdge(id) {
  const e = edgeEls[id];
  if (!e) return;
  e.style.transition = 'stroke-width 0.22s ease, opacity 0.22s ease';
  e.setAttribute('stroke-width', '3.8');
  e.setAttribute('opacity', '0.9');
}
function unhighlightEdge(id) {
  const e = edgeEls[id];
  if (!e) return;
  e.setAttribute('stroke-width', '2.2');
  e.setAttribute('opacity', '0.35');
}

// ─── DIM / UNDIM ─────────────────────────────────────────────────────────────
function dimOthers(activeId) {
  svg.querySelectorAll('g[data-id]').forEach(function(g) {
    g.style.transition = 'opacity 0.28s ease';
    g.style.opacity    = g.getAttribute('data-id') === activeId ? '1' : '0.12';
  });
}

function undimAll() {
  svg.querySelectorAll('g[data-id]').forEach(function(g) {
    g.style.transition = 'opacity 0.28s ease';
    g.style.opacity    = '1';
  });
}

// ─── DEFS ─────────────────────────────────────────────────────────────────────
function buildDefs() {
  const defs = el('defs');
  let m =
    '<filter id="gf-root"><feGaussianBlur stdDeviation="10" result="b"/>' +
    '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
    '<radialGradient id="rg-root" cx="50%" cy="50%" r="50%">' +
    '<stop offset="0%" stop-color="rgba(111,231,247,0.45)"/>' +
    '<stop offset="100%" stop-color="rgba(10,132,255,0.12)"/></radialGradient>';
  SUBJECTS.forEach(function(s) {
    const { r, g, b } = hexToRgb(s.color);
    m +=
      '<filter id="gf-' + s.id + '"><feGaussianBlur stdDeviation="8" result="b"/>' +
      '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<radialGradient id="rg-' + s.id + '" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="rgba(' + r + ',' + g + ',' + b + ',0.45)"/>' +
      '<stop offset="100%" stop-color="rgba(' + r + ',' + g + ',' + b + ',0.10)"/>' +
      '</radialGradient>';
  });
  defs.innerHTML = m;
  return defs;
}

// ─── RENDER ───────────────────────────────────────────────────────────────────
function render() {
  if (!svg || !wrap) return;
  svg.innerHTML = '';
  edgeEls = {};

  const { w, h } = getSize();
  svg.setAttribute('viewBox', '0 0 ' + VW + ' ' + VH);
  svg.style.width  = VW + 'px';
  svg.style.height = VH + 'px';
  svg.style.left   = ((w - VW) / 2) + 'px';
  svg.style.top    = ((h - VH) / 2) + 'px';

  svg.appendChild(buildDefs());

  // Expansion layer
  previewLayer = el('g');
  svg.appendChild(previewLayer);

  // Edges
  const edgeG = el('g');
  SUBJECTS.forEach(function(s, i) {
    const angle = -Math.PI / 2 + (i / SUBJECTS.length) * Math.PI * 2;
    const x = CX + Math.cos(angle) * ORBIT;
    const y = CY + Math.sin(angle) * ORBIT;
    const { r, g, b } = hexToRgb(s.color);
    const line = el('line', { x1:CX, y1:CY, x2:x, y2:y,
      stroke:'rgba(' + r + ',' + g + ',' + b + ',0.35)',
      'stroke-width':2.2, 'stroke-linecap':'round', opacity:0.35 });
    edgeEls[s.id] = line;
    edgeG.appendChild(line);
  });
  svg.appendChild(edgeG);

  // Center pulse ring
  const pulseRing = el('circle', { cx:CX, cy:CY, r:ROOT_R + 22,
    fill:'none', stroke:'rgba(111,231,247,0.22)', 'stroke-width':2 });
  pulseRing.style.animation = 'rootPulse 3s ease-in-out infinite';
  svg.appendChild(pulseRing);

  // Root node
  const rootG = el('g');
  rootG.appendChild(el('circle', { cx:CX, cy:CY, r:ROOT_R,
    fill:'url(#rg-root)', stroke:'#6FE7F7', 'stroke-width':2.5, filter:'url(#gf-root)' }));
  const ri = el('text', { x:CX, y:CY, 'text-anchor':'middle',
    'dominant-baseline':'middle', 'font-size':26, 'pointer-events':'none' });
  ri.textContent = '⬡';
  rootG.appendChild(ri);
  const rl = el('text', { x:CX, y:CY + ROOT_R + 18, 'text-anchor':'middle',
    'dominant-baseline':'middle', fill:'#6FE7F7', 'font-size':14, 'font-weight':800,
    'font-family':'Orbitron,sans-serif', 'pointer-events':'none', 'letter-spacing':'0.06em' });
  rl.textContent = 'SKILL TREE';
  rootG.appendChild(rl);
  svg.appendChild(rootG);

  // Subject nodes
  SUBJECTS.forEach(function(s, i) {
    const angle = -Math.PI / 2 + (i / SUBJECTS.length) * Math.PI * 2;
    const x = CX + Math.cos(angle) * ORBIT;
    const y = CY + Math.sin(angle) * ORBIT;

    const g = el('g', { 'data-id': s.id });
    g.style.cursor = 'pointer';

    const ring = el('circle', { cx:x, cy:y, r:BRANCH_R + 16,
      fill:'none', stroke:s.color, 'stroke-width':1.5, opacity:0 });
    ring.style.transition = 'opacity 0.25s ease';
    g.appendChild(ring);

    g.appendChild(el('circle', { cx:x, cy:y, r:BRANCH_R,
      fill:'url(#rg-' + s.id + ')', stroke:s.color,
      'stroke-width':2, filter:'url(#gf-' + s.id + ')' }));

    const icon = el('text', { x:x, y:y, 'text-anchor':'middle',
      'dominant-baseline':'middle', 'font-size':24, 'pointer-events':'none' });
    icon.textContent = s.icon;
    g.appendChild(icon);

    const ac  = Math.abs(Math.cos(angle)), as = Math.abs(Math.sin(angle));
    const ld  = BRANCH_R + 22;
    const lx  = ac > as * 1.4 ? x + Math.cos(angle) * ld : x;
    const ly  = ac > as * 1.4 ? y : y + Math.sin(angle) * ld;
    const anc = ac > as * 1.4 ? (Math.cos(angle) > 0 ? 'start' : 'end') : 'middle';
    const lbl = el('text', { x:lx, y:ly, 'text-anchor':anc,
      'dominant-baseline':'middle', fill:s.color,
      'font-size':14, 'font-weight':700, 'font-family':'Inter,sans-serif',
      'pointer-events':'none' });
    lbl.textContent = s.label;
    g.appendChild(lbl);

    g.addEventListener('mouseenter', function() {
      ring.setAttribute('opacity', '0.45');
      highlightEdge(s.id);
      dimOthers(s.id);
      drawExpansion(s, x, y, angle);
    });
    g.addEventListener('mouseleave', function() {
      ring.setAttribute('opacity', '0');
      unhighlightEdge(s.id);
      undimAll();
      clearExpansion();
    });
    g.addEventListener('click', function(e) {
      e.stopPropagation();
      dimOthers(s.id);
      zoomToPoint(x, y, 2.6);
      setTimeout(function() { window.location.href = s.route; }, 480);
    });

    svg.appendChild(g);
  });

  // Inject pulse keyframe once
  if (!document.getElementById('boom-keyframes')) {
    const style = document.createElement('style');
    style.id = 'boom-keyframes';
    style.textContent =
      '@keyframes rootPulse {' +
      '  0%,100% { opacity:0.22; }' +
      '  50%      { opacity:0.55; }' +
      '}';
    document.head.appendChild(style);
  }

  fitToScreen();

  svg.querySelectorAll('g').forEach(function(g, i) {
    g.style.opacity = '0';
    setTimeout(function() {
      g.style.transition = 'opacity 0.5s ease';
      g.style.opacity    = '1';
    }, i * 45 + 50);
  });
}

// ─── HINT + INIT ──────────────────────────────────────────────────────────────
if (hint) setTimeout(function() { hint.style.opacity = '0'; }, 4000);

render();
window.addEventListener('resize', render);

window.addEventListener('load', function() {
  setTimeout(function() { SUBJECTS.forEach(function(s) { loadSubjectJSON(s); }); }, 1200);
});

// ─── COIN DISPLAY INIT ────────────────────────────────────────────────────────
(function() {
  try {
    var raw = localStorage.getItem('skalor_user_stats');
    var cc  = document.getElementById('coin-count');
    if (cc && raw) cc.textContent = JSON.parse(raw).coins || 0;
  } catch (_) {}
})();

// ─── NAV ──────────────────────────────────────────────────────────────────────
var _btn  = document.getElementById('hamburger-btn');
var _menu = document.getElementById('mobile-menu');
if (_btn && _menu) {
  _btn.addEventListener('click', function() {
    var open = _menu.classList.toggle('open');
    _btn.classList.toggle('open', open);
    _btn.setAttribute('aria-expanded', open);
  });
}
document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(function(link) {
  var href   = link.getAttribute('href');
  var active = href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);
  if (active) link.classList.add('active');
});
