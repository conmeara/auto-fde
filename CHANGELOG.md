# Changelog

## 0.2.0 — 2026-07-13

- Tightened every phase skill's description (routing surface trimmed from
  4,277 to 3,775 characters against Claude Code's ~8,000-character shared
  skill-listing budget), trigger vocabulary preserved.
- Removed the dev-only `references/` directory (vendored inspiration site,
  review prototype, transcripts) from the shipped plugin — plugins install
  as full repo copies, and none of it was load-bearing.
- Added `$schema` to `plugin.json`, this changelog, a CI validation
  workflow (`claude plugin validate --strict` + JSON/path sweeps), and a
  Requirements section in the README.
- Re-ran the trigger benchmark and live calibration after the description
  changes (results in the eval report).

## 0.1.0 — 2026-07-08

- Initial release: the nine-phase FDE lifecycle (dashboard, discover, plan,
  build, review, test, eval, deploy, improve), the skill-authoring
  doctrine, the plugin-validator agent, workflow machinery, and the
  dashboard/site templates.
