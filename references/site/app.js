/* ============================================================
   Creative Studio — shared behavior
   Page-aware: every page loads this one file. Each block guards
   on the elements it needs, so nothing runs where it shouldn't.
   Depends on data.js (and wiki.js on the tutorials page).
   ============================================================ */
(function () {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const laneTag = (lane) => lane === 'PM'
    ? '<span class="lane-tag lane-pm">PM</span>'
    : '<span class="lane-tag lane-cr">Creative</span>';

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

  /* ---------- copy-to-clipboard on code blocks ----------
     Uses the async Clipboard API when available (https / localhost)
     and falls back to execCommand for file:// viewing. */
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
  function initCopy(root = document) {
    $$('.code .copy', root).forEach(btn => {
      if (btn.dataset.wired) return;
      btn.dataset.wired = '1';
      btn.addEventListener('click', () => {
        const code = btn.closest('.code');
        const text = (code.dataset.copy ||
          code.querySelector('pre, .code-text')?.innerText || '').trim();
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
    });
  }

  /* ---------- the catalog (overview) ----------
     Skills grouped by phase, like the review page's library view,
     followed by the agents. ---------- */
  function skCard(s) {
    return `
      <div class="sk">
        <div class="name"><span class="sl">/</span>${s.name}</div>
        <div class="desc">${s.desc}</div>
        <div class="meta">
          ${laneTag(s.lane)}
          ${s.src ? `<span class="src-tag">${s.src}</span>` : ''}
        </div>
      </div>`;
  }
  function initCatalog() {
    const el = $('#catalog');
    if (!el || typeof PHASES === 'undefined') return;
    let html = PHASES.map(p => {
      const list = SKILLS.filter(s => s.phase === p.id);
      if (!list.length) return '';
      return `
      <div class="catalog-sec reveal">
        <div class="sec-head">
          <h3>${p.id}</h3>
          ${p.cmd ? `<span class="pill">${p.cmd}</span>` : ''}
          <span class="ct">${list.length} skill${list.length === 1 ? '' : 's'}</span>
        </div>
        <div class="blurb">${p.desc}</div>
        <div class="skill-grid">${list.map(skCard).join('')}</div>
      </div>`;
    }).join('');
    html += `
      <div class="catalog-sec reveal">
        <div class="sec-head">
          <h3>Agents</h3>
          <span class="ct">${AGENTS.length} agents</span>
        </div>
        <div class="blurb">Separate reviewers and a researcher, available across the whole lifecycle — a skill never reviews its own work, and the final approval gates stay human.</div>
        <div class="skill-grid">${AGENTS.map(a => `
          <div class="sk">
            <div class="name"><span class="sl">/</span>${a.name}</div>
            <div class="desc">${a.desc}</div>
            <div class="meta"><span class="kind">${a.kind}</span></div>
          </div>`).join('')}</div>
      </div>`;
    el.innerHTML = html;
  }

  /* ============================================================
     WIKI (tutorials.html)
     Hash-routed articles from wiki.js. #<article-id>
     ============================================================ */
  function flatWiki() {
    const flat = [];
    WIKI.forEach(sec => sec.articles.forEach(a => flat.push({ ...a, section: sec.section })));
    return flat;
  }

  function initWiki() {
    const sideEl = $('#wiki-side-list');
    const artEl = $('#wiki-article');
    if (!sideEl || !artEl || typeof WIKI === 'undefined') return;

    const flat = flatWiki();
    const byId = Object.fromEntries(flat.map(a => [a.id, a]));

    /* sidebar */
    function renderSide(activeId, filter) {
      const q = (filter || '').toLowerCase();
      sideEl.innerHTML = WIKI.map(sec => {
        const items = sec.articles.filter(a =>
          !q || a.title.toLowerCase().includes(q) || a.lede.toLowerCase().includes(q));
        if (!items.length) return '';
        return `<div class="ws-h">${sec.section}</div>` + items.map(a =>
          `<a class="ws-item ${a.id === activeId ? 'active' : ''}" href="#${a.id}">${a.title}</a>`).join('');
      }).join('');
    }

    /* article */
    function renderArticle(id) {
      const a = byId[id] || flat[0];
      const i = flat.findIndex(x => x.id === a.id);
      const prev = flat[i - 1], next = flat[i + 1];
      const video = a.video ? `
        <div class="art-video">
          <div class="video-ph">
            <span class="play"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5l13 7-13 7z"/></svg></span>
            <span class="t">${a.video}</span>
            <span class="ph-badge">Video coming soon</span>
          </div>
        </div>` : '';
      artEl.innerHTML = `
        <div class="crumb">${a.section}</div>
        <h1>${a.title}</h1>
        <p class="art-lede">${a.lede}</p>
        ${video}
        <div class="prose">${a.body}</div>
        <div class="wiki-nav">
          ${prev ? `<a class="prev" href="#${prev.id}"><div class="dir">&larr; Previous</div><div class="ti">${prev.title}</div></a>` : ''}
          ${next ? `<a class="next" href="#${next.id}"><div class="dir">Next &rarr;</div><div class="ti">${next.title}</div></a>` : ''}
        </div>`;
      renderSide(a.id, $('#wiki-search') ? $('#wiki-search').value : '');
      initCopy(artEl);
      document.title = `${a.title} — Creative Studio Tutorials`;
      if (location.hash.slice(1) !== a.id) history.replaceState(null, '', '#' + a.id);
      artEl.closest('.wiki') && window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    window.addEventListener('hashchange', () => {
      const id = location.hash.slice(1);
      if (byId[id]) renderArticle(id);
    });

    const search = $('#wiki-search');
    if (search) search.addEventListener('input', () => {
      const active = location.hash.slice(1);
      renderSide(byId[active] ? active : flat[0].id, search.value);
    });

    const initial = location.hash.slice(1);
    renderArticle(byId[initial] ? initial : flat[0].id);
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initCatalog();
    initWiki();
    initCopy();
    initReveals();   // last, so dynamically-rendered .reveal nodes are observed
  });
})();
