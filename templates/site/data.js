/* ============================================================
   SITE_DATA — the single data source for this site.

   GENERATED FILE: /fde-deploy regenerates this file from
   catalog.json on every deploy. Do not hand-edit — change
   catalog.json (or the deploy inputs) and re-run /fde-deploy.

   This template copy ships with fictional "Acme Launch Team"
   example content (mirrors templates/schemas/catalog.example.json)
   so the site renders out of the box.

   Contract — every array may be empty; pages tolerate it:

   window.SITE_DATA = {
     plugin: { name, displayName, version, tagline, howItWorks },
     counts: { skills, commands, agents },   // optional — computed
                                             // from the arrays if absent
     phases: [{ id, command|null, description }],
     lanes:  [{ id, label, description }],   // or plain strings
     skills: [{ slug, title, phase, lane, summary, vendor }],
             // vendor (optional): true when another plugin ships this
             // skill (matches catalog.json's boolean); a string names
             // that plugin. Either renders as a small tag.
     agents:   [{ name, kind, summary }],
     commands: [{ name, summary }],
     integrations: [{ name, kind, authNotes }],
     install: {
       marketplaceStep: { title, description, command },
       installSteps:    [{ title, description, commands: [..], note }],
       firstCommand:    { title, description, command },
     },
     wiki: { sections: [{ title, articles: [{ id, title, lede,
              videoPlaceholder, bodyMarkdown | bodyHtml }] }] }
             // empty sections → the generic default articles
             // in wiki.js render instead
   };
   ============================================================ */

window.SITE_DATA = {

  plugin: {
    name: 'acme-launch',
    displayName: 'Acme Launch',
    version: '0.1.0',
    tagline: 'Everything the Acme launch team does — briefs, plans, releases, retros — as skills Claude can run, working from the team’s own templates.',
    howItWorks: 'Describe the task in plain language and the right skill loads — with the team’s real template, reference data, and checklist for that job. Skills are organized by launch phase, phases can have typed commands, and /launch shows where the current launch stands and what runs next. Anything that leaves the team waits on your approval.',
  },

  /* counts omitted — computed from the arrays below */

  phases: [
    { id: 'Anytime',  command: null,
      description: 'Not tied to a phase — reusable helpers that load whenever a task calls for them.' },
    { id: 'Planning', command: null,
      description: 'Turn a kickoff into a brief, a plan, and owners.' },
    { id: 'Launch',   command: null,
      description: 'Run the launch itself — checklist, comms, go/no-go.' },
    { id: 'Wrap',     command: '/launch-wrap',
      description: 'Measure, report, and capture what the team learned.' },
  ],

  lanes: [
    { id: 'PM',    label: 'PM',    description: 'planning, coordination, logistics' },
    { id: 'Comms', label: 'Comms', description: 'messaging and external communications' },
  ],

  skills: [
    { slug: 'launch-brief', title: 'Launch Brief', phase: 'Planning', lane: 'PM',
      summary: 'Draft the canonical 5-section launch brief from a kickoff conversation or notes.' },
    { slug: 'press-release', title: 'Press Release', phase: 'Launch', lane: 'Comms',
      summary: 'Write a press release in Acme house style with required boilerplate and approval chain.' },
    { slug: 'launch-checklist', title: 'Launch Checklist', phase: 'Launch', lane: 'PM',
      summary: 'Run the T-minus launch checklist: owners, gates, go/no-go, day-of comms.' },
    { slug: 'interview', title: 'Interview', phase: 'Anytime',
      summary: 'Reusable elicitation: ask the user structured questions to fill gaps in any artifact.' },
    { slug: 'metrics-report', title: 'Metrics Report', phase: 'Wrap', lane: 'PM',
      summary: 'Pull launch metrics from the analytics MCP and produce the wrap report.' },
    { slug: 'retro', title: 'Retro', phase: 'Wrap',
      summary: 'Facilitate and write up the launch retro using the team’s template.' },
  ],

  agents: [
    { name: 'brand-review', kind: 'review agent',
      summary: 'Adversarial reviewer for Acme voice and brand rules.' },
  ],

  commands: [
    { name: 'launch',      summary: 'Router: show where this launch stands and what to run next.' },
    { name: 'launch-wrap', summary: 'Run the Wrap phase end to end.' },
  ],

  integrations: [
    { name: 'analytics', kind: 'mcp',
      authNotes: 'Team API token; each user signs in on first use. The metrics-report skill opens the sign-in flow the first time it runs.' },
  ],

  install: {
    marketplaceStep: {
      title: 'Add the marketplace',
      description: 'Point Claude Code at the Acme Launch marketplace — a shared path during the pilot, a git URL once it ships.',
      command: '/plugin marketplace add <path-or-git-url>',
    },
    installSteps: [
      {
        title: 'Install the plugin',
        description: 'One plugin — everything the launch team runs.',
        commands: ['/plugin install acme-launch@acme-launch'],
        note: 'Document skills (docx, xlsx, pptx, pdf) come from the standard Anthropic skills marketplace; the plugin composes them for every rendered document.',
      },
    ],
    firstCommand: {
      title: 'Run your first command',
      description: '/launch reads where the current launch stands and tells you what runs next. Skills load on their own from here — you rarely need to type a command at all.',
      command: '/launch',
    },
  },

  /* Empty → the generic default tutorials in wiki.js render.
     /fde-deploy fills this in (or customizes wiki.js) with
     team-specific articles. */
  wiki: { sections: [] },

};
