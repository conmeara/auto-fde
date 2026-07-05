/* ============================================================
   Creative Studio — wiki content
   Every tutorial / wiki article, rendered by app.js on
   tutorials.html. Plain data: sections → articles → HTML body.
   Body HTML uses the .prose conventions from styles.css.
   ============================================================ */

/* small helpers used while authoring (kept as functions so the
   article HTML stays readable) */
function _pill(name) { return '<span class="pill"><span class="sl">/</span>' + name + '</span>'; }
function _pills(names) { return '<div class="skills">' + names.map(_pill).join('') + '</div>'; }
function _prompt(text) {
  return '<div class="code" data-copy="' + text.replace(/"/g, '&quot;') + '">' +
    '<button class="copy">Copy</button><pre><span class="pr">&gt;</span> ' + text + '</pre></div>';
}
function _cmd(lines) {
  const copyText = lines.map(l => l.text).join('\n');
  const rows = lines.map(l =>
    (l.cmt ? '<span class="cmt"># ' + l.cmt + '</span>\n' : '') + l.html).join('\n');
  return '<div class="code" data-copy="' + copyText.replace(/"/g, '&quot;') + '">' +
    '<button class="copy">Copy</button><pre>' + rows + '</pre></div>';
}
const _tipIcon = '<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2a7 7 0 0 1 4 12.7c-.6.5-1 1.2-1 2V18h-6v-1.3c0-.8-.4-1.5-1-2A7 7 0 0 1 12 2z"/><path d="M9 21h6"/></svg>';
const _infoIcon = '<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>';
function _tip(html)  { return '<div class="callout tip">' + _tipIcon + '<div>' + html + '</div></div>'; }
function _info(html) { return '<div class="callout">' + _infoIcon + '<div>' + html + '</div></div>'; }

const WIKI = [

/* ============================================================ */
{ section: 'Getting started', articles: [

{ id: 'what-is-creative-studio', title: 'What is Creative Studio?',
  lede: 'A Claude Code plugin for the Creative Studio at Deloitte — the studio’s production process as skills Claude can run, working from the studio’s own templates.',
  video: 'Creative Studio in three minutes',
  body: `
<h2>What it is</h2>
<p>Creative Studio turns the studio’s production process — briefs, budgets, call sheets, cut reviews, delivery — into skills Claude can run, organized by the phases the studio already works in.</p>
<p>It ships as a Claude Code <b>plugin marketplace</b> with four plugins that work together:</p>
<ul>
  <li><b>creative-studio</b> — the studio itself: 41 skills, 6 commands, and 3 agents that cover the lifecycle from intake to wrap, drafting every document from the studio’s own real templates, on Deloitte brand.</li>
  <li><b>airtable</b> — the system of record: pipeline, staffing, project fields.</li>
  <li><b>frameio</b> — cut review, media, and the durable archive.</li>
  <li><b>figma</b> — design-to-code and design generation.</li>
</ul>

<h2>Skills-first, not role-agents</h2>
<p>There is no “producer bot” or “editor bot”. The plugin is a library of <b>composable skills — one per task</b> — and anyone can use any skill. A skill bundles the studio’s real template, the reference data, and the quality checklist for that one job: the creative brief, the call sheet, the casting breakdown, the delivery email.</p>
<p>Skills load automatically when the conversation calls for them. Describe what you need in plain language, and the right skill fires with the right template.</p>
${_pills(['creative-brief', 'call-sheet', 'frameio-review', 'delivery'])}

<h2>The human stays on the gate</h2>
<p>Every phase has approval gates that stay human: you approve the brief, the budget, the cut, and everything client-facing. Internal brand and risk approvals are <b>draft-and-route only</b> — the agent prepares the packet, a person signs off.</p>
${_tip('Start with <a href="#install">Install the plugin</a>, then watch a project move through the pipeline in <a href="#pipeline-overview">How the pipeline works</a>.')}
` },

{ id: 'install', title: 'Install the plugin',
  lede: 'Add the marketplace once, install the four plugins, and the whole production lifecycle is available in Claude Code.',
  video: 'Install & first run',
  body: `
<h2>1 · Add the marketplace</h2>
<p>From any Claude Code session, point it at the Creative Studio marketplace — a shared path while we pilot, a git URL once it ships:</p>
${_cmd([{ text: '/plugin marketplace add <path-or-git-url>', html: '<span class="kw">/plugin marketplace add</span> <span class="var">&lt;path-or-git-url&gt;</span>' }])}

<h2>2 · Install the four plugins</h2>
<p>The studio plugin plus the three connections it composes:</p>
${_cmd([
  { text: '/plugin install creative-studio@creative-studio', html: '<span class="kw">/plugin install</span> creative-studio@creative-studio' },
  { text: '/plugin install airtable@creative-studio',        html: '<span class="kw">/plugin install</span> airtable@creative-studio' },
  { text: '/plugin install figma@creative-studio',           html: '<span class="kw">/plugin install</span> figma@creative-studio' },
  { text: '/plugin install frameio@creative-studio',         html: '<span class="kw">/plugin install</span> frameio@creative-studio' },
])}
${_info('<b>Also needed:</b> the Anthropic document skills — <code>docx</code>, <code>xlsx</code>, <code>pptx</code>, <code>pdf</code>, <code>deloitte-brand</code>, <code>deloitte-pptx</code> — from the standard Anthropic skills marketplace. The studio skills compose them for every rendered document and deck.')}

<h2>3 · Open the control room</h2>
${_cmd([{ text: '/cs', html: '<span class="kw">/cs</span>' }])}
<p>That’s the whole install. <code>/cs</code> shows where each project sits and what runs next. Skills auto-load from here on — you rarely need to type a command at all.</p>
${_tip('Next: <a href="#connect-your-stack">connect Airtable, Figma & Frame.io</a> so the pipeline and the review loop light up.')}
` },

{ id: 'connect-your-stack', title: 'Connect Airtable, Figma & Frame.io',
  lede: 'The core works with no setup at all against your local OneDrive folder. Three sign-ins unlock the pipeline, design, and the review loop.',
  video: 'Connecting the integrations',
  body: `
<h2>What needs connecting</h2>
<table>
  <tr><th>Connection</th><th>What it unlocks</th><th>How</th></tr>
  <tr><td><b>Airtable</b></td><td>The pipeline & system of record — project records, staffing, stages</td><td>Hosted MCP (<code>mcp.airtable.com</code>) — sign in when prompted</td></tr>
  <tr><td><b>Figma</b></td><td>Design-to-code, design generation, tokens</td><td>Hosted MCP (<code>mcp.figma.com</code>) — sign in when prompted</td></tr>
  <tr><td><b>Frame.io</b></td><td>Cut review comments, media, the durable archive</td><td>Local MCP — add your Adobe / Frame.io token</td></tr>
  <tr><td><b>OneDrive (local)</b></td><td>Documents & the studio folder tree</td><td>Nothing — works out of the local synced folder</td></tr>
</table>

<h2>Signing in</h2>
<p>The first time a skill touches Airtable or Figma, Claude Code opens the sign-in flow for that MCP server. Approve it once and the connection persists. You can also trigger it any time:</p>
${_cmd([{ text: '/mcp', html: '<span class="kw">/mcp</span> <span class="cmt"># list connections & re-authenticate</span>' }])}

<h2>Frame.io token</h2>
<p>Frame.io runs as a local MCP server and needs an Adobe developer token. Add it once to your environment and the <b>frameio-review</b>, <b>delivery</b>, and <b>wrap-archive</b> skills can read comments, confirm finals, and archive.</p>
${_pills(['airtable-pipeline', 'frameio-review', 'figma-use'])}
${_info('<b>TPRM / DNET / Risk have no connection by design.</b> The agent drafts and routes the packet; the internal approval gate stays human.')}
` },

{ id: 'the-control-room', title: 'The /cs control room',
  lede: 'One command that reads the project’s state and tells you what runs next — the front door to the whole plugin.',
  video: 'Driving a project from /cs',
  body: `
<h2>What it does</h2>
<p>Type <code>/cs</code> in any session. The control room reads the Airtable pipeline (the source of truth for where every project sits), looks at the project folder, and reports:</p>
<ul>
  <li><b>Where the project is</b> — its phase, stage, and status in the pipeline.</li>
  <li><b>What exists</b> — brief, pricing, script, cuts, clearances.</li>
  <li><b>What runs next</b> — the skills that fire in this phase, and any gates waiting on you.</li>
</ul>
${_prompt('/cs — where is the Meridian brand film, and what do we owe the client this week?')}

<h2>The phase commands</h2>
<p>Each lifecycle phase also has its own command — a typed shortcut that loads that phase’s workflow and skills:</p>
<table>
  <tr><th>Command</th><th>Phase</th></tr>
  <tr><td><code>/cs-intake</code></td><td>New request → project record, pipeline entry, creative brief</td></tr>
  <tr><td><code>/cs-pre-production</code></td><td>Scope, price, schedule, and develop the creative</td></tr>
  <tr><td><code>/cs-production</code></td><td>Shoot-ready packet, call sheets, locations, clearances</td></tr>
  <tr><td><code>/cs-post-production</code></td><td>Assembly, edit chores, graphics, review, picture lock</td></tr>
  <tr><td><code>/cs-wrap</code></td><td>Deliver, archive, case study, awards</td></tr>
</table>
${_tip('You don’t have to remember any of these. Describing the work (“we just got a new request from Acme”) loads the right phase automatically — the commands are just faster when you already know where you are.')}
` },

{ id: 'how-skills-load', title: 'How skills auto-load',
  lede: 'You rarely type a command. Describe the task, and the right skill fires with the studio’s real template already open.',
  video: 'Skills loading by themselves',
  body: `
<h2>Description-triggered</h2>
<p>Every skill carries a description of when it should fire. Claude reads your message, matches it against the library, and loads the skill — its template, its reference data, its checklist — before answering. These all land on the right skill with no command:</p>
${_prompt('we just had the intake call with Acme — here’s the transcript, set the project up')}
${_prompt('build the call sheet for the Chicago shoot day')}
${_prompt('pull the client’s notes off the latest Frame.io cut into one list for the editor')}

<h2>Nudging a specific skill</h2>
<p>If you want a particular skill, name it — either in plain words (“use the casting skill”) or by its slug:</p>
${_prompt('use /storyboard to board the first 10 shots of the approved script')}

<h2>Skills compose</h2>
<p>Skills call each other. <b>creative-brief</b> invokes <b>interview</b> when facts are missing; <b>call-sheet</b> pulls crew from the Airtable skills; <b>case-study-qual</b> routes its output through the <b>brand-risk-review</b> agent. You ask for the outcome; the plumbing is the plugin’s job.</p>
${_pills(['interview', 'creative-brief', 'call-sheet', 'case-study-qual'])}
${_info('When a needed fact is genuinely missing — union vs. non-union, the deadline, the sign-off owner — the <b>interview</b> skill asks you targeted questions rather than guessing.')}
` },

]},

/* ============================================================ */
{ section: 'The pipeline', articles: [

{ id: 'pipeline-overview', title: 'How the pipeline works',
  lede: 'Five phases plus an Anytime lane, one spine: Airtable is the source of truth, the agent drafts at every step, a human approves at every gate.',
  video: 'A project’s journey, end to end',
  body: `
<h2>The five phases</h2>
<p>Every project moves <b>Intake → Pre-Production → Production → Post-Production → Wrap</b>, tracked as a record in the Airtable pipeline named <code>Client ~ Title ~ Stream of work</code>. Each phase has a command, a set of skills, and gates that stay human.</p>
<table>
  <tr><th>Phase</th><th>In</th><th>Out</th></tr>
  <tr><td><b>Intake</b></td><td>A call transcript, a returned input brief, or what’s in your head</td><td>Project record, pipeline entry, creative brief</td></tr>
  <tr><td><b>Pre-Production</b></td><td>The approved brief</td><td>Pricing + LOE, timeline, staffing, script, boards, shot list, casting</td></tr>
  <tr><td><b>Production</b></td><td>The locked script & shot list</td><td>The shoot-ready packet: call sheets, locations, props, clearances</td></tr>
  <tr><td><b>Post-Production</b></td><td>The footage & paper edit</td><td>Cuts through review to picture lock, graphics, cleared rights</td></tr>
  <tr><td><b>Wrap</b></td><td>The locked, approved film</td><td>Delivered finals, archive, retro, case study, awards entry</td></tr>
</table>

<h2>Two lanes in every phase</h2>
<ul>
  <li><b>Production management (PM)</b> — staffing, scheduling, budget, logistics, comms, wrap.</li>
  <li><b>Creative (CR)</b> — the making: brief, concepts, script, edit, motion, design.</li>
</ul>

<h2>The Anytime lane</h2>
<p>Some skills aren’t tied to a phase — they fire whenever needed: <b>emails</b>, <b>naming-conventions</b>, <b>project-setup</b>, <b>provenance-changelog</b>, <b>interview</b>, <b>feedback</b>.</p>
${_pills(['project-lifecycle', 'emails', 'naming-conventions', 'provenance-changelog'])}
${_tip('Every generated document carries a provenance changelog on page one — v0.1 → v1.0 with linked sources — so you can always trace where a draft came from.')}
` },

{ id: 'intake', title: 'Intake',
  lede: 'From “we just got a request” to a live project: a record in the pipeline, a scaffolded folder, and a creative brief ready for the client.',
  video: 'Intake, start to finish',
  body: `
<h2>What happens in Intake</h2>
<ol>
  <li><b>Capture the request.</b> Hand over the intake-call transcript, the returned Client Input Brief, or just answer questions — <b>intake-to-project</b> turns it into a structured summary.</li>
  <li><b>Create the project.</b> <b>airtable-pipeline</b> writes the record — <code>Client ~ Title ~ Stream of work</code>, WBS code, stage, dates, team — and <b>project-setup</b> scaffolds the studio folder tree seeded with blank templates.</li>
  <li><b>Draft the brief.</b> <b>creative-brief</b> writes the 6-section brief in the real studio template; once you approve it, the fields push to Airtable.</li>
</ol>
${_prompt('/cs-intake — here’s the transcript from today’s call with Northwind. Set up the project and draft the brief.')}

<h2>The skills</h2>
${_pills(['intake-to-project', 'airtable-pipeline', 'creative-brief', 'interview', 'project-setup'])}

<h2>The gate</h2>
<p>The brief goes to the client only after you approve it — and anything client-facing can first run the <b>brand-risk-review</b> agent for the Deloitte brand + risk check.</p>
${_tip('No transcript? Say “it’s all in my head” and the <b>interview</b> skill runs a from-scratch intake, asking only what it can’t find.')}
` },

{ id: 'pre-production', title: 'Pre-Production',
  lede: 'The heaviest phase: scope and price the job, schedule it, staff it, and develop the creative from concepts to a locked script and shot list.',
  video: 'Pre-production walkthrough',
  body: `
<h2>Scope & schedule (PM lane)</h2>
<ul>
  <li><b>pricing-model</b> builds the budget from staffing + hours in the real xlsx templates, then reconciles it.</li>
  <li><b>loe</b> assembles the Letter of Engagement from the brief + pricing and renders the PDF.</li>
  <li><b>timeline</b> generates the ~9-week schedule and the client-call cadence from the start date.</li>
  <li><b>staffing</b> reads Airtable availability and staffs the project with you.</li>
  <li><b>event-scope</b> handles live events — crew-days and a hard-dollar quote from the rate-card menu.</li>
  <li><b>nda</b> and <b>releases-clearances</b> prep the paperwork per shoot type.</li>
</ul>
${_pills(['pricing-model', 'loe', 'timeline', 'staffing', 'event-scope', 'nda', 'releases-clearances', 'voiceover-request'])}

<h2>Develop the creative (CR lane)</h2>
<ul>
  <li><b>creative-session</b> brainstorms a wide range of concepts and shapes the winners into a concept deck.</li>
  <li><b>script</b> drafts into the studio’s 3-column script template from whatever exists.</li>
  <li><b>storyboard</b> boards the script, generating frames via the image API.</li>
  <li><b>shot-list</b> breaks the locked script into the shot-by-shot AV script.</li>
  <li><b>casting</b> builds the breakdown for the agencies and the client-facing options deck.</li>
  <li><b>deck</b> keeps the project’s single visual source of truth — kickoff, concept, or status — as PowerPoint or HTML.</li>
</ul>
${_pills(['creative-session', 'script', 'storyboard', 'shot-list', 'casting', 'deck'])}
${_prompt('/cs-pre-production — the brief is approved. Price it for a 2-day shoot, draft the timeline, and get me a first script pass.')}

<h2>The gates</h2>
<p>You approve the price, the LOE, the concept, and the locked script. The <b>qa-review</b> agent can check any artifact before it goes to the client.</p>
` },

{ id: 'production', title: 'Production',
  lede: 'Everything the shoot day needs, packaged: call sheets, locations, props, clearances, and — for live events — the run of show.',
  video: 'Building the shoot-ready packet',
  body: `
<h2>The shoot-ready packet</h2>
<p><b>production-packet</b> is the umbrella: it packages call sheets, the shooting schedule, the shot list / AV script, and releases & clearances into one bundle the crew can shoot from.</p>
<ul>
  <li><b>call-sheet</b> builds the call sheet + shooting schedule (xlsx, one tab per filming day) from the shot list and the Airtable crew — and drafts the distribution email.</li>
  <li><b>location-scout</b> researches and shortlists locations from the script’s needs, with permit notes.</li>
  <li><b>prop-sourcing</b> pulls the prop & wardrobe list from the script and sources it.</li>
  <li><b>clearance-sheet</b> keeps the shot-by-shot rights ledger — every location, on-camera person, and third-party asset against the release that clears it.</li>
  <li><b>drone-flight-checklist</b> fills the per-flight FAA / Part 107 checklist — permits five days out, insurance 48 hours.</li>
  <li><b>run-of-show</b> sequences a live event minute-by-minute.</li>
</ul>
${_pills(['production-packet', 'call-sheet', 'location-scout', 'prop-sourcing', 'clearance-sheet', 'drone-flight-checklist', 'run-of-show'])}
${_prompt('/cs-production — shot list is locked. Build the call sheet for Friday with the crew from Airtable, and start the clearance sheet.')}
${_tip('Aerial coverage on the schedule? The drone checklist has hard lead-time gates — permits need five days, insurance 48 hours. Run it early, not the night before.')}
` },

{ id: 'post-production', title: 'Post-Production',
  lede: 'From first assembly to picture lock: the edit assisted, the graphics specced, and every client comment collated into one revision doc.',
  video: 'The edit & review loop',
  body: `
<h2>Cut</h2>
<ul>
  <li><b>first-assembly</b> stitches the rough cut: it maps the 3-column script’s paper edit to interview clips and timecodes, lays the Premiere sequence to the studio track map, exports a CMX3600 EDL, and drafts the Frame.io review email.</li>
  <li><b>premiere-assist</b> sets the Premiere project to studio spec and runs edit chores via ExtendScript — local only, nothing leaves the machine.</li>
</ul>
${_pills(['first-assembly', 'premiere-assist'])}

<h2>Review</h2>
<ul>
  <li><b>frameio-review</b> pulls every comment and reply off the Frame.io cut into one prioritized, timecode-sorted revision doc — timestamp → note → priority → status — that the editor works top to bottom.</li>
  <li><b>emails</b> drafts the iteration-aware cut-review recaps to the client.</li>
</ul>
${_prompt('consolidate the Frame.io notes on Rough Cut 2 into a revision list for the editor')}

<h2>Graphics & design</h2>
<ul>
  <li><b>graphics-rundown</b> builds the per-asset motion cue sheet from the locked edit + script — the video-to-MoGFX handoff.</li>
  <li>The <b>Figma plugin</b> skills handle design work: pull a selection into code, generate a design from the brief, connect components.</li>
</ul>
${_pills(['graphics-rundown', 'figma-use', 'figma-generate-design'])}

<h2>The gate: picture lock</h2>
<p><b>picture-lock-check</b> runs the checklist and confirms every shot in the cut is cleared before sign-off. Nothing ships past this gate unless the clearance sheet says so.</p>
${_pills(['frameio-review', 'picture-lock-check'])}
` },

{ id: 'wrap', title: 'Wrap',
  lede: 'Deliver the finals, close the project cleanly, and mine it: the archive, the retro, the case study, and the awards entry.',
  video: 'Delivery, archive & the case study',
  body: `
<h2>Deliver</h2>
<p><b>delivery</b> runs the last mile: picks the export spec per use, confirms the legal end-card and sonic identity are on the cut, runs the final QA, confirms the finals are on Frame.io at the right specs, drafts the client delivery email with the link and licenses, and marks the project <b>Delivered</b> in Airtable.</p>
${_prompt('/cs-wrap — the cut is approved. Run final delivery for web + social and draft the client email.')}

<h2>Archive & close</h2>
<p><b>wrap-archive</b> handles the close-out after the client is notified: the archive backup to Frame.io (the durable archive), reconnect-verify, EDL export, license filing, the trackers, the archive manifest, and the retro.</p>

<h2>Mine the project</h2>
<ul>
  <li><b>case-study-qual</b> drafts the dual-format qual — the one-slide submission format and the three-slide orals format — from the finished project, routed through brand & risk review.</li>
  <li><b>awards-tracker</b> logs the piece as an awards-submission record: maker, award, category, entry fee, PPMD approval, and the gated Frame.io screener link.</li>
</ul>
${_pills(['delivery', 'wrap-archive', 'case-study-qual', 'awards-tracker'])}
${_tip('Wrap is where the next project gets easier: the archive, the retro, and the qual all feed the studio’s knowledge base.')}
` },

]},

/* ============================================================ */
{ section: 'Everyday workflows', articles: [

{ id: 'transcript-to-project', title: 'From call transcript to live project',
  lede: 'The single highest-leverage workflow in the plugin: paste a transcript, get a tracked project with a scaffolded folder.',
  video: 'Transcript → Airtable project',
  body: `
<h2>What you need</h2>
<p>Any of: the recorded intake-call transcript (Zoom/Teams), a returned Client Input Brief, an email thread — or nothing at all, in which case the <b>interview</b> skill draws the project out of your head.</p>

<h2>Run it</h2>
${_prompt('new project — here’s the intake transcript from this morning’s call with Harbor Health. Set it up.')}
<p>The plugin will:</p>
<ol>
  <li>Summarize the intake — client, ask, deliverables, dates, budget signals, stakeholders.</li>
  <li>Ask you only for what’s missing (via <b>interview</b>).</li>
  <li>Create the Airtable record — <code>Client ~ Title ~ Stream of work</code>, WBS, stage <b>Intake</b>.</li>
  <li>Scaffold the VIDEO / DOCUMENT / PRINT folder tree seeded with the real blank templates.</li>
</ol>

<h2>Check it landed</h2>
${_prompt('show me the pipeline — what stage is Harbor Health in?')}
${_pills(['intake-to-project', 'airtable-pipeline', 'project-setup', 'interview'])}
` },

{ id: 'writing-the-brief', title: 'Draft the creative brief',
  lede: 'The 6-section brief in the studio’s real template, drafted from the intake — then shaped and approved by you.',
  video: 'Drafting the creative brief',
  body: `
<h2>The six sections</h2>
<p><b>Project Details · Purpose · Audience · Deliverables · Expected Usage · Creative Approach</b> — the studio’s own template, as a .docx, with the provenance changelog on page one.</p>

<h2>Run it</h2>
${_prompt('draft the creative brief for Harbor Health from the intake summary')}
<p>The draft pulls from the intake record and anything in the project folder. Where the source material doesn’t answer a section, the skill asks — it doesn’t invent the audience or the budget.</p>

<h2>Shape, approve, push</h2>
<p>Edit in conversation (“tighten the purpose, the audience is clinicians not patients”). When you approve, the brief’s fields push to the project’s Airtable record so the pipeline reflects the scope.</p>
${_pills(['creative-brief', 'interview', 'research'])}
${_tip('Thin on background? Ask the <b>research</b> agent first — “get me background on Harbor Health and the home-care market” — and the brief drafts from sourced material.')}
` },

{ id: 'pricing-and-loe', title: 'Price the job & assemble the LOE',
  lede: 'The budget built from staffing and hours in the real spreadsheets, reconciled, then flowed into the Letter of Engagement.',
  video: 'Pricing model → LOE',
  body: `
<h2>Build the pricing model</h2>
${_prompt('price the Harbor Health film — 2 shoot days, 3 weeks of post, the usual crew')}
<p><b>pricing-model</b> works in the studio’s real xlsx templates: staffing rows by level, hours per phase, and a reconciliation pass so the totals actually tie. <b>staffing</b> feeds it live availability from Airtable.</p>

<h2>Live events</h2>
<p>For conference films and event coverage, <b>event-scope</b> prices in crew-<b>days</b> from the rate-card menu instead — then hands the result to the formal scope artifact.</p>

<h2>Assemble the LOE</h2>
${_prompt('assemble the LOE from the brief and the pricing model, and render the PDF')}
<p><b>loe</b> fills the Word template from the brief + pricing, renders a PDF, and drafts the cover email. You review the numbers; nothing goes to the client without your gate.</p>
${_pills(['pricing-model', 'staffing', 'event-scope', 'loe', 'emails'])}
` },

{ id: 'script-to-shot-list', title: 'Script → storyboard → shot list',
  lede: 'The creative development chain: a 3-column script, boards generated from it, and the shot-by-shot AV script for the production plan.',
  video: 'Developing the creative',
  body: `
<h2>1 · Draft the script</h2>
${_prompt('draft a 90-second script for the Harbor Health film from the brief and the concept deck')}
<p><b>script</b> works in the studio’s 3-column template — visuals, audio/VO, graphics — from whatever exists: transcript, brief, notes, or a concept from <b>creative-session</b>.</p>

<h2>2 · Board it</h2>
${_prompt('storyboard the approved script — key frames only')}
<p><b>storyboard</b> generates frames via the image API, one per beat, laid into the studio board template.</p>

<h2>3 · Break it down</h2>
${_prompt('break the locked script into the shot list')}
<p><b>shot-list</b> produces the shot-by-shot AV script the production plan builds on — and it feeds <b>call-sheet</b>, <b>location-scout</b>, and <b>prop-sourcing</b> directly.</p>
${_pills(['creative-session', 'script', 'storyboard', 'shot-list'])}
${_info('Casting runs in parallel once the script locks: <b>casting</b> builds the breakdown for the agencies and the client-facing options deck; <b>voiceover-request</b> preps the voices.com brief.')}
` },

{ id: 'building-the-call-sheet', title: 'Build the call sheet',
  lede: 'The call sheet and shooting schedule as an xlsx — one tab per filming day — from the shot list and the crew in Airtable.',
  video: 'Call sheet in five minutes',
  body: `
<h2>Run it</h2>
${_prompt('build the call sheet for the Friday shoot — crew from Airtable, first call 7am, sunset exterior last')}
<p><b>call-sheet</b> assembles:</p>
<ul>
  <li><b>Call times</b> per department and per person, pulled from the Airtable crew record.</li>
  <li><b>The shooting schedule</b> — the stripboard: shots sequenced into the day with company moves.</li>
  <li><b>Cast & crew contacts</b>, location details, nearest hospital, weather.</li>
</ul>
<p>One tab per filming day, in the studio template.</p>

<h2>Distribute it</h2>
${_prompt('draft the call-sheet email to cast & crew')}
<p>The distribution email comes from the studio’s template library, with the call sheet attached and the key times in the body.</p>
${_pills(['call-sheet', 'shot-list', 'staffing', 'emails'])}
${_tip('Changes late the night before? Re-run with the change (“camera call moves to 8”) — the sheet regenerates and the email drafts as a revision notice.')}
` },

{ id: 'frameio-notes', title: 'Turn Frame.io comments into a revision doc',
  lede: 'Every comment and reply on a cut — collated, deduplicated, timecode-sorted, and prioritized so the editor works top to bottom.',
  video: 'Frame.io → revision doc',
  body: `
<h2>Run it</h2>
${_prompt('pull the notes off Rough Cut 2 on Frame.io into a revision doc')}
<p><b>frameio-review</b> reads the file (or the whole version stack) and produces one doc: <b>timestamp → note → priority → status</b>. Duplicates merge, contradictions get flagged for you to resolve, and client notes are separated from internal ones.</p>

<h2>Version over version</h2>
${_prompt('what changed since Rough Cut 1 — which notes are addressed and which are still open?')}
<p>Because the doc carries status, each review cycle starts from the previous one — the editor sees what’s new, what’s done, and what’s still open.</p>

<h2>Close the loop with the client</h2>
${_prompt('draft the cut-review recap email for v2 — what we changed, what we pushed back on')}
${_pills(['frameio-review', 'emails', 'picture-lock-check'])}
` },

{ id: 'final-delivery', title: 'Run the final delivery',
  lede: 'The last mile: right export specs per use, the legal end-card confirmed, final QA, Frame.io links, and the delivery email.',
  video: 'Final delivery, gate by gate',
  body: `
<h2>Run it</h2>
${_prompt('run final delivery for the Harbor Health film — web, social cutdowns, and the internal screener')}
<p><b>delivery</b> walks the checklist:</p>
<ol>
  <li><b>Export matrix</b> — the right codec / resolution per use (web, social, broadcast, screener).</li>
  <li><b>Legal & brand</b> — the end-card and sonic identity are on the cut.</li>
  <li><b>Final QA</b> — a last pass before anything goes out.</li>
  <li><b>Frame.io</b> — finals confirmed at spec, in the right project folder.</li>
  <li><b>The email</b> — the client delivery note with the Frame.io link and licenses.</li>
  <li><b>Airtable</b> — the project marked <b>Delivered</b>.</li>
</ol>

<h2>Then close it out</h2>
<p>After the client is notified, <b>wrap-archive</b> takes over: archive backup, reconnect-verify, EDL export, license filing, the trackers, the archive manifest, and the retro.</p>
${_pills(['delivery', 'picture-lock-check', 'wrap-archive'])}
${_info('Delivery won’t pass its own gate if the clearance sheet has open items — rights first, links second.')}
` },

{ id: 'case-study-awards', title: 'Capture the case study & awards',
  lede: 'Every wrapped project becomes ammunition: the dual-format qual for pitches, and the awards-tracker record for entries.',
  video: 'From wrap to qual',
  body: `
<h2>The qual</h2>
${_prompt('write the qual for the Harbor Health film — we need it for the Q3 proposals')}
<p><b>case-study-qual</b> drafts both formats from one source file:</p>
<ul>
  <li><b>Submission format</b> — one slide, for email and proposals.</li>
  <li><b>Presentation format</b> — three slides, for orals.</li>
</ul>
<p>Built on the Sales Narrative framework — client as hero, connected experience, topline and bottom-line outcomes — rendered on-brand as .pptx, and routed through <b>brand-risk-review</b> before it’s client-facing. Ask for a <b>blinded</b> version and the client identifiers come out.</p>

<h2>The awards record</h2>
${_prompt('add the film to the awards tracker — we’re thinking Tellys, branded content')}
<p><b>awards-tracker</b> logs the submission record in the xlsx: maker, award, category, entry fee, PPMD approval, and the gated Frame.io screener link + password — everything the awards portal will ask for.</p>
${_pills(['case-study-qual', 'awards-tracker', 'brand-risk-review'])}
` },

]},

/* ============================================================ */
{ section: 'Integrations', articles: [

{ id: 'airtable-integration', title: 'Airtable — the system of record',
  lede: 'The pipeline lives in Airtable. Every skill that tracks, staffs, or advances a project reads and writes it there.',
  video: 'The pipeline in Airtable',
  body: `
<h2>What lives there</h2>
<ul>
  <li><b>The pipeline</b> — one record per project: <code>Client ~ Title ~ Stream of work</code>, WBS code, stage, status, dates, hours, team.</li>
  <li><b>Staffing</b> — who’s available, at what level, on what dates.</li>
  <li><b>The lifecycle state</b> — the source of truth <b>project-lifecycle</b> and <code>/cs</code> read to know what runs next.</li>
</ul>

<h2>How it connects</h2>
<p>The <b>airtable</b> plugin in the marketplace wires the hosted Airtable MCP (<code>mcp.airtable.com</code>) plus the studio’s Airtable skills. Sign in once when prompted.</p>

<h2>Things to ask</h2>
${_prompt('show a board of all active projects and their stages')}
${_prompt('advance Harbor Health to Post-Production')}
${_prompt('what’s blocked in the pipeline right now?')}
${_pills(['airtable-pipeline', 'project-lifecycle', 'staffing', 'intake-to-project'])}
` },

{ id: 'frameio-integration', title: 'Frame.io — review, media & archive',
  lede: 'Where cuts get reviewed, media lives, finals are delivered, and wrapped projects are durably archived.',
  video: 'Frame.io in the loop',
  body: `
<h2>What it powers</h2>
<ul>
  <li><b>The review loop</b> — <b>frameio-review</b> pulls every comment and reply into the prioritized revision doc.</li>
  <li><b>Delivery</b> — <b>delivery</b> confirms the finals are up at spec and links the client to them.</li>
  <li><b>The archive</b> — <b>wrap-archive</b> makes Frame.io the durable home of the finished project.</li>
  <li><b>Screeners</b> — <b>awards-tracker</b> stores the gated screener link + password per entry.</li>
</ul>

<h2>How it connects</h2>
<p>The <b>frameio</b> plugin runs a local MCP server (Node) against the Frame.io V4 API with your Adobe token. It reads comments, files, and folders, and uploads finals.</p>
${_prompt('list the comments on the latest version of the Harbor Health cut')}
${_pills(['frameio-review', 'delivery', 'wrap-archive', 'awards-tracker'])}
` },

{ id: 'figma-integration', title: 'Figma — design, driven from the brief',
  lede: 'The official Figma plugin rides along in the marketplace: generate designs, pull selections into code, connect components.',
  video: 'Brief → Figma → code',
  body: `
<h2>What it adds</h2>
<p>Creative Studio doesn’t rebuild Figma skills — it composes the official Figma plugin, which ships four skills into the same library:</p>
<ul>
  <li><b>figma-generate-design</b> — generate a Figma design from a prompt or reference (say, straight from the creative brief).</li>
  <li><b>figma-use</b> — pull design context, variables / tokens, and screenshots from a selection and turn it into code.</li>
  <li><b>figma-code-connect</b> — map components to code.</li>
  <li><b>figma-create-new-file</b> — start a fresh file.</li>
</ul>

<h2>How it connects</h2>
<p>Hosted Figma MCP (<code>mcp.figma.com</code>) — sign in once when prompted.</p>
${_prompt('generate a Figma concept frame for the campaign landing page from the approved brief')}
${_pills(['figma-generate-design', 'figma-use', 'figma-code-connect', 'figma-create-new-file'])}
` },

{ id: 'document-skills', title: 'Documents & decks',
  lede: 'Everything rendered — briefs, LOEs, call sheets, decks, quals — composes the Anthropic document skills, on Deloitte brand.',
  video: 'How documents get made',
  body: `
<h2>The stack</h2>
<table>
  <tr><th>Skill</th><th>Used for</th></tr>
  <tr><td><code>docx</code> / <code>pdf</code></td><td>Briefs, LOEs, NDAs, emails-as-docs, memos</td></tr>
  <tr><td><code>xlsx</code></td><td>Pricing models, call sheets, clearance sheets, trackers</td></tr>
  <tr><td><code>pptx</code> / <code>deloitte-pptx</code></td><td>Decks, casting options, graphics rundowns, quals</td></tr>
  <tr><td><code>deloitte-brand</code></td><td>The voice, colors, and typography on everything</td></tr>
</table>
<p>These come from the standard Anthropic skills marketplace and must be installed alongside Creative Studio (see <a href="#install">Install</a>).</p>

<h2>The templates are real</h2>
<p>The studio skills don’t re-imagine documents from memory — each bundles the studio’s own scrubbed template and opens it, so the output is the file your team already recognizes: the same 6-section brief, the same call-sheet tabs, the same qual slides.</p>
${_info('Every document gets a provenance changelog on page one via <b>provenance-changelog</b> — version, date, sources.')}
` },

]},

/* ============================================================ */
{ section: 'Agents & review', articles: [

{ id: 'agents-overview', title: 'The three agents',
  lede: 'A producing skill never reviews its own work. Separate reviewer and researcher agents run in their own context, across the whole pipeline.',
  video: 'Agents in action',
  body: `
<h2>qa-review</h2>
<p>Quality-checks any artifact before it moves — a script, a paper edit, a deck, a brief, a call sheet, an LOE. Returns structured, prioritized feedback: <b>blocking issues → should-fix → nits</b>. It critiques; it doesn’t rewrite.</p>
${_prompt('QA the Acme shot list before I send it to the DP')}

<h2>brand-risk-review</h2>
<p>The combined Deloitte / client <b>brand</b> check and <b>risk / compliance</b> review, plus the submission packet for the human reviewers. Run it before anything goes external — decks, cuts, quals, posts.</p>
${_prompt('before this goes to the client, make sure the deck is on brand and won’t get flagged by risk')}

<h2>research</h2>
<p>Researches a client, topic, industry, or market to feed a brief, script, concept, or case study — web + the studio knowledge base — and returns a sourced synthesis, not a link dump.</p>
${_prompt('we’re pitching a sustainability film for a regional bank — get me background on them and the space')}

<h2>Why separate agents?</h2>
<p>Reviews run in a separate context so the reviewer isn’t grading its own homework. The skills draft; the agents check; you decide.</p>
${_info('The final gates stay human by design — brand-risk-review <b>prepares</b> the packet for TPRM / OGC; it never approves.')}
` },

]},

/* ============================================================ */
{ section: 'Help', articles: [

{ id: 'faq', title: 'FAQ & troubleshooting',
  lede: 'Quick answers to the questions the pilot team actually asks.',
  video: null,
  body: `
<h2>A skill didn’t fire — it just answered generically</h2>
<p>Name it: “use the <b>call-sheet</b> skill”. If it still misses, the phase command (<code>/cs-production</code>) loads the whole phase’s workflow, which routes to the right skill.</p>

<h2>Airtable / Figma asks me to sign in again</h2>
<p>Tokens expire. Run <code>/mcp</code> in an interactive session and re-authenticate the connection. Frame.io uses a local token — check it’s still set in your environment.</p>

<h2>Where do generated files go?</h2>
<p>Into the project’s folder tree in your local OneDrive-synced folder — <b>project-setup</b> scaffolds VIDEO / DOCUMENT / PRINT and the skills file into the right slot. <b>naming-conventions</b> keeps names link-safe for Airtable and SharePoint.</p>

<h2>Can it approve brand / risk / TPRM for me?</h2>
<p>No — by design. The agent drafts and routes the packet; the internal approval gate is always a person.</p>

<h2>The output doesn’t match our template</h2>
<p>That’s a bug worth reporting — the skills are supposed to open the studio’s real templates, not improvise. Use the <b>feedback</b> skill (see <a href="#give-feedback">Give feedback</a>) so the team can fix the template binding.</p>

<h2>Does it work outside Claude Code?</h2>
<p>Creative Studio is built as a Claude Code plugin — skills, commands, agents, and MCP connections are Claude Code concepts. The desktop app, CLI, and IDE extensions all work.</p>
${_pills(['project-setup', 'naming-conventions', 'feedback'])}
` },

{ id: 'give-feedback', title: 'Give feedback on the plugin',
  lede: 'Found a broken template, a missing field, a skill that fired wrong — or something that worked great? Send it to the team without leaving your session.',
  video: 'Filing feedback in 60 seconds',
  body: `
<h2>Run it</h2>
${_prompt('give feedback — the call sheet template is missing the weather row our team uses')}
<p>The <b>feedback</b> skill spins up a separate sub-agent so your current session and context stay clean. It packages your note plus the relevant session evidence, <b>strips all PII and client-confidential material</b>, and writes a redacted markdown report to the OneDrive feedback folder (or your Desktop as a fallback).</p>

<h2>What to report</h2>
<ul>
  <li>Template drift — the output doesn’t match the studio’s real document.</li>
  <li>Wrong routing — a skill fired when it shouldn’t have (or didn’t when it should).</li>
  <li>Missing coverage — a task the studio does that has no skill yet.</li>
  <li>Praise — knowing what works shapes the roadmap too.</li>
</ul>
${_pills(['feedback'])}
${_info('Feedback here is about the <b>plugin</b>. Client notes on a cut belong in Frame.io (see <a href="#frameio-notes">the review workflow</a>); a project retro is a wrap deliverable.')}
` },

]},

];
