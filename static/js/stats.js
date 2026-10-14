/**
 * SKALOR STATS SYSTEM
 * Manages user progression, coins, and levels.
 * Also handles server-side progress sync (ProgressSync).
 */

const STATS_KEY = 'skalor_user_stats';

const DEFAULT_STATS = {
    coins: 0,
    level: 1,
    completedLeaves: {},
    subjectProgress: {}
};

const SKALOR_LS_KEYS = [
    'skalor_user_stats',
    'skalor_bio_progress',   'skalor_bio_quizzes',
    'skalor_wisk_progress',  'skalor_wisk_quizzes',
    'skalor_chem_progress',  'skalor_chem_quizzes',
    'skalor_fys_progress',   'skalor_fys_quizzes',
    'skalor_info_progress',  'skalor_info_quizzes',
    'skalor_ned_progress',   'skalor_ned_quizzes',
    'skalor_owned',
    'skalor_equipped',
];

// --- Stats -------------------------------------------------------------------

window.SkalorStats = {
    get() {
        try {
            const saved = localStorage.getItem(STATS_KEY);
            return saved ? JSON.parse(saved) : { ...DEFAULT_STATS };
        } catch (e) {
            return { ...DEFAULT_STATS };
        }
    },

    save(stats) {
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
        this.updateUI();
    },

    addCoins(amount) {
        const stats = this.get();
        stats.coins = Math.max(0, stats.coins + amount);

        const newLevel = Math.max(1, Math.floor(stats.coins / 500) + 1);
        if (newLevel > stats.level) stats.level = newLevel;

        this.save(stats);
        this.triggerCoinAnimation(amount);

        // Trigger cosmetic effect on positive coin gain (skill completion)
        if (amount > 0 && window.SkalorCosmetics) window.SkalorCosmetics.trigger();

        // Sync to server
        if (window.ProgressSync) ProgressSync.save();
    },

    completeSkill(leafId, coinsAwarded = 10) {
        const stats = this.get();
        if (stats.completedLeaves[leafId]) return;
        stats.completedLeaves[leafId] = true;
        this.save(stats);
        this.addCoins(coinsAwarded);
    },

    isSkillDone(leafId) {
        return !!this.get().completedLeaves[leafId];
    },

    updateUI() {
        const stats = this.get();
        ['coin-count', 'coin-display'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = stats.coins;
        });
        const sc = document.getElementById('stat-coins');
        if (sc) sc.textContent = '🪙 ' + stats.coins;

        document.querySelectorAll('.player-level-display, #nav-level, #hero-level').forEach(el => {
            el.textContent = stats.level;
        });
    },

    triggerCoinAnimation(amount) {
        const coinBadge = document.querySelector('.coin-badge');
        if (!coinBadge) return;
        coinBadge.classList.remove('bump');
        void coinBadge.offsetWidth;
        coinBadge.classList.add('bump');
        setTimeout(() => coinBadge.classList.remove('bump'), 400);
    }
};

// --- Progress Sync -----------------------------------------------------------
// Ties all localStorage progress to a server-side account.
// - Logged in  : progress loaded from server on page load, saved on every change
// - Not logged in: localStorage cleared on every page load (refresh = reset)

window.ProgressSync = (function () {

    let _loggedIn    = false;
    let _saveTimer   = null;
    let _initialised = false;  // guard against double-init

    function _readAll() {
        const out = {};
        SKALOR_LS_KEYS.forEach(k => {
            const raw = localStorage.getItem(k);
            if (raw) {
                try { out[k] = JSON.parse(raw); } catch (_) { out[k] = raw; }
            }
        });
        return out;
    }

    // Smart merge: never let stale server data overwrite higher local progress.
    // For skalor_user_stats we keep max coins/level and a union of completedLeaves
    // so navigating between pages never resets earned coins.
    function _writeAll(stored) {
        SKALOR_LS_KEYS.forEach(k => {
            if (stored[k] === undefined) return;

            if (k === 'skalor_user_stats') {
                let local = {};
                try { local = JSON.parse(localStorage.getItem(k) || '{}'); } catch (_) {}
                const srv = stored[k];
                const merged = {
                    ...srv,
                    coins:           Math.max(local.coins  || 0, srv.coins  || 0),
                    level:           Math.max(local.level  || 1, srv.level  || 1),
                    completedLeaves: { ...(srv.completedLeaves || {}), ...(local.completedLeaves || {}) },
                    subjectProgress: { ...(srv.subjectProgress || {}), ...(local.subjectProgress || {}) },
                };
                localStorage.setItem(k, JSON.stringify(merged));
            } else {
                localStorage.setItem(k, JSON.stringify(stored[k]));
            }
        });
    }

    function _clearAll() {
        SKALOR_LS_KEYS.forEach(k => localStorage.removeItem(k));
    }

    async function init() {
        if (_initialised) return;
        _initialised = true;
        try {
            const res  = await fetch('/api/auth/me');
            const data = await res.json();
            if (!data.authenticated) {
                _clearAll();
                _loggedIn = false;
                return;
            }
            _loggedIn = true;
            await load();
            window.SkalorStats.updateUI();
        } catch (e) {
            console.warn('[ProgressSync] init failed', e);
        }
    }

    async function load() {
        try {
            const res  = await fetch('/api/auth/progress');
            if (!res.ok) return;
            const data = await res.json();
            if (data.progress && Object.keys(data.progress).length) {
                _writeAll(data.progress);
            }
        } catch (e) {
            console.warn('[ProgressSync] load failed', e);
        }
    }

    // Debounced — batches rapid changes into one POST
    function save() {
        if (!_loggedIn) return;
        clearTimeout(_saveTimer);
        _saveTimer = setTimeout(async () => {
            try {
                await fetch('/api/auth/progress', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ progress: _readAll() }),
                });
            } catch (e) {
                console.warn('[ProgressSync] save failed', e);
            }
        }, 200);
    }

    // Immediate flush via sendBeacon so data is never lost when the user
    // navigates away before the 200ms debounce timer fires.
    function _flushNow() {
        if (!_loggedIn) return;
        clearTimeout(_saveTimer);
        const payload = JSON.stringify({ progress: _readAll() });
        navigator.sendBeacon(
            '/api/auth/progress',
            new Blob([payload], { type: 'application/json' })
        );
    }

    async function onLogin() {
        _loggedIn    = true;
        _initialised = true;
        await load();
        window.SkalorStats.updateUI();
    }

    function onLogout() {
        _loggedIn    = false;
        _initialised = false;
        _clearAll();
    }

    function isLoggedIn() { return _loggedIn; }

    // Flush on any kind of page exit / tab switch
    window.addEventListener('pagehide',         _flushNow);
    window.addEventListener('beforeunload',     _flushNow);
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') _flushNow();
    });

    return { init, load, save, onLogin, onLogout, isLoggedIn };

})();

// --- Auto-init on every page -------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    window.SkalorStats.updateUI();
    window.ProgressSync.init(); // guarded — safe to call multiple times
});
