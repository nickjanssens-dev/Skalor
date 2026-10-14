/**
 * SKALOR COSMETICS
 * Reads skalor_equipped from localStorage and applies visual effects:
 *   avatar  → replaces the icon inside .avatar-circle
 *   badge   → shows emoji next to username in nav
 *   frame   → styles the border/shadow of .avatar-circle
 *   theme   → overrides CSS accent variables on :root
 *   effect  → particle animation triggered on skill completion
 */

(function () {

    // ── Data maps ────────────────────────────────────────────────
    const AVATAR_ICONS = { av1: '🤖', av2: '🦊', av3: '👨‍🚀', av4: '🐉' };
    const BADGE_ICONS  = { ba1: '⭐', ba2: '💎', ba3: '💻', ba4: '🖊️' };

    const FRAME_STYLES = {
        fr1: { border: '2px solid #c0c0c0',  boxShadow: '0 0 8px rgba(192,192,192,0.55)',  animation: '' },
        fr2: { border: '2px solid #00ffff',  boxShadow: '0 0 10px #00ffff, 0 0 22px rgba(0,255,255,0.4)', animation: 'sk-neonPulse 1.5s ease-in-out infinite' },
        fr3: { border: '2px solid rgba(150,220,255,0.9)', boxShadow: '0 0 12px rgba(150,220,255,0.7), inset 0 0 6px rgba(150,220,255,0.3)', animation: '' },
        fr4: { border: '3px solid #ff6b00',  boxShadow: '0 0 14px #ff6b00, 0 0 28px rgba(255,107,0,0.4)', animation: '' },
    };

    const THEME_VARS = {
        th1: { '--skalor-accent': '#a855f7', '--skalor-cyan': '#a855f7', '--skalor-accent-dim': 'rgba(168,85,247,0.15)' },
        th2: { '--skalor-accent': '#3b82f6', '--skalor-cyan': '#3b82f6', '--skalor-accent-dim': 'rgba(59,130,246,0.15)'  },
        th3: { '--skalor-accent': '#ef4444', '--skalor-cyan': '#ef4444', '--skalor-accent-dim': 'rgba(239,68,68,0.15)'   },
        th4: null, // aurora — special animated
    };

    // ── Shared style injection ───────────────────────────────────
    function _injectBaseStyles() {
        if (document.getElementById('sk-cosmetic-base')) return;
        const s = document.createElement('style');
        s.id = 'sk-cosmetic-base';
        s.textContent = `
            @keyframes sk-neonPulse {
                0%,100% { box-shadow: 0 0 10px #00ffff, 0 0 22px rgba(0,255,255,0.4); }
                50%      { box-shadow: 0 0 20px #00ffff, 0 0 40px rgba(0,255,255,0.7); }
            }
            @keyframes sk-auroraColor {
                0%   { --skalor-accent:#00ffcc; --skalor-cyan:#00ffcc; }
                33%  { --skalor-accent:#a855f7; --skalor-cyan:#a855f7; }
                66%  { --skalor-accent:#0ea5e9; --skalor-cyan:#0ea5e9; }
                100% { --skalor-accent:#00ffcc; --skalor-cyan:#00ffcc; }
            }
            .sk-aurora-active { animation: sk-auroraColor 4s linear infinite; }
        `;
        document.head.appendChild(s);
    }

    // ── Avatar ───────────────────────────────────────────────────
    function applyAvatar(itemId) {
        document.querySelectorAll('.avatar-circle').forEach(circle => {
            // Don't overwrite if a real <img> is already inside (future feature)
            if (circle.querySelector('img')) return;
            if (itemId && AVATAR_ICONS[itemId]) {
                circle.innerHTML = `<span style="font-size:18px;line-height:1;user-select:none;">${AVATAR_ICONS[itemId]}</span>`;
            } else {
                circle.innerHTML = '<i class="fa-solid fa-user"></i>';
            }
        });
    }

    // ── Badge ────────────────────────────────────────────────────
    function applyBadge(itemId) {
        // Remove previous badge icons
        document.querySelectorAll('.sk-badge-icon').forEach(el => el.remove());
        if (!itemId || !BADGE_ICONS[itemId]) return;

        const nameEl = document.getElementById('nav-avatar-name');
        if (!nameEl) return;
        const span = document.createElement('span');
        span.className = 'sk-badge-icon';
        span.textContent = BADGE_ICONS[itemId];
        span.style.cssText = 'font-size:13px; margin-left:4px; user-select:none;';
        nameEl.insertAdjacentElement('afterend', span);
    }

    // ── Frame ────────────────────────────────────────────────────
    function applyFrame(itemId) {
        const frame = FRAME_STYLES[itemId] || null;
        document.querySelectorAll('.avatar-circle').forEach(circle => {
            if (frame) {
                circle.style.border     = frame.border;
                circle.style.boxShadow  = frame.boxShadow;
                circle.style.animation  = frame.animation;
            } else {
                circle.style.border    = '';
                circle.style.boxShadow = '';
                circle.style.animation = '';
            }
        });
    }

    // ── Theme ────────────────────────────────────────────────────
    function applyTheme(itemId) {
        const root = document.documentElement;
        const VARS = ['--skalor-accent', '--skalor-cyan', '--skalor-accent-dim'];

        // Reset
        VARS.forEach(v => root.style.removeProperty(v));
        root.classList.remove('sk-aurora-active');

        if (!itemId) return;

        if (itemId === 'th4') {
            root.classList.add('sk-aurora-active');
        } else {
            const vars = THEME_VARS[itemId];
            if (vars) Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
        }
    }

    // ── Effect (setup) ───────────────────────────────────────────
    function setupEffect(itemId) {
        window._skActiveEffect = itemId || null;
    }

    // ── Effect (trigger) ─────────────────────────────────────────
    function triggerEffect(itemId) {
        const id = itemId || window._skActiveEffect;
        if (!id) return;
        switch (id) {
            case 'ef1': _confetti();   break;
            case 'ef2': _lightning();  break;
            case 'ef3': _fire();       break;
            case 'ef4': _portal();     break;
        }
    }

    // ── Apply all at once ────────────────────────────────────────
    function apply() {
        _injectBaseStyles();
        try {
            const eq = JSON.parse(localStorage.getItem('skalor_equipped') || '{}');
            applyAvatar(eq.avatar  || null);
            applyBadge (eq.badge   || null);
            applyFrame (eq.frame   || null);
            applyTheme (eq.theme   || null);
            setupEffect(eq.effect  || null);
        } catch (e) {
            console.warn('[SkalorCosmetics] apply failed', e);
        }
    }

    // ── Expose public API ────────────────────────────────────────
    window.SkalorCosmetics = { apply, trigger: triggerEffect };

    // ── Auto-apply + ensure ProgressSync runs on every page ─────
    // On subject pages stats.js loads asynchronously (after DOMContentLoaded),
    // so we poll until window.ProgressSync exists before calling init().
    function _ensureSync() {
        if (window.ProgressSync) {
            window.ProgressSync.init(); // guarded — no-op if already initialised
        } else {
            setTimeout(_ensureSync, 150);
        }
    }

    function _boot() {
        apply();
        _ensureSync();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _boot);
    } else {
        _boot();
    }

    // Re-apply if equipped changes in another tab
    window.addEventListener('storage', (e) => {
        if (e.key === 'skalor_equipped') apply();
    });


    // ════════════════════════════════════════════════════════════
    // PARTICLE EFFECTS
    // ════════════════════════════════════════════════════════════

    function _confetti() {
        const COLORS = ['#ff0000','#00ff88','#0080ff','#ffdd00','#ff00ff','#00ffff','#ff8800'];
        for (let i = 0; i < 90; i++) {
            const el = document.createElement('div');
            const w  = 4 + Math.random() * 6;
            const h  = 8 + Math.random() * 8;
            el.style.cssText = [
                'position:fixed',
                `width:${w}px`, `height:${h}px`,
                `background:${COLORS[Math.floor(Math.random() * COLORS.length)]}`,
                `left:${Math.random() * 100}vw`,
                'top:-20px',
                'z-index:9999',
                'pointer-events:none',
                'border-radius:2px',
                `transform:rotate(${Math.random()*360}deg)`,
            ].join(';');
            document.body.appendChild(el);
            const dur   = 1400 + Math.random() * 1400;
            const delay = Math.random() * 300;
            el.animate([
                { transform: `translateY(0) rotate(${Math.random()*360}deg)`, opacity: 1 },
                { transform: `translateY(100vh) rotate(${Math.random()*720}deg)`, opacity: 0 },
            ], { duration: dur, delay, easing: 'linear' }).onfinish = () => el.remove();
        }
    }

    function _lightning() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:9999;pointer-events:none;';

        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <filter id="sk-glow">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>`;

        // Build jagged path down the centre
        let d = `M${window.innerWidth / 2},0 `;
        let x = window.innerWidth / 2;
        let y = 0;
        while (y < window.innerHeight) {
            x += (Math.random() - 0.5) * 80;
            y += 35 + Math.random() * 45;
            d += `L${x},${y} `;
        }

        const bolt = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        bolt.setAttribute('d', d);
        bolt.setAttribute('stroke', '#00ffff');
        bolt.setAttribute('stroke-width', '3');
        bolt.setAttribute('fill', 'none');
        bolt.setAttribute('filter', 'url(#sk-glow)');

        svg.appendChild(defs);
        svg.appendChild(bolt);
        document.body.appendChild(svg);

        bolt.animate(
            [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }, { opacity: 0 }],
            { duration: 550, easing: 'ease-out' }
        ).onfinish = () => svg.remove();
    }

    function _fire() {
        for (let i = 0; i < 55; i++) {
            const el   = document.createElement('div');
            const size = 6 + Math.random() * 9;
            el.style.cssText = [
                'position:fixed',
                `width:${size}px`, `height:${size}px`,
                'border-radius:50%',
                'background:radial-gradient(circle,#ffff00,#ff8800,#ff2200)',
                `left:${20 + Math.random() * 60}vw`,
                'bottom:0',
                'z-index:9999',
                'pointer-events:none',
                'filter:blur(1.5px)',
            ].join(';');
            document.body.appendChild(el);
            const dur   = 900 + Math.random() * 1000;
            const delay = Math.random() * 500;
            const dx    = (Math.random() - 0.5) * 50;
            el.animate([
                { transform: `translateY(0) translateX(0) scale(1)`,           opacity: 1 },
                { transform: `translateY(-${35+Math.random()*40}vh) translateX(${dx}px) scale(0.15)`, opacity: 0 },
            ], { duration: dur, delay, easing: 'ease-out' }).onfinish = () => el.remove();
        }
    }

    function _portal() {
        const el = document.createElement('div');
        el.style.cssText = [
            'position:fixed',
            'top:50%', 'left:50%',
            'width:220px', 'height:220px',
            'border-radius:50%',
            'background:conic-gradient(from 0deg,#a855f7,#0ea5e9,#00ffcc,#a855f7)',
            'box-shadow:0 0 50px rgba(168,85,247,0.8),0 0 90px rgba(14,165,233,0.5)',
            'z-index:9999',
            'pointer-events:none',
        ].join(';');
        document.body.appendChild(el);

        // Inner dark void
        const inner = document.createElement('div');
        inner.style.cssText = [
            'position:absolute', 'inset:14px',
            'border-radius:50%',
            'background:radial-gradient(circle,#000820,transparent)',
        ].join(';');
        el.appendChild(inner);

        el.animate([
            { transform: 'translate(-50%,-50%) scale(0)   rotate(0deg)',   opacity: 0   },
            { transform: 'translate(-50%,-50%) scale(1.15) rotate(200deg)', opacity: 1   },
            { transform: 'translate(-50%,-50%) scale(1)   rotate(360deg)', opacity: 0.9 },
            { transform: 'translate(-50%,-50%) scale(0)   rotate(540deg)', opacity: 0   },
        ], { duration: 1600, easing: 'ease-in-out' }).onfinish = () => el.remove();
    }

})();
