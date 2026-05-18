// ============================================================
// 🎴 Flasha Design Signature System — Engine v5.0
// ============================================================
'use strict';

(() => {
  const CFG = {
    introId:      'fl-intro',
    fabBtnId:     'fl-fab-btn',
    fabMenuId:    'fl-fab-menu',
    themeToggleId:'fl-theme-toggle',
    toastId:      'fl-update-toast',
    menuOpenClass:'fl-menu--open',
    toastOpenClass:'fl-toast--open',
    introOutClass:'fl-intro--out',
    themeKey:     'fl_theme_v5',
    introMinMs:   1800,
  };

  const qs  = (s, c = document) => c.querySelector(s);
  const qsa = (s, c = document) => [...c.querySelectorAll(s)];

  /* ── § 1  AUDIO ───────────────────────────────────────── */
  const Audio = (() => {
    let _ctx = null, _master = null;

    const ctx = () => {
      if (!_ctx) {
        try {
          _ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (_) { return null; }
      }
      if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
      return _ctx;
    };

    const master = () => {
      const c = ctx(); if (!c) return null;
      if (!_master || _master.context !== c) {
        _master = c.createGain();
        _master.gain.value = 0.10;
        _master.connect(c.destination);
      }
      return _master;
    };

    const play = (freq, type, peak, a, d, s, r, sweepTo = null) => {
      try {
        const c = ctx(), m = master(); if (!c || !m) return;
        const osc = c.createOscillator();
        const env = c.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, c.currentTime);
        if (sweepTo) {
          osc.frequency.exponentialRampToValueAtTime(
            sweepTo, c.currentTime + a + d);
        }
        osc.connect(env); env.connect(m);
        const now = c.currentTime;
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(peak, now + a);
        env.gain.linearRampToValueAtTime(peak * s, now + a + d);
        env.gain.exponentialRampToValueAtTime(0.0001, now + a + d + r);
        osc.start(now);
        osc.stop(now + a + d + r);
      } catch (_) {}
    };

    return {
      unlock:   () => ctx(),
      tick:     () => play(880,      'sine',     0.5, 0.002, 0.03, 0.0, 0.04),
      popOpen:  () => {
        play(320, 'sine', 0.7, 0.006, 0.08, 0.1, 0.2, 160);
        setTimeout(() => play(480, 'sine', 0.4, 0.004, 0.06, 0.0, 0.1), 40);
      },
      popClose: () => play(440, 'sine', 0.6, 0.005, 0.06, 0.1, 0.15, 220),
      whoosh:   () => play(110, 'triangle', 0.8, 0.02, 0.2, 0.3, 0.5, 440),
    };
  })();

  /* ── § 2  THEME ───────────────────────────────────────── */
  const Theme = (() => {
    const root = document.documentElement;
    const sys  = () => matchMedia('(prefers-color-scheme: light)').matches
                       ? 'light' : 'dark';

    const icons = {
      dark:  `<path d="M17.293 13.293A8 8 0 0 1 6.707 2.707
              a8.001 8.001 0 1 0 10.586 10.586z"/>`,
      light: `<path d="M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0
              1.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z
              M8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5
              0V.75A.75.75 0 0 1 8 0zm0 13.5a.75.75 0 0 1
              .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0
              0 1 8 13.5zM1.5 8a.75.75 0 0 1 .75-.75h1.5a
              .75.75 0 0 1 0 1.5H2.25A.75.75 0 0 1 1.5 8zm
              12 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0
              1.5h-1.5A.75.75 0 0 1 13.5 8z"/>`,
    };

    const apply = (t) => {
      root.setAttribute('data-fl-theme', t);
      localStorage.setItem(CFG.themeKey, t);
      const svg = qs(`#${CFG.themeToggleId} svg`);
      if (svg) svg.innerHTML = icons[t] || icons.dark;
    };

    const init = () => {
      apply(localStorage.getItem(CFG.themeKey) || sys());
      matchMedia('(prefers-color-scheme: light)')
        .addEventListener('change', e => {
          if (!localStorage.getItem(CFG.themeKey))
            apply(e.matches ? 'light' : 'dark');
        });
    };

    const toggle = () => {
      const cur = root.getAttribute('data-fl-theme') || sys();
      apply(cur === 'light' ? 'dark' : 'light');
    };

    return { init, toggle };
  })();

  /* ── § 3  INTRO ───────────────────────────────────────── */
  const initIntro = () => {
    const intro = qs(`#${CFG.introId}`); if (!intro) return;
    const start = performance.now();

    const tick = (now) => {
      const p = Math.min((now - start) / CFG.introMinMs, 1);
      document.documentElement.style
        .setProperty('--fl-progress', p.toFixed(4));
      if (p < 1) { requestAnimationFrame(tick); return; }

      Audio.whoosh();
      intro.classList.add(CFG.introOutClass);
      intro.addEventListener('transitionend', () => {
        if (intro.isConnected) intro.remove();
      }, { once: true });
    };

    requestAnimationFrame(tick);
  };

  /* ── § 4  FAB ─────────────────────────────────────────── */
  const initFab = () => {
    const btn    = qs(`#${CFG.fabBtnId}`);
    const menu   = qs(`#${CFG.fabMenuId}`);
    const togBtn = qs(`#${CFG.themeToggleId}`);
    if (!btn || !menu) return;

    let open = false;

    const openMenu = () => {
      open = true; Audio.popOpen();
      menu.classList.add(CFG.menuOpenClass);
      btn.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-hidden', 'false');
      const first = qs('.fl-link', menu);
      if (first) setTimeout(() => first.focus(), 120);
    };

    const closeMenu = (focus = true) => {
      open = false; Audio.popClose();
      menu.classList.remove(CFG.menuOpenClass);
      btn.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
      if (focus) btn.focus();
    };

    btn.addEventListener('click', (e) => {
      e.stopPropagation(); Audio.unlock();
      open ? closeMenu() : openMenu();
    });

    if (togBtn) togBtn.addEventListener('click', () => {
      Audio.tick(); Theme.toggle();
    });

    document.addEventListener('pointerdown', (e) => {
      if (open && !qs('#fl-fab-root').contains(e.target))
        closeMenu(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) closeMenu();
    });

    qsa('.fl-link', menu).forEach(l =>
      l.addEventListener('mouseenter', () => Audio.tick())
    );
  };

  /* ── § 5  PWA ─────────────────────────────────────────── */
  const initPWA = () => {
    let prompt = null;
    const item      = qs('#fl-pwa-install-item');
    const installBtn= qs('#fl-pwa-install-btn');
    const toast     = qs(`#${CFG.toastId}`);
    const reloadBtn = qs('#fl-update-btn',  toast || document);
    const closeBtn  = qs('#fl-toast-close', toast || document);

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
          reg.addEventListener('updatefound', () => {
            const w = reg.installing;
            w?.addEventListener('statechange', () => {
              if (w.state === 'installed' && navigator.serviceWorker.controller)
                toast?.classList.add(CFG.toastOpenClass);
            });
          });
        }).catch(() => {});
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); prompt = e;
      if (item) item.style.display = 'block';
    });

    installBtn?.addEventListener('click', async (e) => {
      e.preventDefault(); if (!prompt) return;
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted' && item) item.style.display = 'none';
      prompt = null;
    });

    reloadBtn?.addEventListener('click', () => location.reload());
    closeBtn?.addEventListener('click',  () =>
      toast?.classList.remove(CFG.toastOpenClass)
    );
  };

  /* ── BOOT ─────────────────────────────────────────────── */
  Theme.init();
  const boot = () => { initIntro(); initFab(); initPWA(); };
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot)
    : boot();
})();
