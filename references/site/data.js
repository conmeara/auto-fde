/* ============================================================
   Creative Studio — shared data
   The skills catalog (mirrors SKILLS_LOCAL in spec/review.html),
   the phases, and the agents. Rendered by app.js.
   ============================================================ */

/* ---- phases (the lifecycle) ---- */
const PHASES = [
  { id: 'Anytime', cmd: null,
    desc: 'Not tied to a phase — these load whenever a task calls for them: naming, folders, emails, provenance, feedback.' },
  { id: 'Intake', cmd: '/cs-intake',
    desc: 'Turn a new request into a project record, a pipeline entry, and a creative brief.' },
  { id: 'Pre-Production', cmd: '/cs-pre-production',
    desc: 'Scope, price, schedule, and develop the creative — script, storyboard, shot list, casting, VO, deck.' },
  { id: 'Production', cmd: '/cs-production',
    desc: 'Assemble the shoot-ready packet — call sheets, locations, props, clearances, and run-of-show.' },
  { id: 'Post-Production', cmd: '/cs-post-production',
    desc: 'First assembly, edit chores, graphics, Frame.io review, and the picture-lock check.' },
  { id: 'Wrap', cmd: '/cs-wrap',
    desc: 'Deliver finals, archive the project, and capture the case study and awards.' },
];

/* ---- the skills catalog (mirrors SKILLS_LOCAL in spec/review.html) ----
   phase · lane (PM = production management, CR = creative) ·
   src = ships in another plugin of the marketplace. ---- */
const SKILLS = [
  // Anytime
  { name: 'project-lifecycle',     phase: 'Anytime', lane: 'PM', desc: 'Tracks where a project sits across the phases (Airtable is the source of truth) and tells the other skills what runs next.' },
  { name: 'naming-conventions',    phase: 'Anytime', lane: 'PM', desc: 'Renames files & folders to the studio pattern and flags ones that break Airtable / SharePoint links.' },
  { name: 'provenance-changelog',  phase: 'Anytime', lane: 'PM', desc: 'Stamps a v0.1 → v0.2 → v1.0 changelog with linked sources on page one of every doc.' },
  { name: 'project-setup',         phase: 'Anytime', lane: 'PM', desc: 'Builds the VIDEO / DOCUMENT / PRINT folder tree and seeds it with the real blank templates, ready to edit.' },
  { name: 'emails',                phase: 'Anytime', lane: 'PM', desc: 'Drafts any client email — recap, status, scope change, cut-review — from the real studio email templates.' },
  { name: 'software-business-case',phase: 'Anytime', lane: 'PM', desc: 'Drafts the tool / license procurement case in the business-case Word template from a short prompt.' },
  { name: 'interview',             phase: 'Anytime', lane: 'PM', desc: 'Interviews the user to fill gaps Claude cannot find — intake from scratch, or targeted questions for any other skill.' },
  { name: 'feedback',              phase: 'Anytime', lane: 'PM', desc: 'Captures plugin feedback in a subagent, strips PII, and writes it to OneDrive (or the Desktop) for the team.' },
  // Intake
  { name: 'intake-to-project',     phase: 'Intake', lane: 'PM', desc: 'Turns intake (a transcript, or a from-scratch interview) into a summary and the Airtable project record.' },
  { name: 'airtable-pipeline',     phase: 'Intake', lane: 'PM', desc: 'Gets the project into the Airtable pipeline so the team can track and advance it.' },
  { name: 'creative-brief',        phase: 'Intake', lane: 'CR', desc: 'Drafts the 6-section creative brief in the studio template, then pushes the fields to Airtable on approval.' },
  // Pre-Production
  { name: 'pricing-model',         phase: 'Pre-Production', lane: 'PM', desc: 'Builds the budget from the staffing + hours in the real xlsx templates, then reconciles it.' },
  { name: 'loe',                   phase: 'Pre-Production', lane: 'PM', desc: 'Assembles the Letter of Engagement in the Word template from the brief + pricing and renders a PDF.' },
  { name: 'timeline',              phase: 'Pre-Production', lane: 'PM', desc: 'Generates the ~9-week schedule + client-call cadence from the start date and the format.' },
  { name: 'staffing',              phase: 'Pre-Production', lane: 'PM', desc: 'Reads Airtable availability and staffs the project in Airtable, working with the user on fits — feeds pricing-model.' },
  { name: 'casting',               phase: 'Pre-Production', lane: 'CR', desc: 'Builds the casting breakdown from the script and a client-facing options deck with headshots.' },
  { name: 'voiceover-request',     phase: 'Pre-Production', lane: 'PM', desc: 'Fills the VO brief from the script and preps the voices.com request as an email or Word doc.' },
  { name: 'releases-clearances',   phase: 'Pre-Production', lane: 'PM', desc: 'Picks the right release / NDA template per shoot type and auto-fills the deal terms.' },
  { name: 'event-scope',           phase: 'Pre-Production', lane: 'PM', desc: 'Scopes a live event into crew hours and a quote from the rate-card menu.' },
  { name: 'nda',                   phase: 'Pre-Production', lane: 'PM', desc: 'Fills the NDA Word template with the client + date (docx by default) and routes it for signature.' },
  { name: 'deck',                  phase: 'Pre-Production', lane: 'CR', desc: 'The project’s single visual source of truth — one structure, rendered as PowerPoint or HTML (kickoff / concept / status).' },
  { name: 'script',                phase: 'Pre-Production', lane: 'CR', desc: 'Drafts a script from whatever is available (transcript, brief, notes) into the studio 3-column script template.' },
  { name: 'creative-session',      phase: 'Pre-Production', lane: 'CR', desc: 'Brainstorms a wide range of concepts from the intake / brief and shapes the best into a concept deck or HTML.' },
  { name: 'storyboard',            phase: 'Pre-Production', lane: 'CR', desc: 'Creates the storyboard from the script / shot list, generating frames via the Gemini image API.' },
  { name: 'shot-list',             phase: 'Pre-Production', lane: 'CR', desc: 'Breaks the locked script into a shot-by-shot AV script (from the template) for the production plan.' },
  // Production
  { name: 'production-packet',     phase: 'Production', lane: 'PM', desc: 'Packages call sheets, schedule, shot list / AV script, releases & clearances into one shoot-ready bundle.' },
  { name: 'call-sheet',            phase: 'Production', lane: 'PM', desc: 'Builds the call sheet + shooting schedule (xlsx) from the shot list and the Airtable crew.' },
  { name: 'location-scout',        phase: 'Production', lane: 'PM', desc: 'Researches and shortlists shoot locations from the script needs, with permit notes.' },
  { name: 'prop-sourcing',         phase: 'Production', lane: 'PM', desc: 'Pulls the prop & wardrobe list from the script and finds / sources what is needed.' },
  { name: 'clearance-sheet',       phase: 'Production', lane: 'PM', desc: 'Tracks rights & clearances — locations, talent contracts, third-party assets — so the production is cleared.' },
  { name: 'drone-flight-checklist',phase: 'Production', lane: 'PM', desc: 'Fills the per-flight UAS / FAA safety + permit checklist for the shoot day.' },
  { name: 'run-of-show',           phase: 'Production', lane: 'PM', desc: 'Sequences the live-event running order minute-by-minute.' },
  // Post-Production
  { name: 'first-assembly',        phase: 'Post-Production', lane: 'CR', desc: 'Stitches a rough cut / EDL from the paper edit + footage to send to first review.' },
  { name: 'premiere-assist',       phase: 'Post-Production', lane: 'CR', desc: 'Sets up the Premiere project to studio spec and runs edit chores via ExtendScript.' },
  { name: 'graphics-rundown',      phase: 'Post-Production', lane: 'CR', desc: 'Builds the per-asset motion cue sheet (pptx) from the locked edit + script.' },
  { name: 'figma-use',             phase: 'Post-Production', lane: 'CR', src: 'Figma plugin', desc: 'Pulls design context, variables / tokens, and screenshots from a Figma selection and turns it into code.' },
  { name: 'figma-generate-design', phase: 'Post-Production', lane: 'CR', src: 'Figma plugin', desc: 'Generates a Figma design from a prompt or reference.' },
  { name: 'figma-code-connect',    phase: 'Post-Production', lane: 'CR', src: 'Figma plugin', desc: 'Maps components to code via Figma Code Connect.' },
  { name: 'figma-create-new-file', phase: 'Post-Production', lane: 'CR', src: 'Figma plugin', desc: 'Creates a new Figma file to start a design.' },
  { name: 'frameio-review',        phase: 'Post-Production', lane: 'PM', desc: 'Pulls every Frame.io comment into one prioritized, timestamped revision doc.' },
  { name: 'picture-lock-check',    phase: 'Post-Production', lane: 'PM', desc: 'Runs the picture-lock checklist and confirms clearances before sign-off.' },
  // Wrap
  { name: 'delivery',              phase: 'Wrap', lane: 'PM', desc: 'Confirms final exports on Frame.io, sends the client a delivery email, and marks it delivered in Airtable.' },
  { name: 'wrap-archive',          phase: 'Wrap', lane: 'PM', desc: 'Archives to Frame.io (the durable archive), closes the project in Airtable, and writes the retro.' },
  { name: 'case-study-qual',       phase: 'Wrap', lane: 'PM', desc: 'Drafts the dual-format case-study qual (submission + orals) from the finished project.' },
  { name: 'awards-tracker',        phase: 'Wrap', lane: 'PM', desc: 'Logs the finished project into the awards tracker (xlsx) with screener links.' },
];

/* ---- agents (separate reviewers + helpers) ---- */
const AGENTS = [
  { name: 'qa-review',        kind: 'review agent',   desc: 'Quality / error review of any artifact — script, cut, deck, doc — returning structured, prioritized feedback.' },
  { name: 'brand-risk-review',kind: 'review agent',   desc: 'Deloitte / client brand + risk review together, plus the submission packet for the human approval gate.' },
  { name: 'research',         kind: 'research agent', desc: 'Researches a client, topic, or market for a brief or script — web + the studio knowledge base, sourced.' },
];
