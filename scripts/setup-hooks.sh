#!/usr/bin/env bash
# setup-hooks.sh — Install git hooks for the Tetrel Notebook project
# Run once after cloning: bash scripts/setup-hooks.sh

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

echo "📌 Installing Tetrel Notebook git hooks..."

# ----- pre-commit hook -----
cat > "$HOOKS_DIR/pre-commit" << 'HOOK'
#!/usr/bin/env bash
# pre-commit hook — enforces Tetrel Notebook session hygiene rules
# See: docs/7-DEVELOPMENT/contributing.md

ERRORS=0
WARNINGS=0

# ── Rule 1: No planning .md files in repo root ────────────────────────────────
# Only these root-level .md files are allowed:
ALLOWED_ROOT_MDS="README.md GEMINI.md CLAUDE.md CHANGELOG.md CONFIGURATION.md CONTRIBUTING.md MAINTAINER_GUIDE.md PROJECT.md README.dev.md ORIGINAL_REQUEST.md"

for f in $(git diff --cached --name-only | grep "^[^/]*\.md$"); do
  base=$(basename "$f")
  allowed=false
  for allowed_name in $ALLOWED_ROOT_MDS; do
    [ "$base" = "$allowed_name" ] && allowed=true && break
  done
  if [ "$allowed" = false ]; then
    echo "❌ ERROR: Staging a .md file in the repo root is not allowed: $f"
    echo "   Move planning/task files to docs/plans/ instead."
    ERRORS=$((ERRORS + 1))
  fi
done

# ── Rule 2: No *.pre-ruflo files ─────────────────────────────────────────────
for f in $(git diff --cached --name-only | grep "\.pre-ruflo$"); do
  echo "❌ ERROR: Staging a RuFlo backup file: $f"
  echo "   Delete it — it's automatically gitignored. Check .gitignore."
  ERRORS=$((ERRORS + 1))
done

# ── Rule 3: No root-level package.json staged ─────────────────────────────────
for f in $(git diff --cached --name-only | grep "^package\(-lock\)\?\.json$"); do
  echo "❌ ERROR: Staging root-level $f (agentic-flow tool artifact)"
  echo "   This file is gitignored. Check if it was force-added."
  ERRORS=$((ERRORS + 1))
done

# ── Rule 4: GEMINI.md/CLAUDE.md router count sync check ──────────────────────
if git diff --cached --name-only | grep -q "GEMINI.md\|CLAUDE.md"; then
  gemini_count=$(grep -o "## Registered Routers\|Registered Routers\|[0-9]\+ [Rr]egistered [Rr]outers\|API Structure ([0-9]\+" GEMINI.md 2>/dev/null | grep -o "[0-9]\+" | head -1)
  claude_count=$(grep -o "[0-9]\+ [Rr]egistered [Rr]outers\|API Structure ([0-9]\+" CLAUDE.md 2>/dev/null | grep -o "[0-9]\+" | head -1)
  if [ -n "$gemini_count" ] && [ -n "$claude_count" ] && [ "$gemini_count" != "$claude_count" ]; then
    echo "⚠️  WARNING: GEMINI.md router count ($gemini_count) differs from CLAUDE.md ($claude_count)"
    echo "   Keep these files in sync. Update the one you didn't edit."
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# ── Rule 5: Warn on stale untracked files ────────────────────────────────────
UNTRACKED=$(git status --short | grep "^??" | awk '{print $2}')
if [ -n "$UNTRACKED" ]; then
  echo "⚠️  WARNING: You have untracked files. Run 'git status --short' to review:"
  echo "$UNTRACKED" | head -10
  WARNINGS=$((WARNINGS + 1))
fi

# ── Summary ───────────────────────────────────────────────────────────────────
if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "🚫 Pre-commit hook blocked: $ERRORS error(s) found. Fix them and try again."
  echo "   Run: git diff --cached --name-only | head -20  to see staged files."
  exit 1
fi

if [ "$WARNINGS" -gt 0 ]; then
  echo "⚠️  Pre-commit: $WARNINGS warning(s). Commit allowed but please review."
fi

exit 0
HOOK

chmod +x "$HOOKS_DIR/pre-commit"
echo "✅ pre-commit hook installed at $HOOKS_DIR/pre-commit"

# ----- agent config symlinks -----
echo ""
echo "🔗 Setting up AI tool config symlinks..."
cd "$REPO_ROOT"

# CLAUDE.md → GEMINI.md  (Claude Code reads CLAUDE.md, Antigravity reads GEMINI.md)
# Both now read the same file — zero drift possible
if [ -L CLAUDE.md ]; then
  echo "   CLAUDE.md symlink already exists"
elif [ -f CLAUDE.md ]; then
  echo "⚠️  CLAUDE.md is a regular file (not a symlink). It may be out of sync."
  echo "   To fix: git rm CLAUDE.md && ln -sf GEMINI.md CLAUDE.md"
else
  ln -sf GEMINI.md CLAUDE.md
  echo "✅ CLAUDE.md → GEMINI.md symlink created"
fi

echo "🎉 All hooks installed. Session hygiene rules enforced:"
echo "   • No planning .md files in repo root (use docs/plans/)"
echo "   • No *.pre-ruflo files (RuFlo backup artifacts)"
echo "   • No root-level package.json (agentic-flow artifact)"
echo "   • GEMINI.md/CLAUDE.md router count sync warning"
echo "   • Warn on untracked files before commit"
