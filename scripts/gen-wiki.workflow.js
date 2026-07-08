export const meta = {
  name: 'fde-gen-wiki',
  description: 'Author the team wiki — one tutorial per phase-router command, worked examples from real graded transcripts, every claim verified',
  whenToUse: 'Deploy phase of an Auto-FDE project, after the practice run; articles feed the site.html Guides',
  phases: [
    { title: 'Collect', detail: 'map commands to skills and real transcripts' },
    { title: 'Author', detail: 'one tutorial per command, in the team vocabulary' },
    { title: 'Verify', detail: 'every command exists, every path resolves, nothing confidential' },
  ],
}

// args (paths absolute):
//   projectRoot - project working directory
//   pluginDir      - the built team plugin root
//   buildDir       - project .build/ dir
//
// Articles land in .build/wiki/<name>.md; gen-site.py embeds them into the
// site.html Guides. Worked examples come from the REAL graded transcripts
// (.build/practice-run/step-N.jsonl, .build/output-runs/) — the same runs
// that proved the plugin works — never from imagination. Fixture data is
// fictional by construction; verifiers still gate on confidential leaks.

// scriptPath invocations can deliver args as a JSON string — tolerate both
const ARGS = typeof args === 'string' ? JSON.parse(args) : (args || {})
const { projectRoot, pluginDir, buildDir } = ARGS
if (!projectRoot || !pluginDir || !buildDir) {
  throw new Error('gen-wiki requires args: projectRoot, pluginDir, buildDir')
}

phase('Collect')
const collect = await agent(
  `Map an Auto-FDE team plugin's wiki articles. Plugin root: ${pluginDir}; project root: ${projectRoot}.

Read every ${pluginDir}/commands/*.md, ${projectRoot}/catalog.json, ${buildDir}/practice-report.json (runbook rows carry per-step transcript paths), and ${buildDir}/test-log.json if present. Create ${buildDir}/wiki/ and return one planned article per plugin command:
[{ "name": kebab article file name (the command name), "command": "/<name>" as the team invokes it,
   "skills": [slugs the command routes to], "transcripts": [absolute paths of graded practice/test transcripts that exercised those skills — empty if none] }]
Do not invent commands; do not plan articles for anything else.`,
  {
    label: 'collect',
    schema: {
      type: 'object',
      required: ['articles'],
      properties: {
        articles: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'command', 'skills', 'transcripts'],
            properties: {
              name: { type: 'string' },
              command: { type: 'string' },
              skills: { type: 'array', items: { type: 'string' } },
              transcripts: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  },
)
if (!collect || !collect.articles.length) throw new Error('no plugin commands found to document')
log(`${collect.articles.length} articles planned`)

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['ok', 'problems'],
  properties: {
    ok: { type: 'boolean' },
    problems: { type: 'array', items: { type: 'string' }, description: 'concrete, fixable, with the offending line quoted' },
  },
}

const results = await pipeline(
  collect.articles,

  // Author
  a => agent(
    `Write one wiki tutorial for a team's Claude plugin, in the team's own vocabulary.

Article: ${a.command} → ${buildDir}/wiki/${a.name}.md
Read first: ${pluginDir}/commands/${a.name}.md, every SKILL.md it routes to (${a.skills.map(s => `${pluginDir}/skills/${s}/SKILL.md`).join(', ') || 'none listed'}), ${projectRoot}/catalog.json for the team's phase words${a.transcripts.length ? `, and the REAL graded transcripts: ${a.transcripts.join(', ')}` : ''}.

Structure: what the command does and when the team reaches for it (their workflow words, not plugin jargon); a worked example ${a.transcripts.length ? 'distilled from the transcripts — the actual prompt that was typed, what the skill produced (short excerpts), where the output landed' : '(no transcript exists — write the example from the skill body and SAY it is illustrative, never fabricate a "real" run)'}; what to check before trusting the output (from the skill's checks); troubleshooting (wrong skill fired → the misfire channel; missing inputs → how this team fills gaps).
Rules: fictional fixture names stay fictional; no real client material, no absolute machine paths, no plugin-internals talk (worktrees, workflows, agents). Write the file; return the section headings you used.`,
    {
      label: `author:${a.name}`, phase: 'Author',
      schema: {
        type: 'object',
        required: ['name', 'sections'],
        properties: { name: { type: 'string' }, sections: { type: 'array', items: { type: 'string' } } },
      },
    },
  ),

  // Verify (fresh skeptic), then fix in place if needed
  async (written, a) => {
    if (!written) return null
    const verify = await agent(
      `Verify one wiki article against the plugin it documents. Be skeptical — readers will paste from this file.

Article: ${buildDir}/wiki/${a.name}.md. Plugin: ${pluginDir}. Check: every command the article mentions exists in ${pluginDir}/commands/; every file path it cites resolves; the worked example is consistent with the transcripts it claims to distill (${a.transcripts.join(', ') || 'none — then the example must be marked illustrative'}); zero absolute machine paths (/Users/, /home/); zero real-looking client names; no unexplained plugin-internals jargon.`,
      { label: `verify:${a.name}`, phase: 'Verify', schema: VERIFY_SCHEMA },
    )
    if (verify && !verify.ok && verify.problems.length) {
      await agent(
        `Fix a wiki article in place: ${buildDir}/wiki/${a.name}.md. Fix ALL of these, change nothing else:\n${verify.problems.map((p, i) => `${i + 1}. ${p}`).join('\n')}\nReturn what you changed.`,
        {
          label: `fix:${a.name}`, phase: 'Verify',
          schema: { type: 'object', required: ['fixed'], properties: { fixed: { type: 'array', items: { type: 'string' } } } },
        },
      )
    }
    return { name: a.name, command: a.command, sections: written.sections, problems: verify ? verify.problems : ['verifier lost — re-run this article'] }
  },
)

const ok = results.filter(Boolean)
const lost = collect.articles.filter((a, i) => !results[i]).map(a => a.name)
log(`${ok.length}/${collect.articles.length} articles written${lost.length ? ` · lost: ${lost.join(', ')}` : ''}`)
// Main loop: run scripts/gen-site.py to embed .build/wiki/*.md into site.html,
// then publish site.html with the Artifact tool (same path, same URL).
return { articles: ok, lost }
