export const meta = {
  name: 'fde-extract-corpus',
  description: 'Fan out agents over a team document corpus and write knowledge digests',
  whenToUse: 'Discovery phase of an Auto-FDE engagement, when a folder of team materials needs to become digests',
  phases: [
    { title: 'Inventory', detail: 'cluster the corpus into extraction assignments' },
    { title: 'Extract', detail: 'one agent per cluster writes a digest' },
  ],
}

// args (all paths absolute):
//   sourceDir          - root of the raw team materials
//   digestsDir         - engagement discovery/digests/ output dir
//   digestTemplatePath - the plugin's templates/schemas/digest-template.md
//   briefPath          - engagement.md (optional; gives extractors team context)
//   clusters           - optional [{name, paths:[...]}] to skip the inventory stage
//
// Lesson encoded from the first manual run: do NOT add a final stage that asks
// one agent to synthesize everything into a giant structured output — it stalls.
// The digests ARE the product; synthesis happens later in /fde-plan.

const { sourceDir, digestsDir, digestTemplatePath, briefPath } = args
if (!sourceDir || !digestsDir || !digestTemplatePath) {
  throw new Error('extract-corpus requires args: sourceDir, digestsDir, digestTemplatePath')
}

const CLUSTER_SCHEMA = {
  type: 'object',
  required: ['clusters'],
  properties: {
    clusters: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'paths', 'rationale'],
        properties: {
          name: { type: 'string', description: 'kebab-case digest filename stem' },
          paths: { type: 'array', items: { type: 'string' } },
          rationale: { type: 'string' },
        },
      },
    },
  },
}

const DIGEST_SUMMARY_SCHEMA = {
  type: 'object',
  required: ['cluster', 'digestPath', 'filesRead', 'workflowsCovered', 'openQuestions'],
  properties: {
    cluster: { type: 'string' },
    digestPath: { type: 'string' },
    filesRead: { type: 'number' },
    filesSkipped: { type: 'array', items: { type: 'string' }, description: 'files that could not be extracted, with reason suffix' },
    workflowsCovered: { type: 'array', items: { type: 'string' } },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
}

let clusters = args.clusters
if (!clusters || !clusters.length) {
  phase('Inventory')
  const inv = await agent(
    `Inventory a team-document corpus for extraction. Corpus root: ${sourceDir}
List the directory tree (use ls/find; do not open large binaries). Group everything into 6-12 clusters of related material (by folder and topic, e.g. playbook, templates, onboarding, email-templates). Every file must land in exactly one cluster. Prefer folder boundaries; split folders only when clearly mixed. Name each cluster with a kebab-case stem suitable as a digest filename. Return the clusters with their file/dir paths (relative to the corpus root) and a one-line rationale each.`,
    { label: 'inventory', schema: CLUSTER_SCHEMA },
  )
  if (!inv) throw new Error('inventory agent failed')
  clusters = inv.clusters
}
log(`${clusters.length} clusters to extract`)

phase('Extract')
const results = await parallel(clusters.map(c => () =>
  agent(
    `Extract a cluster of team documents into ONE knowledge digest, faithfully.

Cluster: ${c.name}
Corpus root: ${sourceDir}
Files/dirs in this cluster (relative to corpus root): ${JSON.stringify(c.paths)}
${briefPath ? `Engagement brief (read first for team context): ${briefPath}` : ''}

Read the digest format at ${digestTemplatePath} and follow its frontmatter and section structure exactly (mode: corpus). Extraction tools for binaries: textutil (docx→txt), pdftotext, unzip -p for xlsx/pptx XML when needed; read text/markdown directly. If a file resists extraction, note it in filesSkipped rather than guessing at its contents.

Fidelity rules: capture template structure VERBATIM (field lists, section headings, column names, boilerplate) — later build agents reproduce these character-for-character and will not have the originals open. Record the team's process as it is, including warts; do not improve or editorialize. Note the source file next to each verbatim artifact. Anything ambiguous, contradictory, or stale goes under Open questions.

Write the digest to ${digestsDir}/${c.name}.md (create the directory if needed).`,
    { label: `extract:${c.name}`, phase: 'Extract', schema: DIGEST_SUMMARY_SCHEMA },
  )
))

const done = results.filter(Boolean)
const failed = clusters.filter((c, i) => !results[i]).map(c => c.name)
if (failed.length) log(`FAILED clusters (re-run these): ${failed.join(', ')}`)
log(`${done.length}/${clusters.length} digests written to ${digestsDir}`)

return {
  digests: done,
  failedClusters: failed,
  totalOpenQuestions: done.reduce((n, d) => n + d.openQuestions.length, 0),
}
