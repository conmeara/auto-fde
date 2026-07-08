---
name: discovery
description: This skill should be used for the discovery phase of an Auto-FDE project — running the kickoff interview with a team champion, extracting a folder of team documents (SharePoint/Drive exports, playbooks, templates) into knowledge digests, ingesting meeting or interview transcripts, or interviewing SMEs to capture workflows and resolve open questions. Use it whenever team knowledge needs to become digests, even if the user just says "here are our documents" or "let's start discovery".
---

# Discovery

Turn team knowledge — documents, transcripts, and what's in people's heads —
into knowledge digests. Digests are the only discovery output later phases
read; fidelity lives here or nowhere. Layout and handoffs:
`${CLAUDE_PLUGIN_ROOT}/reference/project-layout.md`.

Check state first: no `project.md` means kickoff hasn't happened — run it
before any extraction, whatever the user handed you.

## Kickoff interview

Fill `${CLAUDE_PLUGIN_ROOT}/templates/schemas/project-brief-template.md`
by interviewing the champion. Ask a few questions at a time, in their
vocabulary, not a form-filling march. The materials inventory matters most:
every knowledge source gets a location, an access status, and an intake mode
(corpus / transcript / interview) — that table becomes the discovery
work plan. Write `project.md`. Done when every section is filled or
explicitly marked unknown, and the user has confirmed the inventory is
complete.

## Corpus extraction

For a directory of team materials:

1. Confirm extraction tools exist (`textutil`, `pdftotext`, `unzip` on
   macOS); smoke-test one real file before fanning out.
2. Run the extraction workflow with the Workflow tool:
   `scriptPath: ${CLAUDE_PLUGIN_ROOT}/scripts/extract-corpus.workflow.js`,
   `args: { sourceDir, digestsDir, digestTemplatePath:
   "${CLAUDE_PLUGIN_ROOT}/templates/schemas/digest-template.md", briefPath }`
   (absolute paths).
3. Spot-check two digests against their source files for verbatim fidelity
   (field lists, headings, labels — exact). Re-run any failed clusters the
   workflow reported.

Done when every inventory item marked `corpus` has a digest and the
spot-checks passed.

## Transcript ingestion

For each file in `discovery/transcripts/` (or handed directly): extract the
workflows *described* — steps, actors, tools, handoffs, timing, pain points,
house vocabulary — into a digest (`mode: transcript`) following the digest
template. Conversational sources need extra care: record who said it, note
uncertainty and disagreement as open questions rather than resolving them
yourself, and keep quotes verbatim when wording sounds canonical ("we always
call it a brief, never a spec"). Move processed transcripts' status in the
brief's inventory. One digest per meeting/topic, not per speaker.

## Live interview

The gap-filler for everything else. Sources of questions, in priority order:
`.build/open-questions.json` entries still open, digest `Open questions`
sections, and inventory items marked `interview`. Group related questions,
ask conversationally (use AskUserQuestion for discrete choices), and chase
the concrete: "walk me through the last time that happened" beats "how does
it usually work". Write answers as a digest (`mode: interview`, source line
naming the person/role and date) and mark resolved questions in
`.build/open-questions.json`. Done when the question list is empty or the
remaining items are explicitly parked with a reason.

## Closing every discovery session

Report coverage against the brief's materials inventory: what's digested,
what's pending, what's blocked on access — and the open-question count.
After digests are written, run
`python3 ${CLAUDE_PLUGIN_ROOT}/scripts/gen-dashboard.py <project-root>`
so the dashboard's Overview page reflects discovery progress (it seeds
`dashboard.html` on first run). Recommend `/fde-plan` only when the
inventory items the champion called essential are all digested.
