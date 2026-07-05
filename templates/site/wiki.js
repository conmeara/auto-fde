/* ============================================================
   Tutorials wiki — sidebar + hash-routed articles, rendered
   from SITE_DATA.wiki.sections (data.js). Loaded only by
   tutorials.html, before app.js.

   Article shape:
     { id, title, lede?, videoPlaceholder?,   // caption for the
                                              // video-coming-soon block
       bodyHtml? | bodyMarkdown? }            // bodyHtml wins if both

   When SITE_DATA.wiki.sections is empty, the generic default
   articles below render instead. They are written for any team
   plugin (they interpolate SITE_DATA at render time) and ship
   as defaults that /fde-deploy customizes — either by filling
   SITE_DATA.wiki.sections or by editing defaultSections().
   ============================================================ */
(function () {
  'use strict';

  const D = window.SITE_DATA || {};
  const $ = (s, r = document) => r.querySelector(s);
  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const plugin = D.plugin || {};
  const dn = plugin.displayName || plugin.name || 'This plugin';
  const install = D.install || {};
  const firstCmd = (install.firstCommand && install.firstCommand.command) || null;

  /* ============================================================
     Tiny Markdown → HTML. Supports: ## / ### headings, fenced
     code blocks, - / 1. lists, **bold**, `code`, [links](url),
     paragraphs. Enough for tutorial articles; use bodyHtml for
     anything richer.
     ============================================================ */
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');

  function mdToHtml(src) {
    const lines = String(src || '').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (/^```/.test(l)) {                                  /* fence */
        const buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        const code = buf.join('\n');
        out.push(`<div class="code" data-copy="${esc(code)}"><button class="copy">Copy</button><pre>${esc(code)}</pre></div>`);
        continue;
      }
      if (/^###\s/.test(l)) { out.push(`<h3>${inline(l.slice(4))}</h3>`); i++; continue; }
      if (/^##\s/.test(l))  { out.push(`<h2>${inline(l.slice(3))}</h2>`); i++; continue; }
      if (/^\s*[-*]\s/.test(l)) {                            /* ul */
        const buf = [];
        while (i < lines.length && /^\s*[-*]\s/.test(lines[i]))
          buf.push(`<li>${inline(lines[i++].replace(/^\s*[-*]\s/, ''))}</li>`);
        out.push(`<ul>${buf.join('')}</ul>`);
        continue;
      }
      if (/^\s*\d+\.\s/.test(l)) {                           /* ol */
        const buf = [];
        while (i < lines.length && /^\s*\d+\.\s/.test(lines[i]))
          buf.push(`<li>${inline(lines[i++].replace(/^\s*\d+\.\s/, ''))}</li>`);
        out.push(`<ol>${buf.join('')}</ol>`);
        continue;
      }
      if (!l.trim()) { i++; continue; }                      /* blank */
      const buf = [l];                                       /* paragraph */
      i++;
      while (i < lines.length && lines[i].trim() &&
             !/^(##|###|```|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i]))
        buf.push(lines[i++]);
      out.push(`<p>${inline(buf.join(' '))}</p>`);
    }
    return out.join('\n');
  }

  /* ============================================================
     Default articles — generic tutorials every team plugin
     needs, interpolating SITE_DATA so they read correctly for
     whichever plugin this site describes.
     ============================================================ */
  const fence = (cmds) => '```\n' + cmds.filter(Boolean).join('\n') + '\n```';

  function defaultSections() {
    const counts = D.counts || {
      skills:   (D.skills   || []).length,
      commands: (D.commands || []).length,
      agents:   (D.agents   || []).length,
    };
    const mktCmd = install.marketplaceStep && install.marketplaceStep.command;
    const stepCmds = (install.installSteps || [])
      .flatMap(s => s.commands || (s.command ? [s.command] : []));
    const firstSkill = (D.skills || [])[0];
    const integrations = D.integrations || [];
    const phases = (D.phases || []).map(p => typeof p === 'string' ? { id: p } : p);
    const commands = D.commands || [];

    /* -- Getting started -- */
    const gettingStarted = [
      '## What it is',
      `${dn} packages the team’s recurring work as **skills** — one per task — that Claude Code runs with the team’s own templates, reference material, and checklists. Describe what you need in plain language and the right skill loads.`,
    ];
    const inside = [];
    if (counts.skills)   inside.push(`- **${counts.skills} skill${counts.skills === 1 ? '' : 's'}** — one per task, organized by phase. The full catalog is on the [overview page](index.html).`);
    if (counts.commands) inside.push(`- **${counts.commands} command${counts.commands === 1 ? '' : 's'}** — typed shortcuts that run a whole workflow.`);
    if (counts.agents)   inside.push(`- **${counts.agents} agent${counts.agents === 1 ? '' : 's'}** — separate reviewers and helpers that skills can call.`);
    if (inside.length) gettingStarted.push('', '## What’s inside', ...inside);
    gettingStarted.push('',
      '## Where to go next',
      '- [Installing](#installing) — get the plugin into Claude Code in a few minutes.',
      '- [Your first command](#first-command) — what to run once it’s installed.',
      '- [How skills trigger](#how-skills-trigger) — why you rarely need a command at all.');

    /* -- Installing -- */
    const installing = ['## Add the marketplace'];
    installing.push(mktCmd
      ? 'From any Claude Code session:\n' + fence([mktCmd])
      : 'Your deployment guide has the marketplace location — add it with `/plugin marketplace add`.');
    installing.push('', '## Install the plugin');
    installing.push(stepCmds.length
      ? fence(stepCmds)
      : 'Install it from the marketplace with `/plugin install`.');
    installing.push('',
      '## Check it worked',
      `Run \`/plugin\` — ${dn} should be listed as installed.` +
      (firstCmd ? ` Then try [your first command](#first-command): \`${firstCmd}\`.` : ''));
    if (integrations.length) {
      installing.push('',
        '## Connections',
        `Some skills use connected tools (${integrations.map(i => i.name).join(', ')}). The first skill that touches one opens its sign-in flow — approve it once. The [install page](install.html) lists what each connection needs.`);
    }

    /* -- Your first command -- */
    const firstCommand = [];
    if (firstCmd) {
      firstCommand.push('## Start here', fence([firstCmd]),
        (install.firstCommand.description || 'It reads where things stand and tells you what runs next.'));
    } else {
      firstCommand.push('## Start here',
        'Open a Claude Code session in your team workspace and describe what you’re working on — the plugin takes it from there.');
    }
    firstCommand.push('',
      '## Or just talk to it',
      'Commands are shortcuts, not requirements. Describing the task in plain language works just as well — the plugin figures out which skill applies.',
      '',
      '## What to expect',
      '- The skill announces itself when it loads, so you always know what’s running.',
      '- Drafts come from the team’s own templates, not generic boilerplate.',
      '- Anything that leaves the team waits on your approval — you stay on the gate.');

    /* -- How skills trigger -- */
    const howSkills = [
      '## Skills load themselves',
      'Every skill declares what kind of task it handles. When your request matches, Claude Code loads that skill — with its template, reference data, and checklist — without you naming it.',
    ];
    if (firstSkill) {
      howSkills.push('', `Say what you need — “draft the ${(firstSkill.title || firstSkill.slug).toLowerCase()}” — and the matching skill (\`${firstSkill.slug}\`) loads with the right template and checklist.`);
    }
    if (phases.length) {
      howSkills.push('', '## Phases',
        'Skills are organized by the phases the team already works in:',
        ...phases.map(p => `- **${p.id}**${p.description ? ' — ' + p.description : ''}`));
    }
    if (commands.length) {
      howSkills.push('', '## Commands are the explicit path',
        'When you want a whole workflow rather than one task, run its command:',
        ...commands.map(c => `- \`/${c.name}\`${c.summary ? ' — ' + c.summary : ''}`));
    }
    howSkills.push('', '## When nothing triggers',
      'Be more specific: name the artifact you want (“the brief”, “the checklist”), mention the project, or fall back to the command for that phase.');

    /* -- Getting help -- */
    const gettingHelp = [
      '## Inside Claude Code',
      `- Ask directly: “what can the ${dn} plugin do?” — Claude lists the skills it has loaded.`,
      '- `/plugin` — check what’s installed, or reinstall.',
      '- `/mcp` — list connections and re-authenticate when an integration stops responding.',
      '- `/help` — Claude Code’s own help.',
      '',
      '## When a skill misbehaves',
      'Tell Claude what went wrong in the same session — “that used the wrong template” — and it will correct course. For repeat problems, note the skill name and what you asked for.',
      '',
      '## Who to contact',
      `The person who deployed ${dn} for your team maintains it — send feedback and requests their way so fixes make it into the next version.`,
    ];

    return [
      { title: 'Getting started', articles: [
        { id: 'getting-started', title: 'Getting started',
          lede: `${dn} is a Claude Code plugin built for your team — its recurring work packaged as skills Claude can run.`,
          videoPlaceholder: `${dn} in three minutes`,
          bodyMarkdown: gettingStarted.join('\n') },
        { id: 'installing', title: 'Installing',
          lede: 'Add the marketplace, install the plugin, and check it worked — a few minutes, once.',
          videoPlaceholder: 'Installing the plugin',
          bodyMarkdown: installing.join('\n') },
        { id: 'first-command', title: 'Your first command',
          lede: 'What to run in your first session, and what to expect when a skill takes over.',
          videoPlaceholder: 'Your first session',
          bodyMarkdown: firstCommand.join('\n') },
        { id: 'how-skills-trigger', title: 'How skills trigger',
          lede: 'Skills load automatically when a task calls for them — here’s how that works and what to do when it doesn’t.',
          videoPlaceholder: 'How skills trigger',
          bodyMarkdown: howSkills.join('\n') },
      ] },
      { title: 'Help', articles: [
        { id: 'getting-help', title: 'Getting help',
          lede: 'Where to look when something doesn’t work, and who to tell so it gets fixed.',
          videoPlaceholder: 'Getting help',
          bodyMarkdown: gettingHelp.join('\n') },
      ] },
    ];
  }

  /* ============================================================
     Router — sidebar, search, hash routing, prev/next.
     ============================================================ */
  function articleBody(a) {
    if (a.bodyHtml) return a.bodyHtml;
    if (a.bodyMarkdown) return mdToHtml(a.bodyMarkdown);
    return '';
  }

  function init() {
    const sideEl = $('#wiki-side-list');
    const artEl  = $('#wiki-article');
    if (!sideEl || !artEl) return;

    const sections = (D.wiki && Array.isArray(D.wiki.sections) && D.wiki.sections.length)
      ? D.wiki.sections
      : defaultSections();

    const flat = [];
    sections.forEach(sec => (sec.articles || []).forEach(a =>
      flat.push({ ...a, section: sec.title || '' })));
    if (!flat.length) {
      artEl.innerHTML = '<p class="muted" style="padding:24px 0">No tutorials yet.</p>';
      return;
    }
    const byId = Object.fromEntries(flat.map(a => [a.id, a]));

    function renderSide(activeId, filter) {
      const q = (filter || '').toLowerCase();
      sideEl.innerHTML = sections.map(sec => {
        const items = (sec.articles || []).filter(a =>
          !q || (a.title || '').toLowerCase().includes(q) ||
                (a.lede  || '').toLowerCase().includes(q));
        if (!items.length) return '';
        return `<div class="ws-h">${esc(sec.title || '')}</div>` + items.map(a =>
          `<a class="ws-item ${a.id === activeId ? 'active' : ''}" href="#${esc(a.id)}">${esc(a.title || a.id)}</a>`).join('');
      }).join('');
    }

    function renderArticle(id) {
      const a = byId[id] || flat[0];
      const i = flat.findIndex(x => x.id === a.id);
      const prev = flat[i - 1], next = flat[i + 1];
      /* VIDEO PLACEHOLDER — swap .video-ph for the real embed once
         the walkthrough video exists; videoPlaceholder is the caption. */
      const video = a.videoPlaceholder ? `
        <div class="art-video">
          <div class="video-ph">
            <span class="play"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5l13 7-13 7z"/></svg></span>
            <span class="t">${esc(a.videoPlaceholder)}</span>
            <span class="ph-badge">Video coming soon</span>
          </div>
        </div>` : '';
      artEl.innerHTML = `
        <div class="crumb">${esc(a.section)}</div>
        <h1>${esc(a.title || a.id)}</h1>
        ${a.lede ? `<p class="art-lede">${esc(a.lede)}</p>` : ''}
        ${video}
        <div class="prose">${articleBody(a)}</div>
        <div class="wiki-nav">
          ${prev ? `<a class="prev" href="#${esc(prev.id)}"><div class="dir">&larr; Previous</div><div class="ti">${esc(prev.title || prev.id)}</div></a>` : ''}
          ${next ? `<a class="next" href="#${esc(next.id)}"><div class="dir">Next &rarr;</div><div class="ti">${esc(next.title || next.id)}</div></a>` : ''}
        </div>`;
      renderSide(a.id, $('#wiki-search') ? $('#wiki-search').value : '');
      document.title = `${a.title || a.id} — ${dn} tutorials`;
      if (location.hash.slice(1) !== a.id) history.replaceState(null, '', '#' + a.id);
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
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

  document.addEventListener('DOMContentLoaded', init);
})();
