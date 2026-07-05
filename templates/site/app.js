/* ============================================================
   Shared behavior — renders every page from window.SITE_DATA.
   Page-aware: each block guards on the elements it needs, so
   nothing runs where it shouldn't. Load order: data.js first
   (and wiki.js before app.js on the tutorials page).
   No fields outside the SITE_DATA contract are read.
   ============================================================ */
(function () {
  'use strict';

  const D  = window.SITE_DATA || {};
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const get = (obj, path) => path.split('.').reduce(
    (o, k) => (o == null ? undefined : o[k]), obj);

  const plugin = D.plugin || {};
  const displayName = plugin.displayName || plugin.name || 'Team plugin';

  const INFO_ICON = '<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>';

  /* ---------- lanes ---------- */
  const lanes = (D.lanes || []).map(l => typeof l === 'string' ? { id: l } : l);
  const laneIndex = {};
  lanes.forEach((l, i) => { laneIndex[l.id] = i; });
  function laneTag(id) {
    if (!id) return '';
    const i = laneIndex[id];
    const cls = i == null ? 'lane-t0' : 'lane-t' + (i % 5 + 1);
    const label = i == null ? id : (lanes[i].label || lanes[i].id);
    return `<span class="lane-tag ${cls}">${esc(label)}</span>`;
  }

  /* ---------- text binding + page titles ---------- */
  function initBind() {
    $$('[data-bind]').forEach(el => {
      const v = get(D, el.dataset.bind);
      if (v != null && v !== '') el.textContent = v;
    });
    const page = document.body.dataset.page;
    if (page === 'overview') document.title = `${displayName} — a Claude Code plugin`;
    if (page === 'install')  document.title = `Install — ${displayName}`;
    /* tutorials: wiki.js owns the title */
    $$('.footer-note').forEach(el => {
      el.textContent = 'A Claude Code plugin' +
        (plugin.version ? ' · v' + plugin.version : '');
    });
  }

  /* ---------- hero counts ---------- */
  function initCounts() {
    const el = $('#hero-counts');
    if (!el) return;
    const c = D.counts || {
      skills:   (D.skills   || []).length,
      commands: (D.commands || []).length,
      agents:   (D.agents   || []).length,
    };
    const part = (n, w) => n ? `<b>${n}</b> ${w}${n === 1 ? '' : 's'}` : '';
    const parts = [part(c.skills, 'skill'), part(c.commands, 'command'),
                   part(c.agents, 'agent')].filter(Boolean);
    if (!parts.length) { el.style.display = 'none'; return; }
    el.innerHTML = parts.join(' &nbsp;·&nbsp; ');
  }

  /* ---------- nav: active state + mobile toggle ---------- */
  function initNav() {
    const page = document.body.dataset.page;
    $$('.nav-links a').forEach(a => {
      if (page && a.dataset.page === page) a.classList.add('active');
    });
    const toggle = $('.nav-toggle');
    const links = $('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => links.classList.toggle('open'));
      links.addEventListener('click', e => {
        if (e.target.tagName === 'A') links.classList.remove('open');
      });
    }
  }

  /* ---------- scroll reveals ---------- */
  function initReveals() {
    window.__revealsReady = true;   // tell the inline backstop the script ran
    const els = $$('.reveal:not(.in)');
    if (!els.length) return;
    /* Hidden documents (background tabs, prerender, embedded previews)
       never fire IntersectionObserver — show everything instead. */
    if (reduceMotion || !('IntersectionObserver' in window) ||
        document.visibilityState === 'hidden') {
      els.forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    els.forEach(el => io.observe(el));
  }

  /* ---------- copy-to-clipboard (delegated, covers blocks
     rendered later by the wiki). Async Clipboard API when
     available; execCommand fallback for file:// viewing. ---------- */
  function legacyCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.code .copy');
    if (!btn) return;
    const code = btn.closest('.code');
    const text = (code.dataset.copy ||
      (code.querySelector('pre, .code-text') || {}).innerText || '').trim();
    const feedback = () => {
      const prev = btn.dataset.label || btn.textContent;
      btn.dataset.label = prev;
      btn.textContent = 'Copied'; btn.classList.add('done');
      setTimeout(() => { btn.textContent = prev; btn.classList.remove('done'); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(feedback)
        .catch(() => { legacyCopy(text); feedback(); });
    } else {
      legacyCopy(text); feedback();
    }
  });

  /* ============================================================
     THE CATALOG (overview) — skills grouped by phase,
     then agents, then commands.
     ============================================================ */
  function skillCard(s) {
    return `
      <div class="sk">
        <div class="sk-title">${esc(s.title || s.slug || '')}</div>
        ${s.slug ? `<div class="name"><span class="sl">/</span>${esc(s.slug)}</div>` : ''}
        <div class="desc">${esc(s.summary || '')}</div>
        <div class="meta">${laneTag(s.lane)}${s.vendor ? `<span class="vendor-tag">${esc(typeof s.vendor === 'string' ? s.vendor : 'vendor')}</span>` : ''}</div>
      </div>`;
  }

  function initCatalog() {
    const el = $('#catalog');
    if (!el) return;
    const skills   = D.skills   || [];
    const agents   = D.agents   || [];
    const commands = D.commands || [];
    const phases = (D.phases || []).map(p => typeof p === 'string' ? { id: p } : p);

    if (!skills.length && !agents.length && !commands.length) {
      const sec = el.closest('.section');
      if (sec) sec.style.display = 'none';
      return;
    }

    const known = new Set(phases.map(p => p.id));
    const groups = phases.map(p => ({
      ...p, list: skills.filter(s => s.phase === p.id),
    }));
    const leftover = skills.filter(s => !known.has(s.phase));
    if (leftover.length) groups.push({ id: 'Other', list: leftover });

    let html = groups.filter(g => g.list.length).map(g => `
      <div class="catalog-sec reveal">
        <div class="sec-head">
          <h3>${esc(g.id)}</h3>
          ${g.command ? `<span class="pill">${esc(g.command)}</span>` : ''}
          <span class="ct">${g.list.length} skill${g.list.length === 1 ? '' : 's'}</span>
        </div>
        ${g.description ? `<div class="blurb">${esc(g.description)}</div>` : ''}
        <div class="skill-grid">${g.list.map(skillCard).join('')}</div>
      </div>`).join('');

    if (agents.length) html += `
      <div class="catalog-sec reveal">
        <div class="sec-head">
          <h3>Agents</h3>
          <span class="ct">${agents.length} agent${agents.length === 1 ? '' : 's'}</span>
        </div>
        <div class="blurb">Reviewers and helpers that run as separate subagents, available across the whole lifecycle — a skill never reviews its own work.</div>
        <div class="skill-grid">${agents.map(a => `
          <div class="sk">
            <div class="name">${esc(a.name)}</div>
            <div class="desc">${esc(a.summary || '')}</div>
            ${a.kind ? `<div class="meta"><span class="kind">${esc(a.kind)}</span></div>` : ''}
          </div>`).join('')}</div>
      </div>`;

    if (commands.length) html += `
      <div class="catalog-sec reveal">
        <div class="sec-head">
          <h3>Commands</h3>
          <span class="ct">${commands.length} command${commands.length === 1 ? '' : 's'}</span>
        </div>
        <div class="blurb">Typed shortcuts. Skills load on their own when a task calls for them — commands are the explicit way to run a whole workflow.</div>
        <div class="skill-grid">${commands.map(c => `
          <div class="sk">
            <div class="name"><span class="sl">/</span>${esc(c.name)}</div>
            <div class="desc">${esc(c.summary || '')}</div>
          </div>`).join('')}</div>
      </div>`;

    el.innerHTML = html;

    /* lane legend in the section head */
    const legend = $('#lane-legend');
    if (legend && lanes.length) {
      legend.innerHTML = lanes.map(l =>
        `<span class="legend-item">${laneTag(l.id)}${l.description ? ` <span class="muted">${esc(l.description)}</span>` : ''}</span>`
      ).join(' &nbsp;·&nbsp; ');
    }
  }

  /* ============================================================
     INSTALL — numbered steps (marketplace → install → first
     command) and the connections grid, from SITE_DATA.install
     and SITE_DATA.integrations.
     ============================================================ */
  function commandBlock(cmds, label) {
    const list = (cmds || []).filter(Boolean);
    if (!list.length) return '';
    const text = list.join('\n');
    const pretty = list.map(c => esc(c)
      .replace(/^(\/\S+)/, '<span class="kw">$1</span>')
      .replace(/&lt;([^&]*)&gt;/g, '<span class="var">&lt;$1&gt;</span>')
    ).join('\n');
    return `
      <div class="code-label">${esc(label || 'Claude Code')}</div>
      <div class="code" data-copy="${esc(text)}"><button class="copy">Copy</button><pre>${pretty}</pre></div>`;
  }

  function normStep(s) {
    if (!s) return null;
    return {
      title: s.title || '',
      description: s.description || '',
      commands: s.commands || (s.command ? [s.command] : []),
      note: s.note || '',
    };
  }

  function initInstall() {
    const el = $('#install-steps');
    if (el) {
      const inst = D.install || {};
      const steps = [
        normStep(inst.marketplaceStep),
        ...(inst.installSteps || []).map(normStep),
        normStep(inst.firstCommand),
      ].filter(Boolean);
      el.innerHTML = steps.length ? steps.map((s, i) => `
        <div class="step">
          <span class="n">${i + 1}</span>
          <div class="st-body">
            <h3>${esc(s.title)}</h3>
            ${s.description ? `<p>${esc(s.description)}</p>` : ''}
            ${commandBlock(s.commands)}
            ${s.note ? `<div class="callout">${INFO_ICON}<div>${esc(s.note)}</div></div>` : ''}
          </div>
        </div>`).join('')
      : `<div class="callout">${INFO_ICON}<div>Install steps appear here once <b>/fde-deploy</b> generates <code class="inline">data.js</code> from the catalog.</div></div>`;
    }

    const grid = $('#connections');
    if (grid) {
      const integrations = D.integrations || [];
      if (!integrations.length) {
        const sec = grid.closest('.section');
        if (sec) sec.style.display = 'none';
      } else {
        grid.innerHTML = integrations.map((it, i) => `
          <div class="card reveal${i % 2 ? ' d1' : ''}">
            <span class="badge accent">${esc(it.kind || 'integration')}</span>
            <h3 style="margin-top:14px">${esc(it.name)}</h3>
            <p class="muted" style="margin-top:8px;font-size:14.5px">${esc(it.authNotes || '')}</p>
          </div>`).join('');
      }
    }
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    initBind();
    initCounts();
    initNav();
    initCatalog();
    initInstall();
    initReveals();   // last, so dynamically-rendered .reveal nodes are observed
  });
})();
