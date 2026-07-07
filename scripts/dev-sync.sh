#!/usr/bin/env bash
# dev-sync.sh — reliable edit→see loop for a locally developed plugin suite.
#
# Installed plugins are frozen cache copies; `claude plugin update` is
# version-gated and a plain reinstall no-ops. The version-independent loop that
# actually works is: uninstall → re-add marketplace → install → restart Claude.
#
# Usage: dev-sync.sh <marketplace-manifest> <marketplace-name> <plugin> [plugin ...]
# e.g.:  dev-sync.sh ./acme-plugin/.claude-plugin/marketplace.json acme-launch acme-launch
set -uo pipefail

if [ $# -lt 3 ]; then
  sed -n '2,10p' "$0"
  exit 1
fi

MANIFEST="$1"; MARKET="$2"; shift 2

[ -f "$MANIFEST" ] || { echo "error: no manifest at $MANIFEST" >&2; exit 1; }

# Validate before touching the install — a broken plugin wastes the whole loop.
MARKET_DIR="$(cd "$(dirname "$MANIFEST")/.." && pwd)"
for P in "$@"; do
  if [ -d "$MARKET_DIR/../$P" ]; then
    claude plugin validate "$MARKET_DIR/../$P" --strict || { echo "✗ $P failed validation — fix before syncing" >&2; exit 1; }
  fi
done

for P in "$@"; do
  echo "── syncing $P@$MARKET"
  claude plugin uninstall "$P@$MARKET" --scope local 2>/dev/null || true
done

claude plugin marketplace remove "$MARKET" 2>/dev/null || true
claude plugin marketplace add "$MANIFEST" --scope local

FAIL=0
for P in "$@"; do
  if claude plugin install "$P@$MARKET" --scope local; then
    echo "✓ $P"
  else
    echo "✗ $P failed to install" >&2; FAIL=1
  fi
done

echo
echo "Restart Claude Code to pick up the new copies."
exit $FAIL
